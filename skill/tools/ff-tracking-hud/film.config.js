/* Tracking HUD film: the one file to edit for a new film. After editing, run `node build.cjs`.
 *
 * Every position is in the filmed screen's logical space, 1920 x 1080 px; angles are radians.
 * The defaults reproduce mrsarac/ff-tracking at cc7f4e1 (MIT, Copyright (c) 2026 Mustafa Saraç;
 * see LICENSE.ff-tracking). Visual style credit: Michael Nowak (@mnowakdesign); none of his
 * footage or material is used, and none may be added.
 */
((root, factory) => {
  const config = factory();
  if (typeof module === "object" && module.exports) module.exports = config;
  else root.FF_TRACKING_CONFIG = config;
})(typeof self === "undefined" ? this : self, () => ({
    id: "tracking-hud",
    fps: 30,
    // Frames per shot; every shot is one hard cut. 15 frames = 0.5 s.
    shotFrames: 15,
    timing: {
      typeEnd: 8, // typing runs until this shot frame
      lockAt: 9, // the newest box locks on this shot frame...
      lockFrames: 2, // ...for this many frames (red box, tear, ping)
      typedAtCut: 0.35, // share of the line already typed when a shot opens
      chain: 5, // boxes on the newest characters
    },
    screen: {
      title: "agent — session 0x4f2a  ·  ~/ff-tracking",
      // Status bar token counter start (upstream's invented figure, with an invented ms/frame).
      // Leave tokens out to show only the frame and scene counters.
      tokens: 3120,
      // Dim agent log behind the hero line; each shot scrolls it by two rows.
      log: [
        "› plan  1/4  map the request to scenes",
        "  read  src/lib.rs              412 lines",
        "  read  src/render.rs           188 lines",
        "  grep  \"render_frame\"         9 matches",
        "› think  boxes must follow real glyphs",
        "  tool  measure_text(\"JetBrains Mono\")",
        "  ok    advance 0.6 em",
        "  read  shaders/lens.sksl        96 lines",
        "› plan  2/4  camera, focus, palette",
        "  tool  render_frame(42)        12 ms",
        "  tool  render_frame(43)        11 ms",
        "  warn  focus drifted 3 px, correcting",
        "  ok    lock  x: 1180 y: 512",
        "› think  not just completing — composing",
        "  read  scenes.rs               210 lines",
        "  tool  inspect --all-frames",
        "  ok    0 problems",
        "› plan  3/4  sound on every lock",
        "  tool  sfx.synth(beep, 1760 Hz)",
        "  ok    -14.0 LUFS",
        "› plan  4/4  verify, deliver",
        "  tool  ffprobe out/tracking.mp4",
        "  ok    180 frames  6.0 s",
        "› done",
      ],
    },
    // Five stops from black (0) to white (1) of the flat screen. The lens maps brightness to the
    // shot's palette; pure red marks a locked box in every palette.
    palettes: {
      paper: ["#ecebe6", "#c9c8c2", "#77766f", "#2a2a28", "#0c0c0c"],
      thermal: ["#050310", "#3a0b6b", "#b3306a", "#f6862a", "#fcf6b4"],
      mono: ["#050506", "#2b2c2e", "#8a8c90", "#d9dadc", "#ffffff"],
      phosphor: ["#010604", "#05361b", "#13a85a", "#7dffb4", "#eafff3"],
      amber: ["#070300", "#3d1a02", "#b35a09", "#ffae3d", "#fff3d6"],
      navy: ["#071451", "#0d2a8c", "#4a63d6", "#b8c4ff", "#f4f6ff"],
      neon: ["#000502", "#003d1e", "#00c46a", "#5dffae", "#f0fff6"],
    },
    // kind: cursor (opening prompt), typing, collapse (all boxes fall into one), done (pill).
    // camera: tiltX pitch (+ tips the top away), tiltY yaw (+ turns the right side away), roll,
    // zoom [start, end] (1 shows the whole screen), pan drift over the shot, blur (depth of
    // field, 1 = normal), shake (hand-held, px). hero: baseline start of the typed line.
    // lock (typing shots, optional): the word or phrase of the line the tracker locks on; without
    // it the lock takes the last word, as upstream. Naming it makes the build refuse the config
    // unless the locked word and its LOCK label are whole in the frame, uncovered, on a lock frame.
    shots: [
      { kind: "cursor", text: "›", palette: "paper", camera: { tiltX: 0.18, tiltY: 0.62, roll: -0.05, zoom: [3.3, 3.7], pan: [10, 0], blur: 1.1 }, hero: [720, 560], size: 120 },
      { kind: "typing", text: "thinking…", palette: "thermal", camera: { tiltX: 0.38, tiltY: -0.22, roll: 0.04, zoom: [2.5, 2.8], pan: [50, 0], blur: 1.2 }, hero: [560, 540], size: 104 },
      { kind: "typing", text: "reading 14 files", palette: "mono", camera: { tiltX: 0.12, tiltY: -0.55, roll: 0.06, zoom: [2.1, 2.3], pan: [60, -10], blur: 1.0 }, hero: [330, 600], size: 84 },
      { kind: "typing", text: "src/render.rs", palette: "mono", camera: { tiltX: -0.12, tiltY: 0.5, roll: -0.03, zoom: [2.7, 2.7], pan: [0, 0], blur: 1.7 }, hero: [420, 480], size: 92 },
      { kind: "typing", text: "tool_call: render_frame()", palette: "phosphor", camera: { tiltX: 0.78, tiltY: 0.1, roll: -0.12, zoom: [1.9, 2.2], pan: [30, 0], blur: 1.2 }, hero: [230, 560], size: 64 },
      { kind: "typing", text: "attention → token 4812", palette: "thermal", camera: { tiltX: 0.26, tiltY: -0.36, roll: 0.0, zoom: [1.6, 3.1], pan: [0, 0], blur: 1.0 }, hero: [250, 540], size: 72 },
      { kind: "typing", text: "not just completing —", palette: "mono", camera: { tiltX: 0.2, tiltY: 0.32, roll: 0.05, zoom: [2.3, 2.3], pan: [-170, 0], blur: 1.1 }, hero: [230, 520], size: 76 },
      { kind: "typing", text: "— composing", palette: "amber", camera: { tiltX: 0.32, tiltY: -0.26, roll: -0.02, zoom: [3.1, 2.1], pan: [0, 0], blur: 1.3 }, hero: [560, 560], size: 112 },
      { kind: "typing", text: "verifying 180 frames", palette: "navy", camera: { tiltX: 0.15, tiltY: -0.16, roll: 0.0, zoom: [2.05, 2.1], pan: [0, 0], blur: 0.8, shake: 4 }, hero: [300, 520], size: 74 },
      { kind: "typing", text: "✓ 0 problems", palette: "phosphor", camera: { tiltX: 0.22, tiltY: 0.62, roll: -0.08, zoom: [2.5, 2.7], pan: [20, 0], blur: 1.2 }, hero: [500, 560], size: 100 },
      { kind: "collapse", text: "", palette: "thermal", camera: { tiltX: 0.3, tiltY: 0.2, roll: 0.03, zoom: [1.35, 2.7], pan: [0, 0], blur: 1.0 }, hero: [960, 540], size: 80 },
      { kind: "done", text: "Done", palette: "neon", camera: { tiltX: 0.46, tiltY: -0.32, roll: 0.06, zoom: [3.0, 1.9], pan: [0, 0], blur: 1.2 }, hero: [960, 540], size: 80 },
    ],
    // The pill of a done shot: centre, size and label.
    done: { label: "Done", center: [960, 540], size: [420, 132] },
    // Lens strengths (literals of upstream lens.sksl). taps and glowTaps set the depth-of-field and
    // bloom sample counts; lowering them trades smoothness for render time.
    lens: {
      flatScale: 2, // the flat screen is drawn at 2x so the lens can magnify it
      cell: 3, // LED cell, logical px
      taps: 36,
      glowTaps: 16,
      dof: 190, // circle of confusion per unit of depth difference, output px
      dofMax: 46,
      aberration: [0.006, 0.016, 0.008], // base, on a lock, on a cut
      bloom: [26, 1.6, 0.75], // radius (output px), palette lift, mix
      vignette: 0.42,
      flicker: 0.035,
      grain: 0.06,
    },
    sound: {
      seed: 11,
      // Lock pings walk a minor pentatonic, Hz.
      lockNotes: [1318.5, 1568.0, 1760.0, 2093.0, 2349.3, 1760.0, 1568.0, 2093.0, 2637.0, 1760.0, 1046.5, 2093.0],
    },
  }));
