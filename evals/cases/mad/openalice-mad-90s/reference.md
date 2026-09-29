# Reference

Seven official Vocaloid MVs, played from their official YouTube channels in headless Chromium
(nothing downloaded) and sampled every 2 s. A visual event is a step whose 64x36 thumbnail changes
by more than 15/255 mean RGB (cuts, flashes, full-frame type). Capture ran at about 20 fps, so the
counts are approximate and beat alignment was not measured. BPMs are from VocaDB.

| Work | BPM | Events | What it does |
|---|---|---|---|
| DECO*27 - Vampire (2021), https://www.youtube.com/watch?v=e1xCOsgWG0M | 164 | 0.2/bar | One held illustration; only the mask moves. Lyric clusters beside the face, darker-red ghost lyrics, full-height hero kanji, a repeated-phrase band, a logo on the first hook, a text ring and an end card. |
| Kanaria - KING (2020), https://www.youtube.com/watch?v=cm-l2h6GB8Q | 166 | 0.36/bar | One held illustration; tiny tategaki at the edges, HUD lines, ripple transitions, a title card at section starts. |
| DECO*27 - Hibana (2017), https://www.youtube.com/watch?v=hxSg2Ioz3LM | 200 | ~0 | A still with subtitles: the static baseline. |
| PinocchioP - God-ish (2021), https://www.youtube.com/watch?v=EHBFKhLUVig | 142 | 2.0/bar | One illustration re-cropped to eyes, mouth, hands; a white silhouette on black; black breaks with one tiny line; full-frame kanji over static; red kept for hook words. |
| DECO*27 - Rabbit Hole (2023), https://www.youtube.com/watch?v=eSW2LVbPThw | 173 | 1.8/bar | Whole illustration in verses, tight crops with huge glowing kanji in choruses, a glitch transition. |
| 32ki - Mesmerizer (2024), https://www.youtube.com/watch?v=19y8YTbvri8 | 185 | 1.9/bar, 3-6/s in the final chorus | Three-panel split with a centre beat panel that changes per section; black-spiral-flash intro; the bridge isolates each character on black. |
| DECO*27 - Telepathy (2025), https://www.youtube.com/watch?v=c56TpxfO9q0 | - | 2.8/s | Maximal collage: frame-filling outlined kana, top and bottom tickers, grids of chibi Mikus. |

## Transfer to this film

- **Held hero, moving world** (Vampire, KING): Alice is one illustration held through the verse;
  only her face changes (blink, sing, wink, serious), like Vampire's mask.
- **Density follows the song** (all seven): verse under 0.5 events per bar, pre-chorus 1-2,
  chorus about 2, bridge about 0.3, final chorus 4-8.
- **Type grammar**: lyric clusters beside her face (Vampire), tategaki strips (God-ish, KING),
  hero-word slams on downbeats (Vampire, God-ish, Rabbit Hole), a hook ticker (Telepathy), ghost
  lyrics as texture (Vampire).
- **Section devices**: a black-out line before the chorus and a white silhouette on black for the
  bridge (God-ish); a three-panel split whose centre panel carries OpenAlice's own interface
  (Mesmerizer); a duplication grid of the pixel mascot in the final chorus (Telepathy); an outro
  text ring and end card (Vampire).
- **Palette**: three colours plus one reserved for hook words (God-ish's red). Alice's blonde hair
  merged into a yellow field, so the field is red, the type white, the accent navy and the hook
  yellow.
- **Form**: anime TV size (about 89 s) at 160 BPM: 60 bars of 1.5 s, one beat is 9 frames at 24 fps.

## Assets

- Character art: seven illustrations made with ChatGPT image generation through the Codex CLI
  (`generate.cjs`). The pixel-art mascot in OpenAlice's README is the character reference; the
  hero is drawn from it and a first full-body cut-out (`assets/generated/cutout.png`), and the
  other six are edits of the hero, so her face changes on one drawing. Prompts, references, tool
  version and sha256 are in `assets/generated/generated.json`. Not committed.
- Interface: OpenAlice's terminal session, Inbox, portfolio and pixel mascot, reused from the UI
  promo case's capture at the same pinned commit (`capture.cjs`). Not committed.
- Lyrics: Japanese, written for this film (`lyrics.md`); every claim is in OpenAlice's README.

## Inspection limits

- The director cannot listen. Sound was checked through the score grid, onset detection, section
  loudness measurements and the loudness gate.
- There are no vocals; the lead synth plays the lyric melody.
- Live2D was not used: the character is still art with swapped faces. A Live2D Alice is a
  follow-up.
