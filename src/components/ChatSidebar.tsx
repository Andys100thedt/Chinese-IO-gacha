"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { CHAT_PLACEHOLDER } from "@/lib/prompts";
import type { ChatMessage } from "@/lib/types";
import { Markdown } from "./Markdown";

/** Switch from raw text → rendered markdown once the stream has paused,
 *  so we never render half-finished tables or unclosed code fences. */
function useDebouncedRender(rawText: string, streaming: boolean) {
  const [rendered, setRendered] = useState(rawText);
  useEffect(() => {
    if (!streaming) {
      setRendered(rawText);
      return;
    }
    const t = setTimeout(() => setRendered(rawText), 220);
    return () => clearTimeout(t);
  }, [rawText, streaming]);
  return rendered;
}

function ToolCallList({ msg }: { msg: ChatMessage }) {
  if (!msg.toolCalls || msg.toolCalls.length === 0) return null;
  return (
    <div className="mt-2 space-y-1 border-l-2 border-ink-accent/40 pl-2">
      {msg.toolCalls.map((t, i) => (
        <div key={i} className="text-[11px] text-ink-dim">
          <span className="text-ink-ok">⚙ {t.name}</span> — {t.result}
        </div>
      ))}
    </div>
  );
}

function MessageBubble({
  msg,
  streaming,
}: {
  msg: ChatMessage;
  streaming?: boolean;
}) {
  const rollbackTo = useStore((s) => s.rollbackTo);
  const isUser = msg.role === "user";
  const empty = !msg.content && (!msg.toolCalls || msg.toolCalls.length === 0);
  const debounced = useDebouncedRender(msg.content, !!streaming);
  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
      <div
        className={`max-w-[92%] rounded-lg px-3 py-2 text-[13px] leading-relaxed ${
          isUser
            ? "bg-ink-accent/15 text-ink-text"
            : "bg-ink-panel2 text-ink-text"
        }`}
      >
        {streaming && empty ? (
          <span className="flex items-center gap-2 text-ink-dim">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-ink-accent" />
            Agent 思考中…
          </span>
        ) : (
          <>
            <Markdown source={debounced} />
            {streaming && debounced === msg.content && (
              <span className="ml-0.5 inline-block h-3.5 w-[7px] translate-y-0.5 animate-pulse bg-ink-accent" />
            )}
          </>
        )}
        {!isUser && <ToolCallList msg={msg} />}
      </div>
      {!streaming && (
        <button
          onClick={() => rollbackTo(msg.id)}
          title="把提纲和会话都回滚到此刻"
          className="mt-0.5 text-[10px] text-ink-dim/60 hover:text-ink-warn"
        >
          ↺ 回滚到此处
        </button>
      )}
    </div>
  );
}

function SessionBar() {
  const sessions = useStore((s) => s.sessions);
  const activeSessionId = useStore((s) => s.activeSessionId);
  const switchSession = useStore((s) => s.switchSession);
  const newSession = useStore((s) => s.newSession);
  const deleteSession = useStore((s) => s.deleteSession);
  const [open, setOpen] = useState(false);

  const active = sessions.find((s) => s.id === activeSessionId);

  return (
    <div className="relative border-b border-ink-border px-3 py-2">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex-1 truncate rounded border border-ink-border bg-ink-panel2 px-2 py-1 text-left text-[12px] text-ink-text hover:border-ink-accent"
        >
          ▾ {active?.title ?? "会话"}{" "}
          <span className="text-ink-dim">({sessions.length})</span>
        </button>
        <button
          onClick={() => {
            newSession();
            setOpen(false);
          }}
          title="新建会话"
          className="rounded border border-ink-border px-2 py-1 text-[12px] text-ink-dim hover:border-ink-accent hover:text-ink-accent"
        >
          + 新会话
        </button>
      </div>

      {open && (
        <div className="absolute left-3 right-3 top-[42px] z-20 max-h-72 overflow-y-auto rounded-md border border-ink-border bg-ink-panel shadow-xl">
          {sessions.map((s) => (
            <div
              key={s.id}
              className={`flex items-center gap-2 px-2 py-1.5 text-[12px] hover:bg-ink-panel2 ${
                s.id === activeSessionId ? "bg-ink-panel2" : ""
              }`}
            >
              <button
                className="flex-1 truncate text-left text-ink-text"
                onClick={() => {
                  switchSession(s.id);
                  setOpen(false);
                }}
              >
                {s.title}
                <span className="ml-1 text-ink-dim">
                  · {s.messages.length} 条
                </span>
              </button>
              <button
                onClick={() => deleteSession(s.id)}
                className="text-ink-dim hover:text-ink-danger"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ChatSidebar() {
  const sessions = useStore((s) => s.sessions);
  const activeSessionId = useStore((s) => s.activeSessionId);
  const agentBusy = useStore((s) => s.agentBusy);
  const error = useStore((s) => s.error);
  const clearError = useStore((s) => s.clearError);
  const sendMessage = useStore((s) => s.sendMessage);

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const active = sessions.find((s) => s.id === activeSessionId);
  const messages = active?.messages ?? [];

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length, agentBusy]);

  const submit = () => {
    if (!input.trim() || agentBusy) return;
    sendMessage(input);
    setInput("");
  };

  return (
    <div className="flex h-full flex-col bg-ink-panel">
      <div className="border-b border-ink-border px-3 py-2.5">
        <div className="flex items-center gap-2 text-[13px] font-bold text-ink-text">
          <span className="inline-block h-2 w-2 rounded-full bg-ink-accent2" />
          Agent · 完形填空助手
        </div>
      </div>

      <SessionBar />

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {messages.length === 0 && (
          <div className="mt-6 text-center text-[12px] leading-relaxed text-ink-dim/70">
            把想法/素材丢进来，Agent 会用工具把它们填进右侧提纲。
            <br />
            <br />
            它能看到：IO 结构、范文、标注范文、以及你当前提纲的全部内容。
          </div>
        )}
        {messages.map((m, i) => (
          <MessageBubble
            key={m.id}
            msg={m}
            streaming={
              agentBusy &&
              m.role === "assistant" &&
              i === messages.length - 1
            }
          />
        ))}
      </div>

      {error && (
        <div className="mx-3 mb-2 rounded border border-ink-danger/50 bg-ink-danger/10 px-2 py-1.5 text-[11px] text-ink-danger">
          {error}
          <button onClick={clearError} className="ml-2 underline">
            关闭
          </button>
        </div>
      )}

      <div className="border-t border-ink-border p-2.5">
        <textarea
          className="block w-full resize-none rounded-md border border-ink-border bg-ink-bg px-2.5 py-2 text-[13px] text-ink-text outline-none focus:border-ink-accent placeholder:text-ink-dim/50"
          rows={3}
          value={input}
          placeholder={CHAT_PLACEHOLDER}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-[10px] text-ink-dim/60">⌘/Ctrl + Enter 发送</span>
          <button
            onClick={submit}
            disabled={agentBusy || !input.trim()}
            className="rounded-md bg-ink-accent px-3 py-1 text-[12px] font-bold text-ink-bg disabled:opacity-40"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
}
