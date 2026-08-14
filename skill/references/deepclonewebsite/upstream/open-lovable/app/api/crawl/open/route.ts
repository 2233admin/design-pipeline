import { NextRequest, NextResponse } from 'next/server';
import { openSession } from '@/lib/crawl/browser-session';

export const runtime = 'nodejs';
export const maxDuration = 120;

/** 打开有头浏览器指向 url, 返回 sessionId。用户随后在真窗口里登录/导航。 */
export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url || !/^https?:\/\//i.test(url)) {
      return NextResponse.json({ success: false, error: '请提供 http(s):// 开头的 URL' }, { status: 400 });
    }
    const { id, entryUrl, reusedProfile } = await openSession(url);
    return NextResponse.json({ success: true, sessionId: id, entryUrl, reusedProfile });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
