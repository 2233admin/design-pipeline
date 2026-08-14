import { NextRequest, NextResponse } from 'next/server';
import { listDomains, listTasks } from '@/lib/crawl/tasks';
import { runningTask } from '@/lib/crawl/run-task';

export const runtime = 'nodejs';

/** 列表。?domain=xxx → 该域名任务列表; 无 domain → 所有域名概览。 */
export async function GET(req: NextRequest) {
  try {
    const domain = req.nextUrl.searchParams.get('domain');
    if (domain) {
      const tasks = await listTasks(domain);
      return NextResponse.json({ success: true, tasks, running: runningTask() });
    }
    const domains = await listDomains();
    return NextResponse.json({ success: true, domains, running: runningTask() });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
