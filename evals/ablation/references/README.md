# 参考页

`reference-system` 变体放进工作目录 `references/` 的参考图从这里来。

- 按风格名分目录（`foundry-console/`、`broadsheet/`）。某个场景要用专门的参考，就建一个和场景同名的目录，它优先于风格目录。
- 每个目录里是 HTML 参考页或图片（png、jpg、webp）。HTML 参考页在跑的时候按它声明的尺寸截成 PNG：`<meta name="reference-size" content="1440x900">`，没写就是 1440×900。代理看到的只有图片。
- 这里的四张参考页是为本实测原创的：内容、文字和版式都不取自任何真实产品或出版物，不用第三方素材。每种风格一张产品界面、一张封面。
- 参考页的内容和场景的内容不同。它们给的是版式、层级和细节处理的样子，不是答案。

## 换成自己的参考

原创参考页比不上真实的高水准参考。要验证“先去找真实参考”这条做法，用自己的截图跑：

```sh
node evals/ablation/run.mjs --client claude --variants bare,full,reference-system --references <你的目录>
```

`<你的目录>` 的结构和这里一样：`<风格名或场景名>/*.png`。这些截图只在本机用，不要提交进仓库；结果目录的 `environment.jsonl` 会记下用的是哪个目录。用了自己的参考时，结论里要写明参考的来源。
