#!/usr/bin/env node

// 盲评：从一轮消融的结果目录里取同一场景、同一次的两张截图，藏起变体名、打乱左右，交给另一家的模型按跑之前定好的评分细则二选一。
// 和量出来的分数分开：它只写 judge.tsv，report.mjs 把两边并列，判定规则里各算各的。
// 用法：node evals/ablation/judge.mjs --out <结果目录> --judge codex|claude|omp [--seed 1] [--command '<JSON 数组>'] [--timeout 秒]
//       [--pairs full:bare,decision-tree:adjectives] [--allow-same-family] [--rejudge]
// 同一对局（评审、场景、次、两个变体）已经评过就跳过；--rejudge 重评，report.mjs 只算最后一次。

import { appendFileSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { runAgent, seeded } from "./lib.mjs";
import { readTsv, summarize } from "./report.mjs";
import { loadCase, SCENARIOS } from "./suite.mjs";
import { LAYERS } from "./variants.mjs";

// 评审的命令；{A}、{B} 换成两张图的文件名。图片放在一个只有它们和需求的临时目录里，路径里没有变体名
export const JUDGES = {
	codex: ["codex", "exec", "--skip-git-repo-check", "-i", "{A}", "-i", "{B}", "-"],
	claude: ["claude", "-p", "--allowedTools", "Read"],
	omp: ["omp", "-p"],
};
// 出图的客户端和评审是不是同一家：omp 背后的模型由配置决定，不认为和谁同家，但会提醒
const FAMILY = { claude: "anthropic", codex: "openai", omp: null };

// 默认的对局：完整流水线对其余每个变体，再加三组提示写法之间的
export const DEFAULT_PAIRS = [
	["full", "bare"],
	...LAYERS.map((layer) => ["full", `full-minus-${layer.id}`]),
	["full", "decision-tree"],
	["full", "adjectives"],
	["decision-tree", "adjectives"],
	["adjectives", "bare"],
	["decision-tree", "bare"],
	["principles", "recipes"],
	["principles", "bare"],
	["recipes", "bare"],
	["principles", "decision-tree"],
];

export const JUDGE_HEADER = ["pair", "judge", "scenario", "run", "left", "right", "winner", "reason", "transcript"];

/** 对局编号：评审、场景、次、两个变体（排序后）。重跑同一对局不会重复计数。 */
export const pairId = (judge, scenario, run, a, b) => `${judge}|${scenario}|${run}|${[a, b].sort().join("|")}`;

/** 评分细则（README 里同一份，跑之前定好）。不含任何变体名。 */
export function judgePrompt(brief, design) {
	return [
		"你在给两张设计稿做盲评。两张图是 A.png 和 B.png（在当前目录），都按同一份需求和同一套风格规范做出来，下面附上原文。",
		"请先打开两张图仔细看，再按下面四条逐条比较：",
		"1. 风格贴合：颜色、字体、字号阶梯和整体气质是否符合风格规范。",
		"2. 文字：是否完整、清楚、层级分明；有没有截断、出画、挤在一起、字太小。",
		"3. 节奏：留白、对齐和间距是否有章法；装饰是否有变化而不杂乱，是否为内容服务。",
		"4. 专门设计：是否像为这份内容专门设计的，而不是换了字的通用模板。",
		"综合四条判断哪张更好；差别不大就判 tie。只看图，不要猜它们是怎么做出来的。",
		"最后一行只输出一个 JSON：{\"winner\":\"A\"|\"B\"|\"tie\",\"reason\":\"一句话\"}",
		"",
		"----- 需求（brief.md）-----",
		brief.trim(),
		"",
		"----- 风格规范（DESIGN.md）-----",
		design.trim(),
	].join("\n");
}

/** 从评审的输出里取最后一个带 winner 的 JSON。 */
export function parseVerdict(text) {
	const matches = [...text.matchAll(/\{[^{}]*"winner"\s*:\s*"(A|B|tie)"[^{}]*\}/g)];
	if (!matches.length) return null;
	const last = matches.at(-1);
	let reason = "";
	try {
		reason = JSON.parse(last[0]).reason ?? "";
	} catch {
		// 只认 winner
	}
	return { winner: last[1], reason: String(reason).replace(/\s+/g, " ").slice(0, 200) };
}

/** 列出要评的对局：两边同一场景、同一次都打了分。打了分却没有截图就报错，不悄悄跳过。 */
export function games(rows, pairs, out) {
	const shot = (row) => {
		if (!row || row.status !== "ok") return null;
		const file = join(isAbsolute(row.capture) ? row.capture : join(out, row.capture), "screenshot.png");
		if (!existsSync(file)) throw new Error(`${row.variant} / ${row.scenario} 第 ${row.run} 次打了分，却没有截图 ${file}`);
		return file;
	};
	const result = [];
	const keys = [...new Set(rows.map((row) => `${row.scenario}\t${row.run}`))].sort();
	for (const key of keys) {
		const [scenario, run] = key.split("\t");
		for (const [a, b] of pairs) {
			const left = rows.find((row) => row.scenario === scenario && String(row.run) === run && row.variant === a);
			const right = rows.find((row) => row.scenario === scenario && String(row.run) === run && row.variant === b);
			const leftShot = shot(left);
			const rightShot = shot(right);
			if (leftShot && rightShot) result.push({ scenario, run: Number(run), a: { ...left, shot: leftShot }, b: { ...right, shot: rightShot } });
		}
	}
	return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const { values } = parseArgs({
		options: {
			out: { type: "string" },
			judge: { type: "string" },
			command: { type: "string" },
			seed: { type: "string", default: "1" },
			timeout: { type: "string", default: "600" },
			pairs: { type: "string" },
			"allow-same-family": { type: "boolean", default: false },
			rejudge: { type: "boolean", default: false },
		},
	});
	if (!values.out) throw new Error("--out <结果目录> 必填");
	const command = values.command ? JSON.parse(values.command) : JUDGES[values.judge];
	if (!values.judge || !command) throw new Error(`--judge 要是 ${Object.keys(JUDGES).join("、")} 之一（或另给 --command）`);
	const out = resolve(values.out);
	const rows = readTsv(join(out, "results.tsv"));
	const producers = [...new Set(rows.map((row) => row.client))];
	const family = FAMILY[values.judge];
	if (!values["allow-same-family"]) {
		for (const producer of producers) {
			if (family && FAMILY[producer] === family) throw new Error(`出图用的是 ${producer}，评审要换另一家的模型（或加 --allow-same-family，并在结论里写明）`);
			if (!family || !FAMILY[producer]) console.log(`提醒：${values.judge} 或 ${producer} 背后的模型由配置决定，确认两边不是同一家`);
		}
	}
	const pairs = values.pairs ? values.pairs.split(",").map((pair) => pair.split(":")) : DEFAULT_PAIRS;
	const tsv = join(out, "judge.tsv");
	if (!existsSync(tsv)) appendFileSync(tsv, `${JUDGE_HEADER.join("\t")}\n`);
	else if (readFileSync(tsv, "utf8").split("\n")[0] !== JUDGE_HEADER.join("\t")) throw new Error(`${tsv} 的列不对，换一个 --out`);
	const random = seeded(Number(values.seed));
	const logs = join(out, "judge");
	mkdirSync(logs, { recursive: true });
	const done = new Set(readTsv(tsv).map((row) => row.pair));
	for (const game of games(rows, pairs, out)) {
		// 已经评过的对局跳过；--rejudge 时重评，report 只算最后一次
		const id = pairId(values.judge, game.scenario, game.run, game.a.variant, game.b.variant);
		if (done.has(id) && !values.rejudge) continue;
		// 左右随机：A 是哪个变体只记在 judge.tsv 里，评审看不到
		const [first, second] = random() < 0.5 ? [game.a, game.b] : [game.b, game.a];
		const spec = loadCase(game.scenario);
		const dir = mkdtempSync(join(tmpdir(), "pair-"));
		copyFileSync(first.shot, join(dir, "A.png"));
		copyFileSync(second.shot, join(dir, "B.png"));
		const text = judgePrompt(readFileSync(join(SCENARIOS, game.scenario, "repo", "brief.md"), "utf8"), readFileSync(spec.designFile, "utf8"));
		writeFileSync(join(dir, "prompt.txt"), text);
		const argv = command.map((part) => part.replace("{A}", join(dir, "A.png")).replace("{B}", join(dir, "B.png")));
		const result = await runAgent(argv, dir, text, Number(values.timeout));
		const transcript = join(logs, `${values.judge}-${game.scenario}-${game.run}-${game.a.variant}-${game.b.variant}.txt`);
		writeFileSync(transcript, `${result.stdout}\n----- stderr -----\n${result.stderr}`);
		rmSync(dir, { recursive: true, force: true });
		const verdict = result.timedOut ? null : parseVerdict(result.stdout);
		const winner = !verdict ? "" : verdict.winner === "tie" ? "tie" : verdict.winner === "A" ? first.variant : second.variant;
		const row = [id, values.judge, game.scenario, game.run, first.variant, second.variant, winner || "unparsed", verdict?.reason ?? "", relative(out, transcript)];
		appendFileSync(tsv, `${row.map((cell) => String(cell).replace(/[\t\n]/g, " ")).join("\t")}\n`);
		console.log(`${game.scenario} 第 ${game.run} 次 ${game.a.variant} 对 ${game.b.variant}：${winner || "没读出结论"}`);
	}
	console.log("");
	for (const text of summarize(rows, readTsv(tsv), out)) console.log(text);
}
