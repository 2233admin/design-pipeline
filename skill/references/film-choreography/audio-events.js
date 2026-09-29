/* design-pipeline film audio adapter (global FilmAudio)
 *
 * Turns the data the pipeline already has into plain hits for the instrument kit in patterns.js:
 * a Strudel score grid (design-pipeline.score-grid.v1, written by `designer-pipeline film score`)
 * or the `music` block of design-pipeline.edit-analysis.v1. Nothing here analyzes audio, reads a
 * clock or draws a random number: every function is a pure function of its arguments, so a
 * composition built from it is identical on every seek and every render.
 *
 * `film score` also writes lib/score-grid.js, which calls FilmAudio.setGrid(<the grid JSON>).
 * Load this file first, then that one, then build the timeline in one synchronous pass:
 *   <script src="lib/audio-events.js"></script>
 *   <script src="lib/score-grid.js"></script>
 *   const audio = FilmAudio.fromScoreGrid();          // the grid set by score-grid.js
 *   const kicks = FilmAudio.hits(audio, { sound: "sine", midiMax: "c2", from: 2, to: 10 });
 *   const bar2 = FilmAudio.bar(audio, 2, 4);          // bars 2 to 5 -> { bar, from, to, durSec }
 *
 * API
 *   setGrid(grid)              store the grid for fromScoreGrid(); returns it
 *   fromScoreGrid(grid?)       audio object from `grid`, or from the grid set by setGrid
 *   fromAnalysis(music)        audio object from an edit-analysis `music` block (or the whole
 *                              analysis document); beats and bars, no events
 *   hits(audio, options)       [{ atSec, strength }] sorted by time, strength 0..1
 *   beats(audio, options)      [{ atSec, strength: 1 }] for beat-locked components
 *   bar(audio, k, count = 1)   window of bars k .. k + count - 1, bars numbered from 1
 *   hash(seed, index)          deterministic number in [0, 1)
 *
 * hits options (all optional; a filter that is absent keeps everything):
 *   sound            a name or an array of names, matched against the event's `sound`
 *   midiMin/midiMax  inclusive note range; a note name ("c1", "eb2", "f#3") or a MIDI number.
 *                    Strudel's convention: c4 = 60, and a name without an octave is octave 3.
 *                    Events without a note never match a note range.
 *   durMin/durMax    inclusive range of `durSec`
 *   gainMin          minimum gain; an event without a gain counts as Strudel's default, 1
 *   from/to          window [from, to) in seconds
 *   quiet            windows [from, to) removed from the selection: [[a, b], ...] or
 *                    [{ from, to }, ...]; one [a, b] pair is accepted too
 * strength is the event's gain divided by the largest gain among the hits that were kept.
 * beats options: from/to (window, [from, to)), every (a beat is kept when its index counts a
 * multiple of `every` from the first beat, default 1).
 * Every bad argument throws an Error that says what to change.
 */
((root, factory) => {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.FilmAudio = api;
})(typeof self === "undefined" ? this : self, () => {
  const GRID_SCHEMA = "design-pipeline.score-grid.v1";
  const ANALYSIS_SCHEMA = "design-pipeline.edit-analysis.v1";
  const FIX = "run `designer-pipeline film score --template <name> --bpm <n>` in the film project and load lib/score-grid.js after lib/audio-events.js";

  let stored = null;

  function isNumber(value) { return typeof value === "number" && Number.isFinite(value); }
  function isTimes(value) { return Array.isArray(value) && value.every(isNumber); }

  function setGrid(grid) {
    fromScoreGrid(grid);
    stored = grid;
    return grid;
  }

  // Validation is strict about the fields the adapter reads and silent about the rest, so a later
  // additive change to the grid does not break a film.
  function fromScoreGrid(grid) {
    const source = grid === undefined || grid === null ? stored : grid;
    if (!source || typeof source !== "object") throw new Error(`FilmAudio.fromScoreGrid: no score grid was loaded. Fix: ${FIX}`);
    if (source.schema !== GRID_SCHEMA) throw new Error(`FilmAudio.fromScoreGrid: expected schema ${GRID_SCHEMA}, got ${JSON.stringify(source.schema)}. Fix: ${FIX}`);
    if (!isNumber(source.bpm) || source.bpm <= 0 || !isNumber(source.durationSec) || !isTimes(source.beats) || !Array.isArray(source.events)) {
      throw new Error(`FilmAudio.fromScoreGrid: the grid needs a positive bpm, durationSec, a beats array of seconds and an events array. Fix: ${FIX}`);
    }
    const beatsPerBar = isNumber(source.beatsPerCycle) && source.beatsPerCycle >= 1 ? Math.round(source.beatsPerCycle) : 4;
    const downbeats = source.beats.filter((_, index) => index % beatsPerBar === 0);
    const events = source.events.map((event, index) => {
      if (!event || !isNumber(event.atSec)) throw new Error(`FilmAudio.fromScoreGrid: events[${index}] has no numeric atSec. Fix: ${FIX}`);
      return { atSec: event.atSec, durSec: isNumber(event.durSec) ? event.durSec : 0, sound: typeof event.sound === "string" ? event.sound : null, note: event.note === undefined ? null : event.note, gain: isNumber(event.gain) ? event.gain : null };
    });
    const barSec = (60 / source.bpm) * beatsPerBar;
    // summarizeGrid lists a beat at durationSec itself; a bar that would start there has no length.
    const bars = downbeats
      .filter((startSec) => startSec < source.durationSec - 1e-6)
      .map((startSec, index) => ({ startSec, endSec: Math.min(index + 1 < downbeats.length ? downbeats[index + 1] : startSec + barSec, source.durationSec) }));
    return { source: "score-grid", bpm: source.bpm, durationSec: source.durationSec, beats: source.beats.slice(), downbeats, bars, events };
  }

  function fromAnalysis(input) {
    const music = input && input.schema === ANALYSIS_SCHEMA ? input.music : input;
    const fix = "pass the `music` block of the edit-analysis.json written by `designer-pipeline film-edit analyze`";
    if (!music || typeof music !== "object") throw new Error(`FilmAudio.fromAnalysis: no music analysis. Fix: ${fix}`);
    if (!isNumber(music.bpm) || music.bpm <= 0 || !isTimes(music.beats) || !isTimes(music.downbeats)) throw new Error(`FilmAudio.fromAnalysis: the music block needs a positive bpm and numeric beats and downbeats arrays. Fix: ${fix}`);
    const durationSec = isNumber(music.durationSec) ? music.durationSec : (music.beats[music.beats.length - 1] || 0);
    const bars = Array.isArray(music.bars) && music.bars.length
      ? music.bars.map((bar, index) => {
        if (!bar || !isNumber(bar.startSec) || !isNumber(bar.endSec)) throw new Error(`FilmAudio.fromAnalysis: bars[${index}] needs numeric startSec and endSec. Fix: ${fix}`);
        return { startSec: bar.startSec, endSec: bar.endSec };
      })
      : music.downbeats.map((startSec, index) => ({ startSec, endSec: index + 1 < music.downbeats.length ? music.downbeats[index + 1] : durationSec }));
    return { source: "edit-analysis", bpm: music.bpm, durationSec, beats: music.beats.slice(), downbeats: music.downbeats.slice(), bars, events: [] };
  }

  // Strudel note names: letter, accidentals (# s for sharp; b f for flat), optional octave.
  // c4 = 60; without an octave the note is in octave 3, as in Strudel.
  const STEPS = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
  function toMidi(note, label) {
    if (isNumber(note)) return note;
    if (typeof note === "string") {
      const match = /^([a-g])([#sbf]*)(-?\d+)?$/i.exec(note.trim());
      if (match) {
        let semitone = STEPS[match[1].toLowerCase()];
        for (const accidental of match[2].toLowerCase()) semitone += accidental === "#" || accidental === "s" ? 1 : -1;
        const octave = match[3] === undefined ? 3 : Number(match[3]);
        return 12 * (octave + 1) + semitone;
      }
    }
    throw new Error(`FilmAudio.hits: ${label} ${JSON.stringify(note)} is not a note. Fix: use a MIDI number or a note name such as "c1", "eb2" or "f#3"`);
  }

  function requireAudio(audio, where) {
    if (!audio || typeof audio !== "object" || !Array.isArray(audio.beats) || !Array.isArray(audio.events)) {
      throw new Error(`FilmAudio.${where}: first argument must come from FilmAudio.fromScoreGrid() or FilmAudio.fromAnalysis(). Fix: ${FIX}`);
    }
  }

  function optionNumber(value, name, where) {
    if (value === undefined) return undefined;
    if (!isNumber(value)) throw new Error(`FilmAudio.${where}: ${name} must be a number of seconds, got ${JSON.stringify(value)}`);
    return value;
  }

  function quietWindows(quiet) {
    if (quiet === undefined || quiet === null) return [];
    if (!Array.isArray(quiet)) throw new Error("FilmAudio.hits: quiet must be a list of [from, to] windows in seconds");
    const list = quiet.length === 2 && isNumber(quiet[0]) && isNumber(quiet[1]) ? [quiet] : quiet;
    return list.map((window, index) => {
      const from = Array.isArray(window) ? window[0] : window && window.from;
      const to = Array.isArray(window) ? window[1] : window && window.to;
      if (!isNumber(from) || !isNumber(to) || to < from) throw new Error(`FilmAudio.hits: quiet[${index}] must be [from, to] or { from, to } with to >= from, in seconds`);
      return [from, to];
    });
  }

  function hits(audio, options = {}) {
    requireAudio(audio, "hits");
    const { sound, midiMin, midiMax, durMin, durMax, gainMin } = options;
    const from = optionNumber(options.from, "from", "hits");
    const to = optionNumber(options.to, "to", "hits");
    for (const [name, value] of [["durMin", durMin], ["durMax", durMax], ["gainMin", gainMin]]) optionNumber(value, name, "hits");
    const sounds = sound === undefined ? null : Array.isArray(sound) ? sound : [sound];
    const lo = midiMin === undefined ? null : toMidi(midiMin, "midiMin");
    const hi = midiMax === undefined ? null : toMidi(midiMax, "midiMax");
    const quiet = quietWindows(options.quiet);
    const kept = [];
    for (const event of audio.events) {
      if (sounds && !sounds.includes(event.sound)) continue;
      if (lo !== null || hi !== null) {
        if (event.note === null || event.note === undefined) continue;
        let midi;
        try { midi = toMidi(event.note, "event note"); } catch { continue; }
        if (lo !== null && midi < lo) continue;
        if (hi !== null && midi > hi) continue;
      }
      if (durMin !== undefined && event.durSec < durMin) continue;
      if (durMax !== undefined && event.durSec > durMax) continue;
      const gain = event.gain === null || event.gain === undefined ? 1 : event.gain;
      if (gainMin !== undefined && gain < gainMin) continue;
      if (from !== undefined && event.atSec < from) continue;
      if (to !== undefined && event.atSec >= to) continue;
      if (quiet.some(([a, b]) => event.atSec >= a && event.atSec < b)) continue;
      kept.push({ atSec: event.atSec, gain });
    }
    kept.sort((a, b) => a.atSec - b.atSec);
    const peak = kept.reduce((max, hit) => Math.max(max, hit.gain), 0);
    return kept.map((hit) => ({ atSec: hit.atSec, strength: peak > 0 ? hit.gain / peak : 0 }));
  }

  function beats(audio, options = {}) {
    requireAudio(audio, "beats");
    const from = optionNumber(options.from, "from", "beats");
    const to = optionNumber(options.to, "to", "beats");
    const every = options.every === undefined ? 1 : options.every;
    if (!Number.isInteger(every) || every < 1) throw new Error("FilmAudio.beats: every must be a whole number of beats, 1 or more");
    return audio.beats
      .map((atSec, index) => ({ atSec, index }))
      .filter(({ atSec, index }) => index % every === 0 && (from === undefined || atSec >= from) && (to === undefined || atSec < to))
      .map(({ atSec }) => ({ atSec, strength: 1 }));
  }

  // Bars are numbered from 1, like the song map: bar k starts at (k - 1) bar lengths.
  function bar(audio, k, count = 1) {
    requireAudio(audio, "bar");
    if (!Number.isInteger(k) || k < 1) throw new Error("FilmAudio.bar: k must be a whole bar number, 1 or more (bars are numbered from 1)");
    if (!Number.isInteger(count) || count < 1) throw new Error("FilmAudio.bar: count must be a whole number of bars, 1 or more");
    const last = k + count - 1;
    if (!audio.bars || last > audio.bars.length) throw new Error(`FilmAudio.bar: bars ${k} to ${last} do not exist; the audio has ${audio.bars ? audio.bars.length : 0} bars. Fix: use a bar number from 1 to ${audio.bars ? audio.bars.length : 0}`);
    const from = audio.bars[k - 1].startSec;
    const to = audio.bars[last - 1].endSec;
    return { bar: k, from, to, durSec: Number((to - from).toFixed(4)) };
  }

  // 32-bit integer mix (murmur3 finalizer) of seed and index; same inputs, same number.
  function hash(seed, index) {
    if (!isNumber(seed) || !isNumber(index)) throw new Error("FilmAudio.hash: seed and index must be numbers. Fix: pass a caller seed and a frame, cell or hit index");
    let h = (Math.imul(Math.floor(seed) | 0, 0x9e3779b1) ^ Math.imul(Math.floor(index) | 0, 0x85ebca6b)) >>> 0;
    h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b) >>> 0;
    h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35) >>> 0;
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }

  return { fromScoreGrid, fromAnalysis, hits, beats, bar, hash, setGrid, GRID_SCHEMA };
});
