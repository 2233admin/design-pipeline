import type { BrowserContext, Browser } from 'playwright';
import { promises as fs } from 'fs';
import path from 'path';
import { getSession, sessionDir } from './browser-session';
import { capturePage } from './capture-page';
import type { CapturePlan } from './plan-strategy';
import { normalizeUrl, urlPattern, sameDomain, canonicalHost } from './url-pattern';
import { t, type Locale } from '@/lib/i18n';

/** 忠实抓取的目标页(归一化: structure=代表页, full=每个页面)。 */
interface Target {
  label: string;
  pattern: string;
  url: string;
  role?: string;
}

/** 与 capture-page.ts 浏览器版逐字节一致。 */
function djb2(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}
function extOf(u: string): string {
  try {
    const p = new URL(u).pathname;
    const m = p.match(/\.([a-z0-9]{2,5})$/i);
    return m ? '.' + m[1].toLowerCase() : '';
  } catch {
    return '';
  }
}
function localName(absUrl: string): string {
  return djb2(absUrl) + (extOf(absUrl) || '.bin');
}

const MAX_ASSET = 12 * 1024 * 1024;

/** 取用于抓取的 context: 优先复用还活着的登录会话; 否则用 storage-state 起无头。 */
export async function getCaptureContext(
  sessionId: string
): Promise<{ context: BrowserContext; dispose: () => Promise<void> }> {
  const live = getSession(sessionId);
  if (live) return { context: live.context, dispose: async () => {} };

  const statePath = path.join(sessionDir(sessionId), 'storage-state.json');
  await fs.access(statePath); // 不存在则抛错 → 让上层提示先捕获
  const { chromium } = await import('playwright');
  let browser: Browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
  } catch {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
  }
  const context = await browser.newContext({
    storageState: statePath,
    locale: 'zh-CN',
    viewport: { width: 1440, height: 900 },
  });
  return { context, dispose: async () => void (await browser.close().catch(() => {})) };
}

/** 类型 → 本地文件相对路径(相对 job 根)。home 放根 index.html, 其余放 pages/<slug>.html。 */
function pageFileFor(t: { role?: string; pattern: string }, used: Set<string>): string {
  if (t.role === 'home' || t.pattern === '/') return 'index.html';
  let slug = t.pattern
    .replace(/^\/+/, '')
    .replace(/[:%]/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 40);
  if (!slug) slug = 'page';
  let name = `pages/${slug}.html`;
  let i = 2;
  while (used.has(name)) name = `pages/${slug}-${i++}.html`;
  used.add(name);
  return name;
}

/** 简单并发池下载。 */
async function downloadAll<T>(items: T[], worker: (t: T) => Promise<void>, concurrency = 6) {
  let idx = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (idx < items.length) {
      const i = idx++;
      await worker(items[i]).catch(() => {});
    }
  });
  await Promise.all(runners);
}

export interface BuildProgress {
  (msg: string): void;
}

export interface BuildResult {
  jobId: string;
  rootHost: string;
  pages: Array<{ label: string; pattern: string; file: string; url: string; assets: number; bytes: number }>;
  assetCount: number;
  indexFile: string;
  outDir: string;
}

/**
 * Phase 4 主流程: 按 plan 抓每个 capture:true 代表页 → 下载真实资源(去重)→ 改写 CSS/资源/内部链接
 * → 写 public/site-clone/<job>/ 离线多页站。
 */
export async function buildSite(
  sessionId: string,
  plan: CapturePlan,
  rootHost: string,
  opts: {
    limit?: number;
    patterns?: string[];
    outDir?: string;
    explicitTargets?: Target[];
    locale?: Locale;
    onProgress?: BuildProgress;
  } = {}
): Promise<BuildResult> {
  const onProgress = opts.onProgress || (() => {});
  const tr = (key: string, vars?: Record<string, string | number>) => t(opts.locale || 'en', key, vars);
  const jobId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const outDir = opts.outDir || path.join(process.cwd(), 'public', 'site-clone', jobId);
  const assetsDir = path.join(outDir, 'assets');
  await fs.mkdir(assetsDir, { recursive: true });

  // 要抓的目标: 整站模式用 explicitTargets(全部页面); 否则用 plan 里 capture 的代表页。
  let targets: Target[];
  if (opts.explicitTargets?.length) {
    targets = opts.explicitTargets;
  } else {
    let ts = plan.types.filter((t) => t.capture && t.representativeUrl);
    if (opts.patterns?.length) ts = ts.filter((t) => opts.patterns!.includes(t.pattern));
    if (opts.limit) ts = ts.slice(0, opts.limit);
    targets = ts.map((t) => ({ label: t.label, pattern: t.pattern, url: t.representativeUrl, role: t.role }));
  }

  // 分配本地文件 + 建 pattern→file 与 url→file 映射(供内部链接精确改写)
  const usedNames = new Set<string>();
  const assigned = targets.map((t) => ({ t, file: pageFileFor(t, usedNames) }));
  const patternToFile = new Map<string, string>();
  const urlToFile = new Map<string, string>();
  for (const a of assigned) {
    if (!patternToFile.has(a.t.pattern)) patternToFile.set(a.t.pattern, a.file);
    const nu = normalizeUrl(a.t.url);
    if (nu) urlToFile.set(nu, a.file);
  }

  const { context, dispose } = await getCaptureContext(sessionId);
  const writtenAssets = new Set<string>(); // 已落盘的 local 名, 全站去重
  const pages: BuildResult['pages'] = [];

  try {
    for (const { t, file } of assigned) {
      onProgress(tr('p.build.page', { label: t.label }));
      let cap;
      try {
        cap = await capturePage(context, t.url, {});
      } catch (e) {
        onProgress(tr('p.build.pageFail', { label: t.label, err: e instanceof Error ? e.message : String(e) }));
        continue;
      }

      // 下载该页所有资源(去重), 记录本页新增字节
      let pageBytes = 0;
      const cssJobs: Array<{ local: string; absUrl: string }> = [];
      await downloadAll(cap.refs, async (ref) => {
        if (writtenAssets.has(ref.local)) return;
        const buf = await fetchBuf(context, ref.absUrl);
        if (!buf) return;
        writtenAssets.add(ref.local);
        if (ref.local.endsWith('.css')) {
          cssJobs.push({ local: ref.local, absUrl: ref.absUrl });
          // css 内容延后处理(要改 url()), 先占位
          await fs.writeFile(path.join(assetsDir, ref.local), buf);
        } else {
          await fs.writeFile(path.join(assetsDir, ref.local), buf);
        }
        pageBytes += buf.length;
      });

      // 处理 CSS 里的 url(): 下载被引资源 + 改写为同目录本地名
      for (const job of cssJobs) {
        const cssPath = path.join(assetsDir, job.local);
        const text = await fs.readFile(cssPath, 'utf8').catch(() => '');
        if (!text) continue;
        const { rewritten, extra } = rewriteCssUrls(text, job.absUrl);
        await downloadAll(extra, async (u) => {
          const ln = localName(u);
          if (writtenAssets.has(ln)) return;
          const buf = await fetchBuf(context, u);
          if (!buf) return;
          writtenAssets.add(ln);
          await fs.writeFile(path.join(assetsDir, ln), buf);
          pageBytes += buf.length;
        });
        await fs.writeFile(cssPath, rewritten, 'utf8');
      }

      // 改写 HTML: 资源哨兵 → 相对 assets 路径; 内部链接 → 本地页
      const depth = file.includes('/') ? file.split('/').length - 1 : 0;
      const assetPrefix = depth > 0 ? '../'.repeat(depth) + 'assets/' : './assets/';
      let html = cap.html.split('__ASSET__/').join(assetPrefix);
      html = rewriteInternalLinks(html, cap.finalUrl, rootHost, patternToFile, urlToFile, file);

      const abs = path.join(outDir, file);
      await fs.mkdir(path.dirname(abs), { recursive: true });
      await fs.writeFile(abs, html, 'utf8');

      pages.push({ label: t.label, pattern: t.pattern, file, url: t.url, assets: cap.refs.length, bytes: pageBytes });
      onProgress(tr('p.build.pageOk', { label: t.label, file, n: cap.refs.length }));
    }
  } finally {
    await dispose();
  }

  // 若没抓到 home, 生成一个目录索引页当入口
  const hasIndex = pages.some((p) => p.file === 'index.html');
  const indexFile = hasIndex ? 'index.html' : '_index.html';
  if (!hasIndex) {
    await fs.writeFile(path.join(outDir, indexFile), buildDirectoryIndex(rootHost, pages), 'utf8');
  }

  await fs.writeFile(
    path.join(outDir, 'manifest.json'),
    JSON.stringify({ jobId, rootHost, builtAt: new Date().toISOString(), pages }, null, 2),
    'utf8'
  );

  return { jobId, rootHost, pages, assetCount: writtenAssets.size, indexFile, outDir };
}

async function fetchBuf(context: BrowserContext, url: string): Promise<Buffer | null> {
  try {
    const resp = await context.request.get(url, { timeout: 30000 });
    if (!resp.ok()) return null;
    const body = await resp.body();
    if (body.length > MAX_ASSET) return null;
    return body;
  } catch {
    return null;
  }
}

/** 改写 CSS url(): 返回改写后文本 + 需下载的绝对 URL 列表(同目录本地名引用)。 */
function rewriteCssUrls(css: string, cssAbsUrl: string): { rewritten: string; extra: string[] } {
  const extra: string[] = [];
  const rewritten = css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (m, _q, u) => {
    if (/^data:/i.test(u)) return m;
    let abs: string;
    try {
      abs = new URL(u, cssAbsUrl).href;
    } catch {
      return m;
    }
    extra.push(abs);
    return `url(${localName(abs)})`; // 同在 assets/ 目录, 用裸文件名
  });
  return { rewritten, extra: [...new Set(extra)] };
}

/** 把同域、且已被抓取的内部链接改写为指向本地页的相对路径; 其余保持原样。
 *  优先精确 URL 匹配(整站模式各页独立), 退回 pattern 匹配(结构模式同模板归一页)。 */
function rewriteInternalLinks(
  html: string,
  pageAbsUrl: string,
  rootHost: string,
  patternToFile: Map<string, string>,
  urlToFile: Map<string, string>,
  currentFile: string
): string {
  const curDir = path.posix.dirname('/' + currentFile.split(path.sep).join('/'));
  return html.replace(/(<a\b[^>]*\shref=)(["'])(.*?)\2/gi, (m, pre, q, href) => {
    if (!href || href.startsWith('#') || /^(javascript:|mailto:|tel:)/i.test(href)) return m;
    let abs: string;
    try {
      abs = new URL(href.replace(/&amp;/g, '&'), pageAbsUrl).href;
    } catch {
      return m;
    }
    if (!sameDomain(abs, rootHost)) return m;
    const norm = normalizeUrl(abs);
    const target = (norm && urlToFile.get(norm)) || patternToFile.get(urlPattern(norm || abs));
    if (!target) return m; // 未抓取的同域页: 保持绝对(打开会走线上)
    let rel = path.posix.relative(curDir, '/' + target);
    if (!rel) rel = path.posix.basename(target);
    return `${pre}${q}${rel}${q}`;
  });
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

function buildDirectoryIndex(rootHost: string, pages: BuildResult['pages']): string {
  const items = pages
    .map((p) => `<li><a href="./${p.file}">${esc(p.label)}</a> <code>${esc(p.pattern)}</code></li>`)
    .join('\n');
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>${esc(rootHost)} · 克隆</title>
<style>body{font:15px system-ui;max-width:720px;margin:48px auto;padding:0 20px}li{margin:8px 0}code{color:#888}</style>
<h1>${esc(rootHost)} · 整站克隆</h1><ul>${items}</ul></html>`;
}

export { canonicalHost };
