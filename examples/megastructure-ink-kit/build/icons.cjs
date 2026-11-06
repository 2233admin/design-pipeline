"use strict";

// The kit's line icons: 24-unit grid, 1.5-unit square-capped strokes in currentColor, no fills.
// Drawn for this kit; thin like the HUD lines they sit beside.
const PATHS = {
  menu: '<path d="M4 7h16M4 12h16M4 17h10"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  arrow: '<path d="M4 12h15M14 7l5 5-5 5"/>',
  down: '<path d="M12 3v15M7 13l5 5 5-5M5 21h14"/>',
  play: '<path d="M8 5v14l11-7z"/>',
  signal: '<path d="M12 18v-2M8 18v-5M16 18v-8M4 18v-1M20 18V6"/>',
  mute: '<path d="M4 18v-1M8 18v-5M12 18v-2M3 4l18 16"/>',
  alert: '<path d="M12 3 22 20H2z"/><path d="M12 10v5M12 17.5v.5"/>',
  lock: '<path d="M6 11h12v9H6z"/><path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3"/>',
  check: '<path d="M4 12.5l5 5L20 6.5"/>',
  terminal: '<path d="M3 5h18v14H3z"/><path d="M7 10l3 2-3 2M12 15h5"/>',
  map: '<path d="M4 4h6v16H4zM14 4h6v6h-6zM14 14h6v6h-6z"/>',
  user: '<path d="M12 4v8M8 20v-5h8v5"/><path d="M9 4h6"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M4 20h16"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  wave: '<path d="M2 12h4l2-6 3 12 3-9 2 3h6"/>',
  scale: '<path d="M4 20V4M4 20h16M8 16v4M12 12v8M16 8v12M20 4v16"/>',
};

const attrs = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true" focusable="false"';

// Pages reference a sprite; previews inline the paths.
function inline(name, cls = "ms-icon") {
  if (!PATHS[name]) throw new Error(`unknown icon ${name}`);
  return `<svg class="${cls}" ${attrs}>${PATHS[name]}</svg>`;
}
function use(name, cls = "ms-icon") {
  if (!PATHS[name]) throw new Error(`unknown icon ${name}`);
  return `<svg class="${cls}" ${attrs}><use href="#i-${name}"/></svg>`;
}
function sprite(names) {
  return `<svg class="ms-sprite" aria-hidden="true" focusable="false"><defs>${[...new Set(names)].map((n) => `<symbol id="i-${n}" viewBox="0 0 24 24">${PATHS[n]}</symbol>`).join("")}</defs></svg>`;
}

module.exports = { PATHS, inline, use, sprite };
