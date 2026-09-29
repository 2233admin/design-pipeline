# Treatment: canvas-instrument-24s

The worked example of the template in `references/product-film-direction.md` (Music-driven films).
It lives in the `concepts.md` of a film project, under the chosen concept card, as `## Treatment`.
The song map is `sound.md`; each plate brief below is one beat of `storyboard.json`. A brief names
its beat id and never restates a number the storyboard owns (windows, hold lengths, cue times).

Concept card (picked): **The canvas is an instrument.** A node-canvas app whose every object plays:
prompts tick, generation nodes fire, wires carry signal, the render queue drains, the finished
storyboard strip node lands on the drop.

## Treatment

- Premise: the canvas is an instrument; the picture answers the music, and each answer is a product
  object of the canvas (a node, a wire, a port), not decoration. Every plate shows the canvas itself:
  nodes are frames whose header names them, wires are thin meters whose bar is the signal, ports are
  static dots, and the canvas is a faint grid.
- Instrument arc:

  | Plate (beat id) | Instrument (kit id) | Product or concept object it is | Audio role that drives it |
  | --- | --- | --- | --- |
  | `type-on-pad` | `tick-ticker` | the prompt node's log (an image node waits, unconnected) | beat ticks (`FilmAudio.beats`) |
  | `cells-on-kick` | `grid-pulse` (dominant), `audio-meter` x3, `tick-ticker` | the generation node's cells; the prompt, queue and log wires; the queue meter; the log node | kick; clap; hats |
  | `countdown-build` | `build-countdown` (dominant), `audio-meter` x2, `tick-ticker` | the render queue node's ETA; the depth node and its wire; the render log node | snare roll; the rising pulse; beat ticks |
  | `drop-impact` | `hold-then-hit`, `grid-pulse` (dominant), `audio-meter` x4 | the storyboard strip node and its finished frames; throughput nodes A and B with the wires up into the strip | the drop cue; kick; clap and bass |
  | `break-settle` | `event-scope` | the process trace node, small on an empty canvas | bass swell |
  | `brand` | `hold-then-hit` (flash only), `reveal-in-context` | the logo over the finished strip | the stab |

- Style-bible seed: the chrome's custom-property slots, filled with the film's own values. They are
  the `STYLE` table of `index.html`; the colour slots are re-scoped per plate by its `GROUND` table.

  | Slot | Value | Role |
  | --- | --- | --- |
  | `--fk-font-label` | `'Segoe UI', 'Helvetica Neue', system-ui, sans-serif` | label voice (generic families; the film ships no font) |
  | `--fk-font-data`, `--fk-font-display` | `Consolas, 'SF Mono', ui-monospace, monospace` | data, log and hero-readout voice |
  | `--fk-unit`, `--fk-stroke`, `--fk-radius` | `10px`, `4px`, `14px` | scale (label 25 px, data 30 px), thick hairlines, soft corners |
  | Extra colours | none | the six slots carry everything the film names |

  Ground per section (`ink` is the plate's ground; every neighbouring pair differs, so a hard cut
  reads as a scene change, rule R7):

  | Section | `ink` | `line` | `text` | `rest` | `accent` | `alert` |
  | --- | --- | --- | --- | --- | --- | --- |
  | intro | `#101826` | `#7d89a3` | `#f4ecd8` | `#1b2740` | `#f4ecd8` | `#ff4d2e` |
  | groove | `#f2ead8` | `#15130f` | `#15130f` | `#ddd2b8` | `#2b4bff` | `#ff4d2e` |
  | build | `#15130f` | `#8a7f68` | `#f2ead8` | `#2a251d` | `#ff7a3d` | `#ff3b1f` |
  | drop | `#2b4bff` | `#f2ead8` | `#f2ead8` | `#1c33b8` | `#ffe45c` | `#ff4d2e` |
  | break | `#0c2a2a` | `#3f7f7a` | `#d8f0e8` | `#123b3a` | `#5fe0c0` | `#ff4d2e` |
  | outro | `#f2ead8` | `#15130f` | `#15130f` | `#ddd2b8` | `#ff7a3d` | `#ff4d2e` |

  The outro's flash is re-scoped to `#ff7a3d` on its own element, so the stab lands as an orange
  frame and not a black one.
- Must not copy: everything that belongs to the reference video alone (its palette, chamfered
  header-tab panels, hex grids, hazard stripes, seven-segment digits, bilingual captions, scanlines
  and NERV imagery). Only the technique is taken: a treatment, one instrument per section, a fixed
  voice-to-motion vocabulary, a build that accelerates and freezes, a hard drop, a break that stops.
- Motion language, one verb per element, bound to one voice (`references/film-score.md`):

  | Voice | Element | Verb |
  | --- | --- | --- |
  | Beat tick | prompt log, render log node | scrolls one line |
  | Kick | generation node cells, strip frames, the prompt wire | fire (one quarter of the cells; one frame); flash along the wire |
  | Clap | queue meter, queue wire, throughput node A and its wire | jumps and falls; routes a signal |
  | Hat | log node, log wire | scrolls one line; flashes |
  | Snare roll | render ETA | loses a bite |
  | Rising pulse | depth node, its wire | climbs, each peak higher |
  | Bass | throughput node B, its wire | jumps and falls; routes a signal |
  | Swell | process trace node | one pulse travels across, then rest |
  | Stab, drop | the strip node, the logo plate | flash, zoom punch, shake (drop); flash only (stab) |

- Escalation and negative space: the intro is sparse on purpose (one node and a ghost). The groove
  fills the canvas with a node graph and three signal paths, each on a different sound. The build
  escalates through rate (eighths, then sixteenths), size (each pulse peak is higher) and colour (the
  ETA tints toward the alert colour), then its last beat holds still. The drop shows the finished
  strip and carries the full impact. The break shrinks the canvas to one small
  node on an empty ground: it stops pumping without freezing (a travelling pulse and a slow drift,
  then a hold); the outro is a single object.

## Plate briefs

Each brief is self-contained; the storyboard beat named in its heading holds the numbers.

### type-on-pad

- Instrument (`subject`): the prompt node's log, one large node headed `Prompt node`; a dashed, unconnected image node waits beside it.
- Verb (`productAction`): a prompt is typed one phrase per beat tick under the pad; nothing else moves.
- State (`transformation`, `state-change`): from an empty prompt node to a node holding a four-line prompt.
- Kit ids (`motion`, `choreography`): `tick-ticker`, primary `tick-ticker`.
- Hits (`soundCues`): `music-in`.
- Note: negative space on purpose; a port and a dashed wire leave the node, the only hint of the canvas to come.

### cells-on-kick

- Instrument: the generation node, 24 cells (dominant), wired to a queue node and a log node, with the prompt node feeding it.
- Verb: cells and the prompt wire fire on every kick, the clap routes signal along the queue wire, the hats tick the log node and flash the log wire.
- State (`data-update`): from an idle node graph to a generation node firing, queue loaded, jobs logged.
- Kit ids: `grid-pulse`, `audio-meter`, `tick-ticker`; primary `grid-pulse`.
- Hits: `groove-in`.
- Note: three signal paths, three different sounds; the ground changes from navy to cream at the cut.

### countdown-build

- Instrument: the render queue node's ETA as a hero readout (dominant), wired to a depth node, with a render log node.
- Verb: the ETA burns faster with every snare-roll hit; the depth node and its wire climb on the rising pulse; the log ticks the beat.
- State (`data-update`): from an ETA of 08.00 seconds to 00.00 with the queue clear.
- Kit ids: `build-countdown`, `audio-meter`, `tick-ticker`; primary `build-countdown`.
- Hits: `build-riser`.
- Freeze before the drop (`holdSec`): the last beat is silent and still.
- Note: rate, size and colour all rise; the ETA tints toward the alert colour.

### drop-impact

- Instrument: the storyboard strip node with four finished frames (dominant), fed by two throughput nodes over wires.
- Verb: the strip takes the impact (flash, zoom punch, shake) on the downbeat; a frame lights on the kick; node A and its wire answer the clap, node B and its wire the bass.
- State (`state-change`): from a cleared render queue and no strip to a strip node holding four finished frames.
- Kit ids: `hold-then-hit`, `grid-pulse`, `audio-meter`; primary `hold-then-hit`.
- Hits: `drop-1`.
- Note: cut accent: the full impact lands with the cut; the ground changes from near-black to cobalt.

### break-settle

- Instrument: the process trace node, 24 thin columns, small on an otherwise empty canvas, wired to the screen edges by dashed stubs.
- Verb: two bass-swell pulses travel across the trace once and every column returns to rest; the node drifts slowly; the plate then holds still.
- State (`state-change`): from a busy queue with a pumping trace to an idle queue with the trace at rest.
- Kit ids: `event-scope`; primary `event-scope`.
- Hits: `break-in`.
- Freeze before the stab (`holdSec`): the trace is at rest and still.
- Note: negative space; drums are out; the pulses end early enough that every column can finish its release before the hold.

### brand

- Instrument: the logo over the finished strip (four small frames with their pictures), a closing rule.
- Verb: a flash-only accent on the stab; the logo resolves upward; the rule wipes in and ends the film.
- State (`none`): a brand hold.
- Kit ids: `hold-then-hit` (zoom 1, no shake), `reveal-in-context`; primary `hold-then-hit`.
- Hits: `brand-hit`, `music-out`.
- Note: cut accent by ground and by flash; the last motion of the timeline ends exactly at the film's end.
