# Style and grammar lookup

Select by the requested material or mechanism. Read one recipe and the corresponding code;
there is no requirement to traverse this catalogue. The runtime's named scenes are optional
authored studies; use its drawing libraries to create the project's own subject and composition.

## Find a material

| Effect | Useful starting points |
| --- | --- |
| Wet paper, wash, dry ink | 17_ink, 25_ghibli, 28_monet |
| Thick pigment, directional marks, expression | 09_postimp, 19_munch, 32_rembrandt |
| Tile, stipple, dots, print registration | 04_roman, 13_pop, 21_kusama, 27_kirby, 29_seurat |
| Gold, aged fresco, ornamental contour | 05_gothic, 10_nouveau, 18_klimt, 20_dunhuang |
| Collage, cut paper, geometry, poster type | 11_cubism, 12_bauhaus, 22_constructivism, 30_matisse |
| Hard light, atmospheric emission, screen artefacts | 15_raytrace, 24_hopper, 26_vaporwave, 35_shinkai |
| Limited drawings, ink silhouettes, pixel frames | 01_cave, 02_egypt, 03_greek, 14_8bit, 31_haring, 33_rubberhose, 34_shadowpuppet |

## Authored style studies

These 35 original scenes are explicitly selectable with `scene` in `art-motion render` or
`runtime.drawScene(id, context, localTime, {globalTime, fit})`. Their authored composition and
characters remain sample content. A caller-sized canvas does not automatically recompose an
authored scene; `contain`/`cover` only fits that study. For new work, use the technique itself.
The [style index](../../references/art-motion/styles/index.md) summarizes every recipe.

| Scene ID | Recipe | Implementation |
| --- | --- | --- |
| `01_cave` | [01_cave · 40,000 BC 洞穴岩画（纯代码）](../../references/art-motion/styles/01_cave.md) | [scene](engine/scenes/01_cave.js) |
| `02_egypt` | [02_egypt · 公元前1350年埃及墓室壁画（纯代码）](../../references/art-motion/styles/02_egypt.md) | [scene](engine/scenes/02_egypt.js) |
| `03_greek` | [03_greek · 公元前530 阿提卡黑绘陶器 —— 代码画法笔记](../../references/art-motion/styles/03_greek.md) | [scene](engine/scenes/03_greek.js) |
| `04_roman` | [04_roman · 公元79年 庞贝马赛克 —— 手法笔记](../../references/art-motion/styles/04_roman.md) | [scene](engine/scenes/04_roman.js) |
| `05_gothic` | [05_gothic · 1290 哥特泥金手抄本](../../references/art-motion/styles/05_gothic.md) | [scene](engine/scenes/05_gothic.js) |
| `06_renaissance` | [06_renaissance · 1503 文艺复兴盛期（达芬奇式）](../../references/art-motion/styles/06_renaissance.md) | [scene](engine/scenes/06_renaissance.js) |
| `08_impressionism` | [08_impressionism · 1874 印象派（莫奈）](../../references/art-motion/styles/08_impressionism.md) | [scene](engine/scenes/08_impressionism.js) |
| `09_postimp` | [09_postimp · 1889 梵高（标杆实现）](../../references/art-motion/styles/09_postimp.md) | [scene](engine/scenes/09_postimp.js) |
| `10_nouveau` | [10_nouveau · 1896 新艺术运动（慕夏海报）](../../references/art-motion/styles/10_nouveau.md) | [scene](engine/scenes/10_nouveau.js) |
| `11_cubism` | [11_cubism · 1912 分析立体主义（毕加索／布拉克）](../../references/art-motion/styles/11_cubism.md) | [scene](engine/scenes/11_cubism.js) |
| `12_bauhaus` | [12_bauhaus · 1923 包豪斯海报](../../references/art-motion/styles/12_bauhaus.md) | [scene](engine/scenes/12_bauhaus.js) |
| `13_pop` | [13_pop · 1962 波普（利希滕斯坦漫画格＋沃霍尔四宫格）](../../references/art-motion/styles/13_pop.md) | [scene](engine/scenes/13_pop.js) |
| `14_8bit` | [14_8bit · 1985 8-bit 像素游戏](../../references/art-motion/styles/14_8bit.md) | [scene](engine/scenes/14_8bit.js) |
| `15_raytrace` | [15_raytrace · 1993 早期光线追踪 CGI](../../references/art-motion/styles/15_raytrace.md) | [scene](engine/scenes/15_raytrace.js) |
| `16_2026` | [16_2026 · 2026 扁平矢量插画 ＋ 全片笑点收尾](../../references/art-motion/styles/16_2026.md) | [scene](engine/scenes/16_2026.js) |
| `17_ink` | [17_ink · 中国水墨写意（八大山人／齐白石）](../../references/art-motion/styles/17_ink.md) | [scene](engine/scenes/17_ink.js) |
| `18_klimt` | [18_klimt · 克里姆特金色时期（1907）](../../references/art-motion/styles/18_klimt.md) | [scene](engine/scenes/18_klimt.js) |
| `19_munch` | [19_munch · 蒙克《呐喊》式表现主义（1893）](../../references/art-motion/styles/19_munch.md) | [scene](engine/scenes/19_munch.js) |
| `20_dunhuang` | [20_dunhuang · 敦煌壁画（莫高窟·盛唐）](../../references/art-motion/styles/20_dunhuang.md) | [scene](engine/scenes/20_dunhuang.js) |
| `21_kusama` | [21_kusama · 草间弥生无限波点](../../references/art-motion/styles/21_kusama.md) | [scene](engine/scenes/21_kusama.js) |
| `22_constructivism` | [22_constructivism · 1924 俄罗斯构成主义海报（罗德琴科 / 李西茨基）](../../references/art-motion/styles/22_constructivism.md) | [scene](engine/scenes/22_constructivism.js) |
| `23_dali` | [23_dali · 1931 达利超现实主义（《记忆的永恒》）](../../references/art-motion/styles/23_dali.md) | [scene](engine/scenes/23_dali.js) |
| `24_hopper` | [24_hopper · 1942 霍珀美国现实主义（硬光块面）](../../references/art-motion/styles/24_hopper.md) | [scene](engine/scenes/24_hopper.js) |
| `25_ghibli` | [25_ghibli · 1988 吉卜力式手绘水彩背景美术](../../references/art-motion/styles/25_ghibli.md) | [scene](engine/scenes/25_ghibli.js) |
| `26_vaporwave` | [26_vaporwave · 2011 蒸汽波 / 赛博霓虹](../../references/art-motion/styles/26_vaporwave.md) | [scene](engine/scenes/26_vaporwave.js) |
| `27_kirby` | [27_kirby · 1966 漫威银河时代（Jack Kirby ＋ 四色胶印）](../../references/art-motion/styles/27_kirby.md) | [scene](engine/scenes/27_kirby.js) |
| `28_monet` | [28_monet · 1899 莫奈《睡莲》＋《日本桥》](../../references/art-motion/styles/28_monet.md) | [scene](engine/scenes/28_monet.js) |
| `29_seurat` | [29_seurat · 1884 修拉《大碗岛的星期天下午》（点彩：视觉混色渲染器）](../../references/art-motion/styles/29_seurat.md) | [scene](engine/scenes/29_seurat.js) |
| `30_matisse` | [30_matisse · 1947 马蒂斯《爵士》剪纸](../../references/art-motion/styles/30_matisse.md) | [scene](engine/scenes/30_matisse.js) |
| `31_haring` | [31_haring · 1982 凯斯·哈林](../../references/art-motion/styles/31_haring.md) | [scene](engine/scenes/31_haring.js) |
| `32_rembrandt` | [32_rembrandt · 1642 伦勃朗明暗法](../../references/art-motion/styles/32_rembrandt.md) | [scene](engine/scenes/32_rembrandt.js) |
| `33_rubberhose` | [33_rubberhose · 1930 橡皮管卡通](../../references/art-motion/styles/33_rubberhose.md) | [scene](engine/scenes/33_rubberhose.js) |
| `34_shadowpuppet` | [34_shadowpuppet · 中国皮影戏](../../references/art-motion/styles/34_shadowpuppet.md) | [scene](engine/scenes/34_shadowpuppet.js) |
| `35_shinkai` | [35_shinkai · 2016 新海诚光影](../../references/art-motion/styles/35_shinkai.md) | [scene](engine/scenes/35_shinkai.js) |
| `36_picasso_blue` | [36_picasso_blue · 1903 毕加索蓝色时期](../../references/art-motion/styles/36_picasso_blue.md) | [scene](engine/scenes/36_picasso_blue.js) |

## Animation grammars

Eight parameterized grammars accept the selected clip's `data`, `theme`, `safe`, `alpha`
and timestamped `cues`. They are mechanisms for optional inserts, illustrations and motion
studies; choosing a grammar does not require a narrator. Inspect the actual output in each
aspect ratio. Keep evidence, numbers, units and source labels accurate.

| Grammar | Useful for | Card / input example |
| --- | --- | --- |
| `t1_3b1b` | Continuous mathematical/concept transforms | [card](../../references/art-motion/grammars/t1_3b1b.md), [JSON](examples/t1_3b1b.json) |
| `t2_keynote_ui` | UI surfaces and feature/parameter reveals | [card](../../references/art-motion/grammars/t2_keynote_ui.md), [JSON](examples/t2_keynote_ui.json) |
| `t3_finance_chart` | Scaled data, axes, annotations | [card](../../references/art-motion/grammars/t3_finance_chart.md), [JSON](examples/t3_finance_chart.json) |
| `y1_kurzgesagt` | Flat worlds and scale changes | [card](../../references/art-motion/grammars/y1_kurzgesagt.md), [JSON](examples/y1_kurzgesagt.json) |
| `y2_vox` | Evidence collage, source images and emphasis | [card](../../references/art-motion/grammars/y2_vox.md), [JSON](examples/y2_vox.json) |
| `y3_whiteboard` | Measured path reveal and relationships | [card](../../references/art-motion/grammars/y3_whiteboard.md), [JSON](examples/y3_whiteboard.json) |
| `y4_storytime` | Pose holds and reaction timing | [card](../../references/art-motion/grammars/y4_storytime.md), [JSON](examples/y4_storytime.json) |
| `y5_kinetic_type` | Type as the moving subject | [card](../../references/art-motion/grammars/y5_kinetic_type.md), [JSON](examples/y5_kinetic_type.json) |

The ninth [presenter grammar](../../references/art-motion/grammars/y6_presenter_explainer.md) is a
method card, not a ninth parameterized clip, and no full-film implementation ships. To make it,
compose supplied keyed character frames with charts/collage/type and explicit transcript cues
using the same local runtime and asset tools. Preserve the presenter staging, argument/action
timing and framing methods; provide your own character and audio assets.

## Transitions and new styles

`runtime.transitionIds` lists the bundled transition functions on demand. Call
`runtime.transition(name, context, oldCanvas, newCanvas, progress, options)` with matching
canvas sizes, explicit time and a stable transition ID. Use the incoming medium as a design
prompt when useful; a direct cut is equally valid. Detailed methods live in the
[transition source](engine/transitions.js) and
[transition migration notes](../../references/art-motion/styles/transitions.md).

For a new style, record its reference, material process, regional palette, rendering operations,
motion choices, transition behavior, costs and observed limitations in the existing project
notes. Verify the still frame and movement before reusing it. Do not copy the sample's fixed
character, canvas, compulsory direction count, motion quota or source quality rating.
