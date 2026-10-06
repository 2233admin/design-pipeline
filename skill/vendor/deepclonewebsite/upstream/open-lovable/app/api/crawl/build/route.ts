import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { sessionDir } from '@/lib/crawl/browser-session';
import { buildSite } from '@/lib/crawl/rebuild-site';
import type { CapturePlan } from '@/lib/crawl/plan-strategy';
import type { SiteMap } from '@/lib/crawl/site-crawler';

export const runtime = 'nodejs';
export const maxDuration = 600;

/**
 * Phase 4: 按 capture-plan 忠实抓取代表页 + 下载真实资源 + 重建离线多页站。
 * POST { sessionId, limit?, patterns?[] }。limit/patterns 用于先试跑单页。
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sessionId: string = body.sessionId;
    if (!sessionId) return NextResponse.json({ success: false, error: '缺少 sessionId' }, { status: 400 });

    const dir = sessionDir(sessionId);
    const plan = JSON.parse(await fs.readFile(path.join(dir, 'capture-plan.json'), 'utf8')) as CapturePlan;
    const siteMap = JSON.parse(await fs.readFile(path.join(dir, 'sitemap.json'), 'utf8')) as SiteMap;

    const result = await buildSite(sessionId, plan, siteMap.rootHost, {
      limit: body.limit,
      patterns: body.patterns,
    });

    const indexUrl = `/site-clone/${result.jobId}/${result.indexFile}`;
    return NextResponse.json({ success: true, ...result, indexUrl });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
