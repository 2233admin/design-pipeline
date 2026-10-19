# 安装与第一次运行

## 从本地仓库安装

需要 Node.js 22 或更新版本。下面把当前本地版本安装为 Codex skill，再从目标项目调用工具。其他 agent、标准 `skills add` 和升级方法见 [安装与升级](../skill/references/installation.md)。

```bash
# 在仓库根目录，将当前版本安装到 ~/.codex/skills/design-pipeline
node scripts/install-local.cjs --source skill --root "$HOME/.codex/skills" --target "$HOME/.codex/skills/design-pipeline"

# 切换到你的项目目录，使用已安装 skill 的绝对路径并明确项目 root
cd /path/to/your-project
node "$HOME/.codex/skills/design-pipeline/scripts/designer-pipeline.cjs" \
  composition scaffold --root "$PWD" --template visual-craft --output "visual-craft-study"
```

Agent 提示示例：“在当前项目里运行 `composition scaffold --template visual-craft --output visual-craft-study`，用复制出的 Canvas helper 做一个可拖动进度、支持乱序重绘的小型绘画与排版 study；保留 DOM 正文语义，渲染后检查不同尺寸和文本溢出。”轻量脚手架只创建新目录中的 study 文件，不初始化影片或工作流状态。仓库内置其他工具见 [工具索引](../skill/tools/README.md)。

## 从 GitHub Release 安装

如果不想克隆仓库，直接下载最新正式版 `v0.12.0` Release 的资产。需要 Node.js 22 或更新版本。
Release 包的归档根目录是 `design-pipeline/`，包含 `SKILL.md`、`references/`、`scripts/`、
生成的 `PACKAGE.json` 和安装器；解压后约 **50 MB**。MengTo 与 iart 两个大型上游技能库（约 200 MB）
不随包发布，首次需要时运行 `designer-pipeline sources fetch --all` 按锁定版本下载并逐文件校验，
`doctor` 会列出尚未下载的库。压缩包的实际下载大小以 GitHub Release 页面为准。

可用资产：

- ZIP（Windows PowerShell）：<https://github.com/2233admin/design-pipeline/releases/download/v0.12.0/design-pipeline-skill.zip>
- TGZ（Git Bash/Unix）：<https://github.com/2233admin/design-pipeline/releases/download/v0.12.0/design-pipeline-skill.tgz>
- 校验文件：<https://github.com/2233admin/design-pipeline/releases/download/v0.12.0/checksums.txt>

### Windows PowerShell（ZIP）

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
$source = Join-Path $extract "design-pipeline"
$target = Join-Path $HOME ".codex\skills\design-pipeline"
$installer = Join-Path $source "scripts\install-local.cjs"

node $installer --root (Split-Path $target) --target $target --source $source
$cli = Join-Path $target "scripts\designer-pipeline.cjs"
node $cli doctor --root . --json
node $cli route --root . --query "design a settings page" --json
```

### Git Bash / Unix（TGZ）

```bash
version=0.12.0
base="https://github.com/2233admin/design-pipeline/releases/download/v${version}"
work="${TMPDIR:-/tmp}/design-pipeline-v${version}"
mkdir -p "$work"

curl -fL "$base/design-pipeline-skill.tgz" -o "$work/design-pipeline-skill.tgz"
curl -fL "$base/checksums.txt" -o "$work/checksums.txt"
(cd "$work" && awk '$2 == "design-pipeline-skill.tgz" { print }' checksums.txt | sha256sum -c -)

tar -xzf "$work/design-pipeline-skill.tgz" -C "$work"
node "$work/design-pipeline/scripts/install-local.cjs" \
  --root "$HOME/.codex/skills" \
  --target "$HOME/.codex/skills/design-pipeline" \
  --source "$work/design-pipeline"

cli="$HOME/.codex/skills/design-pipeline/scripts/designer-pipeline.cjs"
node "$cli" doctor --root . --json
node "$cli" route --root . --query "design a settings page" --json
```

升级现有安装时，在对应的 `node ... install-local.cjs` 命令末尾加 `--replace`；不加该标志时，
安装器会拒绝覆盖已有目标。Release 包不会安装目标项目的 npm、pnpm、Yarn、Bun 或其他运行时
依赖；目标项目仍需自行声明和安装自己的依赖。

可选 companion skill 不会被静默安装。安装后运行 `check-deps.cjs`，缺少或过期的可选能力会明确
报告 `WARN`，同时给出内置流程或官方文档的 fallback；只有必需资源缺失才会失败：

```bash
node "$HOME/.codex/skills/design-pipeline/scripts/check-deps.cjs"
```

PowerShell 对应命令为：

```powershell
node (Join-Path $target "scripts\check-deps.cjs")
```

如果某个 companion 缺失，继续使用内置门禁和 fallback，并按输出提示记录该能力缺口；不要把
`WARN` 当成已自动安装或已验证完整覆盖。

创建第一个设计基础：

```bash
# 初始化设计合成
node skill/scripts/init-design-synthesis.cjs \
  --change-id create-product-design-system \
  --problem "Design an operations console for support leads" \
  --framework nextjs

# 检查设计基础是否就绪
node skill/scripts/check-design-foundation.cjs --project-root . --json
```

`ready` 解锁实现。`synthesis-required` 需要补充设计。`invalid` 需要修复。
