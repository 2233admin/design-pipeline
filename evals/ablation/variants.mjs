#!/usr/bin/env node

// 按 layers.json 从 skill/ 打出各个变体的技能目录：full 是打包内容原样，full-minus-<层> 删掉这一层的文件，
// 再把其余 Markdown 里指向这些文件的块（段落、列表项、表格行、整节）和 JSON 里以这些路径为值的数组项一起删掉。
// 打出来的目录和发布包一样：只要 git 跟踪的文件，不含按需下载的 MengTo、iart 原文。
// 用法：node evals/ablation/variants.mjs --out <目录> [--variants full,full-minus-taste-skill] [--copy]

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
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

// 上游原文保持原字节，不改其中的链接：*/upstream/** 和 vendor/ 下除总索引 vendor/README.md 以外的一切
const isUpstream = (path) => path.split("/").includes("upstream") || (path.startsWith("vendor/") && path !== "vendor/README.md");

/**
 * 一段文字里指向被删内容的地方：路径（按所在文件的目录和技能根目录两种方式解析）和层声明的指代短语（不分大小写）。
 * 返回每处的 [起, 止)。
 */
export function mentionFinder(removed, dirs, pointers = []) {
	const hit = (candidate) => removed.has(candidate) || dirs.some((dir) => candidate === dir.slice(0, -1) || candidate.startsWith(dir));
	const phrases = pointers.map((phrase) => phrase.toLowerCase());
	return (text, fromFile) => {
		const base = posix.dirname(fromFile);
		const spans = [];
		for (const match of text.matchAll(/[\w@.\-/]+/g)) {
			const token = match[0].replace(/[.,:;]+$/, "");
			if (!token.includes("/") && !/\.(md|json|cjs|mjs|js|html|css)$/.test(token)) continue;
			const bare = token.replace(/^\/+/, "").replace(/^skill\//, "");
			if ([posix.normalize(posix.join(base, token)), posix.normalize(bare)].some(hit)) spans.push([match.index, match.index + token.length]);
		}
		const lower = text.toLowerCase();
		for (const phrase of phrases) for (let at = lower.indexOf(phrase); at >= 0; at = lower.indexOf(phrase, at + 1)) spans.push([at, at + phrase.length]);
		return spans.sort((a, b) => a[0] - b[0]);
	};
}

/** 只要布尔值的版本：有没有提到。 */
export function mentionChecker(removed, dirs, pointers = []) {
	const find = mentionFinder(removed, dirs, pointers);
	return (text, fromFile) => find(text, fromFile).length > 0;
}

const LIST_ITEM = /^(\s*)([-*+]|\d+[.)])\s+/;
const FENCE = /^\s*(```|~~~)/;
const HEADING = /^(#{1,6})\s/;
const indentOf = (line) => line.match(/^\s*/)[0].length;

// 把 Markdown 切成块：代码、标题、空行、表格、列表、段落。块里记下每行在原文件里的行号
function blocks(lines) {
	const out = [];
	const take = (type, start, end, extra = {}) => out.push({ type, rows: lines.slice(start, end).map((text, index) => ({ no: start + index, text })), ...extra });
	for (let i = 0; i < lines.length; ) {
		const line = lines[i];
		const start = i;
		if (FENCE.test(line)) {
			const fence = line.trim().slice(0, 3);
			i++;
			while (i < lines.length && !lines[i].trim().startsWith(fence)) i++;
			i = Math.min(lines.length, i + 1);
			take("code", start, i);
		} else if (HEADING.test(line)) {
			take("heading", start, ++i, { level: HEADING.exec(line)[1].length });
		} else if (!line.trim()) {
			take("blank", start, ++i);
		} else if (line.trim().startsWith("|")) {
			while (i < lines.length && lines[i].trim().startsWith("|")) i++;
			take("table", start, i);
		} else {
			const type = LIST_ITEM.test(line) ? "list" : "paragraph";
			i++;
			while (i < lines.length && lines[i].trim() && !HEADING.test(lines[i]) && !FENCE.test(lines[i]) && !(type === "paragraph" && lines[i].trim().startsWith("|"))) i++;
			take(type, start, i);
		}
	}
	return out;
}

// 一处提到的标记范围：在 [文字](路径) 的路径里就扩到整个链接，在反引号里就扩到反引号
function markupExtent(text, [start, end]) {
	// 在链接文字里：[...] 后面紧跟 (...)
	const label = text.lastIndexOf("[", start);
	if (label >= 0 && !/[\]\n]/.test(text.slice(label, start))) {
		const mid = text.indexOf("](", start);
		if (mid >= end - 1 && !/[\[\n]/.test(text.slice(end, mid))) {
			const close = text.indexOf(")", mid);
			if (close >= 0) return [label, close + 1];
		}
	}
	// 在链接地址里
	const open = text.lastIndexOf("](", start);
	if (open >= 0 && !text.slice(open, start).includes(")") && !text.slice(open, start).includes("\n")) {
		const close = text.indexOf(")", end);
		const start2 = text.lastIndexOf("[", open);
		if (close >= 0 && start2 >= 0 && !text.slice(start2, open).includes("\n")) return [start2, close + 1];
	}
	if (text[start - 1] === "`") {
		const close = text.indexOf("`", end);
		if (close >= 0 && !text.slice(end, close).includes("\n")) return [start - 1, close + 1];
	}
	return [start, end];
}

// 句子边界：句末标点后跟空白或结尾
const SENTENCE_END = /[.。！？!?；;](?=\s|$)/g;

function sentenceAround(text, start, end) {
	let from = 0;
	for (const match of text.matchAll(SENTENCE_END)) {
		if (match.index + 1 <= start) from = match.index + 1;
		else if (match.index >= end - 1) return [from, match.index + 1];
	}
	return [from, text.length];
}

// 删掉 [起, 止) 里除换行以外的字符：行数不变。删的范围跨了行、紧跟着的是右括号或标点时，把它们挪到范围开头，免得留在下一行行首
function cut(text, start, end) {
	const kept = text.slice(start, end).replace(/[^\n]/g, "");
	const trail = kept && /^[).,;:。，；]+/.exec(text.slice(end))?.[0];
	if (trail) return text.slice(0, start) + trail + kept + text.slice(end + trail.length).replace(/^ +/, "");
	return text.slice(0, start) + kept + text.slice(end);
}

// 列举的分隔：逗号、顿号、分号、and / or；括号、冒号、句末是列举的边界
const LIST_DELIM = /^(, |，|、|; | and | or |和|与)/;
const ITEM_START = [", ", "，", "、", "; ", " and ", " or ", "(", ": ", "\n- "];
const ITEM_END = [", ", "，", "、", "; ", " and ", " or ", ")", ":", ". ", ".\n", "。"];

// 一处提到所在的列举项：前一个分隔之后到后一个分隔之前（不跨句）
function itemAround(text, start, end, sentence) {
	let from = sentence[0];
	let opener = "";
	for (const mark of ITEM_START) {
		const at = text.lastIndexOf(mark, start - 1);
		if (at >= sentence[0] && at + mark.length <= start && at + mark.length > from) {
			from = at + mark.length;
			opener = mark;
		}
	}
	let to = sentence[1];
	let closer = "";
	for (const mark of ITEM_END) {
		const at = text.indexOf(mark, end);
		if (at >= 0 && at < to) {
			to = at;
			closer = mark;
		}
	}
	if (text.slice(to).startsWith(".") && to === sentence[1] - 1) closer = ".";
	return { from, to, opener, closer };
}

/**
 * 在一段文字里精确删除：括号里只有它的注、列举里的它那一项（带一个分隔）、否则它所在的整句。
 * 返回新文字，以及是不是删到了第一句（列表项和表格格子的第一句是这一条的主语，删了就整条删）。
 */
function precise(text, find) {
	let lead = false;
	for (let guard = 0; guard < 200; guard++) {
		const spans = find(text);
		if (!spans.length) break;
		const [start, end] = markupExtent(text, spans[0]);
		// 两个引用并列（[a](a) and [b](b)、`a`, `b`）：只删这一个和它们之间的分隔
		const prevRef = /(\)|`)( and | or |, |、|，)$/.exec(text.slice(0, start));
		const nextRef = /^( and | or |, |、|，)(\[|`)/.exec(text.slice(end));
		if (start !== spans[0][0] || text[start] === "`" || text[start] === "[") {
			if (nextRef) {
				text = cut(text, start, end + nextRef[1].length);
				continue;
			}
			if (prevRef) {
				text = cut(text, start - prevRef[2].length, end);
				continue;
			}
		}
		const sentence = sentenceAround(text, start, end);
		const item = itemAround(text, start, end, sentence);
		// 只有“差不多就是这个引用本身”的一项才按列举删：项里除了引用最多 3 个词（项在句首时不能有别的词），否则删整句
		const extra = `${text.slice(item.from, start)} ${text.slice(end, item.to)}`.replace(/[`*_[\]()]/g, " ").trim();
		const words = extra ? extra.split(/\s+/).length + (extra.match(/[\u4e00-\u9fff]/g)?.length ?? 0) / 2 : 0;
		// 项里有“去读、去用”这类动词时，这是一句路由指示，删整句
		const route = /\b(use|read|open|follow|see|run|select|load|start|route|consult|apply)\b/i.test(extra);
		const small = !route && words <= (item.opener ? 3 : 0);
		const listOpen = small && LIST_DELIM.test(item.opener);
		const listClose = small && LIST_DELIM.test(item.closer);
		if (item.opener === "(" && item.closer === ")" && small) {
			// 括号注整个删掉，连同括号前的空白（换行保留，紧跟的标点挪到上一行行尾）
			let from = item.from - 1;
			while (from > 0 && /\s/.test(text[from - 1])) from--;
			text = cut(text, from, item.to + 1);
		} else if (listClose) text = cut(text, item.from, item.to + item.closer.length);
		else if (listOpen) text = cut(text, item.from - item.opener.length, item.to);
		else {
			if (!text.slice(0, sentence[0]).trim()) lead = true;
			text = cut(text, sentence[0], sentence[1]);
		}
	}
	return { text, lead };
}

// 删过字的行：去掉多出来的空格；删空的行去掉。括号注删掉时可能少一个换行，这时把它并进上一行
function tidy(rows, newText) {
	const lines = newText.split("\n");
	const out = [];
	const shift = rows.length - lines.length;
	for (let index = 0; index < lines.length; index++) {
		const row = rows[index + (index > 0 ? shift : 0)] ?? rows.at(-1);
		const indent = (index === 0 ? rows[0] : row).text.match(/^\s*/)[0];
		const text = lines[index].trim() ? indent + lines[index].trim().replace(/ {2,}/g, " ").replace(/ ([,.;:)])/g, "$1") : "";
		out.push({ ...(index === 0 ? rows[0] : row), text });
	}
	return out.filter((row) => row.text.trim());
}

// 一张表的一行：每个格子里精确删；删空了格子或删到格子的第一句，整行删
function pruneRow(row, find) {
	if (!find(row.text).length) return row;
	const cells = row.text.split("|");
	for (let i = 1; i < cells.length - 1; i++) {
		if (!find(cells[i]).length) continue;
		const { text, lead } = precise(cells[i], find);
		if (lead || !text.trim()) return null;
		cells[i] = ` ${text.trim().replace(/ {2,}/g, " ").replace(/[,;，、；]+$/, "")} `;
	}
	return { ...row, text: cells.join("|") };
}

// 列表按缩进分项；一项自己的文字（不含子项）里精确删，删到第一句就连子项整项删
function pruneList(rows, find) {
	const items = rows.filter((row) => LIST_ITEM.test(row.text));
	if (!items.length) return rows;
	const top = Math.min(...items.map((row) => indentOf(row.text)));
	const groups = [];
	for (const row of rows) {
		if ((LIST_ITEM.test(row.text) && indentOf(row.text) === top) || !groups.length) groups.push([row]);
		else groups.at(-1).push(row);
	}
	const kept = [];
	for (const group of groups) {
		const nested = group.findIndex((row, index) => index > 0 && LIST_ITEM.test(row.text) && indentOf(row.text) > top);
		const own = nested < 0 ? group : group.slice(0, nested);
		const children = nested < 0 ? [] : pruneList(group.slice(nested), find);
		const joined = own.map((row) => row.text).join("\n");
		if (!find(joined).length) {
			kept.push(...own, ...children);
			continue;
		}
		const marker = LIST_ITEM.exec(own[0].text)[0];
		const body = marker.replace(/\S/g, " ") + joined.slice(marker.length);
		const { text, lead } = precise(body, find);
		if (lead || !text.trim()) continue;
		const tidied = tidy(own, text);
		if (!tidied.length || tidied[0].no !== own[0].no) continue;
		tidied[0] = { ...tidied[0], text: marker + tidied[0].text.trimStart() };
		kept.push(...tidied, ...children);
	}
	return kept;
}

/**
 * 删掉指向被删内容的地方，尽量小：列举里的一项、只装着它的括号注、它所在的句子；表格行、列表项的主语就是它时删整行整项；
 * 代码块只删提到它的行（连同续行）；标题提到它时删整节；一节删空了，标题也删。
 * 返回新文本和逐行的改动（原行号、原文、新文或 null），行只会被删短或删掉，不会新增。
 */
export function pruneMarkdown(text, find) {
	const parsed = blocks(text.split("\n"));
	let skipBelow = 0;
	for (const block of parsed) {
		const joined = block.rows.map((row) => row.text).join("\n");
		if (block.type === "heading") {
			if (skipBelow && block.level > skipBelow) {
				block.kept = [];
				continue;
			}
			skipBelow = 0;
			if (find(joined).length) {
				block.kept = [];
				skipBelow = block.level;
			}
			continue;
		}
		if (skipBelow) {
			block.kept = [];
			continue;
		}
		if (block.type === "blank" || !find(joined).length) continue;
		if (block.type === "code") {
			const body = block.rows.slice(1, -1);
			const kept = [];
			let dropNext = false;
			for (const row of body) {
				const drop = dropNext || find(row.text).length > 0;
				dropNext = drop && /\\\s*$/.test(row.text);
				if (!drop) kept.push(row);
			}
			block.kept = kept.some((row) => row.text.trim()) ? [block.rows[0], ...kept, block.rows.at(-1)] : [];
		} else if (block.type === "table") {
			if (block.rows.length < 3 || find(block.rows.slice(0, 2).map((row) => row.text).join("\n")).length) block.kept = [];
			else {
				const body = block.rows.slice(2).map((row) => pruneRow(row, find)).filter(Boolean);
				block.kept = body.length ? [...block.rows.slice(0, 2), ...body] : [];
			}
		} else if (block.type === "list") block.kept = pruneList(block.rows, find);
		else {
			const { text: next } = precise(joined, find);
			block.kept = tidy(block.rows, next);
		}
	}
	// 一节里的内容全删光了，标题也删掉
	const empty = (block) => block.kept && !block.kept.some((row) => row.text.trim());
	parsed.forEach((block, index) => {
		if (block.type !== "heading" || block.kept) return;
		let had = false;
		let has = false;
		for (const next of parsed.slice(index + 1)) {
			if (next.type === "heading" && next.level <= block.level) break;
			if (next.type === "blank") continue;
			had = true;
			if (!empty(next)) has = true;
		}
		if (had && !has) block.kept = [];
	});
	const rows = [];
	const changes = [];
	let gap = false;
	for (const block of parsed) {
		// 删掉整块后留下的连续空行并成一行；原文本来就有的连续空行不动
		if (block.type === "blank" && gap && rows.length && !rows.at(-1).trim()) {
			changes.push({ line: block.rows[0].no + 1, before: block.rows[0].text, after: null });
			continue;
		}
		const kept = block.kept ?? block.rows;
		const after = new Map(kept.map((row) => [row.no, row.text]));
		for (const row of block.rows) if (after.get(row.no) !== row.text) changes.push({ line: row.no + 1, before: row.text, after: after.has(row.no) ? after.get(row.no) : null });
		if (block.type !== "blank") gap = kept.length === 0 && block.rows.length > 0 ? true : false;
		rows.push(...kept.map((row) => row.text));
	}
	return { text: rows.join("\n"), changes };
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
	const report = { variant, layer: layer?.id ?? null, tree: null, files: 0, removed: [], stubs: [], keptCode: layer?.keptCode ?? [], prunedMarkdown: [], prunedJson: [], residual: [], package: null };
	if (variant === "bare") return report;
	const tree = join(out, variant, SKILL_NAME);
	rmSync(join(out, variant), { recursive: true, force: true });
	const removed = layer ? expandLayer(layer, files) : new Set();
	const dirs = (layer?.remove ?? []).filter((entry) => entry.endsWith("/"));
	const hit = (candidate) => removed.has(candidate) || dirs.some((dir) => candidate === dir.slice(0, -1) || candidate.startsWith(dir));
	const find = mentionFinder(removed, dirs, layer?.pointers ?? []);
	const kept = files.filter((path) => !removed.has(path));
	for (const path of kept) {
		const source = join(repo, "skill", path);
		const target = join(tree, path);
		if (layer && !isUpstream(path) && path.endsWith(".md")) {
			const text = readFileSync(source, "utf8");
			const result = pruneMarkdown(text, (chunk) => find(chunk, path));
			if (result.changes.length) {
				mkdirSync(dirname(target), { recursive: true });
				writeFileSync(target, result.text);
				report.prunedMarkdown.push({ file: path, changes: result.changes });
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
	// 层声明的替身文件：例如空的设计方向库清单，让 doctor 照常通过、命令行照常运行，只是库里没有内容
	for (const [path, kind] of Object.entries(layer?.stubs ?? {})) {
		const target = join(tree, path);
		mkdirSync(dirname(target), { recursive: true });
		writeFileSync(target, STUBS[kind](join(repo, "skill", path), tree, path));
		report.stubs.push(path);
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
			// 剩下的文字里仍然指向被删内容的地方：Markdown 应该是 0，脚本和 JSON 里的说明文字照实列出来
			const lines = text.split("\n").filter((line) => find(line, path).length).length;
			if (lines) report.residual.push({ file: path, lines });
		}
	}
	report.package = checkPackage(tree);
	writeFileSync(join(out, `${variant}.report.json`), `${JSON.stringify(report, null, 2)}\n`);
	return report;
}

// 替身文件的写法
const STUBS = {
	// 设计方向库清单：保留来源与许可，内容清空（随包和下载的对象都是 0 个），源树换成 git 的空树；随包目录建成空目录
	"empty-direction-library": (source, tree, path) => {
		const manifest = JSON.parse(readFileSync(source, "utf8"));
		const { gitTreeId } = require(join(REPO, "skill/scripts/mengto-skills-core.cjs"));
		const empty = { objects: [], fileCount: 0, byteCount: 0, treeSha256: createHash("sha256").update("").digest("hex"), executableFiles: [] };
		manifest.source.gitTree = gitTreeId([]);
		// 换一个修订号：用户缓存里下载过的真库按修订号存放，不能让替身清单去校验它
		manifest.source.revision = "0".repeat(40);
		manifest.snapshot = { ...manifest.snapshot, ...empty };
		manifest.fetched = { ...manifest.fetched, ...empty };
		mkdirSync(join(tree, dirname(path), manifest.snapshot.root), { recursive: true });
		return `${JSON.stringify(manifest, null, 2)}\n`;
	},
};

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
		const blocks = report.prunedMarkdown.reduce((sum, entry) => sum + entry.changes.length, 0);
		const items = report.prunedJson.reduce((sum, entry) => sum + entry.items, 0);
		const residual = report.residual.map((entry) => `${entry.file}(${entry.lines})`).join("、");
		console.log(`${report.variant}：${report.files} 个文件，删 ${report.removed.length} 个、Markdown 改动 ${blocks} 行、JSON 项 ${items} 个；打包检查${report.package.ok ? "通过" : `不通过：${report.package.problems.join("；")}`}${residual ? `；仍提到被删路径：${residual}` : ""}`);
	}
}
