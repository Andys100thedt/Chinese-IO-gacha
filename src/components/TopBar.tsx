"use client";

import { useRef } from "react";
import { useStore } from "@/lib/store";
import { downloadText } from "@/lib/download";

export function TopBar({
  onPreview,
  chatOpen,
  onToggleChat,
}: {
  onPreview: () => void;
  chatOpen: boolean;
  onToggleChat: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const workspace = useStore((s) => s.workspace);
  const sessions = useStore((s) => s.sessions);
  const activeSessionId = useStore((s) => s.activeSessionId);
  const importState = useStore((s) => s.importState);
  const resetWorkspace = useStore((s) => s.resetWorkspace);

  const exportWorkspace = () => {
    const payload = {
      kind: "chinese-io-gacha/workspace",
      version: 1,
      exportedAt: new Date().toISOString(),
      workspace,
      sessions,
      activeSessionId,
    };
    const name = `${(workspace.title || "IO提纲").replace(/\s+/g, "_")}.iogacha.json`;
    downloadText(name, JSON.stringify(payload, null, 2), "application/json");
  };

  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      importState({
        workspace: data.workspace,
        sessions: data.sessions,
        activeSessionId: data.activeSessionId,
      });
    } catch {
      alert("导入失败：文件不是合法的 workspace JSON。");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const btn =
    "rounded border border-ink-border px-2.5 py-1 text-[12px] text-ink-dim hover:border-ink-accent hover:text-ink-accent transition-colors";

  return (
    <header className="flex items-center justify-between border-b border-ink-border bg-ink-panel px-4 py-2">
      <div className="flex items-center gap-2">
        <span className="text-[14px] font-bold text-ink-text">
          中文 IO · Gacha
        </span>
        <span className="hidden text-[11px] text-ink-dim sm:inline">
          提纲完形填空工作台
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button className={btn} onClick={onPreview}>
          预览/导出 MD
        </button>
        <button className={btn} onClick={exportWorkspace}>
          导出 workspace
        </button>
        <button className={btn} onClick={() => fileRef.current?.click()}>
          导入
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={onImportFile}
        />
        <button
          className={btn}
          onClick={() => {
            if (confirm("确定要把提纲重置为空白吗？（会话历史保留）")) {
              resetWorkspace();
            }
          }}
        >
          重置提纲
        </button>
        <button
          className={`${btn} ${chatOpen ? "border-ink-accent text-ink-accent" : ""}`}
          onClick={onToggleChat}
        >
          {chatOpen ? "隐藏 Agent" : "显示 Agent"}
        </button>
      </div>
    </header>
  );
}
