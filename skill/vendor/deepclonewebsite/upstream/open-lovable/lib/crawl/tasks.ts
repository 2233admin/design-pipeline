/**
 * 任务存储层 —— 按域名单独保存, 支持历史管理与重跑。
 *
 * 布局(都在 public/ 下, 便于直接访问产物; 已 gitignore):
 *   public/site-clone/<域名>/<taskId>/task.json          任务定义+进度+结果
 *   public/site-clone/<域名>/<taskId>/sitemap.json        爬虫产物
 *   public/site-clone/<域名>/<taskId>/capture-plan.json   策略产物(AI)
 *   public/site-clone/<域名>/<taskId>/index.html · pages/ · assets/   离线站(选 site)
 *   public/site-clone/<域名>/<taskId>/analysis/*.md       逆推文档(选分析)
 *
 * 无独立 index.json: listTasks 直接扫子目录读 task.json(串行执行, 不担心并发)。
 */

import { promises as fs } from 'fs';
import path from 'path';
import type { Locale } from '@/lib/i18n';

export type Depth = 'structure' | 'full';
export type OutputKey = 'site' | 'product' | 'dataModel' | 'backend' | 'design';

export interface TaskOptions {
  depth: Depth;
  outputs: OutputKey[];
  /** full 模式实际访问的页面上限(防跑飞), 默认 200。structure 模式忽略。 */
  maxPages?: number;
}

export type TaskStatus =
  | 'created'
  | 'awaiting-login'
  | 'crawling'
  | 'planning'
  | 'building'
  | 'distilling'
  | 'analyzing'
  | 'done'
  | 'error';

export interface ProgressEntry {
  at: string;
  step: string;
  msg: string;
}

export interface TaskDoc {
  key: OutputKey;
  title: string;
  file: string; // 相对 taskDir
}

export interface TaskResult {
  types?: number;
  pages?: number;
  assets?: number;
  siteIndex?: string; // 相对 taskDir, 如 index.html
  docs?: TaskDoc[];
}

export interface Task {
  id: string;
  domain: string; // 安全化后的域名(即目录名)
  rootUrl: string;
  name: string;
  locale: Locale; // 进度日志 + 逆推文档的输出语言(建任务时按 UI 语言固定)
  createdAt: string;
  updatedAt: string;
  options: TaskOptions;
  status: TaskStatus;
  progress: ProgressEntry[];
  result?: TaskResult;
  error?: string;
}

const ROOT = path.join(process.cwd(), 'public', 'site-clone');

/** 域名 → 安全目录名(去协议/端口, 只留 host)。 */
export function safeDomain(urlOrHost: string): string {
  let host = urlOrHost;
  try {
    host = new URL(urlOrHost).host;
  } catch {
    /* 已是 host */
  }
  return host.replace(/[^a-z0-9.-]/gi, '_').toLowerCase() || 'unknown';
}

export function domainDir(domain: string): string {
  return path.join(ROOT, domain);
}
export function taskDir(domain: string, id: string): string {
  return path.join(ROOT, domain, id);
}

function genId(): string {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
}

async function readTaskJson(dir: string): Promise<Task | null> {
  try {
    return JSON.parse(await fs.readFile(path.join(dir, 'task.json'), 'utf8')) as Task;
  } catch {
    return null;
  }
}

// 串行化同一任务文件的读改写, 防止并发 updateTask/appendProgress 交错写坏 task.json。
const taskLocks = new Map<string, Promise<unknown>>();
function withTaskLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = taskLocks.get(key) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  taskLocks.set(key, next.catch(() => {}));
  return next;
}

let tmpSeq = 0;
async function writeTaskJson(task: Task): Promise<void> {
  const dir = taskDir(task.domain, task.id);
  await fs.mkdir(dir, { recursive: true });
  // 原子写: 先落临时文件再 rename(同盘 rename 原子), 读者永不会看到半截文件。
  const tmp = path.join(dir, `.task.json.tmp-${process.pid}-${tmpSeq++}`);
  await fs.writeFile(tmp, JSON.stringify(task, null, 2), 'utf8');
  await fs.rename(tmp, path.join(dir, 'task.json'));
}

export async function createTask(input: {
  rootUrl: string;
  name: string;
  locale?: Locale;
  options: TaskOptions;
}): Promise<Task> {
  const domain = safeDomain(input.rootUrl);
  const now = new Date().toISOString();
  const task: Task = {
    id: genId(),
    domain,
    rootUrl: input.rootUrl,
    name: input.name || domain,
    locale: input.locale || 'en',
    createdAt: now,
    updatedAt: now,
    options: input.options,
    status: 'created',
    progress: [],
  };
  await writeTaskJson(task);
  return task;
}

export async function getTask(domain: string, id: string): Promise<Task | null> {
  return readTaskJson(taskDir(domain, id));
}

export async function updateTask(
  domain: string,
  id: string,
  patch: Partial<Task>
): Promise<Task> {
  return withTaskLock(taskDir(domain, id), async () => {
    const cur = await getTask(domain, id);
    if (!cur) throw new Error('任务不存在');
    const next: Task = { ...cur, ...patch, updatedAt: new Date().toISOString() };
    await writeTaskJson(next);
    return next;
  });
}

export async function appendProgress(
  domain: string,
  id: string,
  step: TaskStatus | string,
  msg: string
): Promise<void> {
  return withTaskLock(taskDir(domain, id), async () => {
    const cur = await getTask(domain, id);
    if (!cur) return;
    cur.progress.push({ at: new Date().toISOString(), step, msg });
    cur.updatedAt = new Date().toISOString();
    await writeTaskJson(cur);
  });
}

/** 列一个域名下的所有任务(按创建时间倒序)。 */
export async function listTasks(domain: string): Promise<Task[]> {
  const dir = domainDir(domain);
  let entries: string[] = [];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return [];
  }
  const tasks: Task[] = [];
  for (const e of entries) {
    const t = await readTaskJson(path.join(dir, e));
    if (t) tasks.push(t);
  }
  return tasks.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** 列所有出现过的域名 + 各自任务数。 */
export async function listDomains(): Promise<Array<{ domain: string; count: number }>> {
  let entries: string[] = [];
  try {
    entries = await fs.readdir(ROOT);
  } catch {
    return [];
  }
  const out: Array<{ domain: string; count: number }> = [];
  for (const d of entries) {
    const stat = await fs.stat(path.join(ROOT, d)).catch(() => null);
    if (!stat?.isDirectory()) continue;
    const tasks = await listTasks(d);
    if (tasks.length) out.push({ domain: d, count: tasks.length });
  }
  return out.sort((a, b) => a.domain.localeCompare(b.domain));
}

export async function deleteTask(domain: string, id: string): Promise<void> {
  await fs.rm(taskDir(domain, id), { recursive: true, force: true });
}
