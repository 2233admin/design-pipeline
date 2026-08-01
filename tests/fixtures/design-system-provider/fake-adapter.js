"use strict";

const args = Object.fromEntries(Array.from({ length: process.argv.slice(2).length / 2 }, (_, index) => {
  const offset = index * 2 + 2;
  return [process.argv[offset], process.argv[offset + 1]];
}));
const type = args["--type"];
const id = args["--id"];
if (id === "exit") process.exit(7);
if (id === "timeout") setTimeout(() => {}, 10_000);
const actualType = id === "wrong-type" ? "docs" : type;
const listIds = { component: ["button"], docs: ["environment"], template: ["dashboard"], hook: ["use-dialog"] };
function item(itemId) {
  const declaredStatus = ["stable", "canary", "beta", "experimental", "deprecated", "unknown"].find((value) => itemId.endsWith(`-${value}`));
  return {
    id: itemId,
    name: itemId,
    ...(itemId.endsWith("-missing") ? {} : { status: declaredStatus || "stable" }),
    value: type === "docs"
      ? { leaked: Object.keys(process.env).filter((key) => /proxy|token|credential|secret|password|api[_-]?key/i.test(key)).sort() }
      : `${type}:${itemId}`
  };
}
const data = type === "manifest"
  ? {
      id: "astryx",
      revision: "fixture-revision",
      components: ["button"],
      docs: ["environment"],
      templates: ["dashboard"],
      hooks: ["use-dialog"],
      loss: ["interactive examples are represented as text"],
      theme: { tokens: { colorAccent: "#0866ff" } }
    }
  : id === undefined ? { items: listIds[type].map(item) } : item(id);
process.stdout.write(JSON.stringify({
  schema: "design-pipeline.design-system-provider-envelope.v1",
  apiVersion: args["--api-version"],
  type: actualType,
  provider: { id: "astryx", version: "0.1.8", license: "MIT" },
  data
}));
