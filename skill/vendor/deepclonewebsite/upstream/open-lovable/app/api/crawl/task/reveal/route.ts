import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { taskDir } from '@/lib/crawl/tasks';

export const runtime = 'nodejs';

/** 在系统文件管理器里打开任务的本地资源目录。body: { domain, id } */
export async function POST(req: NextRequest) {
  try {
    const { domain, id } = await req.json();
    if (!domain || !id) {
      return NextResponse.json({ success: false, error: '缺少 domain / id' }, { status: 400 });
    }
    const dir = taskDir(String(domain), String(id));
    // 目录必须存在(也顺带挡掉不存在的任务)
    const stat = await fs.stat(dir).catch(() => null);
    if (!stat?.isDirectory()) {
      return NextResponse.json({ success: false, error: '任务目录不存在' }, { status: 404 });
    }
    // 按平台打开: Windows explorer / macOS open / Linux xdg-open。explorer 成功也可能返回码1, 不当错。
    const cmd = process.platform === 'win32' ? 'explorer.exe' : process.platform === 'darwin' ? 'open' : 'xdg-open';
    spawn(cmd, [dir], { detached: true, stdio: 'ignore' }).unref();
    return NextResponse.json({ success: true, dir });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
