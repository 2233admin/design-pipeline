/* design-pipeline film layout probe
 *
 * Samples the visible text of a composition at chosen times so `designer-pipeline film check`
 * can look for text-on-text overlap, edge crowding and small type between the beat midpoints
 * its contact sheet sees. Unlike timeline-probe.js this seeks the timeline: run it on a page
 * that is thrown away afterwards.
 *
 *   const samples = await FilmLayoutProbe.sample(window.__timelines.main, [0.1, 0.3, 0.5]);
 *
 * Each sample lists one run per element that owns visible text: its line boxes (clipped by
 * overflow ancestors), effective opacity, rendered font size, whether an opaque element covers
 * it, and data-layout-allow-overlap. Without the HyperFrames runtime, data-start/data-duration
 * clip windows are applied here, because no runtime hides clips outside their time.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.FilmLayoutProbe = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "TITLE", "DESC", "DEFS", "METADATA"]);
  const MAX_RUNS = 400;
  const round = (value) => Math.round(value * 10) / 10;

  function selector(el) {
    const parts = [];
    for (let node = el; node && node.nodeType === 1 && parts.length < 4; node = node.parentElement) {
      if (node.id) { parts.unshift(`#${node.id}`); break; }
      const tag = node.tagName.toLowerCase();
      const parent = node.parentElement;
      if (!parent) { parts.unshift(tag); break; }
      const same = Array.from(parent.children).filter((child) => child.tagName === node.tagName);
      parts.unshift(same.length > 1 ? `${tag}:nth-of-type(${same.indexOf(node) + 1})` : tag);
    }
    return parts.join(" > ");
  }

  // Clip timing is relative to the enclosing sub-composition host, as in HyperFrames.
  function clipOffset(node) {
    let sum = 0;
    for (let host = node.parentElement && node.parentElement.closest("[data-composition-id]"); host; host = host.parentElement && host.parentElement.closest("[data-composition-id]")) {
      sum += Number(host.getAttribute("data-start")) || 0;
    }
    return sum;
  }

  function outsideClipWindow(el, atSec) {
    for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
      if (!node.hasAttribute("data-start") || !node.hasAttribute("data-duration")) continue;
      const start = Number(node.getAttribute("data-start")) + clipOffset(node);
      const duration = Number(node.getAttribute("data-duration"));
      if (Number.isFinite(start) && Number.isFinite(duration) && (atSec < start || atSec >= start + duration)) return true;
    }
    return false;
  }

  function opacityOf(el) {
    let opacity = 1;
    for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.display === "none") return 0;
      opacity *= Number(style.opacity);
      if (!(opacity > 0)) return 0;
    }
    return opacity;
  }

  // inset() clip-paths (typing and wipe reveals) cut the box; other shapes are left unclipped.
  function insetBox(style, rect) {
    const match = /^inset\(([^)]*?)(?:\s+round\s[^)]*)?\)$/.exec(style.clipPath || "");
    if (!match) return null;
    const values = match[1].trim().split(/\s+/);
    const [top, right = top, bottom = top, left = right] = values;
    const length = (value, size) => (value.endsWith("%") ? (parseFloat(value) / 100) * size : parseFloat(value) || 0);
    return { left: rect.left + length(left, rect.width), top: rect.top + length(top, rect.height), right: rect.right - length(right, rect.width), bottom: rect.bottom - length(bottom, rect.height) };
  }

  function clipBox(el) {
    const box = { left: -Infinity, top: -Infinity, right: Infinity, bottom: Infinity };
    const cut = (rect) => { box.left = Math.max(box.left, rect.left); box.top = Math.max(box.top, rect.top); box.right = Math.min(box.right, rect.right); box.bottom = Math.min(box.bottom, rect.bottom); };
    for (let node = el; node && node !== document.body && node !== document.documentElement; node = node.parentElement) {
      const style = getComputedStyle(node);
      const inset = style.clipPath && style.clipPath !== "none" ? insetBox(style, node.getBoundingClientRect()) : null;
      if (inset) cut(inset);
      if (node === el || (style.overflowX === "visible" && style.overflowY === "visible")) continue;
      const rect = node.getBoundingClientRect();
      cut({ left: style.overflowX !== "visible" ? rect.left : -Infinity, right: style.overflowX !== "visible" ? rect.right : Infinity, top: style.overflowY !== "visible" ? rect.top : -Infinity, bottom: style.overflowY !== "visible" ? rect.bottom : Infinity });
    }
    return box;
  }

  function opaque(node) {
    const style = getComputedStyle(node);
    const media = ["IMG", "VIDEO", "CANVAS"].includes(node.tagName);
    const match = /rgba?\(([^)]+)\)/.exec(style.backgroundColor || "");
    const alpha = match ? (match[1].split(",")[3] === undefined ? 1 : Number(match[1].split(",")[3])) : 0;
    return (media || alpha >= 0.9 || (style.backgroundImage && style.backgroundImage !== "none")) && opacityOf(node) >= 0.9;
  }

  // Covered when, at every line centre inside the viewport, an opaque element that is neither
  // an ancestor nor a descendant paints above the text.
  function covered(el, rects) {
    let tested = 0;
    for (const [x, y, w, h] of rects.slice(0, 3)) {
      const cx = x + w / 2;
      const cy = y + h / 2;
      if (cx < 0 || cy < 0 || cx >= innerWidth || cy >= innerHeight) continue;
      const stack = document.elementsFromPoint(cx, cy);
      const index = stack.findIndex((node) => node === el || el.contains(node));
      if (index < 0) return false;
      tested += 1;
      if (!stack.slice(0, index).some((node) => !node.contains(el) && !el.contains(node) && opaque(node))) return false;
    }
    return tested > 0;
  }

  function fontPx(el) {
    const size = parseFloat(getComputedStyle(el).fontSize) || 0;
    let scale = 1;
    if (typeof SVGElement !== "undefined" && el instanceof SVGElement) {
      const matrix = el.getScreenCTM && el.getScreenCTM();
      if (matrix) scale = Math.hypot(matrix.a, matrix.b);
    } else if (el.offsetHeight) {
      scale = el.getBoundingClientRect().height / el.offsetHeight;
    }
    return round(size * scale);
  }

  function collect(atSec, emulateClips) {
    const owners = new Map();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const el = node.parentElement;
      if (!el || !node.nodeValue.trim() || SKIP.has(el.tagName.toUpperCase()) || el.closest("script,style,noscript,template,title,desc,defs,metadata")) continue;
      if (!owners.has(el)) owners.set(el, []);
      owners.get(el).push(node);
    }
    const runs = [];
    const range = document.createRange();
    for (const [el, nodes] of owners) {
      if (runs.length >= MAX_RUNS) break;
      if (getComputedStyle(el).visibility !== "visible") continue;
      if (emulateClips && outsideClipWindow(el, atSec)) continue;
      const opacity = opacityOf(el);
      if (opacity < 0.02) continue;
      const clip = clipBox(el);
      const rects = [];
      for (const node of nodes) {
        range.selectNodeContents(node);
        for (const rect of range.getClientRects()) {
          const left = Math.max(rect.left, clip.left);
          const top = Math.max(rect.top, clip.top);
          const right = Math.min(rect.right, clip.right);
          const bottom = Math.min(rect.bottom, clip.bottom);
          if (right - left >= 1 && bottom - top >= 1) rects.push([round(left), round(top), round(right - left), round(bottom - top)]);
        }
      }
      if (!rects.length) continue;
      const text = nodes.map((node) => node.nodeValue).join(" ").replace(/\s+/g, " ").trim().slice(0, 60);
      runs.push({ el, id: selector(el), text, opacity: Math.round(opacity * 1000) / 1000, fontPx: fontPx(el), rects, ...(el.closest("[data-layout-allow-overlap]") ? { allowOverlap: true } : {}) });
    }
    return runs.map((run, index) => {
      const within = [];
      runs.forEach((other, otherIndex) => { if (otherIndex !== index && other.el.contains(run.el)) within.push(otherIndex); });
      const { el, ...rest } = run;
      return { ...rest, ...(covered(el, run.rects) ? { occluded: true } : {}), ...(within.length ? { within } : {}) };
    });
  }

  async function seek(timeline, atSec) {
    if (typeof window !== "undefined" && window.__hf && typeof window.__hf.seek === "function") {
      await window.__hf.seek(atSec);
      if (typeof window.__hfWaitForSeekCompletion === "function") await window.__hfWaitForSeekCompletion();
      return false;
    }
    timeline.seek(atSec, false);
    return true;
  }

  async function sample(timeline, times) {
    if (!timeline || typeof timeline.seek !== "function") throw new Error("layout probe: expected a seekable GSAP timeline");
    const samples = [];
    for (const atSec of times) {
      const emulateClips = await seek(timeline, atSec);
      samples.push({ atSec, runs: collect(atSec, emulateClips) });
    }
    timeline.seek(0, false);
    return { viewport: { width: innerWidth, height: innerHeight }, samples };
  }

  return { sample };
});
