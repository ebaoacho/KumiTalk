
// components/markdown-renderer.tsx
"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeHighlight from "rehype-highlight";

type Props = {
  content: string;
  className?: string;
};

// Sanitize設定：className属性を許可
const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [
      ...(defaultSchema.attributes?.code || []),
      ["className"], // 言語指定 (language-ts など)
    ],
    span: [["className"]],
    pre: [["className"]],
  },
};

export default function MarkdownRenderer({ content, className }: Props) {
  return (
    <div className={className}>
      <ReactMarkdown
        // GFM: 表、チェックボックス、取り消し線などを有効化
        remarkPlugins={[remarkGfm, remarkBreaks]} // 👈 改行対応プラグイン追加
        // HTML埋め込みを安全に処理しつつハイライト
        rehypePlugins={[
          rehypeRaw,
          [rehypeSanitize, schema],
          [rehypeHighlight, { ignoreMissing: true }],
        ]}
        // 各HTML要素の見た目を少し整える（任意）
        components={{
          p: (props) => (
            <p {...props} className="mb-3 leading-relaxed text-white/90" />
          ),
          li: (props) => <li {...props} className="ml-5 list-disc" />,
          ul: (props) => <ul {...props} className="mb-3" />,
          ol: (props) => <ol {...props} className="mb-3 list-decimal ml-5" />,
          h3: (props) => (
            <h3 {...props} className="mt-4 mb-2 text-lg font-semibold text-white" />
          ),
          h4: (props) => (
            <h4 {...props} className="mt-3 mb-1 font-semibold text-white/90" />
          ),
          code: (props) => (
            <code
              {...props}
              className="rounded bg-slate-800/70 px-1.5 py-0.5 text-sm text-cyan-300"
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
