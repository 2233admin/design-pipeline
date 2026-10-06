import type { Page } from 'playwright';
import { promises as fs } from 'fs';
import path from 'path';
import { getSession, sessionDir } from './browser-session';
import { normalizeUrl, sameDomain, urlPattern, isCrawlableLink } from './url-pattern';

/**
 * 整站结构爬虫 (Phase 2, 方案A: 复用同一登录 context 串行爬)。
 *
 * 「克隆结构不是数据」→ 按 urlPattern 把页面归成"类型", 每类型只留 1 个代表页,
 * 同类型的其余页只计数不深爬。产出站点地图(页面类型清单 + 每类型代表URL/DOM指纹/样本)。
 */

export interface PageType {
  pattern: string;          // 类型模式, 如 /app/:id
  representativeUrl: string; // 该类型第一个抓到的代表页
  title: string;
  depth: number;            // 代表页发现深度
  count: number;            // 该类型累计遇到的页面数(含未深爬的)
  domFingerprint: string;   // DOM 骨架指纹(hash), 供 Phase 3 LLM 细分/确认
  sampleUrls: string[];     // 最多几个样本 URL
}

export interface CrawledPage {
  url: string;
  pattern: string;
  title: string;
  depth: number;
}

export interface SiteMap {
  rootUrl: string;
  rootHost: string;
  crawledAt: string;
  stats: { visited: number; discovered: number; types: number; maxDepthReached: number };
  types: PageType[];
  allPages: CrawledPage[]; // 实际访问过的每个页面(structure 模式=采样后; full 模式=全部)
}

export interface CrawlOptions {
  maxPages?: number;   // 实际导航访问的页面上限(控时) 默认 30
  maxDepth?: number;   // BFS 深度 默认 3
  sampleLimit?: number; // 同类型最多实际访问几个(其余只计数) 默认 2
  full?: boolean;      // 整站模式: 放开采样, 访问每个同域页面(受 maxPages 上限)
  navTimeout?: number; // 单页导航超时 默认 30000
  waitFor?: number;    // 导航后等动态内容 默认 1200
  onProgress?: (msg: string) => void;
}

function djb2(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16);
}

// 在页面内取: 标题、DOM 骨架(前若干结构节点的 tag.firstClass 序列)、全部 a[href]。
async function extractPage(page: Page): Promise<{ title: string; skeleton: string; links: string[] }> {
  return page.evaluate(() => {
    const skel: string[] = [];
    const walk = (el: Element, depth: number) => {
      if (depth > 3 || skel.length > 200) return;
      for (const c of Array.from(el.children)) {
        const cls =
          typeof (c as HTMLElement).className === 'string'
            ? (c as HTMLElement).className.split(/\s+/).filter(Boolean)[0] || ''
            : '';
        skel.push(c.tagName.toLowerCase() + (cls ? '.' + cls : ''));
        walk(c, depth + 1);
      }
    };
    if (document.body) walk(document.body, 0);
    const links = Array.from(document.querySelectorAll('a[href]'))
      .map((a) => (a as HTMLAnchorElement).href)
      .filter(Boolean);
    return { title: document.title || '', skeleton: skel.join('>'), links };
  });
}

export async function crawlSite(sessionId: string, opts: CrawlOptions = {}): Promise<SiteMap> {
  const { maxDepth = 3, sampleLimit = 2, full = false, navTimeout = 30000, waitFor = 1200, onProgress } = opts;
  const maxPages = opts.maxPages ?? (full ? 200 : 30);
  const effSample = full ? Number.POSITIVE_INFINITY : sampleLimit;

  const session = getSession(sessionId);
  if (!session) throw new Error('会话不存在或已超时关闭, 请先在 /site-clone 打开浏览器并点开始');

  const rootUrl = normalizeUrl(session.page.url()) || session.entryUrl;
  const rootHost = new URL(rootUrl).host;
  const log = (m: string) => onProgress?.(m);

  // 复用带登录态的 context, 另开一个标签页专门爬(不打扰用户那个页)。
  const page = await session.context.newPage();

  const visited = new Set<string>();
  const discovered = new Set<string>([rootUrl]);
  const types = new Map<string, PageType>();
  const allPages: CrawledPage[] = [];
  let maxDepthReached = 0;

  type QItem = { url: string; depth: number };
  const queue: QItem[] = [{ url: rootUrl, depth: 0 }];

  try {
    while (queue.length && visited.size < maxPages) {
      const { url, depth } = queue.shift()!;
      if (visited.has(url)) continue;

      const pattern = urlPattern(url);
      const known = types.get(pattern);
      // 已有该类型且样本够了 → 只计数, 不再实际访问(结构已捕获, 省时)。full 模式 effSample=∞ 故不触发。
      if (known && known.count >= effSample) {
        known.count++;
        continue;
      }

      visited.add(url);
      log(`[${visited.size}/${maxPages}] d${depth} ${pattern}  ${url}`);

      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: navTimeout });
        try {
          await page.waitForLoadState('networkidle', { timeout: 5000 });
        } catch {
          /* 长轮询站不 idle, 忽略 */
        }
        if (waitFor > 0) await page.waitForTimeout(waitFor);
      } catch {
        log(`  ↳ 导航失败, 跳过`);
        continue;
      }

      const { title, skeleton, links } = await extractPage(page);
      const fp = djb2(skeleton);
      maxDepthReached = Math.max(maxDepthReached, depth);
      allPages.push({ url, pattern, title, depth });

      if (!known) {
        types.set(pattern, {
          pattern,
          representativeUrl: url,
          title,
          depth,
          count: 1,
          domFingerprint: fp,
          sampleUrls: [url],
        });
      } else {
        known.count++;
        if (known.sampleUrls.length < 5) known.sampleUrls.push(url);
      }

      // 入队同域子链接
      if (depth < maxDepth) {
        for (const raw of links) {
          const n = normalizeUrl(raw);
          if (!n) continue;
          if (!sameDomain(n, rootHost)) continue;
          if (!isCrawlableLink(n)) continue;
          discovered.add(n);
          if (!visited.has(n)) queue.push({ url: n, depth: depth + 1 });
        }
      }
    }
  } finally {
    await page.close().catch(() => {});
  }

  const siteMap: SiteMap = {
    rootUrl,
    rootHost,
    crawledAt: new Date().toISOString(),
    stats: {
      visited: visited.size,
      discovered: discovered.size,
      types: types.size,
      maxDepthReached,
    },
    types: Array.from(types.values()).sort((a, b) => a.depth - b.depth || b.count - a.count),
    allPages,
  };

  // 落盘站点地图
  const dir = sessionDir(sessionId);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'sitemap.json'), JSON.stringify(siteMap, null, 2), 'utf8');

  return siteMap;
}
