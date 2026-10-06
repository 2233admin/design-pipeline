import { NextRequest, NextResponse } from 'next/server';
import { deleteTask } from '@/lib/crawl/tasks';
import { runningTask } from '@/lib/crawl/run-task';

export const runtime = 'nodejs';

/** 删除任务(连同产物目录)。body: { domain, id } */
export async function POST(req: NextRequest) {
  try {
    const { domain, id } = await req.json();
    if (!domain || !id) {
      return NextResponse.json({ success: false, error: '缺少 domain/id' }, { status: 400 });
    }
    const run = runningTask();
    if (run && run.domain === domain && run.id === id) {
      return NextResponse.json({ success: false, error: '任务正在运行, 不能删除' }, { status: 409 });
    }
    await deleteTask(domain, id);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
