# 整站深度克隆 · Deep Site Clone

[English](README.md) · **简体中文** · [한국어](README.ko.md) · [日本語](README.ja.md)

> 交互式登录 → 全自动爬取 → 忠实重建**可离线打开的多页站**,并用 AI 逆推出**产品结构 / 数据模型 / 后端接口 / 设计系统**四份 Markdown 文档。

一款把「克隆一个网站」做成**任务式全自动软件**的工具:建任务 → 选深度与产物 → 用真实浏览器登录 → 点开始,之后无人值守跑到完成。基于 [open-lovable](https://github.com/mendableai/open-lovable) 二次开发,克隆能力全部在 `app/site-clone` 与 `lib/crawl` 下。

---

## 能做什么

| 产物 | 说明 |
|---|---|
| **离线多页站** | 忠实抓取并重建,双击即可离线打开,内部链接可点 |
| **产品结构** | AI 逆推信息架构 / 功能模块 |
| **数据模型** | AI 逆推后端数据实体与字段 |
| **服务端需求** | AI 逆推 REST API 文档 |
| **设计系统** | AI 提取设计 token / 组件规范 |

其它特性:

- **交互式登录门** —— 软件弹出一个**真实浏览器**,你在里面登录 / 导航到起点页,再点「开始」,因此**需要登录的站也能克隆**。登录态每站保存一次,可复用。
- **两种深度** —— `结构`:同模板页只抓 1 个代表页(快);`整站`:访问每一页 + 下载每一个资源(慢)。
- **克隆结构而非数据** —— 目标是复刻站点的模板/骨架,不是搬运内容。
- **同域限定** —— 只在起点 URL 的同一域名内爬取。
- **AI 只用在两处** —— 「定策略」与「逆推分析」;抓取与重建是确定性的,不经过大模型。
- **任务化管理** —— 按域名保存、历史查看、一键重跑、删除;**串行执行**(一次只跑一个任务)。
- **多语言 UI** —— 英 / 中 / 韩 / 日,缺项英文兜底。
- **可切换 AI 模型** —— 经 mdbox 网关的 3 个模型(见下),密钥可在设置面板里填,也可写进 `.env.local`。

### 流水线(6 阶段)

```
① 爬取 crawl → ② 定策略 plan (AI) → ③ 重建 build → ④ 蒸馏 distill → ⑤ 逆推 analyze (AI) → ⑥ 产物 Markdown
```

- 选了任一产物 → 跑 `crawl → (plan → build)`;
- 选了任一**分析类**产物(产品/数据/后端/设计) → 再跑 `distill → analyze`。

---

## 安装

**前置条件**

- Node.js 20+（18 亦可）
- 系统已安装 **Chrome 或 Edge**（抓取用 Playwright 驱动系统浏览器,免下载完整 Chromium)
- 一个 **OpenAI 兼容网关** 的 Base URL + API Key(本项目用 [mdbox](https://mdbox.ai);任何 OpenAI 兼容网关都可)

**步骤**

```bash
git clone https://github.com/hi5jeff/deepclonewebsite.git
cd deepclonewebsite/open-lovable
npm install

# 配置密钥
cp .env.example .env.local
# 编辑 .env.local,至少填入下面这几项(见「环境变量」)

# 启动(默认 http://localhost:3000,可用 -p 指定端口)
npm run dev
```

启动后打开 **`/site-clone`** 即为克隆软件主界面(例如 `http://localhost:3000/site-clone`)。

### 环境变量

在 `open-lovable/.env.local` 里填(该文件已被 `.gitignore`,密钥不会进仓库):

| 变量 | 必填 | 说明 |
|---|---|---|
| `OPENAI_BASE_URL` | ✅ | OpenAI 兼容网关地址(如 mdbox 的 `https://api.mdbox.ai/v1`) |
| `OPENAI_API_KEY` | ✅ | 网关密钥,https://mdbox.ai 获取 |

> 抓取用系统 Chrome/Edge(Playwright),**不需要** Firecrawl 或任何抓取服务的密钥。
> mdbox 密钥也可以不写进 `.env.local`,而是在页面右上角**设置面板**里填 —— 会存到 gitignored 的 `.clone-settings.json`,同样不进仓库。

---

## 使用

1. 打开 `/site-clone`。
2. (可选)在顶部**设置面板**选 AI 模型、填 mdbox 密钥(没填则用 `.env.local` 里的)。
3. 填写:
   - **起点 URL** —— 想克隆的页面地址;
   - **任务名**(可留空,默认用域名);
   - **爬虫深度** —— `结构` 或 `整站`;
   - **数据产物** —— 离线站 / 产品结构 / 数据模型 / 服务端需求 / 设计系统(多选)。
4. 点 **「创建任务并打开浏览器登录」** —— 桌面弹出真实浏览器。在那个窗口里登录 / 导航到起点页。
5. 点 **「开始」** —— 之后全自动跑,页面每 2 秒刷新进度,可在浏览器窗口看到标签翻页。
6. 完成后给出:**离线站入口链接** + 各 **Markdown 文档**链接。任务按域名归档,可随时重跑或删除。

---

## 边界与约定

- **仅克隆你拥有或有权限复刻的站点**;尊重目标站的服务条款与版权。
- 爬取**严格同域**,不跨站。
- AI 仅参与「定策略」「逆推分析」两个环节。
- 任务**串行**执行,一次一个。
- 克隆产物(离线站与文档)输出在 `public/site-clone/<域名>/<任务ID>/`,该目录已 gitignore(体积大,不进仓库)。

---

## 目录速览

```
open-lovable/
├─ app/site-clone/            # 克隆软件前端(建任务 / 登录门 / 进度 / 历史)
├─ app/api/crawl/             # 后端路由:open / start / task(create,list,run,status,delete) / settings ...
└─ lib/crawl/
   ├─ site-crawler.ts         # 爬取(结构 / 整站)
   ├─ plan-strategy.ts        # ② 定策略 (AI)
   ├─ rebuild-site.ts         # ③ 重建离线站
   ├─ analyze-site.ts         # ④⑤ 蒸馏 + 逆推 → Markdown (AI)
   ├─ run-task.ts             # 编排器(串行锁 + 进度回写)
   ├─ tasks.ts                # 任务存储(按域名)
   ├─ settings.ts             # 模型 / 密钥设置(.clone-settings.json)
   └─ llm.ts                  # OpenAI 兼容网关调用(SSE 流式)
```

---

## 致谢

前端与工程脚手架基于 [open-lovable](https://github.com/mendableai/open-lovable)(MIT)。整站深度克隆能力为本仓库新增。
