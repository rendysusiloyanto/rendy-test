"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkBreaks from "remark-breaks"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Bot, User } from "lucide-react"
import { normalizeMarkdown } from "@/lib/markdown"

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
        className="rounded bg-muted/80 text-foreground/90 px-1.5 py-0.5 text-[13px] break-all font-mono [font-family:ui-monospace,monospace]"
        {...props}
      >
        {children}
      </code>
    )
  },
  pre: ({ children, ...props }: React.HTMLAttributes<HTMLPreElement>) => (
    <pre className="my-4 rounded-lg overflow-hidden" {...props}>
      {children}
    </pre>
  ),
  p: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="my-3 leading-7 text-foreground/90 break-words first:mt-0 last:mb-0" {...props}>
      {children}
    </p>
  ),
  ul: ({ children, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
    <ul
      className="my-3 pl-6 space-y-2 text-foreground/90 first:mt-0 last:mb-0 list-none [&>li]:relative [&>li]:pl-3 [&>li]:before:absolute [&>li]:before:left-0 [&>li]:before:content-['•'] [&>li]:before:text-foreground/70 [&>li]:before:font-normal"
      {...props}
    >
      {children}
    </ul>
  ),
  ol: ({ children, ...props }: React.HTMLAttributes<HTMLOListElement>) => (
    <ol
      className="my-3 pl-6 list-decimal space-y-2 text-foreground/90 first:mt-0 last:mb-0 [counter-reset:list] [&>li]:list-item [&>li]:pl-1"
      style={{ listStyleType: "decimal" }}
      {...props}
    >
      {children}
    </ol>
  ),
  li: ({ children, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
    <li className="my-0.5 leading-7 break-words block" {...props}>
      {children}
    </li>
  ),
  strong: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <strong className="font-semibold text-foreground" {...props}>
      {children}
    </strong>
  ),
  em: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <em className="italic" {...props}>
      {children}
    </em>
  ),
  h1: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1 className="text-lg font-semibold mt-5 mb-2 text-foreground first:mt-0" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className="text-base font-semibold mt-4 mb-2 text-foreground" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="text-sm font-semibold mt-3 mb-1.5 text-foreground" {...props}>
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
          className={`rounded-2xl px-5 py-4 shadow-sm break-words ${
            isUser
              ? "bg-primary text-primary-foreground rounded-br-md"
              : "bg-card/95 text-foreground border border-border/50 rounded-bl-md shadow-sm"
          }`}
        >
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap leading-7">{content}</p>
          ) : (
            <div className="text-[15px] leading-7 prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap prose-headings:font-semibold prose-headings:break-words prose-p:break-words prose-code:font-mono prose-code:before:content-none prose-code:after:content-none [&>p]:my-3 [&>ul]:my-3 [&>ol]:my-3">
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={markdownComponents}>
                {normalizeMarkdown(content)}
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
