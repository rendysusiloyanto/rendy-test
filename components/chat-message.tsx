"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Bot, User } from "lucide-react"

interface ChatMessageProps {
  role: "user" | "assistant"
  content: string
  timestamp?: string
  /** When true, show blinking cursor after content (streaming) */
  isStreaming?: boolean
}

const markdownComponents = {
  code: ({ className, children, ...props }: React.HTMLAttributes<HTMLElement> & { node?: unknown }) => {
    const isBlock = Boolean(className?.includes?.("language-"))
    if (isBlock) {
      return (
        <code
          className="block rounded-lg bg-zinc-900 text-zinc-100 p-4 text-[13px] leading-relaxed overflow-x-auto border border-zinc-800 break-words font-mono"
          {...props}
        >
          {children}
        </code>
      )
    }
    return (
      <code
        className="rounded bg-zinc-800/90 text-zinc-200 px-1.5 py-0.5 text-[13px] font-mono border border-zinc-700/50 break-all"
        {...props}
      >
        {children}
      </code>
    )
  },
  pre: ({ children, ...props }: React.HTMLAttributes<HTMLPreElement>) => (
    <pre className="my-3 rounded-lg overflow-hidden" {...props}>
      {children}
    </pre>
  ),
  p: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="my-2.5 leading-relaxed break-words" {...props}>
      {children}
    </p>
  ),
  ul: ({ children, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="my-2.5 pl-5 list-disc space-y-1 leading-relaxed" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className="my-2.5 pl-6 list-decimal space-y-1 leading-relaxed" {...props}>
      {children}
    </ol>
  ),
  strong: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <strong className="font-semibold" {...props}>
      {children}
    </strong>
  ),
  em: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <em className="italic" {...props}>
      {children}
    </em>
  ),
  h1: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1 className="text-lg font-semibold mt-4 mb-2 first:mt-0" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className="text-base font-semibold mt-3 mb-1.5" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="text-sm font-semibold mt-2.5 mb-1" {...props}>
      {children}
    </h3>
  ),
  a: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline underline-offset-2 hover:no-underline"
      {...props}
    >
      {children}
    </a>
  ),
  table: ({ children, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
    <div className="my-3 overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm border-collapse" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <thead className="bg-muted/50" {...props}>
      {children}
    </thead>
  ),
  th: ({ children, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <th className="border border-border px-3 py-2 text-left font-semibold" {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <td className="border border-border px-3 py-2" {...props}>
      {children}
    </td>
  ),
  tr: ({ children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
    <tr {...props}>{children}</tr>
  ),
  tbody: ({ children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <tbody {...props}>{children}</tbody>
  ),
}

export function ChatMessage({ role, content, timestamp, isStreaming }: ChatMessageProps) {
  const isUser = role === "user"
  return (
    <div
      className={`flex w-full gap-3 max-w-3xl mx-auto ${isUser ? "flex-row-reverse" : "flex-row"} chat-message-in`}
    >
      <Avatar className="h-8 w-8 flex-shrink-0 rounded-full border-2 border-background shadow-sm">
        <AvatarFallback
          className={`text-xs ${isUser ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
        >
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>
      <div className={`flex flex-col min-w-0 ${isUser ? "items-end" : "items-start"} max-w-[85%]`}>
        <div
          className={`rounded-2xl px-5 py-3 shadow-sm break-words ${
            isUser
              ? "bg-primary text-primary-foreground rounded-br-md"
              : "bg-card text-foreground border border-border rounded-bl-md shadow-sm"
          }`}
        >
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{content}</p>
          ) : (
            <div className="text-sm prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-headings:break-words prose-p:break-words prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {content}
              </ReactMarkdown>
            </div>
          )}
          {isStreaming && (
            <span className="inline-block w-0.5 h-4 ml-0.5 align-middle bg-foreground cursor-blink rounded-sm" aria-hidden />
          )}
        </div>
        {timestamp && (
          <span className="mt-1 px-1 text-[10px] text-muted-foreground/80">{timestamp}</span>
        )}
      </div>
    </div>
  )
}
