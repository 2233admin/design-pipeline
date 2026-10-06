import { NextRequest, NextResponse } from 'next/server';
import { crawlSite } from '@/lib/crawl/site-crawler';

export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * Phase 2: 用 Phase1 存活的登录 context 串行爬同域结构, 按类型归组返回站点地图。
 * body: { sessionId, maxPages?, maxDepth? }
 */
export async function POST(req: NextRequest) {
  try {
    const { sessionId, maxPages, maxDepth } = await req.json();
    if (!sessionId) {
      return NextResponse.json({ success: false, error: '缺少 sessionId' }, { status: 400 });
    }
    const siteMap = await crawlSite(sessionId, {
      maxPages: typeof maxPages === 'number' ? maxPages : undefined,
      maxDepth: typeof maxDepth === 'number' ? maxDepth : undefined,
    });
    return NextResponse.json({ success: true, siteMap });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
