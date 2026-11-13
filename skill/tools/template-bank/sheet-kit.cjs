"use strict";

// Sheet kit: reusable parts for industrial document sheets about a real subject
// (see references/industrial-document-sheets.md). A sheet is a JSON spec: frame + title +
// one computed hero + a side column of blocks + optional notes. Every hero is drawn from data
// the spec carries, never by eye. render(spec) returns { svg, html, findings }.

const DIALECTS = {
  paper: { ground: "#e7eaed", ink: "#1d232b", mute: "#5d6670", hair: "#1d232b", panel: "#eef1f3", shade: "#cfd7de" },
  terminal: { ground: "#0d1620", ink: "#e6edf3", mute: "#8ea2b5", hair: "#9fb3c6", panel: "#132332", shade: "#2b4a66" },
  field: { ground: "#f1f0ea", ink: "#1d2024", mute: "#5e6369", hair: "#1d2024", panel: "#e6e4dc", shade: "#d9d6cb" },
};
const DENSITY = { airy: { annotations: 6, fields: 4 }, standard: { annotations: 12, fields: 8 }, dense: { annotations: 40, fields: 16 } }; // method §5
const FONTS = { display: "Michroma", mono: "IBM Plex Mono", hand: "Nothing You Could Do" };
const GOOGLE_FONTS = "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Michroma&family=Nothing+You+Could+Do&display=swap";

const r = (x) => (Math.round(x * 10) / 10).toString();
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ---------------------------------------------------------------- frame parts
function frame(ctx) {
  const { W, H, t, spec } = ctx; let s = "";
  s += `<rect width="${W}" height="${H}" fill="${t.ground}"/>`;
  s += `<g filter="url(#sk-b40)" opacity=".55"><ellipse cx="${W * .75}" cy="${H * .72}" rx="${W * .27}" ry="${H * .15}" fill="${t.shade}"/><ellipse cx="${W * .18}" cy="${H * .3}" rx="${W * .2}" ry="${H * .08}" fill="${t.shade}"/></g>`;
  s += `<rect width="${W}" height="${H}" fill="url(#sk-dots)"/>`;
  for (const [x, y] of [[72, 72], [W - 72, 72], [72, H - 72], [W - 72, H - 72]]) s += `<rect x="${x - 3}" y="${y - 3}" width="6" height="6" fill="${t.ink}"/>`;
  for (let x = 192; x < W - 100; x += 192) for (const y of [158, H - 120]) s += `<path d="M${x - 5},${y}h10M${x},${y - 5}v10" stroke="${t.hair}" stroke-opacity=".25"/>`;
  const inst = spec.institution || {}, file = spec.file || {};
  s += `<rect x="96" y="82" width="30" height="30" fill="none" stroke="${t.ink}" stroke-width="1.4"/><path d="M101,107 L121,87" stroke="${t.ink}" stroke-width="1.4"/><rect x="114" y="88" width="7" height="7" fill="${ctx.brand}"/>`;
  s += `<text x="142" y="98" class="sk-h1">${esc(inst.name)}</text><text x="142" y="116" class="sk-lab">${esc(inst.department)}</text>`;
  s += `<text x="${W - 96}" y="98" class="sk-h1" text-anchor="end">${esc(file.id)}</text><text x="${W - 96}" y="116" class="sk-lab" text-anchor="end">${esc(file.sheet)}</text>`;
  s += `<line x1="96" y1="134" x2="${W - 96}" y2="134" stroke="${t.hair}" stroke-opacity=".25"/>`;
  const ti = spec.title || {};
  s += `<text x="96" y="214" class="sk-num">${esc(ti.index || "01")}</text><text x="206" y="198" class="sk-h2">${esc(ti.text)}</text><text x="206" y="218" class="sk-lab">${esc(ti.sub)}</text>`;
  // footer: sources (required) + example-value notice + control strip
  let src = esc(spec.sources || "");
  if (ctx.hasExamples) src += " · VALUES MARKED * ARE EXAMPLES";
  s += `<line x1="96" y1="${H - 80}" x2="${W - 96}" y2="${H - 80}" stroke="${t.hair}" stroke-opacity=".2"/><text x="96" y="${H - 58}" class="sk-foot">SOURCES / ${src}</text>`;
  s += `<text x="${W - 96}" y="${H - 58}" class="sk-foot" text-anchor="end">${esc(file.footer || "CONCEPT STUDY")}</text>`;
  ["#2459b3", "#2a8fa0", "#6b8a2a", "#b07a1e", "#c23d3d", "#9b3c8f", "#6d7a86"].forEach((c, i) => { s += `<rect x="${W - 264 + i * 24}" y="${H - 96}" width="22" height="5" fill="${c}" data-deco="control-strip"/>`; });
  return s;
}

// ---------------------------------------------------------------- heroes (data → drawing)
const HEROES = {
  // message sequence between actors; spec: { actors:[a,b], messages:[{from,to,label,detail,selected,dashed}], states:{a:[[i,label]], b:[...]} }
  sequence(ctx, box, h) {
    const { t } = ctx; let s = ""; const [A, B] = h.actors; const LX = box.x + 140, RX = box.x + box.w - 160, T0 = box.y + 60;
    const n = h.messages.length, DT = (box.h - 120) / n;
    for (const [x, name] of [[LX, A], [RX, B]]) { const w = 22 + name.length * 13; s += `<rect x="${x - w / 2}" y="${T0 - 52}" width="${w}" height="20" fill="${t.ink}"/><text x="${x}" y="${T0 - 37}" class="sk-bar" text-anchor="middle">${esc(name)}</text><path d="M${x},${T0} V${T0 + n * DT + 30}" stroke="${t.ink}" stroke-width="1.4"/>`; }
    for (const [side, list] of [[0, h.states?.[A] || []], [1, h.states?.[B] || []]]) for (const [i, lab] of list) s += `<text x="${side ? RX + 14 : LX - 14}" y="${r(T0 + i * DT + 4)}" class="sk-lab" text-anchor="${side ? "start" : "end"}">${esc(lab)}</text>`;
    h.messages.forEach((m, i) => {
      const fwd = m.from === A, x0 = fwd ? LX : RX, x1 = fwd ? RX : LX, y0 = T0 + i * DT + 20, y1 = T0 + (i + 1) * DT;
      const col = m.selected ? ctx.brand : t.ink, w = m.selected ? 3 : 1.4, ang = Math.atan2(y1 - y0, x1 - x0);
      const ah = (k) => `${r(x1 - 12 * Math.cos(ang + k))},${r(y1 - 12 * Math.sin(ang + k))}`;
      s += `<path d="M${x0},${r(y0)} L${x1},${r(y1)}" stroke="${col}" stroke-width="${w}" ${m.dashed ? 'stroke-dasharray="6 5"' : ""}/><path d="M${ah(.4)} L${x1},${r(y1)} L${ah(-.4)}" fill="none" stroke="${col}" stroke-width="${w}"/>`;
      if (m.selected) { s += `<circle r="6" fill="${ctx.brand}" class="sk-pkt" cx="${x0}" cy="${r(y0)}" style="--dx:${r(x1 - x0)}px;--dy:${r(y1 - y0)}px"/>`; ctx.anchors.selected = [x0, y0]; }
      const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, rot = r(ang * 180 / Math.PI + (fwd ? 0 : 180));
      s += `<text x="${r(mx)}" y="${r(my - 14)}" class="sk-pk" text-anchor="middle" style="fill:${col}" transform="rotate(${rot} ${r(mx)} ${r(my)})">${esc(m.label)}</text>`;
      if (m.detail) s += `<text x="${r(mx)}" y="${r(my + 20)}" class="sk-lab" text-anchor="middle" transform="rotate(${rot} ${r(mx)} ${r(my)})">${esc(m.detail)}</text>`;
      ctx.count();
    });
    return s;
  },

  // a header or record laid out on a bit ruler; spec: { title, bits:32, rows:[{label, fields:[{name,bits,value,selected,example}]}] }
  bitfield(ctx, box, h) {
    const { t } = ctx; let s = ""; const bits = h.bits || 32, bit = box.w / bits, RH = 30, GAP = 14, y0 = box.y + 46;
    if (h.title) s += `<text x="${box.x}" y="${box.y}" class="sk-h3">${esc(h.title)}</text>`;
    for (let b = 0; b <= bits; b++) s += `<line x1="${r(box.x + b * bit)}" y1="${y0 - 6}" x2="${r(box.x + b * bit)}" y2="${y0 - (b % 8 ? 2 : 10)}" stroke="${t.ink}"/>`;
    for (const b of [0, 8, 16, 24, bits - 1]) s += `<text x="${r(box.x + b * bit + (b === bits - 1 ? bit / 2 : 0))}" y="${y0 - 14}" class="sk-lab" text-anchor="middle">${b}</text>`;
    h.rows.forEach((row, j) => {
      const y = y0 + j * (RH + GAP); let x = box.x;
      const rowSel = row.fields.some((f) => f.selected);
      s += `<text x="${box.x - 12}" y="${y + 19}" class="sk-lab" text-anchor="end" style="${rowSel ? `fill:${ctx.brand}` : ""}">${esc(row.label)}</text>`;
      for (const f of row.fields) {
        const ww = f.bits * bit, on = f.selected, small = f.bits <= 2;
        s += `<rect x="${r(x)}" y="${y}" width="${r(ww)}" height="${RH}" fill="${on ? ctx.brand : t.panel}" stroke="${t.ink}" stroke-width=".8" class="${on ? "sk-blink" : ""}"/>`;
        s += `<text x="${r(x + ww / 2)}" y="${y + (f.value != null ? 13 : 19)}" class="sk-cell" text-anchor="middle" style="${small ? "font-size:7px;" : ""}${on ? "fill:#fff" : ""}">${esc(f.name)}</text>`;
        if (f.value != null) s += `<text x="${r(x + ww / 2)}" y="${y + 25}" class="sk-cell sk-v" text-anchor="middle">${esc(f.value)}${f.example ? "*" : ""}</text>`;
        if (f.example) ctx.hasExamples = true;
        if (on) { ctx.anchors.field = [x, y + RH / 2]; ctx.anchors.fieldRow = [box.x - 66, y + RH / 2 - 4]; }
        x += ww;
      }
      ctx.count();
    });
    return s;
  },

  // segmented aperture on a flat-top hex grid; spec: { flat_m, scale, rings:[{prefix,dist_flats,offset_deg}], wings_abs_x_flats, dims:{overall,segment} }
  hexmap(ctx, box, h) {
    const { t } = ctx; let s = ""; const F = h.flat_m, R = F / Math.sqrt(3), S = h.scale, MX = box.x + box.w / 2, MY = box.y + box.h / 2;
    const hex = (cx, cy, rad) => Array.from({ length: 6 }, (_, k) => { const a = k * Math.PI / 3; return `${r(cx + Math.cos(a) * rad)},${r(cy + Math.sin(a) * rad)}`; }).join(" ");
    let i = 0;
    for (const ring of h.rings) for (let k = 0; k < 6; k++) {
      const a = (90 - k * 60 - (ring.offset_deg || 0)) * Math.PI / 180, x = Math.cos(a) * ring.dist_flats * F, y = Math.sin(a) * ring.dist_flats * F;
      const px = MX + x * S, py = MY - y * S, wing = h.wings_abs_x_flats && Math.abs(x) > h.wings_abs_x_flats * F;
      s += `<polygon points="${hex(px, py, R * S - 2)}" fill="url(#sk-brand)" stroke="${t.ink}" stroke-width="1.2" class="sk-seg" style="animation-delay:${(i++ * .18).toFixed(2)}s"/><text x="${r(px)}" y="${r(py + 5)}" class="sk-seglab" text-anchor="middle">${esc(ring.prefix + (k + 1))}</text>`;
      if (wing) s += `<polygon points="${hex(px, py, R * S - 2)}" fill="url(#sk-hatch)" opacity=".35"/>`;
    }
    ctx.count();
    s += `<polygon points="${hex(MX, MY, R * S - 2)}" fill="none" stroke="${t.ink}" stroke-dasharray="3 4"/><circle cx="${MX}" cy="${MY}" r="10" fill="${t.ink}"/>`;
    if (h.dims?.overall) { const top = MY - 2.5 * F * S, bot = MY + 2.5 * F * S, dx = MX + 5.2 * R * S; s += `<path d="M${r(dx - 8)},${r(top)}h16M${r(dx - 8)},${r(bot)}h16M${r(dx)},${r(top)}V${r(bot)}" stroke="${t.ink}"/><rect x="${r(dx - 12)}" y="${MY - 46}" width="24" height="92" fill="${t.ground}"/><text transform="translate(${r(dx + 4)},${MY}) rotate(-90)" class="sk-dim" text-anchor="middle">${esc(h.dims.overall)}</text>`; }
    return s;
  },

  // long structure in elevation: groups of equal spans; one group can be marked as failed. spec: { groups:[{count,span_m,height_m,label,failed}], scale_x, scale_y, water, load:{label,angle} }
  elevation(ctx, box, h) {
    const { t } = ctx; let s = ""; const total = h.groups.reduce((a, g) => a + g.count * g.span_m, 0), sx = box.w / total, sy = h.scale_y || 3, base = box.y + box.h * .62;
    s += `<rect x="${box.x}" y="${base + 28}" width="${box.w}" height="${box.h * .3}" fill="${t.shade}" opacity=".6"/>`;
    for (let k = 0; k < 6; k++) { let d = ""; for (let x = 0; x <= box.w; x += 8) d += `${x ? "L" : "M"}${r(box.x + x)},${r(base + 44 + k * 18 + Math.sin(x / 40 + k) * 3)}`; s += `<path d="${d}" fill="none" stroke="${t.ink}" stroke-opacity=".18"/>`; }
    let x = box.x;
    for (const g of h.groups) {
      const gx0 = x;
      for (let i = 0; i < g.count; i++) {
        const w = g.span_m * sx, top = base - g.height_m * sy;
        if (!g.failed) s += `<rect x="${r(x)}" y="${r(top)}" width="${r(w)}" height="${r(g.height_m * sy)}" fill="none" stroke="${t.ink}" stroke-width="1"/>${g.height_m * sy > 10 ? `<path d="M${r(x)},${r(top)} L${r(x + w)},${r(base)} M${r(x + w)},${r(top)} L${r(x)},${r(base)}" stroke="${t.ink}" stroke-opacity=".35"/>` : ""}`;
        else s += `<rect x="${r(x)}" y="${r(top)}" width="${r(w)}" height="${r(g.height_m * sy)}" fill="none" stroke="${ctx.brand}" stroke-dasharray="4 4" class="sk-blink"/><path d="M${r(x + 2)},${r(base + 34)} l${r(w - 4)},${r(6 + (i % 3) * 4)}" stroke="${ctx.brand}" stroke-width="3"/>`;
        s += `<rect x="${r(x + w - 2)}" y="${base}" width="4" height="34" fill="${g.failed ? ctx.brand : t.ink}" opacity="${g.failed ? .55 : .8}"/>`;
        x += w;
      }
      s += `<path d="M${r(gx0)},${r(base + box.h * .34)} v8 H${r(x)} v-8" fill="none" stroke="${g.failed ? ctx.brand : t.ink}"/><text x="${r((gx0 + x) / 2)}" y="${r(base + box.h * .34 + 26)}" class="sk-lab" text-anchor="middle" style="${g.failed ? `fill:${ctx.brand}` : ""}">${esc(g.label)}</text>`;
      if (g.failed) ctx.anchors.failed = [(gx0 + x) / 2, base - g.height_m * sy];
      ctx.count();
    }
    if (h.load) {
      // load acts across the structure, i.e. into the page in an elevation: draw it as ⊗ glyphs over the marked group
      const cx = ctx.anchors.failed ? ctx.anchors.failed[0] : box.x + box.w / 2, cy = (ctx.anchors.failed ? ctx.anchors.failed[1] : base) - 70;
      for (let k = -3; k <= 3; k++) { const gx = cx + k * 46; s += `<g class="sk-gust" style="animation-delay:${(k + 3) * .2}s"><circle cx="${r(gx)}" cy="${r(cy)}" r="11" fill="none" stroke="${t.ink}" stroke-width="1.4"/><path d="M${r(gx - 7)},${r(cy - 7)} l14,14 m0,-14 l-14,14" stroke="${t.ink}" stroke-width="1.4"/></g>`; }
      s += `<text x="${r(cx)}" y="${r(cy - 26)}" class="sk-lab sk-b" text-anchor="middle">${esc(h.load.label)}</text>`;
    }
    if (h.ends) { s += `<text x="${box.x}" y="${r(base - 20)}" class="sk-lab">${esc(h.ends[0])}</text><text x="${box.x + box.w}" y="${r(base - 20)}" class="sk-lab" text-anchor="end">${esc(h.ends[1])}</text>`; }
    return s;
  },

  // gnomon and horizontal scale, noon shadows computed from latitude and solar declination.
  // spec: { gnomon_m, latitude_deg, obliquity_deg, scale_m, marks:[{label,decl_deg}] }
  gnomon(ctx, box, h) {
    const { t } = ctx; let s = ""; const S = box.w / (h.scale_m + 2), gx = box.x + 30, base = box.y + box.h - 60, top = base - h.gnomon_m * S;
    s += `<rect x="${gx}" y="${base}" width="${r(h.scale_m * S)}" height="16" fill="${t.panel}" stroke="${t.ink}"/>`;
    for (let m = 0; m <= h.scale_m; m++) s += `<line x1="${r(gx + m * S)}" y1="${base}" x2="${r(gx + m * S)}" y2="${base + (m % 5 ? 6 : 16)}" stroke="${t.ink}"/>${m % 5 ? "" : `<text x="${r(gx + m * S)}" y="${base + 34}" class="sk-lab" text-anchor="middle">${m}</text>`}`;
    s += `<rect x="${gx - 26}" y="${r(top)}" width="26" height="${r(base - top)}" fill="${t.panel}" stroke="${t.ink}"/><line x1="${gx - 30}" y1="${r(top)}" x2="${gx + 10}" y2="${r(top)}" stroke="${t.ink}" stroke-width="3"/>`;
    h.marks.forEach((m, i) => {
      const z = (h.latitude_deg - m.decl_deg) * Math.PI / 180, L = h.gnomon_m * Math.tan(z), x = gx + L * S, sel = !!m.selected;
      m.length_m = L;
      s += `<path d="M${gx},${r(top)} L${r(x)},${base}" stroke="${sel ? ctx.brand : t.ink}" stroke-width="${sel ? 2.4 : 1}" ${sel ? "" : 'stroke-dasharray="5 4"'} class="${sel ? "sk-ray" : ""}"/>`;
      s += `<path d="M${r(x)},${base - 10} v-14" stroke="${sel ? ctx.brand : t.ink}" stroke-width="2"/><text x="${r(x)}" y="${base - 30 - (i % 2) * 18}" class="sk-lab sk-b" text-anchor="middle" style="${sel ? `fill:${ctx.brand}` : ""}">${esc(m.label)} ${L.toFixed(2)} M</text>`;
      if (sel) ctx.anchors.selected = [x, base];
      ctx.count();
    });
    s += `<text x="${gx - 40}" y="${r((top + base) / 2)}" class="sk-dim" text-anchor="end">${h.gnomon_m} M</text>`;
    return s;
  },
};

// ---------------------------------------------------------------- side blocks
const BLOCKS = {
  table(ctx, x, y, w, b) { let s = b.title ? `<text x="${x}" y="${y}" class="sk-h3">${esc(b.title)}</text>` : ""; let yy = y + (b.title ? 34 : 0); for (const [k, v] of b.rows) { s += `<text x="${x}" y="${yy}" class="sk-lab">${esc(k)}</text><text x="${x + w}" y="${yy}" class="sk-lab sk-b" text-anchor="end">${esc(v)}</text><line x1="${x}" y1="${yy + 9}" x2="${x + w}" y2="${yy + 9}" stroke="${ctx.t.hair}" stroke-opacity=".15"/>`; yy += 26; ctx.count("field"); } return [s, yy - y]; },
  bill(ctx, x, y, w, b) { let s = `<text x="${x}" y="${y}" class="sk-h3">${esc(b.title || "BILL OF ELEMENTS")}</text><line x1="${x}" y1="${y + 14}" x2="${x + w}" y2="${y + 14}" stroke="${ctx.t.ink}"/>`; let yy = y + 38; b.rows.forEach(([n, o, struck], i) => { s += `<text x="${x}" y="${yy}" class="sk-idx">${String(i + 1).padStart(2, "0")}</text><text x="${x + 46}" y="${yy}" class="sk-row" style="${struck ? "text-decoration:line-through;opacity:.5" : ""}">${esc(n)}</text><text x="${x + w}" y="${yy}" class="sk-row" text-anchor="end">${esc(o)}</text><line x1="${x}" y1="${yy + 8}" x2="${x + w}" y2="${yy + 8}" stroke="${ctx.t.hair}" stroke-opacity=".12"/>`; yy += 25; ctx.count("field"); }); return [s, yy - y]; },
  metrics(ctx, x, y, w, b) { let s = ""; b.items.forEach(([k, v], i) => { const yy = y + i * 70; s += `<rect x="${x}" y="${yy - 6}" width="4" height="52" fill="${ctx.brand}"/><text x="${x + 18}" y="${yy + 8}" class="sk-lab">${esc(k)}</text><text x="${x + 18}" y="${yy + 40}" class="sk-big">${esc(v)}</text>`; ctx.count("field"); }); return [s, b.items.length * 70]; },
  tabs(ctx, x, y, w, b) { let s = b.caption ? `<text x="${x}" y="${y - 14}" class="sk-lab">${esc(b.caption)}</text>` : ""; let tx = x; for (const it of b.items) { const on = it === b.active, tw = 32 + it.length * 12; s += `<rect x="${tx}" y="${y}" width="${tw}" height="26" fill="${on ? ctx.brand : "none"}" stroke="${on ? ctx.brand : ctx.t.mute}"/><text x="${tx + tw / 2}" y="${y + 18}" class="sk-tab" text-anchor="middle" style="fill:${on ? "#fff" : ctx.t.mute}">${esc(it)}</text>`; tx += tw + 8; } if (b.live) s += `<circle cx="${tx + 12}" cy="${y + 13}" r="3.5" fill="${ctx.brand}" class="sk-blink"/><text x="${tx + 22}" y="${y + 17}" class="sk-lab">${esc(b.live)}</text>`; return [s, 40]; },
  hero(ctx, x, y, w, b) { const box = { x, y, w, h: b.height || 300 }; return [HEROES[b.hero.type](ctx, box, b.hero), box.h]; },
  barcode(ctx, x, y, w, b) { let s = "", bx = x; for (let i = 0; bx < x + w * .8; i++) { const ww = 1 + ((i * 7919) % 4); s += `<rect x="${bx}" y="${y}" width="${ww}" height="38" fill="${ctx.t.ink}"/>`; bx += ww + 1 + ((i * 104729) % 3); } return [s + `<text x="${x}" y="${y + 58}" class="sk-lab">${esc(b.caption)}</text>`, 64]; },
};

// ---------------------------------------------------------------- notes
function notes(ctx, list = []) {
  let s = "";
  for (const n of list) {
    if (n.type === "hand") {
      s += `<text x="${n.at[0]}" y="${n.at[1]}" class="sk-hand" transform="rotate(${n.rotate ?? -5} ${n.at[0]} ${n.at[1]})">${esc(n.text)}</text>`;
      const to = n.to === "selected" ? ctx.anchors.selected : n.to === "failed" ? ctx.anchors.failed : n.to;
      if (to) { const [x0, y0] = [n.at[0] - 8, n.at[1] - 6], [x1, y1] = to; s += `<path d="M${x0},${y0} C${r(x0 - 80)},${y0} ${r(x1 + 40)},${r(y1 - 60)} ${r(x1)},${r(y1 - 8)}" class="sk-pen"/><path d="M${r(x1 - 8)},${r(y1 - 22)} L${r(x1)},${r(y1 - 8)} L${r(x1 + 10)},${r(y1 - 20)}" class="sk-pen"/>`; }
      ctx.count();
    } else if (n.type === "object") {
      const [x, y] = n.at; s += `<circle cx="${x}" cy="${y}" r="34" fill="url(#sk-ball)"/><line x1="${x}" y1="${y - 36}" x2="${x}" y2="${y - 64}" stroke="${ctx.t.ink}"/><text x="${x - 60}" y="${y - 84}" class="sk-lab sk-b">${esc(n.text)}</text><text x="${x - 60}" y="${y - 68}" class="sk-lab">${esc(n.sub || "NOT TO SCALE")}</text>`;
      ctx.count();
    } else if (n.type === "link" && ctx.anchors.selected && ctx.anchors.field) {
      // route: out of the selected item, along a clear gutter, into the left edge of the field's row
      const [ax, ay] = ctx.anchors.selected, [rx, ry] = ctx.anchors.fieldRow, mid = n.x || rx - 84;
      s += `<circle cx="${ax}" cy="${ay}" r="9" fill="none" stroke="${ctx.brand}" stroke-width="1.5"/><path d="M${ax + 9},${ay} H${mid} V${ry} H${rx}" fill="none" stroke="${ctx.brand}"/><path d="M${rx - 8},${ry - 5} L${rx},${ry} L${rx - 8},${ry + 5}" fill="none" stroke="${ctx.brand}"/>`;
    }
  }
  return s;
}

// ---------------------------------------------------------------- compose + checks
function render(spec) {
  const W = spec.canvas?.width || 1920, H = spec.canvas?.height || 1080;
  const t = DIALECTS[spec.dialect || "paper"]; if (!t) throw new Error(`unknown dialect ${spec.dialect}`);
  const density = DENSITY[spec.density || "standard"];
  const ctx = { W, H, t, spec, brand: spec.brand || "#c23a2e", anchors: {}, hasExamples: false, annotations: 0, fields: 0, count(kind = "hero") { if (kind === "field") this.fields += 1; else this.annotations += 1; } };
  const findings = [];
  if (!spec.sources) findings.push({ rule: "sources-required", message: "a sheet about a real subject needs a sources line" });
  for (const k of ["institution", "file", "title"]) if (!spec[k]) findings.push({ rule: "frame-incomplete", message: `missing ${k}` });

  const hero = spec.hero || {}; const heroBox = { x: 96 + (spec.layout?.heroInset || 40), y: 280, w: (spec.layout?.heroWidth || W * .6), h: H - 280 - 150 };
  let body = HEROES[hero.type] ? HEROES[hero.type](ctx, heroBox, hero) : (findings.push({ rule: "hero-unknown", message: `hero type ${hero.type}` }), "");
  const SX = spec.layout?.sideX || W - 96 - (spec.layout?.sideWidth || 400), SW = spec.layout?.sideWidth || 400; let sy = spec.layout?.sideY || 270;
  for (const b of spec.side || []) { if (!BLOCKS[b.type]) { findings.push({ rule: "block-unknown", message: b.type }); continue; } const [s, h] = BLOCKS[b.type](ctx, SX, sy, SW, b); body += s; sy += h + (b.gap ?? 40); }
  if (sy > H - 110) findings.push({ rule: "side-overflow", message: `side column ends at ${Math.round(sy)}, beyond ${H - 110}` });
  body += notes(ctx, spec.notes);
  if (ctx.annotations > density.annotations) findings.push({ rule: "density-budget", message: `${ctx.annotations} annotations on the hero exceed the ${spec.density || "standard"} budget of ${density.annotations}; delete, do not shrink` });
  if (ctx.fields > density.fields) findings.push({ rule: "density-budget", message: `${ctx.fields} text-column fields exceed the ${spec.density || "standard"} budget of ${density.fields}; delete, do not shrink` });
  const head = frame(ctx);

  const defs = `<defs><filter id="sk-b40"><feGaussianBlur stdDeviation="40"/></filter>
<pattern id="sk-dots" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="1" height="1" fill="${t.ink}" opacity=".07"/></pattern>
<pattern id="sk-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="${t.ink}" stroke-opacity=".4"/></pattern>
<linearGradient id="sk-brand" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${ctx.brand}" stop-opacity=".78"/><stop offset=".5" stop-color="${ctx.brand}"/><stop offset="1" stop-color="${ctx.brand}" stop-opacity=".88"/></linearGradient>
<radialGradient id="sk-ball" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="${ctx.brand}"/><stop offset="1" stop-color="${t.ink}"/></radialGradient></defs>`;
  const css = `
.sk-h1{font:400 17px ${FONTS.display};fill:${t.ink};letter-spacing:.18em}.sk-h2{font:400 24px ${FONTS.display};fill:${t.ink};letter-spacing:.14em}.sk-h3{font:400 14px ${FONTS.display};fill:${t.ink};letter-spacing:.16em}
.sk-num{font:400 44px ${FONTS.display};fill:${ctx.brand}}.sk-bar{font:400 12px ${FONTS.display};fill:${t.ground};letter-spacing:.12em}.sk-tab{font:400 11px ${FONTS.display};letter-spacing:.1em}.sk-pk{font:400 13px ${FONTS.display};letter-spacing:.14em}
.sk-lab{font:400 10px '${FONTS.mono}';fill:${t.mute};letter-spacing:.15em}.sk-b{fill:${t.ink};font-weight:500}
.sk-cell{font:500 8.5px '${FONTS.mono}';fill:${t.ink};letter-spacing:.08em}.sk-v{font-weight:400;fill:${t.mute}}
.sk-dim{font:500 12px '${FONTS.mono}';fill:${t.ink};letter-spacing:.1em}.sk-seglab{font:500 13px '${FONTS.mono}';fill:${t.ink}}
.sk-idx{font:400 13px ${FONTS.display};fill:${ctx.brand}}.sk-row{font:400 11px '${FONTS.mono}';fill:${t.ink};letter-spacing:.12em}.sk-big{font:400 26px ${FONTS.display};fill:${t.ink}}
.sk-foot{font:400 8.5px '${FONTS.mono}';fill:${t.mute};letter-spacing:.14em}
.sk-hand{font:28px '${FONTS.hand}';fill:${t.ink}}.sk-pen{fill:none;stroke:${t.ink};stroke-width:1.6;stroke-linecap:round}
@keyframes sk-pkt{0%{transform:translate(0,0);opacity:0}8%{opacity:1}80%{transform:translate(var(--dx),var(--dy));opacity:1}100%{transform:translate(var(--dx),var(--dy));opacity:0}}.sk-pkt{animation:sk-pkt 2.4s cubic-bezier(.5,0,.3,1) infinite}
@keyframes sk-blink{50%{opacity:.55}}.sk-blink{animation:sk-blink 1.6s ease-in-out infinite}
@keyframes sk-phase{0%,4%{filter:brightness(1)}2%{filter:brightness(1.35)}}.sk-seg{animation:sk-phase 6s ease-in-out infinite}
@keyframes sk-gust{0%,100%{opacity:.35}50%{opacity:1}}.sk-gust{animation:sk-gust 1.4s ease-in-out infinite}
@keyframes sk-ray{0%,100%{stroke-opacity:1}50%{stroke-opacity:.45}}.sk-ray{animation:sk-ray 3s ease-in-out infinite}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}`;
  const svgInner = defs + head + body;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" data-hue-brand="${ctx.brand}"><style>${css}</style>${svgInner}</svg>`;
  const html = `<!DOCTYPE html><html lang="${spec.lang || "en"}"><head><meta charset="utf-8"><title>${esc(spec.title?.text)}</title><link rel="stylesheet" href="${GOOGLE_FONTS.replace(/&/g, "&amp;")}"><style>body{margin:0;background:${t.ground}}</style></head><body>${svg}</body></html>`;
  return { svg, html, css, inner: svgInner, width: W, height: H, ground: t.ground, findings, annotations: ctx.annotations, fields: ctx.fields };
}

// The four intake questions (method §1, §3, §5): ask at most these, then build.
const INTAKE = [
  { id: "format", question: "Format and size?", options: ["1920x1080 screen", "1080x1350 feed", "A2 print portrait", "1600x900 slide"] },
  { id: "institution", question: "Which institution issues the sheet (real, or invented for the subject)?" },
  { id: "dialect", question: "Dialect?", options: Object.keys(DIALECTS) },
  { id: "density", question: "Information density?", options: Object.keys(DENSITY) },
];

module.exports = { render, HEROES, BLOCKS, DIALECTS, DENSITY, INTAKE };

if (require.main === module) {
  const fs = require("node:fs");
  const [specPath, out] = process.argv.slice(2);
  if (!specPath) { console.error("usage: node sheet-kit.cjs <spec.json> [out.html|out.svg]"); process.exit(1); }
  const res = render(JSON.parse(fs.readFileSync(specPath, "utf8")));
  if (out) fs.writeFileSync(out, out.endsWith(".svg") ? res.svg : res.html);
  console.log(JSON.stringify({ findings: res.findings, annotations: res.annotations, fields: res.fields }, null, 2));
  process.exit(res.findings.length ? 2 : 0);
}
