## ADDED Requirements

### Requirement: Browser scripts follow retry-safe practices

The repository SHALL provide `skill/tools/browser-practice/lint.cjs`, which rejects fixed-duration waits, one-shot state reads inside `expect(...)` and positional locators in browser scripts, and repository tests SHALL run it over the repository's own browser scripts. An exception SHALL carry a reason.

#### Scenario: Fixed wait

- **WHEN** a script calls `page.waitForTimeout(500)`
- **THEN** the lint SHALL exit 2 reporting `fixed-wait` with file and line

#### Scenario: One-shot read in an assertion

- **WHEN** a script has `expect(await locator.isVisible()).toBe(true)`
- **THEN** the lint SHALL report `one-shot-read`, and `await expect(locator).toBeVisible()` SHALL pass

#### Scenario: Exception without a reason

- **WHEN** a line carries `browser-practice-allow fixed-wait:` with no reason
- **THEN** the lint SHALL report `allow-invalid`

#### Scenario: Baseline assertions are project policy

- **WHEN** a script uses `toHaveScreenshot` and `--forbid-baseline` is absent
- **THEN** the lint SHALL NOT report it
