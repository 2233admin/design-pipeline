import { NextRequest, NextResponse } from 'next/server';
import { closeSession } from '@/lib/crawl/browser-session';

export const runtime = 'nodejs';

/** 关闭有头浏览器会话, 释放资源。 */
export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();
    if (sessionId) await closeSession(sessionId);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
