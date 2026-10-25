(((root, factory) => {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./text-core.js'));
  else {
    root.MotionTextParts = root.MotionTextParts || {};
    root.MotionTextParts.semantic = factory(root.MotionTextCore);
  }
})(typeof globalThis === 'undefined' ? this : globalThis, core => {
  
  if (!core) throw new Error('text-semantic.js requires MotionTextCore');
  const recipes = {};
  const range = (min, max) => ({ min, max });
  const integer = (min, max) => value => Number.isSafeInteger(value) && value >= min && value <= max;
  const shortText = value => typeof value === 'string' && value.length > 0 && value.length <= 240;
  const textList = value => Array.isArray(value) && value.length > 0 && value.length <= 24 && value.every(shortText);
  const rubyList = value => Array.isArray(value) && value.length > 0 && value.length <= 12 && value.every(pair => pair && typeof pair === 'object' && !Array.isArray(pair) && Object.keys(pair).length === 2 && Object.hasOwn(pair, 'base') && Object.hasOwn(pair, 'reading') && shortText(pair.base) && shortText(pair.reading));
  const time = (value, start, end) => core.clamp((value - start) / (end - start));
  const out = value => 1 - (1 - value) ** 3;
  const smooth = value => value * value * (3 - 2 * value);
  const back = value => 1 + 2.70158 * (value - 1) ** 3 + 1.70158 * (value - 1) ** 2;
  const mix = (a, b, value) => a + (b - a) * value;
  function add(name, title, schema, render, relate) {
    const id = 'text.' + name;
    const base = core.recipe(id, title, schema, (view, parameters) => {
      try { return render(view, parameters); }
      catch (error) { view.dispose(); throw error; }
    });
    if (!relate) { recipes[id] = base; return; }
    const validate = parameters => { base.validate(parameters); relate(parameters); };
    recipes[id] = { title: base.title, validate, create(stage, parameters, options) { validate(parameters); return base.create(stage, parameters, options); } };
  }
  function hidden(element) { element.setAttribute('aria-hidden', 'true'); return element; }
  function text(view, value, style, parent) {
    return hidden(view.node('div', value === undefined ? view.text : value, Object.assign({ position:'relative', whiteSpace:'pre-wrap', overflowWrap:'anywhere', textAlign:'center', maxWidth:'100%' }, style), parent));
  }
  function note(view, value) {
    const result = text(view, value, { fontSize:'12px', lineHeight:'1.5', color:'#a8b9d2', marginTop:'12px' });
    view.root.setAttribute('aria-label', view.root.getAttribute('aria-label') + '；' + value);
    return result;
  }
  function label(view) { return text(view, view.text, { fontSize:'18px', marginTop:'16px' }); }
  function numericLabel(view, value) { view.root.setAttribute('aria-label', view.text + '；作者数值 ' + value); }
  function wordTokens(view) {
    const result = core.tokens(view, 'word');
    result.box.style.position = 'relative';
    result.box.style.gap = '0';
    const spoken = result.units.map((unit, index) => /\S/u.test(unit) ? index : -1).filter(index => index >= 0);
    return Object.assign(result, { spoken });
  }
  function weightedCues(units, locale) {
    const weights = units.map(unit => Math.max(1, core.segments(unit, 'char', locale).length));
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    let cursor = 0;
    return weights.map(weight => { const start = cursor / total; cursor += weight; return { start, end:cursor / total }; });
  }
  function cueAt(cues, value) {
    if (!cues.length) return -1;
    return Math.min(cues.length - 1, cues.findIndex(cue => value < cue.end) < 0 ? cues.length - 1 : cues.findIndex(cue => value < cue.end));
  }
  function lines(view, capacity) {
    const explicit = view.text.split(/\r?\n/u);
    const result = [];
    for (const line of explicit) {
      let current = '', length = 0;
      for (const unit of core.segments(line, 'word')) {
        const size = core.segments(unit, 'char').length;
        if (current && length + size > capacity) { result.push(current); current = ''; length = 0; }
        current += unit; length += size;
      }
      result.push(current);
    }
    return result;
  }
  function phraseNodes(view) {
    const units = core.segments(view.text, 'line');
    const box = hidden(view.node('div', null, { position:'relative', width:'100%', display:'grid', placeItems:'center', minHeight:'100px' }));
    const nodes = units.map(unit => text(view, unit, { gridArea:'1 / 1', padding:'8px 16px' }, box));
    return { units, nodes, box, cues:weightedCues(units) };
  }
  function staticPhrases(result) {
    result.box.style.display = 'block';
    for (const node of result.nodes) { node.style.opacity = '1'; node.style.display = 'block'; node.style.transform = 'none'; }
  }
  function spring(value, stiffness, damping, mass, seconds) {
    if (value >= 1) return 1;
    const omega = Math.sqrt(stiffness / mass), zeta = damping / (2 * Math.sqrt(stiffness * mass));
    const t = value * seconds;
    if (zeta < 1) {
      const frequency = omega * Math.sqrt(1 - zeta * zeta);
      return 1 - Math.exp(-zeta * omega * t) * (Math.cos(frequency * t) + zeta / Math.sqrt(1 - zeta * zeta) * Math.sin(frequency * t));
    }
    if (zeta === 1) return 1 - Math.exp(-omega * t) * (1 + omega * t);
    const a = -omega * (zeta - Math.sqrt(zeta * zeta - 1)), b = -omega * (zeta + Math.sqrt(zeta * zeta - 1));
    return 1 - (b * Math.exp(a * t) - a * Math.exp(b * t)) / (b - a);
  }
  function japaneseDemo(view, description) {
    note(view, '作者日语示范 / Authored Japanese: ' + description);
    const board = hidden(view.node('div', null, { position:'relative', width:'100%', display:'flex', justifyContent:'center', alignItems:'center', flexWrap:'wrap', minHeight:'100px', gap:'0.12em' }));
    text(view, view.text, { fontSize:'18px', marginTop:'14px', color:'#e9f2ff' });
    note(view, '可编辑正文保留原文；不自动推断文节、读音、转换或笔顺。');
    return board;
  }

  // Caption state is computed from normalized cues; no media clock or subtitle ingest is owned here.
  add('caption-echo', '字幕光影回声 / Caption echo', { echoes:integer(2, 5), distance:range(4, 28), delay:range(0.04, 0.16), revealEnd:range(0.55, 0.9) }, (view, p) => {
    const box = hidden(view.node('div', null, { display:'grid', placeItems:'center', maxWidth:'100%' }));
    const copies = Array.from({ length:p.echoes }, (_, index) => text(view, view.text, { gridArea:'1 / 1', color:'#75aaff', textShadow:'0 0 12px #65b4ff', pointerEvents:'none' }, box));
    const main = text(view, view.text, { gridArea:'1 / 1' }, box);
    return core.lifecycle(view, (value, reduced) => {
      const q = time(value, 0, p.revealEnd);
      main.style.opacity = String(reduced ? 1 : out(q));
      main.style.transform = reduced ? 'none' : 'translateY(' + (1 - out(q)) * p.distance + 'px)';
      copies.forEach((copy, index) => {
        const local = time(q, index * p.delay, 1);
        copy.style.opacity = String(reduced ? 0 : Math.sin(Math.PI * local) * (0.3 / (index + 1)));
        copy.style.transform = reduced ? 'none' : 'translateY(' + ((1 - out(local)) * p.distance + index * 3) + 'px)';
      });
    });
  });
  add('caption-spring', '逐词弹簧字幕 / Word spring caption', { stiffness:range(60, 260), damping:range(6, 32), mass:range(0.5, 2), seconds:range(0.6, 1.5), spread:range(0.15, 0.65) }, (view, p) => {
    const result = wordTokens(view);
    return core.lifecycle(view, (value, reduced) => result.nodes.forEach((node, index) => {
      const q = core.phase(value, index, result.nodes.length, p.spread);
      const s = reduced ? 1 : spring(q, p.stiffness, p.damping, p.mass, p.seconds);
      node.style.opacity = String(reduced ? 1 : core.clamp(q * 8));
      node.style.transform = reduced ? 'none' : 'translateY(' + (1 - s) * 18 + 'px) scale(' + (0.7 + s * 0.3) + ')';
    }));
  });
  add('caption-cue-fade', '叙事字幕同步窗 / Narrative cue fade', { fadeFraction:range(0.03, 0.2), screenPosition:['bottom'] }, (view, p) => {
    const result = phraseNodes(view);
    result.box.style.alignSelf = 'end';
    return core.lifecycle(view, (value, reduced) => {
      if (reduced) { staticPhrases(result); return; }
      result.nodes.forEach((node, index) => {
        const cue = result.cues[index], local = time(value, cue.start, cue.end);
        const active = value >= cue.start && (value < cue.end || value === 1 && index === result.nodes.length - 1);
        const entering = core.clamp(local / p.fadeFraction), leaving = index === result.nodes.length - 1 ? 1 : core.clamp((1 - local) / p.fadeFraction);
        node.style.opacity = String(active ? Math.min(entering, leaving) : 0);
      });
    });
  });
  add('caption-pill', '当前词胶囊跟随 / Moving word pill', { travelFraction:range(0.15, 0.65), paddingPx:range(2, 12), palette:['blue'] }, (view, p) => {
    const result = wordTokens(view);
    const pill = hidden(view.node('div', null, { position:'absolute', left:'0', top:'0', borderRadius:'999px', background:'#235d96', zIndex:'0', pointerEvents:'none' }, result.box));
    result.nodes.forEach(node => { node.style.zIndex = '1'; });
    return core.lifecycle(view, (value, reduced) => {
      if (reduced || !result.spoken.length) { pill.style.display = 'none'; return; }
      pill.style.display = 'block';
      const cursor = Math.min(result.spoken.length - 1, value * result.spoken.length);
      const index = Math.floor(cursor), q = out(core.clamp((cursor - index) / p.travelFraction));
      const target = result.nodes[result.spoken[index]], previous = result.nodes[result.spoken[Math.max(0, index - 1)]];
      pill.style.width = mix(previous.offsetWidth, target.offsetWidth, q) + p.paddingPx * 2 + 'px';
      pill.style.height = mix(previous.offsetHeight, target.offsetHeight, q) + 'px';
      pill.style.transform = 'translate(' + (mix(previous.offsetLeft, target.offsetLeft, q) - p.paddingPx) + 'px,' + mix(previous.offsetTop, target.offsetTop, q) + 'px)';
    });
  });
  add('caption-word-pop', '逐词强调弹出 / Word pop emphasis', { popScale:range(1.05, 1.35), emphasis:['amber'], revealEnd:range(0.55, 0.9) }, (view, p) => {
    const result = wordTokens(view);
    result.nodes.forEach(node => { node.style.fontWeight = '800'; node.style.textShadow = '2px 2px 0 #000'; });
    return core.lifecycle(view, (value, reduced) => {
      const q = time(value, 0, p.revealEnd), cursor = q * Math.max(1, result.spoken.length);
      result.nodes.forEach((node, index) => {
        const rank = result.spoken.indexOf(index), local = core.clamp(cursor - Math.max(0, rank));
        const current = !reduced && rank >= 0 && Math.floor(cursor) === rank;
        node.style.opacity = String(reduced || rank < 0 ? 1 : local > 0 ? 1 : 0);
        node.style.color = current ? '#ffd166' : '#e9f2ff';
        node.style.transform = reduced || rank < 0 ? 'none' : 'scale(' + (local >= 1 ? 1 : mix(0.65, p.popScale, back(local))) + ')';
      });
    });
  });
  add('caption-karaoke', '连续词内染色 / Karaoke word fill', { fillColor:['amber'], timing:['grapheme-weighted'] }, view => {
    const result = wordTokens(view), cues = weightedCues(result.units);
    const fills = result.nodes.map((node, index) => hidden(view.node('span', result.units[index], { position:'absolute', inset:'0', color:'#ffd166', whiteSpace:'pre-wrap', pointerEvents:'none' }, node)));
    return core.lifecycle(view, (value, reduced) => fills.forEach((fill, index) => {
      const q = reduced ? 1 : time(value, cues[index].start, cues[index].end);
      fill.style.clipPath = 'inset(0 ' + (1 - q) * 100 + '% 0 0)';
    }));
  });
  add('caption-live-block', '实时假设与提交 / Live caption hypothesis', { lineCapacity:integer(8, 32), rows:[2], commitLag:integer(1, 3) }, (view, p) => {
    const units = lines(view, p.lineCapacity), all = units.map(unit => core.segments(unit, 'char'));
    const box = hidden(view.node('div', null, { width:'100%', background:'#050b14', padding:'12px', boxSizing:'border-box', minHeight:'3.2em' }));
    const lineNodes = all.map(chars => {
      const line = hidden(view.node('div', null, { whiteSpace:'pre-wrap', minHeight:'1.5em' }, box));
      const nodes = chars.map(char => hidden(view.node('span', char, { whiteSpace:'pre-wrap' }, line)));
      return { line, nodes };
    });
    const status = note(view, '作者时间轴：临时假设 → 提交；不是语音识别。');
    const total = all.reduce((sum, chars) => sum + chars.length, 0);
    return core.lifecycle(view, (value, reduced) => {
      const count = reduced ? total : Math.floor(value * (total + 1));
      let cursor = 0, current = 0;
      all.forEach((chars, index) => { if (count >= cursor) current = index; cursor += chars.length; });
      cursor = 0;
      lineNodes.forEach((entry, index) => {
        entry.line.style.display = reduced || index <= current && index > current - p.rows ? 'block' : 'none';
        entry.nodes.forEach((node, local) => {
          const rank = cursor + local;
          node.style.visibility = reduced || rank < count ? 'visible' : 'hidden';
          node.style.textDecoration = !reduced && value < 1 && rank >= count - p.commitLag ? 'underline dotted #ffd166' : 'none';
          node.style.color = !reduced && value < 1 && rank >= count - p.commitLag ? '#ffd166' : '#e9f2ff';
        });
        cursor += entry.nodes.length;
      });
      status.textContent = reduced || value === 1 ? '已提交 / Committed — 作者示范' : '临时假设 / Provisional — 作者示范';
    });
  });
  add('caption-paint-on', '词块逐步累积 / Paint-on words', { revealEnd:range(0.4, 0.85), unit:['word'] }, (view, p) => {
    const result = wordTokens(view);
    return core.lifecycle(view, (value, reduced) => {
      const count = reduced ? result.spoken.length : Math.floor(time(value, 0, p.revealEnd) * result.spoken.length);
      result.nodes.forEach((node, index) => { const rank = result.spoken.indexOf(index); node.style.visibility = rank < 0 || rank < count ? 'visible' : 'hidden'; });
    });
  });
  add('caption-phrase-wrap', '标点边界换行 / Punctuation phrase wrap', { boundaries:['punctuation-or-newline'], spread:range(0.2, 0.65), lineGapEm:range(0.15, 0.6) }, (view, p) => {
    const units = core.segments(view.text, 'line');
    const box = hidden(view.node('div', null, { width:'100%' }));
    const nodes = units.map(unit => text(view, unit, { marginTop:p.lineGapEm + 'em', background:'#162943', padding:'4px 10px' }, box));
    return core.lifecycle(view, (value, reduced) => nodes.forEach((node, index) => {
      const q = reduced ? 1 : out(core.phase(value, index, nodes.length, p.spread));
      node.style.clipPath = 'inset(0 ' + (1 - q) * 100 + '% 0 0)';
    }));
  });
  add('caption-pop-on', '整句时间窗切换 / Pop-on cue windows', { timing:['grapheme-weighted'], cuePlate:['black'] }, view => {
    const result = phraseNodes(view);
    result.nodes.forEach(node => { node.style.background = '#03060b'; });
    return core.lifecycle(view, (value, reduced) => {
      if (reduced) { staticPhrases(result); return; }
      const active = cueAt(result.cues, value);
      result.nodes.forEach((node, index) => { node.style.visibility = index === active ? 'visible' : 'hidden'; });
    });
  });
  add('caption-roll-up', '双行字幕滚入 / Two-line roll-up', { lineCapacity:integer(8, 32), rows:[2], transitionFraction:range(0.1, 0.45) }, (view, p) => {
    const units = lines(view, p.lineCapacity);
    const window = hidden(view.node('div', null, { width:'100%', height:p.rows * 1.5 + 'em', overflow:'hidden', position:'relative', background:'#050b14' }));
    const strip = hidden(view.node('div', null, { position:'relative', paddingTop:(p.rows - 1) * 1.5 + 'em' }, window));
    const nodes = units.map(unit => text(view, unit, { lineHeight:'1.5em', minHeight:'1.5em' }, strip));
    return core.lifecycle(view, (value, reduced) => {
      if (reduced) { window.style.height = 'auto'; strip.style.paddingTop = '0'; strip.style.transform = 'none'; nodes.forEach(node => { node.style.visibility = 'visible'; }); return; }
      const cursor = value * units.length, active = Math.min(units.length - 1, Math.floor(cursor));
      const slide = active > 0 ? out(core.clamp((cursor - active) / p.transitionFraction)) : 0;
      const offset = Math.max(0, active - 1 + slide);
      strip.style.transform = 'translateY(' + -offset * 1.5 + 'em)';
      nodes.forEach((node, index) => { node.style.visibility = index <= active ? 'visible' : 'hidden'; });
    });
  });
  add('caption-rsvp', '单词中心提示 / RSVP word presentation', { timing:['grapheme-weighted'], focusMark:['center'] }, view => {
    const result = wordTokens(view);
    const words = result.spoken.map(index => result.units[index]), cues = weightedCues(words);
    result.box.style.display = 'grid'; result.box.style.placeItems = 'center'; result.box.style.minHeight = '2em';
    result.nodes.forEach(node => { node.style.gridArea = '1 / 1'; });
    const focus = hidden(view.node('div', null, { width:'2px', height:'14px', background:'#ffd166', marginTop:'12px' }));
    note(view, '短时单词呈现：生产阅读器须由用户控制速度/暂停，不能替代完整文本。');
    return core.lifecycle(view, (value, reduced) => {
      focus.style.display = reduced ? 'none' : 'block';
      result.box.style.display = reduced ? 'flex' : 'grid';
      const active = cueAt(cues, value);
      result.nodes.forEach((node, index) => { node.style.display = reduced || result.spoken[active] === index ? 'inline-block' : 'none'; });
    });
  });
  add('caption-word-highlight', '当前语词着色 / Active word highlight', { color:['amber'], timing:['grapheme-weighted'] }, view => {
    const result = wordTokens(view), cues = weightedCues(result.spoken.map(index => result.units[index]));
    return core.lifecycle(view, (value, reduced) => {
      const active = cueAt(cues, value);
      result.nodes.forEach((node, index) => { const chosen = !reduced && result.spoken[active] === index; node.style.color = chosen ? '#ffd166' : '#e9f2ff'; node.style.textDecoration = chosen ? 'underline' : 'none'; });
    });
  });

  // Numbers are explicit authored values; editable prose is an independent caption.
  add('data-permutation', '等宽数据位置洗牌 / Monospace permutation', { swaps:integer(6, 20), settleEnd:range(0.55, 0.9), spreadPx:range(6, 24) }, (view, p) => {
    const result = core.tokens(view, 'char'); result.box.style.fontFamily = 'ui-monospace, monospace';
    return core.lifecycle(view, (value, reduced) => {
      const q = time(value, 0, p.settleEnd), step = Math.floor(q * p.swaps), count = result.nodes.length;
      const order = result.nodes.map((_, index) => index);
      if (!reduced && q < 1) for (let index = count - 1; index > 0; index--) {
        const other = Math.floor(core.random(view.seed + step * 37, index) * (index + 1));
        const saved = order[index]; order[index] = order[other]; order[other] = saved;
      }
      result.nodes.forEach((node, index) => {
        node.style.order = String(order[index]);
        node.style.transform = reduced || q === 1 ? 'none' : 'translateY(' + (core.random(view.seed + step, index) - 0.5) * p.spreadPx * (1 - q) + 'px)';
      });
    });
  });
  add('numeric-count', '数值插值递增 / Numeric count', { from:range(0, 999999), to:range(0, 999999), decimals:integer(0, 2), revealEnd:range(0.5, 0.9), easing:['exponential-out'] }, (view, p) => {
    const number = text(view, p.from.toFixed(p.decimals), { fontSize:'64px', fontVariantNumeric:'tabular-nums' }); label(view);
    return core.lifecycle(view, (value, reduced) => {
      const q = time(value, 0, p.revealEnd), eased = q === 1 ? 1 : 1 - 2 ** (-10 * q);
      const displayed = mix(p.from, p.to, reduced ? 1 : eased).toFixed(p.decimals);
      number.textContent = displayed; numericLabel(view, displayed);
    });
  });
  add('numeric-countdown', '整秒倒计时缩放 / Countdown zoom', { start:integer(2, 9), zoom:range(1.1, 1.5), pulseFraction:range(0.2, 0.6) }, (view, p) => {
    const number = text(view, p.start, { fontSize:'72px', fontVariantNumeric:'tabular-nums' }); label(view);
    return core.lifecycle(view, (value, reduced) => {
      const cursor = value * p.start, step = Math.min(p.start, Math.floor(cursor)), digit = p.start - step;
      number.textContent = reduced ? '0' : String(digit);
      const pulse = core.clamp((cursor - step) / p.pulseFraction);
      number.style.transform = reduced || value === 1 ? 'none' : 'scale(' + mix(p.zoom, 1, back(pulse)) + ')';
      numericLabel(view, reduced ? 0 : digit);
    });
  });
  add('numeric-scramble', '随机数字逐桁锁定 / Seeded digit settle', { value:integer(0, 999999), steps:integer(8, 24), settleEnd:range(0.5, 0.9), digitSpread:range(0.1, 0.6) }, (view, p) => {
    const digits = String(p.value).split(''), box = hidden(view.node('div', null, { display:'flex', fontSize:'62px', fontFamily:'ui-monospace, monospace' }));
    const nodes = digits.map(digit => text(view, digit, null, box)); label(view);
    return core.lifecycle(view, (value, reduced) => {
      const q = time(value, 0, p.settleEnd), step = Math.floor(q * p.steps);
      nodes.forEach((node, index) => { const local = core.phase(q, index, nodes.length, p.digitSpread); node.textContent = reduced || local === 1 ? digits[index] : String(Math.floor(core.random(view.seed + step * 31, index) * 10)); });
      numericLabel(view, reduced || q === 1 ? p.value : '数字锁定中 / settling');
    });
  });
  add('numeric-odometer', '逐桁机械滚轮 / Carry-aware odometer', { from:integer(0, 999999), to:integer(0, 999999), revealEnd:range(0.55, 0.9), carryWindow:range(0.08, 0.3) }, (view, p) => {
    const width = Math.max(String(p.from).length, String(p.to).length), box = hidden(view.node('div', null, { display:'flex', fontSize:'60px', fontFamily:'ui-monospace, monospace', lineHeight:'1em' }));
    const strips = Array.from({ length:width }, () => {
      const slot = hidden(view.node('div', null, { height:'1em', width:'0.72em', overflow:'hidden', position:'relative' }, box));
      const strip = hidden(view.node('div', null, { position:'relative' }, slot));
      for (let digit = 0; digit < 20; digit++) text(view, String(digit % 10), { height:'1em', lineHeight:'1em', width:'100%' }, strip);
      return strip;
    });
    label(view);
    return core.lifecycle(view, (value, reduced) => {
      const q = reduced ? 1 : out(time(value, 0, p.revealEnd)), number = mix(p.from, p.to, q);
      strips.forEach((strip, index) => {
        const power = 10 ** (width - index - 1), position = number / power, whole = Math.floor(position), fraction = position - whole;
        const carry = power === 1 ? fraction : core.clamp((fraction - (1 - p.carryWindow)) / p.carryWindow);
        const digit = q === 1 ? Math.floor(p.to / power) % 10 : whole % 10 + carry;
        strip.style.transform = 'translateY(' + -digit + 'em)';
      });
      numericLabel(view, Math.round(number));
    });
  });
  add('numeric-ring', '百分比与圆环同值 / Numeric progress ring', { from:range(0, 100), to:range(0, 100), revealEnd:range(0.5, 0.9), decimals:[0] }, (view, p) => {
    const box = hidden(view.node('div', null, { position:'relative', width:'154px', height:'154px', display:'grid', placeItems:'center' }));
    const svg = hidden(view.svg('svg', { viewBox:'0 0 120 120', width:154, height:154, style:'position:absolute;inset:0' }, box));
    view.svg('circle', { cx:60, cy:60, r:50, fill:'none', stroke:'#293c59', 'stroke-width':7 }, svg);
    const circumference = 2 * Math.PI * 50;
    const ring = view.svg('circle', { cx:60, cy:60, r:50, fill:'none', stroke:'#66d3c5', 'stroke-width':7, 'stroke-dasharray':circumference, transform:'rotate(-90 60 60)' }, svg);
    const number = text(view, '0%', { fontSize:'30px' }, box); label(view);
    return core.lifecycle(view, (value, reduced) => {
      const current = mix(p.from, p.to, reduced ? 1 : out(time(value, 0, p.revealEnd)));
      number.textContent = Math.round(current) + '%'; ring.setAttribute('stroke-dashoffset', circumference * (1 - current / 100)); numericLabel(view, number.textContent);
    });
  });
  add('numeric-score', '变更桁分层切换 / Changed-digit score update', { from:integer(0, 999999), to:integer(0, 999999), updateAt:range(0.1, 0.4), transition:range(0.12, 0.3), deltaTravelPx:range(12, 35) }, (view, p) => {
    const width = Math.max(String(p.from).length, String(p.to).length), before = String(p.from).padStart(width, '0'), after = String(p.to).padStart(width, '0');
    const box = hidden(view.node('div', null, { display:'flex', fontSize:'60px', fontFamily:'ui-monospace, monospace' }));
    const pairs = Array.from({ length:width }, (_, index) => {
      const slot = hidden(view.node('div', null, { display:'grid', overflow:'hidden', width:'0.72em' }, box));
      return { old:text(view, before[index], { gridArea:'1 / 1' }, slot), next:text(view, after[index], { gridArea:'1 / 1' }, slot), changed:before[index] !== after[index] };
    });
    const delta = text(view, (p.to >= p.from ? '+' : '') + (p.to - p.from), { fontSize:'22px', color:'#66d3c5' }); label(view);
    return core.lifecycle(view, (value, reduced) => {
      const q = reduced ? 1 : smooth(time(value, p.updateAt, p.updateAt + p.transition));
      pairs.forEach(pair => {
        pair.old.style.opacity = String(reduced ? 0 : pair.changed ? 1 - q : 1);
        pair.next.style.opacity = String(reduced || pair.changed ? q : 0);
        pair.old.style.transform = reduced || !pair.changed ? 'none' : 'translateY(' + -q * 100 + '%)';
        pair.next.style.transform = reduced || !pair.changed ? 'none' : 'translateY(' + (1 - q) * 100 + '%)';
      });
      delta.style.opacity = String(reduced ? 1 : Math.sin(Math.PI * q));
      delta.style.transform = reduced ? 'none' : 'translateY(' + -q * p.deltaTravelPx + 'px)';
      numericLabel(view, q < 0.5 ? p.from : p.to);
    });
  });
  add('numeric-seven-segment', '真实七段数码管 / Seven-segment polygons', { from:integer(0, 999999), to:integer(0, 999999), steps:integer(4, 20), color:['mint'] }, (view, p) => {
    const width = Math.max(String(p.from).length, String(p.to).length), box = hidden(view.node('div', null, { display:'flex', justifyContent:'center' }));
    const shapes = ['12,6 44,6 48,10 44,14 12,14 8,10','46,14 50,18 50,45 46,49 42,45 42,18','46,53 50,57 50,84 46,88 42,84 42,57','12,88 44,88 48,92 44,96 12,96 8,92','6,53 10,57 10,84 6,88 2,84 2,57','6,14 10,18 10,45 6,49 2,45 2,18','12,47 44,47 48,51 44,55 12,55 8,51'];
    const masks = [63,6,91,79,102,109,125,7,127,111];
    const digits = Array.from({ length:width }, () => {
      const svg = hidden(view.svg('svg', { viewBox:'0 0 54 102', width:45, height:86 }, box));
      return shapes.map(points => view.svg('polygon', { points, fill:'#1a393e' }, svg));
    });
    label(view);
    return core.lifecycle(view, (value, reduced) => {
      const current = Math.round(mix(p.from, p.to, reduced ? 1 : Math.floor(value * p.steps) / p.steps)), chars = String(current).padStart(width, '0');
      digits.forEach((segments, index) => segments.forEach((segment, bit) => { segment.setAttribute('fill', masks[Number(chars[index])] & (1 << bit) ? '#72edc9' : '#1a393e'); }));
      numericLabel(view, current);
    });
  });
  add('numeric-price', '价格方向与单次强调 / Price direction tick', { from:range(0, 99999), to:range(0, 99999), decimals:[2], updateAt:range(0.15, 0.45), emphasisDuration:range(0.12, 0.35) }, (view, p) => {
    const number = text(view, p.from.toFixed(2), { fontSize:'54px', fontVariantNumeric:'tabular-nums', padding:'8px 20px', borderRadius:'6px' });
    const direction = text(view, '', { fontSize:'20px' }); label(view);
    const up = p.to >= p.from;
    return core.lifecycle(view, (value, reduced) => {
      const updated = reduced || value >= p.updateAt, local = time(value, p.updateAt, p.updateAt + p.emphasisDuration);
      number.textContent = (updated ? p.to : p.from).toFixed(2);
      number.style.color = updated ? up ? '#79e3c2' : '#ffacb8' : '#e9f2ff';
      number.style.backgroundColor = !reduced && updated ? 'rgba(' + (up ? '56,160,129,' : '183,71,101,') + Math.sin(Math.PI * local) * 0.32 + ')' : 'transparent';
      direction.textContent = updated ? (up ? '▲ +' : '▼ ') + (p.to - p.from).toFixed(2) : '—';
      numericLabel(view, number.textContent + ' ' + direction.textContent);
    });
  });

  // Broadcast compositing: masks, plates, pixel matrices and lanes have separate state channels.
  add('broadcast-breaking', '速報双带分段揭示 / Breaking bands', { revealEnd:range(0.25, 0.6), textDelay:range(0.08, 0.25), accent:['red'] }, (view, p) => {
    const box = hidden(view.node('div', null, { width:'100%', position:'relative', display:'grid', padding:'16px', boxSizing:'border-box' }));
    const plate = hidden(view.node('div', null, { position:'absolute', inset:'0', background:'#a92b3c', borderTop:'5px solid #f1c254', borderBottom:'5px solid #f1c254' }, box));
    const main = text(view, view.text, { fontWeight:'850', zIndex:'1' }, box);
    return core.lifecycle(view, (value, reduced) => {
      const q = reduced ? 1 : out(time(value, 0, p.revealEnd)), t = reduced ? 1 : out(time(value, p.textDelay, p.revealEnd + p.textDelay));
      plate.style.clipPath = 'inset(0 ' + (1 - q) * 100 + '% 0 0)'; main.style.clipPath = 'inset(0 ' + (1 - t) * 100 + '% 0 0)';
    });
  });
  add('broadcast-credits', '平面线性职员表 / Linear credits roll', { windowPx:range(150, 260), travel:['bottom-to-top'], speed:['linear'] }, (view, p) => {
    const window = hidden(view.node('div', null, { width:'100%', height:p.windowPx + 'px', overflow:'hidden', position:'relative' }));
    const main = text(view, view.text, { lineHeight:'1.9', padding:'12px', fontSize:'25px' }, window);
    return core.lifecycle(view, (value, reduced) => {
      window.style.height = reduced ? 'auto' : p.windowPx + 'px';
      main.style.transform = reduced ? 'none' : 'translateY(' + mix(p.windowPx, -main.offsetHeight, value) + 'px)';
    });
  });
  add('broadcast-led', '系统字形点阵采样 / Raster-sampled LED', { pitch:integer(3, 6), steps:integer(24, 96), direction:['left'], ink:['amber'] }, (view, p) => {
    const document = view.root.ownerDocument, source = document.createElement('canvas'), sourceContext = source.getContext('2d');
    if (!sourceContext) throw new Error('LED study requires a Canvas 2D context');
    sourceContext.font = '40px monospace';
    const sourceText = view.text.replace(/\r?\n/gu, '   '), measured = sourceContext.measureText(sourceText).width;
    source.width = Math.max(48, Math.min(4096, Math.ceil(measured + 24))); source.height = 60;
    sourceContext.font = '40px monospace'; sourceContext.fillStyle = '#fff'; sourceContext.textBaseline = 'middle';
    sourceContext.fillText(sourceText, 12, 30, source.width - 24);
    const pixels = sourceContext.getImageData(0, 0, source.width, source.height).data, dots = [];
    for (let y = p.pitch; y < source.height; y += p.pitch) for (let x = p.pitch; x < source.width; x += p.pitch) if (pixels[(y * source.width + x) * 4 + 3] > 70) dots.push([x, y]);
    const canvas = hidden(view.node('canvas', null, { width:'100%', maxWidth:'720px', height:'84px', background:'#070b0f', border:'4px solid #273244' }));
    canvas.width = 720; canvas.height = 84;
    const context = canvas.getContext('2d'); if (!context) throw new Error('LED study requires a Canvas 2D context');
    const complete = text(view, view.text, { fontSize:'24px', color:'#ffcf78' });
    note(view, '由本机系统字形采样为点阵；非上游字库。长文本需生产排版/分段。');
    return core.lifecycle(view, (value, reduced) => {
      canvas.style.display = reduced ? 'none' : 'block'; complete.style.display = reduced ? 'block' : 'none';
      if (reduced) return;
      context.clearRect(0, 0, 720, 84); context.fillStyle = '#5b411e';
      for (let y = 12; y < 74; y += p.pitch) for (let x = 2; x < 720; x += p.pitch) { context.beginPath(); context.arc(x, y, p.pitch * 0.24, 0, Math.PI * 2); context.fill(); }
      const cursor = Math.floor(value * p.steps) / p.steps, shift = mix(720, -source.width, cursor);
      context.fillStyle = '#ffd17b';
      for (const dot of dots) { const x = dot[0] + shift; if (x < 0 || x > 720) continue; context.beginPath(); context.arc(x, dot[1] + 12, p.pitch * 0.36, 0, Math.PI * 2); context.fill(); }
    });
  });
  add('broadcast-lower-third', '标识条与姓名板接力 / Lower-third plate sequence', { barEnd:range(0.12, 0.25), plateEnd:range(0.4, 0.65), textDelay:range(0.2, 0.35), accent:['blue'] }, (view, p) => {
    view.root.style.justifyContent = 'flex-end';
    const box = hidden(view.node('div', null, { position:'relative', width:'100%', padding:'10px 20px', boxSizing:'border-box' }));
    const plate = hidden(view.node('div', null, { position:'absolute', inset:'0', background:'#25476c', transformOrigin:'left center' }, box));
    const bar = hidden(view.node('div', null, { position:'absolute', left:'0', top:'0', bottom:'0', width:'6px', background:'#75c9ff', transformOrigin:'bottom center' }, box));
    const main = text(view, view.text, { textAlign:'left', zIndex:'1', fontSize:'27px' }, box);
    return core.lifecycle(view, (value, reduced) => {
      bar.style.transform = 'scaleY(' + (reduced ? 1 : out(time(value, 0, p.barEnd))) + ')';
      plate.style.transform = 'scaleX(' + (reduced ? 1 : out(time(value, p.barEnd, p.plateEnd))) + ')';
      main.style.clipPath = 'inset(0 ' + (1 - (reduced ? 1 : out(time(value, p.textDelay, p.plateEnd + 0.18)))) * 100 + '% 0 0)';
    });
  });
  add('broadcast-ticker', '单轨横向信息爬行 / News ticker lane', { direction:['left'], label:['NEWS'], speed:['linear'] }, (view, p) => {
    const box = hidden(view.node('div', null, { width:'100%', position:'relative', overflow:'hidden', background:'#182b42', padding:'10px 0' }));
    const strip = text(view, view.text, { whiteSpace:'pre', width:'max-content', maxWidth:'none', fontSize:'25px' }, box);
    const tag = text(view, p.label, { fontSize:'13px', letterSpacing:'0.15em', alignSelf:'flex-start', color:'#ffd166' });
    return core.lifecycle(view, (value, reduced) => {
      strip.style.whiteSpace = reduced ? 'pre-wrap' : 'pre'; strip.style.width = reduced ? 'auto' : 'max-content';
      strip.style.transform = reduced ? 'none' : 'translateX(' + mix(box.clientWidth, -strip.scrollWidth, value) + 'px)';
      tag.style.opacity = '1';
    });
  });
  add('broadcast-speaker-follow', '话者分色落点跟随 / Authored speaker follow', { speakers:textList, palette:['blue-amber'], transitionFraction:range(0.1, 0.45) }, (view, p) => {
    const result = phraseNodes(view), speakers = p.speakers.map((speaker, index) => text(view, speaker, { fontSize:'14px', color:index % 2 ? '#ffd166' : '#8ecaff', alignSelf:index % 2 ? 'flex-end' : 'flex-start' }));
    result.nodes.forEach(node => { node.style.fontSize = '28px'; node.style.padding = '10px 14px'; node.style.borderRadius = '12px'; });
    note(view, '话者名单及轮次为作者示范；生产应由字幕/说话人数据决定。');
    return core.lifecycle(view, (value, reduced) => {
      if (reduced) { staticPhrases(result); result.nodes.forEach((node, index) => { node.style.background = index % p.speakers.length % 2 ? '#654b24' : '#24516e'; }); speakers.forEach(node => { node.style.opacity = '1'; }); return; }
      const active = cueAt(result.cues, value), cue = result.cues[active], local = time(value, cue.start, cue.end), speaker = active % p.speakers.length;
      result.nodes.forEach((node, index) => {
        node.style.opacity = index === active ? '1' : '0'; node.style.background = speaker % 2 ? '#654b24' : '#24516e';
        node.style.transform = 'translateX(' + (speaker % 2 ? 1 : -1) * (1 - back(core.clamp(local / p.transitionFraction))) * 28 + 'px)';
      });
      speakers.forEach((node, index) => { node.style.opacity = index === speaker ? '1' : '0.4'; });
    });
  });
  add('broadcast-sparkle', '单次星芒文本出现 / One-shot sparkle telop', { sparks:integer(4, 12), radius:range(35, 90), revealEnd:range(0.3, 0.65) }, (view, p) => {
    const box = hidden(view.node('div', null, { position:'relative', display:'grid', placeItems:'center', width:'100%' }));
    const main = text(view, view.text, { gridArea:'1 / 1', fontWeight:'750' }, box);
    const svg = hidden(view.svg('svg', { viewBox:'0 0 300 140', style:'position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none' }, box));
    const stars = Array.from({ length:p.sparks }, () => view.svg('path', { d:'M0 -5 L1.5 -1.5 L5 0 L1.5 1.5 L0 5 L-1.5 1.5 L-5 0 L-1.5 -1.5 Z', fill:'#ffdf93' }, svg));
    return core.lifecycle(view, (value, reduced) => {
      const q = reduced ? 1 : time(value, 0, p.revealEnd); main.style.opacity = String(reduced ? 1 : core.clamp(q * 5)); main.style.transform = reduced ? 'none' : 'scale(' + mix(0.85, 1, back(q)) + ')';
      stars.forEach((star, index) => { const angle = index / p.sparks * Math.PI * 2; star.setAttribute('transform', 'translate(' + (150 + Math.cos(angle) * p.radius * out(q)) + ' ' + (70 + Math.sin(angle) * p.radius * 0.55 * out(q)) + ') scale(' + (reduced ? 0 : Math.sin(Math.PI * q) * 1.4) + ')'); });
    });
  });
  add('broadcast-double-outline', '双层字形描边弹出 / Double-outline glyph pop', { outerPx:range(3, 8), innerPx:range(1, 2.5), revealEnd:range(0.25, 0.6) }, (view, p) => {
    const box = hidden(view.node('div', null, { display:'grid', placeItems:'center', maxWidth:'100%', fontWeight:'850' }));
    text(view, view.text, { gridArea:'1 / 1', WebkitTextStroke:p.outerPx + 'px #03070d', paintOrder:'stroke fill', color:'#fff' }, box);
    text(view, view.text, { gridArea:'1 / 1', WebkitTextStroke:p.innerPx + 'px #f5fbff', paintOrder:'stroke fill', color:'#ffcf78' }, box);
    return core.lifecycle(view, (value, reduced) => { const q = reduced ? 1 : time(value, 0, p.revealEnd); box.style.opacity = String(reduced ? 1 : core.clamp(q * 8)); box.style.transform = reduced ? 'none' : 'scale(' + mix(0.6, 1, back(q)) + ')'; });
  });
  add('broadcast-shake', '确定性衰减抖动字幕 / Seeded damped telop shake', { steps:integer(10, 30), amplitudePx:range(2, 9), settleEnd:range(0.3, 0.7) }, (view, p) => {
    const main = text(view, view.text, { fontWeight:'800', textShadow:'2px 2px 0 #090b16' });
    return core.lifecycle(view, (value, reduced) => {
      const q = time(value, 0, p.settleEnd), step = Math.floor(q * p.steps), amplitude = reduced ? 0 : p.amplitudePx * (1 - q);
      main.style.transform = 'translate(' + (core.random(view.seed + step, 0) - 0.5) * amplitude * 2 + 'px,' + (core.random(view.seed + step, 1) - 0.5) * amplitude * 2 + 'px) rotate(' + (core.random(view.seed + step, 2) - 0.5) * amplitude * 0.5 + 'deg)';
    });
  });
  add('broadcast-side-super', '侧栏纵向信息板 / Vertical side super', { side:['right'], writingMode:['vertical-rl'], revealEnd:range(0.3, 0.7) }, (view, p) => {
    const main = text(view, view.text, { writingMode:p.writingMode, textOrientation:'mixed', maxHeight:'260px', alignSelf:'flex-end', background:'#e6eaf3', color:'#172539', padding:'10px', fontSize:'23px', borderLeft:'5px solid #ce687c', textAlign:'start' });
    return core.lifecycle(view, (value, reduced) => { main.style.clipPath = 'inset(0 0 0 ' + (1 - (reduced ? 1 : smooth(time(value, 0, p.revealEnd)))) * 100 + '%)'; });
  });
  add('broadcast-slam-comment', '斜向吐槽撞击 / Diagonal comment slam', { angleDeg:range(-14, -4), impactAt:range(0.15, 0.4), impactDuration:range(0.08, 0.2) }, (view, p) => {
    const main = text(view, view.text, { fontWeight:'850', color:'#ffe1b0', textShadow:'3px 3px 0 #972e45', borderBottom:'5px solid #ef7385', padding:'8px 12px' });
    return core.lifecycle(view, (value, reduced) => {
      const q = reduced ? 1 : time(value, p.impactAt, p.impactAt + p.impactDuration), hit = q * q;
      main.style.opacity = String(reduced || q > 0 ? 1 : 0);
      main.style.transform = reduced ? 'none' : 'translateX(' + (1 - hit) * 80 + 'px) rotate(' + p.angleDeg * (1 - q * 0.5) + 'deg) scale(' + mix(2.2, 1, hit) + ')';
    });
  });
  add('broadcast-plate-wipe', '底板先行文字后揭 / Zabuton plate wipe', { plateEnd:range(0.3, 0.55), textStart:range(0.15, 0.3), textEnd:range(0.6, 0.85), plate:['amber'] }, (view, p) => {
    const box = hidden(view.node('div', null, { position:'relative', padding:'10px 20px', maxWidth:'100%' }));
    const plate = hidden(view.node('div', null, { position:'absolute', inset:'0', background:'#d4a449', borderRadius:'3px' }, box));
    const main = text(view, view.text, { color:'#172133', fontWeight:'750', zIndex:'1' }, box);
    return core.lifecycle(view, (value, reduced) => { plate.style.clipPath = 'inset(0 ' + (1 - (reduced ? 1 : out(time(value, 0, p.plateEnd)))) * 100 + '% 0 0)'; main.style.clipPath = 'inset(' + (1 - (reduced ? 1 : out(time(value, p.textStart, p.textEnd)))) * 100 + '% 0 0 0)'; });
  });

  // Language-sensitive demonstrations are authored, labelled and separate from editable text.
  add('japanese-brush', '原创单笔墨迹揭示 / Authored brush ink', { demoLanguage:['ja-authored'], editableTextMode:['unaltered-cjk-latin'], illustration:['one-horizontal-stroke'], revealEnd:range(0.5, 0.85) }, (view, p) => {
    const board = japaneseDemo(view, '「一」的原创几何笔触；不是字库/任意文字笔画提取。');
    const svg = hidden(view.svg('svg', { viewBox:'0 0 240 90', width:240, height:90 }, board));
    const ink = view.svg('path', { d:'M20 45 Q75 36 130 40 Q180 39 215 34 L224 43 Q180 53 129 50 Q70 53 24 54 Z', fill:'#f5eee0' }, svg);
    const dry = view.svg('path', { d:'M34 49 Q120 43 205 41 M50 52 Q130 46 188 45', fill:'none', stroke:'#263347', 'stroke-width':1.5 }, svg);
    const nib = view.svg('ellipse', { cx:20, cy:47, rx:6, ry:10, fill:'#f5eee0' }, svg);
    return core.lifecycle(view, (value, reduced) => {
      const q = reduced ? 1 : smooth(time(value, 0, p.revealEnd));
      ink.style.clipPath = dry.style.clipPath = 'inset(0 ' + (1 - q) * 100 + '% 0 0)';
      nib.setAttribute('cx', mix(20, 222, q)); nib.setAttribute('cy', mix(47, 40, q)); nib.style.opacity = reduced || q === 1 ? '0' : '1';
    });
  });
  add('japanese-bunsetsu', '作者文节边界揭示 / Authored bunsetsu', { demoLanguage:['ja-authored'], editableTextMode:['unaltered-cjk-latin'], phrases:textList, spread:range(0.3, 0.7) }, (view, p) => {
    const board = japaneseDemo(view, '显式文节边界：' + p.phrases.join('｜') + '；不使用中文分词替代。');
    const nodes = p.phrases.map(phrase => text(view, phrase, { display:'inline-block', borderBottom:'2px solid #69bdc8', padding:'0 3px', fontSize:'29px' }, board));
    return core.lifecycle(view, (value, reduced) => nodes.forEach((node, index) => { const q = reduced ? 1 : out(core.phase(value, index, nodes.length, p.spread)); node.style.clipPath = 'inset(0 ' + (1 - q) * 100 + '% 0 0)'; }));
  });
  add('japanese-handwritten-cue', '系统手写偏好字幕切入 / Handwritten-preference cue', { layoutLanguage:['ja'], editableTextMode:['unaltered-cjk-latin'], fontPolicy:['system-handwritten-preference'], cueAt:range(0.1, 0.4) }, (view, p) => {
    const main = text(view, view.text, { fontFamily:'"Yu Kyokasho", KaiTi, cursive', fontSize:'29px', textShadow:'1px 2px 0 #000', alignSelf:'flex-end', textAlign:'end', maxWidth:'85%' });
    note(view, '字形依赖本机字体；未带字体资源，不声称与源站手写字形一致。');
    return core.lifecycle(view, (value, reduced) => { main.style.opacity = reduced || value >= p.cueAt ? '1' : '0'; });
  });
  add('japanese-danmaku', '多轨评论分时穿行 / Danmaku lanes', { lanes:integer(2, 5), entrySpread:range(0.25, 0.55), speed:['linear'], adaptation:['cjk-latin-comments'] }, (view, p) => {
    const units = lines(view, 18), window = hidden(view.node('div', null, { position:'relative', width:'100%', minHeight:p.lanes * 42 + 'px', overflow:'hidden' }));
    const comments = units.map((unit, index) => text(view, unit, { position:'absolute', top:index % p.lanes * 42 + 'px', whiteSpace:'pre', width:'max-content', maxWidth:'none', fontSize:'24px', color:index % 2 ? '#ffd166' : '#d5eeff', textShadow:'2px 2px 0 #000' }, window));
    return core.lifecycle(view, (value, reduced) => comments.forEach((comment, index) => {
      const q = reduced ? 1 : core.phase(value, index, comments.length, p.entrySpread);
      comment.style.position = reduced ? 'relative' : 'absolute'; comment.style.top = reduced ? '0' : index % p.lanes * 42 + 'px'; comment.style.whiteSpace = reduced ? 'pre-wrap' : 'pre'; comment.style.width = reduced ? 'auto' : 'max-content';
      comment.style.transform = reduced ? 'none' : 'translateX(' + mix(window.clientWidth, -comment.scrollWidth, q) + 'px)';
    }));
  });
  add('japanese-mincho-card', '明朝偏好硬切卡 / Mincho-preference hard card', { layoutLanguage:['ja'], editableTextMode:['unaltered-cjk-latin'], fontPolicy:['system-mincho-preference'], cutAt:range(0.1, 0.35) }, (view, p) => {
    view.root.style.background = '#060608';
    const main = text(view, view.text, { fontFamily:'"Yu Mincho", "MS Mincho", "Noto Serif CJK JP", serif', fontWeight:'900', letterSpacing:'-0.045em', lineHeight:'1.12', borderBottom:'2px solid #cddbdf', padding:'8px' });
    note(view, '粗明朝由本机字体提供；无上游字体、标识或标题卡资产。');
    return core.lifecycle(view, (value, reduced) => { main.style.visibility = reduced || value >= p.cutAt ? 'visible' : 'hidden'; });
  });
  add('japanese-ime', '作者假名到汉字状态 / Authored IME phases', { demoLanguage:['ja-authored'], editableTextMode:['unaltered-cjk-latin'], kana:shortText, candidates:textList, selected:integer(0, 23), commitAt:range(0.7, 0.9) }, (view, p) => {
    if (p.selected >= p.candidates.length) throw new RangeError('selected must name an authored IME candidate');
    const board = japaneseDemo(view, '假名输入 → 作者候选 → 提交；不是系统输入法或任意文本转换。');
    board.style.flexDirection = 'column';
    const kanaUnits = core.segments(p.kana, 'char', 'ja'), field = text(view, '', { fontSize:'32px', minHeight:'1.5em', borderBottom:'2px solid #9fbed5', minWidth:'160px' }, board);
    const candidateBox = hidden(view.node('div', null, { border:'1px solid #8a9db5', borderRadius:'5px', padding:'4px 10px', fontSize:'19px', background:'#1b2a3f' }, board));
    const candidates = p.candidates.map((candidate, index) => text(view, (index + 1) + '. ' + candidate, { textAlign:'left', padding:'3px 8px' }, candidateBox));
    const state = text(view, '', { fontSize:'12px', color:'#aac3d8' }, board);
    return core.lifecycle(view, (value, reduced) => {
      const committed = reduced || value >= p.commitAt, choosing = value >= 0.45 && !committed;
      const count = Math.floor(time(value, 0, 0.4) * kanaUnits.length);
      field.textContent = committed ? p.candidates[p.selected] : choosing ? p.candidates[p.selected] : kanaUnits.slice(0, count).join('');
      field.style.textDecoration = committed ? 'none' : 'underline'; candidateBox.style.display = choosing ? 'block' : 'none';
      candidates.forEach((candidate, index) => { candidate.style.background = index === p.selected ? '#355876' : 'transparent'; });
      state.textContent = committed ? '確定 / 已提交' : choosing ? '変換候補 / 作者候选' : 'かな入力 / 假名输入';
    });
  }, p => { if (p.selected >= p.candidates.length) throw new RangeError("selected must name an authored IME candidate"); });
  add('japanese-reading-time', '按日语字速分配字幕窗 / Japanese cps cue budget', { layoutLanguage:['ja'], editableTextMode:['unaltered-cjk-latin'], charactersPerSecond:range(3, 6), minimumSeconds:range(1, 3), gapSeconds:range(0.15, 0.8) }, (view, p) => {
    const result = phraseNodes(view), durations = result.units.map(unit => Math.max(p.minimumSeconds, core.segments(unit, 'char', 'ja').filter(char => /\S/u.test(char)).length / p.charactersPerSecond));
    const total = durations.reduce((sum, duration) => sum + duration + p.gapSeconds, 0); let cursor = 0;
    const cues = durations.map(duration => { const start = cursor / total; cursor += duration; const end = cursor / total; cursor += p.gapSeconds; return { start, end }; });
    note(view, '作者阅读预算 ' + p.charactersPerSecond + ' 字/秒；总窗 ' + total.toFixed(2) + ' 秒。不是中文通用可读性规范，研究时间轴按比例压缩。');
    return core.lifecycle(view, (value, reduced) => {
      if (reduced) { staticPhrases(result); return; }
      result.nodes.forEach((node, index) => { const cue = cues[index]; node.style.visibility = value >= cue.start && value <= cue.end || value === 1 && index === result.nodes.length - 1 ? 'visible' : 'hidden'; });
    });
  });
  add('japanese-stroke-order', '原创木字四笔顺序 / Authored 木 stroke paths', { demoLanguage:['ja-authored'], editableTextMode:['unaltered-cjk-latin'], glyph:['木'], pathPolicy:['original-geometric-illustration'], spread:range(0.5, 0.8) }, (view, p) => {
    const board = japaneseDemo(view, '「木」四笔：横、竖、撇、捺。原创几何示意，非任意汉字分解/书法字库。');
    const svg = hidden(view.svg('svg', { viewBox:'0 0 110 110', width:145, height:145 }, board));
    const paths = ['M18 40 L92 40','M54 12 L54 98','M52 43 Q38 68 15 87','M56 43 Q69 68 96 87'];
    const nodes = paths.map((d, index) => {
      const path = view.svg('path', { d, fill:'none', stroke:['#a9d8f4','#c7e4ab','#f0cf89','#eeb8cf'][index], 'stroke-width':6, 'stroke-linecap':'round', pathLength:1, 'stroke-dasharray':1 }, svg);
      const start = [[18,32],[62,16],[34,65],[84,65]][index]; view.svg('text', { x:start[0], y:start[1], fill:'#e9f2ff', 'font-size':10 }, svg).textContent = String(index + 1);
      return path;
    });
    return core.lifecycle(view, (value, reduced) => nodes.forEach((path, index) => { const q = reduced ? 1 : smooth(core.phase(value, index, nodes.length, p.spread)); path.setAttribute('stroke-dashoffset', 1 - q); }));
  });
  add('japanese-tame-tsume', '等待后压缩疾进 / Tame-tsume lyric timing', { adaptation:['editable-cjk-latin-lyric'], holdFraction:range(0.3, 0.6), spread:range(0.3, 0.6), travelPx:range(12, 32) }, (view, p) => {
    const result = wordTokens(view);
    return core.lifecycle(view, (value, reduced) => result.nodes.forEach((node, index) => {
      const local = core.phase(value, index, result.nodes.length, p.spread), q = reduced ? 1 : time(local, p.holdFraction, 1), whip = q < 0.5 ? 8 * q ** 4 : 1 - 8 * (1 - q) ** 4;
      node.style.opacity = String(reduced || local >= p.holdFraction ? 1 : 0);
      node.style.transform = reduced ? 'none' : 'translateX(' + (1 - whip) * p.travelPx + 'px)';
    }));
  });
  add('japanese-onomatopoeia', '漫画放射拟声冲击 / Manga burst impact', { adaptation:['editable-cjk-latin-impact'], rays:integer(8, 18), impactAt:range(0.15, 0.4), revealEnd:range(0.5, 0.8) }, (view, p) => {
    const box = hidden(view.node('div', null, { position:'relative', width:'100%', display:'grid', placeItems:'center' }));
    const svg = hidden(view.svg('svg', { viewBox:'0 0 300 150', style:'position:absolute;inset:0;width:100%;height:100%' }, box));
    const rays = Array.from({ length:p.rays }, (_, index) => { const angle = index / p.rays * Math.PI * 2; return view.svg('line', { x1:150 + Math.cos(angle) * 70, y1:75 + Math.sin(angle) * 30, x2:150 + Math.cos(angle) * 140, y2:75 + Math.sin(angle) * 70, stroke:'#ddb269', 'stroke-width':3 }, svg); });
    const main = text(view, view.text, { color:'#ffe0a1', fontWeight:'900', textShadow:'3px 3px 0 #7b294c', zIndex:'1' }, box);
    return core.lifecycle(view, (value, reduced) => {
      const q = reduced ? 1 : time(value, p.impactAt, p.revealEnd);
      main.style.opacity = reduced || q > 0 ? '1' : '0'; main.style.transform = reduced ? 'none' : 'rotate(' + -8 * (1 - q) + 'deg) scale(' + mix(1.7, 1, q) + ')';
      rays.forEach(ray => { ray.style.opacity = String(reduced ? 0.22 : Math.sin(Math.PI * q)); });
    });
  });
  add('japanese-ruby', '基字与作者读音同相 / Authored ruby sync', { demoLanguage:['ja-authored'], editableTextMode:['unaltered-cjk-latin'], pairs:rubyList, spread:range(0.2, 0.65) }, (view, p) => {
    const board = japaneseDemo(view, '读音与基字均为作者显式数据；不为编辑正文猜读音。');
    const groups = p.pairs.map(pair => {
      const ruby = hidden(view.node('ruby', pair.base, { display:'inline-block', fontSize:'30px', padding:'3px' }, board));
      const reading = hidden(view.node('rt', pair.reading, { fontSize:'0.45em', color:'#ffd166' }, ruby));
      return { ruby, reading };
    });
    return core.lifecycle(view, (value, reduced) => groups.forEach((group, index) => { const q = reduced ? 1 : out(core.phase(value, index, groups.length, p.spread)); group.ruby.style.opacity = String(q); group.ruby.style.clipPath = 'inset(0 ' + (1 - q) * 100 + '% 0 0)'; group.reading.style.opacity = '1'; }));
  });
  add('japanese-tategaki', '右起纵排逐字揭示 / Vertical-rl grapheme reveal', { layoutLanguage:['ja'], editableTextMode:['unaltered-cjk-latin'], writingMode:['vertical-rl'], latinOrientation:['mixed'], spread:range(0.25, 0.7) }, (view, p) => {
    const units = core.segments(view.text, 'char', 'ja'), box = hidden(view.node('div', null, { writingMode:p.writingMode, textOrientation:p.latinOrientation, maxHeight:'240px', width:'auto', maxWidth:'100%', fontSize:'28px', whiteSpace:'pre-wrap' }));
    const nodes = units.map(unit => hidden(view.node('span', unit, { whiteSpace:'pre-wrap' }, box)));
    note(view, '列自右向左、字自上向下；拉丁字符遵循 mixed 方向。中文可用同排版通道，非日语文节分析。');
    return core.lifecycle(view, (value, reduced) => nodes.forEach((node, index) => { node.style.opacity = String(reduced ? 1 : out(core.phase(value, index, nodes.length, p.spread))); }));
  });
  add('japanese-vertical-cue', '右侧纵排字幕硬切 / Vertical subtitle cue', { layoutLanguage:['ja'], editableTextMode:['unaltered-cjk-latin'], writingMode:['vertical-rl'], latinOrientation:['mixed'], cueAt:range(0.15, 0.45) }, (view, p) => {
    const main = text(view, view.text, { writingMode:p.writingMode, textOrientation:p.latinOrientation, maxHeight:'240px', alignSelf:'flex-end', fontSize:'26px', lineHeight:'1.6', textAlign:'start', textShadow:'2px 2px 0 #000' });
    return core.lifecycle(view, (value, reduced) => { main.style.visibility = reduced || value >= p.cueAt ? 'visible' : 'hidden'; });
  });
  add('japanese-yakumono', '约物后加权停顿 / Yakumono pause weights', { punctuationProfile:['ja-cjk-latin-explicit'], commaWeight:range(2, 5), stopWeight:range(4, 8), revealEnd:range(0.65, 0.95) }, (view, p) => {
    const result = core.tokens(view, 'char', 'ja'), weights = result.units.map(unit => /[。！？.!?]/u.test(unit) ? p.stopWeight : /[、，,；;：:]/u.test(unit) ? p.commaWeight : 1), total = weights.reduce((sum, weight) => sum + weight, 0);
    let cursor = 0; const starts = weights.map(weight => { const start = cursor / total; cursor += weight; return start; });
    note(view, '显式约物表：、，,；;：: 与 。！？.!?；停顿在标点显示后，不自动推断语义。');
    return core.lifecycle(view, (value, reduced) => { const q = reduced ? 1 : time(value, 0, p.revealEnd); result.nodes.forEach((node, index) => { node.style.visibility = reduced || q >= starts[index] ? 'visible' : 'hidden'; }); });
  });

  // Cinematic mechanisms own their compositing geometry, not production scene or edit state.
  add('title-ribbon', '前带与背折回卷 / Folded headline ribbon', { foldDegrees:range(40, 75), revealEnd:range(0.4, 0.75), ribbon:['blue'] }, (view, p) => {
    const box = hidden(view.node('div', null, { position:'relative', padding:'14px 24px', width:'85%', boxSizing:'border-box', transformStyle:'preserve-3d' }));
    const left = hidden(view.node('div', null, { position:'absolute', left:'-14px', top:'12px', bottom:'-12px', width:'35px', background:'#1b365f', clipPath:'polygon(0 0,100% 0,100% 100%,0 76%,15% 48%)', transformOrigin:'right center' }, box));
    const right = hidden(view.node('div', null, { position:'absolute', right:'-14px', top:'12px', bottom:'-12px', width:'35px', background:'#1b365f', clipPath:'polygon(0 0,100% 0,85% 48%,100% 76%,0 100%)', transformOrigin:'left center' }, box));
    const front = hidden(view.node('div', null, { position:'absolute', inset:'0', background:'#356491', boxShadow:'0 5px 0 #142b47', transformOrigin:'left center' }, box));
    const main = text(view, view.text, { zIndex:'1', fontWeight:'750' }, box);
    return core.lifecycle(view, (value, reduced) => {
      const q = reduced ? 1 : out(time(value, 0, p.revealEnd));
      front.style.transform = reduced ? 'none' : 'rotateY(' + (1 - q) * -p.foldDegrees + 'deg)';
      left.style.transform = reduced ? 'none' : 'rotateY(' + (1 - q) * p.foldDegrees + 'deg)'; right.style.transform = reduced ? 'none' : 'rotateY(' + (1 - q) * -p.foldDegrees + 'deg)';
      main.style.clipPath = 'inset(0 ' + (1 - q) * 100 + '% 0 0)';
    });
  });
  add('title-black-bridge', '前卡黑场后卡 / Black bridge card transition', { before:shortText, after:shortText, blackStart:range(0.35, 0.45), blackEnd:range(0.55, 0.65) }, (view, p) => {
    view.root.style.background = '#020304';
    const box = hidden(view.node('div', null, { display:'grid', placeItems:'center', width:'100%' }));
    const before = text(view, p.before + '\n' + view.text, { gridArea:'1 / 1', color:'#d4e3fa' }, box), after = text(view, p.after + '\n' + view.text, { gridArea:'1 / 1', color:'#f0d8a7' }, box);
    return core.lifecycle(view, (value, reduced) => { before.style.opacity = String(reduced ? 0 : 1 - smooth(time(value, 0.1, p.blackStart))); after.style.opacity = String(reduced ? 1 : smooth(time(value, p.blackEnd, 0.9))); });
  });
  add('title-film-jitter', '原创刮痕与胶片步进 / Scratches and film gate jitter', { scratches:integer(4, 12), frames:integer(24, 72), jitterPx:range(1, 4), dust:integer(8, 24) }, (view, p) => {
    const main = text(view, view.text, { fontFamily:'serif', color:'#ddd4c5' });
    const svg = hidden(view.svg('svg', { viewBox:'0 0 300 160', style:'position:absolute;inset:0;width:100%;height:100%;pointer-events:none' }));
    const scratches = Array.from({ length:p.scratches }, () => view.svg('line', { y1:0, y2:160, stroke:'#c5b9a1', 'stroke-width':0.5 }, svg));
    const dust = Array.from({ length:p.dust }, (_, index) => view.svg('circle', { cx:core.random(view.seed, index + 100) * 300, cy:core.random(view.seed, index + 200) * 160, r:0.5 + core.random(view.seed, index + 300), fill:'#c5b9a1' }, svg));
    note(view, '原创几何刮痕/尘点；帧步进仅用于影片质感，不宜反复用于界面。');
    return core.lifecycle(view, (value, reduced) => {
      const frame = Math.floor(value * p.frames);
      main.style.transform = reduced ? 'none' : 'translate(' + (core.random(view.seed + frame, 0) - 0.5) * p.jitterPx * 2 + 'px,' + (core.random(view.seed + frame, 1) - 0.5) * p.jitterPx * 2 + 'px)';
      svg.style.display = reduced ? 'none' : 'block';
      scratches.forEach((line, index) => { const x = core.random(view.seed + frame, index + 2) * 300; line.setAttribute('x1', x); line.setAttribute('x2', x + 1); line.style.opacity = String(0.05 + core.random(view.seed + frame, index + 40) * 0.12); });
      dust.forEach((dot, index) => { dot.style.opacity = String(core.random(view.seed + frame, index + 80) * 0.14); });
    });
  });
  add('title-flash-cut', '单次低亮帧硬切 / Single dim flash-frame cut', { before:shortText, after:shortText, cutAt:range(0.25, 0.45), frameFraction:range(0.02, 0.05), exposure:range(0.08, 0.2) }, (view, p) => {
    const main = text(view, view.text, { fontWeight:'850' }), subtitle = text(view, p.before, { fontSize:'16px', letterSpacing:'0.2em' });
    const flash = hidden(view.node('div', null, { position:'absolute', inset:'0', background:'#a98c5b', pointerEvents:'none', opacity:'0' }));
    note(view, '原作机制启发的单次低亮帧；非源站亮度复刻。禁止频闪，减弱档直接后卡。');
    return core.lifecycle(view, (value, reduced) => {
      const changed = reduced || value >= p.cutAt, inFrame = !reduced && value >= p.cutAt && value < p.cutAt + p.frameFraction;
      subtitle.textContent = changed ? p.after : p.before; main.style.letterSpacing = changed ? '0.02em' : '0.08em'; flash.style.opacity = String(inFrame ? p.exposure : 0);
    });
  });
  add('title-letterbox', '上下遮幅开启 / Letterbox aperture', { finalBarPercent:range(6, 16), revealEnd:range(0.45, 0.8) }, (view, p) => {
    text(view, view.text, { fontFamily:'serif', zIndex:'1', padding:'20px 0' });
    const top = hidden(view.node('div', null, { position:'absolute', left:'0', right:'0', top:'0', background:'#020304', zIndex:'2' }));
    const bottom = hidden(view.node('div', null, { position:'absolute', left:'0', right:'0', bottom:'0', background:'#020304', zIndex:'2' }));
    return core.lifecycle(view, (value, reduced) => { const height = reduced ? p.finalBarPercent : mix(50, p.finalBarPercent, smooth(time(value, 0, p.revealEnd))); top.style.height = bottom.style.height = height + '%'; });
  });
  add('title-light-leak', '暖光漏片与烧入揭示 / Warm light-leak burn', { revealEnd:range(0.45, 0.8), leakWidthPercent:range(35, 65), intensity:range(0.15, 0.4) }, (view, p) => {
    const main = text(view, view.text, { fontFamily:'serif', color:'#f1dfc0' });
    const leak = hidden(view.node('div', null, { position:'absolute', top:'-20%', bottom:'-20%', width:p.leakWidthPercent + '%', background:'radial-gradient(ellipse at center, #ffe1a1 0%, #b8532f 30%, transparent 70%)', mixBlendMode:'screen', pointerEvents:'none' }));
    return core.lifecycle(view, (value, reduced) => { const q = reduced ? 1 : smooth(time(value, 0, p.revealEnd)); main.style.clipPath = 'inset(0 ' + (1 - q) * 100 + '% 0 0)'; leak.style.left = mix(-p.leakWidthPercent, 110, q) + '%'; leak.style.opacity = String(reduced ? 0 : Math.sin(Math.PI * q) * p.intensity); });
  });
  add('title-perspective-crawl', '远近倾斜开场爬行 / Perspective title crawl', { tiltDegrees:range(45, 68), windowPx:range(170, 260), speed:['linear'] }, (view, p) => {
    const window = hidden(view.node('div', null, { position:'relative', width:'100%', height:p.windowPx + 'px', overflow:'hidden', perspective:'450px' }));
    const main = text(view, view.text, { transformOrigin:'50% 100%', fontSize:'30px', lineHeight:'1.8', color:'#f0cb72' }, window);
    return core.lifecycle(view, (value, reduced) => { window.style.height = reduced ? 'auto' : p.windowPx + 'px'; main.style.transform = reduced ? 'none' : 'rotateX(' + p.tiltDegrees + 'deg) translateY(' + mix(p.windowPx, -main.offsetHeight - 120, value) + 'px)'; });
  });
  add('title-racing-lines', '引导线疾进职员卡 / Racing line-led credits', { leadFraction:range(0.08, 0.2), burstFraction:range(0.15, 0.35), direction:['alternating'] }, (view, p) => {
    const result = phraseNodes(view);
    const line = hidden(view.node('div', null, { height:'3px', width:'100%', background:'#ffd166', transformOrigin:'left center' }));
    return core.lifecycle(view, (value, reduced) => {
      if (reduced) { staticPhrases(result); line.style.transform = 'none'; return; }
      const active = cueAt(result.cues, value), cue = result.cues[active], local = time(value, cue.start, cue.end), travel = out(time(local, p.leadFraction, p.leadFraction + p.burstFraction));
      line.style.transformOrigin = active % 2 ? 'right center' : 'left center'; line.style.transform = 'scaleX(' + core.clamp(local / p.leadFraction) + ')';
      result.nodes.forEach((node, index) => { node.style.opacity = index === active ? '1' : '0'; node.style.transform = 'translateX(' + (active % 2 ? -1 : 1) * (1 - travel) * 140 + 'px)'; });
    });
  });
  add('title-slam', '纵深标题一次撞入 / Depth title slam', { depthPx:range(120, 260), impactAt:range(0.1, 0.35), impactEnd:range(0.45, 0.7), reboundPx:range(3, 10) }, (view, p) => {
    const main = text(view, view.text, { fontWeight:'850', transformOrigin:'center', textShadow:'0 4px 0 #07101e' });
    return core.lifecycle(view, (value, reduced) => {
      const q = reduced ? 1 : time(value, p.impactAt, p.impactEnd), acceleration = q * q * q, rebound = reduced ? 0 : Math.sin(q * Math.PI * 2) * (1 - q) * p.reboundPx;
      main.style.opacity = reduced || q > 0 ? '1' : '0'; main.style.transform = reduced ? 'none' : 'translateZ(' + (1 - acceleration) * p.depthPx + 'px) translateY(' + rebound + 'px)';
    });
  });
  add('title-tracking-expand', '字距匀速扩张 / Linear tracking expansion', { fromEm:range(0, 0.04), toEm:range(0.1, 0.3), easing:['linear'], font:['system-serif'] }, (view, p) => {
    const main = text(view, view.text, { fontFamily:'serif', fontSize:'30px', lineHeight:'1.7' });
    return core.lifecycle(view, (value, reduced) => { main.style.letterSpacing = mix(p.fromEm, p.toEm, reduced ? 1 : value) + 'em'; });
  });
  add('title-sliced-bars', '多条字形切片合拢 / Sliced glyph bars', { slices:integer(3, 7), travelPx:range(70, 160), revealEnd:range(0.4, 0.75), direction:['alternating'] }, (view, p) => {
    const box = hidden(view.node('div', null, { position:'relative', width:'100%', display:'grid', placeItems:'center' }));
    const sizing = text(view, view.text, { gridArea:'1 / 1', visibility:'hidden', fontWeight:'800' }, box);
    const layers = Array.from({ length:p.slices }, (_, index) => text(view, view.text, { gridArea:'1 / 1', fontWeight:'800', clipPath:'inset(' + index / p.slices * 100 + '% 0 ' + (1 - (index + 1) / p.slices) * 100 + '% 0)' }, box));
    return core.lifecycle(view, (value, reduced) => {
      sizing.style.visibility = reduced ? 'visible' : 'hidden';
      layers.forEach((layer, index) => { const q = out(time(value, index * 0.035, p.revealEnd + index * 0.035)); layer.style.display = reduced ? 'none' : 'block'; layer.style.transform = 'translateX(' + (index % 2 ? -1 : 1) * (1 - q) * p.travelPx + 'px)'; });
    });
  });
  add('title-stamp', '切纸词块阶梯落印 / Stepped paper word stamps', { steps:[2], spread:range(0.25, 0.65), angleDegrees:range(3, 9), paper:['cream'] }, (view, p) => {
    const result = wordTokens(view);
    result.nodes.forEach((node, index) => { if (!/\S/u.test(result.units[index])) return; Object.assign(node.style, { background:'#e8d9b4', color:'#182030', padding:'3px 7px', fontWeight:'800', clipPath:'polygon(0 4%,96% 0,100% 96%,3% 100%)', margin:'3px' }); });
    return core.lifecycle(view, (value, reduced) => result.nodes.forEach((node, index) => {
      const q = reduced ? 1 : core.phase(value, index, result.nodes.length, p.spread), step = Math.floor(q * p.steps) / p.steps;
      node.style.opacity = reduced || q > 0 ? '1' : '0'; node.style.transform = reduced ? 'none' : 'rotate(' + (core.random(view.seed, index) - 0.5) * p.angleDegrees * 2 + 'deg) scale(' + mix(1.15, 1, step) + ')';
    }));
  });
  add('title-tracking-contract', '宽字距四次曲线收束 / Quartic tracking contraction', { fromEm:range(0.3, 0.7), toEm:range(0, 0.06), revealEnd:range(0.6, 0.95), easing:['quartic-out'] }, (view, p) => {
    const main = text(view, view.text, { fontFamily:'serif', fontSize:'30px', lineHeight:'1.7' });
    return core.lifecycle(view, (value, reduced) => { const q = reduced ? 1 : 1 - (1 - time(value, 0, p.revealEnd)) ** 4; main.style.letterSpacing = mix(p.fromEm, p.toEm, q) + 'em'; });
  });
  return { recipes };
}));
