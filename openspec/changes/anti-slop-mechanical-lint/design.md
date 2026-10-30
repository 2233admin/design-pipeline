## Decisions

1. Vendor `skills/hallmark/scripts/sloplint.mjs` and `sloplint-render.mjs` at `4f6a46c6dc325d40ab268c93e25c7b96676ebccd`,
   unmodified. Run it as a child process with Node (`--json`, plus `--render`/`--url` when a browser resolves), so
   its ESM and flags stay upstream's. Upstream gate ids are stable ("retired numbers stay retired").
2. `anti-slop-lint-map.json`: one entry per upstream gate id with `rule` (our rubric id) and `class`
   (`hard`, `contextual`, `preference`, `excluded`) and a one-line reason for exclusions. A gate missing from the map
   fails the run with `LINT_GATE_UNMAPPED`, so an upstream update cannot add unreviewed law silently.
3. Mapping principle: a gate is `hard` only when it detects broken behaviour, missing access or dishonest content;
   everything that is a taste default is at most `contextual`. Hallmark's own Floor tier does not decide our class.
4. The target digest binds the lint run to the files linted; changing them invalidates the lint block, as other
   evidence is invalidated.

## Risks

- sloplint expects its stamp in CSS (gate 20) and Hallmark tokens (gates 24a, 48 on `--space-*` names). These map
  to `excluded` or `preference` unless our DESIGN.md token names make them meaningful.
