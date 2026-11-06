"use strict";

// Markup for every component. Each function takes `ic` (icon renderer: sprite <use> on pages,
// inline paths in previews) so pages and previews share one markup source.
const { MARK } = require("./icons.cjs");
const D = require("./data.cjs");

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function bi(zh, en, cls = "") {
  return `<span class="at-bi ${cls}"><span class="at-bi__zh">${esc(zh)}</span><span class="at-bi__en">${esc(en)}</span></span>`;
}

function strip() {
  return '<div class="at-strip" aria-hidden="true"></div>';
}

function search(ic, { id = "q", large = false, value = "", action = "search.html", goLabel = "" } = {}) {
  return `<form class="at-search${large ? " at-search--lg" : ""}" role="search" action="${action}" data-search>
  <input class="at-search__input" id="${id}" name="q" type="search" autocomplete="off" aria-label="搜索条目" placeholder="搜索调查员、武装、物资…" value="${esc(value)}" aria-keyshortcuts="/ Control+K Meta+K" aria-controls="${id}-list" aria-autocomplete="list" aria-expanded="false">
  ${large ? "" : '<span class="at-search__keys at-hide-sm" aria-hidden="true"><kbd class="at-kbd">/</kbd><kbd class="at-kbd">⌘K</kbd></span>'}
  ${goLabel ? `<button class="at-search__go at-search__go--label" type="submit">${ic("search", "at-icon at-icon--sm")}${esc(goLabel)}</button>` : `<button class="at-search__go" type="submit" aria-label="搜索">${ic("search", "at-icon at-icon--sm")}</button>`}
  <ul class="at-suggest" id="${id}-list" role="listbox" aria-label="搜索建议" hidden></ul>
</form>`;
}

function topbar(ic, { notice = true } = {}) {
  return `<header class="at-topbar">
${strip()}
<div class="at-topbar__row">
  <button class="at-iconbtn at-topbar__menu" type="button" aria-label="打开导航" aria-expanded="false" aria-controls="sidenav" data-drawer-open>${ic("menu")}</button>
  <a class="at-brand" href="home.html">${MARK}<span class="at-brand__name">${esc(D.SITE.zh)}</span><span class="at-brand__tag at-hide-sm">${esc(D.SITE.tag)}</span></a>
  <div class="at-topbar__search">${search(ic)}</div>
  <div class="at-topbar__actions">
    <a class="at-iconbtn" href="search.html" aria-label="搜索" data-sm-only>${ic("search")}</a>
    <button class="at-iconbtn at-hide-sm" type="button" aria-label="主题：跟随系统，点击切换" data-theme-toggle>${ic("monitor")}</button>
    ${notice ? `<button class="at-iconbtn at-iconbtn--accent" type="button" aria-label="版本公告（有更新）" aria-haspopup="dialog" data-notice-open>${ic("notice")}<span class="at-iconbtn__dot" aria-hidden="true"></span></button>` : ""}
    <a class="at-iconbtn at-hide-sm" href="entity.html" aria-label="随机条目">${ic("shuffle")}</a>
    <a class="at-iconbtn at-hide-sm" href="article.html" aria-label="帮助">${ic("help")}</a>
    <a class="at-btn at-btn--accent at-hide-sm" href="#" style="--chamfer: var(--chamfer-sm)">${ic("user", "at-icon at-icon--sm")}登录</a>
  </div>
</div>
</header>`;
}

function sidenav(ic, current) {
  const secs = D.NAV.map((sec) => `<nav class="at-nav-sec" aria-labelledby="nav-${sec.id}">
  <button class="at-nav-sec__head" type="button" id="nav-${sec.id}" aria-expanded="true" aria-controls="nav-${sec.id}-list"><span class="at-nav-sec__label">${esc(sec.zh)}</span>${ic("chevronDown", "at-icon at-icon--sm")}</button>
  <ul class="at-nav-sec__list" id="nav-${sec.id}-list">
${sec.items.map((it) => `    <li><a class="at-navlink${it.live ? " at-navlink--live" : ""}" href="${it.href}"${it.id === current ? ' aria-current="page"' : ""} title="${esc(it.zh)}">${ic(it.icon)}${bi(it.zh, it.en)}${it.live ? `<span class="at-chip at-chip--live">${esc(it.live)}</span>` : ""}</a></li>`).join("\n")}
  </ul>
</nav>`).join("\n");
  return `<aside class="at-sidenav" id="sidenav" aria-label="站点导航">
<div class="at-sidenav__scroll">
${secs}
</div>
<div class="at-sidenav__foot"><button class="at-sidenav__toggle" type="button" aria-pressed="false" data-nav-toggle>${ic("collapse")}${bi("收起侧栏", "Collapse")}${ic("chevronLeft", "at-icon at-icon--sm at-chev")}</button></div>
</aside>`;
}

function sechead(zh, en, more, { level = 2, href = "#" } = {}) {
  return `<div class="at-sechead"><h${level} class="at-sechead__title"><span class="at-sechead__zh">${esc(zh)}</span><span class="at-sechead__en">${esc(en)}</span></h${level}>${more ? `<a class="at-sechead__more" href="${href}">${esc(more)} →</a>` : ""}</div>`;
}

function h2(zh, en, id) {
  return `<h2 class="at-h2" id="${id}"><span class="at-h2__t">${esc(zh)}</span><span class="at-h2__en">${esc(en)}</span><span class="at-h2__rule" aria-hidden="true"></span></h2>`;
}

// Placeholder frame for generated art: size, safe area and the task id that briefs it.
function slot({ label = "立绘", en = "Portrait", size = "1200×1600", task = "", safe = "8%", corner = "", bare = false, cls = "" } = {}) {
  return `<div class="at-slot${bare ? " at-slot--bare" : ""} ${cls}" role="img" aria-label="${esc(label)}占位：${esc(size)}${task ? `，出图任务 ${esc(task)}` : ""}" style="--safe: ${safe}"${task ? ` data-task="${esc(task)}"` : ""}>
  ${corner ? `<span class="at-slot__corner">${esc(corner)}</span>` : ""}<span class="at-slot__safe" aria-hidden="true"></span>
  <span class="at-slot__label" aria-hidden="true"><b>${esc(label)} ${esc(en.toUpperCase())}</b><span>${esc(size)}</span>${task ? `<code>${esc(task)}</code>` : ""}</span>
</div>`;
}

function stars(ic, n, { lg = false } = {}) {
  return `<span class="at-stars${lg ? " at-stars--lg" : ""}" role="img" aria-label="${n} 星">${Array.from({ length: n }, () => ic("starFill", "")).join("")}</span>`;
}

function hero(ic, { showcase = false } = {}) {
  const bars = (seed) => Array.from({ length: 14 }, (_, i) => `<i style="--h: ${8 + ((seed * (i + 3) * 37) % 92)}%; --i: ${i}"></i>`).join("");
  const recent = showcase
    ? slot({ label: "卡面", en: "Card", size: "300×400", bare: true, cls: "at-hero__card" })
    : `<a class="at-card" data-rarity="6" href="entity.html" style="width: 96px"><span class="at-card__flag">NEW</span>${slot({ label: "卡面", en: "Card", size: "300×400", task: "agent-card", bare: true })}<span class="at-card__strip" aria-hidden="true"><i></i><i></i><i></i></span><span class="at-card__body"><span class="at-card__names"><span class="at-card__zh">白砾</span><span class="at-card__en">Gravel</span></span></span><span class="at-card__base"></span></a>`;
  return `<section class="at-hero at-brackets" aria-labelledby="hero-title">
  <div class="at-dotgrid" aria-hidden="true"></div>
  <div class="at-hero__main">
    <p class="at-kicker">${esc(D.SITE.kicker)}</p>
    <h1 class="at-hero__title display-hero" id="hero-title">${esc(D.SITE.zh)}</h1>
    <p class="at-hero__sub">${esc(D.SITE.sub)}</p>
    <div class="at-hero__actions">
      <a class="at-btn at-btn--ghost at-btn--lg" href="list.html">${ic("compass", "at-icon at-icon--sm")}浏览档案${ic("chevronRight", "at-icon at-icon--sm at-btn__go")}</a>
      <a class="at-btn at-btn--ghost at-btn--lg" href="article.html">${ic("book", "at-icon at-icon--sm")}编辑指南${ic("chevronRight", "at-icon at-icon--sm at-btn__go")}</a>
    </div>
  </div>
  <div class="at-hero__side">
    <div class="at-hero__cols">
      <section aria-labelledby="hero-new"><h2 class="at-mini-title" id="hero-new">${ic("userPlus", "at-icon at-icon--sm")}近期新增</h2>${recent}</section>
      <section aria-labelledby="hero-bday"><h2 class="at-mini-title" id="hero-bday">${ic("cake", "at-icon at-icon--sm")}即将生日</h2>
        <ul class="at-upcoming">${[["罗鸢", "3 天后"], ["阿涅斯", "9 天后"], ["铁砧", "16 天后"]].map(([n, w]) => `<li><a href="entity.html"><span class="at-avatar" aria-hidden="true">${esc(n.slice(0, 1))}</span><span class="at-upcoming__name">${esc(n)}</span><span class="at-upcoming__when">${esc(w)}</span></a></li>`).join("")}</ul>
      </section>
    </div>
    <section aria-labelledby="hero-stats">
      <div class="at-stats__head"><h2 class="at-mini-title" id="hero-stats">${ic("database", "at-icon at-icon--sm")}实时统计</h2><span class="at-live">同步于 2 小时前</span></div>
      <div class="at-stats">
        ${[["6,204", "条目", "Entries", 3], ["58,317", "次修订", "Revisions", 5], ["27", "位编辑", "Editors", 7]].map(([n, zh, en, s]) => `<div class="at-stat"><div class="at-stat__num stat-number">${n}</div><div class="at-stat__zh">${zh}</div><div class="at-stat__en">${en}</div><div class="at-bars" aria-hidden="true">${bars(s)}</div></div>`).join("")}
      </div>
    </section>
  </div>
</section>`;
}

function feed(ic, { showcase = false, more = true } = {}) {
  const lead = D.NEWS.find((n) => n.lead);
  const rest = D.NEWS.filter((n) => !n.lead);
  const date = (n) => `<span class="at-feed__date"><time datetime="${n.date}">${n.date}</time>${n.fresh ? '<span class="at-chip at-chip--accent">最新</span>' : ""}</span>`;
  return `<section aria-labelledby="feed-h">
${sechead("游戏动态", "Field News", more ? "全部动态" : "", { href: "article.html" }).replace('class="at-sechead__title"', 'class="at-sechead__title" id="feed-h"')}
<div class="at-feed">
  <a class="at-feed__lead" href="article.html">${slot({ label: "活动横幅", en: "Banner", size: "1600×900", task: showcase ? "" : lead.task })}<span class="at-feed__lead-body">${date(lead)}<span class="at-feed__title">${esc(lead.title)}</span></span></a>
  <ol class="at-feed__list">
${rest.map((n) => `    <li class="at-feed__item"><a class="at-feed__link" href="article.html">${n.thumb ? slot({ label: "缩略图", en: "Thumb", size: "416×232", task: showcase ? "" : "news-thumb", bare: true, cls: "at-feed__thumb" }) : ""}<span class="at-feed__text">${date(n)}<span class="at-feed__title">${esc(n.title)}</span></span></a></li>`).join("\n")}
  </ol>
</div>
</section>`;
}

function tiles(ic, { list = D.TILES, more = true } = {}) {
  return `<section aria-labelledby="tiles-h">
${sechead("内容入口", "Contents", more ? "全部分类" : "", { href: "list.html" }).replace('class="at-sechead__title"', 'class="at-sechead__title" id="tiles-h"')}
<ul class="at-tiles">
${list.map((t) => `  <li><a class="at-tile" href="${t.href}"><span class="at-plate" aria-hidden="true">${ic(t.icon, "at-icon at-icon--lg")}</span><span class="at-tile__zh">${esc(t.zh)}</span><span class="at-tile__en">${esc(t.en)}</span>${t.flag ? '<span class="at-tile__flag" aria-label="进行中"></span>' : ""}</a></li>`).join("\n")}
</ul>
</section>`;
}

function card(ic, e, { kind = "agent", showcase = false } = {}) {
  const square = kind === "arms";
  const s = slot({ label: square ? "武装图" : "卡面", en: square ? "Arms" : "Card", size: square ? "800×800" : "600×800", task: showcase ? "" : square ? "arms-render" : e.task || "agent-card", bare: true, corner: square ? "// arms" : "// agents" });
  const tags = square ? [e.type, e.attr] : [e.role, e.arms];
  return `<li><a class="at-card${square ? " at-card--square" : ""}" href="${square ? "item.html" : "entity.html"}" data-rarity="${e.rarity}" data-type="${esc(e.type || e.role)}" data-attr="${esc(e.attr || e.faction)}">${e.flag ? `<span class="at-card__flag${e.flag === "NEW" ? " at-card__flag--dark" : ""}">${e.flag}</span>` : ""}${s}<span class="at-card__strip" aria-hidden="true"><i></i><i></i><i></i></span><span class="at-card__body"><span class="at-card__names"><span class="at-card__zh">${esc(e.zh)}</span><span class="at-card__en">${esc(e.en)}</span></span><span class="at-card__glyph" aria-hidden="true">${ic(square ? "arms" : "agent", "at-icon at-icon--sm")}</span></span><span class="at-card__tags">${stars(ic, e.rarity)}${tags.map((t) => `<span class="at-tag">${esc(t)}</span>`).join("")}</span><span class="at-card__base"></span></a></li>`;
}

function crumbs(ic, trail) {
  return `<nav class="at-crumbs" aria-label="面包屑"><ol><li><a href="home.html" aria-label="首页">${ic("home", "at-icon at-icon--sm")}</a></li>${trail.map((t, i) => i === trail.length - 1 ? `<li><span aria-current="page">${esc(t[0])}</span></li>` : `<li><a href="${t[1]}">${esc(t[0])}</a></li>`).join("")}</ol></nav>`;
}

function pagehead(ic, { trail, title, desc = "", meta = true, tools = true }) {
  return `<header class="at-pagehead">
${crumbs(ic, trail)}
<div class="at-pagehead__row"><h1 class="at-pagehead__title title-page">${esc(title)}</h1>${tools ? `<div class="at-pagehead__tools">
  <button class="at-btn at-btn--tool" type="button" data-copy-link>${ic("link", "at-icon at-icon--sm")}复制链接</button>
  <a class="at-btn at-btn--tool" href="changes.html">${ic("history", "at-icon at-icon--sm")}历史</a>
  <button class="at-btn at-btn--tool" type="button" aria-pressed="false" data-watch>${ic("star", "at-icon at-icon--sm")}关注</button>
  <a class="at-btn at-btn--tool" href="#" aria-disabled="true" title="登录后可编辑">${ic("edit", "at-icon at-icon--sm")}编辑</a>
</div>` : ""}</div>
${desc ? `<p class="at-pagehead__desc">${esc(desc)}</p>` : ""}
${meta ? `<p class="at-pagehead__meta"><span>最近编辑：<code>2041-03-18 21:04</code></span><span>编辑者：霜鸦</span><span>摘要：<em>“补全技能倍率表”</em></span></p>` : ""}
</header>`;
}

function pager(ic, { current = 2, total = 9 } = {}) {
  const n = (i) => i === current ? `<li><a href="#" aria-current="page" aria-label="第 ${i} 页，当前页">${i}</a></li>` : `<li><a href="#" aria-label="第 ${i} 页">${i}</a></li>`;
  return `<nav aria-label="分页"><ul class="at-pager">
  <li><a href="#" aria-label="上一页">${ic("chevronLeft", "at-icon at-icon--sm")}</a></li>
  ${[1, 2, 3].map(n).join("")}<li><span class="at-pager__gap" aria-hidden="true">…</span></li>${n(total)}
  <li><a href="#" aria-label="下一页">${ic("chevronRight", "at-icon at-icon--sm")}</a></li>
</ul></nav>`;
}

function modal(ic, { id = "notice", staticOpen = false } = {}) {
  const tag = staticOpen ? "div" : "dialog";
  return `<${tag} class="at-modal${staticOpen ? " at-modal--static" : ""}" id="${id}" aria-labelledby="${id}-title"${staticOpen ? ' role="dialog"' : ""}>
  <div class="at-modal__tab" aria-hidden="true">v / frostline records</div>
  <div class="at-modal__head">
    <span class="at-modal__icon" aria-hidden="true">${ic("briefcase")}</span>
    <h2 class="at-modal__title" id="${id}-title">冰原回声版本更新</h2>
    <button class="at-modal__close" type="button" aria-label="关闭公告" data-notice-close>${ic("close", "at-icon at-icon--lg")}</button>
  </div>
  <div class="at-modal__bar" aria-hidden="true"></div>
  <div class="at-modal__body">
    <p class="at-modal__meta"><span class="at-chip at-chip--outline at-chip--mono">v2.4.0</span><span class="at-num">2041-03-15</span></p>
    <p class="at-modal__text">各位调查员好：档案已同步 v2.4「冰原回声」版本内容。新调查员「白砾」条目已上线，武装索引新增按属性筛选；极夜远征的委托表会随活动推进逐日补全。发现错漏可以在条目讨论页留言，每一条反馈都会被处理。</p>
    <div class="at-modal__foot"><a class="at-btn at-btn--ghost" href="changes.html">查看更新日志</a><button class="at-btn" type="button" data-notice-close>知道了</button></div>
  </div>
  <div class="at-modal__stripe" aria-hidden="true"><i></i><i></i><i></i></div>
</${tag}>`;
}

function toast(ic, { kind = "loading", text = "正在载入引导…" } = {}) {
  const cls = kind === "error" ? " at-toast--error" : kind === "ok" ? " at-toast--ok" : "";
  return `<li class="at-toast${cls}" role="${kind === "error" ? "alert" : "status"}">${kind === "loading" ? '<span class="at-toast__sweep" aria-hidden="true"></span>' : ""}<span class="at-toast__msg">${esc(text)}</span><button class="at-toast__btn" type="button" data-toast-close>关闭</button></li>`;
}

function empty(ic, { zh = "还没有内容", en = "Nothing Here Yet", text = "", action = "", icon = "info", inline = false } = {}) {
  return `<div class="at-empty${inline ? " at-empty--inline" : ""}"><span class="at-plate" aria-hidden="true">${ic(icon, "at-icon at-icon--lg")}</span><div><p class="at-empty__zh">${esc(zh)}</p><p class="at-empty__en">${esc(en)}</p>${text ? `<p class="at-empty__text">${esc(text)}</p>` : ""}${action}</div></div>`;
}

function footer(ic) {
  return `<footer class="at-footer">
<div class="at-footer__card">
  <div class="at-footer__hello">${MARK}<div><b>欢迎来到${esc(D.SITE.zh)}</b><small>玩家交流群：000 000 000 · 内容反馈：feedback@example.org</small></div></div>
  <a class="at-btn at-btn--ghost" href="article.html">${ic("edit", "at-icon at-icon--sm")}编辑指南</a>
  <a class="at-btn at-btn--ghost" href="article.html">${ic("shield", "at-icon at-icon--sm")}社区规范</a>
  <a class="at-btn at-btn--ghost" href="article.html">${ic("link", "at-icon at-icon--sm")}友情链接</a>
</div>
<ul class="at-footer__links"><li><a href="article.html">关于本站</a></li><li><a href="article.html">隐私政策</a></li><li><a href="article.html">使用条款</a></li><li><a href="article.html">版权声明</a></li><li><a href="article.html">联系我们</a></li></ul>
<p class="at-footer__legal">本站为《霜线》玩家社区维护的非官方资料站（演示内容，游戏与人物均为虚构）。文字内容按 CC BY-NC-SA 4.0 共享；游戏图片与资料版权归其权利人所有。</p>
<p class="at-footer__build">build 2041.03.18 · a1f3e07</p>
</footer>`;
}

module.exports = { esc, bi, strip, search, topbar, sidenav, sechead, h2, slot, stars, hero, feed, tiles, card, crumbs, pagehead, pager, modal, toast, empty, footer };
