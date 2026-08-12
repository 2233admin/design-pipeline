import type { BrowserContext } from 'playwright';

/**
 * Phase 4 内核 — 忠实抓取单页(真实渲染后的静态快照)。
 *
 * 做法(SingleFile 风格): 用登录态 context 打开页面 → 等网络空闲 + 滚动触发懒加载 →
 * 在浏览器里把每个资源引用(img/srcset/link/font/内联背景)改成哨兵 `__ASSET__/<hash>`,
 * 同时**删掉 <script>**(DOM 已渲染好, 保留 JS 离线只会水合报错/变白)→ 序列化整个 DOM。
 * 资源本体不在这里下载, 由上层用 context.request 带 cookie 下载(见 rebuild-site.ts)。
 */

export interface AssetRef {
  absUrl: string;
  local: string; // 本地文件名 = djb2(absUrl)+扩展名
}

export interface PageCapture {
  url: string;
  finalUrl: string;
  title: string;
  html: string; // 含 __ASSET__/ 哨兵
  refs: AssetRef[]; // 去重后的资源引用
}

export interface CaptureOptions {
  navTimeout?: number;
  settle?: number;
}

// 浏览器内执行: 改写资源引用为哨兵 + 删脚本, 返回 {html, refs, title}。
// djb2/extOf 必须与 rebuild-site.ts 里的 node 版逐字节一致, 否则文件名对不上。
function inPageTransform() {
  const djb2 = (s: string) => {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return h.toString(36);
  };
  const extOf = (u: string) => {
    try {
      const p = new URL(u).pathname;
      const m = p.match(/\.([a-z0-9]{2,5})$/i);
      return m ? '.' + m[1].toLowerCase() : '';
    } catch {
      return '';
    }
  };
  const seen = new Map<string, string>();
  const refs: Array<{ absUrl: string; local: string }> = [];
  const local = (abs: string) => {
    let l = seen.get(abs);
    if (l) return l;
    l = djb2(abs) + (extOf(abs) || '.bin');
    seen.set(abs, l);
    refs.push({ absUrl: abs, local: l });
    return l;
  };
  const abs = (u: string | null): string | null => {
    if (!u) return null;
    try {
      return new URL(u, location.href).href;
    } catch {
      return null;
    }
  };
  const tag = (u: string) => '__ASSET__/' + local(u);
  const rewriteSrcset = (ss: string) =>
    ss
      .split(',')
      .map((part) => {
        const seg = part.trim().split(/\s+/);
        const a = abs(seg[0]);
        if (a) seg[0] = tag(a);
        return seg.join(' ');
      })
      .join(', ');

  // 脚本 & 脚本类 preload/prefetch & manifest: 删掉(离线跑 JS 只会坏事)
  document.querySelectorAll('script').forEach((s) => s.remove());
  document
    .querySelectorAll(
      'link[rel~="modulepreload"], link[rel~="preload"][as="script"], link[rel~="prefetch"], link[rel~="manifest"]'
    )
    .forEach((l) => l.remove());

  // 样式表 & 图标 & 字体 preload → 本地
  document.querySelectorAll('link[href]').forEach((l) => {
    const rel = (l.getAttribute('rel') || '').toLowerCase();
    const a = abs(l.getAttribute('href'));
    if (!a) return;
    if (/stylesheet|icon/.test(rel) || (rel.includes('preload') && l.getAttribute('as') === 'font')) {
      l.setAttribute('href', tag(a));
      l.removeAttribute('integrity');
      l.removeAttribute('crossorigin');
    }
  });

  // img
  document.querySelectorAll('img').forEach((img) => {
    const s = abs(img.getAttribute('src'));
    if (s) img.setAttribute('src', tag(s));
    const ss = img.getAttribute('srcset');
    if (ss) img.setAttribute('srcset', rewriteSrcset(ss));
    img.removeAttribute('loading');
  });

  // <source> (picture / video)
  document.querySelectorAll('source').forEach((s) => {
    const src = abs(s.getAttribute('src'));
    if (src) s.setAttribute('src', tag(src));
    const ss = s.getAttribute('srcset');
    if (ss) s.setAttribute('srcset', rewriteSrcset(ss));
  });

  // video poster / video|audio src
  document.querySelectorAll('video[poster]').forEach((v) => {
    const a = abs(v.getAttribute('poster'));
    if (a) v.setAttribute('poster', tag(a));
  });
  document.querySelectorAll('video[src], audio[src]').forEach((v) => {
    const a = abs(v.getAttribute('src'));
    if (a) v.setAttribute('src', tag(a));
  });

  // 内联 style 里的 url(...)
  document.querySelectorAll('[style]').forEach((el) => {
    const st = el.getAttribute('style');
    if (!st || st.indexOf('url(') < 0) return;
    el.setAttribute(
      'style',
      st.replace(/url\((['"]?)([^'")]+)\1\)/g, (m, _q, u) => {
        if (/^data:/.test(u)) return m;
        const a = abs(u);
        return a ? 'url(' + tag(a) + ')' : m;
      })
    );
  });

  return {
    html: '<!doctype html>\n' + document.documentElement.outerHTML,
    refs,
    title: document.title || '',
  };
}

export async function capturePage(
  context: BrowserContext,
  url: string,
  opts: CaptureOptions = {}
): Promise<PageCapture> {
  const navTimeout = opts.navTimeout ?? 45000;
  const settle = opts.settle ?? 1200;
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: navTimeout });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    // 滚到底触发懒加载图片, 再回顶
    await page
      .evaluate(async () => {
        await new Promise<void>((resolve) => {
          let y = 0;
          const step = () => {
            window.scrollTo(0, y);
            y += window.innerHeight;
            if (y < document.body.scrollHeight) setTimeout(step, 120);
            else {
              window.scrollTo(0, 0);
              resolve();
            }
          };
          step();
        });
      })
      .catch(() => {});
    await page.waitForTimeout(settle);
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    const finalUrl = page.url();
    const result = await page.evaluate(inPageTransform);

    // 按 local 去重
    const map = new Map<string, AssetRef>();
    for (const r of result.refs) if (!map.has(r.local)) map.set(r.local, r);

    return { url, finalUrl, title: result.title, html: result.html, refs: [...map.values()] };
  } finally {
    await page.close().catch(() => {});
  }
}
