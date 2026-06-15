"use client";

import { useEffect, useRef } from "react";

/** TA文本框 (Type-A) — long paragraph, styled like a markdown code block. */
export function TextBoxTA({
  value,
  onChange,
  placeholder,
  minRows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minRows?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // auto-grow fallback for browsers without field-sizing
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <div className="rounded-md border border-ink-border bg-ink-ta">
      <div className="flex items-center gap-2 border-b border-ink-border px-3 py-1.5 text-[11px] text-ink-dim">
        <span className="inline-block h-2 w-2 rounded-full bg-ink-accent/70" />
        TA · 长段落
      </div>
      <textarea
        ref={ref}
        className="autogrow block w-full resize-none bg-transparent px-3 py-2.5 text-[13px] leading-relaxed text-ink-text outline-none placeholder:text-ink-dim/50"
        rows={minRows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/** TB文本框 (Type-B) — brief point, styled like inline code. */
export function TextBoxTB({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      {label && (
        <span className="text-[11px] text-ink-dim">{label}</span>
      )}
      <input
        className="rounded border border-ink-border bg-ink-tb px-2.5 py-1.5 text-[13px] text-ink-accent2 outline-none transition-colors placeholder:text-ink-dim/50 focus:border-ink-accent"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
