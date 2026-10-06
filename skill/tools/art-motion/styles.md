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

These 35 original scenes are explicitly selectable with `scene` in `render.cjs` or
`runtime.drawScene(id, context, localTime, {globalTime, fit})`. Their source composition and
characters remain sample content. A caller-sized canvas does not automatically recompose an
authored scene; `contain`/`cover` only fits that study. For new work, use the technique itself.

| Scene ID | Recipe | Source implementation |
| --- | --- | --- |
| `01_cave` | [01_cave · 40,000 BC 洞穴岩画（纯代码）](../../vendor/huashu-art-motion/upstream/references/风格配方/01_cave.md) | [scene](../../vendor/huashu-art-motion/upstream/scripts/engine/scenes/01_cave.js) |
| `02_egypt` | [02_egypt · 公元前1350年埃及墓室壁画（纯代码）](../../vendor/huashu-art-motion/upstream/references/风格配方/02_egypt.md) | [scene](../../vendor/huashu-art-motion/upstream/scripts/engine/scenes/02_egypt.js) |
| `03_greek` | [03_greek · 公元前530 阿提卡黑绘陶器 —— 代码画法笔记](../../vendor/huashu-art-motion/upstream/references/风格配方/03_greek.md) | [scene](../../vendor/huashu-art-motion/upstream/scripts/engine/scenes/03_greek.js) |
| `04_roman` | [04_roman · 公元79年 庞贝马赛克 —— 手法笔记](../../vendor/huashu-art-motion/upstream/references/风格配方/04_roman.md) | [scene](../../vendor/huashu-art-motion/upstream/scripts/engine/scenes/04_roman.js) |
| `05_gothic` | [05_gothic · 1290 哥特泥金手抄本](../../vendor/huashu-art-motion/upstream/references/风格配方/05_gothic.md) | [scene](../../vendor/huashu-art-motion/upstream/scripts/engine/scenes/05_gothic.js) |
| `06_renaissance` | [06_renaissance · 1503 文艺复兴盛期（达芬奇式）](../../vendor/huashu-art-motion/upstream/references/风格配方/06_renaissance.md) | [scene](../../vendor/huashu-art-motion/upstream/scripts/engine/scenes/06_renaissance.js) |
| `08_impressionism` | [08_impressionism · 1874 印象派（莫奈）](../../vendor/huashu-art-motion/upstream/references/风格配方/08_impressionism.md) | [scene](../../vendor/huashu-art-motion/upstream/scripts/engine/scenes/08_impressionism.js) |
| `09_postimp` | [09_postimp · 1889 梵高（标杆实现）](../../vendor/huashu-art-motion/upstream/references/风格配方/09_postimp.md) | [scene](../../vendor/huashu-art-motion/upstream/scripts/engine/scenes/09_postimp.js) |
| `10_nouveau` | [10_nouveau · 1896 新艺术运动（慕夏海报）](../../vendor/huashu-art-motion/upstream/references/风格配方/10_nouveau.md) | [scene](../../vendor/huashu-art-motion/upstream/scripts/engine/scenes/10_nouveau.js) |
| `11_cubism` | [11_cubism · 1912 分析立体主义（毕加索／布拉克）](../../vendor/huashu-art-motion/upstream/references/风格配方/11_cubism.md) | [scene](../../vendor/huashu-art-motion/upstream/scripts/engine/scenes/11_cubism.js) |
| `12_bauhaus` | [12_bauhaus · 1923 包豪斯海报](../../vendor/huashu-art-motion/upstream/references/风格配方/12_bauhaus.md) | [scene](../../vendor/huashu-art-motion/upstream/scripts/engine/scenes/12_bauhaus.js) |
| `13_pop` | [13_pop · 1962 波普（利希滕斯坦漫画格＋沃霍尔四宫格）](../../vendor/huashu-art-motion/upstream/references/风格配方/13_pop.md) | [scene](../../vendor/huashu-art-motion/upstream/scripts/engine/scenes/13_pop.js) |
| `14_8bit` | [14_8bit · 1985 8-bit 像素游戏](../../vendor/huashu-art-motion/upstream/references/风格配方/14_8bit.md) | [scene](../../vendor/huashu-art-motion/upstream/scripts/engine/scenes/14_8bit.js) |
| `15_raytrace` | [15_raytrace · 1993 早期光线追踪 CGI](../../vendor/huashu-art-motion/upstream/references/风格配方/15_raytrace.md) | [scene](../../vendor/huashu-art-motion/upstream/scripts/engine/scenes/15_raytrace.js) |
| `16_2026` | [16_2026 · 2026 扁平矢量插画 ＋ 全片笑点收尾](../../vendor/huashu-art-motion/upstream/references/风格配方/16_2026.md) | [scene](../../vendor/huashu-art-motion/upstream/scripts/engine/scenes/16_2026.js) |
| `17_ink` | [17_ink · 中国水墨写意（八大山人／齐白石）](../../vendor/huashu-art-motion/upstream/references/风格配方/17_ink.md) | [scene](../../vendor/huashu-art-motion/upstream/scripts/engine/scenes/17_ink.js) |
| `18_klimt` | [18_klimt · 克里姆特金色时期（1907）](../../vendor/huashu-art-motion/upstream/references/风格配方/18_klimt.md) | [scene](../../vendor/huashu-art-motion/upstream/scripts/engine/scenes/18_klimt.js) |
| `19_munch` | [19_munch · 蒙克《呐喊》式表现主义（1893）](../../vendor/huashu-art-motion/upstream/references/风格配方/19_munch.md) | [scene](../../vendor/huashu-art-motion/upstream/scripts/engine/scenes/19_munch.js) |
| `20_dunhuang` | [20_dunhuang · 敦煌壁画（莫高窟·盛唐）](../../vendor/huashu-art-motion/upstream/references/风格配方/20_dunhuang.md) | [scene](../../vendor/huashu-art-motion/upstream/scripts/engine/scenes/20_dunhuang.js) |
| `21_kusama` | [21_kusama · 草间弥生无限波点](../../vendor/huashu-art-motion/upstream/references/风格配方/21_kusama.md) | [scene](../../vendor/huashu-art-motion/upstream/scripts/engine/scenes/21_kusama.js) |
| `22_constructivism` | [22_constructivism · 1924 俄罗斯构成主义海报（罗德琴科 / 李西茨基）](../../vendor/huashu-art-motion/upstream/references/风格配方/22_constructivism.md) | [scene](../../vendor/huashu-art-motion/upstream/scripts/engine/scenes/22_constructivism.js) |
| `23_dali` | [23_dali · 1931 达利超现实主义（《记忆的永恒》）](../../vendor/huashu-art-motion/upstream/references/风格配方/23_dali.md) | [scene](../../vendor/huashu-art-motion/upstream/scripts/engine/scenes/23_dali.js) |
| `24_hopper` | [24_hopper · 1942 霍珀美国现实主义（硬光块面）](../../vendor/huashu-art-motion/upstream/references/风格配方/24_hopper.md) | [scene](../../vendor/huashu-art-motion/upstream/scripts/engine/scenes/24_hopper.js) |
| `25_ghibli` | [25_ghibli · 1988 吉卜力式手绘水彩背景美术](../../vendor/huashu-art-motion/upstream/references/风格配方/25_ghibli.md) | [scene](../../vendor/huashu-art-motion/upstream/scripts/engine/scenes/25_ghibli.js) |
| `26_vaporwave` | [26_vaporwave · 2011 蒸汽波 / 赛博霓虹](../../vendor/huashu-art-motion/upstream/references/风格配方/26_vaporwave.md) | [scene](../../vendor/huashu-art-motion/upstream/scripts/engine/scenes/26_vaporwave.js) |
| `27_kirby` | [27_kirby · 1966 漫威银河时代（Jack Kirby ＋ 四色胶印）](../../vendor/huashu-art-motion/upstream/references/风格配方/27_kirby.md) | [scene](../../vendor/huashu-art-motion/upstream/scripts/engine/scenes/27_kirby.js) |
| `28_monet` | [28_monet · 1899 莫奈《睡莲》＋《日本桥》](../../vendor/huashu-art-motion/upstream/references/风格配方/28_monet.md) | [scene](../../vendor/huashu-art-motion/upstream/scripts/engine/scenes/28_monet.js) |
| `29_seurat` | [29_seurat · 1884 修拉《大碗岛的星期天下午》（点彩：视觉混色渲染器）](../../vendor/huashu-art-motion/upstream/references/风格配方/29_seurat.md) | [scene](../../vendor/huashu-art-motion/upstream/scripts/engine/scenes/29_seurat.js) |
| `30_matisse` | [30_matisse · 1947 马蒂斯《爵士》剪纸](../../vendor/huashu-art-motion/upstream/references/风格配方/30_matisse.md) | [scene](../../vendor/huashu-art-motion/upstream/scripts/engine/scenes/30_matisse.js) |
| `31_haring` | [31_haring · 1982 凯斯·哈林](../../vendor/huashu-art-motion/upstream/references/风格配方/31_haring.md) | [scene](../../vendor/huashu-art-motion/upstream/scripts/engine/scenes/31_haring.js) |
| `32_rembrandt` | [32_rembrandt · 1642 伦勃朗明暗法](../../vendor/huashu-art-motion/upstream/references/风格配方/32_rembrandt.md) | [scene](../../vendor/huashu-art-motion/upstream/scripts/engine/scenes/32_rembrandt.js) |
| `33_rubberhose` | [33_rubberhose · 1930 橡皮管卡通](../../vendor/huashu-art-motion/upstream/references/风格配方/33_rubberhose.md) | [scene](../../vendor/huashu-art-motion/upstream/scripts/engine/scenes/33_rubberhose.js) |
| `34_shadowpuppet` | [34_shadowpuppet · 中国皮影戏](../../vendor/huashu-art-motion/upstream/references/风格配方/34_shadowpuppet.md) | [scene](../../vendor/huashu-art-motion/upstream/scripts/engine/scenes/34_shadowpuppet.js) |
| `35_shinkai` | [35_shinkai · 2016 新海诚光影](../../vendor/huashu-art-motion/upstream/references/风格配方/35_shinkai.md) | [scene](../../vendor/huashu-art-motion/upstream/scripts/engine/scenes/35_shinkai.js) |
| `36_picasso_blue` | [36_picasso_blue · 1903 毕加索蓝色时期](../../vendor/huashu-art-motion/upstream/references/风格配方/36_picasso_blue.md) | [scene](../../vendor/huashu-art-motion/upstream/scripts/engine/scenes/36_picasso_blue.js) |

## Animation grammars

Eight parameterized grammars accept the selected clip's `data`, `theme`, `safe`, `alpha`
and timestamped `cues`. They are mechanisms for optional inserts, illustrations and motion
studies; choosing a grammar does not require a narrator. Inspect the actual output in each
aspect ratio. Keep evidence, numbers, units and source labels accurate.

| Grammar | Useful for | Card / input example |
| --- | --- | --- |
| `t1_3b1b` | Continuous mathematical/concept transforms | [card](../../vendor/huashu-art-motion/upstream/references/动画语法/t1_3b1b.md), [JSON](../../vendor/huashu-art-motion/upstream/scripts/engine/examples/t1_3b1b.json) |
| `t2_keynote_ui` | UI surfaces and feature/parameter reveals | [card](../../vendor/huashu-art-motion/upstream/references/动画语法/t2_keynote_ui.md), [JSON](../../vendor/huashu-art-motion/upstream/scripts/engine/examples/t2_keynote_ui.json) |
| `t3_finance_chart` | Scaled data, axes, annotations | [card](../../vendor/huashu-art-motion/upstream/references/动画语法/t3_finance_chart.md), [JSON](../../vendor/huashu-art-motion/upstream/scripts/engine/examples/t3_finance_chart.json) |
| `y1_kurzgesagt` | Flat worlds and scale changes | [card](../../vendor/huashu-art-motion/upstream/references/动画语法/y1_kurzgesagt.md), [JSON](../../vendor/huashu-art-motion/upstream/scripts/engine/examples/y1_kurzgesagt.json) |
| `y2_vox` | Evidence collage, source images and emphasis | [card](../../vendor/huashu-art-motion/upstream/references/动画语法/y2_vox.md), [JSON](../../vendor/huashu-art-motion/upstream/scripts/engine/examples/y2_vox.json) |
| `y3_whiteboard` | Measured path reveal and relationships | [card](../../vendor/huashu-art-motion/upstream/references/动画语法/y3_whiteboard.md), [JSON](../../vendor/huashu-art-motion/upstream/scripts/engine/examples/y3_whiteboard.json) |
| `y4_storytime` | Pose holds and reaction timing | [card](../../vendor/huashu-art-motion/upstream/references/动画语法/y4_storytime.md), [JSON](../../vendor/huashu-art-motion/upstream/scripts/engine/examples/y4_storytime.json) |
| `y5_kinetic_type` | Type as the moving subject | [card](../../vendor/huashu-art-motion/upstream/references/动画语法/y5_kinetic_type.md), [JSON](../../vendor/huashu-art-motion/upstream/scripts/engine/examples/y5_kinetic_type.json) |

The ninth [presenter grammar](../../vendor/huashu-art-motion/upstream/references/动画语法/y6_presenter_explainer.md) has a
[full-film reference implementation](../../vendor/huashu-art-motion/upstream/scripts/engine/reference_films/spacex/README.md),
not an upstream ninth parameterized clip. To make it, compose supplied keyed character frames
with charts/collage/type and explicit transcript cues using the same local runtime and asset
tools. Preserve the presenter staging, argument/action timing and framing methods; provide your
own character and audio assets. Do not advertise the incomplete upstream film as a ready render.

## Transitions and new styles

`runtime.transitionIds` lists the bundled transition functions on demand. Call
`runtime.transition(name, context, oldCanvas, newCanvas, progress, options)` with matching
canvas sizes, explicit time and a stable transition ID. Use the incoming medium as a design
prompt when useful; a direct cut is equally valid. Detailed methods live in the
[transition source](../../vendor/huashu-art-motion/upstream/scripts/engine/transitions.js) and
[migration notes](../../vendor/huashu-art-motion/upstream/references/风格配方/_转场_迁移测试.md).

For a new style, record its reference, material process, regional palette, rendering operations,
motion choices, transition behavior, costs and observed limitations in the existing project
notes. Verify the still frame and movement before reusing it. Do not copy the sample's fixed
character, canvas, compulsory direction count, motion quota or source quality rating.
