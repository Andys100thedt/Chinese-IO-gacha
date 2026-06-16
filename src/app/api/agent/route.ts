import { NextRequest } from "next/server";
import OpenAI from "openai";
import { HttpsProxyAgent } from "https-proxy-agent";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildSystemPrompt } from "@/lib/prompts";
import { TOOL_DEFINITIONS, applyToolCall } from "@/lib/agentTools";
import type { Workspace, ToolCallRecord } from "@/lib/types";

export const runtime = "nodejs";

// --- env (from .env: OpenRouter / Qwen, OpenAI-compatible) -------------------
const API_KEY = process.env.LLM_API_KEY ?? "";
const MODEL = process.env.LLM_MODEL ?? "qwen/qwen3.7-max";
const RAW_BASE = process.env.LLM_BASE_URL ?? "https://openrouter.ai/api";
const BASE_URL = RAW_BASE.replace(/\/+$/, "").endsWith("/v1")
  ? RAW_BASE.replace(/\/+$/, "")
  : `${RAW_BASE.replace(/\/+$/, "")}/v1`;
const MAX_TOKENS = Number(process.env.MAX_TOKENS ?? 4096);
const TEMPERATURE = Number(process.env.T ?? 0.7);
const TOP_P = Number(process.env.TOP_P ?? 0.95);

// --- proxy ----------------------------------------------------------------
// Route ALL LLM (HTTPS/HTTP) calls through a configurable HTTP proxy.
// Default points at the local dev proxy (e.g. Clash / v2rayN) on :10808.
// To disable, set LLM_PROXY="" (empty string) in .env.
const PROXY_URL = (process.env.LLM_PROXY ?? "http://localhost:10808").trim();
const httpAgent = PROXY_URL ? new HttpsProxyAgent(PROXY_URL) : undefined;

const MAX_TOOL_STEPS = 8;

// --- context files (read once, cached) --------------------------------------
let contextCache: {
  ioStructure: string;
  ioSamplePlain: string;
  ioSampleLabeled: string;
} | null = null;

function loadContext() {
  if (contextCache) return contextCache;
  const root = process.cwd();
  const read = (f: string) => {
    try {
      return readFileSync(join(root, f), "utf8");
    } catch {
      return `（未找到 ${f}）`;
    }
  };
  contextCache = {
    ioStructure: read("IO-structure.md"),
    ioSamplePlain: read("IO-sample-plain.md"),
    ioSampleLabeled: read("IO-sample-labeled.md"),
  };
  return contextCache;
}

interface ClientMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();

  // Small helper to wrap a single event as one NDJSON line.
  const line = (obj: unknown) => encoder.encode(JSON.stringify(obj) + "\n");

  if (!API_KEY) {
    return new Response(
      line({ type: "error", error: "缺少 LLM_API_KEY，请在 .env 中配置。" }),
      { status: 200, headers: { "Content-Type": "application/x-ndjson" } },
    );
  }

  let body: { messages?: ClientMessage[]; workspace?: Workspace };
  try {
    body = await req.json();
  } catch {
    return new Response(line({ type: "error", error: "请求体不是合法 JSON。" }), {
      status: 200,
      headers: { "Content-Type": "application/x-ndjson" },
    });
  }

  const incoming = body.messages ?? [];
  if (!body.workspace) {
    return new Response(line({ type: "error", error: "缺少 workspace。" }), {
      status: 200,
      headers: { "Content-Type": "application/x-ndjson" },
    });
  }

  const ws: Workspace = JSON.parse(JSON.stringify(body.workspace));
  const ctx = loadContext();

  const client = new OpenAI({
    apiKey: API_KEY,
    baseURL: BASE_URL,
    httpAgent,
    defaultHeaders: {
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "Chinese IO Gacha",
    },
  });

  const systemMsg = () => ({
    role: "system" as const,
    content: buildSystemPrompt({
      ...ctx,
      workspaceJson: JSON.stringify(ws, null, 2),
    }),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const convo: any[] = [
    systemMsg(),
    ...incoming.map((m) => ({ role: m.role, content: m.content })),
  ];

  const toolLog: ToolCallRecord[] = [];
  let fullText = "";

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (obj: unknown) => controller.enqueue(line(obj));
      try {
        for (let step = 0; step < MAX_TOOL_STEPS; step++) {
          const completion = await client.chat.completions.create({
            model: MODEL,
            messages: convo,
            tools: TOOL_DEFINITIONS,
            tool_choice: "auto",
            temperature: TEMPERATURE,
            top_p: TOP_P,
            max_tokens: MAX_TOKENS,
            stream: true,
          });

          let stepContent = "";
          // accumulate streamed tool-call deltas by index
          const toolAcc: Record<
            number,
            { id: string; name: string; args: string }
          > = {};

          for await (const chunk of completion) {
            const choice = chunk.choices?.[0];
            if (!choice) continue;
            const delta = choice.delta;

            if (delta?.content) {
              stepContent += delta.content;
              fullText += delta.content;
              emit({ type: "text", delta: delta.content });
            }

            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                const i = tc.index ?? 0;
                toolAcc[i] ??= { id: "", name: "", args: "" };
                if (tc.id) toolAcc[i].id = tc.id;
                if (tc.function?.name) toolAcc[i].name += tc.function.name;
                if (tc.function?.arguments)
                  toolAcc[i].args += tc.function.arguments;
              }
            }
          }

          const calls = Object.keys(toolAcc)
            .map(Number)
            .sort((a, b) => a - b)
            .map((i) => toolAcc[i])
            .filter((c) => c.name);

          if (calls.length === 0) {
            // no tools -> this was the final assistant turn
            break;
          }

          // record assistant turn (with tool calls) into the conversation
          convo.push({
            role: "assistant",
            content: stepContent || null,
            tool_calls: calls.map((c) => ({
              id: c.id || `call_${step}_${c.name}`,
              type: "function",
              function: { name: c.name, arguments: c.args || "{}" },
            })),
          });

          // execute each tool call against the workspace clone
          for (const c of calls) {
            let args: Record<string, unknown> = {};
            try {
              args = c.args ? JSON.parse(c.args) : {};
            } catch {
              args = {};
            }
            const result = applyToolCall(ws, c.name, args);
            toolLog.push({ name: c.name, args, result });
            emit({ type: "tool", name: c.name, args, result });
            convo.push({
              role: "tool",
              tool_call_id: c.id || `call_${step}_${c.name}`,
              content: result,
            });
          }

          // refresh the system snapshot so the next step sees fresh state
          convo[0] = systemMsg();
        }

        if (!fullText && toolLog.length > 0) {
          fullText = "（已按你的要求更新提纲。）";
        }

        emit({
          type: "done",
          text: fullText || "（没有产生回复。）",
          workspace: ws,
          toolCalls: toolLog,
        });
        controller.close();
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "调用 LLM 失败（未知错误）";
        emit({ type: "error", error: `LLM 调用失败：${message}` });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
