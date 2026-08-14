/**
 * mdbox LLM 薄封装(OpenAI 兼容网关)。
 *
 * 只做一件事: 发 chat/completions, 服务端消费 SSE 拼成整段文本返回。
 * 用流式(stream:true)是硬性要求 —— 网关对"大 prompt + 大 max_tokens 的非流式请求"
 * 会空闲 504; 流式持续吐字就不会断。
 */

import { getLlmConfig } from './settings';

export interface ChatOptions {
  system: string;
  user: string;
  /** 预填 assistant 开头, 强制模型从这里续写(如 '{' 逼它直接吐 JSON)。不含在返回里, 需自己补。 */
  assistantPrefill?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export async function chatComplete(opts: ChatOptions): Promise<string> {
  const cfg = await getLlmConfig();
  const baseUrl = cfg.baseUrl;
  const apiKey = cfg.apiKey;
  if (!baseUrl || !apiKey) throw new Error('mdbox 密钥/网关未配置(在设置里填, 或 .env.local)');

  const model = (opts.model || cfg.model).replace(/^openai\//, '');
  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: opts.system },
    { role: 'user', content: opts.user },
  ];
  if (opts.assistantPrefill) messages.push({ role: 'assistant', content: opts.assistantPrefill });

  const resp = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages,
      temperature: opts.temperature ?? 0.2,
      max_tokens: opts.maxTokens ?? 4000,
      stream: true,
    }),
  });

  if (!resp.ok || !resp.body) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`LLM ${resp.status}: ${errText.slice(0, 400)}`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let out = '';
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith('data:')) continue;
      const payload = t.slice(5).trim();
      if (payload === '[DONE]') continue;
      try {
        const delta = JSON.parse(payload).choices?.[0]?.delta?.content;
        if (delta) out += delta;
      } catch {
        /* 忽略非 JSON 心跳行 */
      }
    }
  }
  return out;
}

/** 从模型输出里抠出 JSON(去 ```json 围栏 / 取第一个平衡的 {...})并解析。 */
export function parseJsonLoose<T = unknown>(raw: string): T {
  let s = raw.trim();
  // 去代码围栏
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  // 截到第一个 { 到最后一个 }
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first >= 0 && last > first) s = s.slice(first, last + 1);
  return JSON.parse(s) as T;
}
