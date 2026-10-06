import type { BrowserContext, Page } from 'playwright';
import { promises as fs } from 'fs';
import path from 'path';
import { canonicalHost } from './url-pattern';

/**
 * 交互式浏览器会话管理器 —— 整站克隆的入口。
 *
 * 流程: 用户输URL → openSession 弹真实(有头)浏览器打开该页 →
 * 用户在真窗口里自行登录/导航 → captureSession 抓当前URL + 登录态。
 *
 * 【登录持久化】用 launchPersistentContext + 按 host 分的磁盘 profile 目录:
 * 像真实浏览器 profile 一样, cookie/localStorage/IndexedDB 自动落盘, 关掉再开自动带上 → 免重复登录。
 * context/page 在 server 内存里跨多次 HTTP 请求保活, 爬取复用同一 context 天然带登录态。
 */

export interface CrawlSession {
  id: string;
  context: BrowserContext;
  page: Page;
  entryUrl: string;
  profileDir: string;
  createdAt: number;
  timer: ReturnType<typeof setTimeout>;
}

// 挂在 globalThis 上的单例 Map: Next.js dev 里不同路由/热重载会拿到各自的模块实例,
// 普通模块级变量不共享 → 必须用 globalThis 才能跨请求保活同一个浏览器会话。
const g = globalThis as unknown as { __CRAWL_SESSIONS__?: Map<string, CrawlSession> };
const SESSIONS: Map<string, CrawlSession> = g.__CRAWL_SESSIONS__ ?? (g.__CRAWL_SESSIONS__ = new Map());
const SESSION_TTL = 30 * 60 * 1000; // 30 分钟无操作自动关, 防止浏览器泄漏

function genId(): string {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

export function sessionDir(id: string): string {
  return path.join(process.cwd(), '.crawl-sessions', id);
}

/** 每个站点(host)一个持久化 profile 目录, 登录态存这里, 跨会话复用。 */
function profileDirForHost(url: string): string {
  let host = 'default';
  try {
    host = canonicalHost(new URL(url).host);
  } catch {
    /* 用 default */
  }
  const safe = host.replace(/[^a-z0-9.-]/gi, '_') || 'default';
  return path.join(process.cwd(), '.crawl-sessions', 'profiles', safe);
}

/** 关掉任何正在用同一 profile 目录的旧会话, 避免 profile 被占用(锁)。 */
async function releaseProfile(profileDir: string): Promise<void> {
  for (const s of SESSIONS.values()) {
    if (s.profileDir === profileDir) await closeSession(s.id);
  }
}

/**
 * 弹出有头浏览器打开 url, 返回 sessionId + 是否复用了已保存的登录 profile。
 * 用系统自带浏览器(channel:'chrome' 回退 'msedge'), 免下载完整 Chromium。
 */
export async function openSession(
  url: string
): Promise<{ id: string; entryUrl: string; reusedProfile: boolean }> {
  const { chromium } = await import('playwright');
  const profileDir = profileDirForHost(url);

  // 该 profile 目录之前是否已有登录数据 → 用来提示用户"这次免登录"。
  let reusedProfile = false;
  try {
    reusedProfile = (await fs.readdir(profileDir)).length > 0;
  } catch {
    reusedProfile = false;
  }
  await fs.mkdir(profileDir, { recursive: true });
  await releaseProfile(profileDir);

  const opts = {
    headless: false,
    viewport: null,
    locale: 'zh-CN',
    args: ['--disable-blink-features=AutomationControlled', '--start-maximized'],
  } as const;

  let context: BrowserContext;
  try {
    context = await chromium.launchPersistentContext(profileDir, { channel: 'chrome', ...opts });
  } catch {
    context = await chromium.launchPersistentContext(profileDir, { channel: 'msedge', ...opts });
  }

  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});

  const id = genId();
  const timer = setTimeout(() => {
    closeSession(id).catch(() => {});
  }, SESSION_TTL);
  SESSIONS.set(id, { id, context, page, entryUrl: url, profileDir, createdAt: Date.now(), timer });
  return { id, entryUrl: url, reusedProfile };
}

export function getSession(id: string): CrawlSession | undefined {
  return SESSIONS.get(id);
}

/**
 * 点「开始」时调用: 抓当前页 URL(作爬取根) + 当前登录态(cookie/localStorage)。
 * 登录态已由 persistent profile 自动落盘; 这里再显式导出一份 storage-state.json 供无头 worker 复用。
 */
export async function captureSession(
  id: string
): Promise<{ rootUrl: string; cookieCount: number; origins: string[]; statePath: string }> {
  const s = SESSIONS.get(id);
  if (!s) throw new Error('会话不存在或已超时关闭, 请重新打开浏览器');

  const rootUrl = s.page.url();
  const state = await s.context.storageState();

  const dir = sessionDir(id);
  await fs.mkdir(dir, { recursive: true });
  const statePath = path.join(dir, 'storage-state.json');
  await fs.writeFile(statePath, JSON.stringify(state), 'utf8');

  const origins = (state.origins || []).map((o) => o.origin);
  return { rootUrl, cookieCount: (state.cookies || []).length, origins, statePath };
}

/** 关闭会话。persistent context 关闭时会把 profile(含登录 cookie)刷回磁盘 → 下次免登录。 */
export async function closeSession(id: string): Promise<void> {
  const s = SESSIONS.get(id);
  if (!s) return;
  clearTimeout(s.timer);
  SESSIONS.delete(id);
  await s.context.close().catch(() => {});
}
