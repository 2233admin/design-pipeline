#!/usr/bin/env node

// 按方差试跑（run.mjs --pilot：bare 每个场景 5 次）的结果，算每格要跑几次，才能有 80% 的把握测出 5 分的差。
// 和 report.mjs 用同一个检验：各场景均值差的平均，正态近似，按层数做 Holm 校正时第一步的 α = 0.05 / 层数。
// 用法：node evals/ablation/power.mjs <结果目录> [--variant bare] [--delta 5] [--power 0.8] [--family 5]

import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { readTsv, scoreOf } from "./report.mjs";
import { normalQuantile, variance } from "./stats.mjs";

/** 每格需要的次数：n = 2σ²(z₁₋α/₂ + z_power)² / (S·δ²)，至少 3。 */
export function runsNeeded(sigma, { delta = 5, power = 0.8, alpha = 0.05, family = 5, scenarios = 4 } = {}) {
	const z = normalQuantile(1 - alpha / family / 2) + normalQuantile(power);
	return Math.max(3, Math.ceil((2 * sigma ** 2 * z ** 2) / (scenarios * delta ** 2)));
}

export function powerLines(rows, { variant = "bare", delta = 5, power = 0.8, family = 5 } = {}) {
	const pilot = rows.filter((row) => row.variant === variant);
	const scenarios = [...new Set(pilot.map((row) => row.scenario))].sort();
	const out = [`方差试跑（${variant}）：每个场景的综合分标准差（失败按 0 分算）`];
	const variances = [];
	for (const scenario of scenarios) {
		const scores = pilot.filter((row) => row.scenario === scenario).map(scoreOf);
		const v = variance(scores);
		variances.push(v);
		out.push(`  ${scenario}：${scores.length} 次，σ = ${Math.sqrt(v).toFixed(1)}`);
	}
	if (!variances.length) return [...out, "  没有数据"];
	const sigma = Math.sqrt(variances.reduce((sum, v) => sum + v, 0) / variances.length);
	const n = runsNeeded(sigma, { delta, power, family, scenarios: scenarios.length });
	const loose = runsNeeded(sigma, { delta, power, family: 1, scenarios: scenarios.length });
	out.push(`合并 σ = ${sigma.toFixed(1)}。要在 ${scenarios.length} 个场景上以 ${power * 100}% 的把握测出 ${delta} 分的差：`);
	out.push(`  按 ${family} 层做 Holm 校正：每格 ${n} 次 → 正式跑用 --runs ${n}`);
	out.push(`  不校正（只比一对时）：每格 ${loose} 次`);
	return out;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const { values, positionals } = parseArgs({ allowPositionals: true, options: { variant: { type: "string", default: "bare" }, delta: { type: "string", default: "5" }, power: { type: "string", default: "0.8" }, family: { type: "string", default: "5" } } });
	if (!positionals[0]) throw new Error("用法：node evals/ablation/power.mjs <结果目录>");
	for (const text of powerLines(readTsv(join(positionals[0], "results.tsv")), { variant: values.variant, delta: Number(values.delta), power: Number(values.power), family: Number(values.family) })) console.log(text);
}
