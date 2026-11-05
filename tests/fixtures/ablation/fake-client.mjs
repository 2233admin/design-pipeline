#!/usr/bin/env node
// 自测用的假代理：不调模型，按工作目录里装的技能写一份现成的封面，证明打分分得开、变体装对了。
// 装了完整技能（SKILL.md 还指向 taste-skill.md）→ 好封面；装了去掉 taste-skill 的技能 → 色值不对的封面；
// 没装技能 → 字溢出的封面。回复里提到技能名，好让运行记录看得出用了技能。
import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
let input = "";
process.stdin.setEncoding("utf8").on("data", (chunk) => (input += chunk)).on("end", () => {
	const skill = join(process.cwd(), ".claude/skills/design-pipeline/SKILL.md");
	const kind = !existsSync(skill) ? "overflow" : readFileSync(skill, "utf8").includes("references/taste-skill.md") ? "good" : "offpalette";
	copyFileSync(join(here, `${kind}.html`), join(process.cwd(), "cover.html"));
	console.log(`${existsSync(skill) ? "用了 design-pipeline 技能，" : ""}按提示（${input.trim().length} 字）写好了 cover.html（${kind}）`);
});
