import fs from "node:fs";
import process from "node:process";

const args = process.argv.slice(2);
const status = process.env.FAKE_ASTRYX_STATUS;
const statusField = status === undefined ? {} : { status };
if (process.env.FAKE_ASTRYX_LOG) fs.appendFileSync(process.env.FAKE_ASTRYX_LOG, `${JSON.stringify(args)}\n`);
const [command] = args;
let output;
if (command === "manifest" && args.join(" ") === "manifest --json") {
  output = {
    apiVersion: 1,
    data: {
      version: "0.2.0",
      revision: "official-fixture",
      runtime: { react: ">=19", "react-dom": ">=19", "@stylexjs/stylex": "^0.19" },
      theme: { tokens: { colorAccent: "#0866ff" } },
      loss: []
    }
  };
} else if (command === "component" && args.includes("--list") && args.includes("--detail")) {
  const docs = args.includes("--zh") ? "操作按钮" : args.includes("--dense") ? "Button dense reference" : "Action control";
  const usage = args.includes("--zh") ? "用于关键操作。" : args.includes("--dense") ? "Button(props)" : "Use for decisive actions.";
  output = { apiVersion: 1, data: { components: { Actions: [{ name: "Button", ...statusField, docs, usage, props: { disabled: { type: "boolean" } }, theming: { tokens: ["action.background"] } }] } } };
} else if (command === "hook" && args.includes("--list") && args.includes("--detail")) {
  const docs = args.includes("--zh") ? "控制对话框。" : args.includes("--dense") ? "useDialog dense reference" : "Controls a dialog.";
  output = { apiVersion: 1, data: { hooks: { Interaction: [{ name: "useDialog", ...statusField, docs, usage: args.includes("--zh") ? "返回对话框状态。" : "Returns dialog state.", props: { modal: { type: "boolean" } } }] } } };
} else if (command === "template" && args.join(" ") === "template --list --json") {
  output = { apiVersion: 1, data: [{ name: "Dashboard", ...statusField }] };
} else if (command === "docs" && args.join(" ") === "docs --json") {
  output = { apiVersion: 1, data: [{ topic: "getting-started" }] };
} else if (command === "docs" && args[1] === "getting-started") {
  const content = args.includes("--zh") ? "入门指南" : args.includes("--dense") ? "Dense guidance" : "Getting started guidance";
  output = { apiVersion: 1, data: { name: "Getting started", ...statusField, content, usage: args.includes("--zh") ? "先安装主题。" : "Install a theme first.", sections: [{ name: "Install", content }] } };
} else {
  process.stderr.write(`unexpected mutating or unknown command: ${args.join(" ")}\n`);
  process.exit(9);
}
process.stdout.write(JSON.stringify(output));
