#!/usr/bin/env node
// 自测用的假评审：不调模型，总是选 A。它把收到的提示词原样写回输出，测试据此确认提示词里没有变体名。
let input = "";
process.stdin.setEncoding("utf8").on("data", (chunk) => (input += chunk)).on("end", () => {
	console.log(`----- 收到的提示词 -----\n${input}\n----- 结束 -----`);
	console.log(JSON.stringify({ winner: "A", reason: "假评审总选 A" }));
});
