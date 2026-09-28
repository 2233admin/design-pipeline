---
version: "1.0"
name: OpenAlice research continuity film
description: 一个研究对象留下来源、版本和关联报告
---

# OpenAlice：研究留下痕迹

## Product Context

CERE-482 已批准制作；用户最终视觉接受仍 pending。观众是使用 agent 的研究者，任务是看懂一份研究如何局部补证、保存、被 Inbox 引用，而不是产品功能轮播。原生产品 UI 未复刻；所有空间布局、摘录移动、版本缩略和镜头均为示意表达。

## Overview

唯一主题：NVIDIA FY2025 数据中心收入研究。问题是 “What changed in data-center revenue?”，只陈述历史来源，不推断投资价值或需求预测。原始 research.md 始终保留在 workspace，Session 身份 research-01 不变。Inbox 收到关联报告和文件引用，不接管原文件。

## Colors

深墨 #0a0d12 背景，#182329 纸面，暖白 #f3eee5 正文，#b4bdc7 支持文字，薄荷 #81d6b3 来源/引用。琥珀 #e8b64c 仅片尾人类 review 边界；不用于数据表现。

## Typography

Segoe UI/system sans；Consolas 元数据。研究题目 29px，证据数值 47px，指标口径 19px，来源 16px；来源近景整体放大。版本与附件缩略复制真实正文，约0.35倍缩放；外部版本标签17px。无大标题承担叙事。1280×720、16:9、无声，预览整体等比缩放。

## Layout

先聚焦带具体指标口径的证据与来源，既有研究纸面留作可识别目的地；同一证据 DOM 移动缩放落入正文。保存触发镜头拉出，v01/v02 从纸面背后抽出，复制正文及薄荷来源痕迹。随后沿引用线生成 Inbox 附件缩略。原件始终留在 workspace，不是两个完整面板全程并排，也不是整块场景替换。

## Components

同一 workspace、research.md、来源 [1]、v01 与 v02 保存缩略、原 Session research-01、Inbox report/attachment reference。最终只有 “Ready for your review” 和 “No trade placed”，没有交易提案、批准或执行暗示。

画内来源和附件是不可聚焦、不可导航的影片文字；真实来源链接留在播放器框外。片尾收紧同一desk，让人审边界位于原生视频控件上方安全区，不覆盖正文或移走原件。

## Do's and Don'ts

局部变化用位置和标记共同说明，不只用颜色。原文件和保存版本出现后不消失。不得添加交易审批、粒子、五面板、含混 OMP 或开关主张。技术验证与视觉接受分开。

## Source Decisions

一手来源：NVIDIA Newsroom，2025-02-26，NVIDIA Announces Financial Results for Fourth Quarter and Fiscal 2025，Data Center 段：全文年收入 $115.2 billion，同比增长 142%。
<https://nvidianews.nvidia.com/news/nvidia-announces-financial-results-for-fourth-quarter-and-fiscal-2025>

实现前已读取官方全文；文案明确写 “Data Center revenue / FY2025”，其下 $115.2B / +142% year over year，不让人误读成公司总收入。来源是既有历史资料，不是实时行情或投资建议。产品关系沿用 spec 的只读产品依据，不声称实现了实际 UI。

Adopted: 官方历史收入及来源身份、同一 workspace 和原 Session 的引用关系。Rejected: 旧片五面板轮播、自动交易审批叙事、真实 UI 复刻与投资推论。
