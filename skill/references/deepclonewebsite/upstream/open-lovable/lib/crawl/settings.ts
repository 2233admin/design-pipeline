/**
 * 运行时设置 —— AI 模型 + mdbox 密钥/网关地址。
 *
 * 持久到 gitignored 的 .clone-settings.json(与 .env.local 同等: 绝不进仓库)。
 * 读取时以「文件 > 环境变量」合并: UI 里设了就用 UI 的, 没设就回落 .env.local。
 */

import { promises as fs } from 'fs';
import path from 'path';

const FILE = path.join(process.cwd(), '.clone-settings.json');

export interface CloneSettings {
  model?: string;
  mdboxKey?: string;
  mdboxBaseUrl?: string;
}

export async function readSettings(): Promise<CloneSettings> {
  try {
    return JSON.parse(await fs.readFile(FILE, 'utf8')) as CloneSettings;
  } catch {
    return {};
  }
}

/** 合并保存: model/baseUrl 空串=清除回落env; key 空串=保持不变(避免把已存密钥清掉)。 */
export async function writeSettings(patch: CloneSettings): Promise<CloneSettings> {
  const cur = await readSettings();
  const next: CloneSettings = { ...cur };
  if (patch.model !== undefined) next.model = patch.model.trim() || undefined;
  if (patch.mdboxBaseUrl !== undefined) next.mdboxBaseUrl = patch.mdboxBaseUrl.trim() || undefined;
  if (patch.mdboxKey && patch.mdboxKey.trim()) next.mdboxKey = patch.mdboxKey.trim();
  await fs.writeFile(FILE, JSON.stringify(next, null, 2), 'utf8');
  return next;
}

/** 有效 LLM 配置: 文件优先, 回落环境变量。 */
export async function getLlmConfig(): Promise<{ baseUrl: string; apiKey: string; model: string }> {
  const s = await readSettings();
  return {
    baseUrl: s.mdboxBaseUrl || process.env.OPENAI_BASE_URL || '',
    apiKey: s.mdboxKey || process.env.OPENAI_API_KEY || '',
    model: s.model || 'codex-5.5',
  };
}
