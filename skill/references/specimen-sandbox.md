# Specimen Sandbox Policy

Catalog specimens are static and inert by default. An executable local specimen must declare its
local source hash, CSP, granted capabilities, audit receipt, and static fallback. Network, storage,
top-navigation, remote imports, and inline script execution are denied unless a reviewed host owns
the isolated sandbox. Specimens never run during search, audit, validation, or package installation.
