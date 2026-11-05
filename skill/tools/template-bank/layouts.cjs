"use strict";

// Layout code for each template id: geometry only. Defaults, ranges, slot budgets, palette and
// provenance live in templates/<id>/manifest.json. Proportions are fractions of W and H measured
// from the reference corpus (docs/research/arknights-endfield-template-study.md); no traced art,
// logos or official text: image and logo areas are hatched placeholder slots.
// Port of the art-study build.py, with each text slot given a box, figure and crop zones, and
// shared alignment lines so `template check` can measure them.

const letter = (p) => ({ width: p.letter_width, stroke: p.letter_stroke, chamfer: p.letter_chamfer, stencil: p.letter_stencil });

const LAYOUTS = {
  "kv.outfit-title-left"(d) {
    const { W, H, p } = d;
    const mx = p.margin_x * W;
    const my = p.margin_y * H;
    d.rect(0, 0, W, H, "bg");
    if (p.watermark) d.lettering("watermark_word", W * 0.3, H * 0.2, H * 0.42, { role: "water", width: 0.62, stroke: 0.11, chamfer: 0.06, tracking: 20, trim: false });
    const fx0 = (p.fig_cx - p.fig_w / 2) * W;
    d.image("figure", fx0, 0, p.fig_w * W, H, "transparent cut-out, may bleed bottom");
    d.image("logo", mx, my, 0.11 * W, 0.06 * H);
    d.line(mx + 0.12 * W, my, mx + 0.12 * W, my + 0.06 * H, "rule", 2);
    d.lettering("series_label", mx + 0.13 * W, my + 0.008 * H, 0.022 * H, { stroke: 0.16, width: 0.62, tracking: 60 });
    d.text("series_sub", mx + 0.13 * W, my + 0.055 * H, 0.016 * H, { role: "ink2", weight: 500 });
    const tx = p.title_x0 * W;
    const colW = p.title_w_max * W;
    const lh = p.latin_h * H;
    const ty = p.title_cy * H - 0.09 * H;
    const row = (y, h) => [tx - d.pad, y - 0.12 * h, colW + d.pad, h * 1.24];
    d.lettering("title_latin_1", tx, ty, lh, { ...letter(p), box: row(ty, lh) });
    d.lettering("title_latin_2", tx, ty + lh * p.line_gap, lh, { ...letter(p), box: row(ty + lh * p.line_gap, lh) });
    const by = ty + lh * (p.line_gap + 1.27);
    d.rect(tx, by, 0.05 * W, 0.006 * H, "accent");
    const ch = p.cjk_h * H;
    const cjkBase = by + 0.075 * H;
    d.text("title_cjk", tx, cjkBase, ch, { family: "serif", weight: 900, box: [tx - d.pad, cjkBase - ch, colW + d.pad, ch * 1.25] });
    const itemBase = cjkBase + 0.04 * H;
    d.text("item_line", tx, itemBase, 0.02 * H, { role: "ink2", weight: 500, box: [tx - d.pad, itemBase - 0.02 * H, colW + d.pad, 0.025 * H] });
    const metaY = 0.8 * H;
    for (let i = 0; i < 2; i += 1) {
      d.lettering(`meta_label_${i}`, mx, metaY + i * 0.045 * H, 0.014 * H, { stroke: 0.18, tracking: 80 });
      d.text(`meta_value_${i}`, mx + 0.07 * W, metaY + i * 0.045 * H + 0.014 * H, 0.016 * H, { role: "ink2", weight: 400 });
    }
    d.line(mx, H - my, W - mx, H - my, "rule", 1.5);
    d.text("copyright", W - mx, H - my + 0.03 * H, 0.013 * H, { role: "ink2", weight: 400, anchor: "end" });
    d.guideRect(mx, my, W - 2 * mx, H - 2 * my, "safe (margins)");
    d.guideRect(tx, ty - 0.02 * H, colW, 0.36 * H, "title column");
    d.zone("figure", "figure", [fx0, 0, p.fig_w * W, H], { maxOverlap: 0.3, param: "title_x0", figureParam: "fig_cx" });
    d.align("left", "left", mx, ["logo", "title_latin_1", "title_latin_2", "title_cjk", "item_line", "meta_label_0", "meta_label_1"]);
  },

  "kv.operator-nameplate-ll"(d) {
    const { W, H, p } = d;
    const mx = p.margin_x * W;
    const my = p.margin_y * H;
    d.rect(0, 0, W, H, "bg");
    if (p.watermark) {
      d.lettering("watermark_word", -0.02 * W, p.watermark_y0 * H, (p.watermark_y1 - p.watermark_y0) * H, { role: "water", width: 0.78, stroke: 0.13, chamfer: 0.1, chamfer_mode: "all", tracking: 30, trim: false });
    }
    const fx0 = (p.fig_cx - p.fig_w / 2) * W;
    d.image("figure", fx0, 0, p.fig_w * W, H, "figure + effects, overlaps watermark");
    d.image("logo", mx, my, 0.065 * W, 0.05 * H);
    d.image("faction_mark", mx + 0.085 * W, my, 0.05 * H, 0.05 * H);
    d.lettering("kicker", mx, 0.285 * H, 0.02 * H, { stroke: 0.2, tracking: 40 });
    d.lettering("kicker2", mx, 0.311 * H, 0.02 * H, { stroke: 0.2, tracking: 40 });
    d.rect(mx, 0.345 * H, 0.025 * W, 0.006 * H, "ink");
    const bx = p.block_x0 * W;
    const by = p.block_y0 * H;
    const ch = p.cjk_h * H;
    const lh = p.latin_h * H;
    d.text("name_cjk", bx + 0.2 * W, by + ch, ch, { family: "serif", weight: 900, anchor: "end", box: [bx - d.pad, by, 0.2 * W + d.pad, ch * 1.25] });
    const ny = by + ch * 1.3;
    d.lettering("name_latin", bx, ny, lh, { ...letter(p), box: [bx - d.pad, ny - 0.12 * lh, p.block_w * W + d.pad, lh * 1.24] });
    const cy = ny + lh * 1.35;
    const classBoxW = 0.09 * W;
    d.lettering("class_latin", bx + 0.06 * W, cy, 0.022 * H, { stroke: 0.2, box: [bx + 0.06 * W - d.pad, cy - 0.003 * H, classBoxW, 0.028 * H] });
    d.text("class_cjk", bx + 0.06 * W, cy + 0.045 * H, 0.016 * H, { role: "ink2", weight: 500, box: [bx + 0.06 * W - d.pad, cy + 0.045 * H - 0.016 * H, classBoxW, 0.021 * H] });
    const icon = 0.042 * H;
    for (let i = 0; i < 2; i += 1) d.rect(bx + 0.155 * W + i * icon * 1.15, cy - 0.004 * H, icon, icon, "plate", `data-slot="class_icon_${i}" data-kind="shape"`);
    const rx = W - mx;
    for (let i = 0; i < p.rarity; i += 1) {
      const x = rx - (p.rarity - i) * 0.026 * W;
      const y = 0.675 * H;
      const s = 0.012 * W;
      d.poly([[x + s, y], [x + 2 * s, y + s], [x + s, y + 2 * s], [x, y + s]], "ink", `data-slot="rarity_${i}" data-kind="shape"`);
    }
    for (let j = 0; j < 2; j += 1) {
      const x = rx - 0.135 * W + j * 0.075 * W;
      const boxW = 0.07 * W;
      d.text(`credit_label_${j}`, x, 0.745 * H, 0.016 * H, { weight: 700, box: [x, 0.745 * H - 0.016 * H, boxW, 0.021 * H] });
      d.text(`credit_value_${j}`, x, 0.77 * H, 0.016 * H, { weight: 400, box: [x, 0.77 * H - 0.016 * H, boxW, 0.021 * H] });
      d.rect(x, 0.787 * H, 0.012 * W, 0.006 * H, "ink");
    }
    d.text("disclaimer", mx + 0.01 * W, H - my, 0.012 * H, { role: "ink2", weight: 400 });
    d.text("copyright", W - mx, H - my, 0.013 * H, { role: "ink2", weight: 500, anchor: "end" });
    d.guideRect(bx, by, p.block_w * W, 0.25 * H, "name block");
    d.guideRect(0, p.watermark_y0 * H, W, (p.watermark_y1 - p.watermark_y0) * H, "watermark band", "#FF8A00");
    d.guideRect(mx, my, W - 2 * mx, H - 2 * my, "safe");
    d.zone("figure", "figure", [fx0, 0, p.fig_w * W, H], { maxOverlap: 0.3, param: "block_x0", figureParam: "fig_cx" });
    d.align("left", "left", mx, ["logo", "kicker", "kicker2", "name_latin"]);
  },

  "cover.pv-lowerthird"(d) {
    const { W, H, p } = d;
    d.image("key_art", 0, 0, W, H, "full-bleed scene; figure may sit under the title");
    if (p.scrim) d.raw(`<rect x="0" y="${(H * 0.45).toFixed(1)}" width="${W}" height="${(H * 0.55).toFixed(1)}" fill="url(#scrimB)" data-role="scrim"/>`);
    const y0 = p.band_y0 * H;
    const th = p.title_h * H;
    d.image("logo", 0.14 * W, y0, 0.22 * W, 0.12 * H, "wordmark");
    d.text("title_cjk", 0.4 * W, y0 + th, th, { role: "ink", family: "serif", weight: 900, box: [0.4 * W - d.pad, y0, 0.5 * W, th * 1.2] });
    const ly0 = y0 + th * 1.25;
    d.lettering("title_latin", 0.4 * W, ly0, 0.035 * H, { role: "ink2", stroke: 0.14, width: 0.6, tracking: 120, ...letter(p), box: [0.4 * W - d.pad, ly0 - 0.005 * H, 0.5 * W, 0.045 * H] });
    const lb = p.label_h * H;
    const ly = y0 + 0.17 * H;
    d.rect(0.3 * W, ly, 0.4 * W, lb, "plate", "data-slot=\"label_plate\" data-kind=\"shape\"");
    d.text("pv_label", 0.5 * W, ly + lb * 0.75, lb * 0.62, { role: "ink", anchor: "middle", weight: 900, box: [0.3 * W + 0.03 * W, ly, 0.34 * W, lb] });
    for (const sx of [0.305, 0.68]) for (let k = 0; k < 2; k += 1) d.rect(sx * W + k * 0.007 * W, ly + lb * 0.25, 0.004 * W, lb * 0.5, "accent");
    d.line(0.18 * W, ly + lb / 2, 0.29 * W, ly + lb / 2, "rule", 3);
    d.line(0.71 * W, ly + lb / 2, 0.82 * W, ly + lb / 2, "rule", 3);
    d.text("copyright", 0.04 * W, 0.955 * H, 0.016 * H, { role: "ink2", weight: 500 });
    d.guideRect(0.1 * W, y0 - 0.02 * H, 0.8 * W, 0.3 * H, "title band, centred, scrim under it");
    const h169 = (W * 9) / 16;
    d.zone("crop-16x9", "safe", [0, (H - h169) / 2, W, h169], { slots: ["logo", "title_cjk", "title_latin", "pv_label"], note: "the 16:9 centre crop of this 16:10 cover would cut it" });
  },

  "kv.ef-narrative-lowerleft"(d) {
    const { W, H, p, pal } = d;
    const mx = p.margin_x * W;
    const my = p.margin_y * H;
    d.rect(0, 0, W, H, "bg");
    if (p.glow) d.poly([[0, 0.25 * H], [0.42 * W, 0.4 * H], [0.42 * W, 0.62 * H], [0, 0.78 * H]], "glow", "opacity=\"0.55\"");
    d.image("figure", p.fig_x0 * W, 0, (1 - p.fig_x0) * W, H, "bust / half body, face in upper-right third");
    d.image("logo", mx, my, 0.075 * W, 0.14 * H, "square wordmark block");
    if (p.micro_markers) {
      [[0.185, 0.425], [0.89, 0.58]].forEach(([x, y], i) => {
        const s = 0.011 * W;
        d.raw(`<rect x="${(x * W).toFixed(1)}" y="${(y * H).toFixed(1)}" width="${s.toFixed(1)}" height="${s.toFixed(1)}" fill="none" stroke="${pal.ink2}" stroke-width="${(1.5 * d.k).toFixed(1)}"/>`);
        d.line(x * W + s, y * H + s / 2, Math.min(x * W + 0.13 * W, W - mx), y * H + s / 2, "rule", 1);
        d.lettering(`micro_marker_${i}`, x * W, y * H - 0.022 * H, 0.01 * H, { role: "ink2", stroke: 0.16, tracking: 60 });
      });
    }
    const ky = p.kicker_y * H;
    const kh = 0.055 * H;
    d.rect(mx, ky, kh, kh, "accent", "data-slot=\"kicker_icon\" data-kind=\"shape\"");
    d.poly([[mx + kh * 0.2, ky + kh * 0.25], [mx + kh * 0.8, ky + kh * 0.25], [mx + kh * 0.5, ky + kh * 0.8]], "accent_ink");
    const slashes = d.lettering("kicker_slashes", mx + kh * 1.3, ky + kh * 0.08, kh * 0.84, { stroke: 0.16, width: 0.5 });
    const kx = mx + kh * 1.3 + slashes.width + 0.008 * W;
    d.text("kicker_cjk", kx, ky + kh * 0.86, kh * 0.84, { weight: 900, box: [kx - d.pad, ky - 0.005 * H, 0.2 * W, kh * 1.1] });
    const ty = p.title_y0 * H;
    const th = p.title_h * H;
    const stackEnd = mx + p.stack_w * W;
    const gap = 0.012 * W;
    const open = d.lettering("bracket_open", mx, ty, th, { stroke: 0.07, width: 0.75 });
    const tx = mx + open.width + gap;
    const size = th * 0.95;
    const closeW = open.width;
    const title = d.text("title_cjk", tx, ty + th * 0.9, size, { weight: 900, box: [tx - d.pad, ty - 0.05 * th, stackEnd - closeW - gap - tx + d.pad, th * 1.12] });
    d.lettering("bracket_close", tx + title.width + gap, ty, th, { stroke: 0.07, width: 0.75 });
    const tgy = p.tag_y * H;
    const tgh = p.tag_h * H;
    d.rect(mx, tgy, p.tag_w * W, tgh, "accent", "data-slot=\"tagline_bar\" data-kind=\"shape\"");
    d.rect(mx, tgy - 0.012 * H, 0.0025 * W, tgh + 0.024 * H, "ink");
    d.lettering("tagline", mx + 0.03 * W, tgy + tgh * 0.28, tgh * 0.44, { role: "accent_ink", stroke: 0.2, tracking: p.tag_tracking, width: 0.6, box: [mx + 0.03 * W - d.pad, tgy, p.tag_w * W - 0.03 * W, tgh] });
    if (p.tick_colors) ["tick1", "tick2", "tick3"].forEach((role, i) => d.rect(mx + i * 0.05 * W, 0.968 * H, 0.047 * W, 0.005 * H, role));
    d.lettering("barcode_ticks", mx, 0.93 * H, 0.012 * H, { role: "ink2", stroke: 0.5, width: 0.3, tracking: 10 });
    d.text("copyright", W - mx, 0.945 * H, 0.016 * H, { role: "ink2", weight: 500, anchor: "end" });
    d.guideRect(mx, ky - 0.01 * H, p.stack_w * W, 0.3 * H, "text stack");
    d.guideRect(mx, my, W - 2 * mx, H - 2 * my, "safe");
    d.zone("figure", "figure", [p.fig_x0 * W, 0, (1 - p.fig_x0) * W, H], { maxOverlap: 0.3, figureParam: "fig_x0" });
    d.align("left", "left", mx, ["logo", "kicker_icon", "bracket_open", "tagline_bar"]);
  },

  "kv.ef-operator-plate"(d) {
    const { W, H, p } = d;
    d.rect(0, 0, W, H, "bg");
    if (p.shards) {
      const shards = [[[0.3, 0.02], [0.52, 0], [0.47, 0.2], [0.33, 0.24]], [[0.55, 0.1], [0.72, 0.06], [0.7, 0.3], [0.58, 0.33]],
        [[0.2, 0.3], [0.3, 0.26], [0.28, 0.44], [0.18, 0.47]], [[0.75, 0.35], [0.86, 0.3], [0.84, 0.48]]];
      const k = Math.sqrt(p.shard_scale);
      shards.forEach((shard, i) => {
        const cx = shard.reduce((s, [x]) => s + x, 0) / shard.length;
        const cy = shard.reduce((s, [, y]) => s + y, 0) / shard.length;
        d.poly(shard.map(([x, y]) => [(cx + (x - cx) * k) * W, (cy + (y - cy) * k) * H]), "accent", `data-slot="accent_shard_${i}" data-kind="shape"`);
      });
    }
    d.image("figure", 0.03 * W, 0, 0.66 * W, H, "figure + weapon, may cross under plate edge");
    d.raw(`<rect x="0" y="${(0.78 * H).toFixed(1)}" width="${W}" height="${(0.22 * H).toFixed(1)}" fill="url(#fadeW)" data-role="fade"/>`);
    d.image("logo", p.logo_x0 * W, p.logo_y0 * H, 0.06 * W, 0.115 * H, "square wordmark");
    const px = p.plate_x0 * W;
    const py = p.plate_y0 * H;
    const pw = p.plate_w * W;
    const lh = p.label_h * H;
    const inset = px + 0.015 * W;
    d.rect(px, py, 0.19 * W, lh * 1.5, "plate");
    d.lettering("plate_label", inset, py + lh * 0.25, lh, { stroke: 0.17, width: 0.62, tracking: 40, ...letter(p), box: [inset - d.pad, py, 0.19 * W - 0.015 * W + d.pad, lh * 1.5] });
    const ny = py + lh * 1.5;
    const nh = p.name_h * H * 1.45;
    d.rect(px, ny, pw, nh, "plate");
    d.rect(px, ny + nh - 3 * d.k, pw, 3 * d.k, "plate_edge");
    const isz = nh * 0.8;
    const iconX = px + pw - 2 * isz - 0.008 * W;
    d.text("name_cjk", inset, ny + nh * 0.76, p.name_h * H, { weight: 700, box: [inset - d.pad, ny, iconX - inset - 0.006 * W, nh] });
    d.rect(iconX, ny + nh * 0.1, isz, isz, "dark", "data-slot=\"class_icon\" data-kind=\"shape\"");
    d.rect(px + pw - isz, ny + nh * 0.1, isz, isz, "accent2", "data-slot=\"element_icon\" data-kind=\"shape\"");
    const ry = ny + nh + 0.03 * H;
    for (let i = 0; i < p.rarity; i += 1) {
      const x = px + 0.155 * W + i * 0.031 * W;
      const s = 0.012 * W;
      d.poly([[x, ry + s * 1.6], [x + s, ry], [x + 2 * s, ry + s * 1.6], [x + s, ry + s * 1.1]], "dark", `data-slot="rarity_${i}" data-kind="shape"`);
    }
    d.text("copyright", 0.96 * W, 0.975 * H, 0.016 * H, { role: "ink", weight: 500, anchor: "end" });
    d.guideRect(px, py, pw, 0.3 * H, "plate (opposite the figure mass)");
    d.guideRect(0.035 * W, 0.045 * H, 0.93 * W, 0.91 * H, "safe");
    // The figure slot may run under the plate edge; the keep-out zone is its mass, which ends at 0.63W.
    d.zone("figure", "figure", [0.03 * W, 0, 0.6 * W, H], { maxOverlap: 0.3, param: "plate_x0" });
    d.align("plate-left", "left", inset, ["plate_label", "name_cjk"]);
  },

  "kv.vertical-title-column"(d) {
    const { W, H, p } = d;
    d.rect(0, 0, W, H, "bg");
    d.image("figure_group", 0.02 * W, 0, (p.fig_x1 - 0.02) * W, H, "main figure front, group behind");
    d.image("logo", 0.022 * W, 0.04 * H, 0.1 * W, 0.08 * H, "wordmark + event mark");
    const ch = p.char_h * H;
    const cx = p.col_x * W;
    d.text("title_vertical", cx, p.col_y0 * H, ch, { family: "serif", weight: 900, vertical: true, box: [cx - ch * 0.6, p.col_y0 * H - 0.1 * ch, ch * 1.2, (p.col_y1 - p.col_y0) * H + 0.1 * ch] });
    const tagX = p.tag_x * W;
    const tagY = p.tag_y0 * H;
    d.rect(tagX - 0.016 * W, tagY, 0.032 * W, 0.17 * H, "accent", "data-slot=\"tag_plate\" data-kind=\"shape\"");
    d.text("tag_vertical", tagX, tagY + 0.01 * H, 0.024 * H, { role: "ink_on_accent", vertical: true, weight: 700, box: [tagX - 0.016 * W, tagY, 0.032 * W, 0.17 * H] });
    const sx = p.sub_col_x * W;
    const subSize = 0.05 * H;
    d.text("sub_vertical", sx, 0.27 * H, subSize, { role: "accent", family: "serif", weight: 900, vertical: true, box: [sx - subSize * 0.6, 0.265 * H, subSize * 1.2, 0.28 * H] });
    const lineSize = 0.028 * H;
    const lineTop = 0.57 * H;
    d.text("line_vertical", sx, lineTop, lineSize, { role: "ink", family: "serif", weight: 600, vertical: true, box: [sx - lineSize * 0.6, lineTop - 0.005 * H, lineSize * 1.2, 0.33 * H] });
    const lineLength = [...String(d.values.line_vertical ?? d.m.slots.line_vertical.default)].length * lineSize;
    d.lettering("latin_vertical", 0, 0, 0.014 * H, { role: "ink2", stroke: 0.15, tracking: 180, transform: `translate(${(0.8 * W).toFixed(1)},${(0.25 * H).toFixed(1)}) rotate(90)`, box: [0.8 * W - 0.014 * H * 1.2, 0.25 * H - d.pad, 0.014 * H * 1.4, 0.3 * H] });
    for (const y of [0.555 * H, lineTop + lineLength + 0.012 * H]) {
      const s = 6 * d.k;
      d.poly([[sx - s, y], [sx, y - s], [sx + s, y], [sx, y + s]], "accent");
    }
    for (let i = 0; i < 4; i += 1) d.rect(0.88 * W + i * 0.022 * W, 0.04 * H, 0.008 * W, 0.05 * H, "ink", `data-slot="tick_block_${i}" data-kind="shape"`);
    d.text("copyright", 0.97 * W, 0.97 * H, 0.016 * H, { role: "ink", weight: 500, anchor: "end" });
    d.guideRect(0.73 * W, 0.2 * H, 0.22 * W, 0.56 * H, "title stack, read right to left");
    d.zone("figure", "figure", [0.02 * W, 0, (p.fig_x1 - 0.02) * W, H], { maxOverlap: 0.3, figureParam: "fig_x1" });
  },

  "card.dossier-portrait"(d) {
    const { W, H, p } = d;
    const f = p.frame * W;
    const inner = W - f;
    const left = 0.052 * W;
    d.rect(0, 0, W, H, "frame");
    d.rect(f, f, W - 2 * f, H - 2 * f, "bg");
    d.image("figure", 0.25 * W, p.fig_y0 * H, 0.6 * W, (p.fig_y1 - p.fig_y0) * H, "full body, feet near divider");
    d.image("logo", 0.23 * W, 0.035 * H, 0.17 * W, 0.045 * H);
    d.lettering("series_latin", 0.47 * W, 0.045 * H, 0.018 * H, { role: "ink2", stroke: 0.12, tracking: 420, width: 0.62, box: [0.47 * W - d.pad, 0.043 * H, inner - 0.47 * W, 0.022 * H] });
    d.text("series_cjk", 0.57 * W, 0.085 * H, 0.022 * H, { role: "ink2", weight: 500 });
    const nameBase = (p.name_y + p.name_h) * H;
    d.text("name_cjk", left, nameBase, p.name_h * H, { weight: 900, box: [left - d.pad, nameBase - p.name_h * H, 0.27 * W, p.name_h * H * 1.25] });
    d.rect(left, nameBase + 0.008 * H, 0.19 * W, 0.013 * H, "chip", "data-slot=\"name_chip\" data-kind=\"shape\"");
    d.lettering("name_latin", left + 0.01 * W, nameBase + 0.0105 * H, 0.008 * H, { role: "chip_ink", stroke: 0.15, tracking: 300, box: [left, nameBase + 0.008 * H, 0.19 * W, 0.013 * H] });
    d.lettering("tag_new", 0.8 * W, 0.153 * H, 0.01 * H, { role: "ink2", stroke: 0.15, tracking: 200 });
    for (let i = 0; i < 6; i += 1) {
      const x = 0.73 * W + i * 0.037 * W;
      const y = 0.17 * H;
      const s = 0.016 * W;
      d.poly([[x, y + s * 2], [x + s, y], [x + 2 * s, y + s * 2]], "ink", `data-slot="rarity_${i}" data-kind="shape"`);
    }
    d.text("class_line", 0.945 * W, 0.248 * H, 0.012 * H, { role: "ink2", anchor: "end", weight: 500 });
    const ah = p.attr_h * H;
    for (let i = 0; i < p.attr_rows; i += 1) {
      const y = (p.attr_y0 + i * 0.0165) * H;
      d.rect(left, y, 0.055 * W, ah * 0.95, "chip", `data-slot="attr_chip_${i}" data-kind="shape"`);
      d.text(`attr_label_${i}`, left + 0.0275 * W, y + ah * 0.75, ah * 0.62, { role: "chip_ink", anchor: "middle", weight: 700, box: [left, y, 0.055 * W, ah * 0.95] });
      d.rect(left + 0.055 * W, y, 0.2 * W, ah * 0.95, "frame", "opacity=\"0.55\"");
      d.text(`attr_value_${i}`, left + 0.063 * W, y + ah * 0.75, ah * 0.6, { role: "ink", weight: 400, box: [left + 0.06 * W, y, 0.195 * W, ah * 0.95] });
    }
    const quoteSize = 0.0115 * H;
    d.text("quote", left, 0.655 * H, quoteSize, { role: "ink", weight: 400, lineHeight: 1.3, box: [left - d.pad, 0.655 * H - quoteSize, 16 * quoteSize + d.pad, quoteSize * 2.6] });
    const creditX = 0.76 * W;
    for (let j = 0; j < 3; j += 1) {
      const y = (0.648 + j * 0.0145) * H;
      d.text(`credit_${j}`, creditX, y, 0.0105 * H, { role: "ink", weight: 400, box: [creditX - d.pad, y - 0.0105 * H, inner - creditX + d.pad, 0.0135 * H] });
    }
    d.rect(0.042 * W, p.divider_y * H, 0.916 * W, 0.003 * H, "ink2");
    d.rect(f, p.divider_y * H + 0.004 * H, W - 2 * f, (p.panel_y1 - p.divider_y) * H, "panel", "opacity=\"0.18\"");
    d.text("range_label", left, 0.748 * H, 0.0095 * H, { role: "ink", weight: 500 });
    for (let r = 0; r < 3; r += 1) {
      for (let c = 0; c < 3 + (r === 1 ? 2 : 0); c += 1) {
        d.raw(`<rect x="${(left + c * 0.02 * W).toFixed(1)}" y="${((0.758 + r * 0.008) * H).toFixed(1)}" width="${(0.014 * W).toFixed(1)}" height="${(0.0055 * H).toFixed(1)}" fill="none" stroke="${d.pal.icon}" stroke-width="${(2 * d.k).toFixed(1)}"/>`);
      }
    }
    const bodySize = 0.0105 * H;
    d.text("talent_title", 0.18 * W, 0.748 * H, bodySize, { role: "ink", weight: 700 });
    d.text("talent_body", 0.18 * W, 0.765 * H, bodySize, { role: "ink", weight: 400, box: [0.18 * W - d.pad, 0.765 * H - bodySize, 0.37 * W, bodySize * (1 + 3 * 1.3) + 4] });
    const skillSize = 0.0098 * H;
    for (let k = 0; k < p.skill_rows; k += 1) {
      const y = (0.732 + k * 0.078) * H;
      d.image(`skill_icon_${k}`, 0.57 * W, y, 0.063 * W, 0.063 * W);
      const base = y + 0.012 * H;
      d.text(`skill_text_${k}`, 0.655 * W, base, skillSize, { role: "ink", weight: 400, box: [0.655 * W - d.pad, base - skillSize, inner - 0.655 * W, skillSize * (1 + 2 * 1.3) + 4] });
      const noteBase = base + skillSize * 1.3 * 3 + 0.003 * H;
      d.text(`skill_note_${k}`, 0.655 * W, noteBase, skillSize, { role: "accent_text", weight: 500, box: [0.655 * W - d.pad, noteBase - skillSize, inner - 0.655 * W, skillSize * 1.3] });
    }
    d.image("maker_mark", left, 0.945 * H, 0.18 * W, 0.03 * H, "publisher mark slot");
    d.text("disclaimer", 0.945 * W, 0.976 * H, 0.0105 * H, { role: "ink", weight: 400, anchor: "end" });
    d.guideRect(f, f, W - 2 * f, H - 2 * f, "frame inset");
    d.guideLine(0, p.divider_y * H, W, p.divider_y * H, "divider");
    d.guideRect(0.042 * W, 0.14 * H, 0.27 * W, 0.17 * H, "identity block (name + attrs)");
    d.zone("figure", "figure", [0.25 * W, p.fig_y0 * H, 0.6 * W, (p.fig_y1 - p.fig_y0) * H], { maxOverlap: 0.3 });
    d.align("left", "left", left, ["name_cjk", "name_chip", "attr_chip_0", "quote", "range_label", "maker_mark"]);
  },

  "banner.event-strip"(d) {
    const { W, H, p } = d;
    d.rect(0, 0, W, H, "bg");
    d.image("figure", 0, 0, p.fig_w * W, H, "figure + props; small caption slot bottom-left");
    d.text("caption", 0.03 * W, 0.9 * H, 0.06 * H, { role: "ink", weight: 700 });
    const x0 = p.title_x0 * W;
    const rh = p.row_h * H;
    const r1 = 0.12 * H;
    const r2 = r1 + rh * 1.12;
    d.rect(x0, r1, 0.27 * W, rh, "plate", "data-slot=\"title_plate_1\" data-kind=\"shape\"");
    d.text("title_row_1", x0 + 0.01 * W, r1 + rh * 0.8, rh * 0.82, { role: "ink", weight: 900, box: [x0, r1, 0.27 * W, rh] });
    d.rect(x0, r2, 0.4 * W, rh, "plate2", "data-slot=\"title_plate_2\" data-kind=\"shape\"");
    d.text("title_row_2", x0 + 0.01 * W, r2 + rh * 0.8, rh * 0.82, { role: "plate2_ink", weight: 900, box: [x0, r2, 0.4 * W, rh] });
    const dy = p.date_y * H;
    const dh = p.date_h * H;
    const dateStyle = { ...letter(p), chamfer: p.letter_chamfer };
    const end = W - 0.03 * W;
    const w1 = d.lettering("date_start", x0, dy, dh, { role: "ink", ...dateStyle, box: [x0 - d.pad, dy - 0.12 * dh, 0.2 * W, dh * 1.24] }).width;
    const t1 = d.lettering("date_start_time", x0 + w1 + 0.006 * W, dy, dh * 0.22, { role: "ink2", stroke: 0.18 }).width;
    const ax = x0 + w1 + Math.max(t1, 0.035 * W) + 0.012 * W;
    d.poly([[ax, dy + dh * 0.35], [ax + 0.016 * W, dy + dh * 0.5], [ax, dy + dh * 0.65]], "edge");
    const ex = ax + 0.025 * W;
    const w2 = d.lettering("date_end", ex, dy, dh, { role: "ink", ...dateStyle, box: [ex - d.pad, dy - 0.12 * dh, Math.max(0, end - ex - 0.04 * W), dh * 1.24] }).width;
    d.lettering("date_end_time", ex + w2 + 0.006 * W, dy, dh * 0.22, { role: "ink2", stroke: 0.18, box: [ex + w2, dy - 0.03 * dh, Math.max(0, end - ex - w2), dh * 0.3] });
    d.rect(W - 0.012 * W, 0, 0.012 * W, H, "edge");
    d.guideRect(x0, 0.08 * H, 0.45 * W, 0.86 * H, "text half: rows + dates");
    d.zone("figure", "figure", [0, 0, p.fig_w * W, H], { maxOverlap: 0.3, param: "title_x0", figureParam: "fig_w" });
    d.align("left", "left", x0, ["title_plate_1", "title_plate_2", "date_start"]);
  },

  "ui.ef-activity-panel"(d) {
    const { W, H, p, pal } = d;
    d.image("scene", 0, 0, W, H, "full-bleed environment / key art");
    d.rect(0, 0, 0.26 * W, H, "scrim", "opacity=\"0.55\"");
    const slashes = d.lettering("header_slashes", 0.062 * W, 0.04 * H, 0.022 * H, { role: "ink", stroke: 0.14, width: 0.5 });
    d.text("header_cjk", 0.062 * W + slashes.width + 0.006 * W, 0.06 * H, 0.022 * H, { role: "ink", weight: 700 });
    d.line(0.066 * W, 0.08 * H, 0.066 * W, 0.97 * H, "ink2", 1.5);
    const labelX = (p.nav_x0 + 0.012) * W;
    const thumbX = (p.nav_x1 - 0.055) * W;
    const labelSize = 0.019 * H;
    for (let i = 0; i < p.nav_items; i += 1) {
      const y = (p.nav_y0 + i * (p.nav_item_h + p.nav_gap)) * H;
      const ih = p.nav_item_h * H;
      const active = i === p.active;
      if (active) d.rect(0, y - 0.004 * H, p.nav_x0 * W, ih + 0.008 * H, "strip");
      d.rect(p.nav_x0 * W, y - (active ? 0.004 * H : 0), (p.nav_x1 - p.nav_x0 + (active ? 0.015 : 0)) * W, ih + (active ? 0.008 * H : 0), active ? "nav_active" : "nav");
      d.image(`nav_thumb_${i}`, thumbX, y + 0.006 * H, 0.05 * W, ih - 0.012 * H);
      d.text(`nav_label_${i}`, labelX, y + ih * 0.62, labelSize, { role: active ? "nav_active_ink" : "ink", weight: 700, box: [labelX - d.pad, y, thumbX - labelX - 0.004 * W, ih] });
      if ([0, 3, 5].includes(i)) {
        d.poly([[(p.nav_x1 + 0.003) * W, y - 0.006 * H], [(p.nav_x1 + 0.011) * W, y + 0.002 * H], [(p.nav_x1 + 0.003) * W, y + 0.01 * H], [(p.nav_x1 - 0.005) * W, y + 0.002 * H]], "badge", `data-slot="new_badge_${i}" data-kind="shape"`);
      }
    }
    const cx = 0.935 * W;
    const cy = 0.05 * H;
    const r = 0.022 * H;
    d.raw(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="none" stroke="${pal.ink}" stroke-width="${(3 * d.k).toFixed(1)}" data-slot="close" data-kind="shape"/>`);
    d.line(cx - r * 0.45, cy - r * 0.45, cx + r * 0.45, cy + r * 0.45, "ink", 3);
    d.line(cx - r * 0.45, cy + r * 0.45, cx + r * 0.45, cy - r * 0.45, "ink", 3);
    const tr = p.title_right * W;
    const textRight = tr - 0.008 * W;
    const titleW = 0.36 * W;
    d.text("help_label", textRight, 0.155 * H, 0.018 * H, { role: "ink", anchor: "end", weight: 500, box: [textRight - titleW, 0.155 * H - 0.02 * H, titleW + d.pad, 0.025 * H] });
    d.text("title_cjk", textRight, 0.215 * H, 0.045 * H, { role: "ink", anchor: "end", weight: 700, box: [textRight - titleW, 0.215 * H - 0.045 * H, titleW + d.pad, 0.056 * H] });
    d.rect(tr - 0.003 * W, 0.17 * H, 0.002 * W, 0.055 * H, "ink");
    d.text("timer", textRight, 0.25 * H, 0.018 * H, { role: "ink", anchor: "end", weight: 500, box: [textRight - titleW, 0.25 * H - 0.02 * H, titleW + d.pad, 0.025 * H] });
    d.rect(tr - 0.07 * W, 0.265 * H, 0.062 * W, 0.024 * H, "accent", `rx="${(12 * d.k).toFixed(1)}" data-slot="tag_pill_plate" data-kind="shape"`);
    d.text("tag_pill", tr - 0.039 * W, 0.282 * H, 0.014 * H, { role: "accent_ink", anchor: "middle", weight: 700, box: [tr - 0.07 * W, 0.265 * H, 0.062 * W, 0.024 * H] });
    const px0 = p.panel_x0 * W;
    const pw = (p.panel_x1 - p.panel_x0) * W;
    d.rect(px0, 0.475 * H, pw, 0.04 * H, "strip", "opacity=\"0.55\"");
    d.text("panel_intro", px0 + 0.01 * W, 0.502 * H, 0.017 * H, { role: "ink", weight: 500, box: [px0 + 0.01 * W - d.pad, 0.475 * H, pw - 0.02 * W, 0.04 * H] });
    const taskSize = 0.018 * H;
    for (let k = 0; k < p.rows; k += 1) {
      const y = (p.rows_y0 + k * (p.row_h + 0.012)) * H;
      d.rect(px0, y, pw, p.row_h * H, "row", "opacity=\"0.92\"");
      d.text(`task_${k}`, px0 + 0.015 * W, y + 0.045 * H, taskSize, { role: "row_ink", weight: 500, box: [px0 + 0.015 * W - d.pad, y + 0.045 * H - taskSize, 0.185 * W, taskSize * 2.35] });
      d.rect(px0 + 0.015 * W, y + 0.095 * H, 0.1 * W, 0.004 * H, "strip");
      d.lettering(`progress_${k}`, px0 + 0.125 * W, y + 0.085 * H, 0.018 * H, { role: "strip", stroke: 0.16, box: [px0 + 0.125 * W - d.pad, y + 0.08 * H, 0.07 * W, 0.03 * H] });
      for (let j = 0; j < 2; j += 1) d.image(`reward_${k}_${j}`, (p.panel_x0 + 0.21 + j * 0.037) * W, y + 0.025 * H, 0.033 * W, 0.033 * W);
      d.text(`claim_${k}`, (p.panel_x1 - 0.02) * W, y + 0.07 * H, 0.02 * H, { role: "row_ink", anchor: "end", weight: 700, box: [(p.panel_x1 - 0.085) * W, y + 0.045 * H, 0.065 * W, 0.032 * H] });
      d.rect((p.panel_x1 - 0.004) * W, y, 0.004 * W, 0.016 * H, "badge");
    }
    d.rect(0.8 * W, 0.935 * H, 0.14 * W, 0.04 * H, "accent", `rx="${(20 * d.k).toFixed(1)}" data-slot="cta" data-kind="shape"`);
    d.text("cta_label", 0.87 * W, 0.962 * H, 0.018 * H, { role: "accent_ink", anchor: "middle", weight: 700, box: [0.8 * W, 0.935 * H, 0.14 * W, 0.04 * H] });
    d.text("status_line", 0.05 * W, 0.975 * H, 0.012 * H, { role: "ink2", weight: 400 });
    d.guideRect(0, 0.15 * H, 0.215 * W, 0.8 * H, "nav column (active item bleeds to x=0)");
    d.guideRect(px0, 0.47 * H, pw, 0.5 * H, "content panel");
    d.align("nav-left", "left", labelX, Array.from({ length: p.nav_items }, (_, i) => `nav_label_${i}`));
    d.align("title-right", "right", textRight, ["help_label", "title_cjk", "timer", "tag_pill_plate"]);
  },
};

module.exports = { LAYOUTS };
