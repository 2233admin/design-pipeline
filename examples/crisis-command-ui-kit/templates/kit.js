/* Crisis Command kit: every interaction of the case pages. State changes are hard cuts (no fades);
   motion stops under prefers-reduced-motion. ?slot=1 shows the art slots with their task sheets. */
(function () {
  "use strict";
  var doc = document;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var qs = function (s, r) { return (r || doc).querySelector(s); };
  var qsa = function (s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); };
  var pad = function (n) { return (n < 10 ? "0" : "") + n; };

  // slot mode
  if (/[?&]slot=1\b/.test(location.search)) doc.body.setAttribute("data-slots", "1");

  // segment digits: redraw a [data-seg] element
  function setSeg(el, text) {
    if (!el || el.getAttribute("data-seg") === text) return;
    el.setAttribute("data-seg", text);
    el.innerHTML = window.CCSeg.svg(text, el.getAttribute("data-seg-style") || "capsule", text);
  }

  // toasts
  var toastBox = qs("[data-toasts]");
  function toast(kind, zh, en) {
    if (!toastBox) return;
    var d = new Date();
    var li = doc.createElement("li");
    li.className = "cc-toast cc-toast--" + kind;
    li.setAttribute("role", kind === "alert" ? "alert" : "status");
    li.innerHTML = '<span class="cc-toast__icon"><svg class="cc-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="' + (kind === "alert" ? "M12 3 22 20H2z M12 9v5M12 17h.01" : "M5 12h14M13 6l6 6-6 6") + '"/></svg></span><span class="cc-toast__text"><span class="cc-bi"><span class="cc-bi__zh"></span><span class="cc-bi__en"></span></span></span><time class="cc-toast__time">' + pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds()) + '</time><button class="cc-iconbtn cc-iconbtn--sm" type="button" aria-label="关闭"><svg class="cc-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>';
    qs(".cc-bi__zh", li).textContent = zh; qs(".cc-bi__en", li).textContent = en;
    qs("button", li).addEventListener("click", function () { li.remove(); });
    toastBox.appendChild(li);
    setTimeout(function () { li.remove(); }, 6000);
  }
  qsa(".cc-toast .cc-iconbtn").forEach(function (b) { b.addEventListener("click", function () { b.closest(".cc-toast").remove(); }); });

  // the local clock in the command bar
  var barClock = qs(".cc-bar__clock");
  function tickBar() { var d = new Date(); setSeg(barClock, pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds())); }
  if (barClock && !reduce) { tickBar(); setInterval(tickBar, 1000); }

  // mobile menu
  qsa("[data-menu]").forEach(function (b) {
    b.addEventListener("click", function () { var bar = b.closest(".cc-bar"); var open = !bar.classList.contains("is-open"); bar.classList.toggle("is-open", open); b.setAttribute("aria-expanded", String(open)); });
  });

  // current nav item follows the screen in view (site)
  var navs = qsa(".cc-nav");
  if ("IntersectionObserver" in window && navs.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        navs.forEach(function (a) { if (a.hash === "#" + e.target.id) a.setAttribute("aria-current", "true"); else if (a.hash) a.removeAttribute("aria-current"); });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    navs.forEach(function (a) { var t = a.hash && doc.getElementById(a.hash.slice(1)); if (t && t.classList.contains("cc-screen")) io.observe(t); });
  }

  // countdown clocks: tick each second; the last 10 s cut to danger; pause and breach toggles
  var state = { breach: false, paused: false };
  qsa("[data-clock]").forEach(function (clock) {
    var pairs = qsa(".cc-clock__pair", clock);
    var lcd = qs(".cc-clock__lcd", clock);
    var total = pairs.reduce(function (s, p, i) { return s + Number(p.getAttribute("data-seg")) * [3600, 60, 1][i]; }, 0);
    var el = 12 * 60 + 7.53;
    function draw() {
      var t = Math.max(0, total);
      setSeg(pairs[0], pad(Math.floor(t / 3600))); setSeg(pairs[1], pad(Math.floor(t / 60) % 60)); setSeg(pairs[2], pad(t % 60));
      var e = el; setSeg(lcd, pad(Math.floor(e / 3600)) + ":" + pad(Math.floor(e / 60) % 60) + ":" + pad(Math.floor(e % 60)) + "." + pad(Math.floor((e * 100) % 100)));
      var danger = state.breach || t <= 10;
      clock.classList.toggle("cc-clock--danger", danger);
      clock.classList.toggle("cc-clock--normal", !danger);
      clock.classList.toggle("cc-clock--paused", state.paused);
      qs(".cc-clock__main", clock).setAttribute("aria-label", "蓄压剩余 " + Math.floor(t / 3600) + " 时 " + (Math.floor(t / 60) % 60) + " 分 " + (t % 60) + " 秒");
    }
    if (!reduce) setInterval(function () { if (state.paused) return; total = total > 0 ? total - 1 : 5 * 60; el += 1; draw(); }, 1000);
    clock._draw = draw;
  });
  function setBreach(on) {
    state.breach = on;
    doc.body.classList.toggle("is-danger", on);
    qsa("[data-state]").forEach(function (s) { s.innerHTML = on ? '<span class="cc-mincho">越线</span> BREACH' : '<span class="cc-mincho">常态</span> NORMAL'; });
    qsa("[data-clock]").forEach(function (c) { if (c._draw) c._draw(); });
    qsa("[data-breach]").forEach(function (b) { b.setAttribute("aria-pressed", String(on)); qs(".cc-btn__zh", b).textContent = on ? "解除越线" : "模拟越线"; qs(".cc-btn__en", b).textContent = on ? "CLEAR BREACH" : "SIMULATE BREACH"; });
    if (on) toast("alert", "东缘十二号闸越线", "GATE E-12 BREACH");
  }
  qsa("[data-breach]").forEach(function (b) { b.addEventListener("click", function () { setBreach(!state.breach); }); });
  qsa("[data-pause]").forEach(function (b) { b.addEventListener("click", function () { state.paused = !state.paused; b.setAttribute("aria-pressed", String(state.paused)); qs(".cc-btn__zh", b).textContent = state.paused ? "继续计时" : "暂停计时"; qsa("[data-clock]").forEach(function (c) { if (c._draw) c._draw(); }); }); });

  // mode rows: a radio group with arrow keys
  qsa(".cc-modes").forEach(function (group) {
    var items = qsa(".cc-mode", group);
    function select(btn, focus) {
      items.forEach(function (b) { var on = b === btn; b.setAttribute("aria-checked", String(on)); b.tabIndex = on ? 0 : -1; });
      if (focus) btn.focus();
    }
    items.forEach(function (b, i) {
      b.addEventListener("click", function () { if (b.disabled) return; select(b, false); toast("info", "泵送模式：" + qs(".cc-mode__zh", b).textContent, "PUMP MODE " + qs(".cc-mode__en", b).textContent); });
      b.addEventListener("keydown", function (e) {
        var dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
        if (!dir) return; e.preventDefault();
        var j = i; do { j = (j + dir + items.length) % items.length; } while (items[j].disabled && j !== i);
        select(items[j], true);
      });
    });
  });

  // tabs
  qsa(".cc-tabs").forEach(function (list) {
    var tabs = qsa(".cc-tab", list);
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { tabs.forEach(function (o) { o.setAttribute("aria-selected", String(o === t)); o.tabIndex = o === t ? 0 : -1; }); });
      t.addEventListener("keydown", function (e) {
        var dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0; if (!dir) return; e.preventDefault();
        var j = i; do { j = (j + dir + tabs.length) % tabs.length; } while (tabs[j].disabled && j !== i);
        tabs[j].click(); tabs[j].focus();
      });
    });
  });

  // dialogs
  qsa("[data-open]").forEach(function (b) { b.addEventListener("click", function () { var d = doc.getElementById(b.getAttribute("data-open")); if (d && d.showModal) d.showModal(); }); });
  qsa(".cc-dialog").forEach(function (d) {
    qsa("[data-close]", d).forEach(function (b) { b.addEventListener("click", function () { d.close(); }); });
    qsa("[data-confirm]", d).forEach(function (b) {
      b.addEventListener("click", function () {
        b.setAttribute("aria-busy", "true");
        setTimeout(function () { b.removeAttribute("aria-busy"); d.close(); toast("alert", "强制开闸已授权", "FORCE OPEN AUTHORISED"); }, 1200);
      });
    });
  });

  // report index: open the report in the dialog
  var rd = doc.getElementById("report-dlg");
  qsa("[data-report]").forEach(function (b) {
    b.addEventListener("click", function () {
      if (!rd) return;
      var card = b.querySelector(".cc-card");
      var dlgCard = qs(".cc-report__card .cc-card", rd);
      qs(".cc-card__num", dlgCard).textContent = qs(".cc-card__num", card).textContent;
      qs(".cc-card__l1", dlgCard).textContent = qs(".cc-card__l1", card).textContent;
      qs(".cc-card__l2", dlgCard).innerHTML = qs(".cc-card__l2", card).innerHTML;
      qs(".cc-bi__zh", rd).textContent = qs(".cc-card__num", card).textContent;
      qs("[data-report-text]", rd).textContent = window.CC_REPORTS ? window.CC_REPORTS[Number(b.getAttribute("data-report"))] : "";
      qsa(".cc-rcard").forEach(function (o) { o.classList.toggle("is-current", o === b); });
      rd.showModal();
    });
  });

  // vote: pending seats resolve one by one
  qsa(".cc-vote.is-pending").forEach(function (v) {
    var seats = qsa(".cc-seat", v); var votes = ["可", "可", "可", "可", "否"]; var k = 0;
    if (reduce) return;
    var timer = setInterval(function () {
      var s = seats[k]; if (!s) { clearInterval(timer); return; }
      s.removeAttribute("aria-busy"); qs(".cc-seat__v", s).textContent = votes[k]; if (votes[k] === "否") s.classList.add("is-no");
      k += 1;
      if (k === seats.length) { v.classList.remove("is-pending"); qs(".cc-vote__result", v).textContent = "可决 4 · 否决 1"; clearInterval(timer); }
    }, 1400);
  });

  // command field: STATUS <gate>, anything else is an error
  qsa("[data-cmd]").forEach(function (f) {
    var input = qs("input", f); var hint = qs(".cc-field__hint", f); var log = f.closest(".cc-log") && qs("[data-log]", f.closest(".cc-log"));
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var v = input.value.trim().toUpperCase(); if (!v) return;
      var ok = /^(STATUS|OPEN|CLOSE) [ESW]-\d{2}$/.test(v);
      f.classList.toggle("is-error", !ok);
      input.setAttribute("aria-invalid", String(!ok));
      hint.textContent = ok ? "已执行 · DONE" : "无法识别的指令 · UNKNOWN COMMAND";
      if (ok && log) { var d = new Date(); var li = doc.createElement("li"); li.className = "cc-log__line cc-log__line--ops"; li.innerHTML = "<time>" + pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds()) + "</time><b>OPS</b><span></span>"; qs("span", li).textContent = v; log.appendChild(li); input.value = ""; }
    });
  });

  // the live trace: shift the main trace left every 100 ms
  qsa("[data-live-trace]").forEach(function (p) {
    if (reduce) return;
    var pts = p.getAttribute("d").slice(1).split("L").map(function (s) { var a = s.split(" "); return [Number(a[0]), Number(a[1])]; });
    var step = pts[1][0] - pts[0][0];
    setInterval(function () {
      var last = pts[pts.length - 1][1];
      var next = Math.min(475, Math.max(25, last + (Math.random() - 0.5) * 30));
      pts = pts.slice(1).map(function (q) { return [q[0] - step, q[1]]; }); pts.push([pts[pts.length - 1][0] + step, next]);
      p.setAttribute("d", "M" + pts.map(function (q) { return q[0].toFixed(1) + " " + q[1].toFixed(1); }).join("L"));
    }, 100);
  });
})();
