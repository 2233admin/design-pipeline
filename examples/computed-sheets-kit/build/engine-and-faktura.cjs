const { emit } = require('./common.cjs');
const UE = '../art/ue-depth.jpg', KO = '../art/constructivist.jpg';
const SERIF = "'Noto Serif SC','Noto Serif CJK SC',serif";
{ // UE-style depth: raster render + a quiet HUD
  let s = `<image href="${UE}" x="0" y="0" width="1920" height="1080"/>`;
  s += `<text x="72" y="96" class="h">DEPTH CANYON</text><text x="74" y="126" class="m">600519.XSHG · 91 L2 SNAPSHOTS · HEIGHT = CUMULATIVE SIZE · DEPTH = TIME</text>`;
  s += `<rect x="74" y="146" width="10" height="10" fill="#ffb020"/><text x="94" y="155" class="m" style="fill:#ffb020">SIM · NOT MARKET DATA</text>`;
  s += `<text x="1848" y="1020" class="m" text-anchor="end">HEIGHTFIELD RAY MARCH · SOFT SHADOW · AO · HEIGHT FOG · GOD RAYS · DOF · BLOOM · ACES</text>`;
  emit('DepthUE', 'Depth canyon · engine look', 1920, 1080, `.h{font:400 34px Michroma;fill:#fff3e6;letter-spacing:.2em}.m{font:400 12px 'IBM Plex Mono';fill:#f4e2d0;letter-spacing:.14em}`, s, '#120806');
}
{ // constructivist composition
  let s = `<image href="${KO}" x="0" y="0" width="1920" height="1080"/>`;
  s += `<text transform="translate(1000,1012)" class="big">FAKTURA</text><text transform="translate(1010,1052)" class="m">MATERIAL · FORM · CONSTRUCTION</text>`;
  s += `<text transform="translate(1790,140) rotate(90)" class="cn">材质即构成</text>`;
  [['01 POROUS CRUST', 124, 106], ['02 SAND RIPPLE', 760, 300], ['03 DUSK', 1100, 90], ['04 TORN PAPER', 1330, 668]].forEach(([t, x, y]) => s += `<text x="${x}" y="${y}" class="lab">${t}</text>`);
  s += `<text x="124" y="980" class="m">ALL TEXTURES COMPUTED: CAVITIES AT 3 SCALES · sin(v + fbm) · SKY GRADIENT · RANDOM-WALK TEAR</text>`;
  emit('Constructivist', 'Faktura · constructivist composition', 1920, 1080, `.big{font:600 120px 'Inter Tight';fill:#141414;letter-spacing:-.02em}.cn{font:900 64px ${SERIF};fill:#c71f14;letter-spacing:.2em}.lab{font:500 13px 'IBM Plex Mono';fill:#141414;letter-spacing:.14em}.m{font:400 12px 'IBM Plex Mono';fill:#141414;letter-spacing:.14em}`, s, '#ede6d6');
}
