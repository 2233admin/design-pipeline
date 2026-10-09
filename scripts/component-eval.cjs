"use strict";

const { StringDecoder } = require("node:string_decoder");
const fs = require("node:fs"), path = require("node:path"), http = require("node:http"), crypto = require("node:crypto");
const { spawn, spawnSync } = require("node:child_process");
const { sha256, canonicalJson, resolveInside } = require("../skill/scripts/contract-utils.cjs");
const { createInitialState, writeNewChange, createEvent, eventLine, commitStateAndEvents, inspectConsistency } = require("../skill/scripts/pipeline-state-core.cjs");
const { validatePlan } = require("../skill/scripts/plan-core.cjs");
const { createArtifactMetadata, validateArtifactMetadata } = require("../skill/scripts/artifact-core.cjs");
const { invalidateDownstream } = require("../skill/scripts/invalidation-core.cjs");

const now = () => new Date().toISOString();
const writeJson = (file, value) => fs.writeFileSync(file, canonicalJson(value));
const readJson = file => JSON.parse(fs.readFileSync(file, "utf8"));
function treeHash(root) {
  const rows = [];
  function walk(dir) { for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) { const file = path.join(dir, entry.name); if (entry.isSymbolicLink()) throw error("INPUT_LINK", "冻结工具输入不能包含外部链接"); if (entry.isDirectory()) walk(file); else rows.push([path.relative(root, file).replaceAll("\\", "/"), sha256(fs.readFileSync(file))]); } }
  walk(root); return sha256(canonicalJson(rows));
}
function error(code, message, status = 409) { return Object.assign(new Error(message), { code, status }); }
function safePath(root, raw, mustExist = true) {
  let target;
  try { target = resolveInside(root, raw, "component file", { mustExist }); } catch { throw error("PATH_ESCAPE", "文件不在允许范围内", 403); }
  let existing = target; while (!fs.existsSync(existing)) existing = path.dirname(existing);
  const relative = path.relative(fs.realpathSync(root), fs.realpathSync(existing));
  if (path.isAbsolute(relative) || relative === ".." || relative.startsWith(`..${path.sep}`)) throw error("PATH_ESCAPE", "文件链接超出允许范围", 403);
  return target;
}
function sourceFiles(root) {
  const files = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (["node_modules", "toolkit", "reference", "results", "task.json", "prompt.md", "brief.md", "package.json"].includes(entry.name)) continue;
      const full = path.join(dir, entry.name); if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) walk(full);
      else if (/\.(?:html|js|mjs|cjs|css|json|md|png|jpe?g|webp|svg|glb|gltf|glsl|vert|frag|wgsl)$/i.test(entry.name)) files.push(path.relative(root, full).replaceAll("\\", "/"));
      if (files.length > 2000) throw error("FILE_LIMIT", "当前组件源文件过多");
    }
  }
  walk(root); return files.sort();
}
function snapshot(from, to) {
  fs.mkdirSync(to, { recursive: true });
  const files = sourceFiles(from);
  for (const file of files) { const target = path.join(to, file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(path.join(from, file), target); }
  return files;
}
const TASKS = [
  ["reference", "参考拆解", "只观察参考：列出五层结构、圆环与三片嵌片的关系、蓝釉／银色／虹彩的区别、仍不确定的尺寸和照明。不要编造精确测量，不制作完整徽章。", false],
  ["geometry", "灰模与结构", "用灰色材质实现五层实体徽章。对齐六边形轮廓、厚度、倒角、交错圆环、三片嵌片和闭合叠层，保留未确认尺寸说明；这一任务只解决结构和视角。", true],
  ["enamel", "蓝色釉面", "在已确认几何上只制作蓝色非金属釉面：明暗、clearcoat、随视角移动的高光和固定在物体空间的微小纹理。保留几何；不要用时钟彩虹或双重色彩转换代替釉面。", false],
  ["silver", "银色掐丝", "只校准银色金属掐丝的粗细、粗糙度和环境反射。保留已确认的几何与蓝釉。不要新增整圈粗圆环来代替参考交错结构。", false],
  ["inlay", "虹彩镶片", "只制作三片青紫虹彩镶片。颜色变化基于视角／表面方向，空间纹理固定；观察参考的饱和度与明暗，保留其他结构与材质。", false],
  ["materials", "材质合成验收", "将三类材质与照明放在同一固定视角对照。检查釉面、金属和镶片的区别，修正整体失衡；保留结构，不扩展整段动画。", true],
  ["motion", "动作与控制", "材质已验收后实现五层拆合、转动和层号。使用给定姿态表时明确其为历史估计；实现31.158333秒定位、实际播放、复位和reduced-motion初始静止，只有一个动画时钟。", true]
];
function buildTasks() { return TASKS.map(([id, title, goal, review], i) => ({ id, title, goal, requiresReview: review, dependsOn: i ? [TASKS[i - 1][0]] : [], deliverables: id === "reference" ? ["reference.md"] : ["index.html", "front.png", "side.png"], status: "pending", attempts: [] })); }

function redact(value) {
  return String(value ?? "").replace(/Bearer\s+[^\s"']+/gi, "Bearer [redacted]").replace(/(["']?(?:api[_-]?key|password|authorization|cookie|secret|access[_-]?token|refresh[_-]?token)["']?\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi, "$1[redacted]");
}
function publicValue(value) {
  if (typeof value === "string") return redact(value).slice(0, 16000);
  if (Array.isArray(value)) return value.map(publicValue);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([key]) => !/thinking|reasoning|secret|password|api.?key|authorization|cookie|token$/i.test(key)).map(([key, item]) => [key, publicValue(item)]));
  return value;
}
function publicText(content) { return Array.isArray(content) ? redact(content.filter(part => part.type === "text").map(part => part.text || "").join("\n")).slice(0, 16000) : ""; }
function projectEvent(event) {
  if (!event || typeof event !== "object") return null;
  const timestamp = event.timestamp || event.message?.timestamp || null;
  if (event.type === "tool_execution_start") return { kind: "tool-start", callId: event.toolCallId, tool: event.toolName, args: publicValue(event.args || {}), timestamp };
  if (event.type === "tool_execution_end") return { kind: "tool-end", callId: event.toolCallId, tool: event.toolName, isError: !!event.isError, text: publicText(event.result?.content), timestamp };
  if (["message_start", "message_end"].includes(event.type) && event.message?.role === "assistant") {
    const message = event.message;
    return { kind: event.type === "message_end" ? "assistant" : "model", actualModel: message.provider && message.model ? `${message.provider}/${message.model}` : null, text: event.type === "message_end" ? publicText(message.content) : "", usage: message.usage ? Object.fromEntries(["input", "output", "cacheRead", "cacheWrite", "totalTokens"].map(key => [key, Number.isFinite(message.usage[key]) ? message.usage[key] : null])) : null, stopReason: message.stopReason || null, error: redact(message.errorMessage || ""), timestamp };
  }
  if (event.type === "retry_fallback_applied") return { kind: "fallback", from: publicValue(event.from), to: publicValue(event.to), text: redact(event.reason), timestamp };
  return null;
}
function jsonLines(onEvent, onError = () => {}) {
  const decoder = new StringDecoder("utf8"); let buffer = "", line = 0;
  function consume(final = false) {
    let end;
    while ((end = buffer.indexOf("\n")) >= 0 || final && buffer.length) {
      const text = end < 0 ? buffer : buffer.slice(0, end); buffer = end < 0 ? "" : buffer.slice(end + 1); line++;
      if (!text.trim()) continue;
      let value; try { value = JSON.parse(text); } catch (error) { onError({ line, text: "事件行无法解析", error: error.name }); continue; }
      onEvent(value);
    }
    if (buffer.length > 16 * 1024 * 1024) { buffer = ""; onError({ line, text: "单条事件超过读取上限" }); }
  }
  return { push(chunk) { buffer += decoder.write(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)); consume(); }, end() { buffer += decoder.end(); consume(true); } };
}

class Workbench {
  constructor(options) {
    this.options = options; this.root = path.resolve(options.root); this.runtimeRoot = path.resolve(options.runtimeRoot || path.join(this.root, "component-workbench"));
    this.privateRoot = path.resolve(options.privateRoot || path.join(__dirname, "../.design-pipeline/component-eval-private"));
    this.referenceRoot = path.resolve(options.referenceRoot || (fs.existsSync(path.join(this.root, "reference")) ? path.join(this.root, "reference") : path.join(this.root, "../reference")));
    this.previewBase = (options.previewBase || "http://127.0.0.1:47831").replace(/\/$/, "");
    this.mediaRoot = path.resolve(options.mediaRoot || path.join(this.root, ".."));
    this.token = crypto.randomBytes(24).toString("hex"); this.active = null; this.pumping = null; this.server = null; this.closed = false;
    this.runs = new Map(); this.historyCache = new Map();
    fs.mkdirSync(this.runtimeRoot, { recursive: true }); fs.mkdirSync(this.privateRoot, { recursive: true });
    this.lockFile = path.join(this.runtimeRoot, ".server.lock");
    if (fs.existsSync(this.lockFile)) {
      const owner = readJson(this.lockFile); let alive = true; try { process.kill(owner.pid, 0); } catch (e) { if (e.code === "ESRCH") alive = false; }
      if (alive) throw error("LOCKED", "此评测目录已有运行服务"); fs.unlinkSync(this.lockFile);
    }
    fs.writeFileSync(this.lockFile, JSON.stringify({ pid: process.pid }), { flag: "wx" });
    try { for (const entry of fs.readdirSync(this.runtimeRoot, { withFileTypes: true })) {
      if (!entry.isDirectory() || !/^badge-[a-f0-9]+$/.test(entry.name)) continue;
      const dir = safePath(this.runtimeRoot, entry.name), state = readJson(path.join(dir, "state.json"));
      if (inspectConsistency(state, fs.readFileSync(path.join(dir, "events.jsonl"), "utf8")).status !== "consistent") throw error("STATE_INCONSISTENT", "状态与事件不一致，需要核对");
      const run = state.extensions.componentEval; this.runs.set(run.id, run);
      if (["running", "verifying"].includes(run.status)) { run.status = "inconclusive"; run.notice = "服务重启，先前进程状态未核实；没有自动重派"; for (const task of run.tasks) if (["running", "verifying"].includes(task.status)) task.status = "inconclusive"; this.save(run, "component-recovery", run.notice); }
    } } catch (e) { fs.unlinkSync(this.lockFile); throw e; }
  }
  histories() {
    const matrix = readJson(path.join(this.root, "comparison-matrix.json"));
    return (matrix.runs || []).filter(r => r.scenario === "component").map(r => ({ ...r, id: "history-" + sha256(r.id).slice(0, 14), sourceId: r.id, kind: "history", actualModels: r.provenance?.actual || [], title: r.selector, toolkitHash: r.toolkitSha256 || matrix.toolkitSha256, visualAcceptance: "历史评分保留在原评分页" }));
  }
  list() { return [...this.runs.values()].map(run => ({ ...run, kind: "live" })).reverse().concat(this.histories()); }
  get(id) { const run = this.runs.get(id); if (!run) throw error("NOT_FOUND", "运行不存在", 404); return run; }
  runRoot(run) { return safePath(this.runtimeRoot, run.id); }
  taskPlan(run) {
    const plan = { schema: "design-pipeline.design-plan.v1", schema_version: 1, plan_id: run.id, input_hash: "sha256:" + run.inputHash, mode: "clone", fidelity: "exact", phases: run.tasks.map(task => ({ id: task.id, depends_on: task.dependsOn, inputs: task.dependsOn, outputs: [task.attempts.at(-1)?.artifact?.path || `pending/${task.id}.json`], gates: [], goal: task.goal })) };
    validatePlan(plan); return plan;
  }
  save(run, type, summary) {
    const dir = this.runRoot(run), stateFile = path.join(dir, "state.json"), eventsFile = path.join(dir, "events.jsonl");
    const state = readJson(stateFile), event = createEvent(state, { timestamp: now(), type, summary });
    state.extensions.componentEval = run; state.revision++; state.lastEventSeq = event.seq; state.updatedAt = event.ts;
    state.status = run.status === "complete" ? "complete" : ["failed", "stopped", "inconclusive", "awaiting-review", "stale"].includes(run.status) ? "blocked" : "implementing";
    // ponytail: one service owns this directory; split writers need the shared CAS/lock entry point.
    commitStateAndEvents(stateFile, eventsFile, state, fs.readFileSync(eventsFile, "utf8") + eventLine(event));
    writeJson(path.join(dir, "plan.json"), this.taskPlan(run));
  }
  createRun(input) {
    if (!input || typeof input !== "object") throw error("INPUT_INVALID", "请求内容无效", 400);
    if (!this.histories().some(r => r.selector === input.model)) throw error("MODEL_REQUIRED", "请选择已登记模型", 400);
    if (!["tool", "direct"].includes(input.treatment)) throw error("TREATMENT_REQUIRED", "请选择工具版或直接版", 400);
    if (input.treatment === "tool" && !this.options.toolkitRoot) throw error("TOOLKIT_MISSING", "未配置冻结工具快照", 400);
    const referenceFiles = ["front.png", "exploded.png", "side.png", "contact-sheet.png"].map(name => [name, safePath(this.referenceRoot, name)]);
    const poses = path.resolve(this.root, "../poses.json"); if (fs.existsSync(poses)) referenceFiles.push(["poses.json", poses]);
    const referenceHashes = Object.fromEntries(referenceFiles.map(([name, file]) => [name, sha256(fs.readFileSync(file))]));
    const toolkitHash = input.treatment === "tool" ? treeHash(this.options.toolkitRoot) : null;
    const runtime = Object.fromEntries(["three", "gsap"].map(name => [name, this.options.modulesRoot ? readJson(path.join(this.options.modulesRoot, name, "package.json")).version : null]));
    const id = "badge-" + crypto.randomBytes(7).toString("hex"), dir = path.join(this.runtimeRoot, id); fs.mkdirSync(dir);
    fs.mkdirSync(path.join(dir, "reference")); for (const [name, file] of referenceFiles) fs.copyFileSync(file, path.join(dir, "reference", name));
    const commonInputHash = sha256(canonicalJson({ referenceHashes, runtime, goals: TASKS, tokenLimit: null, timeLimitSec: null }));
    const inputHash = sha256(canonicalJson({ commonInputHash, model: input.model, treatment: input.treatment, toolkitHash }));
    const run = { id, kind: "live", title: "珐琅徽章组件", selector: input.model, treatment: input.treatment, actualModels: [], inputHash, commonInputHash, referenceHashes, runtime, createdAt: now(), status: "ready", tokenLimit: null, timeLimitSec: null, totalTokens: null, tasks: input.treatment === "tool" ? buildTasks().slice(0, 1) : buildTasks(), toolkitHash, dispatchVersion: 2 };
    const state = createInitialState({ changeId: id, timestamp: now(), phase: "implementation", status: "implementing" }); state.extensions.componentEval = run;
    writeNewChange(path.join(dir, "state.json"), path.join(dir, "events.jsonl"), state); this.runs.set(id, run); this.save(run, "component-created", "已创建单一徽章组件任务，等待显式启动"); return run;
  }
  assetUrl(file) {
    const relative = path.relative(this.mediaRoot, file); if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
    return this.previewBase + "/" + relative.split(path.sep).map(encodeURIComponent).join("/");
  }
  detail(id) {
    if (id.startsWith("history-")) {
      const run = this.histories().find(r => r.id === id); if (!run) throw error("NOT_FOUND", "历史运行不存在", 404);
      const dir = safePath(this.root, run.assetBase || "runs/" + run.sourceId);
      const prompt = fs.existsSync(path.join(dir, "prompt.md")) ? redact(fs.readFileSync(path.join(dir, "prompt.md"), "utf8")) : "历史派发输入缺失";
      return { run, prompt, previewUrl: fs.existsSync(path.join(dir, "index.html")) ? this.assetUrl(path.join(dir, "index.html")) : null, sourceFiles: sourceFiles(dir), referenceUrl: this.previewBase + "/reference/original.mp4", historical: true };
    }
    const run = this.get(id); return { run, referenceUrl: this.previewBase + "/reference/original.mp4", historical: false };
  }
  events(id, cursor = 0, limit = 120) {
    cursor = Number(cursor); if (!Number.isInteger(cursor) || cursor < 0) throw error("CURSOR_INVALID", "事件游标无效", 400);
    let list;
    if (id.startsWith("history-")) {
      const run = this.detail(id).run, dir = safePath(this.root, run.assetBase || "runs/" + run.sourceId), file = path.join(dir, "events.jsonl");
      if (!this.historyCache.has(id)) {
        const records = [], parser = jsonLines(e => { const item = projectEvent(e); if (item) records.push({ ...item, seq: records.length + 1, source: "omp-history", receivedAt: null }); });
        if (fs.existsSync(file)) { parser.push(fs.readFileSync(file)); parser.end(); } this.historyCache.set(id, records);
      }
      list = this.historyCache.get(id);
    } else {
      this.get(id); const file = path.join(this.privateRoot, id, "public-events.jsonl"); list = [];
      // ponytail: scan one case's projection; byte-offset indexing if long sessions outgrow this.
      if (fs.existsSync(file)) for (const line of fs.readFileSync(file, "utf8").split("\n")) if (line) list.push(JSON.parse(line));
    }
    const rows = list.slice(cursor, cursor + Math.min(200, limit)); return { events: rows, cursor: cursor + rows.length, total: list.length, hasMore: cursor + rows.length < list.length };
  }
  publicEvent(run, attempt, event) {
    const item = projectEvent(event); if (!item) return;
    const file = path.join(this.privateRoot, run.id, "public-events.jsonl");
    attempt.eventCount = (attempt.eventCount || 0) + 1; run.eventCount = (run.eventCount || 0) + 1; attempt.lastEventAt = now();
    const record = { ...item, seq: run.eventCount, source: "omp-live", taskId: attempt.taskId, attemptId: attempt.id, receivedAt: attempt.lastEventAt };
    fs.appendFileSync(file, JSON.stringify(record) + "\n");
    if (item.actualModel && !run.actualModels.includes(item.actualModel)) run.actualModels.push(item.actualModel);
    if (item.actualModel && !attempt.actualModels.includes(item.actualModel)) attempt.actualModels.push(item.actualModel);
    if (item.actualModel && item.actualModel !== run.selector || item.kind === "fallback") attempt.failureCode = "MODEL_MISMATCH";
    if (item.kind === "assistant") { attempt.responseSeen = !!item.actualModel; attempt.lastStopReason = item.stopReason; if (item.error || item.stopReason === "error") { attempt.failureCode ||= "PROVIDER_ERROR"; attempt.failure = item.error || "模型返回错误"; } if (item.usage?.totalTokens !== null && Number.isFinite(item.usage?.totalTokens)) { attempt.totalTokens = (attempt.totalTokens || 0) + item.usage.totalTokens; run.totalTokens = (run.totalTokens || 0) + item.usage.totalTokens; } }
    if (item.kind === "tool-start" && typeof item.args?.path === "string") {
      const target = path.resolve(attempt.cwd, item.args.path), allowed = [attempt.cwd, run.treatment === "tool" ? this.options.toolkitRoot : null, this.options.modulesRoot].filter(Boolean);
      if (!allowed.some(root => { const r = path.relative(path.resolve(root), target); return !r.startsWith("..") && !path.isAbsolute(r); })) { attempt.scopeWarnings ||= []; attempt.scopeWarnings.push("工具路径超出任务范围：" + redact(item.args.path)); }
    }
    if (item.kind === "tool-end") attempt.sourceFiles = sourceFiles(attempt.cwd);
    this.save(run, "component-action", `${attempt.taskId}: ${item.kind}${item.tool ? " " + item.tool : ""}`);
  }
  pipeline(run, action, args = []) {
    const completes = action === "decide" && args[args.indexOf("--verdict") + 1] === "complete";
    if (completes) {
      args = [...args];
      if (this.options.chromePath && !args.includes("--chrome")) args.push("--chrome", this.options.chromePath);
      if (this.options.puppeteerModule && !args.includes("--puppeteer-module")) args.push("--puppeteer-module", this.options.puppeteerModule);
    }
    const result = spawnSync(process.execPath, [path.join(this.options.toolkitRoot, "scripts/designer-pipeline.cjs"), action, "--change-root", ".", ...args, "--json"], { cwd: this.runRoot(run), windowsHide: true, encoding: "utf8", maxBuffer: 8 * 1024 * 1024, timeout: completes ? 75000 : 30000 });
    let value; try { value = JSON.parse(result.stdout); } catch { throw error("PIPELINE_FAILED", "工具入口未返回有效结果：" + redact(result.stderr || result.error?.message || "")); }
    run.eventCount = (run.eventCount || 0) + 1;
    const record = { seq: run.eventCount, kind: "tool-end", source: "design-pipeline-dispatcher", tool: action, args, taskId: value.task?.id || value.taskId || "reference", text: JSON.stringify(publicValue(value)), isError: result.status !== 0, timestamp: now(), receivedAt: now() };
    const file = path.join(this.privateRoot, run.id, "public-events.jsonl"); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.appendFileSync(file, JSON.stringify(record) + "\n");
    this.save(run, "component-pipeline", "工具实际调用 " + action);
    if (!value.ok || ![0, 2].includes(result.status)) throw error(value.error?.code || "PIPELINE_FAILED", value.error?.message || "工具入口失败");
    return value;
  }
  loadVisualPlan(run, attempt) {
    const file = path.join(attempt.cwd, "tasks-plan.json");
    if (!fs.existsSync(file)) throw error("TASK_PLAN_MISSING", "参考阶段没有交付具体任务拆解 tasks-plan.json，不能派发整块灰模");
    safePath(attempt.cwd, "tasks-plan.json");
    const plan = validatePlan(readJson(file), { requireVisualTasks: true });
    if (plan.input_hash !== "sha256:" + run.commonInputHash) throw error("TASK_INPUT_MISMATCH", "任务拆解没有绑定本次固定参考输入");
    for (const [index, phase] of plan.phases.entries()) {
      if (!/^[a-z][a-z0-9_-]{0,63}$/.test(phase.id) || phase.id === "reference") throw error("TASK_ID_INVALID", "细任务需要独立、可定位的ID");
      const prefix = `results/${phase.id}/`;
      if (!phase.outputs.includes(prefix + "index.html") || phase.outputs.some(file => !file.startsWith(prefix)) || phase.visual.checks.length !== 1 || phase.visual.checks[0] !== prefix + "technical-check.json") throw error("TASK_OUTPUT_INVALID", "每个细任务须使用自己的 results/<id>/index.html 和独立 technical-check.json");
      if (phase.visual.scope.some(file => /^(?:reference|toolkit|node_modules|prompt\.md|brief\.md|task\.json)(?:\/|$)/.test(file))) throw error("TASK_SCOPE_INVALID", "修改范围包含固定输入");
      for (const guide of phase.visual.guides) safePath(this.options.toolkitRoot, guide);
      const category = phase.visual.property.split(".")[0], lastInCategory = !plan.phases.slice(index + 1).some(next => next.visual.property.split(".")[0] === category);
      phase.visual.review = phase.visual.review === true || lastInCategory && ["geometry", "materials", "motion"].includes(category);
    }
    if (!plan.phases.some(phase => phase.visual.property.startsWith("geometry."))) throw error("TASK_GEOMETRY_MISSING", "拆解须先包含可单独检查的几何属性，如 geometry.contour 或 geometry.depth");
    const root = this.runRoot(run);
    for (const guide of new Set(plan.phases.flatMap(phase => phase.visual.guides))) {
      const source = safePath(this.options.toolkitRoot, guide), target = safePath(root, guide, false);
      if (!fs.statSync(source).isFile()) throw error("GUIDE_INPUT_INVALID", "能力指南必须指向实际文件：" + guide);
      if (fs.existsSync(target)) {
        if (!fs.statSync(target).isFile() || sha256(fs.readFileSync(target)) !== sha256(fs.readFileSync(source))) throw error("GUIDE_INPUT_CONFLICT", "能力指南不能覆盖已有的不同输入：" + guide);
      } else {
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.copyFileSync(source, target, fs.constants.COPYFILE_EXCL);
      }
    }
    fs.copyFileSync(path.join(attempt.cwd, "reference.md"), path.join(root, "reference.md"));
    const plannedOutputs = new Set(plan.phases.flatMap(phase => phase.outputs));
    for (const input of new Set(plan.phases.flatMap(phase => phase.inputs))) {
      if (plannedOutputs.has(input)) continue;
      const source = safePath(attempt.cwd, input), target = safePath(root, input, false);
      if (fs.existsSync(target)) {
        if (!fs.statSync(target).isFile() || sha256(fs.readFileSync(target)) !== sha256(fs.readFileSync(source))) throw error("TASK_INPUT_CONFLICT", "任务输入不能覆盖已有的不同文件：" + input);
      } else { fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(source, target, fs.constants.COPYFILE_EXCL); }
    }
    writeJson(path.join(root, "visual-plan.json"), plan);
    run.tasks = [run.tasks[0], ...plan.phases.map(phase => {
      return { id: phase.id, title: phase.goal, goal: phase.goal, visual: phase.visual, requiresReview: phase.visual.review === true, dependsOn: phase.depends_on.length ? phase.depends_on : ["reference"], deliverables: ["index.html", "front.png", "side.png"], status: "pending", attempts: [] };
    })];
    run.visualPlan = "visual-plan.json";
    if (!fs.existsSync(path.join(root, ".git"))) {
      if (readJson(path.join(root, "state.json")).extensions.visualTasks?.active) throw error("TASK_BASELINE_MISSING", "已有任务窗口不能通过新建Git基线清除，请修复原窗口");
      // This fresh, owned benchmark repository observes promoted outputs. Attempt scratch
      // remains subject to the existing input/scope checks, not a Git write-containment claim.
      fs.writeFileSync(path.join(root, ".gitignore"), "/attempts/\n/plan.json\n", { flag: "wx" });
      for (const args of [["init", "-q", "-b", "codex/component-eval"], ["add", "."], ["-c", "user.name=Component evaluation", "-c", "user.email=component-eval@example.invalid", "commit", "--no-gpg-sign", "-qm", "Freeze native evaluation inputs"]]) {
        const git = spawnSync("git", ["-C", root, ...args], { windowsHide: true, encoding: "utf8", timeout: 30000 });
        if (git.status !== 0) throw error("TASK_GIT_MISSING", "无法建立本次独立评测的Git基线：" + redact(git.stderr || git.error?.message || ""));
      }
    }
    const action = this.pipeline(run, "next", ["--plan", run.visualPlan]);
    if (action.status === "blocked") throw error("TASK_BLOCKED", action.blockers?.join("; ") || "原生细任务缺少可执行检查绑定");
    if (action.stage !== "visual-task") throw error("TASK_DISPATCH_INVALID", "冻结工具没有返回当前细任务");
  }
  sealVisual(run, task, attempt, capture) {
    const root = this.runRoot(run), phase = attempt.pipelineAction.task, prefix = `results/${task.id}/`;
    const outputs = phase.outputs.map(file => ({ source: safePath(attempt.cwd, file.slice(prefix.length)), target: safePath(root, file, false) }));
    for (const { target } of outputs) {
      const leaf = fs.lstatSync(target, { throwIfNoEntry: false });
      if (leaf && (leaf.isSymbolicLink() || !leaf.isFile() || fs.statSync(target, { bigint: true }).nlink > 1n)) throw error("OUTPUT_COLLISION", "任务交付目标不能覆盖已有链接或其它文件实体");
      for (let parent = path.dirname(target); path.relative(root, parent); parent = path.dirname(parent)) {
        if (fs.lstatSync(parent, { throwIfNoEntry: false })?.isSymbolicLink()) throw error("OUTPUT_COLLISION", "任务交付目标不能通过链接目录写入");
      }
    }
    for (const { source, target } of outputs) {
      fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(source, target);
    }
    attempt.completionPath = attempt.pipelineAction.metadataPath;
  }
  completeVisual(run, task, attempt) {
    const result = this.pipeline(run, "decide", ["--plan", run.visualPlan, "--choice", task.id, "--verdict", "complete", "--artifact", attempt.completionPath]);
    if (result.status !== "recorded") throw error("TASK_EVIDENCE_FAILED", result.failure || "细任务证据未通过");
    attempt.nativeArtifacts = readJson(safePath(this.runRoot(run), attempt.completionPath));
  }
  acceptVisual(run, task, attempt) {
    this.verifyArtifact(run, attempt);
    if (attempt.review?.verdict !== "accept" || attempt.review.valid !== true || attempt.review.artifactHash !== attempt.artifactHash) throw error("REVIEW_REQUIRED", "请先验收当前视觉节点的准确版本");
    const accepted = this.pipeline(run, "decide", ["--plan", run.visualPlan, "--choice", task.id, "--verdict", "accept", "--artifact", attempt.completionPath]);
    if (accepted.status !== "recorded") throw error("TASK_REVIEW_FAILED", accepted.failure || "人工意见未绑定当前证据");
  }
  prepareAttempt(run, task) {
    if (run.treatment === "tool" && treeHash(this.options.toolkitRoot) !== run.toolkitHash) throw error("TOOLKIT_CHANGED", "工具输入已改变，请创建新运行以保留版本区别");
    const id = task.id + "-" + crypto.randomBytes(5).toString("hex"), attemptRoot = path.join(this.runRoot(run), "attempts", id), cwd = path.join(attemptRoot, "work"); fs.mkdirSync(cwd, { recursive: true });
    const previous = task.attempts.at(-1), predecessor = run.tasks.find(t => t.id === task.dependsOn[0])?.attempts.at(-1);
    const seed = previous || (run.dispatchVersion === 2 && task.visual ? run.tasks.filter(t => ["completed", "accepted"].includes(t.status)).at(-1)?.attempts.at(-1) : predecessor);
    if (seed) { const after = path.join(this.runRoot(run), "attempts", seed.id, "after"); if (fs.existsSync(after)) snapshot(after, cwd); else if (fs.existsSync(seed.cwd)) snapshot(seed.cwd, cwd); }
    const referenceDir = path.join(cwd, "reference"); fs.mkdirSync(referenceDir);
    for (const [name, digest] of Object.entries(run.referenceHashes)) { const file = safePath(path.join(this.runRoot(run), "reference"), name); if (sha256(fs.readFileSync(file)) !== digest) throw error("REFERENCE_CHANGED", "运行的参考输入已改变"); fs.copyFileSync(file, path.join(referenceDir, name)); }
    if (this.options.modulesRoot) fs.symlinkSync(this.options.modulesRoot, path.join(cwd, "node_modules"), "junction");
    if (run.treatment === "tool") { if (!this.options.toolkitRoot) throw error("TOOLKIT_MISSING", "未配置冻结工具快照"); fs.symlinkSync(this.options.toolkitRoot, path.join(cwd, "toolkit"), "junction"); }
    const brief = "唯一案例：原片中的蓝色六边形五层珐琅徽章，交错银色圆环与三片青紫镶片。参考像素仅供观察，不可当输出贴图。几何、釉面、金属、镶片与运动分阶段处理。\n当前任务：" + task.title + "\n" + task.goal;
    let pipelineAction = null;
    if (run.treatment === "tool" && run.dispatchVersion === 2) {
      pipelineAction = this.pipeline(run, "next", run.visualPlan ? ["--plan", run.visualPlan] : []);
      if (task.id === "reference" && pipelineAction.stage !== "decompose" || task.id !== "reference" && pipelineAction.task?.id !== task.id) throw error("TASK_DISPATCH_INVALID", "冻结工具与当前细任务不一致，请先更新工具快照");
      if (task.id === "reference") pipelineAction.template = {
        ...pipelineAction.template, plan_id: run.id, input_hash: "sha256:" + run.commonInputHash,
        phases: [{ id: "outline", goal: "只对齐正面轮廓", depends_on: [], inputs: ["reference.md", "outline-probe.json"], outputs: ["results/outline/index.html"], gates: [], visual: { target: "outer-shell", property: "geometry.contour", references: ["reference/front.png"], scope: ["index.html"], guides: ["references/3d-spec.md", "references/reconstruction-spec.md"], checks: ["results/outline/technical-check.json"], verification: [{ kind: "interaction", probe: "outline-probe.json", target: "results/outline/index.html", check: "results/outline/technical-check.json" }] } }]
      };
    }
    const boundInputs = Object.keys(pipelineAction?.inputHashes || {}).filter(file => file !== "$plan" && file !== "$task");
    for (const file of boundInputs) { const output = safePath(cwd, file, false); fs.mkdirSync(path.dirname(output), { recursive: true }); fs.copyFileSync(safePath(this.runRoot(run), file), output); }
    const guide = run.treatment === "tool" ? '工具版：读 toolkit/SKILL.md，并执行当前任务列出的能力指南。需要技术路线时用 route --write 再按返回handoff准备toolchain request，不用手猜绑定输入。工具错误保留在 failure.md 和实际日志里。' : "直接版：使用同一参考与任务目标独立制作，不读取 design-pipeline 或其他任务作品。";
    const interfaces = task.id === "reference" ? "交付 reference.md：观察、结构关系、材质目标和明确未知。" : `交付可独立打开的 index.html 与本地源文件。默认入口只呈现当前徽章及已实现的交互；调参、拆层、模型记录和源码说明只在 ?inspect=1 检查入口显示。使用 Three.js 实体几何；每一视觉阶段提供 window.__ready=true、可定位并绘制的 window.sampleTime(t)，检查入口提供 input#yaw（改变视角）和 input#explode（改变层距），供外部截图验证。场景随容器尺寸变化。${task.id === "motion" || task.visual?.property.startsWith("motion.") ? "当前动作任务提供完整时间线与实际播放，默认播放并尊重减少动态效果偏好，检查入口提供button#play、button#reset。" : "当前任务保持可定位的静态场景，不扩展整段播放。"}源码图形需有真正WebGL渲染；保留之前阶段已认可内容。前侧截图与运行报告由独立检查器生成，你不能伪造检查通过或人工评分。`;
    const feedback = previous?.review?.feedback || previous?.failure || "无";
    const decomposition = pipelineAction && task.id === "reference" ? `\n同时交付 tasks-plan.json，复用下面工具返回的design-plan.v1模板。input_hash须为 sha256:${run.commonInputHash}。每项只写一项可观察属性，例如geometry.contour、geometry.depth、geometry.bevel，分别说明参考、改动范围和检查；不可用geometry.all合并整个灰模。先几何再材质、最后运动。references使用reference/中的文件，inputs可用reference.md；outputs使用results/<task-id>/index.html（可声明其他源文件），checks只写results/<task-id>/technical-check.json。每项显式交付本地interaction-probe.v1探针文件，把它列入inputs并用visual.verification绑定probe、当前output target和check；探针url相对探针文件指向该任务的results/<task-id>/index.html。只使用受支持的本地页面测量，不假定截图或报告标签等于技术通过。宿主会调用原生complete实际运行探针并生成报告与固定元数据，然后展示独立快照等待验收；模型不要伪造报告。各视觉关键节点用visual.review:true标明。\n${JSON.stringify(pipelineAction.template)}` : "";
    const currentTask = pipelineAction?.task ? `\n这是冻结产品入口返回的唯一当前任务（副本task.json），只改其scope，只解决其property，保留其他属性。读取visual.guides列出的每个toolkit资源、对应参考与上游源文件。输出先写当前目录index.html和所需源码，由宿主封存到task.outputs中的独立路径并生成检查。\n${JSON.stringify(pipelineAction.task)}` : "";
    const prompt = `${brief}\n\n${interfaces}\n\n${guide}${decomposition}${currentTask}\n\n输入：reference/ 中固定样帧与当前目录已复制的上游源文件；姿态表如果存在是历史估计。只做本任务，交付后退出等待下一步。\n上次反馈：${feedback}\n\n你只拥有当前目录的组件源文件、reference.md、tasks-plan.json、implementation.md、failure.md和本任务产物，不修改 brief.md、prompt.md、task.json、reference/、toolkit、node_modules或父目录。不要读取兄弟运行、旧复刻、认证文件或转储环境变量；不调用其他模型、网络、安装依赖或公开发布。不要启动后台服务。bash工具使用其支持的shell语法，node命令用相对路径；不要混用PowerShell/cmd内建命令。没有累计token或12分钟制作淘汰线。最后仅总结已执行的动作、真实错误与交付文件，不宣称用户验收通过。`;
    fs.writeFileSync(path.join(cwd, "brief.md"), brief); fs.writeFileSync(path.join(cwd, "prompt.md"), prompt);
    if (pipelineAction?.task) writeJson(path.join(cwd, "task.json"), pipelineAction);
    snapshot(cwd, path.join(attemptRoot, "before"));
    const inputs = [...new Set(["brief.md", "prompt.md", ...(pipelineAction?.task ? ["task.json"] : []), ...boundInputs, ...fs.readdirSync(referenceDir).map(name => "reference/" + name)])];
    const inputHashes = Object.fromEntries(inputs.map(file => [file, sha256(fs.readFileSync(path.join(cwd, file)))]));
    const args = ["-p", "--model", run.selector, "--thinking", "high", "--mode", "json", "--no-extensions", "--no-skills", "--no-rules", "--no-lsp", "--no-pty", "--no-title", "--no-prewalk", "--no-session", "--approval-mode=yolo", "--tools=read,write,edit,grep,glob,bash"];
    if (this.options.configFile) args.push("--config", this.options.configFile);
    args.push("@prompt.md", "@reference/front.png", "@reference/exploded.png", "@reference/side.png", "@reference/contact-sheet.png");
    const attempt = { id, taskId: task.id, cwd, prompt, promptHash: sha256(prompt), inputHashes, status: "running", startedAt: now(), command: { executable: this.options.executable || null, args }, parentAttempt: seed?.id || null, review: null, artifactHash: null, actualModels: [], ...(pipelineAction ? { pipelineAction } : {}) };
    task.attempts.push(attempt); writeJson(path.join(attemptRoot, "input-record.json"), { task: { id: task.id, goal: task.goal, deliverables: task.deliverables }, promptHash: attempt.promptHash, inputHashes, parentAttempt: attempt.parentAttempt, toolkitHash: run.toolkitHash }); return attempt;
  }
  verifyArtifact(run, attempt) {
    for (const id of run.tasks.find(t => t.id === attempt?.taskId)?.dependsOn || []) this.verifyArtifact(run, run.tasks.find(t => t.id === id).attempts.at(-1));
    if (!attempt?.artifact) throw error("ARTIFACT_MISSING", "阶段产物缺失");
    const root = this.runRoot(run), checks = [attempt.artifact, ...(attempt.artifacts || [])].map(a => validateArtifactMetadata(a, { changeRoot: root }));
    if (checks.some(result => result.status !== "ready")) {
      const invalid = invalidateDownstream(this.taskPlan(run), run.tasks.flatMap(t => t.attempts.at(-1)?.artifact ? [t.attempts.at(-1).artifact] : []), attempt.taskId);
      for (const task of run.tasks.filter(t => invalid.invalidatedPhases.includes(t.id))) { const latest = task.attempts.at(-1); if (!latest?.artifact) continue; latest.artifact = invalid.artifacts.find(a => a.path === latest.artifact.path); task.status = latest.status = "stale"; if (latest.review) { latest.review.valid = false; latest.review.invalidatedAt = now(); } }
      run.invalidated = invalid.invalidated; run.status = "stale"; run.notice = "产物已改变或缺失，旧验收不能继续使用"; this.save(run, "component-stale", run.notice); throw error("ARTIFACT_CHANGED", run.notice);
    }
  }
  seal(run, task, attempt, capture) {
    const root = this.runRoot(run), prefix = `attempts/${attempt.id}/work/`, outputs = task.id === "reference" ? ["reference.md"] : ["index.html", ...capture.files];
    const sources = sourceFiles(attempt.cwd), files = [...new Set([...outputs, ...sources])]; attempt.sourceFiles = sources;
    const parent = run.tasks.find(t => t.id === task.dependsOn[0])?.attempts.at(-1)?.artifact;
    const inputHashes = Object.fromEntries(Object.entries(attempt.inputHashes).map(([key, value]) => [key, "sha256:" + value])); if (parent) inputHashes.parent = parent.artifact_hash;
    attempt.artifacts = files.map(file => { safePath(attempt.cwd, file); return createArtifactMetadata({ path: prefix + file, producer: run.selector + ":" + attempt.id, input_hashes: inputHashes, dependencies: parent ? [parent.path] : [], created_at: now() }, { changeRoot: root }); });
    if (attempt.nativeArtifacts) attempt.artifacts.push(...attempt.nativeArtifacts, createArtifactMetadata({ path: attempt.completionPath, producer: "native-completion:" + attempt.id, input_hashes: attempt.pipelineAction.inputHashes, dependencies: attempt.nativeArtifacts.map(artifact => artifact.path), created_at: now() }, { changeRoot: root }));
    const manifestPath = `attempts/${attempt.id}/artifact.json`;
    writeJson(path.join(root, manifestPath), { taskId: task.id, attemptId: attempt.id, files: attempt.artifacts, engineering: capture, visualAcceptance: "not-evaluated" });
    attempt.artifact = createArtifactMetadata({ path: manifestPath, producer: run.selector + ":" + attempt.id, input_hashes: inputHashes, dependencies: parent ? [parent.path] : [], created_at: now() }, { changeRoot: root });
    attempt.artifactHash = attempt.artifact.artifact_hash; attempt.engineering = capture; attempt.previewUrl = task.id === "reference" ? null : this.assetUrl(path.join(attempt.cwd, "index.html"));
    attempt.images = (capture.files || []).filter(file => /\.png$/.test(file)).map(file => ({ file, url: this.assetUrl(path.join(attempt.cwd, file)) }));
  }
  async capture(context) {
    if (this.options.capture) return this.options.capture(context);
    if (!this.options.playwrightPath || !this.options.chromePath) throw error("CAPTURE_MISSING", "缺少外部浏览器截图配置，保留源码与日志");
    const { chromium } = require(this.options.playwrightPath); const result = { status: "failed", source: "external-browser", files: [], checks: [], errors: [], visualAcceptance: "not-evaluated" };
    const browser = await chromium.launch({ executablePath: this.options.chromePath, headless: true, args: ["--enable-webgl", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
    try {
      const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
      await page.addInitScript(() => { window.__evalShader = { compiled: 0, linked: 0, errors: [] }; for (const C of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) { if (!C) continue; const p = C.prototype, compile = p.compileShader, link = p.linkProgram; p.compileShader = function(s) { compile.call(this, s); window.__evalShader.compiled++; if (!this.getShaderParameter(s, this.COMPILE_STATUS)) window.__evalShader.errors.push(this.getShaderInfoLog(s)); }; p.linkProgram = function(s) { link.call(this, s); window.__evalShader.linked++; if (!this.getProgramParameter(s, this.LINK_STATUS)) window.__evalShader.errors.push(this.getProgramInfoLog(s)); }; } });
      page.on("pageerror", e => result.errors.push(redact(e.message))); page.on("console", m => { if (m.type() === "error") result.errors.push(redact(m.text())); });
      await page.goto(this.assetUrl(path.join(context.cwd, "index.html")) + "?inspect=1", { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForFunction(() => window.__ready === true && typeof window.sampleTime === "function", { timeout: 30000 }); await page.evaluate(() => window.sampleTime(0));
      await page.screenshot({ path: path.join(context.cwd, "front.png") }); result.files.push("front.png");
      await page.locator("#yaw").evaluate(el => { el.value = "35"; el.dispatchEvent(new Event("input", { bubbles: true })); });
      await page.screenshot({ path: path.join(context.cwd, "side.png") }); result.files.push("side.png");
      result.shader = await page.evaluate(() => window.__evalShader); if (!result.shader.compiled || !result.shader.linked || result.shader.errors.length || result.errors.length) throw error("RUNTIME_FAILED", "WebGL或页面运行检查失败");
      result.checks.push("独立浏览器加载、固定时间、两个视角、shader编译");
      if (context.task.id === "motion" || context.task.visual?.property.startsWith("motion.")) { await page.evaluate(() => window.sampleTime(.2)); const first = await page.locator("canvas").first().screenshot(); await page.locator("#play").click(); await page.waitForTimeout(750); const next = await page.locator("canvas").first().screenshot(); if (first.equals(next)) throw error("PLAYBACK_FAILED", "播放后画布没有推进"); result.checks.push("实际播放推进"); }
      result.status = "passed";
    } catch (e) { result.failure = redact(e.message); } finally { await browser.close(); writeJson(path.join(context.cwd, "technical-check.json"), result); }
    if (result.status !== "passed") throw Object.assign(error("RUNTIME_FAILED", result.failure), { evidence: result }); return result;
  }
  async start(id) {
    const run = this.get(id); if (this.closed) throw error("CLOSED", "服务已关闭"); if (this.active || this.pumping) throw error("BUSY", "当前只有一个活跃任务，请先处理当前运行");
    if (!this.options.executable && !this.options.spawnTask) throw error("OMP_MISSING", "未配置OMP执行器");
    if (run.tasks.some(t => t.status === "awaiting-review")) throw error("REVIEW_REQUIRED", "请先验收当前视觉节点");
    run.status = "ready"; this.pumping = this.pump(run).finally(() => { this.pumping = null; }); this.pumping.catch(() => {}); return this.detail(id);
  }
  async pump(run) {
    try {
      if (run.treatment === "tool" && run.dispatchVersion === 2) return await this.pumpVisual(run);
      for (const task of run.tasks) {
        if (this.closed || ["failed", "stopped", "awaiting-review", "stale"].includes(run.status)) return;
        if (task.status === "completed" || task.status === "accepted") continue;
        for (const depId of task.dependsOn) { const dep = run.tasks.find(t => t.id === depId); if (!["completed", "accepted"].includes(dep.status)) throw error("DEPENDENCY_WAIT", "上游任务尚未验收"); this.verifyArtifact(run, dep.attempts.at(-1)); }
        const attempt = this.prepareAttempt(run, task); task.status = "running"; run.status = "running"; this.save(run, "component-dispatched", "派发 " + task.title);
        await this.execute(run, task, attempt); if (attempt.status === "failed" || attempt.status === "stopped") return;
        if (task.requiresReview) { task.status = "awaiting-review"; attempt.status = "awaiting-review"; run.status = "awaiting-review"; this.save(run, "component-awaiting-review", task.title + "等待人工验收"); return; }
        task.status = "completed"; attempt.status = "completed"; run.status = "ready"; this.save(run, "component-task-complete", task.title + "已完成文件检查");
      }
      run.status = "complete"; this.save(run, "component-complete", "所有组件节点已完成并取得所需人工决定");
    } catch (e) { run.status = e.code === "ARTIFACT_CHANGED" ? "stale" : "failed"; run.notice = redact(e.message); this.save(run, "component-error", run.notice); }
  }
  async pumpVisual(run) {
    while (!this.closed && !["failed", "stopped", "awaiting-review", "stale"].includes(run.status)) {
      let task = run.tasks[0];
      if (task.status === "completed") {
        const next = this.pipeline(run, "next", ["--plan", run.visualPlan]);
        if (next.stage === "visual-review") {
          const checkpoint = run.tasks.find(item => item.id === next.task?.id), latest = checkpoint?.attempts.at(-1);
          if (!latest) throw error("TASK_DISPATCH_INVALID", "视觉校对缺少对应作品版本");
          this.verifyArtifact(run, latest);
          if (latest.review?.verdict === "accept" && latest.review.valid === true && latest.review.artifactHash === latest.artifactHash) {
            this.acceptVisual(run, checkpoint, latest); continue;
          }
          checkpoint.status = latest.status = run.status = "awaiting-review";
          this.save(run, "component-awaiting-review", checkpoint.title + "等待你校对当前画面"); return;
        }
        const progress = readJson(path.join(this.runRoot(run), "state.json")).extensions.visualTasks;
        for (const item of run.tasks.filter(item => item.visual)) {
          if (progress.completed[item.id]?.status === "ready") {
            const latest = item.attempts.at(-1);
            if (item.requiresReview && latest?.review?.verdict !== "accept") throw error("REVIEW_REQUIRED", "技术进度缺少对应的人工作品验收");
            item.status = latest.status = item.requiresReview ? "accepted" : "completed";
          } else if (["completed", "accepted"].includes(item.status)) { item.status = "stale"; if (item.attempts.at(-1)?.review) item.attempts.at(-1).review.valid = false; }
        }
        if (next.type === "done") { run.status = "complete"; this.save(run, "component-complete", "细任务技术证据与所需人工节点已完成"); return; }
        if (next.status === "blocked" || !next.task) throw error("TASK_BLOCKED", next.blockers?.join("; ") || "细任务输入尚未就绪");
        task = run.tasks.find(item => item.id === next.task.id);
        if (!task) throw error("TASK_DISPATCH_INVALID", "工具返回未登记的细任务");
      }
      for (const depId of task.dependsOn) {
        const dep = run.tasks.find(item => item.id === depId);
        if (!["completed", "accepted"].includes(dep?.status)) throw error("DEPENDENCY_WAIT", "当前细任务的上游尚未验收");
        this.verifyArtifact(run, dep.attempts.at(-1));
      }
      const attempt = this.prepareAttempt(run, task); task.status = run.status = "running"; this.save(run, "component-dispatched", "单独派发 " + task.title);
      await this.execute(run, task, attempt); if (["failed", "stopped"].includes(attempt.status)) return;
      if (task.requiresReview) { task.status = attempt.status = run.status = "awaiting-review"; this.save(run, "component-awaiting-review", task.title + "等待人工验收"); return; }
      task.status = attempt.status = "completed"; run.status = "ready"; this.save(run, "component-task-complete", task.title + "技术证据通过，未授予视觉接受");
    }
  }
  async execute(run, task, attempt) {
    const privateDir = path.join(this.privateRoot, run.id, attempt.id); fs.mkdirSync(privateDir, { recursive: true });
    const raw = fs.createWriteStream(path.join(privateDir, "omp-events.jsonl")), stderr = fs.createWriteStream(path.join(privateDir, "stderr.log"));
    let active;
    try {
      const child = this.options.spawnTask ? this.options.spawnTask({ cwd: attempt.cwd, task, attempt, run }) : spawn(this.options.executable, attempt.command.args, { cwd: attempt.cwd, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
      active = { runId: run.id, child, stopped: false }; this.active = active; attempt.pid = child.pid;
      const writes = [raw, stderr].map(stream => new Promise(resolve => { stream.once("finish", resolve); stream.once("error", e => { attempt.failureCode = "LOG_WRITE_FAILED"; attempt.failure = redact(e.message); child.kill(); resolve(); }); }));
      const parser = jsonLines(e => this.publicEvent(run, attempt, e), e => { attempt.failureCode = "EVENT_STREAM_INVALID"; attempt.failure = e.text; });
      child.stdout.pipe(raw); child.stderr.pipe(stderr);
      child.stdout.on("data", chunk => { try { parser.push(chunk); } catch (e) { attempt.failureCode = "EVENT_SAVE_FAILED"; attempt.failure = redact(e.message); child.kill(); } });
      child.stderr.on("data", chunk => { attempt.stderr = redact(chunk.toString("utf8")).slice(-4000); });
      const exit = await new Promise((resolve, reject) => { child.once("error", reject); child.once("close", (code, signal) => resolve({ code, signal })); }); parser.end();
      await Promise.all(writes);
      attempt.exitCode = exit.code; attempt.signal = exit.signal;
      if (active.stopped) throw error("USER_STOPPED", "用户停止了当前任务");
      if (attempt.failureCode) throw error(attempt.failureCode, attempt.failure || "实际模型与请求身份不一致");
      if (!attempt.responseSeen || !attempt.actualModels.includes(run.selector)) throw error("NO_MODEL_RESPONSE", "本次任务没有取得请求模型的完整响应身份");
      if (exit.code !== 0) throw error("PROCESS_FAILED", "执行器异常退出" + (attempt.stderr ? "：" + attempt.stderr : ""));
      if (attempt.lastStopReason === "toolUse") throw error("INCOMPLETE", "执行结束时模型仍在工具步骤，保留未完成状态");
      for (const [file, digest] of Object.entries(attempt.inputHashes)) if (!fs.existsSync(path.join(attempt.cwd, file)) || sha256(fs.readFileSync(path.join(attempt.cwd, file))) !== digest) throw error("INPUT_CHANGED", "只读输入被修改：" + file);
      if (attempt.scopeWarnings?.length) throw error("SCOPE_VIOLATION", "检测到任务范围外的工具路径");
      if (run.treatment === "tool" && treeHash(this.options.toolkitRoot) !== run.toolkitHash) throw error("TOOLKIT_CHANGED", "执行时工具输入被修改");
      if (task.visual) {
        const before = path.join(this.runRoot(run), "attempts", attempt.id, "before");
        const changed = new Set([...sourceFiles(before), ...sourceFiles(attempt.cwd)]);
        for (const file of changed) {
          const original = path.join(before, file), current = path.join(attempt.cwd, file);
          if (fs.existsSync(original) && fs.existsSync(current) && sha256(fs.readFileSync(original)) === sha256(fs.readFileSync(current))) continue;
          if (!["implementation.md", "failure.md", "job-plan.json", "stack-input.json", "toolchain-request.json"].includes(file) && !task.visual.scope.some(scope => file === scope || file.startsWith(scope.replace(/\/$/, "") + "/"))) throw error("SCOPE_VIOLATION", "细任务修改了声明范围外的文件：" + file);
        }
      }
      if (!fs.existsSync(path.join(attempt.cwd, task.id === "reference" ? "reference.md" : "index.html"))) throw error("OUTPUT_MISSING", "任务未生成要求的交付文件");
      safePath(attempt.cwd, task.id === "reference" ? "reference.md" : "index.html");
      task.status = "verifying"; run.status = "verifying"; this.save(run, "component-check", "独立检查 " + task.title);
      const capture = task.id === "reference" ? { status: "passed", source: "external-file-check", files: [], checks: ["reference.md存在"], visualAcceptance: "not-evaluated" } : await this.capture({ cwd: attempt.cwd, task, attempt, run });
      if (active.stopped) throw error("USER_STOPPED", "用户停止了当前任务");
      if (run.treatment === "tool" && run.dispatchVersion === 2) {
        if (task.id === "reference") this.loadVisualPlan(run, attempt);
        else { this.sealVisual(run, task, attempt, capture); this.completeVisual(run, task, attempt); }
      }
      this.seal(run, task, attempt, capture); attempt.status = "generated";
      if (task.visual) this.save(run, "component-evidence-sealed", task.title + "独立证据已封存");
    } catch (e) {
      attempt.failureCode = e.code || "DRIVER_ERROR"; attempt.failure = redact(e.message); if (e.evidence) attempt.engineering = e.evidence;
      attempt.status = attempt.failureCode === "USER_STOPPED" ? "stopped" : "failed"; task.status = attempt.status; run.status = attempt.status; this.save(run, "component-failed", task.title + "：" + attempt.failure);
    } finally {
      if (!raw.writableEnded) raw.end(); if (!stderr.writableEnded) stderr.end();
      try { attempt.sourceFiles = snapshot(attempt.cwd, path.join(this.runRoot(run), "attempts", attempt.id, "after")); attempt.finishedAt = now(); attempt.elapsedSec = (Date.parse(attempt.finishedAt) - Date.parse(attempt.startedAt)) / 1000; this.save(run, "component-attempt-ended", task.title + "尝试结束"); } finally { this.active = null; }
    }
  }
  async review(id, input) {
    const run = this.get(id), task = run.tasks.find(t => t.id === input.taskId), attempt = task?.attempts.at(-1);
    if (!task || task.status !== "awaiting-review" || !attempt || input.attemptId !== attempt.id || input.artifactHash !== attempt.artifactHash) throw error("REVIEW_STALE", "请审阅当前节点的准确版本");
    this.verifyArtifact(run, attempt);
    if (!["accept", "reject"].includes(input.verdict)) throw error("VERDICT_REQUIRED", "请选择通过或退回", 400);
    if (input.verdict === "reject" && !String(input.feedback || "").trim()) throw error("FEEDBACK_REQUIRED", "退回时请写明需要修改的地方", 400);
    const scores = {}; for (const key of ["geometry", "material", "motion"]) { const value = input.scores?.[key] ?? null; if (value !== null && (!Number.isInteger(value) || value < 0 || value > 5)) throw error("SCORE_INVALID", "评分必须为空或0至5整数", 400); scores[key] = value; }
    let native;
    if (run.treatment === "tool" && run.dispatchVersion === 2) {
      const action = this.pipeline(run, "next", ["--plan", run.visualPlan]);
      const progress = readJson(path.join(this.runRoot(run), "state.json")).extensions.visualTasks, record = progress.completed[task.id];
      const withoutStatus = ({ status, stale_cause, ...metadata }) => metadata;
      const sameEvidence = record && attempt.nativeArtifacts && progress.planHash === attempt.pipelineAction.planHash && record.taskHash === attempt.pipelineAction.taskHash
        && canonicalJson(record.inputHashes) === canonicalJson(attempt.pipelineAction.inputHashes)
        && canonicalJson(record.artifacts.map(withoutStatus)) === canonicalJson(attempt.nativeArtifacts.map(withoutStatus))
        && canonicalJson(record.artifacts.map(withoutStatus)) === canonicalJson(readJson(safePath(this.runRoot(run), attempt.completionPath)).map(withoutStatus));
      const feedback = String(input.feedback || "").trim();
      const alreadyRejected = sameEvidence && record.status === "stale" && progress.failures[task.id] === feedback && record.artifacts.every(metadata => metadata.stale_cause === feedback);
      if (!sameEvidence || record.status !== "ready" && !(input.verdict === "reject" && alreadyRejected)) throw error("TASK_EVIDENCE_CHANGED", "原生检查版本已改变或缺失，不能把旧人审用于重新执行的证据");
      native = { action, alreadyRejected, feedback };
    }
    attempt.review = { verdict: input.verdict, valid: true, feedback: String(input.feedback || ""), scores, artifactHash: attempt.artifactHash, reviewedAt: now(), reviewer: "human-user", blindAtSubmission: false };
    if (native) {
      this.save(run, "component-review-recorded", task.title + "人工意见已绑定当前作品");
      if (input.verdict === "accept") {
        if (native.action.stage === "visual-review" && native.action.task?.id === task.id) this.acceptVisual(run, task, attempt);
      } else {
        if (!native.alreadyRejected) {
          const rejected = this.pipeline(run, "decide", ["--plan", run.visualPlan, "--choice", task.id, "--verdict", "reject", "--artifact", attempt.completionPath, "--answer", String(input.feedback)]);
          if (rejected.status !== "blocked" || rejected.failure !== native.feedback) throw error("TASK_REVIEW_FAILED", rejected.failure || "退回意见未绑定当前证据");
        }
      }
    }
    attempt.status = input.verdict === "accept" ? "accepted" : "rejected"; task.status = input.verdict === "accept" ? "accepted" : "pending"; run.status = "ready";
    this.save(run, "component-reviewed", task.title + (input.verdict === "accept" ? "人工通过" : "退回修改"));
    queueMicrotask(() => this.start(id).catch(e => { run.notice = redact(e.message); this.save(run, "component-start-error", run.notice); })); return this.detail(id);
  }
  async stop(id) {
    const run = this.get(id), active = this.active; if (!active || active.runId !== id) throw error("NOT_ACTIVE", "当前没有本服务拥有的运行进程");
    active.stopped = true; if (active.child.exitCode === null && active.child.signalCode === null) active.child.kill();
    if (this.pumping) await this.pumping; return this.detail(run.id);
  }
  file(id, attemptId, rawPath, version = "work") {
    let root;
    if (id.startsWith("history-")) { const run = this.detail(id).run; root = safePath(this.root, run.assetBase); version = "final"; }
    else { const run = this.get(id), attempt = run.tasks.flatMap(t => t.attempts).find(a => a.id === attemptId); if (!attempt || !["work", "before", "after"].includes(version)) throw error("NOT_FOUND", "尝试不存在", 404); root = path.join(this.runRoot(run), "attempts", attemptId, version); }
    const full = safePath(root, rawPath);
    if (!sourceFiles(root).includes(rawPath.replaceAll("\\", "/"))) throw error("FILE_PRIVATE", "此文件不是公开组件产物", 403);
    if (fs.statSync(full).size > 1024 * 1024) throw error("FILE_LARGE", "文件过大，请查看截图或本地源文件", 413);
    return { path: rawPath, version, sha256: sha256(fs.readFileSync(full)), text: redact(fs.readFileSync(full, "utf8")) };
  }
  async listen(port = 0) {
    this.server = http.createServer(async (req, res) => {
      const send = (status, data, type = "application/json; charset=utf-8") => { res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }); res.end(typeof data === "string" ? data : JSON.stringify(data)); };
      try {
        const origin = `http://127.0.0.1:${this.server.address().port}`; if (req.headers.host !== origin.slice(7)) throw error("HOST_INVALID", "仅接受本地评测入口", 403);
        const url = new URL(req.url, origin);
        if (req.method === "GET" && url.pathname === "/") return send(200, fs.readFileSync(path.join(__dirname, "component-eval.html"), "utf8"), "text/html; charset=utf-8");
        if (req.method === "GET" && url.pathname === "/api/bootstrap") return send(200, { token: this.token, models: [...new Set(this.histories().map(r => r.selector))], canStart: !!(this.options.executable || this.options.spawnTask), reviewUrl: this.previewBase + "/model-eval/review.html", unlimitedLocalTokens: true });
        if (req.method === "GET" && url.pathname === "/api/runs") return send(200, this.list());
        if (req.method === "GET" && url.pathname === "/api/detail") return send(200, this.detail(url.searchParams.get("runId") || ""));
        if (req.method === "GET" && url.pathname === "/api/events") return send(200, this.events(url.searchParams.get("runId") || "", url.searchParams.get("cursor") || 0));
        if (req.method === "GET" && url.pathname === "/api/file") return send(200, this.file(url.searchParams.get("runId"), url.searchParams.get("attemptId"), url.searchParams.get("path"), url.searchParams.get("version") || "work"));
        if (req.method !== "POST") throw error("NOT_FOUND", "入口不存在", 404);
        if (req.headers.origin !== origin || req.headers["x-workbench-token"] !== this.token) throw error("SESSION_INVALID", "操作需要本地评测会话", 403);
        let body = ""; for await (const chunk of req) { body += chunk; if (body.length > 65536) throw error("REQUEST_LARGE", "请求过大", 413); } let input; try { input = JSON.parse(body); } catch { throw error("INPUT_INVALID", "请求需要有效JSON内容", 400); } if (!input || typeof input !== "object" || Array.isArray(input)) throw error("INPUT_INVALID", "请求内容无效", 400);
        if (url.pathname === "/api/create") return send(200, this.createRun(input));
        if (url.pathname === "/api/start") return send(200, await this.start(input.runId));
        if (url.pathname === "/api/stop") return send(200, await this.stop(input.runId));
        if (url.pathname === "/api/review") return send(200, await this.review(input.runId, input));
        throw error("NOT_FOUND", "操作不存在", 404);
      } catch (e) { send(e.status || 500, { error: redact(e.message), code: e.code || "SERVER_ERROR" }); }
    });
    await new Promise((resolve, reject) => { this.server.once("error", reject); this.server.listen(port, "127.0.0.1", resolve); }); return `http://127.0.0.1:${this.server.address().port}`;
  }
  async close() {
    if (this.closed) return; this.closed = true; if (this.active) await this.stop(this.active.runId); if (this.pumping) await this.pumping;
    if (this.server) { this.server.closeIdleConnections(); await new Promise(resolve => this.server.close(resolve)); }
    if (fs.existsSync(this.lockFile)) fs.unlinkSync(this.lockFile);
  }
}

module.exports = { projectEvent, jsonLines, Workbench, buildTasks };
if (require.main === module) {
  const args = process.argv.slice(2), options = {}; const names = { "--root": "root", "--omp": "executable", "--config": "configFile", "--toolkit": "toolkitRoot", "--modules": "modulesRoot", "--playwright": "playwrightPath", "--chrome": "chromePath", "--port": "port" };
  if (args.includes("--help") || !args.length) console.log("node scripts/component-eval.cjs --root <existing model-eval dir> --omp <omp.exe> --config <overlay> --toolkit <snapshot> --modules <node_modules> --playwright <module> --chrome <browser> [--port 0]");
  else { for (let i = 0; i < args.length; i += 2) { if (!names[args[i]] || !args[i + 1]) throw new Error("Unknown or missing argument: " + args[i]); options[names[args[i]]] = args[i + 1]; } const bench = new Workbench(options); bench.listen(Number(options.port || 0)).then(url => console.log("Component workbench: " + url)).catch(e => { console.error(e.message); bench.close(); process.exitCode = 1; }); for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => bench.close().then(() => process.exit(0))); }
}
