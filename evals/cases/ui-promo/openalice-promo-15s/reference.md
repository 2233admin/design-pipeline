# Reference

- Primary moving reference: none watched. The material is the product itself: OpenAlice
  (TraderAlice/OpenAlice, AGPL-3.0) at `dc193d9f` in its UI demo mode, which mocks the backend with
  MSW and ships a hand-made agent session (the aapl-q1 workspace reading Apple's Q1 filing) and
  the Inbox report that session pushes.
- Observed time ranges: the recorded session types the question from 2.73 s to 4.10 s, shows the
  red +9.1% row at 9.93 s, writes the report at 12.7 s and posts it to the Inbox at 15.7 s
  (measured on the capture, frame by frame).
- Transfer to this product: follow one question through the product; cut between screens on what
  they share (the question, the +9.1%, AAPL).
- Asset inventory: `capture.cjs` produces every asset from the pinned checkout (Ask Alice typing,
  the terminal session, Inbox and portfolio stills, the logo). Nothing from OpenAlice is committed
  here; `assets/captures/capture.json` records the source commit and each file's sha256.
- Inspection limits: the director cannot listen; sound was checked through the score grid, onset
  detection and the loudness gate. The film uses OpenAlice's demo fixtures, not live data.
