# 出图任务单

模板里每一种图位一份任务单：尺寸、安全区、留给 UI 的空白（按页面里的框换算成出图像素）、光、色板、风格参考、负面约束，最后是可以直接交给图像模型的提示词。`tasks.json` 是同样内容的机器可读版本。

模板里的图位（`.at-slot`）都带 `data-task`，值就是下表的任务 id；展示模式（组件预览、封面）不放任何角色。

**所有任务都是原创内容，不得出现任何现有作品的角色、标志或美术。**

| 任务 | 用途 | 尺寸 |
| --- | --- | --- |
| [agent-gravel](agent-gravel.md) | 调查员立绘：白砾（GRAVEL） | 1200×1600 px |
| [agent-card](agent-card.md) | 调查员卡面（通用规则，其余 6 名调查员各出一张） | 600×800 px |
| [arms-render](arms-render.md) | 武装道具图（12 件，逐件出） | 800×800 px |
| [item-condensate-core](item-condensate-core.md) | 物资图标：冷凝核心 | 512×512 px |
| [banner-polar-night](banner-polar-night.md) | 活动横幅：极夜远征 | 1600×900 px |
| [news-thumb](news-thumb.md) | 动态缩略图（通用） | 416×232 px |
