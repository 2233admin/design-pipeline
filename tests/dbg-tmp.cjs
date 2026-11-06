// CI diagnostic: crop of the Alpha tag in page vs isolated, black and white, plus fonts, as base64 PNG
module.exports = async function dbg(file, puppeteer, executablePath, args, log) {
  const { pathToFileURL } = require("node:url");
  const browser = await puppeteer.launch({ executablePath, headless: true, args });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto(pathToFileURL(file).href, { waitUntil: "load" });
    const info = await page.evaluate(() => {
      const el = [...document.querySelectorAll("span")].find((s) => s.textContent === "Alpha");
      const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
      return { rect: [r.x, r.y, r.width, r.height], font: cs.fontFamily, color: cs.color, bg: cs.backgroundColor, ua: navigator.userAgent, hide: cs.display };
    });
    log("DBG info " + JSON.stringify(info));
    const clip = { x: Math.max(0, info.rect[0] - 6), y: Math.max(0, info.rect[1] - 6), width: info.rect[2] + 12, height: info.rect[3] + 12 };
    for (const mode of ["page", "iso-black", "iso-white"]) {
      await page.evaluate((m) => {
        const el = [...document.querySelectorAll("span")].find((s) => s.textContent === "Alpha");
        const st = document.getElementById("dbgstyle") || document.head.appendChild(Object.assign(document.createElement("style"), { id: "dbgstyle" }));
        st.textContent = m === "page" ? "" : `*{animation:none!important;transition:none!important} :root *{visibility:hidden!important} [data-dbg],[data-dbg] *{visibility:visible!important;color:${m === "iso-black" ? "#000" : "#fff"}!important;-webkit-text-fill-color:${m === "iso-black" ? "#000" : "#fff"}!important}`;
        el.setAttribute("data-dbg", "");
      }, mode);
      const png = await page.screenshot({ type: "png", clip });
      log(`DBG png ${mode} ${png.toString("base64")}`);
    }
  } finally { await browser.close(); }
};
