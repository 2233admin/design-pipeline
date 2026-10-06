/**
 * URL 类型模式工具 —— 整站克隆"克隆结构不是数据"的核心:
 * 把具体 URL 归一成"页面类型"(把 id/hash 段替换成 :id), 同类型只抓 1 个代表。
 * 纯函数, 不依赖浏览器, 可单测。
 */

/** 去掉 hash、结尾多余斜杠, 统一小写 host。返回 null 表示不是合法 http(s) URL。 */
export function normalizeUrl(raw: string, base?: string): string | null {
  try {
    const u = new URL(raw, base);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    u.hash = '';
    // 结尾斜杠归一(根路径 "/" 保留)
    if (u.pathname.length > 1 && u.pathname.endsWith('/')) u.pathname = u.pathname.slice(0, -1);
    u.host = u.host.toLowerCase();
    return u.toString();
  } catch {
    return null;
  }
}

/** host 归一: 去掉开头 www., 便于 www 与非 www 视为同域。 */
export function canonicalHost(host: string): string {
  return host.toLowerCase().replace(/^www\./, '');
}

export function sameDomain(url: string, rootHost: string): boolean {
  try {
    return canonicalHost(new URL(url).host) === canonicalHost(rootHost);
  } catch {
    return false;
  }
}

// 看起来像"数据 id"的路径段: 纯数字 / 长 hex / uuid / 以 -数字 结尾。
function isIdSegment(seg: string): boolean {
  if (/^\d+$/.test(seg)) return true;
  if (/^[0-9a-f]{8,}$/i.test(seg)) return true;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seg)) return true;
  if (/-\d{3,}$/.test(seg)) return true; // some-slug-12345
  return false;
}

/**
 * 页面类型模式: 只看 pathname, 把 id 段替换成 :id。查询串是否存在记为 ?…(不含具体值)。
 * 例: /app/247283 → /app/:id ; /top/played → /top/played ; / → /
 */
export function urlPattern(url: string): string {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return url;
  }
  const segs = u.pathname.split('/').filter(Boolean).map((s) => (isIdSegment(s) ? ':id' : s));
  const path = '/' + segs.join('/');
  return path + (u.search ? '?…' : '');
}

// 不该爬的链接: 登出(会毁掉登录态!)/ 下载文件 / 非页面协议 / 明显的动作端点。
const SKIP_RE = /(logout|signout|sign-out|log-out|\/api\/|\.(zip|dmg|exe|apk|pkg|pdf|jpg|jpeg|png|gif|svg|webp|mp4|mp3|css|js|xml|rss|json)(\?|$))/i;

export function isCrawlableLink(url: string): boolean {
  if (SKIP_RE.test(url)) return false;
  try {
    const p = new URL(url).protocol;
    return p === 'http:' || p === 'https:';
  } catch {
    return false;
  }
}
