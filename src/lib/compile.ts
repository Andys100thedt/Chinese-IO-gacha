// ============================================================================
// Compile the structured workspace into a labeled Markdown document, styled
// after IO-sample-labeled.md. Used by the preview panel and the .md export.
// ============================================================================

import type { ArgumentElement, Workspace } from "./types";

function argHeading(arg: ArgumentElement, domain: "文学" | "非文学"): string {
  const text = domain === "文学" ? "文学文本" : "非文学文本";
  if (arg.kind === "main") {
    return `[主选段 — 分论点#${domain}:${arg.index} — ${text}]`;
  }
  return `[联系全文选段 — 分论点#${domain}:${arg.index} — ${text}]`;
}

function renderArgument(arg: ArgumentElement, domain: "文学" | "非文学"): string {
  const lines: string[] = [];
  lines.push(argHeading(arg, domain));
  lines.push("---");
  // 主要陈述（头部TB）
  if (arg.mainStatement.trim()) {
    lines.push(arg.mainStatement.trim());
  } else {
    lines.push("`（主要陈述：一级手法 + 作用连接 + 一级落脚点）`");
  }
  // 一级手法 / 一级落脚点
  const pt = arg.primaryTechnique.trim();
  const pl = arg.primaryLandingPoint.trim();
  if (pt || pl) {
    lines.push("");
    lines.push(`> 一级手法：\`${pt || "—"}\`　|　一级落脚点：\`${pl || "—"}\``);
  }
  // 链条
  if (arg.chains.length) {
    lines.push("");
    arg.chains.forEach((c, i) => {
      const t = c.technique.trim() || "—";
      const e = c.effect.trim() || "—";
      const l = c.landingPoint.trim() || "—";
      lines.push(`${i + 1}. **二级手法**「${t}」→ **作用**：${e} → **落脚点**：${l}`);
    });
  }
  return lines.join("\n");
}

function taBlock(label: string, content: string): string {
  const body = content.trim() ? content.trim() : "（待填）";
  return `${label}\n---\n${body}`;
}

function tbBlock(label: string, content: string): string {
  const body = content.trim() ? content.trim() : "（待填）";
  return `${label}\n---\n\`${body}\``;
}

export function compileToMarkdown(ws: Workspace): string {
  const parts: string[] = [];

  parts.push(`# [标题]: ${ws.title.trim() || "（未命名全球性话题）"}`);
  parts.push("");

  // 1. 开场
  parts.push(tbBlock("[开场白；GI+领域陈述]", ws.opening.greeting));
  parts.push("");
  parts.push(taBlock("[解释&定义：GI]", ws.opening.giDefinition));
  parts.push("");

  // 2. 内容：文学文本
  parts.push(taBlock("[介绍：文学文本]", ws.literary.intro));
  parts.push("");
  ws.literary.arguments.forEach((a) => {
    parts.push(renderArgument(a, "文学"));
    parts.push("");
  });

  // 3. 过渡
  parts.push(taBlock("[过渡：文学文本→非文学文本]", ws.transition));
  parts.push("");

  // 4. 内容：非文学文本
  parts.push(taBlock("[介绍：非文学文本]", ws.nonLiterary.intro));
  parts.push("");
  ws.nonLiterary.arguments.forEach((a) => {
    parts.push(renderArgument(a, "非文学"));
    parts.push("");
  });

  // 5. 结尾
  parts.push(taBlock("[结尾]", ws.conclusion));
  parts.push("");

  // 节选资产
  if (ws.excerpts.length) {
    parts.push("[节选资产]");
    parts.push("---");
    ws.excerpts.forEach((e) => {
      parts.push(`### ${e.title.trim() || "未命名节选"}`);
      parts.push("```");
      parts.push(e.content.trim() || "（待填）");
      parts.push("```");
    });
  }

  return parts.join("\n");
}
