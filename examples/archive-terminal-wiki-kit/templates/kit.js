/* Archive Terminal wiki kit: behaviour for the page templates. Vanilla JS, no dependencies.
   Theme, side nav collapse, mobile drawer, search shortcut and suggestions, version notice,
   tabs, sortable tables, filters, toasts, copy link. Every control works by keyboard. */
(function () {
  "use strict";
  var root = document.documentElement;
  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
  };

  // ---------- theme: system -> light -> dark -> system ----------
  var THEMES = ["system", "light", "dark"];
  var LABEL = { system: "跟随系统", light: "亮色", dark: "暗色" };
  var ICON = { system: "monitor", light: "sun", dark: "moon" };
  var media = window.matchMedia ? matchMedia("(prefers-color-scheme: dark)") : null;
  function applyTheme(pref) {
    var dark = pref === "dark" || (pref === "system" && media && media.matches);
    root.dataset.theme = dark ? "dark" : "light";
    $$("[data-theme-toggle]").forEach(function (b) {
      var next = THEMES[(THEMES.indexOf(pref) + 1) % THEMES.length];
      b.setAttribute("aria-label", "主题：" + LABEL[pref] + "，点击切换为" + LABEL[next]);
      b.title = "主题：" + LABEL[pref];
      var u = b.querySelector("use"); if (u) u.setAttribute("href", "#i-" + ICON[pref]);
    });
  }
  var themePref = store.get("at-theme") || "system";
  applyTheme(themePref);
  if (media && media.addEventListener) media.addEventListener("change", function () { if (themePref === "system") applyTheme("system"); });
  $$("[data-theme-toggle]").forEach(function (b) {
    b.addEventListener("click", function () {
      themePref = THEMES[(THEMES.indexOf(themePref) + 1) % THEMES.length];
      store.set("at-theme", themePref); applyTheme(themePref);
      toast("已切换为" + LABEL[themePref] + "主题", "ok", 2200);
    });
  });

  // ---------- side nav: sections, collapse, drawer ----------
  $$(".at-nav-sec__head").forEach(function (h) {
    h.addEventListener("click", function () {
      var open = h.getAttribute("aria-expanded") !== "true";
      h.setAttribute("aria-expanded", String(open));
      var list = document.getElementById(h.getAttribute("aria-controls")); if (list) list.hidden = !open;
    });
  });
  function setCollapsed(c) {
    if (c) root.dataset.nav = "collapsed"; else delete root.dataset.nav;
    $$("[data-nav-toggle]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(c));
      var zh = b.querySelector(".at-bi__zh"); if (zh) zh.textContent = c ? "展开侧栏" : "收起侧栏";
      var en = b.querySelector(".at-bi__en"); if (en) en.textContent = c ? "Expand" : "Collapse";
      b.setAttribute("aria-label", c ? "展开侧栏" : "收起侧栏");
    });
  }
  setCollapsed(root.dataset.nav === "collapsed");
  $$("[data-nav-toggle]").forEach(function (b) {
    b.addEventListener("click", function () { var c = root.dataset.nav !== "collapsed"; setCollapsed(c); store.set("at-nav", c ? "collapsed" : "expanded"); });
  });
  var scrim = $("[data-scrim]"), drawerBtn = $("[data-drawer-open]"), nav = $("#sidenav");
  function drawer(open) {
    if (!nav) return;
    if (open) root.dataset.drawer = "open"; else delete root.dataset.drawer;
    if (scrim) scrim.hidden = !open;
    if (drawerBtn) drawerBtn.setAttribute("aria-expanded", String(open));
    var main = $("#main"), bar = $(".at-topbar"); if (main) main.inert = open; if (bar) bar.inert = open;
    if (open) { var first = $("a, button", nav); if (first) first.focus(); }
    else if (drawerBtn && nav.contains(document.activeElement)) drawerBtn.focus();
  }
  if (drawerBtn) drawerBtn.addEventListener("click", function () { drawer(true); });
  if (scrim) scrim.addEventListener("click", function () { drawer(false); });

  // ---------- search: "/" or Ctrl/Cmd+K focuses; suggestions with arrow keys ----------
  var INDEX = [["白砾", "Agents", "entity.html"], ["柒弦", "Agents", "entity.html"], ["罗鸢", "Agents", "entity.html"], ["寂潮", "Arms", "list.html"], ["断桥", "Arms", "list.html"], ["冷凝核心", "Supplies", "item.html"], ["霜晶", "Supplies", "item.html"], ["极夜远征", "Events", "article.html"], ["最近更改", "Recent", "changes.html"]];
  document.addEventListener("keydown", function (e) {
    var t = e.target, typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
    if ((e.key === "/" && !typing) || ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey))) {
      var input = $(".at-topbar .at-search__input");
      if (input && input.offsetParent !== null) { e.preventDefault(); input.focus(); input.select(); }
    }
    if (e.key === "Escape" && root.dataset.drawer === "open") drawer(false);
  });
  $$("[data-search]").forEach(function (form) {
    var input = $(".at-search__input", form), list = $(".at-suggest", form), active = -1;
    if (!input || !list) return;
    function close() { list.hidden = true; input.setAttribute("aria-expanded", "false"); input.removeAttribute("aria-activedescendant"); active = -1; }
    function render() {
      var q = input.value.trim();
      var hits = q ? INDEX.filter(function (r) { return r[0].indexOf(q) !== -1; }).slice(0, 6) : [];
      list.innerHTML = hits.map(function (r, i) { return '<li role="presentation"><a role="option" id="' + list.id + "-" + i + '" href="' + r[2] + '" aria-selected="false">' + r[0] + "<small>" + r[1] + "</small></a></li>"; }).join("");
      list.hidden = !hits.length; input.setAttribute("aria-expanded", String(!!hits.length)); active = -1;
    }
    function move(d) {
      var opts = $$("[role=option]", list); if (!opts.length) return;
      active = (active + d + opts.length) % opts.length;
      opts.forEach(function (o, i) { o.setAttribute("aria-selected", String(i === active)); });
      input.setAttribute("aria-activedescendant", opts[active].id);
    }
    input.addEventListener("input", render);
    input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
      else if (e.key === "Enter" && active >= 0) { e.preventDefault(); location.href = $$("[role=option]", list)[active].getAttribute("href"); }
      else if (e.key === "Escape") { if (!list.hidden) { e.stopPropagation(); close(); } else input.blur(); }
    });
    input.addEventListener("blur", function () { setTimeout(close, 150); });
  });

  // ---------- version notice (dialog) ----------
  var dialog = $("dialog#notice"), opener = null;
  function openNotice() { if (!dialog || dialog.open) return; opener = document.activeElement; dialog.showModal(); var c = $(".at-modal__close", dialog); if (c) c.focus(); }
  function closeNotice() { if (!dialog || !dialog.open) return; dialog.close(); store.set("at-notice", "v2.4.0"); if (opener && opener.focus) opener.focus(); }
  $$("[data-notice-open]").forEach(function (b) { b.addEventListener("click", openNotice); });
  $$("[data-notice-close]").forEach(function (b) { b.addEventListener("click", closeNotice); });
  if (dialog) {
    dialog.addEventListener("cancel", function (e) { e.preventDefault(); closeNotice(); });
    dialog.addEventListener("click", function (e) { if (e.target === dialog) closeNotice(); });
    dialog.addEventListener("keydown", function (e) {
      if (e.key !== "Tab") return;
      var f = $$("a[href], button:not([disabled])", dialog); if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }
  var auto = /[?&]notice=1/.test(location.search) || (document.body.dataset.page === "home" && store.get("at-notice") !== "v2.4.0" && !navigator.webdriver);
  if (auto) setTimeout(openNotice, 400);

  // ---------- toasts ----------
  var toasts = $("[data-toasts]");
  function toast(msg, kind, ms) {
    if (!toasts) return;
    var li = document.createElement("li");
    li.className = "at-toast" + (kind === "error" ? " at-toast--error" : kind === "ok" ? " at-toast--ok" : "");
    li.setAttribute("role", kind === "error" ? "alert" : "status");
    li.innerHTML = (kind === "loading" ? '<span class="at-toast__sweep" aria-hidden="true"></span>' : "") + '<span class="at-toast__msg"></span><button class="at-toast__btn" type="button">关闭</button>';
    li.querySelector(".at-toast__msg").textContent = msg;
    li.querySelector("button").addEventListener("click", function () { li.remove(); });
    toasts.appendChild(li);
    if (ms) setTimeout(function () { li.remove(); }, ms);
    return li;
  }
  if (document.body.dataset.page === "home" && !store.get("at-guided") && !navigator.webdriver) {
    var g = toast("正在载入引导…", "loading");
    setTimeout(function () { if (g) g.remove(); store.set("at-guided", "1"); }, 2600);
  }
  $$("[data-copy-link]").forEach(function (b) {
    b.addEventListener("click", function () {
      var done = function () { toast("链接已复制", "ok", 2200); };
      if (navigator.clipboard) navigator.clipboard.writeText(location.href).then(done, function () { toast("复制失败，请手动复制地址栏", "error", 3200); }); else done();
    });
  });
  $$("[data-watch]").forEach(function (b) {
    b.addEventListener("click", function () { var on = b.getAttribute("aria-pressed") !== "true"; b.setAttribute("aria-pressed", String(on)); toast(on ? "已关注本页" : "已取消关注", "ok", 2200); });
  });
  $$('a[aria-disabled="true"]').forEach(function (a) { a.addEventListener("click", function (e) { e.preventDefault(); }); });

  // ---------- tabs (roving tabindex, arrows, Home/End) ----------
  $$("[data-tabs]").forEach(function (list) {
    var tabs = $$("[role=tab]", list);
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab; t.setAttribute("aria-selected", String(on)); t.tabIndex = on ? 0 : -1;
        var p = t.getAttribute("aria-controls") && document.getElementById(t.getAttribute("aria-controls")); if (p) p.hidden = !on;
      });
      if (focus) tab.focus();
      list.dispatchEvent(new CustomEvent("at-tab", { detail: tab }));
    }
    tabs.forEach(function (t) {
      t.addEventListener("click", function () { if (!t.disabled) select(t, false); });
      t.addEventListener("keydown", function (e) {
        var usable = tabs.filter(function (x) { return !x.disabled; }), i = usable.indexOf(t), n = null;
        if (e.key === "ArrowRight" || e.key === "ArrowDown") n = usable[(i + 1) % usable.length];
        else if (e.key === "ArrowLeft" || e.key === "ArrowUp") n = usable[(i - 1 + usable.length) % usable.length];
        else if (e.key === "Home") n = usable[0]; else if (e.key === "End") n = usable[usable.length - 1];
        if (n) { e.preventDefault(); select(n, true); }
      });
    });
  });
  // Attribute stages drive the stat grid.
  $$("[data-stages]").forEach(function (panel) {
    var stages = JSON.parse(panel.dataset.stages), max = stages[stages.length - 1].lv;
    var list = $("[data-tabs]", panel); if (!list) return;
    list.addEventListener("at-tab", function (e) {
      var s = stages[Number(e.detail.dataset.stage)];
      $$("[data-stat]", panel).forEach(function (b) { b.textContent = s[b.dataset.stat]; });
      $("[data-stage-lv]", panel).textContent = "Lv" + s.lv;
      $("[data-stage-fill]", panel).style.setProperty("--v", Math.round((s.lv / max) * 100) + "%");
    });
  });

  // ---------- sortable tables ----------
  $$("table[data-sortable]").forEach(function (table) {
    var heads = $$("thead th", table);
    heads.forEach(function (th, col) {
      var btn = $(".at-sort", th); if (!btn) return;
      btn.addEventListener("click", function () {
        var dir = th.getAttribute("aria-sort") === "ascending" ? "descending" : "ascending";
        heads.forEach(function (h) { h.removeAttribute("aria-sort"); }); th.setAttribute("aria-sort", dir);
        var num = btn.dataset.type === "num", body = table.tBodies[0];
        var rows = Array.prototype.slice.call(body.rows);
        var key = function (r) { var c = r.cells[col]; var v = c.dataset.v != null ? c.dataset.v : c.textContent.trim(); return num ? parseFloat(v) : v; };
        rows.sort(function (a, b) { var x = key(a), y = key(b); var r = num ? x - y : String(x).localeCompare(String(y), "zh-CN"); return dir === "ascending" ? r : -r; });
        rows.forEach(function (r) { body.appendChild(r); });
      });
    });
  });

  // ---------- filters (toggle groups + text) ----------
  function runFilters() {
    var groups = $$("[data-filter]"); if (!groups.length) return;
    var want = {};
    groups.forEach(function (g) { var on = $('[aria-pressed="true"]', g); want[g.dataset.filter] = on ? on.dataset.value : ""; });
    var textEl = $("[data-filter-text]"), text = textEl ? textEl.value.trim().toLowerCase() : "";
    var shown = 0, total = 0;
    $$("[data-filter-items]").forEach(function (box, bi) {
      $$(box.tagName === "TABLE" ? "tbody tr" : ".at-card", box).forEach(function (el) {
        var ok = Object.keys(want).every(function (k) { if (!want[k]) return true; if (k === "rarity") return el.dataset.rarity === want[k]; return el.dataset[k] === want[k]; });
        if (ok && text) ok = el.textContent.toLowerCase().indexOf(text) !== -1;
        var target = el.closest("li") || el; target.hidden = !ok;
        if (bi === 0) { total++; if (ok) shown++; }
      });
    });
    $$(".at-change").forEach(function (el) { var ok = !want.kind || el.dataset.kind === want.kind; el.hidden = !ok; total++; if (ok) shown++; });
    $$(".at-changes__list").forEach(function (l) { var any = $$(".at-change", l).some(function (c) { return !c.hidden; }); l.hidden = !any; l.previousElementSibling.hidden = !any; });
    var count = $("[data-filter-count]"); if (count) count.textContent = shown === total ? "共 " + total + " 件" : "显示 " + shown + " / " + total + " 件";
    var emptyBox = $("[data-filter-empty]"); if (emptyBox) emptyBox.hidden = shown !== 0;
  }
  $$("[data-filter]").forEach(function (g) {
    $$(".at-toggle", g).forEach(function (b) {
      b.addEventListener("click", function () { $$(".at-toggle", g).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); }); runFilters(); });
    });
  });
  var ft = $("[data-filter-text]"); if (ft) ft.addEventListener("input", runFilters);
  $$("[data-filter-reset]").forEach(function (b) {
    b.addEventListener("click", function () {
      $$("[data-filter]").forEach(function (g) { $$(".at-toggle", g).forEach(function (x, i) { x.setAttribute("aria-pressed", String(i === 0)); }); });
      if (ft) ft.value = ""; runFilters(); var first = $("[data-filter] .at-toggle"); if (first) first.focus();
    });
  });

  // ---------- search page: live filter of results ----------
  var results = $("[data-results]"), mainQ = $("#q-main");
  if (results && mainQ) {
    mainQ.addEventListener("input", function () {
      var q = mainQ.value.trim(), n = 0;
      $$(".at-result", results).forEach(function (r) { var ok = !q || r.textContent.indexOf(q) !== -1; r.hidden = !ok; if (ok) n++; });
      $("[data-result-count]").textContent = n + " 条结果";
      $("[data-results-empty]").hidden = n !== 0;
    });
  }

  // ---------- table of contents: mark the section in view ----------
  var toc = $$(".at-toc a");
  if (toc.length && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) toc.forEach(function (a) { a.setAttribute("aria-current", String(a.getAttribute("href") === "#" + en.target.id)); }); });
    }, { rootMargin: "0px 0px -70% 0px" });
    toc.forEach(function (a) { var t = document.getElementById(a.getAttribute("href").slice(1)); if (t) io.observe(t); });
  }
})();
