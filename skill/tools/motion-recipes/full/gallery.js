((root, factory) => {
  
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else {
    root.MotionRecipeGallery = api;
    if (root.document) api.mount(root.document, root);
  }
})(typeof globalThis === "object" ? globalThis : this, () => {
  
  function filterRecords(records, { query = "", group = "", category = "" } = {}) {
    const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    return records.filter(row => (!group || row.motionRecipe.group === group) && (!category || row.category === category)
      && terms.every(term => [row.id, row.name.en, row.name.zh, row.category, row.description, ...row.keywords].join(" ").toLocaleLowerCase().includes(term)));
  }
  function idFromHash(hash) {
    if (!hash || hash === "#") return null;
    if (!hash.startsWith("#motion=") || hash.length === 8) throw new Error(`Invalid selection hash: ${hash}. Use #motion=<exact-source-id>.`);
    try { return decodeURIComponent(hash.slice(8)); } catch { throw new Error(`Malformed selection hash: ${hash}`); }
  }
  function resolveSelection(records, modules, id) {
    const matches = records.filter(row => row.id === id);
    if (matches.length !== 1) throw new Error(`${id}: ${matches.length ? "duplicate/ambiguous variant" : "unknown exact variant"}`);
    const record = matches[0];
    const config = record.motionRecipe;
    if (config.variantId !== id) throw new Error(`${id}: variant ID mismatch`);
    const descriptor = modules[config.group]?.recipes?.[config.recipeId];
    if (modules[config.group]?.group !== config.group || !config.recipeId.startsWith(`${config.group}.`) || !descriptor || typeof descriptor.validate !== "function" || typeof descriptor.create !== "function") throw new Error(`${id}: unsupported descriptor ${config.recipeId}`);
    try { descriptor.validate(config.parameters); } catch (error) { throw new Error(`${id}: ${error.message}`); }
    return { record, descriptor };
  }
  function mount(document, window) {
    const $ = id => document.getElementById(id);
    const records = window.MotionRecipeData;
    const modules = window.MotionRecipeModules || {};
    const controls = ["play", "replay", "seek", "reverse", "reduced", "sample-text"].map($);
    let current = null;
    let instance = null;
    let progress = 0;
    let playing = false;
    let frame = 0;
    let previousTime = null;
    let disposed = false;
    const listeners = [];
    function listen(target, type, fn) { target.addEventListener(type, fn); listeners.push(() => target.removeEventListener(type, fn)); }
    function pause() {
      playing = false;
      window.cancelAnimationFrame(frame);
      frame = 0;
      previousTime = null;
      $("play").textContent = "Play / 播放";
      $("play").setAttribute("aria-pressed", "false");
    }
    function release() {
      pause();
      const old = instance;
      instance = null;
      current = null;
      try { if (old) old.dispose(); } finally { $("stage").replaceChildren(); delete $("stage").dataset.recipe; }
    }
    function showError(error) {
      try { release(); } catch (disposeError) { error = new Error(`${error.message}; dispose: ${disposeError.message}`); }
      $("error").textContent = error.message;
      $("error").hidden = false;
      $("variant").value = "";
      controls.forEach(control => { control.disabled = true; });
      $("title").textContent = "Selection unavailable / 无法选择";
      $("description").textContent = "Choose an exact supported variant. No fallback recipe is substituted. 请选择有效条目，不会以其他效果替代。";
      $("metadata").textContent = "";
      $("parameters").textContent = "";
      $("guide").hidden = true;
      $("source").hidden = true;
      $("progress").textContent = "—";
    }
    function seek(value) {
      if (!Number.isFinite(value) || value < 0 || value > 1) throw new Error("Seek progress must be finite in [0, 1].");
      if (!instance) return;
      instance.seek(value);
      progress = value;
      $("seek").value = String(Math.round(progress * 1000));
      $("progress").textContent = `${Math.round(progress * 100)}%`;
      $("seek").setAttribute("aria-valuetext", `${Math.round(progress * 100)} percent`);
    }
    function updateOptions() {
      const categories = [...new Set(records.filter(row => !$("group").value || row.motionRecipe.group === $("group").value).map(row => row.category))].sort();
      const selected = $("category").value;
      $("category").replaceChildren(new window.Option("All categories / 全部类别", ""), ...categories.map(category => new window.Option(category, category)));
      $("category").value = categories.includes(selected) ? selected : "";
    }
    function updateResults() {
      const matches = filterRecords(records, { query: $("search").value, group: $("group").value, category: $("category").value });
      $("variant").replaceChildren(new window.Option("Choose a variant / 选择条目", ""), ...matches.map(row => new window.Option(`${row.name.zh} · ${row.name.en} [${row.id}]`, row.id)));
      $("variant").value = current && matches.some(row => row.id === current.id) ? current.id : "";
      $("count").textContent = `${matches.length} / ${records.length} variants · 条目`;
      $("filter-note").textContent = current && !matches.some(row => row.id === current.id) ? "The selected study is outside these filters; playback remains exact. 当前条目不在筛选结果中，预览仍保持原选择。" : "";
    }
    function select(id, keepProgress = false) {
      const targetProgress = keepProgress ? progress : ($("reverse").checked ? 1 : 0);
      try {
        const { record, descriptor } = resolveSelection(records, modules, id);
        release();
        current = record;
        const created = descriptor.create($("stage"), record.motionRecipe.parameters, { reducedMotion: $("reduced").checked, text: $("sample-text").value, seed: 137 });
        instance = created;
        if (!created || typeof created.seek !== "function" || typeof created.dispose !== "function") throw new Error(`${id}: invalid seek/dispose controller`);
        if ($("stage").dataset.recipe !== record.motionRecipe.recipeId) throw new Error(`${id}: mounted descriptor marker mismatch`);
        $("error").hidden = true;
        $("error").textContent = "";
        controls.forEach(control => { control.disabled = false; });
        $("title").textContent = `${record.name.zh} / ${record.name.en}`;
        $("description").textContent = record.description;
        $("metadata").textContent = `${id} · ${record.category} · ${record.motionRecipe.recipeId} · ${record.motionRecipe.studyDurationMs} ms authored study`;
        $("parameters").textContent = JSON.stringify(record.motionRecipe.parameters, null, 2);
        $("guide").href = `../../../${record.guide}`;
        $("source").href = record.inspiration.url;
        $("guide").hidden = false;
        $("source").hidden = false;
        updateResults();
        seek(targetProgress);
      } catch (error) { showError(error); }
    }
    function tick(time) {
      if (!playing || !current || disposed) return;
      const elapsed = previousTime === null ? 0 : time - previousTime;
      previousTime = time;
      const next = Math.max(0, Math.min(1, progress + elapsed / current.motionRecipe.studyDurationMs * ($("reverse").checked ? -1 : 1)));
      try { seek(next); } catch (error) { showError(error); return; }
      if (next === ($("reverse").checked ? 0 : 1)) pause();
      else frame = window.requestAnimationFrame(tick);
    }
    function play() {
      if (!instance) return;
      if (playing) { pause(); return; }
      if (progress === ($("reverse").checked ? 0 : 1)) seek($("reverse").checked ? 1 : 0);
      playing = true;
      previousTime = null;
      $("play").textContent = "Pause / 暂停";
      $("play").setAttribute("aria-pressed", "true");
      frame = window.requestAnimationFrame(tick);
    }
    function guarded(fn) { return () => { try { fn(); } catch (error) { showError(error); } }; }
    const systemReduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    $("reduced").checked = systemReduced.matches;
    if (!Array.isArray(records) || !records.length) { showError(new Error("Local catalogue projection unavailable. Rebuild data.js from the canonical catalogue. 本地数据未就绪。")); return { dispose() {} }; }
    updateOptions();
    updateResults();
    listen($("search"), "input", updateResults);
    listen($("group"), "change", () => { updateOptions(); updateResults(); });
    listen($("category"), "change", updateResults);
    listen($("variant"), "change", () => {
      if (!$("variant").value) { showError(new Error("Select an exact variant / 请选择确切条目")); return; }
      const hash = `#motion=${encodeURIComponent($("variant").value)}`;
      if (window.location.hash === hash) select($("variant").value);
      else window.location.hash = hash;
    });
    listen($("play"), "click", guarded(play));
    listen($("replay"), "click", guarded(() => { pause(); seek($("reverse").checked ? 1 : 0); play(); }));
    listen($("seek"), "input", guarded(() => { pause(); seek(Number($("seek").value) / 1000); }));
    listen($("reverse"), "change", () => { previousTime = null; });
    listen($("reduced"), "change", () => { if (current) select(current.id, true); });
    listen($("sample-text"), "input", () => { if (current) select(current.id, true); });
    listen(systemReduced, "change", () => { $("reduced").checked = systemReduced.matches; if (current) select(current.id, true); });
    function applyHash() {
      try { const id = idFromHash(window.location.hash); select(id === null ? records[0].id : id); }
      catch (error) { showError(error); }
    }
    listen(window, "hashchange", applyHash);
    listen(document, "visibilitychange", () => { if (document.hidden) pause(); });
    function dispose() {
      if (disposed) return;
      disposed = true;
      listeners.forEach(remove => remove());
      release();
    }
    listen(window, "pagehide", event => { if (event.persisted) pause(); else dispose(); });
    applyHash();
    return { dispose };
  }
  return { filterRecords, idFromHash, resolveSelection, mount };
});
