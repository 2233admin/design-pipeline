## ADDED Requirements

### Requirement: Browser-backed tools find an installed Chromium browser

Browser-backed tools SHALL resolve the browser from `--chrome`, then `PUPPETEER_EXECUTABLE_PATH`, then the HyperFrames headless shell, then an installed Chrome, Edge or Chromium. An explicit path that does not exist SHALL fail. When none is found the error SHALL list what was checked and how to fix it. The Art Motion render report and interaction results SHALL name the browser executable and version.

#### Scenario: Only Edge is installed

- **WHEN** no `--chrome`, no `PUPPETEER_EXECUTABLE_PATH` and no HyperFrames download exist and Edge is installed
- **THEN** the tool SHALL launch Edge, and an Art Motion render report or interaction result SHALL name the Edge executable and version

#### Scenario: The pinned download is present

- **WHEN** the HyperFrames headless shell exists alongside a system Chrome
- **THEN** the tool SHALL use the headless shell

#### Scenario: An explicit path is wrong

- **WHEN** `--chrome` or `PUPPETEER_EXECUTABLE_PATH` names a file that does not exist
- **THEN** the tool SHALL fail with `TOOL_MISSING` and SHALL NOT fall back to another browser

#### Scenario: No browser at all

- **WHEN** no browser is found
- **THEN** the tool SHALL fail with `TOOL_MISSING`, listing the checked locations and the fixes, and browser tests SHALL skip
