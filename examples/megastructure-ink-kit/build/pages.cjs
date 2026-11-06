"use strict";

// Page templates: the official site (seven screens), two in-game screens and the gallery.
const P = require("./parts.cjs");
const D = require("./data.cjs");
const I = require("./icons.cjs");

const ICONS = Object.keys(I.PATHS);
const ic = (name, cls) => I.use(name, cls);

function shell({ title, body, cls = "", desc = "" }) {
  return `<!doctype html>
<html lang="zh-CN" data-mode="show">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${P.esc(title)}</title>
<meta name="description" content="${P.esc(desc || D.SITE.tag)}">
<link rel="stylesheet" href="tokens.css">
<link rel="stylesheet" href="../design-system/components/bundle.css">
<script>(function(){var q=new URLSearchParams(location.search);if(q.get("slot")==="1")document.documentElement.setAttribute("data-mode","slot");})();</script>
</head>
<body class="ms-page ${cls}">
${I.sprite(ICONS)}
<a class="ms-skip" href="#main" data-bleed>跳到正文</a>
${body}
<script src="glyphs.js"></script>
<script src="plates.js"></script>
<script src="kit.js"></script>
</body>
</html>
`;
}

function site() {
  const m0 = D.MEMBERS[0];
  const body = `${P.topbar(ic)}
${P.rail()}
<main id="main" class="ms-site">
<section class="ms-screen ms-hero" id="top" aria-labelledby="hero-h">
  ${P.slot("hero-kv", { cls: "ms-hero__slot" })}
  <div class="ms-hero__scale">${P.scale({})}</div>
  <div class="ms-hero__text">
    <p class="ms-hero__kicker">${P.glyphline("stratum 4112", "第 4,112 层 · −41,200 m", { size: 10 })}</p>
    <h1 class="display-title ms-hero__title" id="hero-h"><span class="ms-compress">${P.esc(D.SITE.zh)}</span></h1>
    <p class="ms-hero__en caps">${P.esc(D.SITE.en)}</p>
    <p class="ms-hero__tag body">${P.esc(D.SITE.tag)}</p>
    <div class="ms-hero__actions"><a class="ms-btn ms-btn--lg" href="#descend">${ic("down", "ms-icon ms-icon--sm")}开始下潜</a><button class="ms-btn ms-btn--ghost ms-btn--lg" type="button" data-toast="先导影像将在 11 月 14 日公开。">${ic("play", "ms-icon ms-icon--sm")}先导影像</button></div>
  </div>
  <div class="ms-hero__meta">${P.readout({ zh: "当前深度", en: "DEPTH", value: "−41,200", unit: "m", state: "live" })}${P.readout({ zh: "已测层", en: "SOUNDED", value: "4,112" })}${P.readout({ zh: "回声", en: "ECHO", value: "3.2", unit: "s" })}</div>
</section>

<section class="ms-screen ms-world" id="world" aria-labelledby="world-h">
  <div class="ms-world__text">
    ${P.sechead({ no: "02", zh: "穹井", en: "THE WELL", depth: "1,200", id: "world-h" })}
    ${D.WORLD.map((t) => `<p class="body ms-world__p">${P.esc(t)}</p>`).join("\n    ")}
    ${P.table()}
  </div>
  <div class="ms-world__view">${P.hudframe(`${P.slot("world-shaft", { cls: "ms-world__slot" })}${D.WORLD_NOTES.map((n, i) => `<p class="ms-note" style="--x: ${n.at[0]}; --y: ${n.at[1]}"><span class="ms-note__pin" aria-hidden="true"></span><span class="ms-note__body"><span class="label">${P.esc(n.zh)}</span><span class="caps">${P.esc(n.en)}</span><span class="ms-note__state label${i === 3 ? " is-live" : ""}">${P.esc(n.note)}</span></span></p>`).join("")}`, { cls: "ms-world__frame", label: "SECTION A-A" })}${P.scale({ small: "1.7 m", large: "18,000 m", largeZh: "可见深度", ratio: "1 : 10,600", cls: "ms-scale--v" })}</div>
</section>

<section class="ms-screen ms-bureau" id="bureau" aria-labelledby="bureau-h">
  ${P.sechead({ no: "03", zh: "测深署", en: "SOUNDING BUREAU", depth: "8,600", id: "bureau-h" })}
  <p class="body ms-bureau__lead">四个人，一根绳，一把锤。敲一下，等回声，记一个数。</p>
  <div class="ms-bureau__grid">
    <ul class="ms-members" aria-label="测深员">${D.MEMBERS.map((m, i) => P.member(m, { active: i === 0, ic })).join("")}</ul>
    <div class="ms-bureau__dossier" data-dossiers>${D.MEMBERS.map((m, i) => `<div data-dossier-wrap="${m.id}"${i ? " hidden" : ""}>${P.dossier(m, ic)}</div>`).join("")}</div>
  </div>
</section>

<section class="ms-screen ms-hush" id="hush" aria-labelledby="hush-h">
  ${P.slot("hush-sighting", { cls: "ms-hush__slot" })}
  <div class="ms-hush__frame">${P.hudframe('<p class="ms-hush__void label">目标不可见 · 仅回声缺口</p><span class="ms-hush__gap" style="--x: 22%; --y: 38%" aria-hidden="true"></span><span class="ms-hush__gap" style="--x: 61%; --y: 54%" aria-hidden="true"></span><span class="ms-hush__gap" style="--x: 78%; --y: 30%" aria-hidden="true"></span>', { cls: "ms-hudframe--alarm", label: "TRACK 3 / LOST" })}</div>
  <div class="ms-hush__text">
    ${P.sechead({ no: "04", zh: D.HUSH.zh, en: D.HUSH.en, depth: "24,100", id: "hush-h" })}
    ${D.HUSH.lines.map((t) => `<p class="body">${P.esc(t)}</p>`).join("")}
    ${P.alert(ic, { live: false })}
    <div class="ms-hush__readouts">${D.HUSH.readouts.map(([zh, v, u], i) => P.readout({ zh, en: ["RANGE", "GAPS", "ADVICE"][i], value: v, unit: u, state: i === 0 ? "alarm" : "" })).join("")}</div>
  </div>
</section>

<section class="ms-screen ms-board" id="board" aria-labelledby="board-h">
  ${P.sechead({ no: "05", zh: "接线台", en: "SWITCHBOARD", depth: "33,770", id: "board-h" })}
  <p class="body ms-board__lead">总台还在，只是不认识我们了。</p>
  <div class="ms-board__grid">
    ${P.terminal()}
    <div class="ms-board__side">
      ${P.handshake(ic)}
      <div class="ms-board__opts">${P.toggle({ id: "quiet", zh: "静默模式", en: "SILENT MODE", on: true })}${P.radios({ name: "line", legend: "线路", en: "LINE", items: [{ label: "0412" }, { label: "0413" }, { label: "0419", disabled: true }] })}</div>
      <div class="ms-board__stream" aria-hidden="true" data-stream></div>
    </div>
  </div>
</section>

<section class="ms-screen ms-logsec" id="logs" aria-labelledby="logs-h">
  ${P.sechead({ no: "06", zh: "通讯记录", en: "TRANSMISSIONS", depth: "39,600", id: "logs-h" })}
  ${P.tabs("通讯分类", [["全部", "ALL"], ["信标", "BEACON"], ["版本", "UPDATE"], ["公告", "NOTICE"], ["影像", "FILM"]], 0)}
  <div class="ms-logsec__grid">
    <article class="ms-feature">${P.slot("log-thumb", { cls: "ms-feature__slot" })}<div class="ms-feature__body"><p class="data-sm">2026.11.06 · TX-0412</p><h3 class="title-block">第 4,112 层信标恢复 4 分钟</h3><p class="body-sm">03:12 起，接线层的旧信标连续亮了 4 分钟。测深署记下了 211 次回声。</p><a class="ms-link body-sm" href="#logs">阅读全文 ${ic("arrow", "ms-icon ms-icon--sm")}</a></div></article>
    <div>${P.logs()}${P.pager(ic)}</div>
  </div>
</section>

<section class="ms-screen ms-descend" id="descend" aria-labelledby="descend-h">
  ${P.slot("descend-well", { cls: "ms-descend__slot" })}
  <div class="ms-descend__inner">
    <p class="data-sm ms-descend__no">07 / 07</p>
    <h2 class="title-section" id="descend-h">下潜资格申请开启</h2>
    <p class="caps">APPLICATIONS OPEN · 2026.11.06 — 11.30</p>
    <div class="ms-descend__actions"><button class="ms-btn ms-btn--lg" type="button" data-dialog-open="reserve">${ic("plus", "ms-icon ms-icon--sm")}预约下潜</button>${D.PLATFORMS.map((p) => `<a class="ms-btn ms-btn--ghost" href="#descend">${ic("download", "ms-icon ms-icon--sm")}${P.esc(p.zh)}</a>`).join("")}</div>
    ${P.loader({ zh: "资格审核", en: "REVIEW QUEUE", pct: 62, id: "queue" })}
  </div>
  <p class="ms-descend__depth display-depth" aria-hidden="true" data-deco>−41,200</p>
</section>
</main>
${P.footer(ic)}
${P.dialog(ic)}
<ul class="ms-toasts" data-toasts aria-live="polite"></ul>`;
  return shell({ title: "穹井 VAULTWELL · 官方站点", body, cls: "ms-page--site" });
}

// In-game descent HUD, 1920 x 1080: white hairlines on black around a viewport.
function hud() {
  const ladder = Array.from({ length: 13 }, (_, i) => 41140 + i * 10).reverse();
  const body = `<main id="main" class="ms-app ms-hud" aria-labelledby="hud-h">
  <h1 class="ms-sr" id="hud-h">下潜 HUD</h1>
  <header class="ms-hud__top">${P.plate({ zh: "实况", en: "LIVE", icon: "signal", note: "03:12:44" }, ic)}<div class="ms-hud__heading" aria-label="航向 214°"><span class="ms-hud__ticks" aria-hidden="true"></span><span class="ms-hud__hdg readout">214°</span></div>${P.plate({ zh: "静默", en: "SILENT", icon: "mute", note: "外放关闭" }, ic)}</header>
  <aside class="ms-hud__left" aria-label="深度">
    <ol class="ms-ladder">${ladder.map((d, i) => `<li class="ms-ladder__step${i === 6 ? " is-current" : ""}"><span class="data-sm">−${d.toLocaleString("en-US")}</span></li>`).join("")}</ol>
    ${P.readout({ zh: "深度", en: "DEPTH", value: "−41,200", unit: "m", state: "live" })}
    ${P.gauge({ zh: "下沉", en: "DESCENT", value: 0.42, text: "4.2 m/s", vertical: true, total: 20 })}
  </aside>
  <section class="ms-hud__view" aria-label="舱外视野">${P.hudframe(`${P.slot("cockpit-view", { cls: "ms-hud__slot" })}<span class="ms-reticle" aria-hidden="true"></span>${P.scale({ small: "1.7 m", large: "3,400 m", ratio: "1 : 2,000", cls: "ms-hud__scale" })}`, { label: "VIEW 01 · ×1.0" })}</section>
  <aside class="ms-hud__right" aria-label="状态">
    ${P.gauge({ zh: "外压", en: "PRESSURE", value: 0.74, text: "4,120 kPa" })}
    ${P.gauge({ zh: "舱体", en: "HULL", value: 0.88, text: "88%" })}
    ${P.gauge({ zh: "氧", en: "OXYGEN", value: 0.31, text: "31%", state: "alarm" })}
    <figure class="ms-sonar" aria-labelledby="sonar-cap"><span class="ms-sonar__ring" aria-hidden="true"></span><span class="ms-sonar__ring ms-sonar__ring--2" aria-hidden="true"></span><span class="ms-sonar__ring ms-sonar__ring--3" aria-hidden="true"></span><span class="ms-sonar__sweep" aria-hidden="true"></span><span class="ms-sonar__gap" style="--a: 38deg; --r: 0.62" aria-hidden="true"></span><span class="ms-sonar__gap" style="--a: 112deg; --r: 0.4" aria-hidden="true"></span><figcaption id="sonar-cap">${P.bi("回声", "ECHO")}<span class="data-sm">3 GAPS</span></figcaption></figure>
  </aside>
  <footer class="ms-hud__bottom">
    <div class="ms-hud__comms">${P.terminal([["03:12:40", "S-07", "回声晚到了半秒。"], ["03:12:42", "S-19", "别回话。"], ["03:12:44", "S-23", "后面干净。"]], { id: "comms", title: "队内", en: "SQUAD", cursor: false })}</div>
    ${P.alert(ic, { zh: "回声缺口", en: "ECHO GAP", text: "右前方 1,240 m。保持静默。" })}
    <div class="ms-hud__keys"><span class="ms-key data-sm">Q</span><span class="label">敲击</span><span class="ms-key data-sm">E</span><span class="label">静听</span><span class="ms-key data-sm">TAB</span><span class="label">测绘图</span></div>
  </footer>
</main>`;
  return shell({ title: "穹井 · 下潜 HUD", body, cls: "ms-page--app", desc: "游戏内下潜 HUD" });
}

// In-game survey terminal, 1920 x 1080: the strata section, a shaft map and the bureau's status.
function terminalPage() {
  const nodes = [["A1", 12, 14], ["A2", 12, 38], ["B4", 34, 22], ["B7", 34, 58], ["C2", 58, 30], ["C9", 58, 74], ["D1", 82, 46], ["D3", 82, 86]];
  const links = [[0, 1], [0, 2], [1, 3], [2, 4], [3, 5], [4, 6], [5, 7], [6, 7], [2, 3]];
  const pos = (n) => [n[1], n[2]];
  const map = `<svg class="ms-map__svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">${links.map(([a, b]) => { const [x1, y1] = pos(nodes[a]); const [x2, y2] = pos(nodes[b]); return `<path d="M${x1} ${y1}V${(y1 + y2) / 2}H${x2}V${y2}" class="ms-map__link${a === 4 && b === 6 ? " is-route" : ""}"/>`; }).join("")}</svg>${nodes.map((n, i) => `<button class="ms-map__node${i === 6 ? " is-current" : ""}${i === 5 ? " is-alarm" : ""}" type="button" style="--x: ${n[1]}; --y: ${n[2]}" aria-label="竖井 ${n[0]}"><span class="data-sm">${n[0]}</span></button>`).join("")}`;
  const body = `<main id="main" class="ms-app ms-tapp" aria-labelledby="tapp-h">
  <header class="ms-tapp__top"><h1 class="title-block" id="tapp-h">测绘终端</h1><p class="caps">SURVEY TERMINAL · STRATUM 4,112</p>${P.tabs("终端分页", [["剖面", "SECTION"], ["竖井", "SHAFTS"], ["人员", "CREW"], ["记录", "LOG"]], 1)}${P.plate({ zh: "离线", en: "OFFLINE", icon: "mute", note: "总台未接入" }, ic)}</header>
  <aside class="ms-tapp__left">${P.strataMap({ id: "tsm" })}</aside>
  <section class="ms-tapp__map" aria-label="竖井图">${P.hudframe(`<div class="ms-map">${map}</div>${P.scale({ small: "1.7 m", large: "9,000 m", largeZh: "图幅宽度", ratio: "1 : 5,300", cls: "ms-tapp__scale" })}`, { label: "MAP 4112 · SHAFTS 8" })}</section>
  <aside class="ms-tapp__right">
    <section class="ms-crew" aria-labelledby="crew-h"><h2 class="ms-crew__h" id="crew-h">${P.bi("队员", "CREW")}</h2><ul class="ms-crew__list">${D.MEMBERS.map((m, i) => `<li class="ms-crew__row${i === 2 ? " is-alarm" : ""}"><span class="data-sm">${m.code}</span><span class="body-sm">${m.zh}</span><span class="ms-state is-${i === 2 ? "alarm" : "ok"}">${i === 2 ? "失联 00:41" : "在线"}</span></li>`).join("")}</ul></section>
    ${P.loader({ zh: "回声解算", en: "ECHO SOLVE", pct: 38, id: "solve" })}
    ${P.terminal([["03:13:02", "MAP", "竖井 C9 回声缺口 ×3"], ["03:13:05", "MAP", "建议路线 C2 → D1"], ["03:13:09", "ERR", "S-19 信号丢失"]], { id: "tlog", title: "解算记录", en: "SOLVER LOG" })}
  </aside>
</main>`;
  return shell({ title: "穹井 · 测绘终端", body, cls: "ms-page--app", desc: "游戏内测绘终端" });
}

// Gallery: every component on one page, grouped, with links to the screens.
function gallery() {
  const sec = (id, zh, en, html) => `<section class="ms-gal__sec" id="${id}" aria-labelledby="${id}-h"><h2 class="ms-gal__h" id="${id}-h">${P.bi(zh, en)}</h2><div class="ms-gal__body">${html}</div></section>`;
  const comps = [
    ["c-glyph", "层文字形", "RAIL SCRIPT", `<p class="body-sm">本组件库自己的字形：每个字符映射成挂在基线上的方条组合，旁边总有读法。</p>${["vaultwell", "sounding bureau", "echo key", "silence"].map((t) => P.glyphline(t, t.toUpperCase(), { size: 16 })).join("<br>")}`],
    ["c-scale", "比例标", "SCALE MARKER", P.scale({})],
    ["c-head", "分区标题", "SECTION HEAD", P.sechead({ no: "02", zh: "穹井", en: "THE WELL", depth: "1,200" })],
    ["c-btn", "按钮", "BUTTONS", `<div class="ms-row"><button class="ms-btn" type="button">开始下潜</button><button class="ms-btn is-hover" type="button">悬停</button><button class="ms-btn is-active" type="button">按下</button><button class="ms-btn is-focus" type="button">焦点</button><button class="ms-btn" type="button" disabled>不可用</button><button class="ms-btn" type="button" aria-busy="true">提交</button></div><div class="ms-row"><button class="ms-btn ms-btn--ghost" type="button">先导影像</button><button class="ms-btn ms-btn--ghost is-hover" type="button">悬停</button><button class="ms-btn ms-btn--danger" type="button">${ic("alert", "ms-icon ms-icon--sm")}断开线路</button><button class="ms-iconbtn" type="button" aria-label="菜单">${ic("menu")}</button><button class="ms-iconbtn is-focus" type="button" aria-label="关闭">${ic("close")}</button></div>`],
    ["c-plate", "标签牌", "LABEL PLATE", `<div class="ms-row">${P.plate({ zh: "实况", en: "LIVE", icon: "signal", note: "03:12:44" }, ic)}${P.plate({ zh: "通讯", en: "COMMS", icon: "wave", tone: "screen" }, ic)}${P.plate({ zh: "警报", en: "ALARM", icon: "alert", tone: "alarm" }, ic)}</div>`],
    ["c-readout", "读数", "READOUT", `<div class="ms-row">${P.readout({ zh: "当前深度", en: "DEPTH", value: "−41,200", unit: "m", state: "live" })}${P.readout({ zh: "已测层", en: "SOUNDED", value: "4,112" })}${P.readout({ zh: "距离", en: "RANGE", value: "1,240", unit: "m", state: "alarm" })}</div>`],
    ["c-gauge", "刻度条", "GAUGE", `${P.gauge({ zh: "外压", en: "PRESSURE", value: 0.74, text: "4,120 kPa" })}${P.gauge({ zh: "氧", en: "OXYGEN", value: 0.31, text: "31%", state: "alarm" })}`],
    ["c-alert", "警报", "ALERT", P.alert(ic, { live: false })],
    ["c-term", "终端记录", "TERMINAL LOG", P.terminal(D.BOARD.lines, { id: "g-term" })],
    ["c-hs", "握手", "HANDSHAKE", `${P.handshake(ic, { id: "g1" })}${P.handshake(ic, { id: "g2", state: "fail" })}`],
    ["c-tabs", "页签", "TABS", P.tabs("示例页签", [["全部", "ALL"], ["信标", "BEACON"], ["版本", "UPDATE"], ["锁定", "LOCKED"]], 1, { disabled: [3] })],
    ["c-form", "开关与单选", "SWITCH & RADIO", `<div class="ms-row">${P.toggle({ id: "g-quiet", zh: "静默模式", en: "SILENT MODE", on: true })}${P.toggle({ id: "g-loud", zh: "外放", en: "SPEAKER" })}${P.toggle({ id: "g-lock", zh: "自动敲击", en: "AUTO TAP", disabled: true })}</div>${P.radios({ name: "g-line", legend: "线路", en: "LINE", items: [{ label: "0412" }, { label: "0413" }, { label: "0419", disabled: true }] })}`],
    ["c-field", "输入框", "FIELD", `<div class="ms-row ms-row--top">${P.field({ id: "g-f1", zh: "呼号", en: "CALL SIGN", placeholder: "S-00" })}${P.field({ id: "g-f2", zh: "呼号", en: "CALL SIGN", value: "s 41", state: "invalid", hint: "只收大写字母、数字和连字符。" })}${P.field({ id: "g-f3", zh: "回声钥", en: "ECHO KEY", value: "未持有", disabled: true })}</div>`],
    ["c-loader", "加载", "LOADER", P.loader({ id: "g-ld" })],
    ["c-member", "测深员卡", "MEMBER CARD", `<ul class="ms-members ms-members--gal">${D.MEMBERS.slice(0, 2).map((m, i) => P.member(m, { active: i === 0, ic })).join("")}</ul>`],
    ["c-dossier", "档案", "DOSSIER", P.dossier(D.MEMBERS[1], ic)],
    ["c-logs", "通讯列表", "LOG LIST", `${P.logs(D.LOGS.slice(0, 3))}${P.pager(ic, { current: 2, total: 5 })}`],
    ["c-table", "数据表", "DATA TABLE", P.table()],
    ["c-smap", "剖面图", "STRATA MAP", `<div class="ms-gal__smap">${P.strataMap({ id: "g-sm" })}</div>`],
    ["c-frame", "HUD 框", "HUD FRAME", P.hudframe('<p class="body-sm ms-pad">框角 14px，发丝线，标签贴在左上。</p>', { label: "FRAME 01" })],
    ["c-slot", "美术位", "ART SLOT", `<div class="ms-row ms-row--top"><div style="width: 360px">${P.slot("log-thumb", { ratio: "16 / 9" })}</div><div style="width: 160px">${P.slot("member-wendi", { ratio: "2 / 3" })}</div></div><p class="body-sm">展示模式画程序生成的结构版（不画人物）；<code class="data-sm">?slot=1</code> 显示尺寸、安全区和任务单编号。</p>`],
    ["c-dialog", "对话框", "DIALOG", `<button class="ms-btn" type="button" data-dialog-open="reserve">打开预约对话框</button>`],
    ["c-toast", "提示", "TOAST", `<ul class="ms-toasts ms-toasts--static">${P.toast(ic)}${P.toast(ic, { kind: "ok", text: "预约已提交。", en: "SENT" })}${P.toast(ic, { kind: "alarm", text: "线路 0419 中断。", en: "LINE DOWN" })}</ul>`],
  ];
  const body = `<header class="ms-gal__top">${P.brand()}<p class="caps">MEGASTRUCTURE INK · COMPONENT LIBRARY</p><nav class="ms-gal__pages" aria-label="页面"><a class="ms-btn ms-btn--ghost ms-btn--sm" href="site.html">官网</a><a class="ms-btn ms-btn--ghost ms-btn--sm" href="site.html?slot=1">官网 · 占位模式</a><a class="ms-btn ms-btn--ghost ms-btn--sm" href="hud.html">下潜 HUD</a><a class="ms-btn ms-btn--ghost ms-btn--sm" href="terminal.html">测绘终端</a></nav></header>
<main id="main" class="ms-gal">
  <h1 class="title-section ms-gal__title">组件库</h1>
  <p class="body ms-gal__lead">冷灰与黑，一种光。巨构用墨线和网点画，文字少到只剩标签和读数。</p>
  <nav class="ms-gal__toc" aria-label="组件目录"><ol>${comps.map(([id, zh]) => `<li><a class="ms-link body-sm" href="#${id}">${zh}</a></li>`).join("")}</ol></nav>
  ${comps.map(([id, zh, en, html]) => sec(id, zh, en, html)).join("\n  ")}
</main>
${P.footer(ic)}
${P.dialog(ic)}
<ul class="ms-toasts" data-toasts aria-live="polite"></ul>`;
  return shell({ title: "Megastructure Ink · 组件库", body, cls: "ms-page--gallery" });
}

module.exports = { site, hud, terminal: terminalPage, gallery };
