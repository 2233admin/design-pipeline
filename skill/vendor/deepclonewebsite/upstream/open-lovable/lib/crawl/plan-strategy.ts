/**
 * Phase 3 — LLM 策略层。
 *
 * 输入: Phase 2 的 SiteMap(爬虫确定性抓到的页面类型清单)。
 * 输出: CapturePlan —— LLM 审这张表, 把"被过度拆分的同模板页"归并(如一堆 /tag/中文词
 * 其实是同一个标签聚合页)、给每类中文标签+角色、挑代表页、标记该不该抓。
 *
 * 注意: 这里只做"抓哪些/怎么归类"的策略。真正的设计系统/组件深度分析放 Phase 4
 * (那需要真实 HTML/CSS, 只凭 URL+标题猜不准)。所以本层不产设计 token, 只给一句话概述。
 */

import type { SiteMap } from './site-crawler';
import { chatComplete, parseJsonLoose } from './llm';
import { llmLang, type Locale } from '@/lib/i18n';

export type PageRole = 'home' | 'list' | 'detail' | 'landing' | 'utility' | 'auth' | 'other';

export interface PlanType {
  label: string; // 中文标签, 如 "游戏详情页"
  role: PageRole;
  pattern: string; // 归并后的规范模式, 可能合并了多个源 pattern
  representativeUrl: string;
  mergedFrom: string[]; // 被并进来的源 pattern(含自身)
  totalCount: number; // 合并后该类型页面总数
  capture: boolean; // Phase 4 是否抓取
  reason: string; // 一句话理由
}

export interface CapturePlan {
  model: string;
  plannedAt: string;
  siteSummary: string; // 全站一句话
  sharedComponentsGuess: string[]; // 共用组件初步猜测(header/nav/footer…), 待 Phase 4 证实
  types: PlanType[];
  captureCount: number; // capture=true 的类型数
}

const SYSTEM = (lang: string) => `你是网站结构分析师。给你一个爬虫抓到的"页面类型清单"(每类含 URL 模式 pattern、代表 URL、页面标题、层级 depth、该模式下页面数 count)。
你的任务是把这些类型整理成一份"克隆抓取计划": 我们要克隆网站的**结构/模板**, 同一个模板只抓一个代表页, 不抓数据。

规则:
1. **归并同模板**: 若多个 pattern 其实是同一个页面模板, 合并成一类。最常见: 一堆 /tag/<不同的词>、/category/<不同的词>、/topic/<不同的词> —— 词不一样但页面模板相同, 必须合并成一类(pattern 用 /tag/:slug 这种)。看标题模式也能判断(如都是"热门X类手游大全")。
2. **保留真不同的模板**: 详情页 vs 列表页 vs 论坛页是不同模板, 不要合并。例如 /app/:id(游戏详情) 与 /app/:id/topic(游戏论坛) 是两类。
3. 给每类一个简短 **label**(必须用 ${lang} 书写) 和 **role**(home/list/detail/landing/utility/auth/other)。
4. **representativeUrl**: 从该类里挑一个最典型的代表(优先 count 高的)。
5. **capture**: 登录/注册/退出/跳转类(role=auth)标 false; 其它默认 true。
6. 一句话 **reason**(用 ${lang} 书写)。

只输出 JSON, 不要解释, 不要 markdown 围栏。所有 label / reason / siteSummary / sharedComponentsGuess 文本一律用 ${lang}。结构:
{
  "siteSummary": "全站一句话概述",
  "sharedComponentsGuess": ["顶部导航", "页脚", "..."],
  "types": [
    {"label":"游戏详情页","role":"detail","pattern":"/app/:id","representativeUrl":"https://...","mergedFrom":["/app/:id"],"totalCount":21,"capture":true,"reason":"..."}
  ]
}`;

function buildUserPayload(siteMap: SiteMap): string {
  const rows = siteMap.types.map((t) => ({
    pattern: t.pattern,
    representativeUrl: t.representativeUrl,
    title: (t.title || '').slice(0, 60),
    depth: t.depth,
    count: t.count,
  }));
  return `站点根: ${siteMap.rootUrl}\n域: ${siteMap.rootHost}\n爬虫发现 ${siteMap.types.length} 种类型(共访问 ${siteMap.stats.visited} 页):\n\n${JSON.stringify(rows, null, 0)}`;
}

export async function planStrategy(
  siteMap: SiteMap,
  model = 'codex-5.5',
  locale: Locale = 'en'
): Promise<CapturePlan> {
  const raw = await chatComplete({
    system: SYSTEM(llmLang(locale)),
    user: buildUserPayload(siteMap),
    assistantPrefill: '{',
    model,
    temperature: 0.1,
    maxTokens: 4000,
  });

  const parsed = parseJsonLoose<{
    siteSummary?: string;
    sharedComponentsGuess?: string[];
    types?: Array<Partial<PlanType>>;
  }>('{' + raw); // 补回预填的 '{'

  const types: PlanType[] = (parsed.types || []).map((t) => ({
    label: t.label || t.pattern || '未命名',
    role: (t.role as PageRole) || 'other',
    pattern: t.pattern || '',
    representativeUrl: t.representativeUrl || '',
    mergedFrom: t.mergedFrom && t.mergedFrom.length ? t.mergedFrom : t.pattern ? [t.pattern] : [],
    totalCount: typeof t.totalCount === 'number' ? t.totalCount : 0,
    capture: t.capture !== false,
    reason: t.reason || '',
  }));

  return {
    model,
    plannedAt: new Date().toISOString(),
    siteSummary: parsed.siteSummary || '',
    sharedComponentsGuess: parsed.sharedComponentsGuess || [],
    types,
    captureCount: types.filter((t) => t.capture).length,
  };
}
