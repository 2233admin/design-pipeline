// 设计流水线逐层消融的打分。场景、变体、项目规则、提示词、量出来的分项和综合分都在这里定；
// 怎么渲染、怎么量在 measure.mjs，怎么打出减层的技能目录在 variants.mjs。数字用来比较变体，不用来给单次运行定性。

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { contentPieces, externalReferences, measureRender, readStyle, render, svgSize } from "./measure.mjs";
import { VARIANTS as SKILL_VARIANTS } from "./variants.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
export const SCENARIOS = join(HERE, "scenarios");
const STYLES = join(HERE, "styles");
const RULE_PACKS = join(HERE, "rules");

// 不装技能、只改项目规则的对照：形容词提示、if-else 规则包、关系型原则、固定像素配方
export const PROMPT_VARIANTS = ["adjectives", "decision-tree", "principles", "recipes"];
export const VARIANTS = ["bare", ...PROMPT_VARIANTS, ...SKILL_VARIANTS.filter((variant) => variant !== "bare")];

// 场景分组：core 是带预设风格的四个，open 是不给 DESIGN.md 的两个（让基础、方向、品味几层真的有事做），
// ignoredone 是从 ignoredone 站点调研来的四个（docs/research/ignoredone-arknights-design.md 的 S1–S4）
export const SETS = ["core", "open", "ignoredone"];
export const DEFAULT_SETS = ["core", "open"];

export const scenarios = (sets = SETS) => readdirSync(SCENARIOS).filter((name) => existsSync(join(SCENARIOS, name, "case.json")) && sets.includes(loadCase(name).set)).sort();

/** 读场景的 case.json，补上默认值：outputs 是一个或几个交付物，每个有可选文件名、尺寸和可选的安全区。 */
export function loadCase(scenario) {
	const dir = join(SCENARIOS, scenario);
	const spec = JSON.parse(readFileSync(join(dir, "case.json"), "utf8"));
	const outputs = spec.outputs ?? [{ files: spec.deliverables, width: spec.width, height: spec.height }];
	const packStyle = spec.packStyle ?? spec.style;
	return { set: "core", hierarchy: null, keyContent: [], controls: false, ...spec, outputs, packStyle, dir, designFile: spec.style ? join(STYLES, `${spec.style}.DESIGN.md`) : null, contentFile: join(dir, "repo", "content.md") };
}

// 所有变体都有的两条：没人回答问题；只交 brief 写的文件
const BASE = ["- 没有人会回答问题：需要拍板的地方自己定，在最后的回复里用一句话说定了什么，然后把东西做完。", "- 只交付 brief.md 里写的文件。"];

/** 变体在工作目录里的样子：要不要装技能（装哪一份），AGENTS.md 写什么。 */
export function variantSetup(variant, scenario) {
	if (!VARIANTS.includes(variant)) throw new Error(`没有 ${variant} 这个变体，可选：${VARIANTS.join("、")}`);
	const { packStyle } = loadCase(scenario);
	const lines = [...BASE];
	if (variant === "adjectives") lines.push(JSON.parse(readFileSync(join(RULE_PACKS, "adjectives.json"), "utf8"))[packStyle]);
	if (variant === "decision-tree") lines.push("", readFileSync(join(RULE_PACKS, `decision-tree.${packStyle}.md`), "utf8").trim());
	if (variant === "principles" || variant === "recipes") lines.push("", readFileSync(join(RULE_PACKS, `${variant}.md`), "utf8").trim());
	return { skill: variant === "bare" || PROMPT_VARIANTS.includes(variant) ? null : variant, agents: `# ${scenario}\n\n${lines.join("\n")}\n` };
}

export const prompt = (scenario) => readFileSync(join(SCENARIOS, scenario, "prompt.md"), "utf8").trim();

export const COLUMNS = [
	"score", "hygiene", "adherence", "rhythmScore", "contractOk", "contractIssues", "deliverable",
	"paletteElements", "palettePixels", "typeScale", "declaredFonts", "colourKinds", "sizeKinds",
	"minFont", "belowMinFont", "typeLevels", "titleBodyRatio", "hierarchyFails",
	"overflow", "safeZoneViolations", "contrastFails", "compositionErrors", "compositionCodes", "contentCoverage",
	"hiddenWithoutMotion", "fakeControls", "antiSlopHard",
	"gapCount", "gapOnStep", "distinctGaps", "ratioCv", "leftEdges", "decorations", "decorationKinds", "decorationRepeat",
	"capture",
];

// results.tsv 的列：改动它会让旧结果目录不能再追加，测试里钉住了
export const HEADER = ["client", "variant", "scenario", "run", "status", ...COLUMNS, "layersRead", "nextRan", "skillUsed", "skillEdited", "exit", "seconds", "workdir"];

const round1 = (value) => Math.round(value * 10) / 10;
const clamp = (value) => Math.max(0, Math.min(100, value));
const unit = (value) => Math.max(0, Math.min(1, value));

/**
 * 综合分（README 里跑之前定好的公式）。交付不合约定（没有文件、多了文件、引用外部资源、尺寸不对）为 0 分。
 * 卫生 = 100 − 40×缺字比例 − 15/处溢出（最多 3）− 10/处字太小（最多 3）− 5/处对比度不够（最多 4）
 *        − 10/条构图错误（最多 2）− 10/条反模板硬规则（最多 3）− 25/条层级不够（最多 2）− 10/条关键文字出安全区（最多 3）
 * 贴合（有预设风格）= 100 ×（0.7 文字、边框、纯色填充的颜色落在色值 ΔE≤5 的比例 + 0.3 字号落在字阶上的比例）
 * 贴合（开放场景）  = 100 ×（0.5 颜色收敛：≤6 种满分、≥10 种 0 分 + 0.5 字号收敛：≤5 级满分、≥8 级 0 分）
 * 节律 = 字号不到 3 级时为 0；否则 100 × 能算的几项的平均：间距落在单位倍数上的比例、1 − 字号比变异系数/0.5、1 −（左边线数 − 1）/8
 * 综合 = 0.4 卫生 + 0.4 贴合 + 0.2 节律
 */
export function composite(values, contractOk, hasStyle = true) {
	const hygiene = clamp(100 - 40 * (1 - values.contentCoverage) - 15 * Math.min(values.overflow, 3) - 10 * Math.min(values.belowMinFont, 3) - 5 * Math.min(values.contrastFails, 4) - 10 * Math.min(values.compositionErrors, 2) - 10 * Math.min(values.antiSlopHard, 3) - 25 * Math.min(values.hierarchyFails ?? 0, 2) - 10 * Math.min(values.safeZoneViolations ?? 0, 3));
	const adherence = hasStyle
		? clamp(100 * (0.7 * (values.paletteElements ?? 0) + 0.3 * (values.typeScale ?? 0)))
		: clamp(100 * (0.5 * unit((10 - values.colourKinds) / 4) + 0.5 * unit((8 - values.sizeKinds) / 3)));
	const parts = [];
	if (values.gapOnStep !== null && values.gapOnStep !== undefined) parts.push(values.gapOnStep);
	if (values.ratioCv !== null && values.ratioCv !== undefined) parts.push(Math.max(0, 1 - values.ratioCv / 0.5));
	if (values.leftEdges > 0) parts.push(Math.max(0, 1 - (values.leftEdges - 1) / 8));
	// 只有一两级字号的页面谈不上节律：间距和边线再整齐也记 0
	const rhythmScore = parts.length && (values.typeLevels ?? 3) >= 3 ? clamp((100 * parts.reduce((sum, value) => sum + value, 0)) / parts.length) : 0;
	const score = contractOk ? 0.4 * hygiene + 0.4 * adherence + 0.2 * rhythmScore : 0;
	return { score: round1(score), hygiene: round1(hygiene), adherence: round1(adherence), rhythmScore: round1(rhythmScore) };
}

// 几个交付物的分项合成一行：次数类相加、最小字号取最小、其余取平均
const SUMMED = new Set(["belowMinFont", "overflow", "safeZoneViolations", "contrastFails", "compositionErrors", "hiddenWithoutMotion", "fakeControls", "antiSlopHard", "hierarchyFails", "gapCount", "decorations"]);
function combine(list) {
	if (list.length === 1) return list[0];
	const out = {};
	for (const key of Object.keys(list[0])) {
		const values = list.map((entry) => entry[key]);
		if (Array.isArray(values[0])) out[key] = [...new Set(values.flat())];
		else if (values.some((value) => typeof value !== "number")) out[key] = values.find((value) => value !== null && value !== undefined) ?? null;
		else if (SUMMED.has(key)) out[key] = values.reduce((sum, value) => sum + value, 0);
		else if (key === "minFont") out[key] = Math.min(...values);
		else out[key] = Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(4));
	}
	return out;
}

/**
 * 给一个工作目录打分。截图、指纹和全部量值写在 captureDir；几个交付物时各自在 captureDir/<文件名>/，
 * 第一个交付物的截图和指纹另复制到 captureDir（盲评和跨次相似度用它）。
 * status：ok，或 no-deliverable（要求的交付物缺了任何一个）。
 */
export async function grade(workdir, scenario, { captureDir }) {
	const spec = loadCase(scenario);
	mkdirSync(captureDir, { recursive: true });
	const issues = [];
	const empty = Object.fromEntries(COLUMNS.map((key) => [key, null]));
	const found = spec.outputs.map((output) => output.files.filter((name) => existsSync(join(workdir, name))));
	const missing = spec.outputs.filter((output, index) => !found[index].length).map((output) => output.files.join(" 或 "));
	if (missing.length) return { ...empty, status: "no-deliverable", score: 0, contractOk: false, contractIssues: [`没有交付物：${missing.join("、")}`], capture: captureDir };
	found.forEach((names) => names.length > 1 && issues.push(`交付物不止一个：${names.join("、")}`));
	const styleOf = (output) => (output.style ? readStyle(join(STYLES, `${output.style}.DESIGN.md`)) : spec.designFile ? readStyle(spec.designFile) : null);
	const pieces = contentPieces(spec.contentFile);
	const perOutput = [];
	for (const [index, output] of spec.outputs.entries()) {
		const deliverable = found[index][0];
		const file = join(workdir, deliverable);
		const source = readFileSync(file, "utf8");
		const refs = externalReferences(source);
		if (refs.length) issues.push(`${deliverable} 引用了外部资源：${refs.slice(0, 3).join("、")}`);
		if (deliverable.endsWith(".svg") && !svgSize(source, output.width, output.height)) issues.push(`${deliverable} 不是 ${output.width}×${output.height}`);
		const dir = spec.outputs.length > 1 ? join(captureDir, deliverable.replace(/\.\w+$/, "")) : captureDir;
		const rendered = await render(file, { width: output.width, height: output.height, minFontPx: spec.minFontPx, captureDir: dir });
		if (rendered.requests.length) issues.push(`${deliverable} 渲染时发起了 ${rendered.requests.length} 个请求`);
		const style = styleOf(output);
		const measured = measureRender(rendered, { style, pieces, width: output.width, height: output.height, minFontPx: spec.minFontPx, profile: spec.profile, controls: spec.controls, floor: spec.hierarchy, safeZone: output.safeZone, keyPieces: spec.keyContent });
		writeFileSync(join(dir, "fingerprint.json"), JSON.stringify(measured.fingerprint));
		if (dir !== captureDir) {
			if (index === 0) {
				copyFileSync(join(dir, "screenshot.png"), join(captureDir, "screenshot.png"));
				copyFileSync(join(dir, "fingerprint.json"), join(captureDir, "fingerprint.json"));
			}
		}
		perOutput.push({ deliverable, hasStyle: Boolean(style), values: measured.values, texts: rendered.facts.texts, audit: rendered.audit.findings });
	}
	const contractOk = issues.length === 0;
	const scores = perOutput.map((entry) => composite(entry.values, contractOk, entry.hasStyle));
	const mean = (key) => round1(scores.reduce((sum, entry) => sum + entry[key], 0) / scores.length);
	const values = combine(perOutput.map((entry) => entry.values));
	const scored = { ...empty, ...values, score: mean("score"), hygiene: mean("hygiene"), adherence: mean("adherence"), rhythmScore: mean("rhythmScore"), status: "ok", contractOk, contractIssues: issues, deliverable: perOutput.map((entry) => entry.deliverable).join("+"), capture: captureDir };
	writeFileSync(join(captureDir, "measure.json"), `${JSON.stringify({ ...scored, outputs: perOutput }, null, 2)}\n`);
	return scored;
}

export const describe = (s) =>
	`综合 ${s.score}（${s.status ?? "ok"}）（卫生 ${s.hygiene ?? "-"}、贴合 ${s.adherence ?? "-"}、节律 ${s.rhythmScore ?? "-"}）${s.contractOk ? "" : `，不合交付约定：${s.contractIssues.join("；")}`}；溢出 ${s.overflow ?? "-"}、色值内元素 ${s.paletteElements ?? "-"}、层级 ${s.typeLevels ?? "-"} 级 ${s.titleBodyRatio ?? "-"} 倍、字阶内 ${s.typeScale ?? "-"}、最小字号 ${s.minFont ?? "-"}、文字覆盖 ${s.contentCoverage ?? "-"}`;
