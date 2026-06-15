"use client";

import type { ArgumentElement } from "@/lib/types";
import { useStore } from "@/lib/store";
import { TextBoxTA, TextBoxTB } from "./TextBoxes";

export function ArgumentCard({ arg }: { arg: ArgumentElement }) {
  const setArgument = useStore((s) => s.setArgument);
  const addChain = useStore((s) => s.addChain);
  const updateChain = useStore((s) => s.updateChain);
  const removeChain = useStore((s) => s.removeChain);

  const kindLabel = arg.kind === "main" ? "主选段" : "联系全文选段";

  return (
    <div className="rounded-lg border border-ink-border bg-ink-panel2/60 p-3">
      <div className="mb-2.5 flex items-center gap-2">
        <span className="rounded bg-ink-accent/15 px-2 py-0.5 text-[12px] font-bold text-ink-accent">
          分论点 #{arg.id}
        </span>
        <span className="text-[11px] text-ink-dim">{kindLabel}</span>
      </div>

      {/* 头部三元组：主要陈述 = 一级手法 + 作用连接 + 一级落脚点 */}
      <div className="space-y-2 rounded-md border border-dashed border-ink-border/80 bg-ink-bg/40 p-2.5">
        <TextBoxTB
          label="主要陈述（头部 · 那一句话）"
          value={arg.mainStatement}
          placeholder="一句话：引入一级手法 → 简述其作用 → 点出一级落脚点(如何讨论 GI)"
          onChange={(v) => setArgument(arg.id, { mainStatement: v })}
        />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <TextBoxTB
            label="一级手法"
            value={arg.primaryTechnique}
            placeholder="较大的作用方向 / 手法类别集合"
            onChange={(v) => setArgument(arg.id, { primaryTechnique: v })}
          />
          <TextBoxTB
            label="一级落脚点"
            value={arg.primaryLandingPoint}
            placeholder="它如何贡献/参与文本对 GI 的讨论"
            onChange={(v) => setArgument(arg.id, { primaryLandingPoint: v })}
          />
        </div>
      </div>

      {/* 链条列表 */}
      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-ink-dim">
            链条 [二级手法 → 作用 → 二级落脚点]（一般 2–3 条）
          </span>
          <button
            onClick={() => addChain(arg.id)}
            className="rounded border border-ink-border px-2 py-0.5 text-[11px] text-ink-dim hover:border-ink-accent hover:text-ink-accent"
          >
            + 添加链条
          </button>
        </div>

        {arg.chains.length === 0 && (
          <p className="text-[11px] text-ink-dim/60">暂无链条。</p>
        )}

        {arg.chains.map((c, i) => (
          <div
            key={c.id}
            className="rounded-md border border-ink-border bg-ink-bg/40 p-2"
          >
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[11px] text-ink-dim">链条 {i + 1}</span>
              <button
                onClick={() => removeChain(arg.id, c.id)}
                className="text-[11px] text-ink-dim hover:text-ink-danger"
              >
                删除
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <TextBoxTB
                label="二级手法"
                value={c.technique}
                placeholder="具体技巧/文本要素"
                onChange={(v) => updateChain(arg.id, c.id, { technique: v })}
              />
              <TextBoxTB
                label="作用 / 效果"
                value={c.effect}
                placeholder="产生了什么效果"
                onChange={(v) => updateChain(arg.id, c.id, { effect: v })}
              />
              <TextBoxTB
                label="二级落脚点"
                value={c.landingPoint}
                placeholder="接回一级落脚点 / 直接接 GI"
                onChange={(v) => updateChain(arg.id, c.id, { landingPoint: v })}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** A larger TA used for argument bodies if ever needed (kept for parity). */
export function ArgumentNotes({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return <TextBoxTA value={value} onChange={onChange} />;
}
