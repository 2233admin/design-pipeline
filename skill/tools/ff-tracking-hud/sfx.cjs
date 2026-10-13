/* Tracking HUD sound: the whole track synthesized with ffmpeg filters from the tracks events.
 *
 * Port of tools/sfx.py of mrsarac/ff-tracking at cc7f4e1 (MIT, Copyright (c) 2026 Mustafa Saraç).
 * Same layers, timings, gains, pans and filters, rebuilt as one ffmpeg filtergraph: Gaussian noise
 * (Box-Muller over seeded uniform sources) as numpy's standard_normal, and sfx.py's Butterworth
 * band-passes as the biquad sections scipy designs. It is not sample parity: numpy's random
 * stream, its pans, holds and jitters are not reproduced, and loudness is set by `audio master`.
 *
 *   const { synthesize } = require("./sfx.cjs");
 *   synthesize(T, "assets/sfx.wav", { ffmpeg: "ffmpeg" });  // T: lib/tracks.js create(config)
 *   node sfx.cjs                                              // writes assets/sfx.wav here
 *
 * The output is raw (peak -12 dBFS, like sfx.py before its loudness step); loudness is done by
 * `designer-pipeline audio master --target web`. Equal-power pan: a = (pan + 1) pi / 4, L = cos a,
 * R = sin a. Pans, jitters and hold sizes come from T.rnd and the noise sources use fixed seeds
 * derived from config.sound.seed, so two runs write byte-identical files.
 */
"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const SR = 48000;
const TARGET_PEAK_DB = -12;
const FADE_SECONDS = 0.25;
const GAUSS_SEED_OFFSET = 50000; // seed of the second uniform source of a Gaussian noise

// T.rnd seed bases (added to seed * 1000) and noise seed layers (seed * 1e6 + layer * 1e5 + k).
const RND = { cutPan: 1, cutHold: 2, keyJitter: 3, keyPan: 4 };
const NOISE = { airL: 1, airR: 2, cut: 3, key: 4, riser: 5 };

/** Plain decimal for filter arguments (no exponent notation). */
function num(x) {
  const s = x.toFixed(10).replace(/\.?0+$/, "");
  return s === "-0" ? "0" : s;
}

/** clip(t / attack, 0, 1) * exp(-t / release), sfx.py's env() as an ffmpeg expression of t. */
function envExpr(attack, release) {
  return `min(t/${num(attack)},1)*exp(-t/${num(release)})`;
}

/** Mono -> stereo with gain (dB) and equal-power pan, delayed to start at `sample`. */
function place(sample, gainDb, pan) {
  const g = 10 ** (gainDb / 20);
  const a = ((pan + 1) * Math.PI) / 4;
  return `pan=stereo|c0=${num(g * Math.cos(a))}*c0|c1=${num(g * Math.sin(a))}*c0,adelay=delays=${sample}S:all=1`;
}

/** Unit-variance Gaussian noise like numpy's standard_normal: Box-Muller over two seeded uniform
 * sources (anoisesrc white is uniform in -1..1). One sample of slack, then cut exactly: anoisesrc
 * durations are whole microseconds. */
function noise(seed, samples) {
  const d = num((samples + 1) / SR);
  const uniform = (s, label) => `anoisesrc=a=1:c=white:seed=${s}:r=${SR}:d=${d},atrim=end_sample=${samples},aformat=channel_layouts=mono[${label}]`;
  return `${uniform(seed, `u${seed}`)};${uniform(seed + GAUSS_SEED_OFFSET, `v${seed}`)};[u${seed}][v${seed}]join=inputs=2:channel_layout=stereo,aeval=exprs='sqrt(-2*log((val(0)+1.0000000001)/2.0000000001))*cos(PI*(val(1)+1))':c=mono,aformat=channel_layouts=mono`;
}

const cadd = (a, b) => [a[0] + b[0], a[1] + b[1]];
const csub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const cmul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const cdiv = (a, b) => {
  const d = b[0] * b[0] + b[1] * b[1];
  return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d];
};
const csqrt = ([re, im]) => {
  const r = Math.hypot(re, im);
  return [Math.sqrt((r + re) / 2), (im < 0 ? -1 : 1) * Math.sqrt((r - re) / 2)];
};

/** sfx.py's band(x, lo, hi): scipy.signal.butter(2, [lo, hi], "bandpass", fs=48000, output="sos"),
 * the fourth-order Butterworth band-pass, designed as scipy does (prewarped edges, lp2bp, bilinear)
 * and returned as two sections [b0, b1, b2, a1, a2] with a0 = 1 and the gain on the first. */
function bandpassSos(lo, hi) {
  const warp = (f) => 4 * Math.tan((Math.PI * f) / SR); // scipy normalises fs to 2
  const [wl, wh] = [warp(lo), warp(hi)];
  const bw = wh - wl;
  const wo2 = wl * wh;
  const poles = [];
  for (const p of [[-Math.SQRT1_2, Math.SQRT1_2], [-Math.SQRT1_2, -Math.SQRT1_2]]) {
    const a = [(p[0] * bw) / 2, (p[1] * bw) / 2];
    const r = csqrt(csub(cmul(a, a), [wo2, 0]));
    poles.push(cadd(a, r), csub(a, r));
  }
  let den = [1, 0];
  for (const p of poles) den = cmul(den, csub([4, 0], p));
  const k = bw * bw * cdiv([16, 0], den)[0];
  return poles
    .map((p) => cdiv(cadd([4, 0], p), csub([4, 0], p)))
    .filter((z) => z[1] > 0)
    .map((z, i) => [i ? 1 : k, 0, i ? -1 : -k, -2 * z[0], z[0] * z[0] + z[1] * z[1]]);
}

/** bandpassSos as ffmpeg biquad filters. */
function bandpass(lo, hi) {
  return bandpassSos(lo, hi).map(([b0, b1, b2, a1, a2]) => `biquad=b0=${num(b0)}:b1=${num(b1)}:b2=${num(b2)}:a0=1:a1=${num(a1)}:a2=${num(a2)}`).join(",");
}

function tone(expr, seconds) {
  return `aevalsrc=exprs='${expr}':s=${SR}:d=${num(seconds)}`;
}

/** The filtergraph (one chain per sound, all summed by amix) and what it places. */
function graph(T) {
  const data = T.tracksJson();
  const sound = T.config.sound;
  const seed = sound.seed >>> 0;
  const rnd = (layer, k) => T.rnd(seed * 1000 + layer, k);
  const noiseSeed = (layer, k = 0) => seed * 1e6 + layer * 1e5 + k;
  const N = Math.trunc(SR * data.seconds);
  const at = (seconds) => Math.max(0, Math.trunc(seconds * SR));
  const chains = [];
  const inputs = [];
  const add = (label, chain) => {
    chains.push(`${chain}[${label}]`);
    inputs.push(`[${label}]`);
  };

  // Screen hum: 50 Hz mains with 6 harmonics (/k^1.4), a faint 7812 Hz whine and 400-3000 Hz
  // air noise, all x0.7. The right channel is detuned (+0.35 Hz, whine +1.05 Hz) for width.
  const hum = (detune) => {
    const partials = [1, 2, 3, 4, 5, 6].map((k) => `${num(1 / k ** 1.4)}*sin(2*PI*${num((50 + detune) * k)}*t)`);
    return `0.7*(0.05*(${partials.join("+")})+0.012*sin(2*PI*${num(7812 + detune * 3)}*t))`;
  };
  add("hum", tone(`${hum(0)}|${hum(0.35)}`, data.seconds));
  const air = (ch) => `${noise(noiseSeed(ch === 0 ? NOISE.airL : NOISE.airR), N)},${bandpass(400, 3000)}[air${ch}]`;
  chains.push(air(0), air(1));
  add("air", `[air0][air1]amerge=inputs=2,volume=${num(0.7 * 0.05)}`);

  // Glitch on every cut: 50 ms of noise crushed to thirds and sample-held for 6-21 samples,
  // high-passed at 900 Hz under a 0.5 ms / 12 ms envelope, x0.5 over a 24-sample half-Hann click.
  let cuts = 0;
  data.cuts.forEach((t, k) => {
    if (at(t) >= N) return;
    const hold = 6 + Math.floor(rnd(RND.cutHold, k) * 16);
    const pan = -0.6 + 1.2 * rnd(RND.cutPan, k);
    const crush = `aeval='if(not(mod(n,${hold})),st(0,round(val(0)*3)/3),0);ld(0)':c=same`;
    const click = "if(lt(n,24),0.5-0.5*cos(2*PI*(n+24)/47),0)";
    const shape = `aeval='0.5*val(0)*${envExpr(0.0005, 0.012)}+${click}':c=same`;
    add(`cut${k}`, `${noise(noiseSeed(NOISE.cut, k), Math.trunc(SR * 0.05))},${crush},highpass=f=900:width_type=q:width=${num(Math.SQRT1_2)},${shape},${place(at(t), k ? -4 : -1, pan)}`);
    cuts += 1;
  });

  // A tiny click per keystroke: 12 ms of 2.5-9 kHz noise, 0.2 ms / 2.5 ms, jittered +-4 ms.
  let keys = 0;
  data.keys.forEach((t, k) => {
    const start = at(t + (rnd(RND.keyJitter, k) - 0.5) * 0.008);
    if (start >= N) return;
    const pan = -0.3 + 0.6 * rnd(RND.keyPan, k);
    const shape = `aeval='val(0)*${envExpr(0.0002, 0.0025)}':c=same`;
    add(`key${k}`, `${noise(noiseSeed(NOISE.key, k), Math.trunc(SR * 0.012))},${bandpass(2500, 9000)},${shape},${place(start, -10, pan)}`);
    keys += 1;
  });

  // Lock ping: f0 + 0.35 x 2.01 f0 (1 ms / 45 ms) and a chirp falling from 2.5 f0 as exp(-40 t)
  // (phase in closed form, 0.5 ms / 18 ms, x0.4); f0 walks config.sound.lockNotes. Panned to
  // where the tracked target is on screen at that frame.
  let locks = 0;
  data.locks.forEach((t, k) => {
    if (at(t) >= N) return;
    const f0 = sound.lockNotes[k % sound.lockNotes.length];
    const frame = Math.min(Math.round(t * data.fps), data.focus.length - 1);
    const pan = Math.min(0.8, Math.max(-0.8, (data.focus[frame][0] / T.W - 0.5) * 1.4));
    const beep = `(sin(2*PI*${num(f0)}*t)+0.35*sin(2*PI*${num(f0 * 2.01)}*t))*${envExpr(0.001, 0.045)}`;
    const chirp = `0.4*sin(2*PI*${num((f0 * 2.5) / 40)}*(1-exp(-40*t)))*${envExpr(0.0005, 0.018)}`;
    add(`lock${k}`, `${tone(`${beep}+${chirp}`, 0.16)},${place(at(t), -7, pan)}`);
    locks += 1;
  });

  // Riser from collapse to Done: noise band-passed 0.7c..min(1.4c, 20 kHz) with the centre
  // c = 500 + 6000 p^2 stepping up every 1200 samples (each 25 ms segment cut from the whole
  // noise filtered at that segment's band, as sfx.py does), x0.6, plus a sine gliding
  // 180 + 900 p^2 Hz (x0.25), all shaped by p^1.5.
  const riser = data.collapse !== null && data.done !== null && data.done > data.collapse && at(data.collapse) < N;
  if (riser) {
    const len = data.done - data.collapse;
    const n = Math.trunc(SR * len);
    const segments = [];
    for (let i0 = 0; i0 < n; i0 += 1200) segments.push([i0, Math.min(n, i0 + 1200)]);
    chains.push(`${noise(noiseSeed(NOISE.riser), n)},asplit=${segments.length}${segments.map((_, i) => `[rn${i}]`).join("")}`);
    segments.forEach(([i0, i1], i) => {
      const c = 500 + 6000 * (i0 / SR / len) ** 2;
      chains.push(`[rn${i}]${bandpass(c * 0.7, Math.min(c * 1.4, 20000))},atrim=start_sample=${i0}:end_sample=${i1},asetpts=PTS-STARTPTS[rs${i}]`);
    });
    const glide = `0.25*sin(2*PI*(180*t+${num(300 / len ** 2)}*t*t*t))`;
    const shape = `aeval='(0.6*val(0)+${glide})*pow(t/${num(len)},1.5)':c=same`;
    add("riser", `${segments.map((_, i) => `[rs${i}]`).join("")}concat=n=${segments.length}:v=0:a=1,${shape},${place(at(data.collapse), -6, 0)}`);
  }

  // Done: a 1.4 s chime (880 + 0.6 x 1318.5 + 0.2 x 2637 Hz, 4 ms / 350 ms, x0.55) twice, slightly
  // apart and spread, over a sub thump gliding 128 -> 38 Hz (2 ms / 160 ms).
  const chime = data.done !== null && at(data.done) < N;
  if (chime) {
    const ring = `0.55*(sin(2*PI*880*t)+0.6*sin(2*PI*1318.5*t)+0.2*sin(2*PI*2637*t))*${envExpr(0.004, 0.35)}`;
    chains.push(`${tone(ring, 1.4)},asplit=2[ring0][ring1]`);
    add("chime0", `[ring0]${place(at(data.done + 0.06), -5, -0.15)}`);
    add("chime1", `[ring1]${place(at(data.done + 0.075), -7, 0.2)}`);
    add("thump", `${tone(`sin(2*PI*(38*t+10*(1-exp(-9*t))))*${envExpr(0.002, 0.16)}`, 1.4)},${place(at(data.done), -2, 0)}`);
  }

  // Sum (hum first: it is full length and sets the duration), exact length, fade the last 0.25 s.
  const fade = Math.trunc(SR * FADE_SECONDS);
  chains.push(
    `${inputs.join("")}amix=inputs=${inputs.length}:duration=first:normalize=0,` +
      `atrim=end_sample=${N},apad=whole_len=${N},afade=t=out:ss=${N - fade}:ns=${fade}:curve=tri,` +
      "astats=measure_perchannel=none:measure_overall=Peak_level[mix]",
  );
  return { text: `${chains.join(";\n")}\n`, seconds: data.seconds, events: { cuts, keys, locks, riser, chime } };
}

function run(ffmpeg, args) {
  const r = spawnSync(ffmpeg, ["-hide_banner", "-nostats", "-nostdin", ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, windowsHide: true });
  if (r.error && r.error.code === "ENOENT") {
    throw new Error(`ffmpeg not found ("${ffmpeg}"): install ffmpeg and put it on PATH, pass { ffmpeg: "<path to ffmpeg>" }, or build with --no-sound`);
  }
  if (r.error) throw new Error(`ffmpeg ("${ffmpeg}") could not run: ${r.error.message}`);
  const lines = (r.stderr || "").split(/\r?\n/).filter((l) => l.trim());
  if (r.status !== 0) throw new Error(`ffmpeg failed (exit ${r.status}): ${lines[lines.length - 1] || "no output"}`);
  return lines;
}

function peakDb(lines) {
  const hits = lines.map((l) => /Peak level dB:\s*(-?[\d.]+|-inf)/.exec(l)).filter(Boolean);
  if (!hits.length) throw new Error("ffmpeg astats reported no peak level");
  const v = hits[hits.length - 1][1];
  return v === "-inf" ? -Infinity : Number(v);
}

/** Synthesize the raw sound track of T into outFile (stereo 48 kHz 16-bit WAV, peak -12 dBFS). */
function synthesize(T, outFile, options = {}) {
  const ffmpeg = options.ffmpeg || "ffmpeg";
  const g = graph(T);
  fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ff-tracking-sfx-"));
  try {
    const script = path.join(tmp, "sfx.filtergraph");
    const raw = path.join(tmp, "mix.wav");
    fs.writeFileSync(script, g.text);
    // Pass 1: the mix in float, with its peak. Pass 2: peak-normalise to -12 dBFS, 16-bit.
    const before = peakDb(run(ffmpeg, ["-/filter_complex", script, "-map", "[mix]", "-c:a", "pcm_f32le", "-y", raw]));
    if (!Number.isFinite(before)) throw new Error("the synthesized mix is silent");
    const gain = num(TARGET_PEAK_DB - before);
    const after = peakDb(
      run(ffmpeg, [
        "-i", raw,
        "-af", `volume=${gain}dB:precision=double,aformat=sample_fmts=s16:sample_rates=${SR}:channel_layouts=stereo,astats=measure_perchannel=none:measure_overall=Peak_level`,
        "-map_metadata", "-1", "-fflags", "+bitexact", "-flags:a", "+bitexact",
        "-c:a", "pcm_s16le", "-y", outFile,
      ]),
    );
    return { output: outFile, seconds: g.seconds, sampleRate: SR, channels: 2, events: g.events, peakDbfs: after };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

module.exports = { bandpassSos, synthesize };

if (require.main === module) {
  const T = require(path.join(__dirname, "lib", "tracks.js")).create(require(path.join(__dirname, "film.config.js")));
  try {
    console.log(JSON.stringify(synthesize(T, path.join(__dirname, "assets", "sfx.wav")), null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
