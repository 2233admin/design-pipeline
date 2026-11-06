"use strict";

// Markup for every component, shared by the pages and the previews. Text is escaped here; segment digits
// come from templates/seg.js so the static markup and the live clocks draw the same shapes.
const D = require("./data.cjs");
const seg = require("../templates/seg.js");

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const bi = (zh, en, cls = "") => `<span class="cc-bi ${cls}"><span class="cc-bi__zh">${esc(zh)}</span><span class="cc-bi__en">${esc(en)}</span></span>`;

// The placeholder mark: three sluice bars over a water line (no letter shapes).
const MARK = '<svg class="cc-mark" viewBox="0 0 40 40" aria-hidden="true" focusable="false"><rect x="6" y="5" width="6" height="25"/><rect x="17" y="5" width="6" height="25"/><rect x="28" y="5" width="6" height="25"/><rect x="2" y="33" width="36" height="4"/></svg>';

const ICON = {
  alert: '<path d="M12 3 22 20H2z"/><path d="M12 9v5M12 17h.01"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  play: '<path d="M7 4v16l13-8z"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  lock: '<rect x="5" y="11" width="14" height="10"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  sound: '<path d="M4 9v6h4l6 4V5L8 9z"/><path d="M17 8a5 5 0 0 1 0 8"/>',
};
const icon = (name, cls = "cc-icon") => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true" focusable="false">${ICON[name]}</svg>`;

const segs = (text, { style = "capsule", cls = "", label = "" } = {}) => `<span class="cc-seg ${cls}" data-seg="${esc(text)}" data-seg-style="${style}">${seg.svg(text, style, label || text)}</span>`;

// ---- type cards -----------------------------------------------------------------------------
function titleCard([num, l1, l2a, l2b], { ground = "black", cls = "", tag = "figure", id = "", heading = false } = {}) {
  const h = heading ? "h1" : "p";
  return `<${tag} class="cc-card cc-card--${ground} ${cls}"${id ? ` id="${id}"` : ""}>
  <p class="cc-card__num">${esc(num)}</p>
  <${h} class="cc-card__title"><span class="cc-card__l1">${esc(l1)}</span><span class="cc-card__l2">${esc(l2a)}<span class="cc-card__comma">、</span>${esc(l2b)}</span></${h}>
</${tag}>`;
}
function filmTitle({ line = D.WORK.film, mark = D.WORK.mark, caption = D.WORK.caption, tone = "alert", cls = "" } = {}) {
  return `<p class="cc-film cc-film--${tone} ${cls}"><span class="cc-film__line">${esc(line)}<span class="cc-film__colon">：</span>${esc(mark)}</span>${caption ? `<span class="cc-film__cap">${esc(caption)}</span>` : ""}</p>`;
}

// ---- alarm parts ----------------------------------------------------------------------------
function band({ zh = "警报", en = "EMERGENCY", text = "第九排涝区 水位越线", live = true } = {}) {
  // The running line repeats one message as decoration (it slides under the stripes and past the edge);
  // the band's label carries the message once for assistive technology.
  const unit = `<span class="cc-band__unit"><b data-deco data-bleed>${esc(zh)}</b><i data-deco data-bleed>${esc(en)}</i><span data-deco data-bleed>${esc(text)}</span></span>`;
  return `<div class="cc-band${live ? " is-live" : ""}" role="status" aria-label="${esc(`${zh} ${en} ${text}`)}"><span class="cc-band__stripe" aria-hidden="true"></span><div class="cc-band__track" aria-hidden="true"><div class="cc-band__run">${unit.repeat(4)}</div></div><span class="cc-band__stripe" aria-hidden="true"></span></div>`;
}
function stamp(text = "警报", { tone = "", cls = "" } = {}) {
  return `<span class="cc-stamp${tone ? ` cc-stamp--${tone}` : ""} ${cls}">${esc(text)}</span>`;
}
function hex(content, { size = "", tone = "", cls = "", attrs = "" } = {}) {
  return `<div class="cc-hex${size ? ` cc-hex--${size}` : ""}${tone ? ` cc-hex--${tone}` : ""} ${cls}" ${attrs}><div class="cc-hex__body">${content}</div></div>`;
}
function alertMain({ title1 = D.ALERT.title1, title2 = D.ALERT.title2, latin1 = D.ALERT.latin1, latin2 = D.ALERT.latin2 } = {}) {
  return hex(`${stamp("警报")}<div class="cc-alertmain__copy"><p class="cc-alertmain__zh"><span>${esc(title1)}</span><span>${esc(title2)}</span></p><p class="cc-alertmain__en">${esc(latin1)}<br>${esc(latin2)}</p></div>${stamp("警报")}`, { size: "main", cls: "cc-alertmain" });
}
function warnHex(level = "LEVEL 3") {
  return hex(`<span class="cc-warn__tri" aria-hidden="true"></span><span class="cc-warn__lvl">${esc(level)}</span><span class="cc-warn__word">WARNING</span>`, { size: "side", cls: "cc-warn" });
}
function seatHex([zh, en, , ], { mode = "" } = {}) {
  return hex(`${mode ? `<span class="cc-modebox">${esc(mode)}</span>` : ""}<span class="cc-seathex__zh">表决${esc(zh)}</span><span class="cc-seathex__en">QUINTET ${esc(en.replace("SEAT ", ""))}</span>`, { size: "low", cls: "cc-seathex" });
}

// ---- clocks, labels, modes, plates -----------------------------------------------------------
function bracketLabel(zh, en, { tone = "", cls = "" } = {}) {
  return `<p class="cc-blabel${tone ? ` cc-blabel--${tone}` : ""} ${cls}"><span class="cc-blabel__zh">${esc(zh)}</span><span class="cc-blabel__en">${esc(en)}</span></p>`;
}
function clock({ time = "04:59:58", elapsed = "00:12:07.53", state = "normal", id = "clock", live = false } = {}) {
  const [h, m, s] = time.split(":");
  return `<div class="cc-clock cc-clock--${state}" id="${id}"${live ? " data-clock" : ""}>
  ${bracketLabel("蓄压剩余", "RESERVE PRESSURE REMAINING")}
  <div class="cc-clock__main" role="timer" aria-live="off" aria-label="蓄压剩余 ${h} 时 ${m} 分 ${s} 秒">${segs(h, { cls: "cc-clock__pair", label: `${h}` })}<span class="cc-clock__unit">时</span>${segs(m, { cls: "cc-clock__pair", label: `${m}` })}<span class="cc-clock__unit">分</span>${segs(s, { cls: "cc-clock__pair", label: `${s}` })}<span class="cc-clock__unit">秒</span></div>
  <div class="cc-clock__sub"><span class="cc-clock__tag">T+ ELAPSED</span>${segs(elapsed, { style: "lcd", cls: "cc-clock__lcd" })}</div>
</div>`;
}
function modeRow({ current = 3, disabled = 0, name = "mode", cls = "", force = {} } = {}) {
  const items = [["停泵", "HOLD"], ["低速", "LOW"], ["常速", "NORMAL"], ["全开", "SURGE"]];
  return `<div class="cc-modes ${cls}" role="radiogroup" aria-label="泵送模式 PUMP MODE">${items.map(([zh, en], i) => `<button class="cc-mode${force[i + 1] ? ` ${force[i + 1]}` : ""}" type="button" role="radio" aria-checked="${i + 1 === current}" tabindex="${i + 1 === current ? 0 : -1}"${i + 1 === disabled ? " disabled" : ""} data-group="${name}"><span class="cc-mode__en">${en}</span><span class="cc-mode__zh">${zh}</span></button>`).join("")}<span class="cc-danger" data-danger><span>DANGER</span><span>EMERGENCY</span></span></div>`;
}
function plate(zh, en, { lit = false, cls = "" } = {}) {
  return `<div class="cc-plate${lit ? " is-lit" : ""} ${cls}"><span class="cc-plate__zh">${esc(zh)}</span><span class="cc-plate__en">${esc(en)}</span></div>`;
}
function ratio({ value = "41.3", zh = "耦合率", en = "COUPLING RATIO", bar = 0.413, th = 0.3, cls = "" } = {}) {
  return `<div class="cc-ratio ${cls}" style="--fill: ${bar}; --th: ${th}">${bracketLabel(zh, en, { tone: "amber" })}<p class="cc-ratio__value">${segs(value, { label: `${value}%` })}<span class="cc-ratio__pct">%</span></p><div class="cc-ratio__bar" aria-hidden="true"><span></span></div><p class="cc-ratio__th">阈值 ${(th * 100).toFixed(1)} · 低于即切断</p></div>`;
}

// ---- graph, vote, log -----------------------------------------------------------------------
function trace(seedNum, base, amp, n, w, h) {
  let v = (seedNum * 2654435761) >>> 0; const rnd = () => ((v = (v * 1664525 + 1013904223) >>> 0) / 4294967296);
  let y = base; const pts = [];
  for (let i = 0; i <= n; i += 1) { y = Math.min(0.95, Math.max(0.05, y + (rnd() - 0.5) * amp)); pts.push(`${((i / n) * w).toFixed(1)} ${(y * h).toFixed(1)}`); }
  return `M${pts.join("L")}`;
}
function graph({ seed = 7, cls = "", label = "COUPLING / 120 S", th = 0.3, id = "" } = {}) {
  const w = 1000; const h = 500;
  let grid = ""; let major = "";
  for (let i = 0; i <= 25; i += 1) (i % 5 ? (grid += `M${i * 40} 0v${h}`) : (major += `M${i * 40} 0v${h}`));
  for (let j = 0; j <= 12; j += 1) (j % 5 ? (grid += `M0 ${j * 40}h${w}`) : (major += `M0 ${j * 40}h${w}`));
  return `<figure class="cc-graph ${cls}"${id ? ` id="${id}"` : ""}><svg class="cc-graph__svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><path class="cc-graph__grid" d="${grid}"/><path class="cc-graph__major" d="${major}"/><path class="cc-graph__trace cc-graph__trace--dim" d="${trace(seed + 1, 0.7, 0.08, 60, w, h)}"/><path class="cc-graph__trace cc-graph__trace--dim" d="${trace(seed + 2, 0.55, 0.1, 60, w, h)}"/><path class="cc-graph__trace" data-live-trace d="${trace(seed, 0.38, 0.06, 90, w, h)}"/><path class="cc-graph__th" d="M0 ${(1 - th) * h}H${w}"/></svg><figcaption class="cc-graph__cap"><span>${esc(label)}</span><span class="cc-graph__tag">BORDER ${(th * 100).toFixed(1)}%</span></figcaption></figure>`;
}
function vote({ seats = D.SEATS, state = "done", cls = "", id = "vote" } = {}) {
  const no = seats.filter((s) => s[2] === "否").length;
  return `<section class="cc-vote ${cls}${state === "pending" ? " is-pending" : ""}" id="${id}" aria-labelledby="${id}-h"><div class="cc-vote__head"><h3 class="cc-vote__title" id="${id}-h">五席表决</h3><p class="cc-vote__result" aria-live="polite">${state === "pending" ? "表决中 · VOTING" : `可决 ${seats.length - no} · 否决 ${no}`}</p></div><ol class="cc-vote__seats">${seats.map(([zh, en, v, why], i) => `<li><button class="cc-seat${v === "否" ? " is-no" : ""}" type="button" aria-describedby="${id}-why-${i}"${state === "pending" ? ' aria-busy="true"' : ""}><span class="cc-seat__en">${esc(en)}</span><span class="cc-seat__v">${state === "pending" ? "" : esc(v)}</span></button><span class="cc-seat__why" id="${id}-why-${i}">${esc(zh)} · ${esc(why)}</span></li>`).join("")}</ol></section>`;
}
function log({ lines = D.LOG, cls = "", input = true, id = "log" } = {}) {
  return `<section class="cc-log ${cls}" aria-labelledby="${id}-h"><h3 class="cc-log__title" id="${id}-h">${bi("终端日志", "TERMINAL LOG")}</h3><ol class="cc-log__lines" data-log>${lines.map(([t, k, msg]) => `<li class="cc-log__line cc-log__line--${k.toLowerCase()}"><time>${t}</time><b>${k}</b><span>${esc(msg)}</span></li>`).join("")}</ol>${input ? `<form class="cc-field" data-cmd><label class="cc-field__label" for="${id}-in"><span class="cc-mincho">指令</span> CMD</label><span class="cc-field__prompt" aria-hidden="true">&gt;</span><input class="cc-field__input" id="${id}-in" name="cmd" autocomplete="off" spellcheck="false" placeholder="输入指令，例如 STATUS E-12" aria-describedby="${id}-hint"><span class="cc-field__hint" id="${id}-hint">回车执行 · ENTER TO RUN</span></form>` : ""}</section>`;
}

// ---- shell, buttons, tabs, tables, dialog, toast, slots --------------------------------------
function topbar({ current = "", home = "site.html" } = {}) {
  return `<header class="cc-bar">
  <a class="cc-bar__brand" href="${home}">${MARK}<span class="cc-bar__org">${esc(D.ORG.zh)}</span><span class="cc-bar__post">${esc(D.ORG.postEn)}</span></a>
  <nav class="cc-bar__nav" aria-label="主导航"><ul>${D.NAV.map((n) => `<li><a class="cc-nav" href="${home === "#" ? "#" : home}#${n.id}"${n.id === current ? ' aria-current="true"' : ""}>${bi(n.zh, n.en)}</a></li>`).join("")}</ul></nav>
  <div class="cc-bar__status"><span class="cc-bar__clockl">本地标准时</span>${segs("23:41:07", { style: "lcd", cls: "cc-bar__clock", label: "23:41:07" })}<span class="cc-state" data-state><span class="cc-mincho">常态</span> NORMAL</span><button class="cc-iconbtn cc-bar__menu" type="button" aria-label="打开导航" aria-expanded="false" data-menu>${icon("menu")}</button></div>
</header>`;
}
function button(label, { kind = "primary", en = "", icon: ic = "", attrs = "", href = "" } = {}) {
  const inner = `${ic ? icon(ic, "cc-icon cc-icon--sm") : ""}<span class="cc-btn__zh">${esc(label)}</span>${en ? `<span class="cc-btn__en">${esc(en)}</span>` : ""}`;
  return href ? `<a class="cc-btn cc-btn--${kind}" href="${href}" ${attrs}>${inner}</a>` : `<button class="cc-btn cc-btn--${kind}" type="button" ${attrs}>${inner}</button>`;
}
function tabs(items, { current = 0, id = "tabs", cls = "" } = {}) {
  return `<div class="cc-tabs ${cls}" role="tablist" aria-label="${esc(items.map((t) => t[0]).join(" / "))}">${items.map(([zh, en, dis], i) => `<button class="cc-tab" role="tab" type="button" id="${id}-${i}" aria-selected="${i === current}" tabindex="${i === current ? 0 : -1}"${dis ? " disabled" : ""}>${bi(zh, en)}</button>`).join("")}</div>`;
}
function sectorTable({ rows = D.SECTORS, cls = "", caption = '<span class="cc-mincho">闸位一览</span> SLUICE GATES' } = {}) {
  const tone = { 常态: "ok", 警戒: "amber", 越线: "alert", 检修: "off" };
  return `<div class="cc-tablewrap ${cls}"><table class="cc-table"><caption>${caption}</caption><thead><tr><th scope="col">编号</th><th scope="col">闸位</th><th scope="col">状态</th><th scope="col" class="is-num">负荷</th></tr></thead><tbody>${rows.map(([code, name, st, en, load]) => `<tr class="cc-row cc-row--${tone[st]}"><td class="cc-table__code">${code}</td><td>${esc(name)}</td><td><span class="cc-tag cc-tag--${tone[st]}">${esc(st)} ${en}</span></td><td class="is-num"><span class="cc-load" style="--v: ${load}"><span></span></span>${load ? `${Math.round(load * 100)}%` : "—"}</td></tr>`).join("")}</tbody></table></div>`;
}
function dialog({ id = "dlg", open = false, staticOpen = false } = {}) {
  return `<dialog class="cc-dialog${staticOpen ? " is-static" : ""}" id="${id}" aria-labelledby="${id}-h"${open || staticOpen ? " open" : ""}><div class="cc-dialog__head"><span class="cc-dialog__stripe" aria-hidden="true"></span><h2 class="cc-dialog__title" id="${id}-h">${bi("强制开闸", "FORCE OPEN · E-12")}</h2></div><div class="cc-dialog__body"><p>第五席否决尚未撤回。强制开启十二号闸需要值班长与局长两级授权，且会记入当夜报告。</p><dl class="cc-kv"><div><dt>闸位</dt><dd>E-12 东缘十二号闸</dd></div><div><dt>表决</dt><dd>可决 4 · 否决 1</dd></div><div><dt>预计泄流</dt><dd>1,450 m³/s</dd></div></dl></div><div class="cc-dialog__foot">${button("取消", { kind: "ghost", en: "CANCEL", attrs: "data-close" })}${button("确认授权", { kind: "alert", en: "AUTHORISE", attrs: "data-confirm" })}</div></dialog>`;
}
function toast({ kind = "alert", zh = "十二号闸无响应", en = "GATE E-12 NO RESPONSE", time = "23:41:02" } = {}) {
  return `<li class="cc-toast cc-toast--${kind}" role="${kind === "alert" ? "alert" : "status"}"><span class="cc-toast__icon">${icon(kind === "alert" ? "alert" : "arrow")}</span><span class="cc-toast__text">${bi(zh, en)}</span><time class="cc-toast__time">${time}</time><button class="cc-iconbtn cc-iconbtn--sm" type="button" aria-label="关闭">${icon("close")}</button></li>`;
}
function slot({ task, zh, en, size, safe = "8%", ratio = "3 / 4", cls = "", note = "" }) {
  return `<figure class="cc-slot ${cls}" data-task="${task}" style="aspect-ratio: ${ratio}; --safe: ${safe}"><div class="cc-slot__screen" aria-hidden="true"><span class="cc-slot__cross"></span></div><figcaption class="cc-slot__cap"><span class="cc-slot__zh">${esc(zh)}</span><span class="cc-slot__en">${esc(en)}</span><span class="cc-slot__meta">FEED PENDING · <span class="cc-mincho">影像待入</span></span><span class="cc-slot__task">美术位 ${esc(task)} · ${esc(size)}${note ? ` · ${esc(note)}` : ""} · 安全区 ${esc(safe)}</span></figcaption></figure>`;
}
function reportCard(r, i, { current = false } = {}) {
  return `<li><button class="cc-rcard${current ? " is-current" : ""}" type="button" data-report="${i}" aria-haspopup="dialog">${titleCard(r.slice(0, 4), { ground: current ? "paper" : "black", tag: "span", cls: "cc-card--mini" }).replace(/<p class=/g, "<span class=").replace(/<\/p>/g, "</span>")}<span class="cc-rcard__meta">${esc(r[0])} · ${esc(r[1] + r[2] + "、" + r[3])}</span></button></li>`;
}
function footer() {
  return `<footer class="cc-footer"><div class="cc-footer__brand">${MARK}<span>${esc(D.ORG.zh)}</span><span class="cc-footer__en">${esc(D.ORG.en)}</span></div><p class="cc-footer__note">《${esc(D.WORK.zh)}》是虚构作品。本页的组织、人物、地名与事件均为原创，与任何现实或既有作品无关。</p><p class="cc-footer__stamp">RSA-TERM 9.3.0 · BUILD 2026-11-06</p></footer>`;
}

module.exports = { esc, bi, MARK, icon, segs, titleCard, filmTitle, band, stamp, hex, alertMain, warnHex, seatHex, bracketLabel, clock, modeRow, plate, ratio, graph, vote, log, topbar, button, tabs, sectorTable, dialog, toast, slot, reportCard, footer };
