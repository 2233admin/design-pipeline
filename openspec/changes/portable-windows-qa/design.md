## Decisions

- Relative archive plus `cwd`, not `--force-local`: bsdtar (`C:\Windows\System32\tar.exe`) rejects
  that GNU flag, and a relative name has no drive colon for either tool.
- Normalize at the point issues are created (`mengto-skills-core.cjs`), not in the test, so CLI
  output is also stable across platforms. Walk results stay native because they feed `path.join`.
- Skip, do not rewrite, the case-collision case. The rule it guards (an upper-case look-alike folder
  is still a hit) is covered on case-sensitive hosts, including CI. The skip is visible through
  `t.diagnostic`, not silent.

## File ownership

- `skill/scripts/mengto-skills-core.cjs`: issue separator.
- `tests/design-direction-library.test.cjs`, `install-doctor.test.cjs`, `ui-craft-sources.test.cjs`,
  `film-sources.test.cjs`: tar calls.
- `tests/reference-name-scope.test.cjs`: case probe.

## Compatibility

No artifact shape, command or flag changes.
