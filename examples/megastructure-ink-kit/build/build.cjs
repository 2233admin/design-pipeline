#!/usr/bin/env node
"use strict";

// Regenerates the kit's generated files from build/*.cjs and design-system/tokens.json:
//   templates/*.html, templates/tokens.css, design-system/components/*/preview.html.
// Hand-written files (bundle.css, kit.js, plates.js, glyphs.js, every README) are never touched.
//   node examples/megastructure-ink-kit/build/build.cjs           write
//   node examples/megastructure-ink-kit/build/build.cjs --check   exit 1 when a file is stale

const fs = require("node:fs");
const path = require("node:path");
const { compileTokensCss } = require("../../../skill/scripts/design-system-package-core.cjs");
const P = require("./parts.cjs");
const pages = require("./pages.cjs");
const D = require("./data.cjs");
const { inline: ic } = require("./icons.cjs");

const KIT = path.resolve(__dirname, "..");

function preview(group, height, title, sections) {
  const body = sections.map(([label, markup, attrs = ""]) => `<section class="ms-demo"${attrs ? ` ${attrs}` : ""}><p class="ms-demo__label">${P.esc(label)}</p>\n${markup}\n</section>`).join("\n");
  return `<!-- @dsCard group="${group}" height=${height} -->
<!doctype html>
<html lang="zh-CN">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${P.esc(title)}</title></head>
<body class="ms-page">
${body}
</body>
</html>
`;
}
const row = (...items) => `<div class="ms-row">${items.join("")}</div>`;
const M = D.MEMBERS;

const PREVIEWS = {
  TopBar: () => preview("Shell", 200, "Top bar", [["top bar: rail-script mark, compressed name, nav with depths (current item), silence indicator, reserve button", P.topbar(ic, { current: "bureau" }).replace('<header class="ms-topbar" data-topbar>', '<header class="ms-topbar" data-topbar style="position: static">')]]),
  DepthRail: () => preview("Shell", 640, "Depth rail", [["right-edge depth ruler: 8px minor ticks, 64px majors, one entry per section, current marked", `<div style="position: relative; height: 560px; width: var(--rail-w)">${P.rail({ current: "hush" }).replace('<nav class="ms-rail"', '<nav class="ms-rail" style="position: absolute; top: 0; height: 100%"')}</div>`]]),
  ScaleMarker: () => preview("Signature", 260, "Scale marker", [["person-height tick beside a structure bracket, with the ratio", `${P.scale({})}<div style="height: var(--space-8)"></div>${P.scale({ small: "1.7 m", large: "18,000 m", largeZh: "可见深度", ratio: "1 : 10,600" })}`]]),
  GlyphLine: () => preview("Signature", 300, "Rail script", [["the kit's own glyphs on a baseline rail, always with a reading", ["vaultwell", "sounding bureau", "echo key", "keep silent"].map((t, i) => P.glyphline(t, t.toUpperCase(), { size: [10, 14, 18, 24][i] })).join('<div style="height: var(--space-4)"></div>')]]),
  SectionHead: () => preview("Content", 300, "Section head", [["number, thin tracked title, caps line and the giant depth numeral", P.sechead({ no: "03", zh: "测深署", en: "SOUNDING BUREAU", depth: "8,600" })]]),
  Buttons: () => preview("Controls", 280, "Buttons", [["primary (signal), ghost, danger and icon buttons in rest, hover, active, focus, disabled and loading", `${row('<button class="ms-btn" type="button">开始下潜</button>', '<button class="ms-btn is-hover" type="button">悬停</button>', '<button class="ms-btn is-active" type="button">按下</button>', '<button class="ms-btn is-focus" type="button">焦点</button>', '<button class="ms-btn" type="button" disabled>不可用</button>', '<button class="ms-btn" type="button" aria-busy="true">提交</button>')}${row('<button class="ms-btn ms-btn--ghost ms-btn--lg" type="button">先导影像</button>', '<button class="ms-btn ms-btn--ghost is-hover" type="button">悬停</button>', '<button class="ms-btn ms-btn--ghost" type="button" aria-busy="true">载入</button>', `<button class="ms-btn ms-btn--danger" type="button">${ic("alert", "ms-icon ms-icon--sm")}断开线路</button>`, '<button class="ms-btn ms-btn--sm" type="button">预约下潜</button>')}${row(`<button class="ms-iconbtn" type="button" aria-label="菜单">${ic("menu")}</button>`, `<button class="ms-iconbtn is-hover" type="button" aria-label="下潜">${ic("down")}</button>`, `<button class="ms-iconbtn is-focus" type="button" aria-label="关闭">${ic("close")}</button>`, `<a class="ms-iconbtn" href="#" aria-label="上一页" aria-disabled="true">${ic("arrow", "ms-icon ms-icon--flip")}</a>`)}`]]),
  LabelPlate: () => preview("Signature", 220, "Label plate", [["icon tile, dark plate with a thin label, a caption: panel, screen and alarm tones", row(P.plate({ zh: "实况", en: "LIVE", icon: "signal", note: "03:12:44" }, ic), P.plate({ zh: "通讯", en: "COMMS", icon: "wave", tone: "screen", note: "LINE 0412" }, ic), P.plate({ zh: "警报", en: "ALARM", icon: "alert", tone: "alarm", note: "ALR-2410" }, ic))]]),
  Readout: () => preview("Data", 200, "Readout", [["label, tabular number and unit: rest, live and alarm", row(P.readout({ zh: "已测层", en: "SOUNDED", value: "4,112" }), P.readout({ zh: "当前深度", en: "DEPTH", value: "−41,200", unit: "m", state: "live" }), P.readout({ zh: "距离", en: "RANGE", value: "1,240", unit: "m", state: "alarm" }))]]),
  Gauge: () => preview("Data", 360, "Gauge", [["segmented gauges: horizontal at rest and alarm, vertical", `<div style="display: flex; gap: var(--space-12); align-items: flex-start"><div style="width: 360px">${P.gauge({ zh: "外压", en: "PRESSURE", value: 0.74, text: "4,120 kPa" })}${P.gauge({ zh: "氧", en: "OXYGEN", value: 0.31, text: "31%", state: "alarm" })}</div>${P.gauge({ zh: "下沉", en: "DESCENT", value: 0.42, text: "4.2 m/s", vertical: true, total: 20 })}</div>`]]),
  AlertBanner: () => preview("Feedback", 220, "Alert", [["alarm banner: red edge, pulsing outer frame (below 3 flashes a second), icon and code", P.alert(ic, { live: false })]]),
  TerminalLog: () => preview("Signature", 400, "Terminal log", [["screen panel with 3px scanlines: time, kind and line; an error line; the blinking cursor", P.terminal(D.BOARD.lines, { id: "pv-term" })]]),
  Handshake: () => preview("Signature", 560, "Handshake", [["switchboard handshake: idle, running (busy) and refused", `${P.handshake(ic, { id: "pv1" })}${P.handshake(ic, { id: "pv2", state: "run" })}${P.handshake(ic, { id: "pv3", state: "fail" })}`]]),
  Tabs: () => preview("Controls", 160, "Tabs", [["bilingual tabs: selected, hover, disabled", P.tabs("示例", [["全部", "ALL"], ["信标", "BEACON"], ["版本", "UPDATE"], ["锁定", "LOCKED"]], 0, { disabled: [3] }).replace('id="示例-t1"', 'id="示例-t1" style="background: var(--panel-hover)"')]]),
  SwitchRadio: () => preview("Controls", 220, "Switch and radio", [["switches on, off and disabled; a radio group with a disabled option", `${row(P.toggle({ id: "pv-q", zh: "静默模式", en: "SILENT MODE", on: true }), P.toggle({ id: "pv-s", zh: "外放", en: "SPEAKER" }), P.toggle({ id: "pv-a", zh: "自动敲击", en: "AUTO TAP", disabled: true }))}<div style="height: var(--space-6)"></div>${P.radios({ name: "pv-line", legend: "线路", en: "LINE", items: [{ label: "0412" }, { label: "0413" }, { label: "0419", disabled: true }] })}`]]),
  Field: () => preview("Controls", 220, "Field", [["text field: rest, invalid with hint, disabled", `<div class="ms-row ms-row--top">${P.field({ id: "pv-f1", zh: "呼号", en: "CALL SIGN", placeholder: "S-00" })}${P.field({ id: "pv-f2", zh: "呼号", en: "CALL SIGN", value: "s 41", state: "invalid", hint: "只收大写字母、数字和连字符。" })}${P.field({ id: "pv-f3", zh: "回声钥", en: "ECHO KEY", value: "未持有", disabled: true })}</div>`]]),
  Loader: () => preview("Feedback", 200, "Loader", [["progress with a scanning head; percentage in signal", `${P.loader({ id: "pv-l1" })}<div style="height: var(--space-6)"></div>${P.loader({ id: "pv-l2", zh: "回声解算", en: "ECHO SOLVE", pct: 12 })}`]]),
  MemberCard: () => preview("Content", 600, "Member card", [["show mode: echo trace and code instead of a figure (pressed, rest)", `<ul class="ms-members ms-members--gal">${M.slice(0, 2).map((m, i) => P.member(m, { active: i === 0, ic })).join("")}</ul>`], ["slot mode: portrait frame with size and task id", `<ul class="ms-members ms-members--gal">${M.slice(2, 4).map((m) => P.member(m, { ic })).join("")}</ul>`, 'data-mode="slot"']]),
  Dossier: () => preview("Content", 460, "Dossier", [["selected member: role plate, thin name, rail-script reading, quote, stats, deepest record", `<div style="max-width: 520px">${P.dossier(M[0], ic)}</div>`]]),
  LogList: () => preview("Content", 400, "Log list", [["dated transmissions: date, kind, title, code; pager with the current page", `${P.logs(D.LOGS.slice(0, 4))}${P.pager(ic, { current: 1, total: 6 })}`]]),
  DataTable: () => preview("Data", 420, "Data table", [["strata table: depth range, bilingual name, state dot (off, ok, live, alarm)", P.table()]]),
  StrataMap: () => preview("Data", 560, "Strata map", [["cross-section diagram: bands, shafts, you-are-here diamond", `<div style="height: 500px; max-width: 360px">${P.strataMap({ id: "pv-sm" })}</div>`]]),
  HudFrame: () => preview("Signature", 300, "HUD frame", [["hairline corners with a label; the alarm variant", `<div class="ms-row ms-row--top"><div style="width: 320px">${P.hudframe('<p class="body-sm ms-pad">框角 14px，发丝线。</p>', { label: "FRAME 01" })}</div><div style="width: 320px">${P.hudframe('<p class="body-sm ms-pad">警报框：红角，按节拍亮灭。</p>', { cls: "ms-hudframe--alarm", label: "TRACK 3 / LOST" })}</div></div>`]]),
  ArtSlot: () => preview("Content", 360, "Art slot", [["slot mode: frame, diagonal hairlines, dashed safe area, size and task id", `<div class="ms-row ms-row--top"><div style="width: 400px">${P.slot("log-thumb", { ratio: "16 / 9" })}</div><div style="width: 180px">${P.slot("member-wendi", { ratio: "2 / 3" })}</div></div>`, 'data-mode="slot"']]),
  Dialog: () => preview("Overlays", 560, "Dialog", [["reserve dialog drawn open: HUD frame, field, radio group, actions", P.dialog(ic, { id: "pv-dlg", staticOpen: true }).replace('<dialog class="ms-dialog"', '<dialog class="ms-dialog" style="position: static; margin: 0"')]]),
  Toast: () => preview("Feedback", 240, "Toast", [["info, success and alarm toasts", `<ul class="ms-toasts ms-toasts--static">${P.toast(ic)}${P.toast(ic, { kind: "ok", text: "预约已提交。", en: "SENT" })}${P.toast(ic, { kind: "alarm", text: "线路 0419 中断。", en: "LINE DOWN" })}</ul>`]]),
  Footer: () => preview("Shell", 300, "Footer", [["brand, fiction notice, links, rating plate, build stamp in rail script", P.footer(ic)]]),
};

// Cover: name and tagline bottom-left; right of x = 480 the palette at full value (void largest, then
// panel, line, signal, alarm) over the 8px ruler the system measures depth with.
function cover() {
  const ticks = [];
  for (let i = 0; i <= 52; i++) ticks.push(`<rect class="${i % 8 === 0 ? "cv-major" : "cv-minor"}" x="${i * 8}" y="${i % 8 === 0 ? 0 : 12}" width="1" height="${i % 8 === 0 ? 28 : 16}"/>`);
  return `<!-- @dsCard height=288 -->
<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Megastructure Ink</title>
<style>
  .cv { position: relative; width: 960px; height: 288px; background: var(--ground); color: var(--text); font-family: var(--font-sans); overflow: hidden; }
  .cv-text { position: absolute; left: 40px; bottom: 36px; width: 420px; }
  .cv-name { margin: 0; font-family: var(--font-wide); font-size: 34px; line-height: 1.1; font-weight: 400; letter-spacing: .08em; }
  .cv-tag { margin: 12px 0 0; color: var(--text-muted); font-size: 14px; line-height: 20px; font-weight: 300; }
  .cv-art { position: absolute; left: 500px; top: 24px; }
  .cv-void { fill: var(--void); }
  .cv-panel { fill: var(--panel-raised); }
  .cv-line { fill: var(--line); }
  .cv-signal { fill: var(--signal); }
  .cv-alarm { fill: var(--alarm); }
  .cv-paper { fill: var(--paper); }
  .cv-major { fill: var(--line); }
  .cv-minor { fill: var(--rule-strong); }
</style></head>
<body style="margin: 0">
<!-- Derivation: blocks from tokens — void (the largest, 248x160: the system is mostly black), panel-raised
     (112x72), paper (112x72: the print ground of the ink plates), line (a 1px hairline frame drawn as 4 thin
     bars), signal as one 3px slit (the system's single light, kept as small as it is on a page) and alarm as a
     6x6 square. Pattern: the depth ruler at tick (8px) with a major every 64px, along the top, from size
     tokens. Radii: radius-none. -->
<div class="cv">
  <div class="cv-text"><h1 class="cv-name">MEGASTRUCTURE INK</h1><p class="cv-tag">Black and cold grey, one light, white hairlines; structures drawn in ink, almost no words.</p></div>
  <svg class="cv-art" width="420" height="240" viewBox="0 0 420 240" aria-hidden="true">
    <g>${ticks.join("")}</g>
    <rect class="cv-void" x="0" y="44" width="248" height="160"/>
    <rect class="cv-line" x="0" y="44" width="248" height="1"/><rect class="cv-line" x="0" y="203" width="248" height="1"/><rect class="cv-line" x="0" y="44" width="1" height="160"/><rect class="cv-line" x="247" y="44" width="1" height="160"/>
    <rect class="cv-signal" x="40" y="148" width="132" height="3"/>
    <rect class="cv-panel" x="264" y="44" width="112" height="72"/>
    <rect class="cv-paper" x="264" y="132" width="112" height="72"/>
    <rect class="cv-alarm" x="392" y="44" width="6" height="6"/>
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
  files.set("templates/index.html", pages.gallery());
  files.set("templates/site.html", pages.site());
  files.set("templates/hud.html", pages.hud());
  files.set("templates/terminal.html", pages.terminal());
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
