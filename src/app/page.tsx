"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useStore, CHAT_WIDTH_MIN, CHAT_WIDTH_MAX } from "@/lib/store";
import { TopBar } from "@/components/TopBar";
import { Workspace } from "@/components/Workspace";
import { ChatSidebar } from "@/components/ChatSidebar";
import { PreviewPanel } from "@/components/PreviewPanel";

export default function Page() {
  const hasHydrated = useStore((s) => s.hasHydrated);
  const chatWidth = useStore((s) => s.chatWidth);
  const setChatWidth = useStore((s) => s.setChatWidth);
  const [mounted, setMounted] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [preview, setPreview] = useState(false);
  const [dragging, setDragging] = useState(false);
  const draggingRef = useRef(false);

  useEffect(() => setMounted(true), []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    setDragging(true);
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      // sidebar is docked on the right edge
      setChatWidth(window.innerWidth - e.clientX);
    };
    const onUp = () => {
      draggingRef.current = false;
      setDragging(false);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [setChatWidth]);

  if (!mounted || !hasHydrated) {
    return (
      <div className="flex h-screen items-center justify-center text-[13px] text-ink-dim">
        正在载入工作台…
      </div>
    );
  }

  const width = Math.min(CHAT_WIDTH_MAX, Math.max(CHAT_WIDTH_MIN, chatWidth));

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TopBar
        onPreview={() => setPreview(true)}
        chatOpen={chatOpen}
        onToggleChat={() => setChatOpen((o) => !o)}
      />
      <div className="flex min-h-0 flex-1">
        <main className="min-w-0 flex-1 overflow-y-auto">
          <Workspace />
        </main>
        {chatOpen && (
          <>
            {/* drag handle */}
            <div
              onMouseDown={onMouseDown}
              className={`group relative w-1 shrink-0 cursor-col-resize bg-ink-border transition-colors hover:bg-ink-accent ${
                dragging ? "bg-ink-accent" : ""
              }`}
              title="拖动调整侧边栏宽度"
            >
              <div className="absolute inset-y-0 -left-1 -right-1" />
            </div>
            <aside
              className="shrink-0 overflow-hidden"
              style={{ width }}
            >
              <ChatSidebar />
            </aside>
          </>
        )}
      </div>
      {dragging && <div className="fixed inset-0 z-40 cursor-col-resize" />}
      {preview && <PreviewPanel onClose={() => setPreview(false)} />}
    </div>
  );
}
