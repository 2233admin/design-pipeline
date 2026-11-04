#!/usr/bin/env node

// 按 README 里跑之前定好的判定规则，从 results.tsv（和盲评的 judge.tsv，有的话）出结论。
// run.mjs 跑完会调它；分几次跑、追加到同一个结果目录后，也可以单独重算：node evals/ablation/report.mjs <结果目录>

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { median, quantile } from "./lib.mjs";
import { similarity } from "./measure.mjs";
import { LAYERS } from "./variants.mjs";

// 判定规则的门槛，改它们要先改 README 并在跑之前提交
export const RULES = {
	minRuns: 3, // 每格（变体 × 场景）至少这么多次打了分
	delta: 5, // 综合分中位数差至少 5 分
	agreeShare: 0.75, // 至少 3/4 的场景方向一致
	winRate: 0.6, // 盲评至少赢 60% 的分出胜负的对局
	loseRate: 0.4,
	minPairs: 12, // 盲评至少 12 局分出胜负
	stampPixel: 0.97, // 同一变体各次之间的像素相似度
	stampStructure: 0.9, // 和文字布局相似度都到这个数，算一个模子
	stampScenarios: 2, // 在至少 2 个场景里都这样，判为套模板
	skillUsed: 0.8, // 装了技能的变体，至少 80% 的运行看得出用了技能
};

const NUMERIC = new Set(["run", "score", "hygiene", "adherence", "rhythmScore", "palettePixels", "paletteElements", "typeScale", "declaredFonts", "minFont", "belowMinFont", "overflow", "contrastFails", "compositionErrors", "contentCoverage", "hiddenWithoutMotion", "fakeControls", "antiSlopHard", "gapCount", "gapOnStep", "distinctGaps", "ratioCv", "leftEdges", "decorations", "decorationKinds", "decorationRepeat", "seconds"]);

export function readTsv(file) {
	if (!existsSync(file)) return [];
	const [head, ...lines] = readFileSync(file, "utf8").split("\n").filter(Boolean);
	const keys = head.split("\t");
	return lines.map((line) => {
		const cells = line.split("\t");
		return Object.fromEntries(keys.map((key, index) => {
			const cell = cells[index] ?? "";
			if (NUMERIC.has(key)) return [key, cell === "" ? null : Number(cell)];
			if (cell === "true" || cell === "false") return [key, cell === "true"];
			return [key, cell];
		}));
	});
}

const fmt = (value, digits = 1) => (value === null || value === undefined || Number.isNaN(value) ? "-" : Number(value).toFixed(digits));

/** 同一变体、同一场景各次之间两两的相似度均值（截图缩略灰度、文字布局）。 */
export function sameness(rows) {
	const prints = rows.map((row) => join(row.capture ?? "", "fingerprint.json")).filter((file) => existsSync(file)).map((file) => JSON.parse(readFileSync(file, "utf8")));
	if (prints.length < 2) return null;
	const pairs = [];
	for (let i = 0; i < prints.length; i++) for (let j = i + 1; j < prints.length; j++) pairs.push(similarity(prints[i], prints[j]));
	const mean = (key) => pairs.reduce((sum, pair) => sum + pair[key], 0) / pairs.length;
	return { runs: prints.length, pixel: Number(mean("pixel").toFixed(4)), structure: Number(mean("structure").toFixed(4)) };
}

function cells(rows) {
	const scored = rows.filter((row) => row.status === "ok");
	const out = new Map();
	for (const row of scored) {
		const key = `${row.variant}\t${row.scenario}`;
		if (!out.has(key)) out.set(key, []);
		out.get(key).push(row);
	}
	return out;
}

// 变体在几个场景里跨次几乎一模一样
function stampedScenarios(variant, byCell) {
	return [...byCell.entries()].filter(([key, rows]) => {
		if (!key.startsWith(`${variant}\t`)) return false;
		const same = sameness(rows);
		return same && same.pixel >= RULES.stampPixel && same.structure >= RULES.stampStructure;
	}).length;
}

/** a 对 b：各场景综合分中位数之差、四分位距、盲评胜率，以及按规则的判断。 */
export function compare(a, b, byCell, judgeRows = []) {
	const scenarios = [...new Set([...byCell.keys()].map((key) => key.split("\t")[1]))].sort();
	const deltas = [];
	let spread = 0;
	for (const scenario of scenarios) {
		const left = (byCell.get(`${a}\t${scenario}`) ?? []).map((row) => row.score);
		const right = (byCell.get(`${b}\t${scenario}`) ?? []).map((row) => row.score);
		if (left.length < RULES.minRuns || right.length < RULES.minRuns) continue;
		deltas.push({ scenario, delta: median(left) - median(right) });
		for (const values of [left, right]) spread = Math.max(spread, quantile(values, 0.75) - quantile(values, 0.25));
	}
	const overall = deltas.length ? median(deltas.map((entry) => entry.delta)) : null;
	const need = Math.ceil(RULES.agreeShare * deltas.length);
	const stampedA = stampedScenarios(a, byCell) >= RULES.stampScenarios;
	const stampedB = stampedScenarios(b, byCell) >= RULES.stampScenarios;
	const measuredBetter = deltas.length > 0 && overall >= RULES.delta && deltas.filter((entry) => entry.delta > 0).length >= need && !stampedA;
	const measuredWorse = deltas.length > 0 && overall <= -RULES.delta && deltas.filter((entry) => entry.delta < 0).length >= need && !stampedB;
	const games = judgeRows.filter((row) => (row.left === a && row.right === b) || (row.left === b && row.right === a));
	const winsA = games.filter((row) => row.winner === a).length;
	const winsB = games.filter((row) => row.winner === b).length;
	const decided = winsA + winsB;
	const rate = decided ? winsA / decided : null;
	const judgeBetter = decided >= RULES.minPairs && rate >= RULES.winRate;
	const judgeWorse = decided >= RULES.minPairs && rate <= RULES.loseRate;
	let verdict;
	if (!deltas.length && decided < RULES.minPairs) verdict = "insufficient";
	else if ((measuredBetter || judgeBetter) && (measuredWorse || judgeWorse)) verdict = "conflict";
	else if (measuredBetter || judgeBetter) verdict = "better";
	else if (measuredWorse || judgeWorse) verdict = "worse";
	else if (overall !== null && spread > 2 * Math.abs(overall)) verdict = "noisy";
	else verdict = "no-effect";
	return { a, b, deltas, overall, spread, games: games.length, winsA, winsB, ties: games.length - decided, rate, stampedA, stampedB, measuredBetter, measuredWorse, judgeBetter, judgeWorse, verdict };
}

const LAYER_VERDICT = {
	better: "保留：去掉它会变差",
	worse: "砍掉：去掉它反而更好",
	noisy: "噪声太大：每格补到 5 次再判",
	"no-effect": "看不出作用：标记砍掉或重做",
	conflict: "量值和盲评方向相反：每格补到 5 次、盲评补到 24 局再判",
	insufficient: "数据不足：每格至少 3 次打了分",
};
const PAIR_VERDICT = { better: "前者胜", worse: "后者胜", noisy: "噪声太大，补跑", "no-effect": "分不出", conflict: "量值和盲评相反，补跑", insufficient: "数据不足" };

function line(result, labels) {
	const deltas = result.deltas.map((entry) => `${entry.scenario} ${entry.delta >= 0 ? "+" : ""}${fmt(entry.delta)}`).join("、");
	const judge = result.games ? `；盲评 ${result.winsA}:${result.winsB}（平 ${result.ties}），前者胜率 ${fmt(result.rate === null ? null : result.rate * 100, 0)}%` : "；没有盲评";
	const stamp = [result.stampedA ? `${result.a} 套模板，量值优势不算` : "", result.stampedB ? `${result.b} 套模板，量值优势不算` : ""].filter(Boolean).join("；");
	return `${result.a} 对 ${result.b}：综合分中位数差 ${fmt(result.overall)}（${deltas || "没有凑够次数的场景"}，最大四分位距 ${fmt(result.spread)}）${judge}${stamp ? `；${stamp}` : ""} → ${labels[result.verdict]}`;
}

/** 全部结论的文字行。 */
export function summarize(rows, judgeRows = []) {
	const out = [];
	const byCell = cells(rows);
	const variants = [...new Set(rows.map((row) => row.variant))];
	const scenarios = [...new Set(rows.map((row) => row.scenario))].sort();
	out.push("各格（变体 × 场景）：打了分的次数，综合分中位数 [四分位]，节律中位数，跨次相似度（像素/结构）");
	for (const variant of variants) {
		for (const scenario of scenarios) {
			const all = rows.filter((row) => row.variant === variant && row.scenario === scenario);
			if (!all.length) continue;
			const scored = byCell.get(`${variant}\t${scenario}`) ?? [];
			const scores = scored.map((row) => row.score);
			const same = sameness(scored);
			const stamped = same && same.pixel >= RULES.stampPixel && same.structure >= RULES.stampStructure;
			const failed = all.length - scored.length;
			out.push(`  ${variant} / ${scenario}：${scored.length} 次${failed ? `（另有 ${failed} 次超时或出错）` : ""}，${fmt(median(scores))} [${fmt(quantile(scores, 0.25))}, ${fmt(quantile(scores, 0.75))}]，节律 ${fmt(median(scored.map((row) => row.rhythmScore)))}，相似度 ${same ? `${fmt(same.pixel, 3)}/${fmt(same.structure, 3)}${stamped ? "（一个模子）" : ""}` : "-"}`);
		}
	}
	const skillRuns = rows.filter((row) => row.status === "ok" && row.variant.startsWith("full"));
	for (const variant of [...new Set(skillRuns.map((row) => row.variant))]) {
		const runs = skillRuns.filter((row) => row.variant === variant);
		const used = runs.filter((row) => row.skillUsed === true).length;
		if (used < RULES.skillUsed * runs.length) out.push(`注意：${variant} 只有 ${used}/${runs.length} 次看得出用了技能（要 ≥ ${RULES.skillUsed * 100}%），这个变体的结论无效，先解决技能没触发的问题`);
	}
	out.push("", "整条流水线：");
	const pipeline = compare("full", "bare", byCell, judgeRows);
	out.push(`  ${line(pipeline, PAIR_VERDICT)}`);
	if (pipeline.verdict !== "better") out.push("  完整流水线没有胜过不装技能：下面的逐层结论只作参考，先查流水线整体");
	out.push("", "逐层（完整 对 去掉这一层）：");
	for (const layer of LAYERS) out.push(`  ${layer.id}：${line(compare("full", `full-minus-${layer.id}`, byCell, judgeRows), LAYER_VERDICT)}`);
	out.push("", "提示写法：");
	for (const [a, b] of [["decision-tree", "adjectives"], ["adjectives", "bare"], ["decision-tree", "bare"], ["full", "decision-tree"], ["full", "adjectives"]]) out.push(`  ${line(compare(a, b, byCell, judgeRows), PAIR_VERDICT)}`);
	return out;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const out = process.argv[2];
	if (!out) throw new Error("用法：node evals/ablation/report.mjs <结果目录>");
	for (const text of summarize(readTsv(join(out, "results.tsv")), readTsv(join(out, "judge.tsv")))) console.log(text);
}
