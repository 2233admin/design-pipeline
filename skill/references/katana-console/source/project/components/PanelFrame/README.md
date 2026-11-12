# PanelFrame

> 大屏模式下焦点面板四角加 `bracket`（一屏一组）；顶栏 / 底栏壳层用 `chamfer-8` 斜切；普通面板不斜切不加括号（signature.md）。

面板外框，所有工作台面板的统一壳：标题、当前对象、LinkGroup 色标、局部工具条、设置、最大化、关闭。

## 结构

- 32px 标题栏：色标（8px LED，取 `link-a…d`，无联动时 `led-off`）→ 标题（`label` 样式，大写）→ 当前对象（`mono` 11px `ink-300`，如"· 核心池 · 24"）→ 右侧 22px 图标按钮组（设置 / 最大化 / 关闭）。
- 内容区由面板自己决定密度（`row-tight` / `row-base` / `row-loose`）。
- 四角铆钉 5px——**只在外壳层级（顶栏、底栏、总览大板）**；普通面板只保留 1px 高光 + 1px 阴影，去掉 2px 厚度（分组用间距不用封闭，readability §5）。

## 状态

- 焦点面板：标题文字 `ink-100`，其余面板标题 `ink-300`；标题栏整体退后，让内容区最亮（三层对比，§2）。
- 固定（pin，不跟随联动）：色标变为空心圆 + 1px `line-200` 边。
- 拖起中：scale 1.02 + `shadow.lift`，`gentle` 弹簧。
- 最大化：`gentle` 缩放到满工作区，其他面板下沉（scale 0.985，亮度 -8%）。

## 规则

- 面板不得自己画边框或阴影，只能用 PanelFrame。
- 标题栏不得放超过 3 个图标按钮；更多进设置。
- 标题栏右键 = 局部菜单（换面板、换联动组、复制实例）。

## 谁提供什么

- 外壳提供：title、object、linkGroup、pinned、onMaximize、onClose、onSettings。
- 面板提供：children、density。
