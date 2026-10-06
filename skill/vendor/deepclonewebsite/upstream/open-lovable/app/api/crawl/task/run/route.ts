import { NextRequest, NextResponse } from 'next/server';
import { getTask, updateTask } from '@/lib/crawl/tasks';
import { captureSession } from '@/lib/crawl/browser-session';
import { runTask, runningTask } from '@/lib/crawl/run-task';

export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * 启动任务(登录门之后)。body: { domain, id, sessionId }
 * 先抓当前浏览器登录态落盘, 然后后台异步跑管线(不阻塞请求), 前端轮询 status。
 */
export async function POST(req: NextRequest) {
  try {
    const { domain, id, sessionId } = await req.json();
    if (!domain || !id || !sessionId) {
      return NextResponse.json({ success: false, error: '缺少 domain/id/sessionId' }, { status: 400 });
    }
    if (runningTask()) {
      return NextResponse.json({ success: false, error: `已有任务在运行(串行), 请等它结束` }, { status: 409 });
    }
    const task = await getTask(domain, id);
    if (!task) return NextResponse.json({ success: false, error: '任务不存在' }, { status: 404 });

    // 抓登录态落盘(build 阶段无头复用), 失败也继续 —— 活会话仍可用。
    try {
      await captureSession(sessionId);
    } catch {
      /* 无登录态也可爬公开站 */
    }
    await updateTask(domain, id, { status: 'crawling', error: undefined });

    // 后台跑, 不 await(dev server 常驻进程, promise 继续执行)。
    runTask(domain, id, sessionId).catch(() => {});

    return NextResponse.json({ success: true, started: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
