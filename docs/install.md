# 安装与第一次运行

需要 Node.js 22.12 或更新版本。两条路径都从 GitHub Release 包安装（约 **50 MB**，不含 MengTo 与 iart 两个约 200 MB 的上游技能库，它们首次需要时再下载）。装完后让 agent 运行一次 `designer-pipeline doctor`，它会列出缺什么、每项给出一条可复制的命令；它不会替你安装任何东西。

## Claude Code

在 Claude Code 会话里运行：

```text
/plugin marketplace add 2233admin/design-pipeline
/plugin install design-pipeline@design-pipeline
```

插件从最新 Release 包安装，skill 位于 `~/.claude/plugins/cache/design-pipeline/design-pipeline/<版本>/`。升级：在终端运行 `claude plugin update design-pipeline@design-pipeline`，或在 `/plugin` 的 Marketplaces 里为 design-pipeline 打开 Enable auto-update。

如果 `marketplace add` 报 `git clone timed out after 120s`（仓库约 250 MB，其中大部分是上游快照），改在终端里只检出目录清单：

```bash
claude plugin marketplace add 2233admin/design-pipeline --sparse .claude-plugin
```

## Codex 和其他 agent

用 [Skills CLI](https://github.com/vercel-labs/skills) 从同一个 Release 包安装到 `~/.agents/skills/design-pipeline`（Codex 与遵循 Agent Skills 目录约定的 agent 都会扫描这里）。包解压后约 49 MB、1600 多个文件，超过 CLI 默认的 10 MiB / 25 MiB / 1000 个文件上限，所以需要放宽这三个变量：

```bash
SKILLS_DOWNLOAD_MAX_BYTES=104857600 SKILLS_EXTRACT_MAX_BYTES=268435456 SKILLS_EXTRACT_MAX_FILES=5000 \
  npx skills add https://github.com/2233admin/design-pipeline/releases/latest/download/design-pipeline-skill.zip \
  --skill design-pipeline -a codex -g
```

Windows PowerShell：

```powershell
$env:SKILLS_DOWNLOAD_MAX_BYTES = 104857600; $env:SKILLS_EXTRACT_MAX_BYTES = 268435456; $env:SKILLS_EXTRACT_MAX_FILES = 5000
npx skills add https://github.com/2233admin/design-pipeline/releases/latest/download/design-pipeline-skill.zip --skill design-pipeline -a codex -g
```

`-a` 换成 `cursor` 等其他 agent id 即可；去掉 `-g` 则装进当前项目的 `.agents/skills/`。升级时重新运行同一条命令。

## 确认安装

对 agent 说：“运行 design-pipeline 的 `doctor`”。命令是 `node "<skill 目录>/scripts/designer-pipeline.cjs" doctor`，`<skill 目录>` 就是 agent 加载的 `SKILL.md` 所在目录。输出分三档：

- **必需**：Node.js 22.12+ 与 skill 文件齐全。缺任何一项退出码为 2，其余情况为 0。
- **推荐**：Chromium 系浏览器，用于证据门禁和截图。第一次跑门禁时才会用到。
- **可选**：MengTo 与 iart 技能库（`sources fetch --all`）、ffmpeg 与 ffprobe（影片、剪辑、音频）、Blender（3D 影片模板）。

缺项旁边会打印一条命令，例如 `npx hyperframes browser ensure`；在你需要那项能力时运行它。门禁或影片任务第一次找不到浏览器、ffmpeg 或 Blender 时，报错里是同一条命令。`doctor --json` 输出机器可读的结果。

装好以后在项目里直接说需求，例如“用 design-pipeline 给这个项目做一个设置页”。调用 CLI 时用已安装 skill 的绝对路径，并在项目目录运行或传 `--root`：

```bash
cd /path/to/your-project
node "<skill 目录>/scripts/designer-pipeline.cjs" \
  composition scaffold --root "$PWD" --template visual-craft --output "visual-craft-study"
```

Agent 提示示例：“在当前项目里运行 `composition scaffold --template visual-craft --output visual-craft-study`，用复制出的 Canvas helper 做一个可拖动进度、支持乱序重绘的小型绘画与排版 study；保留 DOM 正文语义，渲染后检查不同尺寸和文本溢出。”轻量脚手架只创建新目录中的 study 文件，不初始化影片或工作流状态。仓库内置其他工具见 [工具索引](../skill/tools/README.md)。

创建第一个设计基础：

```bash
node "<skill 目录>/scripts/init-design-synthesis.cjs" \
  --change-id create-product-design-system \
  --problem "Design an operations console for support leads" \
  --framework nextjs

node "<skill 目录>/scripts/check-design-foundation.cjs" --project-root . --json
```

`ready` 解锁实现。`synthesis-required` 需要补充设计。`invalid` 需要修复。

可选的 companion skill 不会被静默安装。`node "<skill 目录>/scripts/check-deps.cjs"` 列出缺少或过期的 companion，并给出内置流程作为 fallback；只有必需资源缺失才会失败。它先查运行中的这份 skill 所在目录，再查 `~/.claude/skills`、`~/.agents/skills`、项目内的 `.agents/skills` 与 `.claude/skills`，最后是旧的 `~/.codex/skills`。

## 附录 A：离线 Release 包

不能用上面两条命令时，从 [Releases](https://github.com/2233admin/design-pipeline/releases) 下载 `design-pipeline-skill.zip`（Windows）或 `design-pipeline-skill.tgz`（Unix）和 `checksums.txt`，校验后用包内的安装器安装。归档根目录是 `design-pipeline/`，里面有 `SKILL.md`、`scripts/install-local.cjs` 等。安装器默认目标是 `~/.agents/skills/design-pipeline`；Claude Code 用户请改用上面的插件，或把 `--root` 指向 `~/.claude/skills`。

Git Bash / Unix：

```bash
version=0.12.0
base="https://github.com/2233admin/design-pipeline/releases/download/v${version}"
work="${TMPDIR:-/tmp}/design-pipeline-v${version}"
mkdir -p "$work"

curl -fL "$base/design-pipeline-skill.tgz" -o "$work/design-pipeline-skill.tgz"
curl -fL "$base/checksums.txt" -o "$work/checksums.txt"
(cd "$work" && awk '$2 == "design-pipeline-skill.tgz" { print }' checksums.txt | sha256sum -c -)

tar -xzf "$work/design-pipeline-skill.tgz" -C "$work"
node "$work/design-pipeline/scripts/install-local.cjs" --source "$work/design-pipeline"
```

Windows PowerShell：

```powershell
$version = "0.12.0"
$base = "https://github.com/2233admin/design-pipeline/releases/download/v$version"
$work = Join-Path $env:TEMP "design-pipeline-v$version"
$archive = Join-Path $work "design-pipeline-skill.zip"
$checksums = Join-Path $work "checksums.txt"
$extract = Join-Path $work "extracted"

New-Item -ItemType Directory -Force -Path $work | Out-Null
Invoke-WebRequest "$base/design-pipeline-skill.zip" -OutFile $archive
Invoke-WebRequest "$base/checksums.txt" -OutFile $checksums

$line = Get-Content $checksums | Where-Object { $_ -match '  design-pipeline-skill\.zip$' }
$expected = ($line -split '\s+')[0].ToUpperInvariant()
$actual = (Get-FileHash $archive -Algorithm SHA256).Hash.ToUpperInvariant()
if ($actual -ne $expected) { throw "SHA-256 mismatch for $archive" }

Expand-Archive -LiteralPath $archive -DestinationPath $extract -Force
node (Join-Path $extract "design-pipeline\scripts\install-local.cjs") --source (Join-Path $extract "design-pipeline")
```

升级现有安装时在 `install-local.cjs` 命令末尾加 `--replace`；不加时安装器拒绝覆盖已有目标。Release 包不会安装目标项目的 npm、pnpm、Yarn、Bun 或其他运行时依赖。

## 附录 B：本地仓库

在仓库根目录把当前工作区装到 `~/.agents/skills/design-pipeline`：

```bash
node scripts/install-local.cjs --source skill
```

`--root <skills 目录>` 与 `--target <路径>` 可以改位置，`--replace` 覆盖已有安装。已装过旧版时，旧位置 `~/.codex/skills/design-pipeline` 不会被迁移或删除；确认新位置可用后自行删掉它，以免两份 skill 同时被扫描到。
