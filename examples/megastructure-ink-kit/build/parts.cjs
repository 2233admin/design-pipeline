"use strict";

// Markup for every component. Each function takes `ic` (icon renderer: sprite <use> on pages, inline
// paths in previews) where it draws icons, so pages and previews share one markup source.
const D = require("./data.cjs");
const G = require("../templates/glyphs.js");

// Data faces carry Latin, digits and a few symbols only: a string with CJK goes to the sans face.
const CJK = /[^\u0000-\u024f\u00b0\u00b7\u00d7\u2013\u2014\u2212\u2190\u2192]/;
const dataCls = (text, cls = "data-sm") => (CJK.test(String(text)) ? "label" : cls);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// A label: 中文 over a Latin caps line.
function bi(zh, en, cls = "") {
  return `<span class="ms-bi${cls ? ` ${cls}` : ""}"><span class="ms-bi__zh">${esc(zh)}</span><span class="ms-bi__en caps">${esc(en)}</span></span>`;
}

// Rail-script line with its reading. The glyphs are decoration; the reading is the text.
// A signed depth inside a reading goes in the data face: the CJK subset has no U+2212, and the grammar
// sets numbers in `data` anyway.
function readingHtml(reading) {
  return esc(reading).replace(/−\d[\d,.]*(?: ?m)?/g, (n) => `<span class="ms-glyphline__num data-sm">${n}</span>`);
}

function glyphline(text, reading = text, { size = 12, cls = "" } = {}) {
  return `<span class="ms-glyphline${cls ? ` ${cls}` : ""}">${G.svg(text, { size })}<span class="ms-glyphline__read">${readingHtml(reading)}</span></span>`;
}

function brand({ small = false } = {}) {
  return `<a class="ms-brand${small ? " ms-brand--sm" : ""}" href="site.html#top" aria-label="${esc(D.SITE.zh)} ${esc(D.SITE.en)} 首页">${G.svg(D.SITE.en, { size: small ? 9 : 10, cls: "ms-glyphs ms-brand__glyphs" })}<span class="ms-brand__zh ms-compress" aria-hidden="true">${esc(D.SITE.zh)}</span><span class="ms-brand__en caps" aria-hidden="true">${esc(D.SITE.en)}</span></a>`;
}

function topbar(ic, { current = "top", page = "site.html" } = {}) {
  const items = D.NAV.map((n) => `<li><a class="ms-nav__link" href="${page}#${n.id}"${n.id === current ? ' aria-current="true"' : ""}><span class="ms-nav__zh">${esc(n.zh)}</span><span class="ms-nav__depth data-sm">−${esc(n.depth)}</span></a></li>`).join("");
  return `<header class="ms-topbar" data-topbar>
  ${brand()}
  <nav class="ms-nav" aria-label="主导航" id="nav"><ul class="ms-nav__list">${items}</ul></nav>
  <div class="ms-topbar__tools">
    <span class="ms-live" title="通讯静默中"><span class="ms-live__dot" aria-hidden="true"></span><span class="label">静默</span></span>
    <button class="ms-btn ms-btn--sm" type="button" data-dialog-open="reserve">预约下潜</button>
    <button class="ms-iconbtn ms-topbar__menu" type="button" aria-label="打开导航" aria-expanded="false" aria-controls="nav" data-menu>${ic("menu")}</button>
  </div>
</header>`;
}

// Vertical depth ruler on the right edge: ticks every 8px, one entry per section.
function rail({ current = "top" } = {}) {
  return `<nav class="ms-rail" aria-label="深度导航"><ol class="ms-rail__list">${D.NAV.map((n) => `<li><a class="ms-rail__item" href="#${n.id}"${n.id === current ? ' aria-current="true"' : ""}><span class="ms-rail__depth data-sm">${esc(n.depth)}</span><span class="ms-rail__zh label">${esc(n.zh)}</span></a></li>`).join("")}</ol><p class="ms-rail__unit data-sm" aria-hidden="true">×10 m</p></nav>`;
}

// Scale marker: a 1-unit tick for a person beside a bracket for the structure.
function scale({ small = "1.7 m", smallZh = "测深员", large = "3,400 m", largeZh = "竖井宽度", ratio = "1 : 2,000", cls = "" } = {}) {
  return `<figure class="ms-scale${cls ? ` ${cls}` : ""}" aria-label="比例：${esc(smallZh)} ${esc(small)}，${esc(largeZh)} ${esc(large)}">
  <span class="ms-scale__small" aria-hidden="true"></span>
  <span class="ms-scale__large" aria-hidden="true"></span>
  <figcaption class="ms-scale__cap"><span class="data-sm">${esc(small)}</span><span class="label">${esc(smallZh)}</span><span class="ms-scale__sep" aria-hidden="true">/</span><span class="data-sm">${esc(large)}</span><span class="label">${esc(largeZh)}</span><span class="ms-scale__ratio data-sm">${esc(ratio)}</span></figcaption>
</figure>`;
}

function sechead({ no, zh, en, depth, id }) {
  return `<header class="ms-sechead">
  <p class="ms-sechead__no data-sm">${esc(no)} / ${esc(D.NAV.length).padStart(2, "0")}</p>
  <h2 class="ms-sechead__title title-section"${id ? ` id="${id}"` : ""}>${esc(zh)}</h2>
  <p class="ms-sechead__en caps">${esc(en)}</p>
  <p class="ms-sechead__depth display-depth">−${esc(depth)}<span class="ms-sechead__unit data-sm">m</span></p>
</header>`;
}

// Label plate: an icon tile, a dark plate with a thin label, a small caption under it.
function plate({ zh, en, icon = "signal", tone = "", note = "" }, ic) {
  return `<span class="ms-plate${tone ? ` ms-plate--${tone}` : ""}"><span class="ms-plate__tile">${ic(icon, "ms-icon ms-icon--sm")}</span><span class="ms-plate__body"><span class="ms-plate__zh label">${esc(zh)}</span><span class="ms-plate__en caps">${esc(en)}</span></span>${note ? `<span class="ms-plate__note ${dataCls(note)}">${esc(note)}</span>` : ""}</span>`;
}

function readout({ zh, en, value, unit = "", state = "" }) {
  return `<div class="ms-readout${state ? ` is-${state}` : ""}"><p class="ms-readout__label">${bi(zh, en)}</p><p class="ms-readout__value"><span class="readout${CJK.test(value) ? " is-cjk" : ""}">${esc(value)}</span>${unit ? `<span class="ms-readout__unit ${dataCls(unit)}">${esc(unit)}</span>` : ""}</p></div>`;
}

// Segmented gauge: n cells, the first `on` lit.
function gauge({ zh, en, value, total = 24, text, vertical = false, state = "" }) {
  const on = Math.round(value * total);
  return `<div class="ms-gauge${vertical ? " ms-gauge--v" : ""}${state ? ` is-${state}` : ""}" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(value * 100)}" aria-label="${esc(zh)}"><p class="ms-gauge__label">${bi(zh, en)}<span class="ms-gauge__val data-sm">${esc(text)}</span></p><span class="ms-gauge__cells" aria-hidden="true">${Array.from({ length: total }, (_, i) => `<i${i < on ? ' class="on"' : ""}></i>`).join("")}</span></div>`;
}

function alert(ic, { zh = "检测到缄默体", en = "HUSH CONTACT", text = "回声出现 3 处缺口。关闭外放，保持静默。", live = true } = {}) {
  return `<div class="ms-alert" role="${live ? "alert" : "note"}"><span class="ms-alert__icon">${ic("alert")}</span><div class="ms-alert__body"><p class="ms-alert__title">${bi(zh, en)}</p><p class="ms-alert__text body-sm">${esc(text)}</p></div><span class="ms-alert__code data-sm" aria-hidden="true">ALR-2410</span></div>`;
}

function terminal(lines = D.BOARD.lines, { id = "term", title = "接线台 7 号", en = "SWITCHBOARD 07", cursor = true } = {}) {
  return `<section class="ms-term" aria-labelledby="${id}-h"><header class="ms-term__head"><h3 class="ms-term__title" id="${id}-h">${bi(title, en)}</h3><span class="ms-term__state data-sm">LINE 0412</span></header><ol class="ms-term__lines" data-term="${id}" aria-live="polite">${lines.map(([t, k, s]) => `<li class="ms-term__line is-${k.toLowerCase()}"><span class="ms-term__time data-sm">${esc(t)}</span><span class="ms-term__kind data-sm">${esc(k)}</span><span class="ms-term__text body-sm">${esc(s)}</span></li>`).join("")}</ol>${cursor ? '<p class="ms-term__prompt"><span class="data-sm">&gt;</span><span class="ms-term__cursor" aria-hidden="true"></span></p>' : ""}</section>`;
}

function handshake(ic, { id = "hs", state = "idle" } = {}) {
  const steps = [["唤醒", "WAKE"], ["握手", "HANDSHAKE"], ["鉴权", "VERIFY"], ["接入", "CONNECT"]];
  const status = { idle: ["0", "", ""], run: ["1", "2", ""], fail: ["2", "", "3"] }[state];
  return `<div class="ms-hs" data-hs="${id}" data-state="${state}"><ol class="ms-hs__steps">${steps.map(([zh, en], i) => {
    const done = i < Number(status[0]) || (state === "run" && i < 1);
    const cur = String(i + 1) === status[1];
    const fail = String(i + 1) === status[2];
    return `<li class="ms-hs__step${done ? " is-done" : ""}${cur ? " is-current" : ""}${fail ? " is-fail" : ""}"><span class="ms-hs__no data-sm">0${i + 1}</span>${bi(zh, en)}</li>`;
  }).join("")}</ol><p class="ms-hs__msg body-sm" data-hs-msg aria-live="polite">${state === "fail" ? "接入被拒绝：缺少回声钥。" : state === "run" ? "正在握手……" : "接线台空闲。发送握手以请求接入总台。"}</p><div class="ms-hs__actions"><button class="ms-btn" type="button" data-hs-send${state === "run" ? ' aria-busy="true"' : ""}>${ic("terminal", "ms-icon ms-icon--sm")}发送握手</button><button class="ms-btn ms-btn--ghost" type="button" disabled>${ic("lock", "ms-icon ms-icon--sm")}使用回声钥</button></div></div>`;
}

function tabs(id, items, selected = 0, { disabled = [] } = {}) {
  return `<div class="ms-tabs" role="tablist" aria-label="${esc(id)}">${items.map(([zh, en], i) => `<button class="ms-tab" role="tab" type="button" id="${id}-t${i}" aria-selected="${i === selected}" tabindex="${i === selected ? 0 : -1}"${disabled.includes(i) ? " disabled" : ""}>${bi(zh, en)}</button>`).join("")}</div>`;
}

function toggle({ id, zh, en, on = false, disabled = false }) {
  return `<label class="ms-switch" for="${id}"><input class="ms-switch__input" type="checkbox" role="switch" id="${id}"${on ? " checked" : ""}${disabled ? " disabled" : ""}><span class="ms-switch__track" aria-hidden="true"><span class="ms-switch__knob"></span></span>${bi(zh, en)}</label>`;
}

function radios({ name, legend, en, items, checked = 0 }) {
  return `<fieldset class="ms-radios"><legend class="ms-radios__legend">${bi(legend, en)}</legend>${items.map((it, i) => `<label class="ms-radio"><input type="radio" name="${name}" value="${i}"${i === checked ? " checked" : ""}${it.disabled ? " disabled" : ""}><span class="ms-radio__mark" aria-hidden="true"></span><span class="data-sm">${esc(it.label)}</span></label>`).join("")}</fieldset>`;
}

function loader({ zh = "测深中", en = "SOUNDING", pct = 62, id = "ld" } = {}) {
  return `<div class="ms-loader" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-labelledby="${id}-l"><p class="ms-loader__label" id="${id}-l">${bi(zh, en)}<span class="ms-loader__pct data-sm">${pct}%</span></p><span class="ms-loader__track" aria-hidden="true"><span class="ms-loader__fill" style="width: ${pct}%"></span><span class="ms-loader__scan"></span></span></div>`;
}

function field({ id, zh, en, value = "", placeholder = "", state = "", hint = "", disabled = false }) {
  return `<div class="ms-field${state ? ` is-${state}` : ""}"><label class="ms-field__label" for="${id}">${bi(zh, en)}</label><input class="ms-field__input data-sm" id="${id}" name="${id}" type="text" autocomplete="off" value="${esc(value)}" placeholder="${esc(placeholder)}"${state === "invalid" ? ` aria-invalid="true" aria-describedby="${id}-hint"` : hint ? ` aria-describedby="${id}-hint"` : ""}${disabled ? " disabled" : ""}>${hint ? `<p class="ms-field__hint body-sm" id="${id}-hint">${esc(hint)}</p>` : ""}</div>`;
}

// Art slot. Show mode: a procedural structure plate drawn into the canvas (no figures), or nothing
// when the slot has no plate (the card carries itself with type and data). Slot mode: the frame,
// its size, safe area and task id.
function slot(id, { cls = "", ratio = "", label = true } = {}) {
  const s = D.SLOTS[id];
  if (!s) throw new Error(`unknown slot ${id}`);
  const plateAttr = s.plate ? ` data-plate='${JSON.stringify(s.plate)}'` : "";
  return `<figure class="ms-slot${cls ? ` ${cls}` : ""}" data-task="${id}" data-size="${s.size}"${ratio ? ` style="aspect-ratio: ${ratio}"` : ""}>${s.plate ? `<canvas class="ms-slot__plate"${plateAttr} aria-hidden="true"></canvas>` : ""}<span class="ms-slot__safe" style="inset: ${s.safe.split(" ").length === 1 ? s.safe : s.safe}" aria-hidden="true"></span>${label ? `<figcaption class="ms-slot__cap"><span class="label">${esc(s.zh)}</span><span class="data-sm">${esc(s.size)}</span><span class="data-sm">TASK ${esc(id)}</span></figcaption>` : ""}</figure>`;
}

// A member's sounding trace: an abstract echo waveform drawn from a seed (decoration).
function trace(seed, { w = 240, h = 48 } = {}) {
  let a = seed * 9301 + 49297; const r = () => ((a = (a * 9301 + 49297) % 233280) / 233280);
  let d = `M0 ${h / 2}`;
  for (let x = 4; x <= w; x += 4) {
    const k = x / w; const env = Math.exp(-Math.pow((k - 0.18 - (seed % 5) * 0.1) * 6, 2)) + 0.35 * Math.exp(-Math.pow((k - 0.7) * 9, 2));
    d += `L${x} ${(h / 2 + (r() - 0.5) * h * 0.9 * env).toFixed(1)}`;
  }
  return `<svg class="ms-trace" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M0 ${h / 2}H${w}" class="ms-trace__base"/><path d="${d}"/></svg>`;
}

function member(m, { active = false, ic } = {}) {
  return `<li class="ms-member${active ? " is-active" : ""}"><button class="ms-member__btn" type="button" aria-pressed="${active}" data-member="${m.id}">
  ${slot(`member-${m.id}`, { cls: "ms-member__slot", label: false })}
  <span class="ms-member__show" aria-hidden="true">${trace(m.trace)}<span class="ms-member__big data-sm" data-deco>${esc(m.code)}</span></span>
  <span class="ms-member__meta"><span class="ms-member__code data-sm">${esc(m.code)}</span><span class="ms-member__name title-block">${esc(m.zh)}</span><span class="caps">${esc(m.en)} · ${esc(m.roleEn)}</span></span>
  <span class="ms-member__rec"><span class="label">最深</span><span class="data-sm">−${esc(m.record)}</span></span>
</button></li>`;
}

function dossier(m, ic) {
  return `<article class="ms-dossier" aria-labelledby="dossier-${m.id}" data-dossier="${m.id}">
  <header class="ms-dossier__head">${plate({ zh: m.role, en: m.roleEn, icon: "user", note: m.code }, ic)}<h3 class="ms-dossier__name title-section" id="dossier-${m.id}">${esc(m.zh)}</h3>${glyphline(m.en, m.en, { size: 10 })}</header>
  <blockquote class="ms-dossier__quote body">“${esc(m.quote)}”</blockquote>
  <dl class="ms-dossier__stats">${m.stats.map(([k, v]) => `<div><dt class="label">${esc(k)}</dt><dd class="readout${CJK.test(v) ? " is-cjk" : ""}">${esc(v)}</dd></div>`).join("")}</dl>
  <p class="ms-dossier__rec">${bi("最深记录", "DEEPEST")}<span class="readout">−${esc(m.record)}</span><span class="label">层</span></p>
</article>`;
}

function logs(list = D.LOGS) {
  return `<ol class="ms-logs">${list.map((l) => `<li class="ms-log"><a class="ms-log__link" href="#logs"><span class="ms-log__date data-sm">${esc(l.date)}</span><span class="ms-log__kind">${bi(l.kind, l.kindEn)}</span><span class="ms-log__title body-sm">${esc(l.title)}</span><span class="ms-log__code data-sm">${esc(l.code)}</span></a></li>`).join("")}</ol>`;
}

function pager(ic, { current = 1, total = 6 } = {}) {
  return `<nav class="ms-pager" aria-label="通讯分页"><a class="ms-iconbtn" href="#logs" aria-label="上一页"${current === 1 ? ' aria-disabled="true"' : ""}>${ic("arrow", "ms-icon ms-icon--flip")}</a>${Array.from({ length: total }, (_, i) => `<a class="ms-pager__n data-sm" href="#logs"${i + 1 === current ? ' aria-current="page"' : ""}>${String(i + 1).padStart(2, "0")}</a>`).join("")}<a class="ms-iconbtn" href="#logs" aria-label="下一页">${ic("arrow")}</a></nav>`;
}

function table() {
  return `<div class="ms-tablewrap"><table class="ms-table"><caption class="label">已知层段</caption><thead><tr><th scope="col" class="label">层段</th><th scope="col" class="label">名称</th><th scope="col" class="label">状态</th></tr></thead><tbody>${D.STRATA.map((s) => `<tr${s.state === "测量中" ? ' class="is-current"' : ""}><td class="data-sm">${esc(s.from)} – ${esc(s.to)}</td><td>${bi(s.zh, s.en)}</td><td><span class="ms-state is-${{ 关闭: "off", 已测: "ok", 危险: "alarm", 测量中: "live", 未知: "off" }[s.state]}">${esc(s.state)}</span></td></tr>`).join("")}</tbody></table></div>`;
}

// Strata cross-section: bands with depth labels, two shafts and the you-are-here mark (diagram).
function strataMap({ id = "sm" } = {}) {
  const bands = D.STRATA.map((s, i) => `<li class="ms-smap__band${s.state === "测量中" ? " is-current" : ""}${s.state === "危险" ? " is-alarm" : ""}" style="--h: ${[6, 14, 20, 16, 14, 30][i]}"><span class="ms-smap__depth data-sm">${esc(s.from)}</span><span class="ms-smap__name label">${esc(s.zh)}</span></li>`).join("");
  return `<figure class="ms-smap" aria-labelledby="${id}-cap"><ol class="ms-smap__bands">${bands}</ol><span class="ms-smap__shaft" style="--x: 34%" aria-hidden="true"></span><span class="ms-smap__shaft ms-smap__shaft--b" style="--x: 71%" aria-hidden="true"></span><span class="ms-smap__here" aria-hidden="true"></span><figcaption class="ms-smap__cap" id="${id}-cap">${bi("剖面 · 已知层段", "KNOWN STRATA")}</figcaption></figure>`;
}

function hudframe(inner, { cls = "", label = "" } = {}) {
  return `<div class="ms-hudframe${cls ? ` ${cls}` : ""}"><span class="ms-hudframe__c ms-hudframe__c--tl" aria-hidden="true"></span><span class="ms-hudframe__c ms-hudframe__c--tr" aria-hidden="true"></span><span class="ms-hudframe__c ms-hudframe__c--bl" aria-hidden="true"></span><span class="ms-hudframe__c ms-hudframe__c--br" aria-hidden="true"></span>${label ? `<span class="ms-hudframe__label data-sm">${esc(label)}</span>` : ""}${inner}</div>`;
}

function dialog(ic, { id = "reserve", staticOpen = false } = {}) {
  return `<dialog class="ms-dialog" id="${id}" aria-labelledby="${id}-h"${staticOpen ? " open" : ""}>${hudframe(`<form method="dialog" class="ms-dialog__form"><header class="ms-dialog__head"><h2 class="title-block" id="${id}-h">预约下潜</h2><p class="caps">RESERVE A DESCENT</p><button class="ms-iconbtn ms-dialog__close" value="cancel" aria-label="关闭">${ic("close")}</button></header>${field({ id: `${id}-call`, zh: "呼号", en: "CALL SIGN", placeholder: "S-00", hint: "只收大写字母、数字和连字符。" })}${radios({ name: `${id}-plat`, legend: "平台", en: "PLATFORM", items: D.PLATFORMS.map((p) => ({ label: p.en })) })}<footer class="ms-dialog__foot"><button class="ms-btn ms-btn--ghost" value="cancel">取消</button><button class="ms-btn" value="ok" data-reserve-ok>${ic("check", "ms-icon ms-icon--sm")}确认预约</button></footer></form>`, { label: "FORM 01" })}</dialog>`;
}

function toast(ic, { kind = "info", text = "已登记呼号 S-41。", en = "LOGGED" } = {}) {
  const icon = { info: "signal", ok: "check", alarm: "alert" }[kind];
  return `<li class="ms-toast is-${kind}" role="status">${ic(icon, "ms-icon ms-icon--sm")}<span class="body-sm">${esc(text)}</span><span class="caps">${esc(en)}</span><button class="ms-iconbtn ms-iconbtn--sm" type="button" aria-label="关闭" data-toast-close>${ic("close", "ms-icon ms-icon--sm")}</button></li>`;
}

function footer(ic) {
  return `<footer class="ms-footer"><div class="ms-footer__brand">${brand({ small: true })}<p class="body-sm">《穹井》是为本组件库虚构的作品。名称、人物、组织与文字均为原创。</p></div><nav class="ms-footer__links" aria-label="页脚"><a class="ms-link body-sm" href="#">用户协议</a><a class="ms-link body-sm" href="#">隐私说明</a><a class="ms-link body-sm" href="#">家长须知</a><a class="ms-link body-sm" href="index.html">组件库</a></nav><div class="ms-footer__rating">${plate({ zh: "适龄 16+", en: "AGE 16+", icon: "scale" }, ic)}</div><p class="ms-footer__stamp data-sm">TX-0412 · BUILD 2026.11.06 · ${G.svg("end of line", { size: 8 })}</p></footer>`;
}

module.exports = { CJK, dataCls, esc, bi, glyphline, brand, topbar, rail, scale, sechead, plate, readout, gauge, alert, terminal, handshake, tabs, toggle, radios, loader, field, slot, trace, member, dossier, logs, pager, table, strataMap, hudframe, dialog, toast, footer };
