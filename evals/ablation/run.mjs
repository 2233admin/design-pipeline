#!/usr/bin/env node

// 跑一轮消融：每个场景复制到一个工作目录，按变体装技能（或写规则包），让代理按一条普通的请求做交付物，再渲染打分。
// 结构照搬 pstack-omp 的 evals/run.mjs：变体交替跑、每次一行 results.tsv、追加时列必须对得上。
// 用法：node evals/ablation/run.mjs --client claude|codex|omp [--pilot] [--runs N] [--variants a,b] [--sets core,open]
//       [--scenarios x,y] [--out <结果目录>] [--work-root <目录>] [--timeout 秒] [--command '<JSON 数组>']
//       [--keep-workdir] [--allow-global-skill]

import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { join, relative, resolve } from "node:path";
import { parseArgs } from "node:util";
import { CLIENTS, exposure, globalInstalls, prepare, runAgent, skillUsedIn, treeDigest } from "./lib.mjs";
import { readTsv, summarize } from "./report.mjs";
import { powerLines } from "./power.mjs";
import { COLUMNS, DEFAULT_SETS, describe, grade, HEADER, loadCase, prompt, scenarios as listScenarios, SCENARIOS, SETS, VARIANTS, variantSetup } from "./suite.mjs";
import { buildVariants, LAYERS, REPO } from "./variants.mjs";

const require = createRequire(import.meta.url);
const { values } = parseArgs({
	options: {
		client: { type: "string" },
		command: { type: "string" },
		pilot: { type: "boolean", default: false },
		runs: { type: "string" },
		variants: { type: "string" },
		sets: { type: "string" },
		scenarios: { type: "string" },
		out: { type: "string" },
		"work-root": { type: "string" },
		timeout: { type: "string", default: "3600" },
		"keep-workdir": { type: "boolean", default: false },
		"allow-global-skill": { type: "boolean", default: false },
	},
});
const client = CLIENTS[values.client];
if (!client) throw new Error(`--client 要是 ${Object.keys(CLIENTS).join("、")} 之一`);
// --command 换掉客户端的命令（自测用假客户端，或者同一个客户端换参数），技能目录仍按 --client
const command = values.command ? JSON.parse(values.command) : client.command;
// 方差试跑：只跑 bare，每个场景 5 次，跑完按它的方差算每格要跑几次
const variants = values.pilot ? ["bare"] : values.variants ? values.variants.split(",") : VARIANTS;
const runs = Number(values.runs ?? (values.pilot ? 5 : 3));
for (const variant of variants) if (!VARIANTS.includes(variant)) throw new Error(`没有 ${variant} 这个变体，可选：${VARIANTS.join("、")}`);
const sets = values.sets ? values.sets.split(",") : DEFAULT_SETS;
for (const set of sets) if (!SETS.includes(set)) throw new Error(`没有 ${set} 这组场景，可选：${SETS.join("、")}`);
const scenarios = values.scenarios ? values.scenarios.split(",") : listScenarios(sets);
for (const scenario of scenarios) loadCase(scenario);

// 结果和工作目录都放在 /tmp 以外的专门目录里；工作目录的上级不带“消融”字样，代理看得到自己的路径
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const out = resolve(values.out ?? join(homedir(), "agent-runs", `ablation-${stamp}`));
const workRoot = resolve(values["work-root"] ?? join(homedir(), "agent-runs", "work"));
mkdirSync(out, { recursive: true });
mkdirSync(workRoot, { recursive: true });

// 用户级装着 design-pipeline 时，bare 和减层的变体也会读到完整技能，结果就不是消融了
const global = globalInstalls();
if (global.length && !values["allow-global-skill"]) throw new Error(`这台机器的用户级目录装着 design-pipeline：${global.join("、")}。先挪走（或停用插件）再跑；确定客户端读不到它时加 --allow-global-skill`);

// 共用的下载缓存（设计方向库的图片、MengTo、iart）对所有变体都可见，跑之前记下它的状态
const { cacheRoot } = require(join(REPO, "skill/scripts/vendor-cache.cjs"));
const cache = cacheRoot();
const environment = {
	startedAt: new Date().toISOString(),
	client: values.client,
	command,
	node: process.version,
	platform: process.platform,
	globalInstalls: global,
	cache: { root: cache, exists: existsSync(cache), entries: existsSync(cache) ? readdirSync(cache).sort() : [] },
	workRoot,
};
appendFileSync(join(out, "environment.jsonl"), `${JSON.stringify(environment)}\n`);
if (environment.cache.entries.length) console.log(`提醒：下载缓存 ${cache} 里有 ${environment.cache.entries.join("、")}，所有装了技能的变体都看得到它（已记在 environment.jsonl）`);

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

function listFiles(root, rel = "") {
	if (!existsSync(join(root, rel))) return [];
	return readdirSync(join(root, rel), { withFileTypes: true }).flatMap((entry) => {
		const path = rel ? `${rel}/${entry.name}` : entry.name;
		if (entry.isDirectory()) return [".git", "node_modules"].includes(entry.name) ? [`${path}/`] : listFiles(root, path);
		return [path];
	});
}

// 变体交替跑，免得时段差异（限流、模型负载）都落在同一边
for (let run = 1; run <= runs; run++) {
	for (const scenario of scenarios) {
		for (const variant of variants) {
			const label = `${values.client}-${variant}-${scenario}-${run}`;
			const captureDir = join(out, "captures", label);
			let cells;
			let workdir = null;
			try {
				const setup = variantSetup(variant, scenario);
				const spec = loadCase(scenario);
				const prepared = prepare({ base: workRoot, scenarioDir: join(SCENARIOS, scenario), name: scenario, designFile: spec.designFile, agents: setup.agents, skillTree: setup.skill ? trees[setup.skill] : null, skillDirs: client.skillDirs });
				workdir = prepared.workdir;
				const before = prepared.installed.map(treeDigest);
				const started = Date.now();
				const result = await runAgent(command, workdir, prompt(scenario), Number(values.timeout));
				const seconds = Math.round((Date.now() - started) / 1000);
				writeFileSync(join(out, `${label}.txt`), `${result.stdout}\n----- stderr -----\n${result.stderr}`);
				const skillUsed = setup.skill ? skillUsedIn(result.stdout, result.stderr) : "";
				const skillEdited = setup.skill ? prepared.installed.some((dir, index) => treeDigest(dir) !== before[index]) : "";
				const seen = setup.skill ? exposure(result.stdout, result.stderr, LAYERS) : { layersRead: [], nextRan: "" };
				for (const dir of prepared.installed) rmSync(dir, { recursive: true, force: true });
				// 超时的不打分（代理可能还没写完），和出错、没交付物一样按失败算：综合分记 0
				const scored = result.timedOut ? null : await grade(workdir, scenario, { captureDir });
				mkdirSync(captureDir, { recursive: true });
				writeFileSync(join(captureDir, "workdir-files.json"), `${JSON.stringify(listFiles(workdir), null, 2)}\n`);
				const status = scored ? scored.status : "timeout";
				cells = [status, ...COLUMNS.map((key) => (key === "capture" ? relative(out, captureDir) : key === "score" && !scored ? 0 : scored?.[key])), seen.layersRead, seen.nextRan, skillUsed, skillEdited, result.exit, seconds, relative(workRoot, workdir)];
				console.log(`${label}: ${scored ? describe(scored) : "超时，记 0 分"}（${seconds} 秒）`);
			} catch (error) {
				cells = ["error", ...COLUMNS.map((key) => (key === "score" ? 0 : "")), "", "", "", "", String(error.message ?? error).replace(/\s+/g, " "), "", workdir ? relative(workRoot, workdir) : ""];
				console.log(`${label}: 出错，记 0 分：${error.message ?? error}`);
			} finally {
				// 工作目录打完分就删：交付物的副本在 captures/<标签>/page/，留下的文件清单在 workdir-files.json
				if (workdir && !values["keep-workdir"]) rmSync(workdir, { recursive: true, force: true });
			}
			const row = [values.client, variant, scenario, run, ...cells].map((cell) => (Array.isArray(cell) ? cell.join("；") : String(cell ?? "").replace(/[\t\n]/g, " ")));
			appendFileSync(tsv, `${row.join("\t")}\n`);
		}
	}
}

console.log(`\n逐条结果：${tsv}\n`);
const rows = readTsv(tsv);
if (values.pilot) for (const text of powerLines(rows)) console.log(text);
else for (const text of summarize(rows, readTsv(join(out, "judge.tsv")), out)) console.log(text);
