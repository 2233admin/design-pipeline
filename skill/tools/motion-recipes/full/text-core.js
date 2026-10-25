(((root, factory) => {
  
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MotionTextCore = factory();
})(typeof globalThis === 'undefined' ? this : globalThis, () => {
  
  const clamp = value => Math.max(0, Math.min(1, value));
  function progress(value) {
    if (!Number.isFinite(value) || value < 0 || value > 1) throw new RangeError('Text study progress must be finite in [0,1]');
    return value;
  }
  function validate(parameters, schema) {
    if (!parameters || typeof parameters !== 'object' || Array.isArray(parameters)) throw new TypeError('Text parameters must be an object');
    for (const key of Object.keys(parameters)) if (!Object.hasOwn(schema, key)) throw new TypeError('Unsupported text parameter: ' + key);
    for (const [key, rule] of Object.entries(schema)) {
      const value = parameters[key];
      if (value === undefined) throw new TypeError('Missing text parameter: ' + key);
      if (Array.isArray(rule)) {
        if (!rule.includes(value)) throw new TypeError('Unsupported ' + key + ': ' + value);
      } else if (typeof rule === 'function') {
        if (!rule(value)) throw new TypeError('Invalid text parameter: ' + key);
      } else if (typeof value !== 'number' || !Number.isFinite(value) || value < rule.min || value > rule.max) throw new RangeError('Out-of-range text parameter: ' + key);
    }
  }
  function segments(text, unit, locale) {
    text = String(text);
    if (unit === 'whole') return [text];
    if (unit === 'line') {
      const explicit = text.split(/\r?\n/);
      if (explicit.length > 1) return explicit;
      const sentences = text.match(/[^。！？.!?]+[。！？.!?]?/gu);
      return sentences && sentences.length > 1 ? sentences : [text];
    }
    if (typeof Intl.Segmenter !== 'function') throw new Error('Intl.Segmenter is required for safe text studies');
    if (unit !== 'char' && unit !== 'word') throw new TypeError('Unsupported segmentation: ' + unit);
    return Array.from(new Intl.Segmenter(locale || 'zh', { granularity: unit === 'char' ? 'grapheme' : 'word' }).segment(text), entry => entry.segment);
  }
  function random(seed, index) {
    let x = ((Number(seed) >>> 0) ^ Math.imul(index + 1, 2654435761)) >>> 0;
    x ^= x >>> 16; x = Math.imul(x, 2246822507); x ^= x >>> 13; x = Math.imul(x, 3266489909); x ^= x >>> 16;
    return (x >>> 0) / 4294967296;
  }
  function node(parent, tag, text, style) {
    const element = parent.ownerDocument.createElement(tag || 'div');
    if (text !== undefined && text !== null) element.textContent = text;
    if (style) Object.assign(element.style, style);
    parent.appendChild(element);
    return element;
  }
  function svg(parent, tag, attrs) {
    const element = parent.ownerDocument.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attrs || {})) element.setAttribute(key, String(value));
    parent.appendChild(element); return element;
  }
  function scene(stage, id, options) {
    if (!stage || !stage.ownerDocument) throw new TypeError('Text study requires a DOM stage');
    options = options || {};
    const text = options.text === undefined ? '文字 Motion — 让信息清晰可读。' : String(options.text);
    stage.dataset.recipe = id;
    const root = node(stage, 'div', null, { position:'relative', width:'100%', minHeight:'220px', padding:'24px', boxSizing:'border-box', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', overflow:'hidden', color:'#e9f2ff', background:'#101b2e', fontFamily:'system-ui, "Microsoft YaHei", "Yu Gothic", sans-serif', fontSize:'clamp(20px, 4vw, 38px)', lineHeight:'1.5', whiteSpace:'pre-wrap', perspective:'700px' });
    root.setAttribute('role', 'img'); root.setAttribute('aria-label', text);
    const listeners = [];
    let disposed = false;
    const result = { root, text, reduced:options.reducedMotion === true, seed:Number(options.seed) >>> 0,
      node:(tag, content, style, parent) => node(parent || root, tag, content, style),
      svg:(tag, attrs, parent) => svg(parent || root, tag, attrs),
      listen(target, event, callback, settings) { target.addEventListener(event, callback, settings); listeners.push(() => target.removeEventListener(event, callback, settings)); },
      seek(value) { if (disposed) throw new Error('Text study already disposed'); return progress(value); },
      dispose() { if (disposed) return; disposed = true; for (const release of listeners) release(); root.remove(); if (stage.dataset.recipe === id) delete stage.dataset.recipe; }
    };
    return result;
  }
  function tokens(view, unit, locale) {
    const units = segments(view.text, unit, locale);
    const box = view.node('div', null, { display:unit === 'line' ? 'block' : 'flex', flexWrap:'wrap', alignItems:'baseline', justifyContent:'center', maxWidth:'100%', gap:unit === 'word' ? '0.08em' : '0' });
    box.setAttribute('aria-hidden', 'true');
    const nodes = units.map(value => node(box, 'span', value, { display:unit === 'line' ? 'block' : 'inline-block', whiteSpace:'pre-wrap', transformOrigin:'50% 80%', willChange:'transform, opacity', position:'relative' }));
    return { nodes, units, box };
  }
  function phase(value, index, length, spread) { return clamp((value - (length <= 1 ? 0 : index / (length - 1)) * spread) / (1 - spread)); }
  function recipe(id, title, schema, render) {
    return { title, validate:parameters => validate(parameters, schema), create(stage, parameters, options) { validate(parameters, schema); return render(scene(stage, id, options), parameters); } };
  }
  function lifecycle(view, draw) { return { seek(value) { value = view.seek(value); draw(view.reduced ? 1 : value, view.reduced); }, dispose:() => view.dispose() }; }
  return { clamp, progress, validate, segments, random, node, svg, scene, tokens, phase, recipe, lifecycle };
}));
