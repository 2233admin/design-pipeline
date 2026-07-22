#!/usr/bin/env node
"use strict";
const path = require("node:path"); const { searchPatterns } = require("./interoperability-core.cjs"); const { jsonResult, readJson } = require("./contract-utils.cjs");
function arg(n){const i=process.argv.indexOf(n);return i>=0?process.argv[i+1]:null;} try { const file=path.resolve(arg("--catalog")||path.join(__dirname,"../references/ui-pattern-catalog.json")); const results=searchPatterns(readJson(file,"patterns"),{query:arg("--query"),category:arg("--category"),platform:arg("--platform")}); process.stdout.write(`${JSON.stringify(jsonResult(true,{status:"valid",results}))}\n`); } catch(error){process.stdout.write(`${JSON.stringify(jsonResult(false,{},error))}\n`);process.exitCode=1;}
