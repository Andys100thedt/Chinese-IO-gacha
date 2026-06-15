"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { compileToMarkdown } from "@/lib/compile";
import { downloadText } from "@/lib/download";

export function PreviewPanel({ onClose }: { onClose: () => void }) {
  const ws = useStore((s) => s.workspace);
  const md = useMemo(() => compileToMarkdown(ws), [ws]);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const fileName = `${(ws.title || "IO提纲").replace(/\s+/g, "_")}.md`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex h-[88vh] w-full max-w-3xl flex-col rounded-lg border border-ink-border bg-ink-panel shadow-2xl">
        <div className="flex items-center justify-between border-b border-ink-border px-4 py-2.5">
          <h2 className="text-[14px] font-bold text-ink-text">
            编译预览 · Markdown
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={copy}
              className="rounded border border-ink-border px-2.5 py-1 text-[12px] text-ink-dim hover:border-ink-accent hover:text-ink-accent"
            >
              {copied ? "已复制 ✓" : "复制"}
            </button>
            <button
              onClick={() => downloadText(fileName, md, "text/markdown")}
              className="rounded border border-ink-border px-2.5 py-1 text-[12px] text-ink-dim hover:border-ink-accent hover:text-ink-accent"
            >
              导出 .md
            </button>
            <button
              onClick={onClose}
              className="rounded bg-ink-panel2 px-2.5 py-1 text-[12px] text-ink-text hover:bg-ink-border"
            >
              关闭
            </button>
          </div>
        </div>
        <pre className="flex-1 overflow-auto whitespace-pre-wrap break-words px-4 py-3 text-[12.5px] leading-relaxed text-ink-text">
          {md}
        </pre>
      </div>
    </div>
  );
}
