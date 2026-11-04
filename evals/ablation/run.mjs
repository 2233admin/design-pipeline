#!/usr/bin/env node

// 跑一轮消融：每个场景复制到临时目录，按变体装技能（或写规则包），让代理按一条普通的请求做交付物，再渲染打分。
// 结构照搬 pstack-omp 的 evals/run.mjs：变体交替跑、每次一行 results.tsv、追加时列必须对得上、超时不打分。
// 用法：node evals/ablation/run.mjs --client claude|codex|omp [--runs 3] [--variants a,b] [--scenarios x,y] [--out <目录>]
//       [--timeout 秒] [--command '<JSON 数组>'] [--keep-skill] [--allow-global-skill]

import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { CLIENTS, globalInstalls, prepare, runAgent, skillUsedIn, treeDigest } from "./lib.mjs";
import { readTsv, summarize } from "./report.mjs";
import { COLUMNS, describe, grade, HEADER, loadCase, prompt, scenarios as allScenarios, SCENARIOS, VARIANTS, variantSetup } from "./suite.mjs";
import { buildVariants } from "./variants.mjs";

const { values } = parseArgs({
	options: {
		client: { type: "string" },
		command: { type: "string" },
		runs: { type: "string", default: "3" },
		variants: { type: "string" },
		scenarios: { type: "string" },
		out: { type: "string" },
		timeout: { type: "string", default: "1800" },
		"keep-skill": { type: "boolean", default: false },
		"allow-global-skill": { type: "boolean", default: false },
	},
});
const client = CLIENTS[values.client];
if (!client) throw new Error(`--client 要是 ${Object.keys(CLIENTS).join("、")} 之一`);
// --command 换掉客户端的命令（自测用假客户端，或者同一个客户端换参数），技能目录仍按 --client
const command = values.command ? JSON.parse(values.command) : client.command;
const variants = values.variants ? values.variants.split(",") : VARIANTS;
for (const variant of variants) if (!VARIANTS.includes(variant)) throw new Error(`没有 ${variant} 这个变体，可选：${VARIANTS.join("、")}`);
const scenarios = values.scenarios ? values.scenarios.split(",") : allScenarios();
for (const scenario of scenarios) loadCase(scenario);
const out = resolve(values.out ?? join(tmpdir(), `design-ablation-${new Date().toISOString().replace(/[:.]/g, "-")}`));
mkdirSync(out, { recursive: true });

// 用户级装着 design-pipeline 时，bare 和减层的变体也会读到完整技能，结果就不是消融了
const global = globalInstalls();
if (global.length && !values["allow-global-skill"]) throw new Error(`这台机器的用户级目录装着 design-pipeline：${global.join("、")}。先挪走（或停用插件）再跑；确定客户端读不到它时加 --allow-global-skill`);

const tsv = join(out, "results.tsv");
const header = HEADER.join("\t");
// 接着往已有的结果里追加时，列必须对得上，否则后面按列读就错位了
if (!existsSync(tsv)) appendFileSync(tsv, `${header}\n`);
else if (readFileSync(tsv, "utf8").split("\n")[0] !== header) throw new Error(`${tsv} 的列和这个实测不一样，换一个 --out`);

// 技能目录每次按当前检出重新打，打包检查不过就不跑
const trees = Object.fromEntries(
	buildVariants([...new Set(variants.map((variant) => variantSetup(variant, scenarios[0]).skill).filter(Boolean))], join(out, "variants")).map((report) => {
		if (!report.package.ok) throw new Error(`${report.variant} 的技能目录没过打包检查：${report.package.problems.join("；")}`);
		return [report.variant, report.tree];
	}),
);

// 变体交替跑，免得时段差异（限流、模型负载）都落在同一边
for (let run = 1; run <= Number(values.runs); run++) {
	for (const scenario of scenarios) {
		for (const variant of variants) {
			const label = `${values.client}-${variant}-${scenario}-${run}`;
			let cells;
			try {
				const setup = variantSetup(variant, scenario);
				const spec = loadCase(scenario);
				const { workdir, installed } = prepare({ scenarioDir: join(SCENARIOS, scenario), name: scenario, designFile: spec.designFile, agents: setup.agents, skillTree: setup.skill ? trees[setup.skill] : null, skillDirs: client.skillDirs });
				const before = installed.map(treeDigest);
				const started = Date.now();
				const result = await runAgent(command, workdir, prompt(scenario), Number(values.timeout));
				const seconds = Math.round((Date.now() - started) / 1000);
				writeFileSync(join(out, `${label}.txt`), `${result.stdout}\n----- stderr -----\n${result.stderr}`);
				const skillUsed = setup.skill ? skillUsedIn(result.stdout, result.stderr) : "";
				const skillEdited = setup.skill ? installed.some((dir, index) => treeDigest(dir) !== before[index]) : "";
				if (!values["keep-skill"]) for (const dir of installed) rmSync(dir, { recursive: true, force: true });
				// 超时的不打分：代理可能还没写完
				const scored = result.timedOut ? null : await grade(workdir, scenario, { captureDir: join(out, "captures", label) });
				cells = [scored ? "ok" : "timeout", ...COLUMNS.map((key) => scored?.[key]), skillUsed, skillEdited, result.exit, seconds, workdir];
				console.log(`${label}: ${scored ? describe(scored) : "超时"}（${seconds} 秒）`);
			} catch (error) {
				cells = ["error", ...COLUMNS.map(() => ""), "", "", String(error.message ?? error).replace(/\s+/g, " "), "", ""];
				console.log(`${label}: 出错：${error.message ?? error}`);
			}
			const row = [values.client, variant, scenario, run, ...cells].map((cell) => (Array.isArray(cell) ? cell.join("；") : String(cell ?? "").replace(/[\t\n]/g, " ")));
			appendFileSync(tsv, `${row.join("\t")}\n`);
		}
	}
}

console.log(`\n逐条结果：${tsv}\n`);
for (const text of summarize(readTsv(tsv), readTsv(join(out, "judge.tsv")))) console.log(text);
