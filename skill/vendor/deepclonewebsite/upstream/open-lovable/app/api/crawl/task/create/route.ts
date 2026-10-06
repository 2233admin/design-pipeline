import { NextRequest, NextResponse } from 'next/server';
import { createTask, type Depth, type OutputKey } from '@/lib/crawl/tasks';
import { LOCALES, type Locale } from '@/lib/i18n';

export const runtime = 'nodejs';

const DEPTHS: Depth[] = ['structure', 'full'];
const OUTPUTS: OutputKey[] = ['site', 'product', 'dataModel', 'backend', 'design'];

/** 创建任务。body: { rootUrl, name?, locale?, depth, outputs[], maxPages? } */
export async function POST(req: NextRequest) {
  try {
    const { rootUrl, name, locale, depth, outputs, maxPages } = await req.json();
    if (!rootUrl || !/^https?:\/\//i.test(rootUrl)) {
      return NextResponse.json({ success: false, error: '请提供 http(s):// 开头的 URL' }, { status: 400 });
    }
    if (!DEPTHS.includes(depth)) {
      return NextResponse.json({ success: false, error: '爬虫深度必须是 structure 或 full' }, { status: 400 });
    }
    const outs: OutputKey[] = Array.isArray(outputs) ? outputs.filter((o: OutputKey) => OUTPUTS.includes(o)) : [];
    if (!outs.length) {
      return NextResponse.json({ success: false, error: '至少选一个数据产物' }, { status: 400 });
    }
    const loc: Locale = LOCALES.some((l) => l.code === locale) ? locale : 'en';
    const task = await createTask({
      rootUrl,
      name: name || '',
      locale: loc,
      options: { depth, outputs: outs, maxPages: typeof maxPages === 'number' ? maxPages : undefined },
    });
    return NextResponse.json({ success: true, task });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
