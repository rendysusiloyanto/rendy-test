"use client"

import ReactMarkdown from "react-markdown"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Bot, User } from "lucide-react"

interface ChatMessageProps {
  role: "user" | "assistant"
  content: string
  timestamp?: string
}

const markdownComponents = {
  code: ({ className, children, ...props }: React.HTMLAttributes<HTMLElement> & { node?: unknown }) => {
    const isBlock = Boolean(className?.includes?.("language-"))
    if (isBlock) {
      return (
        <code
          className="block rounded-lg bg-zinc-900 text-zinc-100 p-4 text-[13px] leading-relaxed overflow-x-auto border border-zinc-800"
          {...props}
        >
          {children}
        </code>
      )
    }
    return (
      <code
        className="rounded bg-zinc-800/90 text-zinc-200 px-1.5 py-0.5 text-[13px] font-mono border border-zinc-700/50"
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
    <p className="my-2.5 leading-relaxed" {...props}>
      {children}
    </p>
  ),
  ul: ({ children, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="my-2.5 pl-5 list-disc space-y-1 leading-relaxed" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className="my-2.5 pl-5 list-decimal space-y-1 leading-relaxed" {...props}>
      {children}
    </ol>
  ),
}

export function ChatMessage({ role, content, timestamp }: ChatMessageProps) {
  const isUser = role === "user"
  return (
    <div
      className={`flex w-full gap-3 max-w-2xl mx-auto ${isUser ? "flex-row-reverse" : "flex-row"} chat-message-in`}
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
          className={`rounded-2xl px-4 py-3 shadow-sm ${
            isUser
              ? "bg-primary text-primary-foreground rounded-br-md"
              : "bg-card text-foreground border border-border rounded-bl-md shadow-sm"
          }`}
        >
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{content}</p>
          ) : (
            <div className="text-sm prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-headings:my-2">
              <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
            </div>
          )}
        </div>
        {timestamp && (
          <span className="mt-1 px-1 text-[10px] text-muted-foreground/80">{timestamp}</span>
        )}
      </div>
    </div>
  )
}
