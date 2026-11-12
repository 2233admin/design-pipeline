# KATANAview 试验 run-01:冒烟准备

这一轮只做了准备工作，还没有跑任何 agent。

规模是 2 个任务(T1、T2)× 2 个臂(a、b)× 每臂 1 次，一共 4 次运行。协议见 `../MEASUREMENT.md`(C3、D、F0–F3)，起点提交是 KATANAview `d08c06a`。

下文 `<H>` 指 `C:/Users/Administrator/orca/workspaces/KATANAview/trial-harness-01`(agent 可能看到的 harness 目录)，`<P>` 指 `C:/Users/Administrator/AppData/Local/dp-eval-private/run-01`(只给评分方用的私有目录，不在任何 worktree 的上级目录里，也不在 orca 里)。

## 准备好的东西

| 内容 | 路径 |
| --- | --- |
| 技能快照 | `<H>/skill-dp-trial/`。从 orca `skill/` 的工作区状态复制而来，带 10 个未提交改动。只把副本里 SKILL.md 的 `name` 改成了 `dp-trial-01`。 |
| 快照清单 | `<H>/skill-dp-trial.manifest.json`。源 HEAD 是 `b631fcd`，记录了 `git diff --stat`。diff 的 sha256 以 `a3fbee25` 开头，源树哈希以 `798a7f8b` 开头，副本树哈希以 `2f984fea` 开头，两者只差 SKILL.md。完整 diff 在 `skill-dp-trial.source.diff`。 |
| 4 个运行用 worktree | `<H>/wt/{t1-a,t1-b,t2-a,t2-b}`，分支 `trial/run01-<run>`，都在 `d08c06a` 上。 |
| 验证用 worktree | `<H>/wt/scratch-oracle`，分支 `trial/run01-oracle-scratch`。只给评分方用，验证后已恢复干净。 |
| 隐藏 oracle | `<P>/oracles/`:<br>• `t1-tape.test.ts`，sha256 以 `5aae7306` 开头<br>• `t2-feed.test.tsx`，以 `4e3231cd` 开头<br>• `old-specs.d08c06a.json`，42 个旧 spec 的快照，以 `d6447d74` 开头<br>• `baseline-tests.d08c06a.json`，568 个基线测试的清单 |
| 脚本 | • `<H>/run.cjs`：运行 codex。私有目录路径不写在文件里，要用 `--private <P>` 或环境变量 `DP_EVAL_PRIVATE` 传入。<br>• `<P>/score.cjs`：评分，默认从脚本所在目录读 oracle,可以用 `--private <dir>` 覆盖<br>• `<P>/classify.cjs`：给 transcript 分类<br>• `<P>/capture-baseline.cjs`：一次性生成上面两个 JSON 快照 |
| 证据 | • `<H>/m0/`：安装、vitest、tsc 的日志，汇总在 `summary.txt`<br>• `<P>/validation/`：oracle 验证、参考解、违规样例、泄漏样例、dry-run 输出 |
| transcript 和评分结果 | `<P>/transcripts/`、`<P>/scores/`。放在私有目录，是为了不让后一次运行读到前一次的解法。 |

## M0(在所有 worktree 上都跑了)

每个 worktree 都依次执行了 `pnpm install --frozen-lockfile`、`pnpm exec vitest run`、`pnpm exec tsc --noEmit`:

- 5 个 worktree 的安装都是 exit 0。pnpm 直接从本机 store 复制，没有遇到网络问题。
- t1-a、t1-b、t2-a、t2-b、scratch-oracle 的结果都一样:vitest exit 0(39 个文件、568 个测试全部通过)，tsc exit 0。

## oracle 验证

在未改动的 `d08c06a` 上跑 oracle,vitest exit 1,没有出现导入或装载错误(setupError=false):

- T1:2/7 通过，失败的 5 项都是因为功能还不存在。
  - `showTickDirection` 读出来是 undefined。
  - tape 的设置里没有新增字段。
  - 通过的 2 项是"仍是 quoteBound/multiInstance、共 42 个 spec"和"updateInstanceConfig 往返后保留 group:null 和 config.symbol"。
- T2:1/5 通过。
  - 失败项包括"42≠43"、找不到 feedstatus spec、`COMMAND_PANELS.FEED` 为 undefined,渲染那一项也因为没有 spec 而失败。
  - 通过的那一项是"42 个旧 spec 没变"。

正向验证:在 scratch 里打上参考解(`<P>/validation/ref-t1.patch`、`ref-t2.patch`)后，两边 score.cjs 的 8 项检查全部通过。

- T1:oracle 7/7,forbidden 0,scope 0,vitest 569 个测试 exit 0,tsc 0。
- T2:oracle 5/5,registry 改动正好是 +2/-0,forbidden 0,vitest exit 0,tsc 0。

反向验证:另外人为注入了违规，结果在 `<P>/validation/violations-t{1,2}.json`。

- 改了 registry、删掉一行 `expect`、给测试改名、加 `onConfigChange(`、加 hex 颜色、加 `setInterval`、写出 `brief.md` 和 `.design-pipeline/`、首帧渲染返回 null:这些都被对应的检查抓到了。
- 评估资产移到 `<P>` 之后，又在未改动的 t1-a、t2-a 上重跑了一遍 `score.cjs`(`<P>/validation/untouched-run-*.json`):vitest 都是 exit 0、568 个测试;tsc 都是 0;forbidden 都是 0,scope 都是 0;oracle 按预期失败(T1 2/7,T2 1/5,setupError=false);没有 transcript,所以 `valid` 为 null。跑完后两个 worktree 都还是干净的，`node_modules/.vite` 里也没有留下缓存。

## 实际跑法:omp(用户决定，取代 codex)

4 次运行已经由用户在 Orca 终端里启动，每个 worktree 一个交互式 omp:`omp --model gpt-6.1-sol`,工作目录是 `<H>/wt/<run>`。prompt 和 run.cjs 生成的一致：任务原文，臂 b 再加那一行技能说明。

omp v18.4.6 的会话文件位置(依据 omp 文档 `session.md`,也和磁盘对上了):

- 路径是 `~/.omp/agent/sessions/-orca-workspaces-KATANAview-trial-harness-01-wt-<run>/<时间戳>_<sessionId>.jsonl`。
- 格式是 JSONL v3。第 1 行是固定 256 字节的 `title` 槽，第 2 行是 `session` 头(里面有 `cwd`),后面每行一个 SessionEntry。
- 工具调用在 assistant 消息的 `toolCall` 块里，结果是 `role: "toolResult"`,用 `toolCallId` 对应。
- 子 agent 的记录在 `<会话文件名去掉 .jsonl>/<AgentId>.jsonl`。advisor 的记录是同一目录下的 `__advisor*.jsonl`。

等 4 个会话都结束后再评分(运行期间不要碰 worktree):

```bash
S=~/.omp/agent/sessions
P=C:/Users/Administrator/AppData/Local/dp-eval-private/run-01
cd C:/Users/Administrator/orca/workspaces/KATANAview/trial-harness-01
node $P/score.cjs wt/t1-a t1 --transcript $S/-orca-workspaces-KATANAview-trial-harness-01-wt-t1-a/<文件>.jsonl
# t1-b、t2-a(t2)、t2-b(t2) 同理
node $P/classify.cjs <会话文件>   # 只看过程分类
```

omp 记录相关的注意事项:

- classify 会把主会话和子 agent 的工具调用按时间排成一条线。advisor 记录只参与泄漏检查。
- `skill://design-pipeline` 和 `skill://agents/design-pipeline` 算作读了全局技能，分别记在 `skill.global.via` 里。
- 全局技能会出现在 omp 的系统提示里，这一点会话文件里看不到，而且每次运行都一样。
- pi-lens 自动修复只能从工具结果里的提示认出来("pi-lens applied autofix to …"、"Auto-fixed N issue(s)"、"Modified files:"),记在 `process.piLens` 里。score 用 `piLensTouchedChangedFiles` 标出 diff 里哪些文件被 pi-lens 改过，但这些改动仍然计入 diff 和各项检查。不留提示的格式化，和 agent 自己的改动没法区分。

## 备用跑法:codex(模型 ID 待定，本轮没有用)

```bash
cd C:/Users/Administrator/orca/workspaces/KATANAview/trial-harness-01
export DP_EVAL_PRIVATE=C:/Users/Administrator/AppData/Local/dp-eval-private/run-01
node run.cjs --model <MODEL_ID> --run t1-a --dry-run   # 先看命令和 prompt
node run.cjs --model <MODEL_ID> --run t1-a
node run.cjs --model <MODEL_ID> --run t1-b
node run.cjs --model <MODEL_ID> --run t2-a
node run.cjs --model <MODEL_ID> --run t2-b
node $DP_EVAL_PRIVATE/score.cjs wt/t1-a t1 && node $DP_EVAL_PRIVATE/score.cjs wt/t1-b t1
node $DP_EVAL_PRIVATE/score.cjs wt/t2-a t2 && node $DP_EVAL_PRIVATE/score.cjs wt/t2-b t2
```

- 建议用随机顺序跑这 4 次。
- run.cjs 实际执行的命令是:`codex exec -m <ID> -s workspace-write -C <H>/wt/<run> --json -o <P>/transcripts/<run>.last-message.md -`。
  - prompt 从 stdin 传入。
  - 事件流写到 `<P>/transcripts/<run>.jsonl`,另外还有 `.stderr.log` 和 `.meta.json`。
- 臂 b 在任务原文后面只多一行:`请使用 <H>/skill-dp-trial/SKILL.md 这个技能来完成这个任务。`
- score.cjs 的输出写到 `<P>/scores/<run>.json`。如果对应的 transcript 存在，输出里会带上 classify 的结果。
- **泄漏判定。** 同一个系统用户的进程照样能读 `<P>`,所以 classify 会检查 transcript 里的每条命令和每个补丁，只要碰到下面任意一项，就记 `leak: true`,score 也会给出 `valid: false` 并附上原因，这次运行作废:
  - `dp-eval-private`
  - `oracles`
  - `ref-t1`/`ref-t2`
  - `trial-harness-01/validation`
  - 任一 oracle 文件名
  - `eval-katana`/`MEASUREMENT.md`,因为协议原文写明了 oracle 断言

  这个判定已经用自造的泄漏 transcript 验证过，见 `<P>/validation/leak-score-scratch-t1.json`。

## 已知偏差和需要注意的地方

1. **臂 b 不是 MEASUREMENT.md F3 里定义的"规则包"臂。** 这次比较的是"点名 design-pipeline 技能"和"不点名"。F3 的规则包臂这次没有跑。
2. **臂 a 被污染了，不是"无技能"。** 原因有两个:
   - Codex 总会列出全局技能 `~/.agents/skills/design-pipeline`,这是一个 junction,指向 `D:/projects/design-pipeline/skill`,版本是旧的 `c536589`。它没法隐藏，所以臂 a 实际上是"技能可见但没有点名"。
   - 两个臂都会加载 `~/.codex/AGENTS.md`、hooks、memories 和 plugins。

   因此分析时要按 transcript 里实际做了什么来归类，而不是只看臂的标签。`classify.cjs` / `score.cjs` 的 `process` 字段会给出这些信息:
   - 读的是哪个 SKILL.md:全局版、dp-trial-01 副本，还是 orca 源目录。
   - 有没有执行 `designer-pipeline`。
   - 第一次改文件之前，有没有读 `CONTEXT.md` 或 `docs/ux/*`。
   - 有没有跑 vitest 或 tsc。
   - 最终报告里有没有列出改动的文件、给出命令和结果、区分 fixture 和真实数据。
3. **每臂只跑 1 次，只算冒烟，不算结果。** F3 要求每臂至少 5 次。
4. **D 节的禁区表和 grep 正则对不上，score 取两者的并集。**
   - `panel-registry.tsx` 在 T1 里算命中;在 T2 里只有正好 +2/-0 才豁免。
   - `app/` 下的任何改动都算命中。
5. **F2 的六个标签在 oracle 里允许中英文任一写法。** 比如 `倍速|clock`、`回放|replay`、`播放中|playing`。另外 `FIXTURE PLAYBACK` 必须出现在首帧渲染里，这一条来自 kd-feed 的初始 mode。
6. **T2 测试完整性同时给出两个结论。**
   - 严格版(F2 原文):`panel-registry.test.ts` 只能新增行，唯一例外是 `toBe(42)` 那一行。
   - 宽松版:只要求不删除 `it(` 或 `expect(` 行。比如把 `'feedstatus'` 追加到已有的 golden 行上，严格版判失败，宽松版判通过。
   - 另外，如果 T2 改了 `panel-registry.test.ts` 里的测试标题，check 1 不会因此判失败，但会把这些标题列出来。
7. **score 不修改 worktree 的 index。** 它不用 `git add -N`,未跟踪文件通过 `ls-files --others` 读取。oracle 在 diff 统计完成之后才复制进去，跑完立即删除。
8. **transcript 解析的验证情况。**
   - omp 解析器已经在其他项目的历史会话上跑过(只读，结果在 `<P>/validation/omp-parser-test.json`),覆盖了以下几类:
     - 带 advisor 的会话
     - 带 pi-lens 自动修复和 6 个子 agent 的会话
     - 跑过 vitest 的会话
   - 读技能 URL、执行 designer-pipeline、泄漏、子 agent 早于第一次改文件这几种情况，在历史会话里找不到实例，只用自造的 omp 会话验证过(`<P>/validation/synthetic-omp/`)。
   - codex 解析器只在自造样例上验证过。
9. **workspace-write 沙箱可能挡住 agent 的 git 写操作(推断，未验证)。** worktree 的 git 元数据在 `D:/projects/KATANAview/.git/worktrees/<run>`,不在沙箱的可写根目录里，所以 agent 执行 `git add`/`git commit` 可能会失败。这不影响评分。
10. **`<H>` 下仍然看得到的痕迹。**
    - 只剩名字:验证用 worktree 的目录名 `scratch-oracle`,以及 `m0/` 里以它命名的日志文件。
    - `FIXTURE PLAYBACK` 本来就写在项目源码和文档里，属于正常内容。
    - `<H>` 下已经没有 oracle 正文、参考解、评分脚本，也没有私有目录的路径。
    - 早先冒烟时，t1-a、t2-a 的 `node_modules/.vite/vitest/results.json` 里留下过 oracle 文件名;scratch 的 `tsconfig.tsbuildinfo` 里留下过参考解的文件名。这些都已删除。score.cjs 现在跑 vitest 时带 `--no-cache`,不会再留下这类缓存。
