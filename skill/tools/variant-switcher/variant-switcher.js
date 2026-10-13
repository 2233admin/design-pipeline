/*
 * Prototype variant switcher (design-pipeline skill/tools/variant-switcher). Inline this script in a
 * throwaway variants page such as concepts.html; never ship it in the built page.
 *
 * The page marks each variant with data-variant="<key>" (and optionally data-variant-name). The
 * script shows one variant at a time, chosen by ?variant=<key> (the first key by default), and adds a
 * floating bar at the bottom centre: a left arrow, the variant label and a right arrow. The arrows and
 * the ← → keys cycle through the variants with wrap-around; the keys are left alone while a form field
 * or editable region has focus. The URL keeps ?variant= so a variant can be shared and reloaded.
 */
(() => {
  "use strict";
  const MARK = "data-variant-switcher";

  function start() {
    const panels = [...document.querySelectorAll("[data-variant]")];
    const keys = [...new Set(panels.map((panel) => panel.getAttribute("data-variant")))].filter(Boolean);
    if (!keys.length || document.querySelector(`[${MARK}]`)) return;
    const names = Object.fromEntries(keys.map((key) => [key, panels.find((panel) => panel.getAttribute("data-variant") === key).getAttribute("data-variant-name") || ""]));
    const requested = String(new URLSearchParams(location.search).get("variant") || "").toLowerCase();
    let current = keys.find((key) => key.toLowerCase() === requested) || keys[0];

    // A shadow root keeps the page's styles off the bar and the bar's styles off the page.
    const host = document.createElement("div");
    host.setAttribute(MARK, "");
    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `<style>
      :host { all: initial; position: fixed; left: 50%; bottom: 16px; transform: translateX(-50%); z-index: 2147483647; }
      .bar { display: flex; align-items: center; gap: 8px; padding: 6px; border-radius: 999px; background: #111; color: #fff;
        box-shadow: 0 0 0 2px #ffd400, 0 8px 28px rgb(0 0 0 / 0.4); font: 600 14px/1.2 system-ui, -apple-system, "Segoe UI", sans-serif; }
      button { all: unset; box-sizing: border-box; cursor: pointer; width: 34px; height: 34px; border-radius: 50%; display: grid;
        place-items: center; background: #ffd400; color: #111; font-size: 18px; }
      button:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
      output { min-width: 8em; padding: 0 6px; text-align: center; white-space: nowrap; }
    </style><div class="bar" role="toolbar" aria-label="Prototype variant switcher, not part of the design">
      <button type="button" data-step="-1" aria-label="Previous variant">&larr;</button>
      <output aria-live="polite"></output>
      <button type="button" data-step="1" aria-label="Next variant">&rarr;</button>
    </div>`;
    const label = shadow.querySelector("output");

    function show(key) {
      current = key;
      for (const panel of panels) panel.hidden = panel.getAttribute("data-variant") !== key;
      label.textContent = names[key] ? `${key} (${names[key]})` : key;
      try {
        const url = new URL(location.href);
        url.searchParams.set("variant", key);
        history.replaceState(history.state, "", url);
      } catch {
        // Some file: pages refuse history updates; the switch itself still works.
      }
    }
    const step = (delta) => show(keys[(keys.indexOf(current) + delta + keys.length) % keys.length]);

    shadow.addEventListener("click", (event) => {
      const button = event.target instanceof Element ? event.target.closest("button[data-step]") : null;
      if (button) step(Number(button.getAttribute("data-step")));
    });
    document.addEventListener("keydown", (event) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const target = event.composedPath()[0];
      if (target instanceof Element && target.closest("input, textarea, select, [contenteditable]:not([contenteditable='false'])")) return;
      event.preventDefault();
      step(event.key === "ArrowLeft" ? -1 : 1);
    });

    document.body.append(host);
    show(current);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
