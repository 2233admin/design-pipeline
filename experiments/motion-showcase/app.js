"use strict";
document.documentElement.classList.add("js");
const pause = document.querySelector("#pause");
const poster = document.querySelector(".poster");
const art = document.querySelector(".poster-art");
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const listeners = new AbortController();
let paused = false;
function updatePause() {
  const frozen = paused || reduced.matches;
  document.documentElement.classList.toggle("paused", frozen);
  pause.setAttribute("aria-pressed", String(frozen));
  pause.querySelector(".pause-label").textContent = reduced.matches ? "已减弱动效" : paused ? "继续动画" : "暂停动画";
  pause.querySelector(".pause-icon").textContent = frozen ? "▷" : "Ⅱ";
  pause.disabled = reduced.matches;
  if (frozen) resetTilt();
}
function resetTilt() { art.style.removeProperty("--rx"); art.style.removeProperty("--ry"); }
pause.addEventListener("click", () => { paused = !paused; updatePause(); }, { signal: listeners.signal });
reduced.addEventListener("change", updatePause, { signal: listeners.signal });
poster.addEventListener("pointermove", (event) => {
  if (paused || reduced.matches || event.pointerType !== "mouse") return;
  const rect = poster.getBoundingClientRect();
  art.style.setProperty("--rx", `${-((event.clientY - rect.top) / rect.height - .5) * 12}deg`);
  art.style.setProperty("--ry", `${((event.clientX - rect.left) / rect.width - .5) * 12}deg`);
}, { signal: listeners.signal });
poster.addEventListener("pointerleave", resetTilt, { signal: listeners.signal });
const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) if (entry.isIntersecting) {
    entry.target.classList.add("is-visible");
    observer.unobserve(entry.target);
  }
}, { threshold: .25 });
observer.observe(poster);
updatePause();
addEventListener("pagehide", (event) => {
  if (event.persisted) return;
  observer.disconnect(); listeners.abort();
}, { signal: listeners.signal });
