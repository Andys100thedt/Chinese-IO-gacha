"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Tailored component map for the dark theme. */
const components = {
  // paragraphs: tighter spacing inside chat bubbles
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="my-1.5 leading-relaxed first:mt-0 last:mb-0">{children}</p>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="mb-1.5 mt-2 text-[15px] font-bold text-ink-text">
      {children}
    </h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="mb-1.5 mt-2 text-[14px] font-bold text-ink-text">
      {children}
    </h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="mb-1 mt-2 text-[13.5px] font-bold text-ink-text">
      {children}
    </h3>
  ),
  h4: ({ children }: { children?: React.ReactNode }) => (
    <h4 className="mb-1 mt-1.5 text-[13px] font-bold text-ink-text">
      {children}
    </h4>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="my-1.5 list-disc space-y-0.5 pl-5 marker:text-ink-dim">
      {children}
    </ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="my-1.5 list-decimal space-y-0.5 pl-5 marker:text-ink-dim">
      {children}
    </ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="leading-relaxed">{children}</li>
  ),
  // inline code
  code: ({
    children,
    className,
  }: {
    children?: React.ReactNode;
    className?: string;
  }) => {
    const isBlock = /language-/.test(className ?? "");
    if (isBlock) {
      return (
        <code
          className={`${className ?? ""} block overflow-x-auto rounded-md border border-ink-border bg-ink-bg/60 px-2.5 py-2 font-mono text-[12px] text-ink-accent2`}
        >
          {children}
        </code>
      );
    }
    return (
      <code className="rounded bg-ink-tb px-1.5 py-0.5 font-mono text-[12px] text-ink-accent2">
        {children}
      </code>
    );
  },
  pre: ({ children }: { children?: React.ReactNode }) => (
    <pre className="my-2 overflow-x-auto rounded-md border border-ink-border bg-ink-bg/60 p-2.5 text-[12px] leading-relaxed">
      {children}
    </pre>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="my-1.5 border-l-2 border-ink-accent/50 bg-ink-accent/5 px-3 py-1 italic text-ink-dim">
      {children}
    </blockquote>
  ),
  a: ({ children, href }: { children?: React.ReactNode; href?: string }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="text-ink-accent underline decoration-ink-accent/40 underline-offset-2 hover:decoration-ink-accent"
    >
      {children}
    </a>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-bold text-ink-text">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em className="italic text-ink-text">{children}</em>
  ),
  hr: () => <hr className="my-2 border-ink-border" />,
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="my-2 overflow-x-auto">
      <table className="w-full border-collapse text-[12px]">{children}</table>
    </div>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="border border-ink-border bg-ink-panel2 px-2 py-1 text-left font-bold text-ink-text">
      {children}
    </th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="border border-ink-border px-2 py-1 text-ink-text">
      {children}
    </td>
  ),
};

export function Markdown({ source }: { source: string }) {
  if (!source) return null;
  return (
    <div className="text-[13px] text-ink-text">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {source}
      </ReactMarkdown>
    </div>
  );
}
