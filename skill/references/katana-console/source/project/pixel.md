# 点阵体系

点阵不是装饰，是这套系统的签名：所有"硬件读数"——标签、时钟、LED 矩阵、刻度、型号、开机序列——都用点阵字。全部开源（OFL / GPL+例外），可随 GPL 项目分发。

## 1. 字体清单

### 拉丁（Google Fonts 直接可用）

| 字体 | 可变轴 | 角色 key | 用在 |
|---|---|---|---|
| **Doto** | `wght` 100–900，`ROND` 0–100（点从方到圆） | `dot` | 标签、型号、LCD 标题 |
| **Sixtyfour** | `BLED` 0–100（溢光），`SCAN` -53–100（扫描线） | `led` | 顶栏时钟、异动跑马、开机自检 |
| **Workbench** | `BLED`，`SCAN`（Sixtyfour 的窄体） | `led-narrow` | LED 矩阵内文字、底栏跑马 |
| **Tiny5** | `wght` | `dot-5` | 最小标签、刻度 |
| **Micro 5** | — | `dot-micro` | 仪表刻度数字（5px） |
| **Jersey 10 / 15 / 20 / 25** | — | `dot-display` | 大号点阵标题：总览大屏、Workspace 名 |

### 中文（自托管）

| 字体 | 像素尺寸 | 角色 key | 来源 | 许可 |
|---|---|---|---|---|
| **方舟像素 Ark Pixel** | 10 / 12 / 16（等宽、比例两版） | `dot-cn-10/12/16` | GitHub TakWolf/ark-pixel-font | OFL |
| **缝合像素 Fusion Pixel** | 8 / 10 / 12 | `dot-cn-8`，并作 10/12 的备选 | GitHub TakWolf/fusion-pixel-font | OFL |
| **Unifont** | 16 | `dot-cn-16` 备选，全 Unicode 兜底 | unifoundry.com | GPL+例外 / OFL |
| Galmuri | 7–14 | 备选（日韩为主） | GitHub quiple/galmuri | OFL |

不进：丁卯点阵、Zpix（非商用许可）。

## 2. 硬规则

1. **整数倍。** 点阵字只在其原生尺寸的整数倍出现：12px 字 → 12 / 24 / 36；10px → 10 / 20 / 30；16px → 16 / 32。token 里没有 14px 的点阵。
2. **关抗锯齿。** 点阵文字 `-webkit-font-smoothing: none; font-smooth: never`；canvas 绘制 `image-rendering: pixelated`。
3. **像素网格对齐。** 容器尺寸、位置、行高全部取整；高 DPR 下按 `round(DPR)` 整数倍放大（2x 屏上 12px 字渲染为 24 物理像素，依旧锐利；1.5x 屏按 1 或 2 取整，不做 1.5）。
4. **不加字距、不斜体、不伪粗。** 粗细用 `wght` 轴，大小换尺寸版本。Doto 的点间距由字体自己决定。
5. **语境限定。** `tag` 9px 只允许 ≤ 8 个大写字母（角大小 + 字形简化 0.7 折，readability §1）；点阵中文只用于固定含义的位置。 点阵只出现在：标签 / 型号 / 时钟 / LED 矩阵 / 刻度 / 开机序列 / 跑马。正文、表格、按钮文字、图表轴永远不用点阵。
6. **中英分别取字。** `dot` 栈 = Doto → 方舟像素 12；一行里"NET ASSET 净资产"自动各用各的；汉字部分不加 letter-spacing。
7. **LED 字的 BLED 轴是动效参数。** 点亮：BLED 0 → 60，`snappy`；熄灭反向；呼吸（仅 danger）：40 ↔ 70，2s 周期。不要给 LED 字再加 box-shadow。

## 3. 尺寸表

| 角色 | 尺寸 | 行高 | 用在 |
|---|---|---|---|
| `dot-micro` | 5 | 6 | 仪表刻度 |
| `dot-5` | 10（Tiny5 ×2） | 12 | 最小标签 |
| `tag` | 9（Doto） | 12 | LCD 标题、型号——现有 |
| `tag-cn` | 12（方舟像素 12） | 14 | 点阵中文标签 |
| `dot-md` | 16（Doto） / 16（方舟 16） | 20 | 面板级点阵标题 |
| `led-md` | 20（Sixtyfour） | 24 | 顶栏时钟、延迟 |
| `led-xl` | 32（Sixtyfour） | 36 | 大屏时钟、自检 |
| `dot-display` | 40 / 60（Jersey 20 / 25 ×2） | 1.0 | 总览大屏标题、Workspace 名 |

## 4. 签名时刻

- **顶栏时钟**：Sixtyfour `led-md`，BLED 30，SCAN 20；秒位每秒 BLED 瞬间 → 60 再 `snappy` 回 30（字在"闪"）。安静模式下 BLED 固定 30。
- **开盘自检**：09:28:00（可配置）全屏 LED 矩阵，Workbench `led-xl` 逐行点亮 `QUOTE OK · EXEC OK · ALICE OK · 5,120 SYMBOLS`，3 秒，配 `link-up` 音效；可关；每日一次。
- **异动跑马**：底栏右侧 Workbench 单行，速度随异动面板的速度条；BLED 随速度 20–60。
- **总览大屏标题**：Jersey 25 ×2，点阵中文用方舟像素 16 ×2.5 不行——用方舟像素 16 ×2 = 32px，拉丁 Jersey 25 缩放至相近高度（Jersey 自带 10/15/20/25 四个高度，选 25 原生）。

## 5. 加载

- Google Fonts 六个（Doto、Sixtyfour、Workbench、Tiny5、Micro 5、Jersey）：开发期直接 `<link>`，生产自托管子集。
- 方舟像素 / 缝合像素：按 unicode-range 切片（点阵字体较小，10/12px 全量约 2–4 MB，切 20 片即可）；`font-display: optional`（点阵换字会跳，宁可首帧不显示）。
- 每个点阵字的 `@font-face` 必须带 `size-adjust: 100%` 与明确的 `unicode-range`，防止被系统字替代。

## 6. 和其他字体角色的关系

| 语境 | 字 |
|---|---|
| 硬件读数、标签、时钟、矩阵 | **点阵**（本页） |
| 数值、表格、代码 | Maple Mono CN（mono） |
| LCD 大数（金额） | DM Mono（lcd）——金额不用点阵，可读性优先 |
| 面板标题、工作区名 | Barlow Condensed + 得意黑（display）；大屏才换 Jersey |
| 正文 | Noto Sans SC（sans） |
