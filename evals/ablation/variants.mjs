#!/usr/bin/env node

// 按 layers.json 从 skill/ 打出各个变体的技能目录：full 是打包内容原样，full-minus-<层> 删掉这一层的文件，
// 再把其余 Markdown 里指向这些文件的块（段落、列表项、表格行、整节）和 JSON 里以这些路径为值的数组项一起删掉。
// 打出来的目录和发布包一样：只要 git 跟踪的文件，不含按需下载的 MengTo、iart 原文。
// 用法：node evals/ablation/variants.mjs --out <目录> [--variants full,full-minus-taste-skill] [--copy]

import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, linkSync, lstatSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO = resolve(HERE, "../..");
const require = createRequire(import.meta.url);

export const LAYERS = JSON.parse(readFileSync(join(HERE, "layers.json"), "utf8")).layers;
export const VARIANTS = ["bare", "full", ...LAYERS.map((layer) => `full-minus-${layer.id}`)];
export const SKILL_NAME = "design-pipeline";

export function layerOf(variant) {
	if (variant === "bare" || variant === "full") return null;
	const layer = LAYERS.find((entry) => `full-minus-${entry.id}` === variant);
	if (!layer) throw new Error(`没有 ${variant} 这个变体，可选：${VARIANTS.join("、")}`);
	return layer;
}

/** 发布包里会有的文件（相对 skill/）：git 跟踪、工作区里还在，去掉按需下载的整包原文（和 scripts/package.cjs 一致）。 */
export function packagedFiles(repo = REPO) {
	const listed = spawnSync("git", ["ls-files", "-z", "--", "skill"], { cwd: repo, encoding: "utf8", maxBuffer: 64 << 20 });
	if (listed.status !== 0) throw new Error(`git ls-files 失败：${listed.stderr}`);
	const { WHOLE_BUNDLES } = require(join(repo, "skill/scripts/vendor-cache.cjs"));
	const onDemand = WHOLE_BUNDLES.map((bundle) => `vendor/${bundle}/upstream/`);
	return listed.stdout
		.split("\0")
		.filter(Boolean)
		.map((path) => path.slice("skill/".length))
		.filter((path) => !onDemand.some((prefix) => path.startsWith(prefix)))
		.filter((path) => existsSync(join(repo, "skill", path)) && lstatSync(join(repo, "skill", path)).isFile())
		.sort();
}

/** 层声明展开成要删的文件；有一条一个文件都对不上就报错，免得过时的声明悄悄什么也没删。 */
export function expandLayer(layer, files) {
	const removed = new Set();
	for (const entry of layer.remove) {
		const hits = files.filter((path) => (entry.endsWith("/") ? path.startsWith(entry) : path === entry));
		if (!hits.length) throw new Error(`${layer.id} 的 ${entry} 在打包内容里找不到，layers.json 过时了`);
		hits.forEach((path) => removed.add(path));
	}
	return removed;
}

// 上游原文（*/upstream/**）保持原字节，不改其中的链接
const isUpstream = (path) => path.split("/").includes("upstream");

/** 一段文字里提到的路径有没有指向被删的文件或目录。路径按所在文件的目录和技能根目录两种方式解析。 */
export function mentionChecker(removed, dirs) {
	const hit = (candidate) => removed.has(candidate) || dirs.some((dir) => candidate === dir.slice(0, -1) || candidate.startsWith(dir));
	return (text, fromFile) => {
		const base = posix.dirname(fromFile);
		for (const raw of text.match(/[\w@.\-/]+/g) ?? []) {
			const token = raw.replace(/[.,:;]+$/, "");
			if (!token.includes("/") && !/\.(md|json|cjs|mjs|js|html|css)$/.test(token)) continue;
			const bare = token.replace(/^\/+/, "").replace(/^skill\//, "");
			const candidates = [posix.normalize(posix.join(base, token)), posix.normalize(bare)];
			if (candidates.some(hit)) return true;
		}
		return false;
	};
}

const LIST_ITEM = /^(\s*)([-*+]|\d+[.)])\s+/;
const FENCE = /^\s*(```|~~~)/;
const HEADING = /^(#{1,6})\s/;
const indentOf = (line) => line.match(/^\s*/)[0].length;

// 把 Markdown 切成块：代码、标题、空行、表格、列表、段落
function blocks(lines) {
	const out = [];
	for (let i = 0; i < lines.length; ) {
		const line = lines[i];
		const start = i;
		if (FENCE.test(line)) {
			const fence = line.trim().slice(0, 3);
			i++;
			while (i < lines.length && !lines[i].trim().startsWith(fence)) i++;
			i = Math.min(lines.length, i + 1);
			out.push({ type: "code", lines: lines.slice(start, i) });
		} else if (HEADING.test(line)) {
			out.push({ type: "heading", level: HEADING.exec(line)[1].length, lines: [line] });
			i++;
		} else if (!line.trim()) {
			out.push({ type: "blank", lines: [line] });
			i++;
		} else if (line.trim().startsWith("|")) {
			while (i < lines.length && lines[i].trim().startsWith("|")) i++;
			out.push({ type: "table", lines: lines.slice(start, i) });
		} else {
			const type = LIST_ITEM.test(line) ? "list" : "paragraph";
			i++;
			while (i < lines.length && lines[i].trim() && !HEADING.test(lines[i]) && !FENCE.test(lines[i]) && !(type === "paragraph" && lines[i].trim().startsWith("|"))) i++;
			const chunk = lines.slice(start, i);
			// 绝大多数行以句号结尾的“段落”其实是一行一条（例如一串“Reference file: ...”），按句号切成条处理
			const ends = (entry) => /[.。]\s*$/.test(entry);
			if (type === "paragraph" && chunk.length > 2 && chunk.filter(ends).length >= 0.8 * chunk.length) {
				let entry = [];
				for (const row of chunk) {
					entry.push(row);
					if (ends(row)) {
						out.push({ type, lines: entry });
						entry = [];
					}
				}
				if (entry.length) out.push({ type, lines: entry });
			} else out.push({ type, lines: chunk });
		}
	}
	return out;
}

// 列表按缩进分项：一项自己的文字提到了被删的路径，整项（连同子项）删掉；否则只在子项里删
function pruneList(lines, mentions, dropped) {
	const items = lines.filter((line) => LIST_ITEM.test(line));
	if (!items.length) return lines;
	const top = Math.min(...items.map(indentOf));
	const groups = [];
	for (const line of lines) {
		if ((LIST_ITEM.test(line) && indentOf(line) === top) || !groups.length) groups.push([line]);
		else groups.at(-1).push(line);
	}
	const kept = [];
	for (const group of groups) {
		const nested = group.findIndex((line, index) => index > 0 && LIST_ITEM.test(line) && indentOf(line) > top);
		const own = nested < 0 ? group : group.slice(0, nested);
		if (mentions(own.join("\n"))) {
			dropped.push(group[0].trim());
			continue;
		}
		kept.push(...own, ...(nested < 0 ? [] : pruneList(group.slice(nested), mentions, dropped)));
	}
	return kept;
}

/** 删掉提到被删路径的块。返回新文本和删掉的块（每块的第一行），文本只会少行，不会多出或改动别的行。 */
export function pruneMarkdown(text, mentionsIn) {
	const parsed = blocks(text.split("\n"));
	const dropped = [];
	let skipBelow = 0;
	for (const block of parsed) {
		if (block.type === "heading") {
			if (skipBelow && block.level > skipBelow) {
				block.removed = true;
				continue;
			}
			skipBelow = 0;
			if (mentionsIn(block.lines[0])) {
				block.removed = true;
				skipBelow = block.level;
				dropped.push(`${block.lines[0].trim()}（整节）`);
			}
			continue;
		}
		if (skipBelow) {
			block.removed = true;
			continue;
		}
		if (block.type === "blank") continue;
		if (block.type === "table") {
			if (block.lines.length < 3 || mentionsIn(block.lines.slice(0, 2).join("\n"))) {
				if (mentionsIn(block.lines.join("\n"))) {
					block.removed = true;
					dropped.push(block.lines[0].trim());
				}
				continue;
			}
			const body = block.lines.slice(2).filter((row) => {
				if (!mentionsIn(row)) return true;
				dropped.push(row.trim().slice(0, 120));
				return false;
			});
			if (!body.length) block.removed = true;
			else block.lines = [...block.lines.slice(0, 2), ...body];
		} else if (block.type === "list") {
			block.lines = pruneList(block.lines, mentionsIn, dropped);
			if (!block.lines.length) block.removed = true;
		} else if (mentionsIn(block.lines.join("\n"))) {
			block.removed = true;
			dropped.push(block.lines[0].trim().slice(0, 120));
		}
	}
	// 一节里的内容全删光了，标题也删掉
	parsed.forEach((block, index) => {
		if (block.type !== "heading" || block.removed) return;
		let hadContent = false;
		let hasContent = false;
		for (const next of parsed.slice(index + 1)) {
			if (next.type === "heading" && next.level <= block.level) break;
			if (next.type === "blank") continue;
			hadContent = true;
			if (!next.removed) hasContent = true;
		}
		if (hadContent && !hasContent) {
			block.removed = true;
			dropped.push(`${block.lines[0].trim()}（空节）`);
		}
	});
	const lines = [];
	for (const block of parsed.filter((entry) => !entry.removed)) {
		// 删块留下的连续空行并成一行
		if (block.type === "blank" && lines.length && !lines.at(-1).trim()) continue;
		lines.push(...block.lines);
	}
	return { text: lines.join("\n"), dropped };
}

const isPathValue = (value, hit) => typeof value === "string" && hit(value.replace(/^\.\//, "").replace(/^skill\//, ""));

// 数组里以被删路径为值的项删掉：字符串本身，或对象（含嵌套对象，不含嵌套数组）的某个字段值
export function pruneJson(value, hit) {
	let count = 0;
	const owns = (node) => {
		if (isPathValue(node, hit)) return true;
		if (!node || typeof node !== "object" || Array.isArray(node)) return false;
		return Object.values(node).some((child) => (Array.isArray(child) ? false : owns(child)));
	};
	const walk = (node) => {
		if (Array.isArray(node)) {
			const kept = [];
			for (const item of node) {
				if (owns(item)) count++;
				else kept.push(walk(item));
			}
			return kept;
		}
		if (node && typeof node === "object") return Object.fromEntries(Object.entries(node).map(([key, child]) => [key, walk(child)]));
		return node;
	};
	return { value: walk(value), count };
}

// 保留下来的脚本里，相对路径的 require / import 指向的文件
function relativeImports(source) {
	return [...source.matchAll(/(?:require\(\s*|from\s+|import\(\s*)["'](\.{1,2}\/[^"']+)["']/g)].map((match) => match[1]);
}

/** 发布包资源检查（scripts/qa.cjs 的同一组规则）：required 都在、references/*.json 能解析、只有根目录一个 SKILL.md、没有符号链接。 */
export function checkPackage(tree) {
	const problems = [];
	const manifest = JSON.parse(readFileSync(join(tree, "references/package-resources.json"), "utf8"));
	for (const file of manifest.required) if (!existsSync(join(tree, file))) problems.push(`required 缺 ${file}`);
	for (const name of readdirSync(join(tree, "references")).filter((entry) => entry.endsWith(".json"))) {
		try {
			JSON.parse(readFileSync(join(tree, "references", name), "utf8"));
		} catch (error) {
			problems.push(`references/${name} 不是合法 JSON：${error.message}`);
		}
	}
	const walk = (dir, rel) => {
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			const path = rel ? `${rel}/${entry.name}` : entry.name;
			if (entry.isSymbolicLink()) problems.push(`符号链接 ${path}`);
			else if (entry.isDirectory()) walk(join(dir, entry.name), path);
			else if (entry.name === "SKILL.md" && path !== "SKILL.md") problems.push(`多出一个 SKILL.md：${path}`);
		}
	};
	walk(tree, "");
	return { ok: problems.length === 0, problems };
}

// 硬链接省空间；文件只读不写，变体里改过的文件是新写的，不会改到仓库。跨设备时退回复制
function place(source, target, copy) {
	mkdirSync(dirname(target), { recursive: true });
	if (!copy) {
		try {
			linkSync(source, target);
			return;
		} catch (error) {
			if (!["EXDEV", "EPERM", "EMLINK"].includes(error.code)) throw error;
		}
	}
	copyFileSync(source, target);
}

/**
 * 打出一个变体的技能目录 <out>/<变体>/design-pipeline，报告写在 <out>/<变体>.report.json（不在技能目录里，代理看不到）。
 * bare 没有技能目录。
 */
export function buildVariant(variant, out, { repo = REPO, copy = false, files = packagedFiles(repo) } = {}) {
	const layer = layerOf(variant);
	const report = { variant, layer: layer?.id ?? null, tree: null, files: 0, removed: [], keptCode: layer?.keptCode ?? [], prunedMarkdown: [], prunedJson: [], residual: [], package: null };
	if (variant === "bare") return report;
	const tree = join(out, variant, SKILL_NAME);
	rmSync(join(out, variant), { recursive: true, force: true });
	const removed = layer ? expandLayer(layer, files) : new Set();
	const dirs = (layer?.remove ?? []).filter((entry) => entry.endsWith("/"));
	const hit = (candidate) => removed.has(candidate) || dirs.some((dir) => candidate === dir.slice(0, -1) || candidate.startsWith(dir));
	const mentions = mentionChecker(removed, dirs);
	const kept = files.filter((path) => !removed.has(path));
	for (const path of kept) {
		const source = join(repo, "skill", path);
		const target = join(tree, path);
		if (layer && !isUpstream(path) && path.endsWith(".md")) {
			const text = readFileSync(source, "utf8");
			const result = pruneMarkdown(text, (chunk) => mentions(chunk, path));
			if (result.dropped.length) {
				mkdirSync(dirname(target), { recursive: true });
				writeFileSync(target, result.text);
				report.prunedMarkdown.push({ file: path, blocks: result.dropped });
				continue;
			}
		}
		if (layer && !isUpstream(path) && path.endsWith(".json")) {
			const text = readFileSync(source, "utf8");
			const result = pruneJson(JSON.parse(text), hit);
			if (result.count) {
				mkdirSync(dirname(target), { recursive: true });
				writeFileSync(target, `${JSON.stringify(result.value, null, 2)}\n`);
				report.prunedJson.push({ file: path, items: result.count });
				continue;
			}
		}
		place(source, target, copy);
	}
	report.tree = tree;
	report.files = kept.length;
	report.removed = [...removed].sort();
	if (layer) {
		for (const path of kept) {
			if (isUpstream(path) || !/\.(md|json|cjs|mjs|js)$/.test(path)) continue;
			const text = readFileSync(join(tree, path), "utf8");
			if (/\.(cjs|mjs|js)$/.test(path)) {
				for (const target of relativeImports(text)) {
					const resolved = posix.normalize(posix.join(posix.dirname(path), target));
					if (removed.has(resolved) || removed.has(`${resolved}.cjs`) || removed.has(`${resolved}.js`)) throw new Error(`${variant}：${path} 还在 require 被删的 ${resolved}，把它写进 keptCode 或从 remove 里拿掉`);
				}
			}
			// 剩下的文字里仍然提到被删路径的地方：Markdown 应该是 0，脚本和 JSON 里的说明文字照实列出来
			const lines = text.split("\n").filter((line) => mentions(line, path)).length;
			if (lines) report.residual.push({ file: path, lines });
		}
	}
	report.package = checkPackage(tree);
	writeFileSync(join(out, `${variant}.report.json`), `${JSON.stringify(report, null, 2)}\n`);
	return report;
}

export function buildVariants(variants, out, options = {}) {
	mkdirSync(out, { recursive: true });
	const files = packagedFiles(options.repo ?? REPO);
	return variants.map((variant) => buildVariant(variant, out, { ...options, files }));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const { values } = parseArgs({ options: { out: { type: "string" }, variants: { type: "string" }, copy: { type: "boolean", default: false } } });
	if (!values.out) throw new Error("--out <目录> 必填");
	const variants = values.variants ? values.variants.split(",") : VARIANTS;
	for (const report of buildVariants(variants, resolve(values.out), { copy: values.copy })) {
		if (!report.tree) {
			console.log(`${report.variant}：不装技能`);
			continue;
		}
		const blocks = report.prunedMarkdown.reduce((sum, entry) => sum + entry.blocks.length, 0);
		const items = report.prunedJson.reduce((sum, entry) => sum + entry.items, 0);
		const residual = report.residual.map((entry) => `${entry.file}(${entry.lines})`).join("、");
		console.log(`${report.variant}：${report.files} 个文件，删 ${report.removed.length} 个、Markdown 块 ${blocks} 个、JSON 项 ${items} 个；打包检查${report.package.ok ? "通过" : `不通过：${report.package.problems.join("；")}`}${residual ? `；仍提到被删路径：${residual}` : ""}`);
	}
}
