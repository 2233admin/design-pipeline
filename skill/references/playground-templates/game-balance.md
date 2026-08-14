# Game Balance Playground Blueprint

Use for tuning numeric and systemic relationships in a game or persistent interactive scene:
economy, combat, progression, spawn rates, difficulty curves, or reward pacing.

## Required Surface

- Controls grouped by the actual systems and units they affect.
- Immediate derived metrics, breakpoint warnings, and a chart/table showing outcomes across time,
  level, or representative scenarios.
- Cohesive presets such as baseline, forgiving, competitive, and stress case.
- Scenario selector and reset-to-recorded-baseline action.

## State And Output

State separates authored inputs from derived metrics. Calculations must be deterministic, finite,
unit-labelled, and visible in accessible tabular form. The output prompt names changed parameters,
predicted consequences, protected invariants, uncertainty, and required playtest measurements; it
must not present a toy simulation as validated player behavior.

## QA

Test minima/maxima, division-by-zero and overflow, monotonicity where expected, deterministic reset,
keyboard control, reduced motion, and parity between charts, tables, prompt, and selected state.
