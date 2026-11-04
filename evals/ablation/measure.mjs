// 渲染一份交付物并量出能量的事实。浏览器、页面审计、构图门禁、文字提取都复用 skill/scripts 里现成的代码：
// interaction-audit.cjs（对比度、溢出、裁切、出画）、composition-core.cjs（构图门禁）、capture-composition.cjs 的 extract（文字与色块）、
// design-system-package-core.cjs 的 frontMatterGroups（读 DESIGN.md 的色值和字号）、png-core.cjs（解 PNG）。
// 不调用任何模型，同一台机器上同一份文件每次量出来一样。

import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, join } from "node:path";
import { pathToFileURL } from "node:url";
import { REPO } from "./variants.mjs";

const require = createRequire(import.meta.url);
const scripts = join(REPO, "skill/scripts");
const { auditOptions, auditPage, summarizeAudit } = require(join(scripts, "interaction-audit.cjs"));
const { checkComposition } = require(join(scripts, "composition-core.cjs"));
const { extract } = require(join(scripts, "capture-composition.cjs"));
const { frontMatterGroups } = require(join(scripts, "design-system-package-core.cjs"));
const { decodePng } = require(join(scripts, "png-core.cjs"));
const { resolvePuppeteer } = require(join(scripts, "film-capture-core.cjs"));
const { resolveBrowser } = require(join(scripts, "browser-locate.cjs"));

export const DELTA_E = 5;
// 等页面的入场动画走完再截图、再量
const SETTLE_MS = 2500;

// ---------- 颜色 ----------

export function hexToRgb(hex) {
	const value = hex.replace("#", "");
	const full = value.length === 3 ? [...value].map((c) => c + c).join("") : value.slice(0, 6);
	return [0, 2, 4].map((i) => Number.parseInt(full.slice(i, i + 2), 16));
}

export function rgbToLab([r, g, b]) {
	const lin = (c) => {
		const v = c / 255;
		return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
	};
	const [R, G, B] = [lin(r), lin(g), lin(b)];
	const x = (0.4124564 * R + 0.3575761 * G + 0.1804375 * B) / 0.95047;
	const y = 0.2126729 * R + 0.7151522 * G + 0.072175 * B;
	const z = (0.0193339 * R + 0.119192 * G + 0.9503041 * B) / 1.08883;
	const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
	return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

/** CIEDE2000（Sharma、Wu、Dalal 2005 的公式）。 */
export function deltaE2000([L1, a1, b1], [L2, a2, b2]) {
	const rad = Math.PI / 180;
	const C1 = Math.hypot(a1, b1);
	const C2 = Math.hypot(a2, b2);
	const Cbar = (C1 + C2) / 2;
	const G = 0.5 * (1 - Math.sqrt(Cbar ** 7 / (Cbar ** 7 + 25 ** 7)));
	const a1p = (1 + G) * a1;
	const a2p = (1 + G) * a2;
	const C1p = Math.hypot(a1p, b1);
	const C2p = Math.hypot(a2p, b2);
	const hue = (b, a) => (b === 0 && a === 0 ? 0 : ((Math.atan2(b, a) / rad) + 360) % 360);
	const h1p = hue(b1, a1p);
	const h2p = hue(b2, a2p);
	const dLp = L2 - L1;
	const dCp = C2p - C1p;
	let dhp = 0;
	if (C1p * C2p !== 0) {
		dhp = h2p - h1p;
		if (dhp > 180) dhp -= 360;
		else if (dhp < -180) dhp += 360;
	}
	const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp / 2) * rad);
	const Lbp = (L1 + L2) / 2;
	const Cbp = (C1p + C2p) / 2;
	let hbp = h1p + h2p;
	if (C1p * C2p !== 0) {
		if (Math.abs(h1p - h2p) > 180) hbp = h1p + h2p < 360 ? (h1p + h2p + 360) / 2 : (h1p + h2p - 360) / 2;
		else hbp = (h1p + h2p) / 2;
	}
	const T = 1 - 0.17 * Math.cos((hbp - 30) * rad) + 0.24 * Math.cos(2 * hbp * rad) + 0.32 * Math.cos((3 * hbp + 6) * rad) - 0.2 * Math.cos((4 * hbp - 63) * rad);
	const dTheta = 30 * Math.exp(-(((hbp - 275) / 25) ** 2));
	const Rc = 2 * Math.sqrt(Cbp ** 7 / (Cbp ** 7 + 25 ** 7));
	const Sl = 1 + (0.015 * (Lbp - 50) ** 2) / Math.sqrt(20 + (Lbp - 50) ** 2);
	const Sc = 1 + 0.045 * Cbp;
	const Sh = 1 + 0.015 * Cbp * T;
	const Rt = -Math.sin(2 * dTheta * rad) * Rc;
	return Math.sqrt((dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2 + Rt * (dCp / Sc) * (dHp / Sh));
}

/** 到最近一个色值的 ΔE00；同一个颜色只算一次。 */
export function paletteMatcher(tokens) {
	const labs = tokens.map((hex) => rgbToLab(hexToRgb(hex)));
	const cache = new Map();
	return (rgb) => {
		const key = (rgb[0] << 16) | (rgb[1] << 8) | rgb[2];
		let value = cache.get(key);
		if (value === undefined) {
			const lab = rgbToLab(rgb);
			value = Math.min(...labs.map((token) => deltaE2000(lab, token)));
			cache.set(key, value);
		}
		return value;
	};
}

/** DESIGN.md 前置元数据里的色值、字号、字体和间距单位。 */
export function readStyle(designFile) {
	const groups = frontMatterGroups(readFileSync(designFile, "utf8"));
	const colors = Object.values(groups.colors ?? {}).filter((value) => /^#[0-9a-f]{3,8}$/i.test(value));
	const typography = Object.values(groups.typography ?? {});
	const sizes = [...new Set(typography.map((style) => Number.parseFloat(style.fontSize)).filter(Number.isFinite))].sort((a, b) => a - b);
	const fonts = [...new Set(typography.map((style) => String(style.fontFamily ?? "").replace(/["']/g, "").trim()).filter(Boolean))];
	const unit = Number.parseFloat(groups.spacing?.unit) || 8;
	if (!colors.length || !sizes.length) throw new Error(`${designFile} 的前置元数据里没有 colors 或 typography`);
	return { colors, sizes, fonts, unit };
}

/** content.md 里要出现的文字：去掉标题行和引用行；长段按句号切开，按句算覆盖。 */
export function contentPieces(contentFile) {
	return readFileSync(contentFile, "utf8")
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line && !line.startsWith("#") && !line.startsWith(">"))
		.flatMap((line) => line.split(/(?<=[。！？；])/))
		.map((piece) => piece.replace(/\s+/g, ""))
		.filter(Boolean);
}

// ---------- 交付物的静态检查 ----------

// 自包含：除了 data:、blob:、页内锚点以外，不引用任何 URL 或文件
export function externalReferences(source) {
	const refs = [];
	const add = (value) => {
		const ref = value.trim().replace(/^["']|["']$/g, "");
		if (!ref || /^(data:|blob:|#|about:|javascript:)/i.test(ref)) return;
		refs.push(ref);
	};
	for (const match of source.matchAll(/\b(?:src|href|xlink:href|poster|srcset|action)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi)) add(match[1]);
	for (const match of source.matchAll(/url\(\s*("[^"]*"|'[^']*'|[^)]*)\)/gi)) add(match[1]);
	for (const match of source.matchAll(/@import\s+("[^"]*"|'[^']*')/gi)) add(match[1]);
	return refs;
}

/** 静态读 SVG 根元素的 width、height、viewBox，判断画面是不是声明的尺寸（或同比例的 viewBox）。 */
export function svgSize(source, width, height) {
	const root = /<svg\b[^>]*>/i.exec(source)?.[0] ?? "";
	const attr = (name) => new RegExp(`\\s${name}\\s*=\\s*["']([^"']+)["']`, "i").exec(root)?.[1];
	const w = Number.parseFloat(attr("width"));
	const h = Number.parseFloat(attr("height"));
	if (Number.isFinite(w) && Number.isFinite(h) && !/%/.test(`${attr("width")}${attr("height")}`)) return Math.abs(w - width) <= 1 && Math.abs(h - height) <= 1;
	const box = (attr("viewBox") ?? "").split(/[\s,]+/).map(Number);
	return box.length === 4 && box[2] > 0 && Math.abs(box[2] / box[3] - width / height) <= 0.01 * (width / height);
}

// 页面里要量的东西，在页面里跑（puppeteer 按源码传过去，所以自成一体）
function pageFacts() {
	const chainVisible = (element) => {
		let opacity = 1;
		for (let node = element; node && node.nodeType === 1; node = node.parentElement) {
			const style = getComputedStyle(node);
			if (style.display === "none" || style.visibility === "hidden") return false;
			opacity *= Number(style.opacity);
		}
		return opacity > 0.05;
	};
	const scaleOf = (element) => {
		if (typeof SVGGraphicsElement !== "undefined" && element instanceof SVGGraphicsElement && element.getScreenCTM) {
			const matrix = element.getScreenCTM();
			if (matrix) return Math.hypot(matrix.a, matrix.b);
		}
		return 1;
	};
	const skip = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "TITLE", "DESC", "title", "desc", "style", "script"]);
	const texts = [];
	const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
	const seen = new Set();
	let joined = "";
	for (let node = walker.nextNode(); node; node = walker.nextNode()) {
		const element = node.parentElement;
		if (!element || skip.has(element.tagName) || !node.textContent.trim()) continue;
		const rect = element.getBoundingClientRect();
		if (rect.width <= 0 || rect.height <= 0 || !chainVisible(element)) continue;
		joined += node.textContent;
		const own = node.textContent.replace(/\s+/g, "").length;
		if (seen.has(element)) {
			texts.find((entry) => entry.element === element).chars += own;
			continue;
		}
		seen.add(element);
		const style = getComputedStyle(element);
		const svg = element.namespaceURI === "http://www.w3.org/2000/svg";
		texts.push({
			element,
			chars: own,
			text: element.textContent.trim().slice(0, 60),
			px: Number.parseFloat(style.fontSize) * scaleOf(element),
			family: style.fontFamily,
			color: svg ? style.fill : style.color,
			box: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
		});
	}
	// 装饰：没有自己文字的可见元素里，有填充、描边或边框的（HTML 方块、SVG 图形）
	const decorations = [];
	const colors = [];
	for (const element of document.body.querySelectorAll("*")) {
		if (skip.has(element.tagName)) continue;
		const rect = element.getBoundingClientRect();
		if (rect.width <= 0 || rect.height <= 0 || !chainVisible(element)) continue;
		const style = getComputedStyle(element);
		const svg = element.namespaceURI === "http://www.w3.org/2000/svg";
		const ownText = [...element.childNodes].some((child) => child.nodeType === 3 && child.textContent.trim());
		if (svg && ["rect", "circle", "ellipse", "line", "polyline", "polygon", "path"].includes(element.tagName)) {
			for (const paint of [style.fill, style.stroke]) if (/^rgb/.test(paint)) colors.push(paint);
			decorations.push({ w: Math.round(rect.width), h: Math.round(rect.height), paint: `${style.fill}|${style.stroke}`, tag: element.tagName });
		} else if (!svg) {
			const fill = style.backgroundColor;
			const filled = /^rgba?\(/.test(fill) && !/,\s*0\)$/.test(fill) && fill !== "rgba(0, 0, 0, 0)";
			const bordered = ["Top", "Right", "Bottom", "Left"].some((side) => style[`border${side}Style`] !== "none" && Number.parseFloat(style[`border${side}Width`]) > 0);
			if (filled) colors.push(fill);
			if (bordered) colors.push(style.borderTopColor);
			const big = rect.width >= innerWidth * 0.95 && rect.height >= innerHeight * 0.95;
			if (!ownText && element.children.length === 0 && (filled || bordered) && !big) decorations.push({ w: Math.round(rect.width), h: Math.round(rect.height), paint: `${fill}|${bordered ? style.borderTopColor : ""}`, tag: element.tagName.toLowerCase() });
		}
	}
	// 页面和正文自己的底色（纯色才算；渐变不算颜色，也不算违规）
	for (const element of [document.documentElement, document.body]) {
		const fill = getComputedStyle(element).backgroundColor;
		if (/^rgba?\(/.test(fill) && fill !== "rgba(0, 0, 0, 0)") colors.push(fill);
	}
	// 假控件：没有 href、href 是 "#" 或 javascript:、页内锚点指向不存在的 id 的链接；鼠标手型却不是链接、按钮、表单控件也没有 role 的元素
	let fakeControls = 0;
	for (const link of document.querySelectorAll("a")) {
		const href = (link.getAttribute("href") ?? "").trim();
		if (!chainVisible(link)) continue;
		if (!href || href === "#" || /^javascript:/i.test(href)) fakeControls++;
		else if (href.startsWith("#")) {
			const id = decodeURIComponent(href.slice(1));
			if (!document.getElementById(id) && !document.getElementsByName(id).length) fakeControls++;
		}
	}
	for (const element of document.body.querySelectorAll("div, span, li, p, img, svg")) {
		if (!chainVisible(element) || element.closest("a, button, input, select, textarea, label, [role]")) continue;
		if (getComputedStyle(element).cursor === "pointer" && !(element.parentElement && getComputedStyle(element.parentElement).cursor === "pointer")) fakeControls++;
	}
	return {
		texts: texts.map(({ element, ...rest }) => rest),
		decorations,
		colors,
		joined: joined.replace(/\s+/g, ""),
		scroll: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
		fakeControls,
	};
}

// 页面的字体和前两帧落定（同 interaction-capture-core 的 settleForAudit）
async function settle() {
	await document.fonts.ready;
	await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

const PAUSE_MOTION = "*,*::before,*::after{animation-play-state:paused!important;animation-delay:0s!important;transition:none!important}";

export function browserTools() {
	const puppeteerModule = process.env.DESIGN_PIPELINE_PUPPETEER_MODULE ?? require.resolve("puppeteer-core", { paths: [REPO] });
	return { puppeteer: resolvePuppeteer(REPO, puppeteerModule), executablePath: resolveBrowser() };
}

/**
 * 在固定尺寸下渲染交付物：截图、页面审计、文字与色块、减弱动态下的可见文字。
 * SVG 内联进一个只有它的 HTML 页面里量（SVG 文档没有 body，审计和文字提取都要 HTML）。
 * 交付物先复制进 <captureDir>/page/，相对路径的引用因此都落空，会作为请求被记下来。
 */
export async function render(file, { width, height, minFontPx, captureDir }) {
	const page = join(captureDir, "page");
	mkdirSync(page, { recursive: true });
	const source = readFileSync(file, "utf8");
	const index = join(page, "index.html");
	if (file.endsWith(".svg")) {
		copyFileSync(file, join(page, basename(file)));
		const inline = source.replace(/<\?xml[^>]*\?>/gi, "").replace(/<!DOCTYPE[^>]*>/gi, "");
		writeFileSync(index, `<!DOCTYPE html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:#fff}svg{display:block;width:${width}px;height:${height}px}</style></head><body>${inline}</body></html>`);
	} else copyFileSync(file, index);
	const url = pathToFileURL(index).href;
	const { puppeteer, executablePath } = browserTools();
	const browser = await puppeteer.launch({ executablePath, headless: true, args: ["--allow-file-access-from-files", "--disable-background-timer-throttling", "--disable-renderer-backgrounding"] });
	try {
		const tab = await browser.newPage();
		await tab.setViewport({ width, height, deviceScaleFactor: 1 });
		const requests = [];
		tab.on("request", (request) => {
			if (!/^(data|blob|about):/i.test(request.url())) requests.push(request.url());
		});
		await tab.goto(url, { waitUntil: "networkidle0", timeout: 30000 });
		await tab.evaluate(settle);
		await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
		const png = await tab.screenshot({ type: "png" });
		writeFileSync(join(captureDir, "screenshot.png"), png);
		const elements = await tab.evaluate(extract);
		const options = auditOptions({ thresholds: { minFontPx } });
		const audit = await tab.evaluate(auditPage, options);
		const facts = await tab.evaluate(pageFacts);
		const loadRequests = requests.slice();

		// 减弱动态、动画停在第一帧：主要内容这时也要看得见
		const still = await browser.newPage();
		await still.setViewport({ width, height, deviceScaleFactor: 1 });
		await still.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
		await still.evaluateOnNewDocument((css) => {
			document.addEventListener("DOMContentLoaded", () => {
				const style = document.createElement("style");
				style.textContent = css;
				document.head.append(style);
			});
		}, PAUSE_MOTION);
		await still.goto(url, { waitUntil: "load", timeout: 30000 });
		await still.evaluate(settle);
		const stillFacts = await still.evaluate(pageFacts);

		const summary = summarizeAudit("ablation", [{ viewport: { width, height }, result: audit, requests: loadRequests }], page, loadRequests);
		return { png, elements, audit: summary, facts, stillJoined: stillFacts.joined, requests: loadRequests.filter((entry) => entry !== url), source };
	} finally {
		await browser.close();
	}
}

// ---------- 节律 ----------

const cluster = (values, tolerance) => {
	const sorted = [...values].sort((a, b) => a - b);
	const groups = [];
	for (const value of sorted) {
		if (groups.length && value - groups.at(-1).at(-1) <= tolerance) groups.at(-1).push(value);
		else groups.push([value]);
	}
	return groups;
};

/**
 * 节律的代理量：都是量出来的几何事实，不是审美判断。
 * - 间距：纵向相邻、不重叠的文字块之间的空隙，落在间距单位整数倍 ±1px 上的比例，以及不同空隙值有几种。
 * - 字号比：最大字号以下的各级，相邻两级之比的变异系数，越小越像一套等比字阶（不到 3 级不算）；最大的展示字号是故意的大跳，不算。
 * - 左边线：文字块不同的左边线有几条（±1px 算一条），越少网格越强。
 * - 装饰重复：装饰元素按尺寸和颜色分组，属于重复组（≥2 个一样的）的比例；种类数另记。
 */
export function rhythm(texts, decorations, unit) {
	const boxes = texts.map((text) => text.box).sort((a, b) => a.y - b.y);
	const gaps = [];
	for (let i = 1; i < boxes.length; i++) {
		const above = boxes.slice(0, i).filter((box) => box.y + box.h <= boxes[i].y + 0.5 && Math.min(box.x + box.w, boxes[i].x + boxes[i].w) > Math.max(box.x, boxes[i].x));
		if (!above.length) continue;
		const nearest = Math.max(...above.map((box) => box.y + box.h));
		const gap = boxes[i].y - nearest;
		if (gap > 0.5) gaps.push(gap);
	}
	const onStep = gaps.filter((gap) => {
		const rest = gap % unit;
		return rest <= 1 || unit - rest <= 1;
	}).length;
	const sizes = cluster(texts.map((text) => text.px).filter((px) => px > 0), 0.5).map((group) => group[0]);
	// 最大的展示字号常常是故意的大跳，不算进比例的一致性：只看它以下的各级，至少要 3 级
	let ratioCv = null;
	const below = sizes.slice(0, -1);
	if (below.length >= 3) {
		const ratios = below.slice(1).map((size, index) => size / below[index]);
		const mean = ratios.reduce((sum, value) => sum + value, 0) / ratios.length;
		const sd = Math.sqrt(ratios.reduce((sum, value) => sum + (value - mean) ** 2, 0) / ratios.length);
		ratioCv = Number((sd / mean).toFixed(3));
	}
	const leftEdges = cluster(texts.map((text) => text.box.x), 1).length;
	const groups = new Map();
	for (const decoration of decorations) {
		const key = `${decoration.tag}:${decoration.w}x${decoration.h}:${decoration.paint}`;
		groups.set(key, (groups.get(key) ?? 0) + 1);
	}
	const repeated = [...groups.values()].filter((count) => count >= 2).reduce((sum, count) => sum + count, 0);
	return {
		gapCount: gaps.length,
		gapOnStep: gaps.length ? Number((onStep / gaps.length).toFixed(3)) : null,
		distinctGaps: cluster(gaps, 1).length,
		ratioCv,
		leftEdges,
		decorations: decorations.length,
		decorationKinds: groups.size,
		decorationRepeat: decorations.length ? Number((repeated / decorations.length).toFixed(3)) : null,
	};
}

// ---------- 跨次相似度的指纹 ----------

/** 截图缩成 48 宽的灰度图，文字框画成同样网格上的掩码；同一变体不同次之间拿来比相似度。 */
export function fingerprint(image, texts, width, height) {
	const cols = 48;
	const rows = Math.round((cols * height) / width);
	const gray = new Array(cols * rows).fill(0);
	const counts = new Array(cols * rows).fill(0);
	for (let y = 0; y < image.height; y++) {
		const row = Math.min(rows - 1, Math.floor((y * rows) / image.height));
		for (let x = 0; x < image.width; x++) {
			const col = Math.min(cols - 1, Math.floor((x * cols) / image.width));
			const i = (y * image.width + x) * 4;
			gray[row * cols + col] += 0.2126 * image.data[i] + 0.7152 * image.data[i + 1] + 0.0722 * image.data[i + 2];
			counts[row * cols + col]++;
		}
	}
	const mask = new Array(cols * rows).fill(0);
	for (const { box } of texts) {
		for (let row = Math.max(0, Math.floor((box.y / height) * rows)); row < Math.min(rows, Math.ceil(((box.y + box.h) / height) * rows)); row++)
			for (let col = Math.max(0, Math.floor((box.x / width) * cols)); col < Math.min(cols, Math.ceil(((box.x + box.w) / width) * cols)); col++) mask[row * cols + col] = 1;
	}
	return { cols, rows, gray: gray.map((sum, i) => Math.round(sum / Math.max(1, counts[i]))), mask };
}

// 文字掩码向四周各扩一格，几像素的挪动不至于让同一个版式看起来完全不同
function dilate(mask, cols, rows) {
	const out = new Array(mask.length).fill(0);
	for (let row = 0; row < rows; row++)
		for (let col = 0; col < cols; col++) {
			if (!mask[row * cols + col]) continue;
			for (let dy = -1; dy <= 1; dy++)
				for (let dx = -1; dx <= 1; dx++) {
					const y = row + dy;
					const x = col + dx;
					if (y >= 0 && y < rows && x >= 0 && x < cols) out[y * cols + x] = 1;
				}
		}
	return out;
}

/**
 * 两张指纹的结构相似度（文字布局掩码扩一格后的 Jaccard）和像素相似度（1 − 灰度平均差/255）。
 * 判“一个模子”只看结构：换色、换底纹不改结构，换版式才改。
 */
export function similarity(a, b) {
	if (a.cols !== b.cols || a.rows !== b.rows) return { pixel: 0, structure: 0 };
	let diff = 0;
	for (let i = 0; i < a.gray.length; i++) diff += Math.abs(a.gray[i] - b.gray[i]);
	const left = dilate(a.mask, a.cols, a.rows);
	const right = dilate(b.mask, b.cols, b.rows);
	let both = 0;
	let either = 0;
	for (let i = 0; i < left.length; i++) {
		both += left[i] & right[i];
		either += left[i] | right[i];
	}
	return { pixel: Number((1 - diff / a.gray.length / 255).toFixed(4)), structure: Number((either ? both / either : 1).toFixed(4)) };
}

/** 字号分级：±0.5px 算一级。返回从小到大的各级字号，以及每级的字数。 */
export function typeLevels(texts) {
	const levels = [];
	for (const text of [...texts].sort((a, b) => a.px - b.px)) {
		const last = levels.at(-1);
		if (last && text.px - last.px <= 0.5) last.chars += text.chars ?? text.text.length;
		else levels.push({ px: text.px, chars: text.chars ?? text.text.length });
	}
	return levels;
}

/**
 * 层级下限：至少 3 级字号，标题（最大一级）对正文（字数最多的一级）至少 2.5 倍。
 * 返回级数、标题对正文之比和没满足的条数（0 到 2）。
 */
export function hierarchy(texts, floor) {
	const levels = typeLevels(texts);
	if (!levels.length) return { typeLevels: 0, titleBodyRatio: null, hierarchyFails: floor ? 2 : 0 };
	const body = levels.reduce((best, level) => (level.chars > best.chars ? level : best));
	const ratio = levels.at(-1).px / body.px;
	const fails = floor ? Number(levels.length < floor.levels) + Number(ratio < floor.ratio) : 0;
	return { typeLevels: levels.length, titleBodyRatio: Number(ratio.toFixed(2)), hierarchyFails: fails };
}

// 颜色按 ΔE00 ≤ 5 聚成几种
function colourClusters(rgbs) {
	const labs = [];
	for (const rgb of rgbs) {
		const lab = rgbToLab(rgb);
		if (!labs.some((seen) => deltaE2000(seen, lab) <= DELTA_E)) labs.push(lab);
	}
	return labs.length;
}

/** 关键文字有没有落在安全区里（双比例裁切的交集）：返回落在区外的关键文字条数。 */
export function safeZoneViolations(texts, zone, keys) {
	if (!zone || !keys?.length) return 0;
	const norm = (value) => value.replace(/\s+/g, "");
	let outside = 0;
	for (const key of keys) {
		const boxes = texts.filter((text) => norm(text.text).includes(norm(key)) || (norm(text.text).length >= 2 && norm(key).includes(norm(text.text))));
		if (!boxes.length) continue;
		if (boxes.some(({ box }) => box.x < zone.x0 - 0.5 || box.y < zone.y0 - 0.5 || box.x + box.w > zone.x1 + 0.5 || box.y + box.h > zone.y1 + 0.5)) outside++;
	}
	return outside;
}

/**
 * 从截图和页面事实算出全部量出来的分项。style 为 null 时是没有预设风格的开放场景：色值和字阶改量“自己用得是否收敛”。
 * 色值贴合只看文字、边框和纯色填充的颜色（渐变、发光不算颜色，也不算违规）；截图像素的比例只报告，不进分。
 */
export function measureRender(rendered, { style, pieces, width, height, minFontPx, profile, controls, floor, safeZone, keyPieces }) {
	const image = decodePng(rendered.png);
	const parseRgb = (value) => (/rgba?\(([^)]+)\)/.exec(value)?.[1].split(/[\s,/]+/).filter(Boolean).map(Number) ?? null);
	const painted = [...rendered.facts.texts.map((text) => text.color), ...rendered.facts.colors].map(parseRgb).filter((rgb) => rgb && (rgb.length < 4 || rgb[3] > 0.05)).map((rgb) => rgb.slice(0, 3));
	const texts = rendered.facts.texts;
	let palettePixels = null;
	let paletteElements = null;
	let typeScale = null;
	let declaredFonts = null;
	if (style) {
		const near = paletteMatcher(style.colors);
		let within = 0;
		for (let i = 0; i < image.width * image.height; i++) if (near([image.data[i * 4], image.data[i * 4 + 1], image.data[i * 4 + 2]]) <= DELTA_E) within++;
		palettePixels = Number((within / (image.width * image.height)).toFixed(4));
		paletteElements = painted.length ? Number((painted.filter((rgb) => near(rgb) <= DELTA_E).length / painted.length).toFixed(4)) : null;
		typeScale = texts.length ? Number((texts.filter((text) => style.sizes.some((size) => Math.abs(size - text.px) <= 0.5)).length / texts.length).toFixed(4)) : null;
		declaredFonts = texts.length ? Number((texts.filter((text) => style.fonts.some((font) => text.family.split(",")[0].replace(/["']/g, "").trim().toLowerCase() === font.toLowerCase())).length / texts.length).toFixed(4)) : null;
	}
	const minFont = texts.length ? Math.min(...texts.map((text) => text.px)) : null;
	const belowMinFont = texts.filter((text) => text.px < minFontPx - 0.05).length;

	const failed = (code) => rendered.audit.coverage.flatMap((entry) => entry.checks).filter((check) => check.code === code).reduce((sum, check) => sum + check.failed, 0);
	const composition = checkComposition(image, { profile, elements: rendered.elements });
	const offCanvas = composition.findings.filter((finding) => finding.code === "text-off-canvas").length;
	const pageOverflow = Number(rendered.facts.scroll.width > width + 1 || rendered.facts.scroll.height > height + 1);
	const overflow = failed("audit.horizontal-overflow") + failed("audit.viewport-bounds") + failed("audit.content-clipping") + offCanvas + pageOverflow;
	const contrastFails = failed("audit.text-contrast");
	const compositionErrors = composition.findings.filter((finding) => finding.severity === "error" && ["blank-frame", "low-contrast"].includes(finding.code)).length;

	const covered = pieces.filter((piece) => rendered.facts.joined.includes(piece)).length;
	const hiddenWithoutMotion = pieces.filter((piece) => rendered.facts.joined.includes(piece) && !rendered.stillJoined.includes(piece)).length;
	const fakeControls = controls ? rendered.facts.fakeControls : 0;

	return {
		image,
		values: {
			palettePixels,
			paletteElements,
			typeScale,
			declaredFonts,
			colourKinds: colourClusters(painted),
			sizeKinds: typeLevels(texts).length,
			minFont: minFont === null ? null : Number(minFont.toFixed(2)),
			belowMinFont,
			...hierarchy(texts, floor),
			overflow,
			safeZoneViolations: safeZoneViolations(texts, safeZone, keyPieces),
			contrastFails,
			compositionErrors,
			compositionCodes: [...new Set(composition.findings.map((finding) => finding.code))],
			contentCoverage: pieces.length ? Number((covered / pieces.length).toFixed(4)) : 1,
			hiddenWithoutMotion,
			fakeControls,
			antiSlopHard: hiddenWithoutMotion + fakeControls,
			...rhythm(texts, rendered.facts.decorations, style?.unit ?? 8),
		},
		fingerprint: fingerprint(image, texts, width, height),
	};
}
