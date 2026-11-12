"use strict";

// web 路线的自建前端工具：`web scaffold` 从 frontend-stack 决策写出可安装、可构建的最小 Vite 工程，
// `web preview` 在本机起静态服务供 section 评审和 `evidence refs` 使用。
// 决策本身仍由 frontend-stack-core.cjs 产生；这里只消费它，不重复解析 registry。

const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { fail, isObject, readJson } = require("./contract-utils.cjs");
const { DECISION_SCHEMA } = require("./frontend-stack-core.cjs");
const { cliCommand, shellPath } = require("./workflows/shared.cjs");

// 固定版本，与 film scaffold 固定 gsap/hyperframes 同理：同一份脚手架今天与明天装出同一棵树。
const VERSIONS = {
  "vite": "8.3.7",
  "react": "19.3.1",
  "react-dom": "19.3.1",
  "@vitejs/plugin-react": "6.3.0",
  "vue": "3.5.45",
  "@vitejs/plugin-vue": "6.0.10",
  "svelte": "5.57.3",
  "@sveltejs/vite-plugin-svelte": "7.3.1",
  "solid-js": "1.9.18",
  "vite-plugin-solid": "2.11.15",
  "tailwindcss": "4.3.5",
  "@tailwindcss/vite": "4.3.5",
  "sass": "1.108.1",
  "less": "4.9.1",
  "postcss": "8.5.32",
};

const FRAMEWORKS = {
  react: { entry: "src/main.jsx", runtime: ["react", "react-dom"], plugin: ["@vitejs/plugin-react", "react", "react()"] },
  vue: { entry: "src/main.js", runtime: ["vue"], plugin: ["@vitejs/plugin-vue", "vue", "vue()"] },
  svelte: { entry: "src/main.js", runtime: ["svelte"], plugin: ["@sveltejs/vite-plugin-svelte", "{ svelte }", "svelte()"] },
  solid: { entry: "src/main.jsx", runtime: ["solid-js"], plugin: ["vite-plugin-solid", "solid", "solid()"] },
  agnostic: { entry: "src/main.js", runtime: [], plugin: null },
};

const STYLES = {
  none: { file: "src/style.css", body: "/* 项目样式 */\n:root { color-scheme: light dark; }\nbody { margin: 0; font-family: system-ui, sans-serif; }\n", dev: [] },
  "postcss-only": { file: "src/style.css", body: "/* 项目样式；PostCSS 插件写在 postcss.config.js */\nbody { margin: 0; font-family: system-ui, sans-serif; }\n", dev: ["postcss"] },
  tailwindcss: { file: "src/style.css", body: "@import \"tailwindcss\";\n", dev: ["tailwindcss", "@tailwindcss/vite"] },
  scss: { file: "src/style.scss", body: "// 项目样式\nbody { margin: 0; font-family: system-ui, sans-serif; }\n", dev: ["sass"] },
  less: { file: "src/style.less", body: "// 项目样式\nbody { margin: 0; font-family: system-ui, sans-serif; }\n", dev: ["less"] },
};

// UI 库的安装/初始化命令列入 next，由 agent 在装完依赖后执行（shadcn 一类需要交互式 init）。
const UI_SETUP = {
  "shadcn-ui": () => "npx shadcn@latest init",
  "shadcn-svelte": () => "npx shadcn-svelte@latest init",
  daisyui: () => "npm install -D daisyui",
  "radix-ui": () => "npm install radix-ui",
  "headless-ui": (framework) => `npm install @headlessui/${framework === "vue" ? "vue" : "react"}`,
  "park-ui": (framework) => `npm install @ark-ui/${framework} && npm install -D @pandacss/dev`,
  "chakra-ui": () => "npm install @chakra-ui/react",
  heroui: () => "npm install @heroui/react",
  mantine: () => "npm install @mantine/core @mantine/hooks",
  mui: () => "npm install @mui/material @emotion/react @emotion/styled",
  "ant-design": () => "npm install antd",
  "base-ui": () => "npm install @base-ui-components/react",
  "ark-ui": (framework) => `npm install @ark-ui/${framework}`,
  "react-aria": () => "npm install react-aria-components",
};

function validateDecision(decision) {
  if (!isObject(decision) || decision.schema !== DECISION_SCHEMA) fail("web scaffold", `--decision must be a ${DECISION_SCHEMA} file written by frontend-stack resolve-stack`, { code: "CONTRACT_INVALID" });
  const styling = decision.selected?.styling?.id;
  const ui = decision.selected?.uiLibrary?.id;
  if (typeof decision.framework !== "string" || typeof styling !== "string" || typeof ui !== "string") fail("web scaffold", "the decision lacks framework, selected.styling or selected.uiLibrary", { code: "CONTRACT_INVALID" });
  if (decision.status === "blocked") fail("web scaffold", `the frontend stack decision is blocked: ${(decision.blockers || []).join("; ") || "no reason recorded"}. Fix: resolve the blockers and re-run frontend-stack resolve-stack`, { code: "BLOCKED" });
  if (decision.status !== "ready") fail("web scaffold", `unexpected decision status ${String(decision.status)}`, { code: "CONTRACT_INVALID" });
  if (decision.framework === "reflex") fail("web scaffold", "reflex is a Python framework; web scaffold writes Vite projects only. Fix: choose react, svelte, vue, solid or agnostic, or scaffold the Reflex app yourself", { code: "UNSUPPORTED_FRAMEWORK" });
  if (!FRAMEWORKS[decision.framework]) fail("web scaffold", `unsupported framework ${decision.framework}; allowed: ${Object.keys(FRAMEWORKS).join(", ")}`, { code: "UNSUPPORTED_FRAMEWORK" });
  if (!STYLES[styling]) fail("web scaffold", `unsupported styling ${styling}; allowed: ${Object.keys(STYLES).join(", ")}`, { code: "CONTRACT_INVALID" });
}

function entrySource(framework) {
  const mount = 'document.getElementById("app")';
  return {
    react: `import { createRoot } from "react-dom/client";\n\nfunction App() {\n  return <p>Replace this with the first section.</p>;\n}\n\ncreateRoot(${mount}).render(<App />);\n`,
    vue: `import { createApp, h } from "vue";\n\ncreateApp({ render: () => h("p", "Replace this with the first section.") }).mount("#app");\n`,
    svelte: `import { mount } from "svelte";\nimport App from "./App.svelte";\n\nmount(App, { target: ${mount} });\n`,
    solid: `import { render } from "solid-js/web";\n\nrender(() => <p>Replace this with the first section.</p>, ${mount});\n`,
    agnostic: `${mount}.textContent = "Replace this with the first section.";\n`,
  }[framework];
}

function viteConfig(framework, styling) {
  const lines = [];
  const plugins = [];
  lines.push('import { defineConfig } from "vite";');
  const plugin = FRAMEWORKS[framework].plugin;
  if (plugin) {
    lines.push(framework === "svelte" ? `import { svelte } from "${plugin[0]}";` : `import ${plugin[1]} from "${plugin[0]}";`);
    plugins.push(plugin[2]);
  }
  if (styling === "tailwindcss") { lines.push('import tailwindcss from "@tailwindcss/vite";'); plugins.push("tailwindcss()"); }
  // 相对 base：dist 用 web preview --path dist 或任意静态目录打开都能找到资源。
  return `${lines.join("\n")}\n\nexport default defineConfig({\n  base: "./",\n  plugins: [${plugins.join(", ")}],\n});\n`;
}

function indexHtml(entry, title) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
  </head>
  <body>
    <!-- data-section 标记留在静态外壳里，框架渲染不会吞掉它；每个 section 一个元素。 -->
    <main data-section="hero">
      <div id="app"></div>
    </main>
    <script type="module" src="/${entry}"></script>
  </body>
</html>
`;
}

function packageJson(target, framework, styling, name) {
  const file = path.join(target, "package.json");
  const existing = fs.existsSync(file) ? readJson(file, "package.json") : null;
  const spec = FRAMEWORKS[framework];
  const pins = (names) => Object.fromEntries(names.map((dep) => [dep, VERSIONS[dep]]));
  const dev = ["vite", ...(spec.plugin ? [spec.plugin[0]] : []), ...STYLES[styling].dev];
  const base = existing || { name, private: true, type: "module", description: "Web project scaffolded by designer-pipeline" };
  // 替换既有 package.json 时保留其字段，只合并脚本与固定版本的依赖。
  return `${JSON.stringify({
    ...base,
    scripts: { dev: "vite", build: "vite build", ...(base.scripts || {}) },
    dependencies: { ...(base.dependencies || {}), ...pins(spec.runtime) },
    devDependencies: { ...(base.devDependencies || {}), ...pins(dev) },
  }, null, 2)}\n`;
}

function guide(project, decision) {
  const ui = decision.selected.uiLibrary.id;
  return `# Web project

框架 ${decision.framework}，样式 ${decision.selected.styling.id}，UI 库 ${ui}（来自 frontend-stack 决策）。

1. \`npm install\`（需要网络）：安装固定版本的依赖。
2. ${ui === "none" ? "无需 UI 库初始化。" : `UI 库：\`${UI_SETUP[ui]?.(decision.framework) || "见 registry 来源"}\``}
3. 在 \`index.html\` 里每个 section 用一个带 \`data-section="<id>"\` 的元素包住；组件渲染进其中的挂载点。
4. 每用一个组件就在 \`component-manifest.json\` 的 \`entries\` 里记一条（见 references/workflow-web.md#build）。
5. \`npm run build\` 后用 \`web preview --root ${project} --path dist\` 预览构建产物。
`;
}

function scaffoldWeb(dir, decision, options = {}) {
  validateDecision(decision);
  const target = path.resolve(dir);
  const framework = decision.framework;
  const styling = decision.selected.styling.id;
  const ui = decision.selected.uiLibrary.id;
  const spec = FRAMEWORKS[framework];
  const style = STYLES[styling];
  const name = path.basename(target).toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^[._-]+/, "") || "web-project";
  const files = {
    "package.json": null,
    "vite.config.js": viteConfig(framework, styling),
    "index.html": indexHtml(spec.entry, name),
    [spec.entry]: `import "./${path.basename(style.file)}";\n${entrySource(framework)}`,
    [style.file]: style.body,
    "component-manifest.json": `${JSON.stringify({ entries: [] }, null, 2)}\n`,
    "WEB.md": guide(shellPath(target), decision),
    ...(framework === "svelte" ? { "src/App.svelte": "<p>Replace this with the first section.</p>\n" } : {}),
    ...(styling === "postcss-only" ? { "postcss.config.js": "export default { plugins: {} };\n" } : {}),
  };
  const existing = Object.keys(files).filter((file) => fs.existsSync(path.join(target, file)));
  if (existing.length && !options.replace) fail("web scaffold", `refusing to overwrite ${existing.join(", ")} in ${target}. Fix: choose an empty --output directory, or pass --replace to overwrite these files (an existing package.json keeps its fields and gains the pinned dependencies)`, { code: "OUTPUT_EXISTS" });
  files["package.json"] = packageJson(target, framework, styling, name);
  for (const [file, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(target, file)), { recursive: true });
    fs.writeFileSync(path.join(target, file), content);
  }
  const project = shellPath(target);
  const next = [
    `npm --prefix ${project} install   (needs network; installs the pinned dependencies)`,
    ...(ui === "none" ? [] : [`In ${project}: ${UI_SETUP[ui]?.(framework) || `set up ${ui}`}   (UI library ${ui}; run after install)`]),
    "Replace the placeholder in the entry file with the first section, inside the data-section element of index.html, and record each component in component-manifest.json.",
    `npm --prefix ${project} run build, then ${cliCommand()} web preview --root ${project} --path dist`,
  ];
  return { status: "scaffolded", root: target, files: Object.keys(files), framework, styling, uiLibrary: ui, next };
}

const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif",
  ".webp": "image/webp", ".avif": "image/avif", ".ico": "image/x-icon", ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf", ".otf": "font/otf",
  ".mp4": "video/mp4", ".webm": "video/webm", ".txt": "text/plain; charset=utf-8", ".map": "application/json; charset=utf-8", ".wasm": "application/wasm",
};

function resolveRequest(realRoot, rawUrl) {
  let pathname;
  try { pathname = decodeURIComponent(new URL(rawUrl, "http://x").pathname); } catch { return { status: 400 }; }
  if (pathname.includes("\0")) return { status: 400 };
  let file = path.join(realRoot, pathname);
  const inside = (candidate) => { const relative = path.relative(realRoot, candidate); return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative)); };
  if (!inside(file)) return { status: 403 };
  try {
    file = fs.realpathSync(file);
    if (!inside(file)) return { status: 403 };
    if (fs.statSync(file).isDirectory()) {
      // 目录回落到 index.html 后要对最终文件重新取真实路径，否则指向根外的符号链接会被读出。
      file = fs.realpathSync(path.join(file, "index.html"));
      if (!inside(file)) return { status: 403 };
    }
    if (!fs.statSync(file).isFile()) return { status: 404 };
  } catch { return { status: 404 }; }
  return { status: 200, file };
}

// 只绑 127.0.0.1；port 缺省或 0 为随机端口。返回 { url, stop }，stop 关闭监听并等待连接结束。
function startPreview(root, options = {}) {
  const realRoot = fs.realpathSync(path.resolve(root));
  const server = http.createServer((request, response) => {
    if (request.method !== "GET" && request.method !== "HEAD") { response.writeHead(405).end(); return; }
    const found = resolveRequest(realRoot, request.url);
    if (found.status !== 200) { response.writeHead(found.status, { "content-type": "text/plain; charset=utf-8" }).end(String(found.status)); return; }
    const body = fs.readFileSync(found.file);
    response.writeHead(200, { "content-type": MIME[path.extname(found.file).toLowerCase()] || "application/octet-stream", "cache-control": "no-store" });
    response.end(request.method === "HEAD" ? undefined : body);
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(Number(options.port) || 0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({
        url: `http://127.0.0.1:${port}/`,
        stop: () => new Promise((done) => { server.close(() => done()); server.closeAllConnections(); }),
      });
    });
  });
}

// CLI 入口是同步的：用同一文件的子进程跑服务并阻塞到它退出，地址由子进程写到 stderr。
function runPreview(root, options = {}) {
  const served = path.resolve(root);
  if (!fs.existsSync(path.join(served, "index.html"))) fail("web preview", `no index.html in ${served}. Fix: scaffold or build the page first (web scaffold, then npm run build and --path dist), or pass --path <the directory that holds index.html>`, { code: "INPUT_MISSING" });
  const args = [__filename, "--serve", served, String(options.port ?? 0), String(options.timeoutMs ?? 0), String(process.pid)];
  const child = spawnSync(process.execPath, args, { stdio: ["ignore", "inherit", "inherit"] });
  if (child.error) throw child.error;
  if (child.status !== 0 && child.signal === null) fail("web preview", `the preview server exited with code ${child.status}`, { code: "PREVIEW_FAILED" });
  return { status: "stopped", root: served };
}

if (require.main === module && process.argv[2] === "--serve") {
  const [, , , dir, port, timeoutMs, parentPid] = process.argv;
  startPreview(dir, { port }).then((preview) => {
    process.stderr.write(`preview: ${preview.url}  (Ctrl+C to stop)\n`);
    let stopping = false;
    const stop = () => { if (stopping) return; stopping = true; preview.stop().then(() => process.exit(0)); };
    process.on("SIGINT", stop);
    process.on("SIGTERM", stop);
    if (Number(timeoutMs) > 0) setTimeout(stop, Number(timeoutMs));
    // 阻塞中的父进程收到 SIGTERM 会直接退出而来不及转发；子进程轮询父进程是否还在，不在就关闭，避免孤儿服务占着端口。
    if (Number(parentPid) > 0) setInterval(() => { try { process.kill(Number(parentPid), 0); } catch { stop(); } }, 500).unref();
  }, (error) => { process.stderr.write(`preview: ${error.message}\n`); process.exit(1); });
}

module.exports = { VERSIONS, runPreview, scaffoldWeb, startPreview };
