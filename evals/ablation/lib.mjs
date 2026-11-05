// 准备工作目录、调用代理客户端。改自 pstack-omp 的 evals/lib.mjs（同一位主人的另一个仓库）：
// 提示词从标准输入传、超时连子进程一起杀、工作目录名只用场景名，这几处照搬；
// 不同的是这里按变体装一份技能目录，而不是只写项目规则，也不建 git 仓库（打分只看交付文件）。

import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

// 每个客户端的命令和它读项目技能的目录（Claude Code 读 .claude/skills，Codex 和 OMP 读 .agents/skills）。
// Claude Code 用 stream-json 输出，这样记录里有工具调用，才看得出用没用技能
export const CLIENTS = {
	omp: { command: ["omp", "-p", "--auto-approve"], skillDirs: [".agents/skills"] },
	claude: { command: ["claude", "-p", "--permission-mode", "acceptEdits", "--allowedTools", "Bash,Read,Write,Edit,Skill", "--output-format", "stream-json", "--verbose"], skillDirs: [".claude/skills"] },
	codex: { command: ["codex", "exec", "--full-auto", "--skip-git-repo-check", "-"], skillDirs: [".agents/skills"] },
};

/** 用户级装好的 design-pipeline：会让 bare 和减层的变体也读到完整技能，跑之前要先挪开。 */
export function globalInstalls(home = homedir()) {
	return [
		".agents/skills/design-pipeline",
		".claude/skills/design-pipeline",
		".codex/skills/design-pipeline",
		".claude/plugins/cache/design-pipeline",
		".omp/agent/managed-skills/design-pipeline",
	]
		.map((path) => join(home, path))
		.filter((path) => existsSync(path));
}

/**
 * 把场景的 repo/ 和它的 DESIGN.md 复制到临时目录，写上项目规则，按变体装技能。目录名只用场景名，不透露在测什么。
 * 返回工作目录和装好的技能目录。
 */
export function prepare({ base = tmpdir(), scenarioDir, name, designFile, agents, skillTree, skillDirs }) {
	mkdirSync(base, { recursive: true });
	const workdir = mkdtempSync(join(base, `${name}-`));
	cpSync(join(scenarioDir, "repo"), workdir, { recursive: true });
	if (designFile) cpSync(designFile, join(workdir, "DESIGN.md"));
	writeFileSync(join(workdir, "AGENTS.md"), agents);
	writeFileSync(join(workdir, "CLAUDE.md"), "@AGENTS.md\n");
	const installed = [];
	if (skillTree) {
		for (const dir of skillDirs) {
			const target = join(workdir, dir, "design-pipeline");
			cpSync(skillTree, target, { recursive: true });
			installed.push(target);
		}
	}
	return { workdir, installed };
}

/** 目录里所有文件内容的摘要，用来看代理有没有改装好的技能。 */
export function treeDigest(root) {
	const hash = createHash("sha256");
	const walk = (dir, rel) => {
		for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
			const path = join(dir, entry.name);
			if (entry.isDirectory()) walk(path, `${rel}${entry.name}/`);
			else {
				hash.update(`${rel}${entry.name}\0`);
				hash.update(readFileSync(path));
			}
		}
	};
	if (existsSync(root)) walk(root, "");
	return hash.digest("hex");
}

// 超时要连子进程一起杀：Windows 上走 cmd.exe，只杀外壳的话代理还会接着改文件
function killTree(child) {
	if (process.platform === "win32") spawnSync("taskkill", ["/T", "/F", "/PID", String(child.pid)]);
	else process.kill(-child.pid, "SIGKILL");
}

export function runAgent(command, workdir, prompt, timeoutSeconds, env = process.env) {
	return new Promise((done) => {
		const child = spawn(command[0], command.slice(1), { cwd: workdir, env, shell: process.platform === "win32", detached: process.platform !== "win32" });
		let stdout = "";
		let stderr = "";
		let timedOut = false;
		child.stdout.setEncoding("utf8").on("data", (chunk) => (stdout += chunk));
		child.stderr.setEncoding("utf8").on("data", (chunk) => (stderr += chunk));
		const timer = setTimeout(() => {
			timedOut = true;
			killTree(child);
		}, timeoutSeconds * 1000);
		child.on("error", (error) => (stderr += `\n${error}`));
		child.on("close", (code, signal) => {
			clearTimeout(timer);
			done({ stdout, stderr, exit: code ?? signal, timedOut });
		});
		child.stdin.on("error", () => {});
		child.stdin.end(prompt);
	});
}

/**
 * 运行记录看不看得出用了技能。stream-json（Claude Code）的开头会列出所有可用技能，所以只看工具调用：
 * 调 Skill、读技能目录里的文件、跑技能的命令行，输入里带 design-pipeline 才算。其他客户端只有文字输出，按文字找。
 */
export function skillUsedIn(stdout, stderr = "") {
	const events = stdout.split("\n").flatMap((line) => {
		try {
			const event = JSON.parse(line);
			return event && typeof event === "object" && event.type ? [event] : [];
		} catch {
			return [];
		}
	});
	if (!events.length) return /design-pipeline|designer-pipeline/.test(`${stdout}\n${stderr}`);
	return events.some((event) => (event.message?.content ?? []).some((item) => item?.type === "tool_use" && /design-pipeline|designer-pipeline/.test(JSON.stringify(item.input ?? {}))));
}

/** 运行记录里代理“动过”的文字：stream-json 时是全部工具调用的输入，其他客户端是全部输出。 */
export function toolText(stdout, stderr = "") {
	const events = stdout.split("\n").flatMap((line) => {
		try {
			const event = JSON.parse(line);
			return event && typeof event === "object" && event.type ? [event] : [];
		} catch {
			return [];
		}
	});
	if (!events.length) return `${stdout}\n${stderr}`;
	return events.flatMap((event) => (event.message?.content ?? []).filter((item) => item?.type === "tool_use").map((item) => JSON.stringify(item.input ?? {}))).join("\n");
}

/**
 * 每层有没有被读到：运行记录的工具调用里出现了这一层（在完整技能里）的某个文件或目录，就算读到。
 * 返回读到的层 id，以及有没有跑过 `designer-pipeline ... next`。
 */
export function exposure(stdout, stderr, layers) {
	const text = toolText(stdout, stderr);
	const layersRead = layers.filter((layer) => layer.remove.some((path) => text.includes(path.endsWith("/") ? path : path))).map((layer) => layer.id);
	const nextRan = /designer-pipeline\.cjs["']?\s+next\b/.test(text);
	return { layersRead, nextRan };
}

export const median = (values) => {
	if (!values.length) return null;
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/** 四分位（线性插值）。 */
export const quantile = (values, q) => {
	if (!values.length) return null;
	const sorted = [...values].sort((a, b) => a - b);
	const at = (sorted.length - 1) * q;
	const low = Math.floor(at);
	return sorted[low] + (sorted[Math.min(sorted.length - 1, low + 1)] - sorted[low]) * (at - low);
};

/** 可复现的伪随机数（mulberry32），盲评打乱顺序用。 */
export function seeded(seed) {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
