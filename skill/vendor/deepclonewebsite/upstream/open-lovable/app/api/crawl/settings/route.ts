import { NextRequest, NextResponse } from 'next/server';
import { writeSettings, getLlmConfig } from '@/lib/crawl/settings';

export const runtime = 'nodejs';

/** 掩码密钥, 只回显头尾。 */
function mask(k: string): string {
  if (!k) return '';
  if (k.length <= 8) return '••••';
  return k.slice(0, 4) + '••••' + k.slice(-4);
}

/** 读设置。密钥永不明文返回, 只回 hasKey + 掩码。 */
export async function GET() {
  try {
    const cfg = await getLlmConfig();
    return NextResponse.json({
      success: true,
      model: cfg.model,
      hasKey: !!cfg.apiKey,
      keyMask: mask(cfg.apiKey),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/** 保存。body: { model?, mdboxKey? } —— mdboxKey 空串则不动已存密钥。 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const saved = await writeSettings({
      model: typeof body.model === 'string' ? body.model : undefined,
      mdboxKey: typeof body.mdboxKey === 'string' ? body.mdboxKey : undefined,
    });
    return NextResponse.json({ success: true, model: saved.model || 'codex-5.5', hasKey: !!(saved.mdboxKey || process.env.OPENAI_API_KEY) });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
