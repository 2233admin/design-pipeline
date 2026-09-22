"use strict";
(() => {
  const DURATION = 40;
  const film = document.querySelector("#seed-film");
  const composition = document.querySelector(".composition");
  const play = document.querySelector("#play");
  const seek = document.querySelector("#seek");
  const timeLabel = document.querySelector("#time");
  const label = document.querySelector("#scene-label");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const sceneStarts = [0, 7, 14, 23, 30, 35.5];
  const sceneNames = ["THE SPARK", "THE SPACE", "THE CONNECTION", "THE COLLABORATOR", "MADE VISIBLE", "SEEDCONTROLLER"];
  const scenes = [...document.querySelectorAll(".scene")];
  const chapters = [...document.querySelectorAll(".chapters button")];
  let lastFrame = -1;
  let clockTime = 0;

  function donut(time, width = 100, height = 38) {
    const chars = Array(width * height).fill(" ");
    const depth = new Float32Array(width * height);
    const a = .6 + time * .32;
    const b = -.3 + time * .16;
    const sinA = Math.sin(a), cosA = Math.cos(a), sinB = Math.sin(b), cosB = Math.cos(b);
    const ramp = ".,:;irsXA253hMHGS#9B&@";
    for (let j = 0; j < Math.PI * 2; j += .075) {
      const cosJ = Math.cos(j), sinJ = Math.sin(j), ring = cosJ + 2;
      for (let i = 0; i < Math.PI * 2; i += .035) {
        const sinI = Math.sin(i), cosI = Math.cos(i);
        const distance = 1 / (sinI * ring * sinA + sinJ * cosA + 5);
        const tilt = sinI * ring * cosA - sinJ * sinA;
        const x = Math.floor(width / 2 + width * .40 * distance * (cosI * ring * cosB - tilt * sinB));
        const y = Math.floor(height / 2 + height * .66 * distance * (cosI * ring * sinB + tilt * cosB));
        const light = (sinJ * sinA - sinI * cosJ * cosA) * cosB - sinI * cosJ * sinA - sinJ * cosA - cosI * cosJ * sinB;
        const index = x + y * width;
        if (x >= 0 && x < width && y >= 0 && y < height && distance > depth[index]) {
          depth[index] = distance;
          chars[index] = ramp[Math.max(0, Math.min(ramp.length - 1, Math.floor((light + .4) * 10)))];
        }
      }
    }
    return Array.from({ length: height }, (_, y) => chars.slice(y * width, (y + 1) * width).join("")).join("\n");
  }

  function landscapeText(width, height, image) {
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    const ramp = " .:-=+*#%@";
    if (image) {
      try {
        context.drawImage(image, 0, 0, width, height);
        const pixels = context.getImageData(0, 0, width, height).data;
        return Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => {
          const p = (y * width + x) * 4;
          const brightness = (.2126 * pixels[p] + .7152 * pixels[p + 1] + .0722 * pixels[p + 2]) / 255;
          return ramp[Math.min(9, Math.floor(brightness * 10))];
        }).join("")).join("\n");
      } catch { /* Direct file previews may restrict image pixel reads; use the fixed field. */ }
    }
    return Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => {
      const ridge = height * .38 + Math.sin(x * .12) * 5 + Math.sin(x * .37) * 2;
      if (y < ridge) return y < ridge - 2 ? " " : ".";
      return ramp[Math.min(9, Math.floor(3 + 5 * Math.abs(Math.sin(x * .12 + y * .2))))];
    }).join("")).join("\n");
  }
  function makeLandscapes(image) {
    for (const pre of document.querySelectorAll(".landscape-ascii")) {
      pre.textContent = landscapeText(pre.dataset.landscape === "medium" ? 72 : 57, 24, image);
    }
    document.querySelector("#reveal-ascii").textContent = landscapeText(200, 65, image);
  }
  makeLandscapes();
  const source = new Image();
  source.onload = () => makeLandscapes(source);
  source.src = "assets/landscape.png";

  const timeline = gsap.timeline({ paused: true, defaults: { ease: "power3.out" } });
  window.__timelines = { "seed-film": timeline };
  function entrance(selector, at, duration = 1, extra = {}) {
    timeline.fromTo(selector, { opacity: 0, y: 45 }, { opacity: 1, y: 0, duration, ...extra }, at);
  }
  function scene(id, at, end) {
    timeline.fromTo(id, { opacity: 0 }, { opacity: 1, duration: .65, ease: "power2.inOut" }, at);
    if (end < DURATION) timeline.to(id, { opacity: 0, duration: .6, ease: "power2.inOut" }, end);
  }

  scene("#intro", 0, 6.5);
  entrance(".intro-kicker", .3, 1.2);
  entrance(".intro-line", .65, 1.35, { stagger: .16 });
  entrance(".intro-note", 2, 1.1);
  timeline.fromTo(".seed-art", { opacity: 0, scale: .28, rotation: -12 }, { opacity: .94, scale: 1, rotation: 0, duration: 3.7, ease: "power2.out" }, .15);
  entrance(".seed-caption", 3.2, 1);
  timeline.to(".seed-art", { scale: 1.15, x: 30, duration: 2.2, ease: "power1.inOut" }, 4.7);

  scene("#canvas-scene", 6.6, 13.7);
  entrance(".canvas-heading .overline", 7, .8);
  entrance(".canvas-heading h2", 7.2, 1.1);
  entrance(".canvas-heading>p:last-child", 8, .9);
  entrance(".float-node", 7.2, 1.45, { stagger: .23 });
  entrance(".canvas-toolbar", 9.1, .8);
  timeline.fromTo(".canvas-camera", { scale: 1.17 }, { scale: .96, duration: 7.2, ease: "power1.inOut" }, 6.6);
  timeline.to(".node-reference", { y: -18, rotation: -4, duration: 4.3, ease: "sine.inOut" }, 9.5);
  timeline.to(".node-result", { y: 15, rotation: -2, duration: 4.1, ease: "sine.inOut" }, 9.5);

  scene("#workflow", 13.8, 22.7);
  entrance(".workflow-heading .overline", 14.05, .8);
  entrance(".workflow-heading h2", 14.3, 1.05);
  entrance(".flow-prompt,.flow-ref", 14.8, 1, { stagger: .2 });
  entrance(".flow-imagegen", 15.6, 1);
  timeline.to("#edge-a,#edge-b", { strokeDashoffset: 0, duration: 1.4, stagger: .22, ease: "power2.inOut" }, 15.5);
  timeline.to(".image-resolve", { opacity: 1, duration: 1.6, ease: "power1.inOut" }, 17.3);
  entrance(".flow-videogen", 18, 1);
  timeline.to("#edge-c", { strokeDashoffset: 0, duration: 1.1 }, 18.2);
  timeline.fromTo(".generated-video>img", { scale: 1 }, { scale: 1.19, x: -12, duration: 4.5, ease: "none" }, 18.7);
  timeline.fromTo(".film-strip", { scaleX: 0 }, { scaleX: 1, duration: 3.9, ease: "none" }, 19);
  entrance(".workflow-bottom", 19.5, 1);
  timeline.fromTo(".workflow-camera", { scale: .93 }, { scale: 1, duration: 8.4, ease: "power1.inOut" }, 14);

  scene("#agent-scene", 22.8, 29.8);
  entrance(".agent-heading .overline", 23.1, .8);
  entrance(".agent-heading h2", 23.3, 1.1);
  entrance(".agent-heading>p:last-child", 24.1, .9);
  entrance(".agent-window", 23.5, 1.2);
  timeline.to(".prompt-typed", { clipPath: "inset(0 0% 0 0)", duration: 1.5, ease: "steps(22)" }, 24.3);
  timeline.to(".prompt-caret", { opacity: 1, duration: .1 }, 24.3).to(".prompt-caret", { opacity: 0, duration: .1 }, 25.9);
  entrance(".agent-reply", 26, .7);
  entrance(".mini-plan>div", 26.6, .8, { stagger: .2 });
  entrance(".mini-plan>i,.agent-window-foot", 27.5, .7);

  scene("#reveal-scene", 29.9, 35.4);
  timeline.fromTo("#reveal-ascii", { opacity: 1, scale: 1.04 }, { opacity: 0, scale: 1, duration: 2.1, ease: "power2.inOut" }, 30.8);
  timeline.to(".reveal-image", { clipPath: "inset(0 0% 0 0)", duration: 2.5, ease: "power2.inOut" }, 30.35);
  timeline.fromTo(".reveal-image", { scale: 1.07 }, { scale: 1, duration: 5.7, ease: "none" }, 29.9);
  entrance(".reveal-copy", 31.3, 1.1);
  entrance(".reveal-caption", 32.4, .9);

  scene("#end-scene", 35.3, DURATION);
  entrance(".end-symbol", 35.5, .8);
  entrance(".end-content h2", 35.7, 1.1);
  entrance(".end-content>p", 36.1, 1);
  entrance(".end-features", 36.5, .8);
  entrance(".end-bottom", 36.8, .6);

  function syncUI(t) {
    timeLabel.textContent = `00:${String(Math.floor(t)).padStart(2, "0")}`;
    seek.value = String(t);
    const playing = !timeline.paused() && t < DURATION;
    play.textContent = playing ? "Ⅱ" : "▷";
    play.setAttribute("aria-label", playing ? "暂停" : t >= DURATION ? "重新播放" : "播放");
    const chapter = Math.max(0, sceneStarts.findLastIndex(start => t >= start));
    label.textContent = sceneNames[chapter];
    chapters.forEach((button, index) => {
      button.classList.toggle("active", chapter === index);
      if (chapter === index) button.setAttribute("aria-current", "step");
      else button.removeAttribute("aria-current");
    });
  }
  // A property setter also runs when external renderers seek with events suppressed.
  const clock = { get value() { return clockTime; }, set value(t) {
    clockTime = t;
    const frame = Math.floor(t * 24);
    if (frame !== lastFrame) {
      lastFrame = frame;
      const sampleTime = frame / 24;
      if (t < 7.5) document.querySelector("#seed-art").textContent = donut(sampleTime);
      if (t >= 35) document.querySelector("#end-ascii").textContent = donut(Math.min(sampleTime, 37), 160, 52);
    }
    syncUI(t);
  } };
  timeline.to(clock, { value: DURATION, duration: DURATION, ease: "none" }, 0);
  timeline.eventCallback("onComplete", () => syncUI(DURATION));

  function resize() {
    const scale = document.fullscreenElement === film ? Math.min(film.clientWidth / 1600, film.clientHeight / 900) : film.clientWidth / 1600;
    composition.style.setProperty("--scale", String(scale));
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(film);
  resize();
  const listeners = new AbortController();
  function toggle() {
    if (timeline.time() >= DURATION) timeline.restart();
    else timeline.paused(!timeline.paused());
    syncUI(timeline.time());
  }
  play.addEventListener("click", toggle, { signal: listeners.signal });
  document.querySelector("#restart").addEventListener("click", () => { timeline.restart(); syncUI(0); }, { signal: listeners.signal });
  seek.addEventListener("input", () => { timeline.pause().time(Number(seek.value), false); syncUI(timeline.time()); }, { signal: listeners.signal });
  chapters.forEach(button => button.addEventListener("click", () => {
    timeline.pause().time(Number(button.dataset.time), false); syncUI(timeline.time());
  }, { signal: listeners.signal }));
  document.querySelector("#fullscreen").addEventListener("click", async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await film.requestFullscreen(); }
    catch { document.querySelector("#fullscreen").title = "当前浏览器未开放全屏，可放大预览面板观看"; }
  }, { signal: listeners.signal });
  document.addEventListener("fullscreenchange", resize, { signal: listeners.signal });
  document.addEventListener("keydown", event => {
    if (event.code === "Space" && !["BUTTON", "INPUT", "A", "SUMMARY"].includes(event.target.tagName)) { event.preventDefault(); toggle(); }
    if (event.code === "Escape" && !document.fullscreenElement) { timeline.pause(); syncUI(timeline.time()); }
  }, { signal: listeners.signal });
  reduced.addEventListener("change", () => { if (reduced.matches) { timeline.pause(); syncUI(timeline.time()); } }, { signal: listeners.signal });
  document.addEventListener("visibilitychange", () => { if (document.hidden) { timeline.pause(); syncUI(timeline.time()); } }, { signal: listeners.signal });
  addEventListener("pagehide", event => {
    if (!event.persisted) { timeline.kill(); resizeObserver.disconnect(); listeners.abort(); }
  }, { signal: listeners.signal });
  clock.value = 0;
  if (reduced.matches) timeline.pause().time(38, false);
  else timeline.play(0);
})();
