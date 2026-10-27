## ADDED Requirements

### Requirement: Verification output and repository tests do not depend on the host OS

Verification issues SHALL name files with `/` on every platform. Repository tests SHALL pass on Windows, macOS and Linux with GNU tar or bsdtar, and a test that needs a case-sensitive filesystem SHALL skip that case with a reported diagnostic.

#### Scenario: A stray SKILL.md is verified on Windows

- **WHEN** a vendor snapshot contains a file named `SKILL.md` in a nested folder
- **THEN** the blocking issue SHALL name it as `a/b/SKILL.md`, not `a\b\SKILL.md`

#### Scenario: Package tests run with GNU tar

- **WHEN** a package test lists or extracts the release archive on a Windows drive path
- **THEN** it SHALL pass the archive as a relative name and succeed

#### Scenario: The filesystem ignores case

- **WHEN** a test needs two paths that differ only in case and the temporary directory is case-insensitive
- **THEN** the test SHALL skip that case and report a diagnostic, not fail
