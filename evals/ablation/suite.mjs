// 设计流水线逐层消融的打分。场景、变体、项目规则、提示词、量出来的分项和综合分都在这里定；
// 怎么渲染、怎么量在 measure.mjs，怎么打出减层的技能目录在 variants.mjs。数字用来比较变体，不用来给单次运行定性。

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { contentPieces, externalReferences, measureRender, readStyle, render, svgSize } from "./measure.mjs";
import { VARIANTS as SKILL_VARIANTS } from "./variants.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
export const SCENARIOS = join(HERE, "scenarios");
const STYLES = join(HERE, "styles");
const RULE_PACKS = join(HERE, "rules");

// 不装技能、只改项目规则的两个对照：形容词提示和 if-else 规则包
export const PROMPT_VARIANTS = ["adjectives", "decision-tree"];
export const VARIANTS = ["bare", ...PROMPT_VARIANTS, ...SKILL_VARIANTS.filter((variant) => variant !== "bare")];

export const scenarios = () => readdirSync(SCENARIOS).filter((name) => existsSync(join(SCENARIOS, name, "case.json"))).sort();

export function loadCase(scenario) {
	const dir = join(SCENARIOS, scenario);
	const spec = JSON.parse(readFileSync(join(dir, "case.json"), "utf8"));
	return { ...spec, dir, designFile: join(STYLES, `${spec.style}.DESIGN.md`), contentFile: join(dir, "repo", "content.md") };
}

// 所有变体都有的两条：没人回答问题；只交一个文件
const BASE = ["- 没有人会回答问题：需要拍板的地方自己定，在最后的回复里用一句话说定了什么，然后把东西做完。", "- 只交付 brief.md 里写的那一个文件。"];

/** 变体在工作目录里的样子：要不要装技能（装哪一份），AGENTS.md 写什么。 */
export function variantSetup(variant, scenario) {
	if (!VARIANTS.includes(variant)) throw new Error(`没有 ${variant} 这个变体，可选：${VARIANTS.join("、")}`);
	const { style } = loadCase(scenario);
	const lines = [...BASE];
	if (variant === "adjectives") lines.push(JSON.parse(readFileSync(join(RULE_PACKS, "adjectives.json"), "utf8"))[style]);
	if (variant === "decision-tree") lines.push("", readFileSync(join(RULE_PACKS, `decision-tree.${style}.md`), "utf8").trim());
	return { skill: variant === "bare" || PROMPT_VARIANTS.includes(variant) ? null : variant, agents: `# ${scenario}\n\n${lines.join("\n")}\n` };
}

export const prompt = (scenario) => readFileSync(join(SCENARIOS, scenario, "prompt.md"), "utf8").trim();

export const COLUMNS = [
	"score", "hygiene", "adherence", "rhythmScore", "contractOk", "contractIssues", "deliverable",
	"palettePixels", "paletteElements", "typeScale", "declaredFonts", "minFont", "belowMinFont",
	"overflow", "contrastFails", "compositionErrors", "compositionCodes", "contentCoverage",
	"hiddenWithoutMotion", "fakeControls", "antiSlopHard",
	"gapCount", "gapOnStep", "distinctGaps", "ratioCv", "leftEdges", "decorations", "decorationKinds", "decorationRepeat",
	"capture",
];

// results.tsv 的列：改动它会让旧结果目录不能再追加，测试里钉住了
export const HEADER = ["client", "variant", "scenario", "run", "status", ...COLUMNS, "skillUsed", "skillEdited", "exit", "seconds", "workdir"];

const round1 = (value) => Math.round(value * 10) / 10;
const clamp = (value) => Math.max(0, Math.min(100, value));

/**
 * 综合分（README 里跑之前定好的公式）。交付不合约定（没有文件、不止一个、引用外部资源、尺寸不对）直接 0 分。
 * 卫生 = 100 − 缺字 40×缺的比例 − 溢出 15/处（最多 3 处）− 字太小 10/处（最多 3）− 对比度不够 5/处（最多 4）
 *        − 构图门禁错误 10/条（最多 2）− 反模板硬规则 10/条（最多 3）
 * 贴合 = 100 ×（0.6 像素落在色值 ΔE≤5 的比例 + 0.2 元素颜色落在色值的比例 + 0.2 字号落在字阶上的比例）
 * 节律 = 100 × 能算的几项的平均：间距落在单位倍数上的比例、1 − 字号比变异系数/0.5、1 −（左边线数 − 1）/8
 * 综合 = 0.4 卫生 + 0.4 贴合 + 0.2 节律
 */
export function composite(values, contractOk) {
	const hygiene = clamp(100 - 40 * (1 - values.contentCoverage) - 15 * Math.min(values.overflow, 3) - 10 * Math.min(values.belowMinFont, 3) - 5 * Math.min(values.contrastFails, 4) - 10 * Math.min(values.compositionErrors, 2) - 10 * Math.min(values.antiSlopHard, 3));
	const elements = values.paletteElements ?? values.palettePixels;
	const adherence = clamp(100 * (0.6 * values.palettePixels + 0.2 * elements + 0.2 * (values.typeScale ?? 0)));
	const parts = [];
	if (values.gapOnStep !== null) parts.push(values.gapOnStep);
	if (values.ratioCv !== null) parts.push(Math.max(0, 1 - values.ratioCv / 0.5));
	if (values.leftEdges > 0) parts.push(Math.max(0, 1 - (values.leftEdges - 1) / 8));
	const rhythmScore = parts.length ? clamp((100 * parts.reduce((sum, value) => sum + value, 0)) / parts.length) : 0;
	const score = contractOk ? 0.4 * hygiene + 0.4 * adherence + 0.2 * rhythmScore : 0;
	return { score: round1(score), hygiene: round1(hygiene), adherence: round1(adherence), rhythmScore: round1(rhythmScore) };
}

/** 给一个工作目录打分。截图、指纹和全部量值写在 captureDir。 */
export async function grade(workdir, scenario, { captureDir }) {
	const spec = loadCase(scenario);
	mkdirSync(captureDir, { recursive: true });
	const found = spec.deliverables.filter((name) => existsSync(join(workdir, name)));
	const issues = [];
	if (!found.length) issues.push("没有交付物");
	if (found.length > 1) issues.push(`交付物不止一个：${found.join("、")}`);
	const empty = Object.fromEntries(COLUMNS.map((key) => [key, null]));
	if (!found.length) return { ...empty, score: 0, contractOk: false, contractIssues: issues, capture: captureDir };

	const deliverable = found[0];
	const file = join(workdir, deliverable);
	const source = readFileSync(file, "utf8");
	const refs = externalReferences(source);
	if (refs.length) issues.push(`引用了外部资源：${refs.slice(0, 3).join("、")}`);
	if (deliverable.endsWith(".svg") && !svgSize(source, spec.width, spec.height)) issues.push(`SVG 不是 ${spec.width}×${spec.height}`);
	const style = readStyle(spec.designFile);
	const rendered = await render(file, { width: spec.width, height: spec.height, minFontPx: spec.minFontPx, captureDir });
	if (rendered.requests.length) issues.push(`渲染时发起了 ${rendered.requests.length} 个请求`);
	const { values, fingerprint } = measureRender(rendered, { style, pieces: contentPieces(spec.contentFile), width: spec.width, height: spec.height, minFontPx: spec.minFontPx, profile: spec.profile, controls: spec.controls });
	const contractOk = issues.length === 0;
	const scored = { ...empty, ...values, ...composite(values, contractOk), contractOk, contractIssues: issues, deliverable, capture: captureDir };
	writeFileSync(join(captureDir, "fingerprint.json"), JSON.stringify(fingerprint));
	writeFileSync(join(captureDir, "measure.json"), `${JSON.stringify({ ...scored, audit: rendered.audit.findings, texts: rendered.facts.texts }, null, 2)}\n`);
	return scored;
}

export const describe = (s) =>
	`综合 ${s.score}（卫生 ${s.hygiene ?? "-"}、贴合 ${s.adherence ?? "-"}、节律 ${s.rhythmScore ?? "-"}）${s.contractOk ? "" : `，不合交付约定：${s.contractIssues.join("；")}`}；溢出 ${s.overflow ?? "-"}、色值内像素 ${s.palettePixels ?? "-"}、字阶内 ${s.typeScale ?? "-"}、最小字号 ${s.minFont ?? "-"}、文字覆盖 ${s.contentCoverage ?? "-"}`;
