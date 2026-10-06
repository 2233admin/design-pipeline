/**
 * 逆推分析 lib —— 用克隆下来的真实页面, 蒸馏 UI 语义 + 提设计 token, 再让 LLM 逆推产品文档。
 *
 * 由 scripts/analyze-site.mjs 移入(改为 TS lib, 供编排器/路由复用, 输出 Markdown)。
 * AI 只在 analyzeToMarkdown 里(codex-5.5), distill/token 都是确定性。
 */

import type { Browser } from 'playwright';
import { promises as fs } from 'fs';
import path from 'path';
import { chatComplete } from './llm';
import { t, llmLang, type Locale } from '@/lib/i18n';
import type { OutputKey, TaskDoc } from './tasks';

export interface PageOutline {
  landmarks: Record<string, number>;
  navItems: string[];
  headings: string[];
  forms: Array<{ action: string; fields: Array<{ tag: string; type: string; name: string; placeholder: string }>; submit: string }>;
  buttons: string[];
  repeated: Array<{ sig: string; count: number; fields: string[] }>;
  title: string;
}
export interface Distilled {
  rootHost: string;
  outlines: Array<{ label: string; pattern: string; file: string; url: string; outline: PageOutline | null }>;
}

// 浏览器内执行: HTML → 紧凑语义骨架(landmark/导航/标题/表单/按钮/重复组件)。
function outlineExtractor(): PageOutline {
  const clip = (s: string | null, n = 60) => (s || '').replace(/\s+/g, ' ').trim().slice(0, n);
  const sigOf = (el: Element) => {
    const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/)[0] : '';
    return el.tagName.toLowerCase() + (cls ? '.' + cls : '');
  };
  const textLeaves = (root: Element, limit = 10) => {
    const out: string[] = [];
    root.querySelectorAll('*').forEach((n) => {
      if (n.children.length === 0) {
        const t = clip(n.textContent, 40);
        if (t) out.push(t);
      }
    });
    return [...new Set(out)].slice(0, limit);
  };

  const landmarks: Record<string, number> = {};
  ['header', 'nav', 'main', 'footer', 'aside', 'form', 'table', 'article'].forEach((t) => {
    const n = document.querySelectorAll(t).length;
    if (n) landmarks[t] = n;
  });

  const navItems: string[] = [];
  document.querySelectorAll('header a, nav a').forEach((a) => {
    const t = clip(a.textContent, 24);
    if (t) navItems.push(t);
  });

  const headings: string[] = [];
  document.querySelectorAll('h1,h2,h3').forEach((h) => {
    const t = clip(h.textContent, 60);
    if (t) headings.push(h.tagName.toLowerCase() + ': ' + t);
  });

  const forms: PageOutline['forms'] = [];
  document.querySelectorAll('form').forEach((f) => {
    const fields: PageOutline['forms'][number]['fields'] = [];
    f.querySelectorAll('input,select,textarea').forEach((el) => {
      fields.push({
        tag: el.tagName.toLowerCase(),
        type: el.getAttribute('type') || '',
        name: el.getAttribute('name') || '',
        placeholder: clip(el.getAttribute('placeholder') || '', 30),
      });
    });
    const submit = clip(f.querySelector('[type=submit],button')?.textContent || '', 20);
    if (fields.length || submit) forms.push({ action: f.getAttribute('action') || '', fields, submit });
  });

  const buttons: string[] = [];
  document.querySelectorAll('button,[role=button]').forEach((b) => {
    const t = clip(b.textContent, 20);
    if (t) buttons.push(t);
  });

  // 重复组件: 子元素中同一签名出现 >=4 次的容器 → 卡片/列表原型
  const repeated: PageOutline['repeated'] = [];
  document.querySelectorAll('*').forEach((c) => {
    const kids = [...c.children];
    if (kids.length < 4) return;
    const counts: Record<string, number> = {};
    kids.forEach((k) => {
      const s = sigOf(k);
      counts[s] = (counts[s] || 0) + 1;
    });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] >= 4) {
      const sample = kids.find((k) => sigOf(k) === top[0]);
      if (sample) repeated.push({ sig: top[0], count: top[1], fields: textLeaves(sample, 10) });
    }
  });
  const seen = new Set<string>();
  const repTop = repeated
    .filter((r) => r.fields.length)
    .sort((a, b) => b.count - a.count)
    .filter((r) => (seen.has(r.sig) ? false : (seen.add(r.sig), true)))
    .slice(0, 8);

  return {
    title: document.title || '',
    landmarks,
    navItems: [...new Set(navItems)].slice(0, 30),
    headings: headings.slice(0, 25),
    forms,
    buttons: [...new Set(buttons)].slice(0, 25),
    repeated: repTop,
  };
}

/** 蒸馏离线站里每个页面(读 manifest.json), 返回紧凑骨架。 */
export async function distillSite(
  siteDir: string,
  onProgress?: (msg: string) => void,
  locale: Locale = 'en'
): Promise<Distilled> {
  const manifest = JSON.parse(await fs.readFile(path.join(siteDir, 'manifest.json'), 'utf8')) as {
    rootHost: string;
    pages: Array<{ label: string; pattern: string; file: string; url: string }>;
  };
  const { chromium } = await import('playwright');
  let browser: Browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
  } catch {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
  }
  const page = await browser.newPage();
  const outlines: Distilled['outlines'] = [];
  try {
    for (const p of manifest.pages) {
      const html = await fs.readFile(path.join(siteDir, p.file), 'utf8').catch(() => '');
      let outline: PageOutline | null = null;
      if (html) {
        await page.setContent(html, { waitUntil: 'domcontentloaded' }).catch(() => {});
        outline = await page.evaluate(outlineExtractor).catch(() => null);
      }
      outlines.push({ label: p.label, pattern: p.pattern, file: p.file, url: p.url, outline });
      onProgress?.(t(locale, 'p.distill.page', { label: p.label }));
    }
  } finally {
    await browser.close().catch(() => {});
  }
  const distilled: Distilled = { rootHost: manifest.rootHost, outlines };
  await fs.mkdir(path.join(siteDir, 'analysis'), { recursive: true });
  await fs.writeFile(path.join(siteDir, 'analysis', 'outlines.json'), JSON.stringify(distilled, null, 2), 'utf8');
  return distilled;
}

export interface Tokens {
  cssFiles: number;
  colors: string[];
  fonts: string[];
  sizes: string[];
  radii: string[];
}

/** 从离线站 assets/*.css 里统计设计 token(确定性)。 */
export async function extractTokens(siteDir: string): Promise<Tokens> {
  const assetsDir = path.join(siteDir, 'assets');
  const files = (await fs.readdir(assetsDir).catch(() => [])).filter((f) => f.endsWith('.css'));
  let css = '';
  for (const f of files) css += '\n' + (await fs.readFile(path.join(assetsDir, f), 'utf8').catch(() => ''));
  const freq = (re: RegExp, norm: (x: string) => string = (x) => x): string[] => {
    const m: Record<string, number> = {};
    let x: RegExpExecArray | null;
    while ((x = re.exec(css))) {
      const v = norm(x[1] || x[0]);
      if (v) m[v] = (m[v] || 0) + 1;
    }
    return Object.entries(m).sort((a, b) => b[1] - a[1]).map((e) => e[0]);
  };
  return {
    cssFiles: files.length,
    colors: freq(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]+\)/g, (v) => v.toLowerCase()).slice(0, 16),
    fonts: freq(/font-family\s*:\s*([^;}]+)/gi, (v) => v.trim().slice(0, 60)).slice(0, 8),
    sizes: freq(/font-size\s*:\s*([0-9.]+(?:px|rem|em))/gi, (v) => v.trim()).slice(0, 12),
    radii: freq(/border-radius\s*:\s*([0-9.]+(?:px|rem|em|%))/gi, (v) => v.trim()).slice(0, 10),
  };
}

/** 蒸馏结果压成喂 LLM 的紧凑文本。整站可能上百页, 按模板去重每类留一个代表 + 兜底截断,
 *  避免 prompt 过大导致首 token 迟到、被网关空闲 504。 */
function compactOutlines(d: Distilled): string {
  const nav = d.outlines[0]?.outline?.navItems?.slice(0, 16).join(' / ') || '';
  // 按 pattern 去重: 同模板不同 query(如 /top/index.ql?byType=N)只留首个代表, 最多 70 页。
  const seen = new Set<string>();
  const reps = [];
  for (const p of d.outlines) {
    if (!p.outline) continue;
    if (seen.has(p.pattern)) continue;
    seen.add(p.pattern);
    reps.push(p);
    if (reps.length >= 70) break;
  }
  let s = `站点: ${d.rootHost}\n全站主导航: ${nav}\n\n代表页面(每模板一个, 共${reps.length}/${d.outlines.length}):\n`;
  for (const p of reps) {
    const o = p.outline!;
    s += `\n## ${p.label} — ${p.pattern}\n`;
    if (o.headings.length) s += `标题: ${o.headings.slice(0, 8).join(' | ')}\n`;
    if (o.forms.length)
      s += `表单: ${o.forms
        .map((f) => `[${f.fields.map((x) => x.name || x.placeholder || x.type).filter(Boolean).join(',')}]→${f.submit}`)
        .join(' ; ')}\n`;
    const btns = o.buttons.slice(0, 10);
    if (btns.length) s += `按钮: ${btns.join(' | ')}\n`;
    if (o.repeated.length)
      s +=
        o.repeated
          .slice(0, 5)
          .map((r) => `重复块(${r.sig} ×${r.count}): ${r.fields.slice(0, 8).join(' · ')}`)
          .join('\n') + '\n';
  }
  return s.slice(0, 42000); // 再兜底截断, 保证首 token 及时
}

interface Pass {
  key: OutputKey;
  file: string;
  system: string;
  user: (oc: string, tokenText: string) => string;
}

const PASSES: Pass[] = [
  {
    key: 'product',
    file: 'product-structure.md',
    system: '你是资深产品经理。基于一个网站各页面的 UI 语义骨架, 逆推它的产品结构。只输出文档正文。',
    user: (oc) =>
      `${oc}\n\n请输出:\n1. **产品概述**(一句话定位 + 核心价值)\n2. **目标用户与角色**(游客/注册用户/开发者/创作者等, 各自能做什么)\n3. **信息架构**(用表格: 页面 | 路径 | 作用 | 所属模块)\n4. **功能模块清单**(按模块分组, 每模块列关键功能点)`,
  },
  {
    key: 'dataModel',
    file: 'data-model.md',
    system: '你是后端数据架构师。基于网站各页面 UI 里出现的字段/重复卡片/列表, 逆推后端数据模型。只输出文档正文。',
    user: (oc) =>
      `${oc}\n\n请逆推核心数据实体。对每个实体用一个表格(字段 | 类型 | 说明), 字段要具体。最后给一节 **实体关系**(谁引用谁, 一对多/多对多)。`,
  },
  {
    key: 'backend',
    file: 'backend-requirements.md',
    system: '你是后端架构师。基于网站页面的数据展示与交互, 逆推服务端需要提供的 REST API 与需求。只输出文档正文。',
    user: (oc) =>
      `${oc}\n\n请输出:\n1. **接口总览**(按模块分组, 表格: 方法 | 路径 | 说明 | 鉴权), 路径用 RESTful 风格。\n2. **鉴权与权限**(游客可读哪些, 写操作需登录, 特殊角色额外权限)。\n3. **关键接口出入参举例**(挑 3-4 个重要接口, 给请求参数和返回字段)。\n4. **非功能需求**(分页、缓存/CDN、限流、搜索、实时通知等)。`,
  },
  {
    key: 'design',
    file: 'design-system.md',
    system: '你是设计系统专家。基于网站的共用结构(导航/页脚/重复卡片组件的类名)和 CSS 设计 token, 输出一份设计系统概览。只输出文档正文。',
    user: (oc, tokenText) =>
      `设计 token:\n${tokenText}\n\n页面结构线索:\n${oc}\n\n请输出:\n1. **设计 Token**(色板表: 用途|色值; 字体; 字号阶梯; 圆角)。\n2. **共用组件清单**(表格: 组件 | 出现页面 | 作用)。\n3. **布局模式**(栅格/侧栏/信息流等)。`,
  },
];

/** 跑选中的 LLM pass, 写 siteDir/analysis/*.md, 返回文档清单。 */
export async function analyzeToMarkdown(opts: {
  siteDir: string;
  distilled: Distilled;
  tokens: Tokens;
  outputs: OutputKey[];
  model?: string;
  locale?: Locale;
  onProgress?: (msg: string) => void;
}): Promise<TaskDoc[]> {
  const { siteDir, distilled, tokens, outputs, model = 'codex-5.5', locale = 'en', onProgress } = opts;
  const analysisDir = path.join(siteDir, 'analysis');
  await fs.mkdir(analysisDir, { recursive: true });

  const lang = llmLang(locale);
  // 语言指令: 强制整篇(含所有标题)用目标语言输出。附到每个 system 后。
  const langDirective = ` Output the ENTIRE document, including every heading and table header, in ${lang}, using Markdown.`;

  const oc = compactOutlines(distilled);
  const tokenText = `CSS ${tokens.cssFiles} 个。主色(频次): ${tokens.colors.join(', ')}\n字体: ${tokens.fonts.join(
    ' | '
  )}\n字号阶梯: ${tokens.sizes.join(', ')}\n圆角: ${tokens.radii.join(', ')}`;

  const selected = PASSES.filter((p) => outputs.includes(p.key));
  const docs: TaskDoc[] = [];
  for (const p of selected) {
    const title = t(locale, `doc.${p.key}`);
    onProgress?.(t(locale, 'p.analyze.gen', { title }));
    let md: string;
    try {
      // 网关对大 prompt 偶发空闲 504(首 token 迟到), 重试 2 次即可越过冷启/瞬时过载。
      md = await withRetry(() =>
        chatComplete({ system: p.system + langDirective, user: p.user(oc, tokenText), model, temperature: 0.2, maxTokens: 6000 })
      );
    } catch (e) {
      md = `> 生成失败: ${e instanceof Error ? e.message : String(e)}`;
    }
    await fs.writeFile(path.join(analysisDir, p.file), `# ${title}\n\n${md}\n`, 'utf8');
    docs.push({ key: p.key, title, file: `analysis/${p.file}` });
  }
  return docs;
}

/** LLM 调用重试: 网关 504/空响应等瞬时错误重发。空响应也视为失败。 */
async function withRetry(fn: () => Promise<string>, attempts = 3): Promise<string> {
  let last: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      const r = await fn();
      if (r.trim()) return r;
      throw new Error('空响应');
    } catch (e) {
      last = e;
    }
  }
  throw last instanceof Error ? last : new Error(String(last));
}
