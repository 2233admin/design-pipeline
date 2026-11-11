#!/usr/bin/env node

// 按 README 里跑之前定好的判定规则，从 results.tsv（和盲评的 judge.tsv，有的话）出结论。
// run.mjs 跑完会调它；分几次跑、追加到同一个结果目录后，也可以单独重算：node evals/ablation/report.mjs <结果目录>

import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { median } from "./lib.mjs";
import { similarity } from "./measure.mjs";
import { runsNeeded } from "./power.mjs";
import { binomialTest, holm, mean, variance, zTest } from "./stats.mjs";
import { LAYERS } from "./variants.mjs";

// 判定规则的门槛，改它们要先改 README 并在跑之前提交
export const RULES = {
	minRuns: 3, // 一格（变体 × 场景）至少这么多次才进统计
	minScenarios: 3, // 至少 3 个场景有数据
	scenarioShare: 0.75, // 并且至少占跑了的场景的 3/4
	alpha: 0.05, // 显著性，按比较的族做 Holm 校正
	agreePairs: 12, // 量值显著时，盲评至少 12 局分出胜负、方向一致，才算“两边一致”
	judgeAlonePairs: 48, // 盲评单独下结论：至少 48 局分出胜负，Holm 校正后显著
	stampStructure: 0.8, // 同一变体各次之间文字布局相似度的均值到这个数，算一个模子（用 fixtures 校准过）
	stampScenarios: 2, // 在至少 2 个场景里都这样，判为套模板
	skillUsed: 0.8, // 装了技能的变体，至少 80% 的运行看得出用了技能
	exposure: 0.5, // 完整技能的运行里，至少一半读到了这一层的文件，这一层的比较才算数
	delta: 5, // 方差试跑按 5 分的差算每格次数
};

const NUMERIC = new Set(["run", "score", "hygiene", "adherence", "rhythmScore", "paletteElements", "palettePixels", "typeScale", "declaredFonts", "colourKinds", "sizeKinds", "minFont", "belowMinFont", "typeLevels", "titleBodyRatio", "hierarchyFails", "overflow", "safeZoneViolations", "contrastFails", "compositionErrors", "contentCoverage", "hiddenWithoutMotion", "fakeControls", "antiSlopHard", "gapCount", "gapOnStep", "distinctGaps", "ratioCv", "leftEdges", "decorations", "decorationKinds", "decorationRepeat", "seconds"]);

export function readTsv(file) {
	if (!existsSync(file)) return [];
	const [head, ...lines] = readFileSync(file, "utf8").split("\n").filter(Boolean);
	const keys = head.split("\t");
	return lines.map((line) => {
		const cells = line.split("\t");
		return Object.fromEntries(
			keys.map((key, index) => {
				const cell = cells[index] ?? "";
				if (NUMERIC.has(key)) return [key, cell === "" ? null : Number(cell)];
				if (cell === "true" || cell === "false") return [key, cell === "true"];
				if (key === "layersRead") return [key, cell ? cell.split("；") : []];
				return [key, cell];
			}),
		);
	});
}

// 失败（超时、出错、没交付物）一律按 0 分算，留在格子里
export const FAILED = new Set(["timeout", "error", "no-deliverable"]);
export const scoreOf = (row) => (row.status === "ok" ? row.score ?? 0 : 0);

const fmt = (value, digits = 1) => (value === null || value === undefined || Number.isNaN(value) ? "-" : Number(value).toFixed(digits));

const capturePath = (row, out) => (isAbsolute(row.capture ?? "") ? row.capture : join(out ?? ".", row.capture ?? ""));

/** 同一变体、同一场景各次之间两两的相似度均值。打了分的运行缺指纹文件就报错，不悄悄跳过。 */
export function sameness(rows, out) {
	const prints = rows
		.filter((row) => row.status === "ok")
		.map((row) => {
			const file = join(capturePath(row, out), "fingerprint.json");
			if (!existsSync(file)) throw new Error(`${row.variant} / ${row.scenario} 第 ${row.run} 次打了分，却没有 ${file}`);
			return JSON.parse(readFileSync(file, "utf8"));
		});
	if (prints.length < 2) return null;
	const pairs = [];
	for (let i = 0; i < prints.length; i++) for (let j = i + 1; j < prints.length; j++) pairs.push(similarity(prints[i], prints[j]));
	const avg = (key) => pairs.reduce((sum, pair) => sum + pair[key], 0) / pairs.length;
	return { runs: prints.length, pixel: Number(avg("pixel").toFixed(4)), structure: Number(avg("structure").toFixed(4)) };
}

/** 盲评按对局去重：同一评审、同一场景、同一次、同一对变体只算最后一次。 */
export function dedupeJudge(rows) {
	const latest = new Map();
	for (const row of rows) latest.set(row.pair || `${row.judge}|${row.scenario}|${row.run}|${[row.left, row.right].sort().join("|")}`, row);
	return [...latest.values()];
}

// 装了技能的变体：只用看得出用了技能的运行（失败的运行没有这个信息，照样算 0 分留着）
function usable(row) {
	if (!row.variant.startsWith("full") || row.status !== "ok") return true;
	return row.skillUsed !== false;
}

function cells(rows) {
	const out = new Map();
	for (const row of rows.filter(usable)) {
		const key = `${row.variant}\t${row.scenario}`;
		if (!out.has(key)) out.set(key, []);
		out.get(key).push(row);
	}
	return out;
}

function stampedScenarios(variant, byCell, out) {
	return [...byCell.entries()].filter(([key, rows]) => {
		if (!key.startsWith(`${variant}\t`)) return false;
		const same = sameness(rows, out);
		return same && same.structure >= RULES.stampStructure;
	}).length;
}

/**
 * a 对 b 的量值：各场景均值差的平均 D、它的标准误和 z 检验的 p；盲评：胜负和二项检验的 p。
 * p 值在 decide() 里按比较的族做 Holm 校正。
 */
export function compare(a, b, byCell, judgeRows = [], out) {
	const allScenarios = [...new Set([...byCell.keys()].map((key) => key.split("\t")[1]))].sort();
	const deltas = [];
	for (const scenario of allScenarios) {
		const left = (byCell.get(`${a}\t${scenario}`) ?? []).map(scoreOf);
		const right = (byCell.get(`${b}\t${scenario}`) ?? []).map(scoreOf);
		if (left.length < RULES.minRuns || right.length < RULES.minRuns) continue;
		deltas.push({ scenario, delta: mean(left) - mean(right), medianDelta: median(left) - median(right), se2: variance(left) / left.length + variance(right) / right.length, sigma: Math.sqrt((variance(left) + variance(right)) / 2) });
	}
	const enough = deltas.length >= RULES.minScenarios && deltas.length >= Math.ceil(RULES.scenarioShare * allScenarios.length);
	const D = deltas.length ? mean(deltas.map((entry) => entry.delta)) : null;
	const se = deltas.length ? Math.sqrt(deltas.reduce((sum, entry) => sum + entry.se2, 0)) / deltas.length : null;
	const pMeasured = enough ? (se > 0 ? zTest(D / se) : D === 0 ? 1 : 0) : null;
	const sigma = deltas.length ? Math.sqrt(mean(deltas.map((entry) => entry.sigma ** 2))) : null;
	const games = dedupeJudge(judgeRows).filter((row) => (row.left === a && row.right === b) || (row.left === b && row.right === a));
	const winsA = games.filter((row) => row.winner === a).length;
	const winsB = games.filter((row) => row.winner === b).length;
	const decided = winsA + winsB;
	return {
		a, b, deltas, enough, scenarioCount: allScenarios.length, D, se, pMeasured, sigma,
		games: games.length, winsA, winsB, decided, ties: games.length - decided, rate: decided ? winsA / decided : null, pJudge: decided ? binomialTest(winsA, decided) : null,
		stampedA: stampedScenarios(a, byCell, out) >= RULES.stampScenarios,
		stampedB: stampedScenarios(b, byCell, out) >= RULES.stampScenarios,
	};
}

/**
 * 一族比较（例如五层）的判定：先对量值和盲评的 p 各自做 Holm 校正，再按规则：
 * - 量值显著、盲评（≥12 局）方向一致 → 前者更好 / 更差；
 * - 盲评单独：≥48 局且校正后显著，量值没有显著反向 → 前者更好 / 更差；
 * - 量值和盲评显著地方向相反 → 矛盾；
 * - 其余一律待定（继续收数据），绝不因为“没看出差别”就砍。
 * 套模板的一方，量值上的优势不算。
 */
export function decide(results) {
	const pm = holm(results.map((result) => result.pMeasured));
	const pj = holm(results.map((result) => (result.decided >= RULES.judgeAlonePairs ? result.pJudge : null)));
	return results.map((result, index) => {
		let measured = pm[index] !== null && pm[index] < RULES.alpha ? Math.sign(result.D) : 0;
		if ((measured > 0 && result.stampedA) || (measured < 0 && result.stampedB)) measured = 0;
		const lean = result.decided >= RULES.agreePairs && result.rate !== 0.5 ? Math.sign(result.rate - 0.5) : 0;
		const judgeAlone = pj[index] !== null && pj[index] < RULES.alpha ? Math.sign(result.rate - 0.5) : 0;
		let verdict;
		let reason = "";
		if ((measured && judgeAlone && measured !== judgeAlone) || (measured && lean && measured !== lean)) verdict = "conflict";
		else if ((measured > 0 && lean > 0) || (judgeAlone > 0 && measured >= 0)) verdict = "better";
		else if ((measured < 0 && lean < 0) || (judgeAlone < 0 && measured <= 0)) verdict = "worse";
		else {
			verdict = "undetermined";
			if (!result.enough) reason = `只有 ${result.deltas.length} 个场景每格凑够 ${RULES.minRuns} 次（要 ≥ ${RULES.minScenarios} 个且 ≥ 3/4）`;
			else if (measured && result.decided < RULES.agreePairs) reason = `量值显著，等盲评凑够 ${RULES.agreePairs} 局看方向`;
			else if (result.sigma) reason = `量值不显著；按现在的 σ = ${fmt(result.sigma)}，每格要跑 ${runsNeeded(result.sigma, { delta: RULES.delta, scenarios: Math.max(result.deltas.length, 1), family: results.length })} 次才有 80% 把握测出 ${RULES.delta} 分`;
			else reason = "数据不足";
		}
		return { ...result, pMeasuredAdj: pm[index], pJudgeAdj: pj[index], measured, lean, judgeAlone, verdict, reason };
	});
}

const LAYER_VERDICT = { better: "保留：去掉它会变差", worse: "砍掉：去掉它反而更好", conflict: "矛盾：量值和盲评方向相反，补数据再判", undetermined: "待定：继续收数据（不砍）" };
const PAIR_VERDICT = { better: "前者胜", worse: "后者胜", conflict: "矛盾，补数据", undetermined: "待定" };

function line(result, labels) {
	const deltas = result.deltas.map((entry) => `${entry.scenario} ${entry.delta >= 0 ? "+" : ""}${fmt(entry.delta)}`).join("、");
	const measured = result.D === null ? "量值：没有凑够次数的场景" : `量值：均值差 ${fmt(result.D)} ± ${fmt(result.se)}（${deltas}），校正后 p = ${fmt(result.pMeasuredAdj, 3)}`;
	const judge = result.games ? `；盲评 ${result.winsA}:${result.winsB}（平 ${result.ties}），前者胜率 ${fmt(result.rate === null ? null : result.rate * 100, 0)}%${result.pJudgeAdj !== null ? `，校正后 p = ${fmt(result.pJudgeAdj, 3)}` : ""}` : "；没有盲评";
	const stamp = [result.stampedA ? `${result.a} 套模板` : "", result.stampedB ? `${result.b} 套模板` : ""].filter(Boolean).join("、");
	return `${result.a} 对 ${result.b}：${measured}${judge}${stamp ? `；${stamp}，它的量值优势不算` : ""} → ${labels[result.verdict]}${result.reason ? `（${result.reason}）` : ""}`;
}

/** 全部结论的文字行。out 是结果目录（截图、指纹按相对路径存在里面）。 */
export function summarize(rows, judgeRows = [], out = ".") {
	const lines = [];
	const byCell = cells(rows);
	const variants = [...new Set(rows.map((row) => row.variant))];
	const scenarios = [...new Set(rows.map((row) => row.scenario))].sort();
	lines.push("各格（变体 × 场景）：次数，失败率，综合分中位数（失败按 0），节律中位数，跨次结构相似度");
	for (const variant of variants) {
		for (const scenario of scenarios) {
			const all = rows.filter((row) => row.variant === variant && row.scenario === scenario);
			if (!all.length) continue;
			const failed = all.filter((row) => FAILED.has(row.status)).length;
			const kept = byCell.get(`${variant}\t${scenario}`) ?? [];
			const same = sameness(kept, out);
			const stamped = same && same.structure >= RULES.stampStructure;
			const dropped = all.length - kept.length;
			lines.push(`  ${variant} / ${scenario}：${all.length} 次，失败 ${failed}（${fmt((failed / all.length) * 100, 0)}%）${dropped ? `，${dropped} 次没用技能、不计` : ""}，${fmt(median(kept.map(scoreOf)))}，节律 ${fmt(median(kept.filter((row) => row.status === "ok").map((row) => row.rhythmScore)))}，相似度 ${same ? `${fmt(same.structure, 3)}${stamped ? "（一个模子）" : ""}` : "-"}`);
		}
	}
	const skillRuns = rows.filter((row) => row.status === "ok" && row.variant.startsWith("full"));
	for (const variant of [...new Set(skillRuns.map((row) => row.variant))]) {
		const runs = skillRuns.filter((row) => row.variant === variant);
		const used = runs.filter((row) => row.skillUsed === true).length;
		const next = runs.filter((row) => row.nextRan === true).length;
		lines.push(`${variant}：${used}/${runs.length} 次用了技能，${next} 次跑了 next${used < RULES.skillUsed * runs.length ? `（不到 ${RULES.skillUsed * 100}%：这个变体的结论无效，先解决技能没触发的问题）` : ""}`);
	}
	const fullRuns = skillRuns.filter((row) => row.variant === "full" && row.skillUsed === true);
	const exposure = Object.fromEntries(LAYERS.map((layer) => [layer.id, fullRuns.length ? fullRuns.filter((row) => row.layersRead.includes(layer.id)).length / fullRuns.length : 0]));

	lines.push("", "整条流水线：");
	const [pipeline] = decide([compare("full", "bare", byCell, judgeRows, out)]);
	lines.push(`  ${line(pipeline, PAIR_VERDICT)}`);
	if (pipeline.verdict !== "better") lines.push("  完整流水线还没有判定为胜过不装技能：下面的逐层结论只作参考，先查流水线整体");

	lines.push("", "逐层（完整 对 去掉这一层；五层一族做 Holm 校正）：");
	const layered = decide(LAYERS.map((layer) => compare("full", `full-minus-${layer.id}`, byCell, judgeRows, out)));
	layered.forEach((result, index) => {
		const layer = LAYERS[index];
		const share = exposure[layer.id];
		// 完整技能里很少读到这一层：比较的不是“有没有这一层”，结论待定
		const lowExposure = share < RULES.exposure && result.verdict !== "undetermined";
		const shown = lowExposure ? { ...result, verdict: "undetermined", reason: `完整技能的运行里只有 ${fmt(share * 100, 0)}% 读到这一层（要 ≥ ${RULES.exposure * 100}%）` } : result;
		lines.push(`  ${layer.id}（读到 ${fmt(share * 100, 0)}%）：${line(shown, LAYER_VERDICT)}`);
	});

	lines.push("", "提示写法（五组一族做 Holm 校正）：");
	for (const result of decide([["decision-tree", "adjectives"], ["adjectives", "bare"], ["decision-tree", "bare"], ["full", "decision-tree"], ["full", "adjectives"]].map(([a, b]) => compare(a, b, byCell, judgeRows, out)))) lines.push(`  ${line(result, PAIR_VERDICT)}`);

	lines.push("", "原则对配方（主人的假设：关系型原则胜过堆配方；四组一族做 Holm 校正）：");
	for (const result of decide([["principles", "recipes"], ["principles", "bare"], ["recipes", "bare"], ["principles", "decision-tree"]].map(([a, b]) => compare(a, b, byCell, judgeRows, out)))) lines.push(`  ${line(result, PAIR_VERDICT)}`);

	// 只有跑了这个变体才出这一段，旧结果目录的报告不变
	// 这一族的结论留着：下面第二个问题用的就是这里校正过的那一条，不另算一遍
	const referenceFamily = variants.includes("reference-system") ? decide([["full", "reference-system"], ["reference-system", "bare"]].map(([a, b]) => compare(a, b, byCell, judgeRows, out))) : null;
	if (referenceFamily) {
		lines.push("", "参考加设计系统（不装技能，给参考图和项目的 DESIGN.md；两组一族做 Holm 校正）：");
		for (const result of referenceFamily) lines.push(`  ${line(result, PAIR_VERDICT)}`);
		lines.push("  开放场景里这个变体多拿到一份 DESIGN.md，完整流水线要自己写：这一组比的是“两种做法”，不是“同样输入下谁强”");
	}

	// 三个要回答的问题（README“三个问题”）：每个只有 是 / 否 / 样本不足 三种答案
	const answer = (result, yes, no) => (result.verdict === "better" ? yes : result.verdict === "worse" ? no : `样本不足（${PAIR_VERDICT[result.verdict]}${result.reason ? `：${result.reason}` : ""}）`);
	lines.push("", "三个问题：");
	lines.push(`  1. 装了技能是否胜过不装：${answer(pipeline, "是", "否，不装更好")}`);
	if (referenceFamily) lines.push(`  2. 技能与“参考加设计系统”谁好：${answer(referenceFamily[0], "技能更好", "参考加设计系统更好")}`);
	else lines.push("  2. 技能与“参考加设计系统”谁好：没跑 reference-system 变体");
	const craftIndex = LAYERS.findIndex((layer) => layer.id === "ui-craft");
	const craft = craftIndex < 0 ? null : layered[craftIndex];
	const craftExposed = craft && exposure["ui-craft"] >= RULES.exposure;
	lines.push(`  3. 单独拿掉 ui-craft 层（UI 工艺规则与 Impeccable 契约）：${!craft ? "layers.json 里没有这一层" : !craftExposed ? `样本不足（完整技能的运行里只有 ${fmt(exposure["ui-craft"] * 100, 0)}% 读到这一层）` : answer(craft, "变差，这一层有用", "变好，这一层在拖累")}`);
	return lines;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const out = process.argv[2];
	if (!out) throw new Error("用法：node evals/ablation/report.mjs <结果目录>");
	for (const text of summarize(readTsv(join(out, "results.tsv")), readTsv(join(out, "judge.tsv")), out)) console.log(text);
}
