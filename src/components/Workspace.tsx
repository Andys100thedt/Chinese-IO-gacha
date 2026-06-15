"use client";

import { useStore } from "@/lib/store";
import { TextBoxTA, TextBoxTB } from "./TextBoxes";
import { ArgumentCard } from "./ArgumentCard";

function SectionHeading({
  index,
  title,
  hint,
}: {
  index: number;
  title: string;
  hint?: string;
}) {
  return (
    <div className="sticky top-0 z-10 -mx-4 mb-3 border-b border-ink-border bg-ink-bg/95 px-4 py-2 backdrop-blur">
      <div className="flex items-baseline gap-2">
        <span className="text-[12px] font-bold text-ink-accent">
          {index}.
        </span>
        <h2 className="text-[15px] font-bold tracking-wide text-ink-text">
          {title}
        </h2>
        {hint && <span className="text-[11px] text-ink-dim">{hint}</span>}
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1.5 mt-1 text-[12px] font-medium text-ink-dim">
      {children}
    </div>
  );
}

export function Workspace() {
  const ws = useStore((s) => s.workspace);
  const setTitle = useStore((s) => s.setTitle);
  const setField = useStore((s) => s.setField);
  const setExcerpt = useStore((s) => s.setExcerpt);
  const addExcerpt = useStore((s) => s.addExcerpt);
  const removeExcerpt = useStore((s) => s.removeExcerpt);

  return (
    <div className="mx-auto max-w-3xl px-4 py-5">
      {/* Title */}
      <div className="mb-6">
        <FieldLabel>[标题] · 全球性话题 (GI)</FieldLabel>
        <input
          className="w-full rounded-md border border-ink-border bg-ink-panel px-3 py-2 text-[16px] font-bold text-ink-text outline-none focus:border-ink-accent"
          value={ws.title}
          placeholder="例如：固有社会期待对女性的束缚"
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      {/* 1. 开场 */}
      <section className="mb-8">
        <SectionHeading index={1} title="[开场]" />
        <FieldLabel>1. [开场白；GI+领域陈述] · 仅你输入 (TB)</FieldLabel>
        <TextBoxTB
          value={ws.opening.greeting}
          placeholder="老师好，我今天探讨的全球性话题是…，属于…领域。"
          onChange={(v) => setField("opening.greeting", v)}
        />
        <div className="h-3" />
        <FieldLabel>2. [解释&定义：GI] (TA)</FieldLabel>
        <TextBoxTA
          value={ws.opening.giDefinition}
          placeholder="对全球性话题进行解释与界定…"
          onChange={(v) => setField("opening.giDefinition", v)}
        />
      </section>

      {/* 2. 内容：文学文本 */}
      <section className="mb-8">
        <SectionHeading
          index={2}
          title="[内容：文学文本]"
          hint="A1 / A2 主选段 · A3 / A4 联系全文选段"
        />
        <FieldLabel>1. [介绍：文学文本] (TA)</FieldLabel>
        <TextBoxTA
          value={ws.literary.intro}
          placeholder="介绍文学文本、作者与其与 GI 的关联…"
          onChange={(v) => setField("literary.intro", v)}
        />
        <div className="mt-4 space-y-4">
          {ws.literary.arguments.map((a) => (
            <ArgumentCard key={a.id} arg={a} />
          ))}
        </div>
      </section>

      {/* 3. 过渡 */}
      <section className="mb-8">
        <SectionHeading index={3} title="[过渡]" />
        <FieldLabel>[过渡：文学文本 → 非文学文本] (TA)</FieldLabel>
        <TextBoxTA
          value={ws.transition}
          placeholder="承上启下，把两个文本/时代/文化连接起来…"
          onChange={(v) => setField("transition", v)}
        />
      </section>

      {/* 4. 内容：非文学文本 */}
      <section className="mb-8">
        <SectionHeading
          index={4}
          title="[内容：非文学文本]"
          hint="B1 / B2 主选段 · B3 / B4 联系全文选段"
        />
        <FieldLabel>1. [介绍：非文学文本] (TA)</FieldLabel>
        <TextBoxTA
          value={ws.nonLiterary.intro}
          placeholder="介绍非文学文本及其与 GI 的关联…"
          onChange={(v) => setField("nonLiterary.intro", v)}
        />
        <div className="mt-4 space-y-4">
          {ws.nonLiterary.arguments.map((a) => (
            <ArgumentCard key={a.id} arg={a} />
          ))}
        </div>
      </section>

      {/* 5. 结尾 */}
      <section className="mb-8">
        <SectionHeading index={5} title="[结尾]" />
        <FieldLabel>[结尾] (TA)</FieldLabel>
        <TextBoxTA
          value={ws.conclusion}
          placeholder="综上所述，…，呼应 GI，收束全文…"
          onChange={(v) => setField("conclusion", v)}
        />
      </section>

      {/* 节选资产 */}
      <section className="mb-12">
        <div className="mb-3 flex items-center justify-between border-t border-ink-border pt-4">
          <h2 className="text-[14px] font-bold text-ink-text">
            节选资产 · 原文节选库
          </h2>
          <button
            onClick={addExcerpt}
            className="rounded border border-ink-border px-2 py-1 text-[11px] text-ink-dim hover:border-ink-accent hover:text-ink-accent"
          >
            + 新增节选
          </button>
        </div>
        <p className="mb-3 text-[11px] text-ink-dim/70">
          存放被分析的原文/源文本片段，作为全局参考；Agent 也能读到它们。
        </p>
        <div className="space-y-4">
          {ws.excerpts.map((e) => (
            <div
              key={e.id}
              className="rounded-lg border border-ink-border bg-ink-panel2/40 p-3"
            >
              <div className="mb-2 flex items-center gap-2">
                <input
                  className="flex-1 rounded border border-ink-border bg-ink-tb px-2 py-1 text-[12px] text-ink-text outline-none focus:border-ink-accent"
                  value={e.title}
                  onChange={(ev) =>
                    setExcerpt(e.id, { title: ev.target.value })
                  }
                />
                <button
                  onClick={() => removeExcerpt(e.id)}
                  className="text-[11px] text-ink-dim hover:text-ink-danger"
                >
                  删除
                </button>
              </div>
              <TextBoxTA
                value={e.content}
                placeholder="粘贴原文节选 / 广告文案…"
                onChange={(v) => setExcerpt(e.id, { content: v })}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
