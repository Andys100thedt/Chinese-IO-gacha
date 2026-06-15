// ============================================================================
// Agent tool ecosystem — "each action as a tool".
//
// Every mutation the agent can perform on the outline artifact is a tool here.
// The SAME apply logic runs server-side (inside the tool-calling loop in
// /api/agent) against a deep-cloned workspace, so the client only has to swap in
// the returned workspace. Tool definitions are exported in OpenAI/OpenRouter
// function-calling format.
// ============================================================================

import type { Workspace, ArgumentElement, FieldPath } from "./types";

// ---- OpenAI/OpenRouter function-tool definitions ----------------------------

export const TOOL_DEFINITIONS = [
  {
    type: "function" as const,
    function: {
      name: "set_title",
      description:
        "设置整篇 IO 的标题（即全球性话题 GI）。例如：固有社会期待对女性的束缚。",
      parameters: {
        type: "object",
        properties: { title: { type: "string", description: "标题文本" } },
        required: ["title"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "set_field",
      description:
        "设置一个独立文本框的内容。path 决定目标：opening.giDefinition=[解释&定义：GI](TA，长段落)，literary.intro=[介绍：文学文本](TA)，transition=[过渡](TA)，nonLiterary.intro=[介绍：非文学文本](TA)，conclusion=[结尾](TA)。注意：[开场白；GI+领域陈述] 仅用户可填，不在此列。",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            enum: [
              "opening.giDefinition",
              "literary.intro",
              "transition",
              "nonLiterary.intro",
              "conclusion",
            ],
          },
          content: { type: "string" },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "set_argument",
      description:
        "设置某个分论点(论点元素)的头部三元组。argId 形如 A1..A4(文学) 或 B1..B4(非文学)。直觉：主要陈述 = 一级手法 + 作用连接 + 一级落脚点。三个字段都可选，只传需要修改的。",
      parameters: {
        type: "object",
        properties: {
          argId: { type: "string", description: "A1..A4 或 B1..B4" },
          mainStatement: {
            type: "string",
            description: "头部TB：主要陈述（统领整个分论点的那一句话）",
          },
          primaryTechnique: { type: "string", description: "TB：一级手法" },
          primaryLandingPoint: {
            type: "string",
            description: "TB：一级落脚点（如何贡献于对 GI 的讨论）",
          },
        },
        required: ["argId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "add_chain",
      description:
        "向某个分论点的内容列表追加一条 [二级手法->作用->二级落脚点] 逻辑链条。返回新链条 id。",
      parameters: {
        type: "object",
        properties: {
          argId: { type: "string" },
          technique: { type: "string", description: "二级手法（具体技巧/文本要素）" },
          effect: { type: "string", description: "作用/效果（流畅明确地阐述）" },
          landingPoint: {
            type: "string",
            description: "二级落脚点（连接到一级落脚点或直接连接 GI）",
          },
        },
        required: ["argId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_chain",
      description: "修改某分论点中已存在的链条。只传需要修改的字段。",
      parameters: {
        type: "object",
        properties: {
          argId: { type: "string" },
          chainId: { type: "string" },
          technique: { type: "string" },
          effect: { type: "string" },
          landingPoint: { type: "string" },
        },
        required: ["argId", "chainId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "remove_chain",
      description: "删除某分论点中的一条链条。",
      parameters: {
        type: "object",
        properties: {
          argId: { type: "string" },
          chainId: { type: "string" },
        },
        required: ["argId", "chainId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "set_excerpt",
      description: "更新一个已存在的原文节选（节选资产）。title/content 可选。",
      parameters: {
        type: "object",
        properties: {
          excerptId: { type: "string" },
          title: { type: "string" },
          content: { type: "string" },
        },
        required: ["excerptId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "add_excerpt",
      description: "新增一个原文节选条目。返回新 id。",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          content: { type: "string" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "remove_excerpt",
      description: "删除一个原文节选条目。",
      parameters: {
        type: "object",
        properties: { excerptId: { type: "string" } },
        required: ["excerptId"],
      },
    },
  },
];

// ---- Apply logic ------------------------------------------------------------

export function findArgument(
  ws: Workspace,
  argId: string,
): ArgumentElement | undefined {
  const pool =
    argId.startsWith("A")
      ? ws.literary.arguments
      : argId.startsWith("B")
        ? ws.nonLiterary.arguments
        : [];
  return pool.find((a) => a.id === argId);
}

function genId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

type Args = Record<string, unknown>;
const str = (v: unknown): string | undefined =>
  typeof v === "string" ? v : undefined;

/**
 * Mutate `ws` (caller should pass a clone) according to one tool call.
 * Returns a short human-readable result string (used as the tool message and
 * surfaced in the UI changelog).
 */
export function applyToolCall(ws: Workspace, name: string, args: Args): string {
  switch (name) {
    case "set_title": {
      ws.title = str(args.title) ?? "";
      return `已设置标题：「${ws.title}」`;
    }
    case "set_field": {
      const path = str(args.path) as FieldPath | undefined;
      const content = str(args.content) ?? "";
      switch (path) {
        case "opening.greeting":
          return "错误：[开场白；GI+领域陈述] 仅用户可填，Agent 无法修改。";
        case "opening.giDefinition":
          ws.opening.giDefinition = content;
          break;
        case "literary.intro":
          ws.literary.intro = content;
          break;
        case "transition":
          ws.transition = content;
          break;
        case "nonLiterary.intro":
          ws.nonLiterary.intro = content;
          break;
        case "conclusion":
          ws.conclusion = content;
          break;
        default:
          return `错误：未知 path「${String(args.path)}」`;
      }
      return `已更新字段 ${path}（${content.length} 字）`;
    }
    case "set_argument": {
      const arg = findArgument(ws, str(args.argId) ?? "");
      if (!arg) return `错误：找不到分论点 ${String(args.argId)}`;
      if (str(args.mainStatement) !== undefined)
        arg.mainStatement = str(args.mainStatement)!;
      if (str(args.primaryTechnique) !== undefined)
        arg.primaryTechnique = str(args.primaryTechnique)!;
      if (str(args.primaryLandingPoint) !== undefined)
        arg.primaryLandingPoint = str(args.primaryLandingPoint)!;
      return `已更新分论点 ${arg.id} 的头部三元组`;
    }
    case "add_chain": {
      const arg = findArgument(ws, str(args.argId) ?? "");
      if (!arg) return `错误：找不到分论点 ${String(args.argId)}`;
      const id = genId("chain");
      arg.chains.push({
        id,
        technique: str(args.technique) ?? "",
        effect: str(args.effect) ?? "",
        landingPoint: str(args.landingPoint) ?? "",
      });
      return `已为 ${arg.id} 新增链条 ${id}`;
    }
    case "update_chain": {
      const arg = findArgument(ws, str(args.argId) ?? "");
      if (!arg) return `错误：找不到分论点 ${String(args.argId)}`;
      const chain = arg.chains.find((c) => c.id === str(args.chainId));
      if (!chain) return `错误：找不到链条 ${String(args.chainId)}`;
      if (str(args.technique) !== undefined) chain.technique = str(args.technique)!;
      if (str(args.effect) !== undefined) chain.effect = str(args.effect)!;
      if (str(args.landingPoint) !== undefined)
        chain.landingPoint = str(args.landingPoint)!;
      return `已更新 ${arg.id} 的链条 ${chain.id}`;
    }
    case "remove_chain": {
      const arg = findArgument(ws, str(args.argId) ?? "");
      if (!arg) return `错误：找不到分论点 ${String(args.argId)}`;
      const before = arg.chains.length;
      arg.chains = arg.chains.filter((c) => c.id !== str(args.chainId));
      return before === arg.chains.length
        ? `错误：找不到链条 ${String(args.chainId)}`
        : `已删除 ${arg.id} 的链条 ${String(args.chainId)}`;
    }
    case "set_excerpt": {
      const ex = ws.excerpts.find((e) => e.id === str(args.excerptId));
      if (!ex) return `错误：找不到节选 ${String(args.excerptId)}`;
      if (str(args.title) !== undefined) ex.title = str(args.title)!;
      if (str(args.content) !== undefined) ex.content = str(args.content)!;
      return `已更新节选 ${ex.id}`;
    }
    case "add_excerpt": {
      const id = genId("excerpt");
      ws.excerpts.push({
        id,
        title: str(args.title) ?? "未命名节选",
        content: str(args.content) ?? "",
      });
      return `已新增节选 ${id}`;
    }
    case "remove_excerpt": {
      const before = ws.excerpts.length;
      ws.excerpts = ws.excerpts.filter((e) => e.id !== str(args.excerptId));
      return before === ws.excerpts.length
        ? `错误：找不到节选 ${String(args.excerptId)}`
        : `已删除节选 ${String(args.excerptId)}`;
    }
    default:
      return `错误：未知工具「${name}」`;
  }
}
