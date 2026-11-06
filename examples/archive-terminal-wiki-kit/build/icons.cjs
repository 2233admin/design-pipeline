"use strict";

// The kit's own line icons: 24x24 grid, 2px round strokes in currentColor, drawn for this kit.
// Each entry is the inner SVG markup of one symbol.
const ICONS = {
  home: '<path d="M4 11 12 4l8 7"/><path d="M6 10v10h12V10"/><path d="M10 20v-5h4v5"/>',
  shuffle: '<path d="M4 7h3c4 0 6 10 10 10h3"/><path d="M4 17h3c1.6 0 2.8-1.4 3.8-3"/><path d="M13.2 10C14.2 8.4 15.4 7 17 7h3"/><path d="m17 4 3 3-3 3"/><path d="m17 14 3 3-3 3"/>',
  index: '<path d="M5 5v14"/><path d="M5 8h3"/><path d="M5 16h3"/><path d="M11 6h9"/><path d="M11 10h6"/><path d="M11 14h9"/><path d="M11 18h6"/>',
  history: '<path d="M4 12a8 8 0 1 0 2.3-5.7"/><path d="M4 4v3.5h3.5"/><path d="M12 8v4l3 2"/>',
  agent: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.6-3.8 3.4-6 7-6s6.4 2.2 7 6"/><path d="m9 17 3 2 3-2"/>',
  arms: '<path d="M5 19 17 7"/><path d="m15 5 4 4"/><path d="m4 16 4 4"/><path d="M19 19 13 13"/><path d="m4 5 4 4"/>',
  module: '<rect x="6" y="6" width="12" height="12"/><path d="M10 10h4v4h-4z"/><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"/>',
  threat: '<path d="M12 3 20 7.5v9L12 21 4 16.5v-9z"/><circle cx="12" cy="12" r="3"/><path d="M12 6v3M12 15v3"/>',
  supply: '<path d="M3 8h18v12H3z"/><path d="M8 8V5h8v3"/><path d="M3 13h18"/><path d="M11 12h2v2h-2z"/>',
  recruit: '<path d="M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4z"/><path d="M10 7v10" stroke-dasharray="2 2"/><path d="m15 10 .8 1.6 1.7.2-1.2 1.2.3 1.7-1.6-.8-1.5.8.3-1.7-1.2-1.2 1.7-.2z"/>',
  outpost: '<path d="M6 21V4"/><path d="M6 5h11l-2 3.5L17 12H6"/><path d="M3 21h8"/>',
  depot: '<path d="M3 4h2l2.5 11h10L20 8H7"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/>',
  map: '<path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>',
  event: '<rect x="4" y="5" width="16" height="15"/><path d="M4 10h16M9 3v4M15 3v4"/><path d="m12 12 .9 1.8 2 .3-1.4 1.4.3 2-1.8-.9-1.8.9.3-2-1.4-1.4 2-.3z"/>',
  contract: '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/><path d="m9 14 2 2 4-4"/>',
  log: '<rect x="3" y="4" width="18" height="16"/><path d="m7 9 3 3-3 3"/><path d="M12 15h5"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="m20 20-4.5-4.5"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h10"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 7 7 0 1 0 20 14.5z"/>',
  monitor: '<rect x="3" y="4" width="18" height="12"/><path d="M8 20h8M12 16v4"/>',
  notice: '<path d="M4 10v4h3l7 4V6L7 10z"/><path d="M17.5 9a4 4 0 0 1 0 6"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7"/><path d="M12 17h.01"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  chevronRight: '<path d="m9 6 6 6-6 6"/>',
  chevronLeft: '<path d="m15 6-6 6 6 6"/>',
  arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z"/>',
  starFill: '<path fill="currentColor" stroke="none" d="m12 2.5 2.9 5.9 6.6.9-4.8 4.6 1.2 6.5L12 17.3l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9z"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13 7 4 4"/>',
  sort: '<path d="m7 10 5 5 5-5"/>',
  filter: '<path d="M4 5h16l-6 8v6l-4-2v-4z"/>',
  reset: '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4h4"/>',
  collapse: '<rect x="3" y="4" width="18" height="16"/><path d="M9 4v16"/><path d="m15 10-2 2 2 2"/>',
  grid: '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>',
  rows: '<path d="M4 5h16M4 10h16M4 15h16M4 20h16"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
  alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13"/><path d="M8 7V4h8v3"/><path d="M3 12h18"/>',
  database: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6"/><path d="M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>',
  cake: '<path d="M4 20h16v-8H4z"/><path d="M4 15c2 1.5 4 1.5 6 0s4-1.5 6 0 3 1 4 0"/><path d="M8 12V9M12 12V9M16 12V9"/>',
  userPlus: '<circle cx="10" cy="8" r="4"/><path d="M3 21c1-4 3.5-6 7-6 1.3 0 2.5.3 3.5.8"/><path d="M18 14v6M15 17h6"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  book: '<path d="M4 5c3-1 6-1 8 1 2-2 5-2 8-1v14c-3-1-6-1-8 1-2-2-5-2-8-1z"/><path d="M12 6v14"/>',
  sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  external: '<path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M18 14v6H4V6h6"/>',
  copy: '<rect x="8" y="8" width="12" height="12"/><path d="M16 8V4H4v12h4"/>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  bolt: '<path d="M13 3 5 14h6l-1 7 8-11h-6z"/>',
  snow: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/><path d="m9.5 4.5 2.5 2 2.5-2M9.5 19.5l2.5-2 2.5 2"/>',
  shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>',
};

// The archive mark: an isometric crate with a lid and a hairline grid; ours, used in place of a logo.
const MARK = '<svg class="at-brand__mark" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M6 14 20 7l14 7v14l-14 7-14-7z"/><path d="M6 14l14 7 14-7"/><path d="M20 21v14"/><path d="M11 11.5 25 18.5" stroke-width="1.2"/><path d="M24 26.5l5-2.5M24 30l5-2.5" stroke-width="1.2"/></svg>';

function symbol(name) {
  return `<symbol id="i-${name}" viewBox="0 0 24 24">${ICONS[name]}</symbol>`;
}

function sprite(names = Object.keys(ICONS)) {
  return `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>${names.map(symbol).join("")}</defs></svg>`;
}

// <use> reference for pages that carry the sprite.
function use(name, cls = "at-icon") {
  if (!ICONS[name]) throw new Error(`unknown icon ${name}`);
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><use href="#i-${name}"/></svg>`;
}

// Inline copy for component previews (a preview is a standalone document with no sprite).
function inline(name, cls = "at-icon") {
  if (!ICONS[name]) throw new Error(`unknown icon ${name}`);
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[name]}</svg>`;
}

module.exports = { ICONS, MARK, sprite, use, inline };
