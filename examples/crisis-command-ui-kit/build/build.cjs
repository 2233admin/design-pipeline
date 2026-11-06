#!/usr/bin/env node
"use strict";

// Regenerates the kit's generated files from build/*.cjs and design-system/tokens.json:
//   templates/{index,site,console,sync}.html, templates/tokens.css, design-system/components/*/preview.html.
// Hand-written files (bundle.css, pages.css, kit.js, seg.js, every README) are never touched.
//   node examples/crisis-command-ui-kit/build/build.cjs           write
//   node examples/crisis-command-ui-kit/build/build.cjs --check   exit 1 when a file is stale

const fs = require("node:fs");
const path = require("node:path");
const { compileTokensCss } = require("../../../skill/scripts/design-system-package-core.cjs");
const P = require("./parts.cjs");
const pages = require("./pages.cjs");
const D = require("./data.cjs");

const KIT = path.resolve(__dirname, "..");

function preview(group, height, title, sections) {
  const body = sections.map(([label, html]) => `<section class="cc-demo"><p class="cc-demo__label">${P.esc(label)}</p>\n${html}\n</section>`).join("\n");
  return `<!-- @dsCard group="${group}" height=${height} -->
<!doctype html>
<html lang="zh-CN">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${P.esc(title)}</title></head>
<body class="cc-page">
${body}
</body>
</html>
`;
}
const row = (...items) => `<div class="cc-demo__row">${items.join("")}</div>`;
const box = (style, html) => `<div style="${style}">${html}</div>`;

const PREVIEWS = {
  TitleCard: () => preview("Type cards", 1180, "Title card", [
    ["black card: number at half size, one glyph, then the rest after a half-pitch comma", box("--card-h: 420px; width: 560px", P.titleCard(D.REPORTS[0], { tag: "div" }).replace('class="cc-card ', 'style="--card-h: 420px" class="cc-card '))],
    ["paper and red cards, and the vertical number column", row(P.titleCard(D.REPORTS[1], { ground: "paper", tag: "div" }).replace('class="cc-card ', 'style="--card-h: 240px; width: 320px" class="cc-card '), P.titleCard(D.REPORTS[3], { ground: "red", tag: "div" }).replace('class="cc-card ', 'style="--card-h: 240px; width: 320px" class="cc-card '), P.titleCard(D.REPORTS[8], { tag: "div", cls: "cc-card--column" }).replace('class="cc-card ', 'style="--card-h: 240px; width: 320px" class="cc-card '))],
  ]),
  FilmTitle: () => preview("Type cards", 420, "Film title", [["one line compressed to 0.40, a colon and the mark; red-orange, deep red and white", `${P.filmTitle()}${P.filmTitle({ tone: "deep", caption: "" })}${P.filmTitle({ tone: "ink", line: "环海闸务局", mark: "档案", caption: "" })}`]]),
  SectionHeader: () => preview("Type cards", 240, "Section header", [["segment number, compressed Mincho, English caption", `<header class="cc-shead"><span class="cc-shead__no">${P.segs("05", { style: "lcd" })}</span><h2 class="cc-shead__zh head-xl">报告一览</h2><span class="cc-shead__en grot-label">REPORT INDEX</span></header>`]]),
  AlertBand: () => preview("Alarm", 220, "Warning band", [["hazard stripes blinking at 1 Hz around a running line (static: no motion)", P.band({ live: false })], ["live", P.band({ zh: "警告", en: "SYNC CAUTION", text: "闸手 许汀 耦合率低于阈值" })]]),
  HexPanel: () => preview("Alarm", 760, "Hexagon panel", [["main panel: stamps, compressed Mincho, English", box("width: 1100px", P.alertMain())], ["side and lower panels; interactive: rest, hover (forced), idle, disabled", row(box("width: 460px", P.warnHex("LEVEL 3")), box("width: 460px", P.seatHex(D.SEATS[0], { mode: "MODE: CONTAIN" })))], ["", row(box("width: 300px", `<button class="cc-hex cc-hex--low" type="button" style="--h: 120px"><span class="cc-hex__body"><span class="cc-seathex__zh">东缘十二号闸</span></span></button>`), box("width: 300px", `<button class="cc-hex cc-hex--low cc-hex--idle" type="button" style="--h: 120px"><span class="cc-hex__body"><span class="cc-seathex__zh">南堤三号闸</span></span></button>`), box("width: 300px", `<button class="cc-hex cc-hex--low" type="button" style="--h: 120px" disabled><span class="cc-hex__body"><span class="cc-seathex__zh">南堤九号闸 检修</span></span></button>`))]]),
  AlarmWall: () => preview("Alarm", 700, "Alarm wall ground", [["screen blue with the 45-degree lattice and scanlines; panels sit on it", `<div class="cc-wall cc-scan" style="position: relative; height: 560px; padding: var(--space-6)"><div style="width: 980px">${P.alertMain()}</div></div>`]]),
  Stamp: () => preview("Alarm", 300, "Stamp", [["two Mincho characters in a double frame, cut by hairlines: on alarm, amber, alert and ink", `<div class="cc-demo__row"><span class="cc-hex cc-hex--low" style="--h: 210px; width: 330px; display: block"><span class="cc-hex__body">${P.stamp("警报")}</span></span>${P.stamp("可决", { tone: "amber" })}${P.stamp("否决", { tone: "alert" })}${P.stamp("封存", { tone: "ink", cls: "cc-stamp--sm" })}</div>`]]),
  SegmentDigits: () => preview("Data", 320, "Segment digits", [["capsule (thick, upright) and LCD (thin, slanted); drawn, no font", `<p style="margin: 0; font-size: 120px; color: var(--amber)">${P.segs("04:59")}</p><p style="margin: 0; font-size: 72px; color: var(--amber)">${P.segs("00:12:07.53", { style: "lcd" })}</p>`]]),
  Clock: () => preview("Data", 1100, "Countdown clock", [["normal: units at 0.21 of the digit, label in brackets, elapsed LCD", P.clock({ id: "c1" })], ["danger: a hard cut to red-orange", P.clock({ id: "c2", state: "danger", time: "00:00:09" })]]),
  BracketLabel: () => preview("Data", 220, "Bracket label", [["amber, alert and ink", row(P.bracketLabel("蓄压剩余", "RESERVE PRESSURE REMAINING"), P.bracketLabel("东缘十二号闸", "GATE E-12 · NO RESPONSE", { tone: "alert" }), P.bracketLabel("作战开始时刻", "OPERATION START", { tone: "ink" }))]]),
  ModeRow: () => preview("Controls", 300, "Mode row", [["radio group: one lit cell (NORMAL), hover (forced, HOLD), focus (forced, LOW), pressed (forced, SURGE); the danger cell idle", P.modeRow({ current: 3, force: { 1: "is-hover", 2: "is-focus", 4: "is-active" } })], ["danger state: the danger cell fills and blinks; HOLD disabled", `<div class="is-danger">${P.modeRow({ current: 4, disabled: 1, name: "m2" })}</div>`]]),
  StatusPlate: () => preview("Data", 260, "Status plate", [["lit and unlit supply plates", row(box("width: 300px", P.plate("内蓄", "RESERVE", { lit: true })), box("width: 300px", P.plate("外接", "LINKED")))]]),
  RatioReadout: () => preview("Data", 900, "Ratio readout", [["above the threshold", box("width: 640px", P.ratio())], ["below the threshold (alert)", box("width: 640px", P.ratio({ value: "28.4", bar: 0.284, cls: "is-low" }))]]),
  Graph: () => preview("Data", 620, "Graph board", [["1px grid, a heavier line every 5 cells, one bright trace over two dim ones, the dashed border", box("width: 1000px", P.graph())]]),
  Vote: () => preview("Data", 760, "Five-seat vote", [["result with one dissent; hover (forced) on seat 2", box("width: 1100px", P.vote({ id: "v1" }).replace('<button class="cc-seat" type="button" aria-describedby="v1-why-1"', '<button class="cc-seat is-hover" type="button" aria-describedby="v1-why-1"'))], ["voting (loading)", box("width: 1100px", P.vote({ id: "v2", state: "pending" }))]]),
  TerminalLog: () => preview("Data", 520, "Terminal log", [["timestamped lines, an error line, the command field", box("width: 720px", P.log({ id: "lg" }))]]),
  CommandField: () => preview("Controls", 380, "Command field", [["rest, error and disabled", `<div style="display: grid; gap: var(--space-5); width: 560px"><form class="cc-field"><label class="cc-field__label" for="f1"><span class="cc-mincho">指令</span> CMD</label><span class="cc-field__prompt" aria-hidden="true">&gt;</span><input class="cc-field__input" id="f1" placeholder="输入指令，例如 STATUS E-12"><span class="cc-field__hint">回车执行 · ENTER TO RUN</span></form><form class="cc-field is-error"><label class="cc-field__label" for="f2"><span class="cc-mincho">指令</span> CMD</label><span class="cc-field__prompt" aria-hidden="true">&gt;</span><input class="cc-field__input" id="f2" value="OPEN E-99" aria-invalid="true" aria-describedby="f2h"><span class="cc-field__hint" id="f2h">未知闸位 E-99 · UNKNOWN GATE</span></form><form class="cc-field"><label class="cc-field__label" for="f3"><span class="cc-mincho">指令</span> CMD</label><span class="cc-field__prompt" aria-hidden="true">&gt;</span><input class="cc-field__input" id="f3" value="终端锁定中" disabled><span class="cc-field__hint">表决期间不可输入 · LOCKED</span></form></div>`]]),
  CommandBar: () => preview("Shell", 200, "Command bar", [["mark, organisation, nav with the current item, local clock, state", P.topbar({ current: "s-reserve", home: "#" })]]),
  Buttons: () => preview("Controls", 380, "Buttons", [["primary, alert, ghost: rest, hover, pressed, focus, disabled, loading", `${row(P.button("进入终端", { en: "ENTER", icon: "arrow" }), P.button("悬停", { attrs: 'class-x' }).replace('cc-btn--primary" type="button" class-x', 'cc-btn--primary is-hover" type="button"'), P.button("按下", {}).replace('cc-btn--primary"', 'cc-btn--primary is-active"'), P.button("焦点", {}).replace('cc-btn--primary"', 'cc-btn--primary is-focus"'), P.button("不可用", { attrs: "disabled" }), P.button("提交", { attrs: 'aria-busy="true"' }))}${row(P.button("确认授权", { kind: "alert", en: "AUTHORISE" }), P.button("悬停", { kind: "alert" }).replace('cc-btn--alert"', 'cc-btn--alert is-hover"'), P.button("授权中", { kind: "alert", attrs: 'aria-busy="true"' }), P.button("报告一览", { kind: "ghost", en: "REPORTS" }), P.button("悬停", { kind: "ghost" }).replace('cc-btn--ghost"', 'cc-btn--ghost is-hover"'), P.button("已锁定", { kind: "ghost", attrs: "disabled", icon: "lock" }))}${row(`<button class="cc-iconbtn" type="button" aria-label="声音">${P.icon("sound")}</button>`, `<button class="cc-iconbtn cc-iconbtn--sm" type="button" aria-label="关闭">${P.icon("close")}</button>`)}`]]),
  Tabs: () => preview("Controls", 200, "Tabs", [["selected, hover (forced), disabled", P.tabs([["闸位", "GATES"], ["泵站", "PUMPS"], ["人员", "CREW"], ["档案", "ARCHIVE", true]], { id: "tb" }).replace('id="tb-1"', 'id="tb-1" data-x').replace('class="cc-tab" role="tab" type="button" id="tb-1" data-x', 'class="cc-tab is-hover" role="tab" type="button" id="tb-1"')]]),
  DataTable: () => preview("Data", 420, "Sluice table", [["status tags, load bars, the breached row in red-orange, a service row dimmed", box("width: 720px", P.sectorTable())]]),
  Dialog: () => preview("Overlays", 460, "Dialog", [["confirmation with the alert head", P.dialog({ id: "dg", staticOpen: true })]]),
  Toast: () => preview("Overlays", 240, "Toast", [["alert and info", box("width: 460px", `<ul class="cc-toasts">${P.toast()}${P.toast({ kind: "info", zh: "东缘一至十一号闸已关闭", en: "GATES E-01 TO E-11 CLOSED", time: "23:40:55" })}</ul>`)]]),
  ArtSlot: () => preview("Content", 620, "Art slot", [["show mode: an empty monitor (no figure); slot mode (data-slots=1): task, size and safe area", row(box("width: 300px", P.slot({ task: "frame-02", zh: "回澜闸甲", en: "FRAME HUILAN", size: "1200×1600", note: "全身立绘", safe: "6% 12%" })), `<div data-slots="1" style="width: 300px">${P.slot({ task: "frame-02", zh: "回澜闸甲", en: "FRAME HUILAN", size: "1200×1600", note: "全身立绘", safe: "6% 12%" })}</div>`, box("width: 420px", P.slot({ ...pages.TASKS.city })))]]),
  ReportIndex: () => preview("Content", 520, "Report index", [["title cards as a grid; the current one on paper; hover (forced) on the third", `<ul class="cc-rgrid">${D.REPORTS.slice(0, 6).map((r, i) => P.reportCard(r, i, { current: i === 0 })).join("").replace('data-report="2"', 'data-report="2" data-x').replace('class="cc-rcard" type="button" data-report="2" data-x', 'class="cc-rcard is-hover" type="button" data-report="2"')}</ul>`]]),
  Footer: () => preview("Shell", 200, "Footer", [["mark, fiction note, build stamp", P.footer()]]),
};

// Cover: name and tagline bottom-left; right of x = 480 one elongated hexagon in alarm, an amber clock bar,
// a black card block with a white L, and the 45-degree stripe pattern from the band.
function cover() {
  return `<!-- @dsCard height=288 -->
<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Crisis Command</title>
<style>
  .cv { position: relative; width: 960px; height: 288px; background: var(--void); color: var(--ink); font-family: var(--font-sans); overflow: hidden; }
  .cv-text { position: absolute; left: 40px; bottom: 36px; width: 420px; }
  .cv-name { margin: 0; font-family: var(--font-mincho); font-size: 64px; line-height: 1; font-weight: 900; transform: scaleX(0.85); transform-origin: left; }
  .cv-tag { margin: 12px 0 0; color: var(--ink-muted); font-size: 14px; line-height: 20px; }
  .cv-art { position: absolute; left: 500px; top: 16px; }
  .cv-alarm { fill: var(--alarm); }
  .cv-rule { fill: none; stroke: var(--alarm-rule); stroke-width: 6px; }
  .cv-alert { fill: var(--alert); }
  .cv-amber { fill: var(--amber); }
  .cv-ink { fill: var(--ink); }
  .cv-void { fill: var(--void); }
  .cv-paper { fill: var(--paper); }
</style></head>
<body style="margin: 0">
<!-- Derivation: blocks from tokens — alarm (the largest: an elongated hexagon 3.06:1 with 55-degree tips,
     252x82, ruled in alarm-rule at hex-rule 6), amber (a 168x40 clock bar of three capsule segments at the
     digit proportions 0.42 wide), paper (a 120x90 4:3 card with a void L of one tall block and a long
     bar, the title card's composition), alert (a 360x24 band filled with stripes at stripe 12, 45 degrees).
     Pattern: hazard stripes from the warning band. Radii: radius-none everywhere. -->
<div class="cv">
  <div class="cv-text"><h1 class="cv-name">危机指挥终端</h1><p class="cv-tag">Crisis Command: heavy compressed Mincho on black, red hexagon alarms, amber segment clocks.</p></div>
  <svg class="cv-art" width="420" height="256" viewBox="0 0 420 256" aria-hidden="true">
    <polygon class="cv-alarm" points="0,57 29,16 223,16 252,57 223,98 29,98"/>
    <polygon class="cv-rule" points="3,57 31,19 221,19 249,57 221,95 31,95"/>
    <rect class="cv-paper" x="276" y="16" width="120" height="90"/>
    <rect class="cv-void" x="286" y="26" width="26" height="36"/>
    <rect class="cv-void" x="286" y="68" width="96" height="28"/>
    <rect class="cv-amber" x="0" y="124" width="48" height="12"/><rect class="cv-amber" x="0" y="140" width="12" height="40"/><rect class="cv-amber" x="36" y="140" width="12" height="40"/>
    <rect class="cv-amber" x="60" y="124" width="48" height="12"/><rect class="cv-amber" x="96" y="140" width="12" height="40"/><rect class="cv-amber" x="60" y="184" width="48" height="12"/>
    <rect class="cv-amber" x="120" y="124" width="48" height="12"/><rect class="cv-amber" x="156" y="140" width="12" height="56"/>
    <rect class="cv-alert" x="0" y="220" width="400" height="24"/>
    ${Array.from({ length: 18 }, (_, i) => `<polygon class="cv-void" points="${i * 24 + 12},244 ${i * 24 + 24},220 ${i * 24 + 36},220 ${i * 24 + 24},244"/>`).join("")}
    <rect class="cv-void" x="400" y="216" width="20" height="32"/>
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
  files.set("templates/site.html", pages.site());
  files.set("templates/console.html", pages.console());
  files.set("templates/sync.html", pages.sync());
  files.set("templates/index.html", pages.gallery(Object.keys(PREVIEWS)));
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
