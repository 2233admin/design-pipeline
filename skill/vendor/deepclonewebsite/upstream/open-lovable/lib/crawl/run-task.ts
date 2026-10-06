/**
 * 任务编排器 —— 登录后按依赖顺序全自动跑到完成(串行, 一次一个任务)。
 *
 * 依赖解析: 任一产物 → 需 crawl + plan(AI, 仅结构模式) + build; 任一分析产物 → 再 distill + analyze(AI)。
 * 全程把状态/进度写回 task.json, 前端轮询 status 看进度。AI 只在 planStrategy 与 analyzeToMarkdown。
 */

import { promises as fs } from 'fs';
import path from 'path';
import { crawlSite } from './site-crawler';
import { planStrategy, type CapturePlan } from './plan-strategy';
import { buildSite } from './rebuild-site';
import { distillSite, extractTokens, analyzeToMarkdown } from './analyze-site';
import { normalizeUrl } from './url-pattern';
import { readSettings } from './settings';
import { t, type Locale } from '@/lib/i18n';
import {
  getTask,
  updateTask,
  appendProgress,
  taskDir,
  type OutputKey,
  type TaskResult,
} from './tasks';

const ANALYSIS_OUTPUTS: OutputKey[] = ['product', 'dataModel', 'backend', 'design'];

const g = globalThis as unknown as { __CLONE_TASK__?: { domain: string; id: string } | null };

export function runningTask(): { domain: string; id: string } | null {
  return g.__CLONE_TASK__ ?? null;
}

/** 串行入口: 已有任务在跑则拒绝。 */
export async function runTask(domain: string, id: string, sessionId: string): Promise<void> {
  if (g.__CLONE_TASK__) {
    throw new Error(`已有任务在运行(串行模式), 请等它结束: ${g.__CLONE_TASK__.id}`);
  }
  g.__CLONE_TASK__ = { domain, id };
  try {
    await execute(domain, id, sessionId);
  } finally {
    g.__CLONE_TASK__ = null;
  }
}

async function execute(domain: string, id: string, sessionId: string): Promise<void> {
  const task = await getTask(domain, id);
  if (!task) throw new Error('任务不存在');
  const dir = taskDir(domain, id);
  const { depth, outputs, maxPages } = task.options;
  const full = depth === 'full';
  const locale: Locale = task.locale || 'en';
  const tr = (key: string, vars?: Record<string, string | number>) => t(locale, key, vars);

  const needBuild = outputs.length > 0;
  const needAnalysis = outputs.some((o) => ANALYSIS_OUTPUTS.includes(o));
  const result: TaskResult = { ...(task.result || {}) };
  const model = (await readSettings()).model || 'codex-5.5';

  try {
    // ① 爬取
    await updateTask(domain, id, { status: 'crawling' });
    await appendProgress(domain, id, 'crawling', tr(full ? 'p.crawl.full' : 'p.crawl.structure'));
    let crawlN = 0;
    const siteMap = await crawlSite(sessionId, {
      full,
      maxPages,
      onProgress: (m) => {
        if (++crawlN % 5 === 0) appendProgress(domain, id, 'crawling', m).catch(() => {});
      },
    });
    await fs.writeFile(path.join(dir, 'sitemap.json'), JSON.stringify(siteMap, null, 2), 'utf8');
    result.types = siteMap.types.length;
    await updateTask(domain, id, { result });
    await appendProgress(domain, id, 'crawling', tr('p.crawl.done', { pages: siteMap.stats.visited, types: siteMap.types.length }));

    // ② 策略(AI, 仅结构模式需要挑代表) + ③ 抓取重建
    if (needBuild) {
      let plan: CapturePlan;
      if (full) {
        // 整站: 不挑代表, 每个页面都抓 → 用占位 plan + explicitTargets。
        plan = { model: '', plannedAt: '', siteSummary: '', sharedComponentsGuess: [], types: [], captureCount: 0 };
      } else {
        await updateTask(domain, id, { status: 'planning' });
        await appendProgress(domain, id, 'planning', tr('p.plan.start'));
        plan = await planStrategy(siteMap, model, locale);
        await fs.writeFile(path.join(dir, 'capture-plan.json'), JSON.stringify(plan, null, 2), 'utf8');
        await appendProgress(domain, id, 'planning', tr('p.plan.done', { n: plan.captureCount }));
      }

      // 整站模式的目标 = 去重后的全部访问页面
      const explicitTargets = full
        ? dedupeTargets(siteMap.allPages)
        : undefined;

      await updateTask(domain, id, { status: 'building' });
      await appendProgress(domain, id, 'building', full ? tr('p.build.full', { n: explicitTargets!.length }) : tr('p.build.structure'));
      const built = await buildSite(sessionId, plan, siteMap.rootHost, {
        outDir: dir,
        explicitTargets,
        locale,
        onProgress: (m) => appendProgress(domain, id, 'building', m).catch(() => {}),
      });
      result.pages = built.pages.length;
      result.assets = built.assetCount;
      result.siteIndex = built.indexFile;
      await updateTask(domain, id, { result });
      await appendProgress(domain, id, 'building', tr('p.build.done', { pages: built.pages.length, assets: built.assetCount }));
    }

    // ④ 蒸馏 + ⑤ 逆推分析(AI)
    if (needAnalysis) {
      await updateTask(domain, id, { status: 'distilling' });
      await appendProgress(domain, id, 'distilling', tr('p.distill.start'));
      const distilled = await distillSite(dir, (m) => appendProgress(domain, id, 'distilling', m).catch(() => {}), locale);
      const tokens = await extractTokens(dir);

      await updateTask(domain, id, { status: 'analyzing' });
      await appendProgress(domain, id, 'analyzing', tr('p.analyze.start'));
      const docs = await analyzeToMarkdown({
        siteDir: dir,
        distilled,
        tokens,
        outputs: outputs.filter((o) => ANALYSIS_OUTPUTS.includes(o)),
        model,
        locale,
        onProgress: (m) => appendProgress(domain, id, 'analyzing', m).catch(() => {}),
      });
      result.docs = docs;
      await updateTask(domain, id, { result });
    }

    await updateTask(domain, id, { status: 'done', result });
    await appendProgress(domain, id, 'done', tr('p.done'));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await updateTask(domain, id, { status: 'error', error: msg, result }).catch(() => {});
    await appendProgress(domain, id, 'error', tr('p.error', { msg })).catch(() => {});
  }
}

function dedupeTargets(pages: Array<{ url: string; pattern: string; title: string }>) {
  const seen = new Set<string>();
  const out: Array<{ label: string; pattern: string; url: string; role?: string }> = [];
  for (const p of pages) {
    const nu = normalizeUrl(p.url) || p.url;
    if (seen.has(nu)) continue;
    seen.add(nu);
    out.push({
      label: p.title || p.pattern,
      pattern: p.pattern,
      url: p.url,
      role: p.pattern === '/' ? 'home' : undefined,
    });
  }
  return out;
}
