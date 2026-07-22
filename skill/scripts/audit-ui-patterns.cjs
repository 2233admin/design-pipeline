#!/usr/bin/env node
"use strict";
const path = require("node:path"); const { auditPatterns } = require("./interoperability-core.cjs"); const { jsonResult, readJson } = require("./contract-utils.cjs");
const i=process.argv.indexOf("--catalog"); try { const file=path.resolve(i>=0?process.argv[i+1]:path.join(__dirname,"../references/ui-pattern-catalog.json")); process.stdout.write(`${JSON.stringify(jsonResult(true,auditPatterns(readJson(file,"patterns"))))}\n`); } catch(error){process.stdout.write(`${JSON.stringify(jsonResult(false,{},error))}\n`);process.exitCode=1;}
