# QA

- `node --test tests/prism-system.test.cjs tests/designer-pipeline-cli.test.cjs`: 16 passing tests.
- `node scripts/qa.cjs`: 46 test files and 390 tests passed. Static resources and syntax, source
  CLI, reproducible `.tgz`/`.zip`/checksums, isolated archive installation, installed-package
  `doctor`, and installed `prism verify/route` all passed. The final repository-status check was
  byte-identical.
- `prism verify`: ready at revision `e93f2a3019162f1da19a9a8c3a5db0f1fba48631`; 127 files,
  1,255,423 bytes, 107 skills, five routes, canonical SHA-256
  `bebf354edf8a1849089c37fefe908d9e49ca3b7a4918ec56894c03c641e88a14`, and upstream skills
  Git tree `a4cbce60f29831615f017c758b81e362e862eda7`.

The first full QA run overlapped an unrelated `deepclonewebsite` workspace import and correctly
reported changing package inputs. After that external write settled, the complete QA run passed.
