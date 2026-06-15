"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Workspace,
  Session,
  ChatMessage,
  ArgumentElement,
  Chain,
  FieldPath,
  Excerpt,
} from "./types";
import { createInitialWorkspace } from "./initialWorkspace";
import { NEW_SESSION_TITLE } from "./prompts";
import { applyToolCall } from "./agentTools";

export const CHAT_WIDTH_MIN = 300;
export const CHAT_WIDTH_MAX = 1080;
export const CHAT_WIDTH_DEFAULT = 380;

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

function makeSession(): Session {
  const now = Date.now();
  return {
    id: uid(),
    title: NEW_SESSION_TITLE,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

interface State {
  workspace: Workspace;
  sessions: Session[];
  activeSessionId: string;
  agentBusy: boolean;
  error: string | null;
  hasHydrated: boolean;
  chatWidth: number;
  setChatWidth: (w: number) => void;

  // --- manual (direct) workspace edits ---
  setTitle: (v: string) => void;
  setField: (path: FieldPath, v: string) => void;
  setArgument: (
    argId: string,
    patch: Partial<Pick<ArgumentElement, "mainStatement" | "primaryTechnique" | "primaryLandingPoint">>,
  ) => void;
  addChain: (argId: string) => void;
  updateChain: (argId: string, chainId: string, patch: Partial<Chain>) => void;
  removeChain: (argId: string, chainId: string) => void;
  setExcerpt: (id: string, patch: Partial<Excerpt>) => void;
  addExcerpt: () => void;
  removeExcerpt: (id: string) => void;

  // --- sessions / chat ---
  newSession: () => void;
  switchSession: (id: string) => void;
  deleteSession: (id: string) => void;
  renameSession: (id: string, title: string) => void;
  sendMessage: (text: string) => Promise<void>;
  rollbackTo: (messageId: string) => void;
  clearError: () => void;

  // --- import / export ---
  importState: (data: {
    workspace?: Workspace;
    sessions?: Session[];
    activeSessionId?: string;
  }) => void;
  resetWorkspace: () => void;
}

function findArg(ws: Workspace, argId: string): ArgumentElement | undefined {
  const pool = argId.startsWith("A")
    ? ws.literary.arguments
    : ws.nonLiterary.arguments;
  return pool.find((a) => a.id === argId);
}

export const useStore = create<State>()(
  persist(
    (set, get) => {
      // mutate the workspace immutably and persist
      const mutate = (fn: (ws: Workspace) => void) => {
        const ws = clone(get().workspace);
        fn(ws);
        set({ workspace: ws });
      };
      const activeSession = () =>
        get().sessions.find((s) => s.id === get().activeSessionId);

      return {
        workspace: createInitialWorkspace(),
        sessions: [makeSession()],
        activeSessionId: "", // fixed up on hydrate / below
        agentBusy: false,
        error: null,
        hasHydrated: false,
        chatWidth: CHAT_WIDTH_DEFAULT,
        setChatWidth: (w) =>
          set({
            chatWidth: Math.min(
              CHAT_WIDTH_MAX,
              Math.max(CHAT_WIDTH_MIN, Math.round(w)),
            ),
          }),

        setTitle: (v) => mutate((ws) => (ws.title = v)),
        setField: (path, v) =>
          mutate((ws) => {
            switch (path) {
              case "opening.greeting":
                ws.opening.greeting = v;
                break;
              case "opening.giDefinition":
                ws.opening.giDefinition = v;
                break;
              case "literary.intro":
                ws.literary.intro = v;
                break;
              case "transition":
                ws.transition = v;
                break;
              case "nonLiterary.intro":
                ws.nonLiterary.intro = v;
                break;
              case "conclusion":
                ws.conclusion = v;
                break;
            }
          }),
        setArgument: (argId, patch) =>
          mutate((ws) => {
            const a = findArg(ws, argId);
            if (a) Object.assign(a, patch);
          }),
        addChain: (argId) =>
          mutate((ws) => {
            const a = findArg(ws, argId);
            if (a)
              a.chains.push({
                id: uid(),
                technique: "",
                effect: "",
                landingPoint: "",
              });
          }),
        updateChain: (argId, chainId, patch) =>
          mutate((ws) => {
            const a = findArg(ws, argId);
            const c = a?.chains.find((x) => x.id === chainId);
            if (c) Object.assign(c, patch);
          }),
        removeChain: (argId, chainId) =>
          mutate((ws) => {
            const a = findArg(ws, argId);
            if (a) a.chains = a.chains.filter((c) => c.id !== chainId);
          }),
        setExcerpt: (id, patch) =>
          mutate((ws) => {
            const e = ws.excerpts.find((x) => x.id === id);
            if (e) Object.assign(e, patch);
          }),
        addExcerpt: () =>
          mutate((ws) =>
            ws.excerpts.push({ id: uid(), title: "新节选", content: "" }),
          ),
        removeExcerpt: (id) =>
          mutate((ws) => (ws.excerpts = ws.excerpts.filter((e) => e.id !== id))),

        newSession: () => {
          const s = makeSession();
          set({ sessions: [s, ...get().sessions], activeSessionId: s.id });
        },
        switchSession: (id) => set({ activeSessionId: id }),
        deleteSession: (id) => {
          const remaining = get().sessions.filter((s) => s.id !== id);
          const sessions = remaining.length ? remaining : [makeSession()];
          const activeSessionId =
            get().activeSessionId === id
              ? sessions[0].id
              : get().activeSessionId;
          set({ sessions, activeSessionId });
        },
        renameSession: (id, title) =>
          set({
            sessions: get().sessions.map((s) =>
              s.id === id ? { ...s, title } : s,
            ),
          }),

        sendMessage: async (text) => {
          const trimmed = text.trim();
          if (!trimmed || get().agentBusy) return;
          const session = activeSession();
          if (!session) return;
          const sessionId = session.id;

          const userMsg: ChatMessage = {
            id: uid(),
            role: "user",
            content: trimmed,
            snapshot: clone(get().workspace),
            createdAt: Date.now(),
          };
          const assistantId = uid();
          const assistantMsg: ChatMessage = {
            id: assistantId,
            role: "assistant",
            content: "",
            toolCalls: [],
            snapshot: clone(get().workspace),
            createdAt: Date.now(),
          };

          // optimistic: append user message + empty assistant placeholder
          const withBoth = get().sessions.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  messages: [...s.messages, userMsg, assistantMsg],
                  title:
                    s.messages.length === 0 ? trimmed.slice(0, 18) : s.title,
                  updatedAt: Date.now(),
                }
              : s,
          );
          set({ sessions: withBoth, agentBusy: true, error: null });

          // patch the live assistant message in place
          const patchAssistant = (patch: Partial<ChatMessage>) =>
            set({
              sessions: get().sessions.map((s) =>
                s.id === sessionId
                  ? {
                      ...s,
                      messages: s.messages.map((m) =>
                        m.id === assistantId ? { ...m, ...patch } : m,
                      ),
                    }
                  : s,
              ),
            });

          const payload = {
            messages: (
              withBoth.find((s) => s.id === sessionId)?.messages ?? []
            )
              // exclude the empty assistant placeholder from the prompt
              .filter((m) => m.id !== assistantId)
              .map((m) => ({ role: m.role, content: m.content })),
            workspace: get().workspace,
          };

          let acc = "";
          const toolCalls: ChatMessage["toolCalls"] = [];

          try {
            const res = await fetch("/api/agent", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            if (!res.ok || !res.body) {
              let msg = `HTTP ${res.status}`;
              try {
                const j = await res.json();
                msg = j?.error ?? msg;
              } catch {
                /* ignore */
              }
              throw new Error(msg);
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            const handleEvent = (evt: Record<string, unknown>) => {
              switch (evt.type) {
                case "text": {
                  acc += String(evt.delta ?? "");
                  patchAssistant({ content: acc });
                  break;
                }
                case "tool": {
                  const rec = {
                    name: String(evt.name),
                    args: (evt.args ?? {}) as Record<string, unknown>,
                    result: String(evt.result ?? ""),
                  };
                  toolCalls.push(rec);
                  // apply live to the outline for instant feedback
                  const ws = clone(get().workspace);
                  applyToolCall(ws, rec.name, rec.args);
                  set({ workspace: ws });
                  patchAssistant({ toolCalls: [...toolCalls] });
                  break;
                }
                case "done": {
                  const finalWs = (evt.workspace as Workspace) ?? get().workspace;
                  const finalText =
                    (evt.text as string | undefined) ??
                    acc ??
                    "";
                  set({ workspace: finalWs });
                  patchAssistant({
                    content: finalText || acc,
                    toolCalls: [...toolCalls],
                    snapshot: clone(finalWs),
                  });
                  break;
                }
                case "error": {
                  throw new Error(String(evt.error ?? "未知错误"));
                }
              }
            };

            // read NDJSON stream
            // eslint-disable-next-line no-constant-condition
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              let nl: number;
              while ((nl = buffer.indexOf("\n")) >= 0) {
                const line = buffer.slice(0, nl).trim();
                buffer = buffer.slice(nl + 1);
                if (line) handleEvent(JSON.parse(line));
              }
            }
            const tail = buffer.trim();
            if (tail) handleEvent(JSON.parse(tail));

            set({ agentBusy: false });
          } catch (e: unknown) {
            const message =
              e instanceof Error ? e.message : "请求失败（未知错误）";
            patchAssistant({
              content: acc || "（请求失败）",
              toolCalls: [...toolCalls],
            });
            set({ agentBusy: false, error: message });
          }
        },

        rollbackTo: (messageId) => {
          const session = activeSession();
          if (!session) return;
          const idx = session.messages.findIndex((m) => m.id === messageId);
          if (idx < 0) return;
          const target = session.messages[idx];
          set({
            workspace: clone(target.snapshot),
            sessions: get().sessions.map((s) =>
              s.id === session.id
                ? { ...s, messages: s.messages.slice(0, idx + 1) }
                : s,
            ),
          });
        },

        clearError: () => set({ error: null }),

        importState: (data) => {
          set({
            workspace: data.workspace
              ? clone(data.workspace)
              : get().workspace,
            sessions:
              data.sessions && data.sessions.length
                ? clone(data.sessions)
                : get().sessions,
            activeSessionId:
              data.activeSessionId ??
              (data.sessions && data.sessions[0]?.id) ??
              get().activeSessionId,
          });
        },
        resetWorkspace: () =>
          set({ workspace: createInitialWorkspace() }),
      };
    },
    {
      name: "chinese-io-gacha",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        workspace: s.workspace,
        sessions: s.sessions,
        activeSessionId: s.activeSessionId,
        chatWidth: s.chatWidth,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // ensure a valid active session always exists
        if (!state.sessions || state.sessions.length === 0) {
          state.sessions = [makeSession()];
        }
        if (
          !state.activeSessionId ||
          !state.sessions.find((s) => s.id === state.activeSessionId)
        ) {
          state.activeSessionId = state.sessions[0].id;
        }
        state.hasHydrated = true;
      },
    },
  ),
);

// On first client load (no persisted state yet) activeSessionId is "" — fix it.
if (typeof window !== "undefined") {
  const s = useStore.getState();
  if (!s.activeSessionId && s.sessions[0]) {
    useStore.setState({ activeSessionId: s.sessions[0].id });
  }
}
