---
"This document is for Claude"
---

我（Claude的用户）是一名IB Chinese SL学生，正因为它的IO被困扰。

这是我的IO提纲写作辅助app项目

建议你先看[我IO的结构](.\IO-structure.md)

这个项目的目的在于帮助我快速列出中文IO的提纲。

规定：“分论点#A1-B4”这一标记方法(文学记为A，非文学记为B)。

为了给你一个好的demonstration，我有一个[IO-sample](.\IO-sample-plain.md)和[它被标注的版本](.\IO-sample-labeled.md)，用于解释这些“结构”背后的真实内容案例都是什么。

我希望的形式：
- 这个app应该是一个以agent为中心的app。Agent在其中扮演了“完形填空”的角色。
- 这个app开屏即是一个workspace，指向一个空白的初始IO模板界面（当没有任何使用记录时）。
- 从UI/User Flow的角度看，用户可以交互的地方：
  + landing workspace的最上层是一个一级list：包含五个immutable的headings，固定为整篇IO的五个最上层结构（1. [开场]2. [内容：文学文本]3. [过渡]4. [内容：非文学文本]5. [结尾]）。
  + 如果一级list中的某一选项有在[IO-structure](.\IO-structure.md)中被[展开](`在**其中：**内`)的二级结构，那么它们的二级结构中的元素将作为“最小的mutable单元”出现在对应的一级下。
  + 如果某一个一级选项没有被定义的二级结构，那么它的唯一一个二级元素就是一个TA文本框。
  + 最后是一个节选资产元素。
- 其中，minimum mutable的二级元素内容的详细enum，按不同的元素类型归类定义：
  + \\[开场]\\
  + 1. [开场白；GI+领域陈述]：只能由用户输入的TB文本框。
  + 2. [解释&定义：GI]：一个TA文本框。
  + \\[内容：文本]（对于A文学文本和B非文学文本都生效）\\
  + 1. [介绍：文本]：一个TA文本框。
  + 2. [主选段 — 分论点#1] / [主选段 — 分论点#2] / [联系全文选段×2 — 分论点#3,4]：一个论点元素。

Definitions:
- `TA文本框` = `Type-A文本框` = “用于存储长段文字段落的文本框” ≈ Markdown code block
- `TB文本框` = `Type-B文本框` = “用于支撑简要要点/概述内容的容器文本框” ≈ Markdown inline code
- `论点元素` = `论点元素`，其内容为：
  + 1. 以一个特殊结构开始，这个结构包含：[^1](`注：这么设计是因为**主要陈述=一级手法+作用连接+一级落脚点**的核心直觉。`)
       1. 一个头部TB文本框，用于存放该论点**主要陈述**的那一句话
       2. 由头部文本框引出的两个TB文本框，用于存放**一级手法**和**一级落脚点**
  + 2. 一个内容列表，用于存放该论点中全部的[二级手法->作用->二级落脚点]链条。

Specs:
- App使用某种（推荐使用`LocalStorage`）持久化存储存储**全部**的app数据状态信息，同时保证app的**全部**数据可以“serialize-at-any-time” when on demand.这一点可以通过一个“导出workspace为文件”的feature来实现。
- 虽然在[IO-structure](.\IO-structure.md)的定义中，每个文本的论点3和4是一个整体：[联系全文选段×2 — 分论点#3,4]。但是在构建这个项目的数据化结构时把它们当成**分离的部分**。
- 将Agent用到的提示词摆在项目中显眼、易更改的地方，并以任何形式（可以是一份交付文档/提示词文件内的注释/或者和我的chat中告诉我：每一份提示词都在什么“时候”被用到——阅读它的时候，Agent有哪些提示词？）

Designs:
- Agent在项目中的具体定位：一个智能chatbot assistant，拥有全量上下文，在一个sidebar中与用户对话。随时回滚上下文和对应的workspace状态。新建/重拾session。可以进行全局修改。
- 核心设计：
  1. anything as the context. 上传**一切信息**到agent的系统提示词中作为上下文。甚至包括IO-sample-labeled和IO-sample-plain，当然也包括IO-structure。
  2. each action as a tool. Agent通过和数据结构高度契合的自定义tool生态修改提纲内容。每次Tool call都是一次对artifact的操作。

Tech-stack:
- 使用全栈Next.js。
- 合适的Node.js Next.js React版本可用。
- 使用JetBrains Mono作为默认字体。