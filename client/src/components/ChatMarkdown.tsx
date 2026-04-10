"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

const markdownComponents: Components = {
  p: ({ children }) => (
    <p className="mb-2 last:mb-0 leading-relaxed text-slate-800 dark:text-slate-200">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-slate-900 dark:text-slate-50">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-slate-700 dark:text-slate-300">{children}</em>
  ),
  ul: ({ children }) => (
    <ul className="my-2 ml-4 list-disc space-y-1 marker:text-primary">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-2 ml-4 list-decimal space-y-1 marker:text-slate-500 dark:marker:text-slate-400">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-relaxed pl-0.5">{children}</li>,
  h1: ({ children }) => (
    <h3 className="text-base font-semibold mt-3 mb-1.5 text-slate-900 dark:text-slate-100 first:mt-0">
      {children}
    </h3>
  ),
  h2: ({ children }) => (
    <h3 className="text-base font-semibold mt-3 mb-1.5 text-slate-900 dark:text-slate-100 first:mt-0">
      {children}
    </h3>
  ),
  h3: ({ children }) => (
    <h4 className="text-sm font-semibold mt-2 mb-1 text-slate-900 dark:text-slate-100 first:mt-0">
      {children}
    </h4>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-primary/40 pl-3 my-2 text-slate-600 dark:text-slate-400">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-primary font-medium underline underline-offset-2 hover:opacity-90 wrap-break-word"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  hr: () => <hr className="my-3 border-slate-200 dark:border-slate-600" />,
  code: ({ className, children, ...props }) => {
    const isBlock = Boolean(className?.startsWith("language-"));
    if (!isBlock) {
      return (
        <code
          className="rounded-md bg-slate-200/90 dark:bg-slate-700/90 px-1.5 py-0.5 text-[0.875em] font-mono text-slate-800 dark:text-slate-100"
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <pre className="my-2 overflow-x-auto rounded-lg bg-slate-900 dark:bg-slate-950 p-3 text-sm text-slate-100">
        <code className={className} {...props}>
          {children}
        </code>
      </pre>
    );
  },
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-slate-100 dark:bg-slate-800/80">{children}</thead>,
  th: ({ children }) => (
    <th className="border border-slate-200 dark:border-slate-700 px-3 py-2 text-left font-semibold text-slate-900 dark:text-slate-100">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-slate-200 dark:border-slate-700 px-3 py-2 text-slate-800 dark:text-slate-200">
      {children}
    </td>
  ),
};

export type ChatMarkdownProps = {
  content: string;
};

export function ChatMarkdown({ content }: ChatMarkdownProps) {
  if (!content.trim()) {
    return null;
  }

  return (
    <div className="chat-md [&_p:first-child]:mt-0 [&_ul:first-child]:mt-0 [&_ol:first-child]:mt-0">
      <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </Markdown>
    </div>
  );
}
