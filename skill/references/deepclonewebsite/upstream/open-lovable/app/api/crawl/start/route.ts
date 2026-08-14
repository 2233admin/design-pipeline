import { NextRequest, NextResponse } from 'next/server';
import { captureSession } from '@/lib/crawl/browser-session';

export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * 用户点「开始」: 抓当前浏览器的根 URL + 登录态(cookie/storageState)。
 * Phase 1 到此为止(确认登录态已捕获); Phase 2 起接爬取管线。
 */
export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();
    if (!sessionId) {
      return NextResponse.json({ success: false, error: '缺少 sessionId' }, { status: 400 });
    }
    const cap = await captureSession(sessionId);
    return NextResponse.json({ success: true, ...cap });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
