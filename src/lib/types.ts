// ============================================================================
// Core data model for the Chinese IO outline workspace.
//
// Mirrors IO-structure.md exactly:
//   1. [开场]            -> opening { greeting(TB), giDefinition(TA) }
//   2. [内容：文学文本]   -> literary  (ContentSection, arguments A1..A4)
//   3. [过渡]            -> transition (TA)
//   4. [内容：非文学文本] -> nonLiterary (ContentSection, arguments B1..B4)
//   5. [结尾]            -> conclusion (TA)
//   + 节选资产           -> excerpts (原文节选库)
//
// Labelling convention: A = 文学(literary), B = 非文学(non-literary).
// Per spec, 联系全文选段×2 — 分论点#3,4 is stored as TWO separate arguments
// (#3 and #4) rather than one combined unit.
// ============================================================================

/** A single [二级手法 -> 作用 -> 二级落脚点] reasoning chain inside an argument. */
export interface Chain {
  id: string;
  technique: string; // 二级手法 (a concrete technique / textual element)
  effect: string; // 作用/效果 (what effect it produces)
  landingPoint: string; // 二级落脚点 (connects local point up to 一级落脚点 / GI)
}

/** Two kinds of 论点元素 in a content section. */
export type ArgumentKind = "main" | "link";
// main = 主选段 (分论点#1, #2)
// link = 联系全文选段 (分论点#3, #4)

/**
 * 论点元素 (Argument element).
 * Header trio encodes the intuition: 主要陈述 = 一级手法 + 作用连接 + 一级落脚点.
 */
export interface ArgumentElement {
  id: string; // "A1".."A4" | "B1".."B4"
  index: number; // 1..4 — the 分论点 number within its content section
  kind: ArgumentKind;
  mainStatement: string; // 头部TB：主要陈述（那一句话）
  primaryTechnique: string; // TB：一级手法
  primaryLandingPoint: string; // TB：一级落脚点
  chains: Chain[]; // 内容列表：[二级手法->作用->二级落脚点] 链条
}

/** [内容：文本] — applies to both 文学 and 非文学. */
export interface ContentSection {
  intro: string; // TA：[介绍：文本]
  arguments: ArgumentElement[]; // length 4 (index 1..4)
}

/** 节选资产：被分析的原文/源文本片段，作为全局参考（Agent 也能读到）。 */
export interface Excerpt {
  id: string;
  title: string;
  content: string;
}

/** The entire serializable outline artifact. */
export interface Workspace {
  title: string; // [标题] — 全球性话题/GI
  opening: {
    greeting: string; // TB：[开场白；GI+领域陈述]（仅用户可输入）
    giDefinition: string; // TA：[解释&定义：GI]
  };
  literary: ContentSection; // [内容：文学文本]
  transition: string; // TA：[过渡]
  nonLiterary: ContentSection; // [内容：非文学文本]
  conclusion: string; // TA：[结尾]
  excerpts: Excerpt[]; // 节选资产元素
}

// ----------------------------------------------------------------------------
// Chat / session model (powers rollback of both context AND workspace state)
// ----------------------------------------------------------------------------

export type ChatRole = "user" | "assistant";

export interface ToolCallRecord {
  name: string;
  args: Record<string, unknown>;
  result: string;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  toolCalls?: ToolCallRecord[];
  /**
   * Snapshot of the workspace AFTER this message was processed.
   * Enables "回滚上下文和对应的 workspace 状态" to any point in the thread.
   */
  snapshot: Workspace;
  createdAt: number;
}

export interface Session {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

/** Standalone field paths addressable by the agent's `set_field` tool. */
export type FieldPath =
  | "opening.greeting"
  | "opening.giDefinition"
  | "literary.intro"
  | "transition"
  | "nonLiterary.intro"
  | "conclusion";
