import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { sessionDir } from '@/lib/crawl/browser-session';
import { planStrategy } from '@/lib/crawl/plan-strategy';
import type { SiteMap } from '@/lib/crawl/site-crawler';

export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * Phase 3: LLM 审 sitemap → 归并类型 + 定抓取策略。
 * POST { sessionId, model? } 读该会话已落盘的 sitemap.json; 或直接传 { siteMap }。
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const model: string | undefined = body.model;

    let siteMap: SiteMap | undefined = body.siteMap;
    if (!siteMap && body.sessionId) {
      const p = path.join(sessionDir(body.sessionId), 'sitemap.json');
      siteMap = JSON.parse(await fs.readFile(p, 'utf8')) as SiteMap;
    }
    if (!siteMap || !siteMap.types?.length) {
      return NextResponse.json({ success: false, error: '缺少 sitemap(先爬取结构)' }, { status: 400 });
    }

    const plan = await planStrategy(siteMap, model);

    if (body.sessionId) {
      const out = path.join(sessionDir(body.sessionId), 'capture-plan.json');
      await fs.mkdir(sessionDir(body.sessionId), { recursive: true });
      await fs.writeFile(out, JSON.stringify(plan, null, 2), 'utf8');
    }

    return NextResponse.json({ success: true, plan });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
