## ADDED Requirements

### Requirement: Open fonts are chosen by measured coverage and traced licence

The skill SHALL keep a packaged catalog of open fonts at pinned source revisions. Each family records its licence, the file that declares it, its cmap coverage, weights, stroke contrast and style. `fonts query` SHALL return as candidates only fonts whose cmap covers every character of the given text. It SHALL list near misses with their missing characters and exit 2 with a fix when no candidate exists.

#### Scenario: Simplified title in bold mincho

- **WHEN** `fonts query` runs with the 夜想回廊 Chinese copy, `--style mincho --weight 700`
- **THEN** every candidate's cmap SHALL contain every character, Noto Serif SC SHALL be a candidate, and Shippori Mincho, Shippori Mincho B1 and Zen Old Mincho SHALL be near misses listing 钥, 证 and 记

#### Scenario: Nothing covers the text

- **WHEN** no family of the requested style and weight covers a character of the text
- **THEN** the command SHALL exit 2 with finding `font-coverage-none` and a fix naming the closest family and what it lacks

#### Scenario: Licence lineage

- **WHEN** the catalog lists a family
- **THEN** its licence SHALL name the source file and field at the pinned revision, and a family with no licence text beside it SHALL be reported as a warning with a fix

#### Scenario: Reproducible refresh

- **WHEN** `fonts refresh` runs twice at the same pinned revisions
- **THEN** both runs SHALL write identical bytes, and a server that ignores HTTP Range SHALL be refused rather than downloaded whole

#### Scenario: Unsupported or invalid font input

- **WHEN** `fonts measure` or `fonts query --path` reads a WOFF2 file or a file that is not a font
- **THEN** it SHALL report `FONT_FORMAT_UNSUPPORTED` or `FONT_UNREADABLE` with a fix instead of a coverage result

#### Scenario: Blocked source

- **WHEN** a registered source's files are reachable only through a host the environment refuses
- **THEN** the registry SHALL record it as blocked with the observed response, and the catalog SHALL not contain it

#### Scenario: Misaligned or truncated range

- **WHEN** a server answers a range request with a body or `Content-Range` that does not match the requested bytes
- **THEN** the refresh SHALL fail for that file instead of measuring partial data

#### Scenario: Stale cache after an upgrade

- **WHEN** the user cache lacks a packaged source or was refreshed under a different pinned revision than the package
- **THEN** `fonts query` SHALL use the packaged catalog and report the skipped cache with its reason and a fix
