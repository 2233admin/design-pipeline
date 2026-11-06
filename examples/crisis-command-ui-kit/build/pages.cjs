"use strict";

// Page structure of the case: the organisation terminal site (six screens), two app screens and the
// gallery. Component markup comes from parts.cjs.
const P = require("./parts.cjs");
const D = require("./data.cjs");

const TASKS = {
  surge: { task: "surge-feed", zh: "声呐影像 · 涌体", en: "SONAR FEED / SURGE BODY", size: "1600×900", ratio: "16 / 9", safe: "8% 10%" },
  city: { task: "city-feed", zh: "第九区俯瞰", en: "ZONE 9 AERIAL", size: "1600×900", ratio: "16 / 9", safe: "8% 10%" },
  pilot: { task: "operator-shen", zh: "闸手 · 沈潮", en: "OPERATOR SHEN CHAO", size: "1200×1600", ratio: "3 / 4", safe: "6% 12%" },
};

function page({ title, body, cls = "", desc = "" }) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${P.esc(title)}</title>
${desc ? `<meta name="description" content="${P.esc(desc)}">` : ""}
<link rel="stylesheet" href="tokens.css">
<link rel="stylesheet" href="../design-system/components/bundle.css">
<link rel="stylesheet" href="pages.css">
<script src="seg.js"></script>
<script src="kit.js" defer></script>
</head>
<body class="cc-page ${cls}" data-slots="0">
<a class="cc-skip" href="#main" data-bleed>跳到正文</a>
${body}
</body>
</html>
`;
}

const shead = (no, zh, en, { tone = "" } = {}) => `<header class="cc-shead${tone ? ` cc-shead--${tone}` : ""}"><span class="cc-shead__no">${P.segs(no, { style: "lcd", label: no })}</span><h2 class="cc-shead__zh head-xl">${P.esc(zh)}</h2><span class="cc-shead__en grot-label">${P.esc(en)}</span></header>`;

function site() {
  const s1 = `<section class="cc-screen cc-s1" id="s-title" aria-labelledby="s1-h">
  <div class="cc-s1__card">${P.titleCard(D.REPORTS[0], { cls: "cc-card--hero" })}</div>
  <div class="cc-s1__side">
    <p class="cc-s1__kicker grot-label">${P.esc(D.ORG.en)}</p>
    <h1 class="cc-s1__h" id="s1-h">${P.filmTitle({ caption: D.WORK.caption }).replace('<p class="cc-film', '<span class="cc-film').replace(/<\/p>$/, "</span>").replace(/<\/p>/g, "</span>")}</h1>
    <p class="cc-s1__lede body">盆地底下的水不会等人。环海闸务局第九排涝区的指挥终端，把水位、闸位、蓄压和五席表决放在同一块屏上。</p>
    <div class="cc-s1__cta">${P.button("进入终端", { kind: "primary", en: "ENTER", href: "console.html", icon: "arrow" })}${P.button("报告一览", { kind: "ghost", en: "REPORTS", href: "#s-reports" })}</div>
    <dl class="cc-s1__stats"><div><dt>水位</dt><dd class="cc-s1__num">${P.segs("+4.21", { style: "lcd", label: "+4.21" })}<span>m</span></dd></div><div><dt>越线闸位</dt><dd class="cc-s1__num cc-s1__num--alert">${P.segs("1", { style: "lcd" })}<span>/ 12</span></dd></div><div><dt>表决</dt><dd class="cc-s1__word">进行中</dd></div></dl>
  </div>
  <div class="cc-s1__band">${P.band()}</div>
</section>`;

  const s2 = `<section class="cc-screen cc-s2 cc-wall cc-scan" id="s-alert" aria-labelledby="s-alert-h">
  ${shead("02", "警报墙", "ALERT WALL").replace("<h2 ", '<h2 id="s-alert-h" ')}
  <div class="cc-s2__honey">
    <div class="cc-s2__l">${P.warnHex("LEVEL 3")}</div>
    <div class="cc-s2__r">${P.warnHex("LEVEL 3")}</div>
    <div class="cc-s2__main">${P.alertMain()}</div>
    <div class="cc-s2__low1">${P.seatHex(D.SEATS[0], { mode: "MODE: CONTAIN" })}</div>
    <div class="cc-s2__low2">${P.seatHex(D.SEATS[4])}</div>
  </div>
  <aside class="cc-s2__side" aria-label="实时影像与通报">${P.slot({ ...TASKS.surge, cls: "cc-s2__feed" })}<ul class="cc-toasts">${P.toast()}${P.toast({ kind: "info", zh: "东缘一至十一号闸已关闭", en: "GATES E-01 TO E-11 CLOSED", time: "23:40:55" })}</ul></aside>
</section>`;

  const s3 = `<section class="cc-screen cc-s3" id="s-reserve" aria-labelledby="s-reserve-h">
  ${shead("03", "蓄压", "RESERVE").replace("<h2 ", '<h2 id="s-reserve-h" ')}
  <div class="cc-s3__grid">
    <div class="cc-s3__clock">${P.clock({ live: true, id: "clock-main" })}${P.modeRow({ current: 3, disabled: 0, name: "pump" })}</div>
    <div class="cc-s3__side">${P.plate("内蓄", "RESERVE", { lit: true, cls: "cc-s3__plate" })}${P.plate("外接", "LINKED", { cls: "cc-s3__plate" })}
      <div class="cc-s3__actions">${P.button("模拟越线", { kind: "alert", en: "SIMULATE BREACH", attrs: 'data-breach aria-pressed="false"', icon: "alert" })}${P.button("暂停计时", { kind: "ghost", en: "PAUSE", attrs: 'data-pause aria-pressed="false"' })}</div>
      <p class="body-s cc-s3__note">外接电网切断后，闸甲只靠内蓄运转。最后十秒数字会硬切成危险红。</p>
    </div>
  </div>
</section>`;

  const s4 = `<section class="cc-screen cc-s4" id="s-coupling" aria-labelledby="s-coupling-h">
  ${shead("04", "耦合", "COUPLING").replace("<h2 ", '<h2 id="s-coupling-h" ')}
  <div class="cc-s4__grid">
    <div class="cc-s4__ratio">${P.ratio({ value: "41.3", bar: 0.413 })}<p class="cc-s4__who head-m">${P.esc(D.PILOTS[0].zh)}<span class="grot-label">${P.esc(D.PILOTS[0].en)} · <span class="cc-mincho">${P.esc(D.PILOTS[0].frame)}</span></span></p></div>
    ${P.graph({ seed: 7, cls: "cc-s4__graph", id: "graph-main", label: "COUPLING / LAST 120 S" })}
    ${P.vote({ cls: "cc-s4__vote", id: "vote-site" })}
  </div>
</section>`;

  const s5 = `<section class="cc-screen cc-s5" id="s-reports" aria-labelledby="s-reports-h">
  ${shead("05", "报告一览", "REPORT INDEX").replace("<h2 ", '<h2 id="s-reports-h" ')}
  <script>window.CC_REPORTS = ${JSON.stringify(D.REPORTS.map((r) => r[4]))};</script>
  <ul class="cc-rgrid">${D.REPORTS.map((r, i) => P.reportCard(r, i, { current: i === 0 })).join("")}</ul>
  <dialog class="cc-dialog cc-report" id="report-dlg" aria-labelledby="report-dlg-h"><div class="cc-dialog__head"><span class="cc-dialog__stripe" aria-hidden="true"></span><h2 class="cc-dialog__title" id="report-dlg-h">${P.bi(D.REPORTS[0][0], "REPORT")}</h2></div><div class="cc-dialog__body"><div class="cc-report__card">${P.titleCard(D.REPORTS[0], { tag: "div", cls: "cc-card--dlg" })}</div><p class="body" data-report-text>${P.esc(D.REPORTS[0][4])}</p></div><div class="cc-dialog__foot">${P.button("关闭", { kind: "ghost", en: "CLOSE", attrs: "data-close" })}</div></dialog>
</section>`;

  const s6 = `<section class="cc-screen cc-s6" id="s-frames" aria-labelledby="s-frames-h">
  ${shead("06", "闸甲档案", "SLUICE FRAMES").replace("<h2 ", '<h2 id="s-frames-h" ')}
  <div class="cc-s6__grid">
    <ul class="cc-frames">${D.FRAMES.map((f) => `<li class="cc-frame">${P.slot({ task: f.task, zh: f.zh, en: f.en, size: "1200×1600", ratio: "3 / 4", safe: "6% 12%", note: "全身立绘" })}<dl class="cc-frame__spec data"><div><dt>全高</dt><dd>${f.height}</dd></div><div><dt>泵送</dt><dd>${f.pump}</dd></div><div><dt>耦合下限</dt><dd>${f.th}</dd></div></dl><p class="cc-frame__state"><span class="cc-tag cc-tag--${f.stateEn === "SORTIE" ? "alert" : f.stateEn === "SEALED" ? "off" : "amber"}">${f.state} ${f.stateEn}</span></p></li>`).join("")}</ul>
    ${P.log({ cls: "cc-s6__log", id: "log-site" })}
  </div>
  ${P.footer()}
</section>`;

  return page({ title: `${D.WORK.zh} · ${D.ORG.zh}${D.ORG.post}`, desc: "原创虚构作品《潮位警报》的组织终端示例站。", cls: "cc-site", body: `${P.topbar({ current: "", home: "site.html" })}\n<main id="main">\n${s1}\n${s2}\n${s3}\n${s4}\n${s5}\n${s6}\n</main>\n<ul class="cc-toasts cc-toasts--float" aria-live="polite" data-toasts></ul>` });
}

function console_() {
  return page({ title: `操作台 · ${D.ORG.post}`, cls: "cc-app cc-console", body: `${P.topbar({ current: "s-alert", home: "site.html" })}
<main id="main" class="cc-console__grid">
  <section class="cc-console__left" aria-label="闸位"><h1 class="cc-console__h head-m">第九排涝区操作台 <span class="grot-label">ZONE 9 CONSOLE</span></h1>${P.tabs([["闸位", "GATES"], ["泵站", "PUMPS"], ["人员", "CREW"], ["档案", "ARCHIVE", true]], { id: "ctabs" })}${P.sectorTable()}${P.bracketLabel("东缘十二号闸", "GATE E-12 · NO RESPONSE", { tone: "alert", cls: "cc-console__pick" })}</section>
  <section class="cc-console__mid" aria-label="警报与影像"><div class="cc-console__alert cc-wall cc-scan">${P.alertMain()}</div>${P.slot({ ...TASKS.city, cls: "cc-console__feed" })}</section>
  <section class="cc-console__right" aria-label="日志">${P.log({ id: "log-console" })}${P.button("申请强制开闸", { kind: "alert", en: "REQUEST FORCE OPEN", attrs: 'data-open="dlg-console"' })}${P.vote({ id: "vote-console" })}</section>
  <section class="cc-console__bottom" aria-label="蓄压">${P.clock({ live: true, id: "clock-console", time: "00:59:41" }).replace("cc-clock ", "cc-clock cc-clock--compact ")}${P.modeRow({ current: 2, disabled: 4, name: "console" })}</section>
</main>
${P.dialog({ id: "dlg-console" })}
<ul class="cc-toasts cc-toasts--float" aria-live="polite" data-toasts></ul>` });
}

function sync() {
  return page({ title: `出动耦合监视 · ${D.ORG.post}`, cls: "cc-app cc-sync", body: `${P.topbar({ current: "s-coupling", home: "site.html" })}
<main id="main" class="cc-sync__grid">
  <section class="cc-sync__pilot" aria-label="闸手"><h1 class="cc-sync__h head-m">出动耦合监视 <span class="grot-label">SORTIE COUPLING</span></h1>${P.slot({ ...TASKS.pilot, cls: "cc-sync__slot" })}${P.plate("出动", "SORTIE · FRAME 02", { lit: true })}</section>
  <section class="cc-sync__graphs" aria-label="耦合曲线">${D.PILOTS.map((p, i) => `<div class="cc-sync__row"><p class="cc-sync__name head-m">${P.esc(p.zh)}<span class="grot-label">${P.esc(p.en)} · <span class="cc-mincho">${P.esc(p.frame)}</span></span></p>${P.graph({ seed: 7 + i * 5, label: `COUPLING ${p.ratio}%`, th: 0.3, cls: "cc-sync__graph" })}</div>`).join("")}</section>
  <section class="cc-sync__side" aria-label="判定">${P.ratio({ value: "41.3", bar: 0.413 })}${P.vote({ id: "vote-sync", state: "pending" })}${P.button("强制启动", { kind: "alert", en: "FORCE START", attrs: 'data-open="dlg-sync"' })}</section>
  <div class="cc-sync__band">${P.band({ zh: "警告", en: "SYNC CAUTION", text: "闸手 许汀 耦合率低于阈值" })}</div>
</main>
${P.dialog({ id: "dlg-sync" })}
<ul class="cc-toasts cc-toasts--float" aria-live="polite" data-toasts></ul>` });
}

function gallery(components) {
  const items = components.map((c) => `<li><a class="cc-gal__item" href="../design-system/components/${c}/preview.html"><span class="head-m">${c}</span><span class="grot-label">COMPONENT</span></a></li>`).join("");
  return page({ title: "Crisis Command UI kit", cls: "cc-gallery", body: `<main id="main" class="cc-gal">
  <header class="cc-gal__head">${P.titleCard(["组件库", "危", "机", "指挥"], { cls: "cc-card--gal", tag: "div" })}<div><h1 class="head-xl">Crisis Command</h1><p class="body">危机指挥终端语法的组件库与原创示例《潮位警报》。字卡、六边形警报墙、段码计时、耦合曲线与五席表决。</p><p class="grot-label">PAGES</p><ul class="cc-gal__pages"><li><a href="site.html">组织终端站 SITE</a></li><li><a href="site.html?slot=1">占位模式 SLOT MODE</a></li><li><a href="console.html">操作台 CONSOLE</a></li><li><a href="sync.html">耦合监视 SYNC</a></li></ul></div></header>
  <section aria-labelledby="gal-c"><h2 class="head-l" id="gal-c">组件 <span class="grot-label">${components.length} COMPONENTS</span></h2><ul class="cc-gal__grid">${items}</ul></section>
</main>` });
}

module.exports = { site, console: console_, sync, gallery, TASKS };
