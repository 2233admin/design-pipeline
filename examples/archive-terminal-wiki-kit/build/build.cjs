#!/usr/bin/env node
"use strict";

// Regenerates the kit's generated files from build/*.cjs and design-system/tokens.json:
//   templates/*.html, templates/tokens.css, design-system/components/*/preview.html.
// Hand-written files (bundle.css, kit.js, every README) are never touched.
//   node examples/archive-terminal-wiki-kit/build/build.cjs           write
//   node examples/archive-terminal-wiki-kit/build/build.cjs --check   exit 1 when a file is stale

const fs = require("node:fs");
const path = require("node:path");
const { compileTokensCss } = require("../../../skill/scripts/design-system-package-core.cjs");
const P = require("./parts.cjs");
const pages = require("./pages.cjs");
const D = require("./data.cjs");
const { inline: ic } = require("./icons.cjs");

const KIT = path.resolve(__dirname, "..");
const COMP = path.join(KIT, "design-system", "components");

function preview(group, height, title, sections) {
  const body = sections.map(([label, html]) => ["light", "dark"].map((theme) => `<section class="at-demo" data-theme="${theme}"><p class="at-demo__label">${P.esc(label)} · ${theme}</p>\n${typeof html === "function" ? html(theme) : html}\n</section>`).join("\n")).join("\n");
  return `<!-- @dsCard group="${group}" height=${height} -->
<!doctype html>
<html lang="zh-CN">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${P.esc(title)}</title></head>
<body class="at-page">
${body}
</body>
</html>
`;
}

const row = (...items) => `<div class="at-demo__row">${items.join("")}</div>`;
const stars = (n) => P.stars(ic, n);

const PREVIEWS = {
  TopBar: () => preview("Shell", 260, "Top bar", [["top bar with search, icon actions and login", P.topbar(ic).replace(/id="q"/g, "id=\"q-demo\"")]]),
  SideNav: () => preview("Shell", 2100, "Side nav", [["expanded, current page and a live entry", (t) => `<div style="display: flex; gap: var(--space-6); align-items: flex-start"><div style="width: var(--sidebar-w); height: 1000px; display: flex">${P.sidenav(ic, "agents").replace('<aside class="at-sidenav"', '<aside class="at-sidenav" style="position: static; height: 100%"').replace(/id="(nav-[a-z]+(?:-list)?|sidenav)"/g, `id="$1-${t}"`).replace(/aria-(controls|labelledby)="(nav-[a-z]+(?:-list)?)"/g, `aria-$1="$2-${t}"`)}</div><div data-nav="collapsed" style="width: var(--sidebar-w-collapsed); height: 1000px; display: flex">${P.sidenav(ic, "agents").replace('<aside class="at-sidenav"', '<aside class="at-sidenav" style="position: static; height: 100%"').replace(/id="(nav-[a-z]+(?:-list)?|sidenav)"/g, `id="$1-${t}c"`).replace(/aria-(controls|labelledby)="(nav-[a-z]+(?:-list)?)"/g, `aria-$1="$2-${t}c"`).replace('aria-pressed="false"', 'aria-pressed="true"')}</div></div>`]]),
  ArchiveHero: () => preview("Home", 520, "Archive hero", [["hero: corner brackets, dot grid, title, counters with mini bars (showcase: no characters)", P.hero(ic, { showcase: true }).replace(/id="(hero-[a-z]+)"/g, 'id="$1-x"').replace(/aria-labelledby="(hero-[a-z]+)"/g, 'aria-labelledby="$1-x"')]]),
  SectionHeader: () => preview("Content", 260, "Section header", [["home section header and wiki section title", `${P.sechead("内容入口", "Contents", "全部分类")}${P.sechead("游戏动态", "Field News", "")}${P.h2("属性", "Attributes", "demo-attrs")}`]]),
  NewsFeed: () => preview("Home", 460, "News feed", [["lead item, dated list, NEW chip, thumbnail slot", P.feed(ic, { showcase: true }).replace('id="feed-h"', 'id="feed-h-x"').replace('aria-labelledby="feed-h"', 'aria-labelledby="feed-h-x"')]]),
  CategoryTiles: () => preview("Home", 420, "Category tiles", [["rest, hover (forced) and a live flag", P.tiles(ic, { list: D.TILES.slice(0, 6).concat([D.TILES[8]]), more: false }).replace('class="at-tile" href="list.html"', 'class="at-tile is-hover" href="list.html"').replace('id="tiles-h"', 'id="tiles-h-x"').replace('aria-labelledby="tiles-h"', 'aria-labelledby="tiles-h-x"')]]),
  EntityCard: () => preview("Content", 460, "Entity card", [["portrait and arms cards: rarity 6 to 3, flags, hover (forced); showcase slots carry no characters", `<ul class="at-cards">${[D.AGENTS[0], D.AGENTS[2], D.AGENTS[5]].map((a) => P.card(ic, a, { showcase: true })).join("")}${[D.ARMS[0], D.ARMS[9]].map((a) => P.card(ic, a, { kind: "arms", showcase: true })).join("")}</ul>`.replace('class="at-card"', 'class="at-card is-hover"')]]),
  Infobox: () => preview("Content", 820, "Infobox", [["entity hero panel and item infobox", `<section class="at-entity" style="--rarity: var(--rarity-6)"><div class="at-entity__art">${P.slot({ label: "立绘", en: "Portrait", size: "1200×1600", safe: "6% 10%" })}</div><div class="at-entity__info"><div class="at-entity__top"><span class="at-chip at-chip--stamp">Agent</span>${P.stars(ic, 6, { lg: true })}</div><h3 class="at-entity__name"><span class="title-entity">白砾</span><span class="at-entity__glyph">${ic("arms", "at-icon at-icon--sm")}</span></h3><p class="at-entity__code">Gravel</p><dl class="at-kv"><div><dt>阵营</dt><dd>北港工会</dd></div><div><dt>职能</dt><dd>先锋 VANGUARD</dd></div><div><dt>武装</dt><dd>长柄</dd></div><div><dt>生日</dt><dd>1月9日</dd></div></dl><p class="at-entity__bio">北港工会的破冰队长，惯用一柄比她还高的长柄凿锤。</p></div></section>
<div class="at-infobox" style="--rarity: var(--rarity-5); margin-top: var(--space-5)"><div class="at-infobox__head">${P.slot({ label: "图标", en: "Icon", size: "512×512", cls: "at-infobox__icon", bare: true })}<div><h3 class="at-infobox__title"><span>冷凝核心</span><span class="at-chip at-chip--accent">★ 5</span></h3><p class="at-note">Condensate Core · 珍贵物资</p></div></div><dl class="at-infobox__rows"><div><dt>类型</dt><dd>珍贵物资</dd></div><div><dt>堆叠上限</dt><dd class="at-num">999</dd></div><div><dt>获取方式</dt><dd><span class="at-tag">补给站 · 每周兑换</span></dd></div></dl></div>`]]),
  DataTable: () => preview("Data", 520, "Data table", [["sortable header (one column sorted), rarity bars, numeric columns", `<div class="at-tablewrap"><table class="at-table"><caption>武装一览</caption><thead><tr><th scope="col"><button class="at-sort" type="button">名称${ic("sort", "at-icon at-icon--sm")}</button></th><th scope="col" aria-sort="descending"><button class="at-sort" type="button">稀有度${ic("sort", "at-icon at-icon--sm")}</button></th><th scope="col"><button class="at-sort" type="button">类型${ic("sort", "at-icon at-icon--sm")}</button></th><th scope="col" class="is-num"><button class="at-sort" type="button">基础攻击${ic("sort", "at-icon at-icon--sm")}</button></th></tr></thead><tbody>${D.ARMS.filter((_, i) => i % 3 === 0).map((a) => `<tr class="at-row" data-rarity="${a.rarity}"><td><span class="at-itemcell">${P.slot({ label: "图标", en: "Icon", size: "128×128", bare: true })}<span>${a.zh}</span></span></td><td>${stars(a.rarity)}</td><td>${a.type}</td><td class="is-num">${a.atk}</td></tr>`).join("")}</tbody></table></div>`]]),
  Tabs: () => preview("Data", 300, "Tabs", [["bilingual tabs (selected, hover forced, disabled) and the segmented stage picker", `<div class="at-tabs__list" role="tablist" aria-label="技能"><button class="at-tab" role="tab" type="button" aria-selected="true">破冰连击<small>Basic</small></button><button class="at-tab is-hover" role="tab" type="button" aria-selected="false" tabindex="-1">冻线凿击<small>Skill</small></button><button class="at-tab" role="tab" type="button" aria-selected="false" tabindex="-1">冰川断层<small>Ultimate</small></button><button class="at-tab" role="tab" type="button" aria-selected="false" tabindex="-1" disabled>天赋<small>Locked</small></button></div><div style="margin-top: var(--space-4)" class="at-seg" role="tablist" aria-label="突破阶段">${[0, 1, 2, 3, 4].map((i) => `<button class="at-tab" role="tab" type="button" aria-selected="${i === 4}" tabindex="${i === 4 ? 0 : -1}">${i}</button>`).join("")}</div>`]]),
  Badges: () => preview("Content", 300, "Badges, tags and rarity", [["chips, tags, stamps and rarity stars 1 to 6", `${row('<span class="at-chip at-chip--accent">最新</span>', '<span class="at-chip at-chip--live">进行中</span>', '<span class="at-chip">草稿</span>', '<span class="at-chip at-chip--outline at-chip--mono">v2.4.0</span>', '<span class="at-chip at-chip--stamp">Agent</span>', '<span class="at-tag">长柄</span>', '<span class="at-tag at-tag--warm">限时委托</span>')}${row(...[1, 2, 3, 4, 5, 6].map((n) => `<span class="at-card" data-rarity="${n}" style="padding: 4px 8px; box-shadow: none; background: transparent">${stars(n)}</span>`))}`]]),
  Buttons: () => preview("Controls", 360, "Buttons", [["primary dark, accent, ghost, tool and icon buttons in rest, hover, active, focus, disabled and loading", `${row('<button class="at-btn" type="button">知道了</button>', '<button class="at-btn is-hover" type="button">悬停</button>', '<button class="at-btn is-active" type="button">按下</button>', '<button class="at-btn is-focus" type="button">焦点</button>', '<button class="at-btn" type="button" disabled>不可用</button>', '<button class="at-btn" type="button" aria-busy="true">提交</button>')}${row('<button class="at-btn at-btn--accent" type="button">检索</button>', '<button class="at-btn at-btn--accent is-hover" type="button">悬停</button>', '<button class="at-btn at-btn--accent" type="button" aria-busy="true">检索</button>', `<a class="at-btn at-btn--ghost at-btn--lg" href="#">${ic("compass", "at-icon at-icon--sm")}浏览档案${ic("chevronRight", "at-icon at-icon--sm at-btn__go")}</a>`, '<button class="at-btn at-btn--ghost" type="button" disabled>登录后发言</button>')}${row(`<button class="at-btn at-btn--tool" type="button">${ic("link", "at-icon at-icon--sm")}复制链接</button>`, `<button class="at-btn at-btn--tool is-hover" type="button">${ic("history", "at-icon at-icon--sm")}历史</button>`, `<button class="at-iconbtn" type="button" aria-label="主题">${ic("monitor")}</button>`, `<button class="at-iconbtn is-hover" type="button" aria-label="随机">${ic("shuffle")}</button>`, `<button class="at-iconbtn at-iconbtn--accent" type="button" aria-label="公告">${ic("notice")}<span class="at-iconbtn__dot"></span></button>`, `<button class="at-iconbtn is-focus" type="button" aria-label="帮助">${ic("help")}</button>`)}`]]),
  SearchField: () => preview("Controls", 340, "Search field", [["rest with / and ⌘K hints, focused with suggestions, large search page field", (t) => `${P.search(ic, { id: `qa-${t}` })}<div style="height: var(--space-4)"></div><div style="padding-bottom: 120px">${P.search(ic, { id: `qb-${t}`, value: "白" }).replace('class="at-search"', 'class="at-search is-focus"').replace('hidden></ul>', `><li role="presentation"><a role="option" href="#" aria-selected="true" id="qb-${t}-0">白砾<small>Agents</small></a></li><li role="presentation"><a role="option" href="#" aria-selected="false" id="qb-${t}-1">白鲸湾<small>Map</small></a></li></ul>`)}</div>${P.search(ic, { id: `qc-${t}`, large: true, value: "冷凝", goLabel: "检索" })}`]]),
  VersionNotice: () => preview("Overlays", 900, "Version notice modal", [["modal: title bar, yellow close tile, accent bar, striped body, signal stripe", (t) => `<div style="padding: var(--space-5); background: var(--scrim-fill)">${P.modal(ic, { id: `notice-${t}`, staticOpen: true })}</div>`]]),
  Toast: () => preview("Overlays", 380, "Toast and loading", [["loading guide, success, error; skeleton lines", (t) => `<ul class="at-toasts at-toasts--static">${P.toast(ic)}${P.toast(ic, { kind: "ok", text: "链接已复制" })}${P.toast(ic, { kind: "error", text: "同步失败，稍后重试" })}</ul><div style="margin-top: var(--space-4); max-width: 360px"><div class="at-skel at-skel--line" style="width: 70%"></div><div class="at-skel at-skel--line"></div><div class="at-skel at-skel--line" style="width: 45%"></div></div>`]]),
  Pagination: () => preview("Controls", 200, "Pagination", [["first-page and middle-page states", `${P.pager(ic, { current: 1, total: 4 }).replace('<a href="#" aria-label="上一页">', '<a href="#" aria-label="上一页" aria-disabled="true">')}<div style="height: var(--space-3)"></div>${P.pager(ic, { current: 2, total: 9 })}`]]),
  Breadcrumbs: () => preview("Shell", 300, "Breadcrumbs and page head", [["breadcrumbs, page title, toolbar and edit meta", P.pagehead(ic, { trail: [["物资", "#"], ["珍贵物资", "#"], ["冷凝核心", ""]], title: "冷凝核心" })]]),
  EmptyState: () => preview("Content", 520, "Empty state", [["block and inline empty states", `${P.empty(ic, { zh: "没有符合条件的武装", en: "No Matching Arms", text: "换一个稀有度或类型试试，或者清空全部筛选。", icon: "filter", action: '<button class="at-btn at-btn--accent" type="button">清空筛选</button>' })}<div style="height: var(--space-4)"></div>${P.empty(ic, { zh: "还没有人讨论", en: "No Discussion Yet", icon: "help", inline: true })}`]]),
  FilterBar: () => preview("Data", 360, "Filter bar", [["striped filter panel with toggle chips (selected, hover forced, disabled)", `<section class="at-filters"><div class="at-filters__head"><div><p class="at-filters__code">// arms index</p><h3 class="at-filters__title">武装情报</h3></div><div class="at-filters__tools"><button class="at-btn at-btn--tool" type="button">${ic("reset", "at-icon at-icon--sm")}重置</button></div></div><div class="at-filters__row"><span class="at-filters__label">稀有度</span><div class="at-filters__opts"><button class="at-toggle" type="button" aria-pressed="true">全部</button><button class="at-toggle is-hover" type="button" aria-pressed="false">6★</button><button class="at-toggle" type="button" aria-pressed="false">5★</button><button class="at-toggle" type="button" aria-pressed="false" disabled>2★</button></div></div><div class="at-filters__row"><span class="at-filters__label">类型</span><div class="at-filters__opts">${["全部", "长柄", "单刃", "射装", "法匣"].map((x, i) => `<button class="at-toggle" type="button" aria-pressed="${i === 2}">${x}</button>`).join("")}</div></div></section>`]]),
  ArtSlot: () => preview("Content", 420, "Art slot", [["placeholder frames: portrait 3:4 with safe area, banner 16:9, icon 1:1", `<div class="at-demo__row" style="align-items: flex-start">${P.slot({ label: "立绘", en: "Portrait", size: "1200×1600", task: "agent-gravel", safe: "6% 10%", cls: "" }).replace('class="at-slot ', 'style="width: 180px; aspect-ratio: 3 / 4" class="at-slot ')}${P.slot({ label: "活动横幅", en: "Banner", size: "1600×900", task: "banner-polar-night", safe: "6% 8%" }).replace('class="at-slot ', 'style="width: 320px; aspect-ratio: 16 / 9" class="at-slot ')}${P.slot({ label: "图标", en: "Icon", size: "512×512", task: "item-condensate-core", safe: "12%" }).replace('class="at-slot ', 'style="width: 120px; aspect-ratio: 1" class="at-slot ')}</div>`]]),
  RecentChanges: () => preview("Data", 340, "Recent changes rows", [["day header, new / edit / minor rows, byte deltas", `<h3 class="at-changes__day">2041-03-18 星期一<span class="at-count">3 条</span></h3><ol class="at-changes__list"><li class="at-change"><span class="at-change__time">21:04</span><span class="at-change__kind" title="编辑">编</span><div><span class="at-change__title"><a class="at-link" href="#">调查员/白砾</a><small><a href="#">历史</a> · <a href="#">差异</a></small></span><span class="at-change__sum">“补全技能倍率表”</span></div><span class="at-change__side"><span class="at-delta--add">+2,310</span><span>霜鸦</span></span></li><li class="at-change"><span class="at-change__time">20:51</span><span class="at-change__kind at-change__kind--new" title="新建">新</span><div><span class="at-change__title"><a class="at-link" href="#">物资/冷凝核心</a></span><span class="at-change__sum">“新建条目”</span></div><span class="at-change__side"><span class="at-delta--add">+1,840</span><span>北港小卒</span></span></li><li class="at-change"><span class="at-change__time">18:12</span><span class="at-change__kind at-change__kind--minor" title="小修改">微</span><div><span class="at-change__title"><a class="at-link" href="#">事件/极夜远征</a></span><span class="at-change__sum">“修正开放时间”</span></div><span class="at-change__side"><span class="at-delta--del">−12</span><span>霜鸦</span></span></li></ol>`]]),
  Footer: () => preview("Shell", 320, "Footer", [["welcome card, links, licence line, build stamp", P.footer(ic)]]),
};

// Cover: name and tagline bottom-left; right of x = 480 the palette blocks (accent largest) and a dot grid at dot-step.
function cover() {
  const dots = [];
  for (let y = 0; y < 5; y++) for (let x = 0; x < 15; x++) dots.push(`<circle class="cv-dot" cx="${14 + x * 28}" cy="${14 + y * 28}" r="5"/>`);
  return `<!-- @dsCard height=288 -->
<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Archive Terminal</title>
<style>
  .cv { position: relative; width: 960px; height: 288px; background: var(--paper); color: var(--ink); font-family: var(--font-sans); overflow: hidden; }
  .cv-text { position: absolute; left: 40px; bottom: 36px; width: 420px; }
  .cv-name { margin: 0; font-family: var(--font-display); font-size: 60px; line-height: 1; font-weight: 900; letter-spacing: -0.06em; }
  .cv-tag { margin: 12px 0 0; color: var(--ink-muted); font-size: 14px; line-height: 20px; }
  .cv-art { position: absolute; left: 500px; top: 16px; }
  .cv-accent { fill: var(--accent); }
  .cv-inverse { fill: var(--inverse); }
  .cv-panel { fill: var(--panel); }
  .cv-magenta { fill: var(--signal-magenta); }
  .cv-teal { fill: var(--signal-teal); }
  .cv-dot { fill: var(--dot); }
</style></head>
<body style="margin: 0">
<!-- Derivation: blocks from tokens — accent (largest, 248x136, the colour the system is known by), inverse
     (136x88, primary buttons and stamps), panel (112x88, raised surfaces), signal-magenta and signal-teal as
     two thin 3px strip segments (size signal-strip), the only state-free secondary colours. Arrangement:
     accent block with the top-right corner cut by the chamfer step (9px scaled x2 = 18), inverse below-left,
     panel below-right; pattern: dot grid at dot-step 28 with dot-size 10 (the system is gridded: hero dot
     grid and 40px page grid), five rows by fifteen columns, behind the blocks. Radii: radius-none. -->
<div class="cv">
  <div class="cv-text"><h1 class="cv-name">Archive Terminal</h1><p class="cv-tag">A wiki kit in a game-terminal grammar: one yellow, chamfered panels, bilingual labels.</p></div>
  <svg class="cv-art" width="420" height="256" viewBox="0 0 420 256" aria-hidden="true">
    <g>${dots.join("")}</g>
    <polygon class="cv-accent" points="40,16 270,16 288,34 288,152 40,152"/>
    <rect class="cv-magenta" x="40" y="8" width="88" height="3"/>
    <rect class="cv-teal" x="232" y="8" width="56" height="3"/>
    <polygon class="cv-inverse" points="40,164 176,164 176,234 58,234 40,216"/>
    <rect class="cv-panel" x="188" y="164" width="112" height="88"/>
  </svg>
</div>
</body>
</html>
`;
}

function outputs() {
  const files = new Map();
  const tokens = JSON.parse(fs.readFileSync(path.join(KIT, "design-system", "tokens.json"), "utf8"));
  files.set("templates/tokens.css", compileTokensCss(tokens));
  for (const [name, fn] of Object.entries(pages)) files.set(`templates/${name === "gallery" ? "index" : name}.html`, fn());
  for (const [comp, fn] of Object.entries(PREVIEWS)) files.set(`design-system/components/${comp}/preview.html`, fn());
  files.set("design-system/components/Cover/preview.html", cover());
  return files;
}

function main() {
  const check = process.argv.includes("--check");
  const stale = [];
  for (const [rel, content] of outputs()) {
    const file = path.join(KIT, rel);
    const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
    if (current === content) continue;
    if (check) { stale.push(rel); continue; }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  if (check && stale.length) {
    console.error(`stale generated files (run node ${path.relative(process.cwd(), __filename)}): ${stale.join(", ")}`);
    process.exit(1);
  }
}

if (require.main === module) main();
module.exports = { outputs, PREVIEWS };
