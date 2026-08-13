import { NextRequest, NextResponse } from 'next/server';
import { getTask } from '@/lib/crawl/tasks';
import { runningTask } from '@/lib/crawl/run-task';

export const runtime = 'nodejs';

/** 轮询单个任务状态/进度。?domain=&id= */
export async function GET(req: NextRequest) {
  try {
    const domain = req.nextUrl.searchParams.get('domain');
    const id = req.nextUrl.searchParams.get('id');
    if (!domain || !id) {
      return NextResponse.json({ success: false, error: '缺少 domain/id' }, { status: 400 });
    }
    const task = await getTask(domain, id);
    if (!task) return NextResponse.json({ success: false, error: '任务不存在' }, { status: 404 });
    return NextResponse.json({ success: true, task, running: runningTask() });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
