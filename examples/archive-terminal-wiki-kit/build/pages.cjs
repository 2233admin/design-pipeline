"use strict";

// The seven wiki page templates, built from parts.cjs. Pages carry the icon sprite and use <use>.
const P = require("./parts.cjs");
const D = require("./data.cjs");
const { sprite, use: ic } = require("./icons.cjs");

const { esc, h2, slot, stars, card, pagehead, pager, empty } = P;

function page({ id, title, current, body, notice = false }) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · ${esc(D.SITE.zh)}</title>
<meta name="color-scheme" content="light dark">
<script>try{var t=localStorage.getItem("at-theme");var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light";if(localStorage.getItem("at-nav")==="collapsed")document.documentElement.dataset.nav="collapsed";}catch(e){}</script>
<link rel="stylesheet" href="tokens.css">
<link rel="stylesheet" href="../design-system/components/bundle.css">
<script src="kit.js" defer></script>
</head>
<body class="at-page" data-page="${id}">
<a class="at-skip" href="#main" data-bleed>跳到正文</a>
${sprite()}
${P.topbar(ic)}
<div class="at-layout">
${P.sidenav(ic, current)}
<main class="at-main" id="main" tabindex="-1">
<div class="at-main__inner">
${body}
${P.footer(ic)}
</div>
</main>
</div>
<div class="at-scrim" hidden data-scrim></div>
${P.modal(ic)}
<ul class="at-toasts" aria-live="polite" data-toasts></ul>
</body>
</html>
`;
}

// ---------- home ----------
function home() {
  return page({ id: "home", title: "首页", current: "home", notice: true, body: `<div class="at-stack">
${P.hero(ic)}
${P.feed(ic)}
${P.tiles(ic)}
</div>` });
}

// ---------- entity detail (agent) ----------
const STAGES = [
  { lv: 20, hp: 1210, atk: 88, def: 41, str: 24.5, agi: 18.0, int: 12.0, wil: 15.5 },
  { lv: 40, hp: 2240, atk: 161, def: 74, str: 46.0, agi: 33.5, int: 22.0, wil: 28.0 },
  { lv: 60, hp: 3380, atk: 236, def: 108, str: 68.5, agi: 49.0, int: 32.5, wil: 41.0 },
  { lv: 80, hp: 4560, atk: 309, def: 141, str: 90.0, agi: 64.5, int: 42.0, wil: 54.0 },
  { lv: 90, hp: 5130, atk: 344, def: 158, str: 101.5, agi: 72.0, int: 47.5, wil: 60.5 },
];
const STAT_LABELS = [["hp", "生命值"], ["atk", "攻击"], ["def", "防御"], ["str", "力量"], ["agi", "敏捷"], ["int", "智识"], ["wil", "意志"]];

function skillTable(base, step) {
  const lv = ["Lv1", "Lv2", "Lv3", "Lv4", "Lv5", "Lv6", "Lv7", "Lv8", "Lv9", "M1", "M2", "M3"];
  const rows = base.map(([name, b]) => `<tr><th scope="row"><span data-bleed>${esc(name)}</span></th>${lv.map((_, i) => `<td class="is-num" data-bleed>${Math.round(b * (1 + step * i))}%</td>`).join("")}</tr>`).join("");
  return `<div class="at-tablewrap"><table class="at-table"><caption>技能倍率（随等级）</caption><thead><tr><th scope="col"><span data-bleed>参数</span></th>${lv.map((l) => `<th scope="col" class="is-num"><span data-bleed>${l}</span></th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

function materialsTable() {
  const rows = [
    [1, "测绘胶卷", 1, 8, "主线 · 补给站"], [1, "铆钉束", 2, 5, "据点产出"], [2, "校准片", 3, 6, "委托奖励"], [2, "暖芯电池", 3, 4, "补给站兑换"],
    [3, "霜晶", 4, 5, "极夜远征"], [4, "冷凝核心", 5, 2, "活动 · 珍贵物资"], [4, "霜晶", 4, 9, "极夜远征"],
  ];
  return `<div class="at-tablewrap"><table class="at-table" data-sortable><caption>晋升材料（点击表头排序）</caption><thead><tr>
<th scope="col" aria-sort="ascending"><button class="at-sort" type="button">阶段${ic("sort", "at-icon at-icon--sm")}</button></th>
<th scope="col"><button class="at-sort" type="button">材料${ic("sort", "at-icon at-icon--sm")}</button></th>
<th scope="col"><button class="at-sort" type="button" data-type="num">稀有度${ic("sort", "at-icon at-icon--sm")}</button></th>
<th scope="col" class="is-num"><button class="at-sort" type="button" data-type="num">数量${ic("sort", "at-icon at-icon--sm")}</button></th>
<th scope="col"><span>获取</span></th></tr></thead><tbody>
${rows.map(([st, name, r, n, src]) => `<tr class="at-row" data-rarity="${r}"><td class="at-num" data-v="${st}">阶段 ${st}</td><td><a class="at-itemcell" href="item.html">${slot({ label: "图标", en: "Icon", size: "128×128", bare: true })}<span>${esc(name)}</span></a></td><td data-v="${r}">${stars(ic, r)}</td><td class="is-num" data-v="${n}">×${n}</td><td>${esc(src)}</td></tr>`).join("\n")}
</tbody></table></div>`;
}

function entity() {
  const s = STAGES[4];
  const body = `${pagehead(ic, { trail: [["调查员", "list.html"], ["白砾", ""]], title: "白砾" })}
<section class="at-entity at-reveal" style="--rarity: var(--rarity-6); margin-top: var(--space-6)" aria-labelledby="ent-name">
  <div class="at-entity__art">${slot({ label: "立绘", en: "Portrait", size: "1200×1600", task: "agent-gravel", safe: "6% 10%" })}<p class="at-entity__artmeta" aria-hidden="true"><span>调查员立绘</span><span>GRAVEL</span></p></div>
  <div class="at-entity__info">
    <div class="at-entity__top"><span class="at-chip at-chip--stamp">Agent</span>${stars(ic, 6, { lg: true })}</div>
    <h2 class="at-entity__name" id="ent-name"><span class="title-entity">白砾</span><span class="at-entity__glyph" title="长柄">${ic("arms", "at-icon at-icon--sm")}</span><span class="at-entity__glyph" title="冻结">${ic("snow", "at-icon at-icon--sm")}</span></h2>
    <p class="at-entity__code">Gravel</p>
    <dl class="at-kv">
      <div><dt>阵营</dt><dd>北港工会</dd></div><div><dt>职能</dt><dd>先锋 VANGUARD</dd></div>
      <div><dt>武装</dt><dd>长柄</dd></div><div><dt>主 / 副属性</dt><dd>力量 / 意志</dd></div>
      <div><dt>生日</dt><dd>1月9日</dd></div><div><dt>入列</dt><dd class="at-num">2041-03-15</dd></div>
      <div class="at-kv--wide"><dt>配音</dt><dd>中 · 待补全　日 · 待补全</dd></div>
    </dl>
    <p class="at-entity__bio">“冰面下面也有路，只是要先把它敲出来。”北港工会的破冰队长，惯用一柄比她还高的长柄凿锤。远征队出发前，她总是最后一个检查绳索的人。</p>
  </div>
</section>

${h2("推荐武装", "Arms", "arms")}
<ul class="at-cards">${D.ARMS.slice(0, 3).map((a) => card(ic, a, { kind: "arms" })).join("")}</ul>

${h2("属性", "Attributes", "attrs")}
<div class="at-panel" data-stages='${JSON.stringify(STAGES)}'>
  <div class="at-row-gap"><span class="at-note" id="stage-l">突破阶段</span>
    <div class="at-seg" role="tablist" aria-labelledby="stage-l" data-tabs>${STAGES.map((_, i) => `<button class="at-tab" role="tab" type="button" aria-selected="${i === 4}" tabindex="${i === 4 ? 0 : -1}" data-stage="${i}">${i}</button>`).join("")}</div>
  </div>
  <div class="at-meter"><span class="at-note">等级</span><div class="at-meter__track" aria-hidden="true"><div class="at-meter__fill" style="--v: 100%" data-stage-fill></div></div><span class="at-meter__val" data-stage-lv>Lv${s.lv}</span></div>
  <div class="at-statgrid" aria-live="polite">${STAT_LABELS.map(([k, l]) => `<div><span>${l}</span><b data-stat="${k}">${s[k]}</b></div>`).join("")}</div>
</div>

${h2("技能", "Skills", "skills")}
<div class="at-tabs">
  <div class="at-tabs__list" role="tablist" aria-label="技能" data-tabs>
    <button class="at-tab" role="tab" type="button" id="sk-1" aria-controls="skp-1" aria-selected="true">破冰连击<small>Basic</small></button>
    <button class="at-tab" role="tab" type="button" id="sk-2" aria-controls="skp-2" aria-selected="false" tabindex="-1">冻线凿击<small>Skill</small></button>
    <button class="at-tab" role="tab" type="button" id="sk-3" aria-controls="skp-3" aria-selected="false" tabindex="-1">冰川断层<small>Ultimate</small></button>
    <button class="at-tab" role="tab" type="button" id="sk-4" aria-selected="false" tabindex="-1" disabled>天赋<small>Locked</small></button>
  </div>
  <div class="at-tabs__panel" role="tabpanel" id="skp-1" aria-labelledby="sk-1" tabindex="0"><p class="at-prose">对前方敌人进行至多 4 段劈击，造成物理伤害。第 4 段命中被冻结的敌人时，额外造成一次碎冰伤害。</p>${skillTable([["第一段倍率", 22], ["第二段倍率", 26], ["第三段倍率", 31], ["第四段倍率", 44]], 0.09)}</div>
  <div class="at-tabs__panel" role="tabpanel" id="skp-2" aria-labelledby="sk-2" tabindex="0" hidden><p class="at-prose">向前方凿出一道冰线，冻结线上的敌人 2 秒。冻结结束时造成一次寒冷伤害。</p>${skillTable([["凿击倍率", 180], ["冻结时长（秒）", 200]], 0.06)}</div>
  <div class="at-tabs__panel" role="tabpanel" id="skp-3" aria-labelledby="sk-3" tabindex="0" hidden><p class="at-prose">锤击地面掀起冰川断层，对范围内敌人造成大量物理伤害并击退。</p>${skillTable([["断层倍率", 420], ["余震倍率", 96]], 0.08)}</div>
</div>

${h2("养成材料", "Materials", "mats")}
${materialsTable()}

${h2("档案", "Profile", "profile")}
<div class="at-prose"><p>白砾在北港长大，十四岁加入破冰队。她记得每一条冰缝的名字，也记得每一位没能回来的队员。</p><p>工会给她的评价只有一行：<a class="at-link" href="entity.html">可靠</a>。关于她的长柄凿锤，另见 <a class="at-link at-link--missing" href="list.html" title="页面不存在">北港凿锤（待创建）</a>。</p></div>
${empty(ic, { zh: "语音记录尚未收录", en: "No Voice Lines Yet", text: "版本更新后会逐条补全。", icon: "notice", inline: true, action: '<a class="at-btn at-btn--ghost" href="article.html">参与补全</a>' })}`;
  return page({ id: "entity", title: "白砾", current: "agents", body });
}

// ---------- list / index with filters ----------
function list() {
  const toggles = (name, opts) => `<div class="at-filters__opts" role="group" aria-label="${name}" data-filter="${name}"><button class="at-toggle" type="button" aria-pressed="true" data-value="">全部</button>${opts.map((o) => `<button class="at-toggle" type="button" aria-pressed="false" data-value="${esc(o[0])}">${esc(o[1] || o[0])}</button>`).join("")}</div>`;
  const rows = D.ARMS.map((a) => `<tr class="at-row" data-rarity="${a.rarity}" data-type="${esc(a.type)}" data-attr="${esc(a.attr)}"><td data-v="${esc(a.en)}"><a class="at-itemcell" href="item.html">${slot({ label: "图标", en: "Icon", size: "128×128", bare: true })}<span>${esc(a.zh)}<br><small class="at-note">${esc(a.en)}</small></span></a></td><td data-v="${a.rarity}">${stars(ic, a.rarity)}</td><td>${esc(a.type)}</td><td>${esc(a.attr)}</td><td class="is-num" data-v="${a.atk}">${a.atk}</td></tr>`).join("\n");
  const body = `${pagehead(ic, { trail: [["武装", ""]], title: "武装", desc: "全部可装备武装，按稀有度、类型与主属性筛选。" })}
<section class="at-filters at-reveal" style="margin-top: var(--space-6)" aria-labelledby="flt-title" data-filters>
  <div class="at-filters__head">
    <div><p class="at-filters__code">// arms index</p><h2 class="at-filters__title" id="flt-title">武装情报</h2></div>
    <div class="at-filters__tools">
      <div class="at-search" style="width: 200px; height: var(--toolbar-h)"><input class="at-search__input" id="flt-q" type="search" aria-label="按名称筛选" placeholder="名称…" data-filter-text></div>
      <div class="at-seg" role="tablist" aria-label="视图" data-tabs><button class="at-tab" role="tab" type="button" aria-selected="true" aria-controls="view-grid" id="v-grid" aria-label="卡片视图" title="卡片视图">${ic("grid", "at-icon at-icon--sm")}</button><button class="at-tab" role="tab" type="button" aria-selected="false" tabindex="-1" aria-controls="view-table" id="v-table" aria-label="表格视图" title="表格视图">${ic("rows", "at-icon at-icon--sm")}</button></div>
      <button class="at-btn at-btn--tool" type="button" data-filter-reset>${ic("reset", "at-icon at-icon--sm")}重置</button>
    </div>
  </div>
  <div class="at-filters__row"><span class="at-filters__label">稀有度</span>${toggles("rarity", [["6", "6★"], ["5", "5★"], ["4", "4★"], ["3", "3★"]])}</div>
  <div class="at-filters__row"><span class="at-filters__label">类型</span>${toggles("type", [["长柄"], ["单刃"], ["射装"], ["法匣"], ["重装"]])}</div>
  <div class="at-filters__row"><span class="at-filters__label">主属性</span>${toggles("attr", [["力量"], ["敏捷"], ["智识"], ["意志"]])}</div>
</section>
<p class="at-count" style="margin: var(--space-4) 0" aria-live="polite" data-filter-count>共 ${D.ARMS.length} 件</p>
<div role="tabpanel" id="view-grid" aria-labelledby="v-grid"><ul class="at-cards" data-filter-items>${D.ARMS.map((a) => card(ic, a, { kind: "arms" })).join("")}</ul></div>
<div role="tabpanel" id="view-table" aria-labelledby="v-table" hidden><div class="at-tablewrap"><table class="at-table" data-sortable data-filter-items><caption>武装一览（点击表头排序）</caption><thead><tr>
<th scope="col"><button class="at-sort" type="button">名称${ic("sort", "at-icon at-icon--sm")}</button></th>
<th scope="col" aria-sort="descending"><button class="at-sort" type="button" data-type="num">稀有度${ic("sort", "at-icon at-icon--sm")}</button></th>
<th scope="col"><button class="at-sort" type="button">类型${ic("sort", "at-icon at-icon--sm")}</button></th>
<th scope="col"><button class="at-sort" type="button">主属性${ic("sort", "at-icon at-icon--sm")}</button></th>
<th scope="col" class="is-num"><button class="at-sort" type="button" data-type="num">基础攻击${ic("sort", "at-icon at-icon--sm")}</button></th></tr></thead><tbody>
${rows}
</tbody></table></div></div>
<div data-filter-empty hidden>${empty(ic, { zh: "没有符合条件的武装", en: "No Matching Arms", text: "换一个稀有度或类型试试，或者清空全部筛选。", icon: "filter", action: '<button class="at-btn at-btn--accent" type="button" data-filter-reset>清空筛选</button>' })}</div>
<div style="margin-top: var(--space-6)">${pager(ic, { current: 1, total: 4 })}</div>`;
  return page({ id: "list", title: "武装", current: "arms", body });
}

// ---------- item detail ----------
function item() {
  const uses = [["白砾", "阶段 4", 2], ["柒弦", "阶段 4", 3], ["祁寒", "阶段 3", 1], ["莫桑", "阶段 4", 2]];
  const body = `${pagehead(ic, { trail: [["物资", "list.html"], ["珍贵物资", "list.html"], ["冷凝核心", ""]], title: "冷凝核心" })}
<section class="at-infobox at-reveal" style="--rarity: var(--rarity-5); margin-top: var(--space-6)" aria-labelledby="item-name">
  <div class="at-infobox__head">
    ${slot({ label: "物资图标", en: "Icon", size: "512×512", task: "item-condensate-core", safe: "12%", cls: "at-infobox__icon" })}
    <div><h2 class="at-infobox__title" id="item-name"><span>冷凝核心</span><span class="at-chip at-chip--accent">★ 5</span></h2><p class="at-note">Condensate Core · 珍贵物资</p></div>
  </div>
  <dl class="at-infobox__rows">
    <div><dt>类型</dt><dd><a class="at-link" href="list.html">珍贵物资</a></dd></div>
    <div><dt>稀有度</dt><dd>${stars(ic, 5)}</dd></div>
    <div><dt>堆叠上限</dt><dd class="at-num">999</dd></div>
    <div><dt>说明</dt><dd>用于调查员第 4 阶段晋升的稀有材料。<br><em class="at-note">“零下四十度，它仍在记录温度。”</em></dd></div>
    <div><dt>获取方式</dt><dd class="at-row-gap" style="gap: var(--space-2)"><span class="at-tag">极夜远征奖励</span><span class="at-tag">补给站 · 每周兑换</span><span class="at-tag at-tag--warm">限时委托</span></dd></div>
  </dl>
</section>
${h2("用途", "Used By", "uses")}
<div class="at-tablewrap"><table class="at-table" data-sortable><caption>需要冷凝核心的调查员晋升</caption><thead><tr>
<th scope="col"><button class="at-sort" type="button">调查员${ic("sort", "at-icon at-icon--sm")}</button></th>
<th scope="col"><button class="at-sort" type="button">阶段${ic("sort", "at-icon at-icon--sm")}</button></th>
<th scope="col" class="is-num" aria-sort="descending"><button class="at-sort" type="button" data-type="num">数量${ic("sort", "at-icon at-icon--sm")}</button></th></tr></thead><tbody>
${uses.sort((a, b) => b[2] - a[2]).map(([n, st, q]) => `<tr><td><a class="at-link" href="entity.html">${esc(n)}</a></td><td>${esc(st)}</td><td class="is-num" data-v="${q}">×${q}</td></tr>`).join("\n")}
</tbody></table></div>
${h2("分类", "Categories", "cats")}
<p class="at-row-gap"><a class="at-chip at-chip--outline" href="list.html">物资</a><a class="at-chip at-chip--outline" href="list.html">珍贵物资</a><a class="at-chip at-chip--outline" href="list.html">晋升材料</a></p>
${h2("讨论", "Discussion", "talk")}
${empty(ic, { zh: "还没有人讨论", en: "No Discussion Yet", text: "关于获取方式或数值的疑问，可以在这里发起第一条讨论。", icon: "help", inline: true, action: '<button class="at-btn at-btn--ghost" type="button" disabled>登录后发言</button>' })}`;
  return page({ id: "item", title: "冷凝核心", current: "supplies", body });
}

// ---------- event / news article ----------
function article() {
  const body = `${pagehead(ic, { trail: [["事件", "list.html"], ["极夜远征", ""]], title: "「极夜远征」限时委托开启" })}
<div class="at-article" style="margin-top: var(--space-6)">
  <article class="at-prose">
    ${slot({ label: "活动横幅", en: "Banner", size: "1600×900", task: "banner-polar-night", safe: "6% 8%", cls: "at-banner" })}
    <p><span class="at-chip at-chip--live">进行中</span>　2041-03-18 至 2041-04-08。北港以北的冰原进入极夜，测绘局开放三条远征路线。</p>
    ${h2("活动时间", "Schedule", "a-time")}
    <div class="at-tablewrap"><table class="at-table"><thead><tr><th scope="col"><span>阶段</span></th><th scope="col"><span>开放时间</span></th><th scope="col"><span>路线</span></th></tr></thead><tbody>
      <tr><td>第一段</td><td class="at-num">03-18 10:00</td><td>白鲸湾 → 第三灯塔</td></tr>
      <tr><td>第二段</td><td class="at-num">03-25 10:00</td><td>第三灯塔 → 冻结港</td></tr>
      <tr><td>第三段</td><td class="at-num">04-01 10:00</td><td>冻结港 → 无名冰架</td></tr></tbody></table></div>
    ${h2("委托规则", "Rules", "a-rules")}
    <p>每条路线有 6 个据点。进入据点前须携带至少一名守卫职能的调查员；暖芯电池耗尽时队伍会撤回上一据点，不损失已获得的物资。</p>
    ${h2("奖励一览", "Rewards", "a-rewards")}
    <ul><li><a class="at-link" href="item.html">冷凝核心</a> ×6（三段全部通关）</li><li>调查员 <a class="at-link" href="entity.html">白砾</a> 的晋升材料包</li><li>据点明信片「第三灯塔」</li></ul>
    ${h2("注意事项", "Notes", "a-notes")}
    <p>活动期间补给站的暖芯电池兑换上限提高到每周 20 个。数值以游戏内为准，本页由玩家整理，若发现不一致请在讨论页反馈。</p>
    <nav class="at-prevnext" aria-label="相邻文章"><a href="article.html"><small>上一篇 · Previous</small>社区创作征集：据点明信片</a><a href="article.html"><small>下一篇 · Next</small>v2.4「冰原回声」版本更新说明</a></nav>
  </article>
  <nav class="at-toc" aria-labelledby="toc-h"><p class="at-mini-title" id="toc-h">目录 <span class="at-sechead__en">Contents</span></p><ol><li><a href="#a-time">活动时间</a></li><li><a href="#a-rules">委托规则</a></li><li><a href="#a-rewards">奖励一览</a></li><li><a href="#a-notes">注意事项</a></li></ol></nav>
</div>`;
  return page({ id: "article", title: "极夜远征", current: "live", body });
}

// ---------- recent changes ----------
function changes() {
  const day = (label, rows) => `<h2 class="at-changes__day">${label}<span class="at-count">${rows.length} 条</span></h2><ol class="at-changes__list">${rows.map(([t, k, title, sum, d, u]) => `<li class="at-change" data-kind="${k}"><span class="at-change__time">${t}</span><span class="at-change__kind${k === "new" ? " at-change__kind--new" : k === "minor" ? " at-change__kind--minor" : ""}" title="${k === "new" ? "新建" : k === "minor" ? "小修改" : "编辑"}">${k === "new" ? "新" : k === "minor" ? "微" : "编"}</span><div><span class="at-change__title"><a class="at-link" href="${title.includes("冷凝") ? "item.html" : title.includes("白砾") ? "entity.html" : "article.html"}">${esc(title)}</a><small><a href="#">历史</a> · <a href="#">差异</a></small></span><span class="at-change__sum">“${esc(sum)}”</span></div><span class="at-change__side"><span class="${d > 0 ? "at-delta--add" : "at-delta--del"}">${d > 0 ? "+" : "−"}${Math.abs(d).toLocaleString("en-US")}</span><span>${esc(u)}</span></span></li>`).join("")}</ol>`;
  const body = `${pagehead(ic, { trail: [["最近更改", ""]], title: "最近更改", desc: "按时间倒序列出全站编辑：新建、编辑与小修改。", meta: false, tools: false })}
<div class="at-row-gap" style="margin-top: var(--space-4)" role="group" aria-label="按类型筛选" data-filter="kind" data-filter-scope="changes">
  <button class="at-toggle" type="button" aria-pressed="true" data-value="">全部 <span class="at-num">9</span></button>
  <button class="at-toggle" type="button" aria-pressed="false" data-value="new">新建 <span class="at-num">2</span></button>
  <button class="at-toggle" type="button" aria-pressed="false" data-value="edit">编辑 <span class="at-num">5</span></button>
  <button class="at-toggle" type="button" aria-pressed="false" data-value="minor">小修改 <span class="at-num">2</span></button>
</div>
<div data-changes>
${day("2041-03-18 星期一", [["21:04", "edit", "调查员/白砾", "补全技能倍率表", 2310, "霜鸦"], ["20:51", "new", "物资/冷凝核心", "新建条目", 1840, "北港小卒"], ["18:12", "minor", "事件/极夜远征", "修正开放时间", -12, "霜鸦"], ["16:40", "edit", "武装/寂潮", "补充推荐搭配", 426, "测绘员 07"], ["10:02", "new", "事件/极夜远征", "新建活动页", 5120, "管理员"]])}
${day("2041-03-17 星期日", [["23:30", "edit", "调查员/柒弦", "更新档案文本", 788, "雪线"], ["22:15", "edit", "武装/断桥", "数值随版本更新", -96, "测绘员 07"], ["14:08", "minor", "地图/白鲸湾", "调整图注", 18, "霜鸦"], ["09:44", "edit", "补给站", "本周兑换表", 340, "北港小卒"]])}
</div>
<div data-filter-empty hidden>${empty(ic, { zh: "这一类没有更改", en: "No Changes", icon: "history" })}</div>
<div style="margin-top: var(--space-6)">${pager(ic, { current: 1, total: 6 })}</div>`;
  return page({ id: "changes", title: "最近更改", current: "recent", body });
}

// ---------- search ----------
function search() {
  const results = [
    ["物资/冷凝核心", "item.html", "<mark>冷凝</mark>核心：用于调查员第 4 阶段晋升的稀有材料。获取：极夜远征奖励、补给站每周兑换。", "创建 2041-03-18 · 更新 2041-03-18"],
    ["调查员/白砾", "entity.html", "晋升材料 阶段 4：<mark>冷凝</mark>核心 ×2、霜晶 ×9。北港工会的破冰队长……", "创建 2041-03-15 · 更新 2041-03-18"],
    ["事件/极夜远征", "article.html", "奖励一览：<mark>冷凝</mark>核心 ×6（三段全部通关），调查员白砾的晋升材料包……", "创建 2041-03-18 · 更新 2041-03-18"],
    ["补给站", "list.html", "本周兑换：暖芯电池 ×20、<mark>冷凝</mark>核心 ×1（每周限 1 次）……", "创建 2040-11-02 · 更新 2041-03-17"],
    ["调查员/柒弦", "entity.html", "晋升材料 阶段 4：<mark>冷凝</mark>核心 ×3、测绘胶卷 ×12……", "创建 2041-01-20 · 更新 2041-03-17"],
  ];
  const body = `${pagehead(ic, { trail: [["站内搜索", ""]], title: "站内搜索", desc: "同时搜索标题与正文，标题命中的条目排在前面。", meta: false, tools: false })}
<div style="margin-top: var(--space-5)">${P.search(ic, { id: "q-main", large: true, value: "冷凝", goLabel: "检索" })}</div>
<p class="at-results__meta"><span>查询：“冷凝”</span><a class="at-chip at-chip--outline" href="#">物资</a><a class="at-chip at-chip--outline" href="#">调查员</a><a class="at-chip at-chip--outline" href="#">事件</a><span class="at-count" aria-live="polite" data-result-count>${results.length} 条结果</span></p>
<ol class="at-results" data-results>
${results.map(([t, h, snip, when]) => `<li class="at-result"><a class="at-result__title at-link" href="${h}">${esc(t).replace("冷凝", "<mark>冷凝</mark>")}</a><span class="at-result__when">${when}</span><p class="at-result__snip">${snip}</p></li>`).join("\n")}
</ol>
<div data-results-empty hidden>${empty(ic, { zh: "没有找到相关条目", en: "No Results", text: "换个关键词，或者直接创建这个条目。", icon: "search", action: '<a class="at-btn at-btn--accent" href="#">创建条目</a>' })}</div>`;
  return page({ id: "search", title: "站内搜索", current: "", body });
}

// ---------- gallery ----------
function gallery() {
  const pages = [["home.html", "首页", "Home", "档案主视觉、动态、内容入口与版本公告"], ["entity.html", "调查员详情", "Entity", "立绘位、信息框、属性、技能分页、材料表"], ["list.html", "武装索引", "Index", "筛选面板、卡片 / 表格两种视图、空结果"], ["item.html", "物资详情", "Item", "物资信息框、用途表、讨论空状态"], ["article.html", "活动文章", "Article", "横幅位、带括号的小节标题、目录"], ["changes.html", "最近更改", "Recent", "按日分组、类型筛选、字节增减"], ["search.html", "站内搜索", "Search", "大号搜索、命中高亮、无结果"]];
  return page({ id: "gallery", title: "模板一览", current: "", body: `${pagehead(ic, { trail: [["模板一览", ""]], title: "Archive Terminal 模板一览", desc: "七个页面模板，共用 design-system/components/bundle.css；内容为虚构游戏《霜线》。", meta: false, tools: false })}
<ul class="at-tiles" style="margin-top: var(--space-6)">${pages.map(([h, zh, en, d]) => `<li><a class="at-tile" href="${h}" style="align-items: flex-start; text-align: left"><span class="at-tile__zh">${zh}</span><span class="at-tile__en">${en}</span><span class="at-note">${d}</span></a></li>`).join("")}</ul>` });
}

module.exports = { home, entity, list, item, article, changes, search, gallery };
