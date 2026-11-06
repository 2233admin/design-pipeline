/* Megastructure Ink kit: every interaction on the pages. CSS owns animation; this file toggles
   attributes, draws the structure plates and appends terminal lines. */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const html = document.documentElement;
  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- structure plates (show mode only) ----
  function drawPlates() {
    if (html.getAttribute("data-mode") === "slot" || !window.StructurePlates) return;
    for (const c of $$("canvas[data-plate]")) {
      const box = c.getBoundingClientRect();
      if (!box.width || !box.height) continue;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.round(box.width * dpr), h = Math.round(box.height * dpr);
      if (c.width === w && c.height === h && c.dataset.drawn) continue;
      c.width = w; c.height = h;
      const o = JSON.parse(c.getAttribute("data-plate"));
      o.lw = (o.lw || 3) * dpr * Math.max(0.6, Math.min(1.2, box.width / 1600));
      o.pitch = Math.max(2.4, 3 * dpr * Math.max(0.7, box.width / 1920));
      window.StructurePlates.draw(c, o);
      c.dataset.drawn = "1";
    }
  }
  drawPlates();
  let resizeTimer = 0;
  window.addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(drawPlates, 160); });

  // ---- toasts ----
  const toastList = $("[data-toasts]");
  function toast(text, kind = "info", en = "NOTE") {
    if (!toastList) return;
    const icon = { info: "signal", ok: "check", alarm: "alert" }[kind];
    const li = document.createElement("li");
    li.className = `ms-toast is-${kind}`;
    li.setAttribute("role", "status");
    li.innerHTML = `<svg class="ms-icon ms-icon--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" aria-hidden="true"><use href="#i-${icon}"/></svg><span class="body-sm"></span><span class="caps"></span><button class="ms-iconbtn ms-iconbtn--sm" type="button" aria-label="关闭" data-toast-close><svg class="ms-icon ms-icon--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" aria-hidden="true"><use href="#i-close"/></svg></button>`;
    li.querySelector(".body-sm").textContent = text;
    li.querySelector(".caps").textContent = en;
    toastList.appendChild(li);
    setTimeout(() => li.remove(), 5200);
  }
  document.addEventListener("click", (e) => {
    const close = e.target.closest("[data-toast-close]");
    if (close) close.closest(".ms-toast").remove();
    const t = e.target.closest("[data-toast]");
    if (t) toast(t.getAttribute("data-toast"), "info", "SCHEDULED");
  });

  // ---- mobile menu ----
  const menu = $("[data-menu]"), nav = $("#nav");
  if (menu && nav) {
    menu.addEventListener("click", () => {
      const open = menu.getAttribute("aria-expanded") !== "true";
      menu.setAttribute("aria-expanded", String(open));
      if (open) nav.setAttribute("data-open", ""); else nav.removeAttribute("data-open");
    });
    nav.addEventListener("click", (e) => { if (e.target.closest("a")) { menu.setAttribute("aria-expanded", "false"); nav.removeAttribute("data-open"); } });
  }

  // ---- current section on the nav and the depth rail ----
  const screens = $$(".ms-screen[id]");
  if (screens.length && "IntersectionObserver" in window) {
    const mark = (id) => {
      for (const a of $$(".ms-nav__link, .ms-rail__item")) {
        if (a.getAttribute("href").split("#")[1] === id) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
      }
    };
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) if (en.isIntersecting) mark(en.target.id);
    }, { rootMargin: "-45% 0px -50% 0px" });
    screens.forEach((s) => io.observe(s));
  }

  // ---- tabs (roving focus; the log tabs filter the list) ----
  for (const list of $$('[role="tablist"]')) {
    const tabs = $$('[role="tab"]', list);
    const select = (tab) => {
      tabs.forEach((t) => { const on = t === tab; t.setAttribute("aria-selected", String(on)); t.tabIndex = on ? 0 : -1; });
      const sec = list.closest(".ms-logsec");
      if (sec) {
        const kind = tab.querySelector(".ms-bi__zh").textContent;
        for (const row of $$(".ms-log", sec)) row.hidden = kind !== "全部" && row.querySelector(".ms-log__kind .ms-bi__zh").textContent !== kind;
      }
    };
    list.addEventListener("click", (e) => { const t = e.target.closest('[role="tab"]'); if (t && !t.disabled) select(t); });
    list.addEventListener("keydown", (e) => {
      const live = tabs.filter((t) => !t.disabled), i = live.indexOf(document.activeElement);
      if (i < 0 || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
      e.preventDefault();
      const next = e.key === "Home" ? live[0] : e.key === "End" ? live[live.length - 1] : live[(i + (e.key === "ArrowRight" ? 1 : -1) + live.length) % live.length];
      next.focus(); select(next);
    });
  }

  // ---- members: one pressed card, its dossier shown ----
  const members = $$("[data-member]");
  for (const btn of members) {
    btn.addEventListener("click", () => {
      for (const b of members) { const on = b === btn; b.setAttribute("aria-pressed", String(on)); b.closest(".ms-member").classList.toggle("is-active", on); }
      for (const w of $$("[data-dossier-wrap]")) w.hidden = w.getAttribute("data-dossier-wrap") !== btn.getAttribute("data-member");
    });
  }

  // ---- terminal: print a line character by character ----
  function printLine(list, [time, kind, text]) {
    const li = document.createElement("li");
    li.className = `ms-term__line is-${kind.toLowerCase()}`;
    li.innerHTML = '<span class="ms-term__time data-sm"></span><span class="ms-term__kind data-sm"></span><span class="ms-term__text body-sm"></span>';
    li.children[0].textContent = time; li.children[1].textContent = kind;
    list.appendChild(li);
    while (list.children.length > 9) list.firstElementChild.remove();
    const out = li.children[2];
    if (reduced) { out.textContent = text; return Promise.resolve(); }
    return new Promise((resolve) => {
      let i = 0;
      const rate = parseFloat(getComputedStyle(html).getPropertyValue("--type-rate")) || 28;
      const step = () => { out.textContent = text.slice(0, ++i); if (i < text.length) setTimeout(step, rate); else resolve(); };
      step();
    });
  }
  const stamp = () => new Date().toTimeString().slice(0, 8);

  // ---- handshake with the switchboard: always refused without an echo key ----
  for (const hs of $$("[data-hs]")) {
    const send = $("[data-hs-send]", hs), msg = $("[data-hs-msg]", hs), steps = $$(".ms-hs__step", hs);
    const term = $("[data-term]", hs.closest(".ms-board") || document);
    send.addEventListener("click", async () => {
      hs.setAttribute("data-state", "run");
      send.setAttribute("aria-busy", "true");
      steps.forEach((s) => s.classList.remove("is-done", "is-current", "is-fail"));
      steps[0].classList.add("is-done"); steps[1].classList.add("is-current");
      msg.textContent = "正在握手……";
      if (term) await printLine(term, [stamp(), "REQ", "发送握手 / 层号 4,112"]);
      setTimeout(async () => {
        steps[1].classList.remove("is-current"); steps[1].classList.add("is-done"); steps[2].classList.add("is-fail");
        hs.setAttribute("data-state", "fail");
        send.removeAttribute("aria-busy");
        msg.textContent = "接入被拒绝：缺少回声钥。";
        if (term) await printLine(term, [stamp(), "ERR", "接入被拒绝：缺少回声钥"]);
        toast("总台拒绝接入。", "alarm", "DENIED");
      }, reduced ? 10 : 1400);
    });
  }

  // ---- reserve dialog ----
  const dlg = $("#reserve");
  document.addEventListener("click", (e) => {
    const open = e.target.closest("[data-dialog-open]");
    if (open && dlg && typeof dlg.showModal === "function") { dlg.showModal(); const f = $("input", dlg); if (f) f.focus(); }
  });
  if (dlg) {
    const input = $("#reserve-call", dlg), field = input && input.closest(".ms-field"), hint = $("#reserve-call-hint", dlg);
    $("[data-reserve-ok]", dlg).addEventListener("click", (e) => {
      const ok = /^[A-Z0-9-]{2,8}$/.test(input.value.trim());
      field.classList.toggle("is-invalid", !ok);
      input.setAttribute("aria-invalid", String(!ok));
      if (!ok) { e.preventDefault(); hint.textContent = "呼号只收大写字母、数字和连字符，2 到 8 位。"; input.focus(); }
    });
    dlg.addEventListener("close", () => { if (dlg.returnValue === "ok") toast(`已登记呼号 ${input.value.trim()}。`, "ok", "LOGGED"); });
  }

  // ---- rail-script stream on the switchboard (decoration) ----
  const stream = $("[data-stream]");
  if (stream && window.RailGlyphs) {
    const words = ["line open", "echo late", "stratum four", "no reply", "keep silent", "switch seven", "listen", "depth unknown", "carrier lost"];
    stream.innerHTML = Array.from({ length: 6 }, (_, i) => window.RailGlyphs.svg(`${words[i % words.length]} ${words[(i * 4 + 3) % words.length]}`, { size: 12 })).join("");
  }
})();
