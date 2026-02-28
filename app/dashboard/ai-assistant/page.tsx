"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { AuthGuard } from "@/components/auth-guard"
import { PremiumGuard } from "@/components/premium-guard"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useAiChatWithImage } from "@/hooks/use-ai-chat"
import { useAiChatStream } from "@/hooks/use-ai-chat-stream"
import { ChatMessage } from "@/components/chat-message"
import { aiApi } from "@/lib/ai-api"
import { AI_IMAGE_ACCEPT, AI_IMAGE_MAX_BYTES, type AiChatHistoryMessage } from "@/lib/ai-types"
import { Send, Loader2, ImagePlus, X, Bot, Wrench, Globe, BookOpen, FileCode, ArrowDown, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { ApiError } from "@/lib/api"

/** Message shape matches backend history; id optional for optimistic (streaming) messages */
type Message = Omit<AiChatHistoryMessage, "id"> & { id?: number }

const SUGGESTIONS = [
  { label: "Help me debug Nginx", icon: Wrench },
  { label: "Explain DNS setup", icon: Globe },
  { label: "How to prepare for UKK?", icon: BookOpen },
  { label: "Analyze my config", icon: FileCode },
]

const SCROLL_THRESHOLD = 80

function formatMessageTime(createdAt: string) {
  return formatDistanceToNow(new Date(createdAt), { addSuffix: true })
}

function AiAssistantContent() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [streamingContent, setStreamingContent] = useState("")
  const [input, setInput] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [remainingToday, setRemainingToday] = useState<number | null>(null)
  const [showScrollBottom, setShowScrollBottom] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const streamingContentRef = useRef("")

  const chatStream = useAiChatStream()
  const chatWithImage = useAiChatWithImage()
  const isPending = chatStream.isStreaming || chatWithImage.isPending

  // Load history on mount; replace state entirely (no conversation_id – backend owns one conversation per user)
  useEffect(() => {
    let cancelled = false
    setHistoryError(false)
    setHistoryLoading(true)
    aiApi
      .getChatHistory()
      .then((res) => {
        if (!cancelled) setMessages(res.messages)
      })
      .catch((err) => {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 401) {
          router.push("/login")
          return
        }
        setHistoryError(true)
        setMessages([])
        toast.error("Failed to load chat history")
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [router])

  const fetchHistoryRetry = useCallback(() => {
    setHistoryError(false)
    setHistoryLoading(true)
    aiApi
      .getChatHistory()
      .then((res) => setMessages(res.messages))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          router.push("/login")
          return
        }
        setHistoryError(true)
        toast.error("Failed to load chat history")
      })
      .finally(() => setHistoryLoading(false))
  }, [router])

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingContent, scrollToBottom])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_THRESHOLD
    setShowScrollBottom(!isNearBottom)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    handleScroll()
    el.addEventListener("scroll", handleScroll, { passive: true })
    return () => el.removeEventListener("scroll", handleScroll)
  }, [handleScroll, messages.length])

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const handleSend = () => {
    const text = input.trim()
    const nowIso = new Date().toISOString()
    if (imageFile) {
      if (imageFile.size > AI_IMAGE_MAX_BYTES) {
        toast.error("Image must be under 10MB")
        return
      }
      setMessages((prev) => [...prev, { role: "user", content: text || "[Image]", created_at: nowIso }])
      setInput("")
      setImageFile(null)
      chatWithImage.mutate(
        { message: text || null, image: imageFile },
        {
          onSuccess: (data) => {
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: data.reply, created_at: new Date().toISOString() },
            ])
            setRemainingToday(data.remaining_today)
          },
        }
      )
      return
    }
    if (!text) return
    setMessages((prev) => [...prev, { role: "user", content: text, created_at: nowIso }])
    setInput("")
    streamingContentRef.current = ""
    setStreamingContent("")
    setMessages((prev) => [...prev, { role: "assistant", content: "", created_at: new Date().toISOString() }])
    chatStream.startStream(text, {
      onDelta: (delta) => {
        streamingContentRef.current += delta
        setStreamingContent(streamingContentRef.current)
      },
      onDone: (remaining) => {
        const finalContent = streamingContentRef.current
        setMessages((prev) => {
          const next = [...prev]
          const last = next[next.length - 1]
          if (last?.role === "assistant") {
            next[next.length - 1] = { ...last, content: finalContent }
          }
          return next
        })
        streamingContentRef.current = ""
        setStreamingContent("")
        setRemainingToday(remaining)
      },
      onError: () => {
        setMessages((prev) => prev.filter((_, i) => i < prev.length - 1))
        streamingContentRef.current = ""
        setStreamingContent("")
      },
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSuggestion = (label: string) => {
    setInput(label)
    textareaRef.current?.focus()
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const allowed = ["image/png", "image/jpeg", "image/webp", "image/gif"]
    if (!allowed.includes(file.type)) {
      toast.error("Allowed: PNG, JPEG, WebP, GIF")
      return
    }
    if (file.size > AI_IMAGE_MAX_BYTES) {
      toast.error("Image must be under 10MB")
      return
    }
    setImageFile(file)
    e.target.value = ""
  }

  return (
    <AppShell>
      <div className="flex flex-col h-[calc(100vh-120px)] max-w-5xl mx-auto w-full px-2">
        <div className="flex items-center gap-2 mb-4 flex-shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 shadow-sm">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">AI Assistant</h1>
            <p className="text-xs text-muted-foreground">Premium · Streams responses</p>
          </div>
        </div>

        <Card className="flex-1 flex flex-col min-h-0 border-border bg-card/80 shadow-lg shadow-black/5 backdrop-blur-sm overflow-hidden">
          <CardContent
            className="relative flex flex-col flex-1 min-h-0 p-0 bg-gradient-to-b from-background/50 to-muted/20"
            style={{ backgroundImage: "radial-gradient(ellipse at top, oklch(0.22 0.01 260 / 0.4) 0%, transparent 60%)" }}
          >
            <div
              ref={scrollRef}
              className="chat-scroll-area flex-1 overflow-y-auto px-4 py-6 space-y-6"
            >
              {historyLoading && (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                  <p className="text-sm text-muted-foreground">Loading conversation...</p>
                </div>
              )}
              {historyError && !historyLoading && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-sm text-muted-foreground mb-3">Could not load chat history.</p>
                  <Button variant="outline" size="sm" onClick={fetchHistoryRetry} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Retry
                  </Button>
                </div>
              )}
              {!historyLoading && !historyError && messages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/80 border border-border shadow-sm mb-4">
                    <Bot className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">Start a conversation</p>
                  <p className="text-xs text-muted-foreground/80 mb-6">Choose a suggestion or type your message</p>
                  <div className="flex flex-wrap justify-center gap-2 max-w-md">
                    {SUGGESTIONS.map((s) => (
                      <Button
                        key={s.label}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-full border-border bg-card/80 shadow-sm hover:bg-accent/80 text-foreground h-9 px-4 text-xs font-normal gap-2"
                        onClick={() => handleSuggestion(s.label)}
                      >
                        <s.icon className="h-3.5 w-3.5 text-muted-foreground" />
                        {s.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              {!historyLoading &&
                messages.map((m, i) => {
                  const isLastAssistantStreaming =
                    isPending && i === messages.length - 1 && m.role === "assistant"
                  const content = isLastAssistantStreaming ? streamingContent : m.content
                  return (
                    <ChatMessage
                      key={m.id ?? `msg-${i}`}
                      role={m.role}
                      content={content}
                      timestamp={formatMessageTime(m.created_at)}
                      isStreaming={isLastAssistantStreaming}
                    />
                  )
                })}
              {isPending && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex w-full gap-3 max-w-3xl mx-auto chat-message-in">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 border-background bg-muted shadow-sm">
                    <Bot className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="rounded-2xl rounded-bl-md px-5 py-3 bg-card border border-border shadow-sm">
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <span className="inline-flex gap-1">
                        <span className="animate-pulse">AI is thinking</span>
                        <span className="animate-pulse">...</span>
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </div>

            {showScrollBottom && (
              <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="rounded-full shadow-md h-9 px-3 gap-1.5"
                  onClick={scrollToBottom}
                >
                  <ArrowDown className="h-4 w-4" />
                  Scroll to bottom
                </Button>
              </div>
            )}

            <div className="sticky bottom-0 p-3 pt-2 border-t border-border/80 bg-card/50 backdrop-blur-sm flex-shrink-0">
              {imageFile && (
                <div className="flex items-center gap-2 text-sm mb-2">
                  <span className="text-muted-foreground truncate flex-1">
                    {imageFile.name}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setImageFile(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <div className="flex gap-2 items-end">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={AI_IMAGE_ACCEPT}
                  className="hidden"
                  onChange={handleImageChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="flex-shrink-0 border-border h-9 w-9 rounded-xl shadow-sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isPending || historyLoading}
                >
                  <ImagePlus className="h-4 w-4" />
                </Button>
                <textarea
                  ref={textareaRef}
                  placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
                  rows={1}
                  className="flex-1 min-h-[40px] max-h-32 resize-none rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 leading-relaxed"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isPending || historyLoading}
                />
                <Button
                  type="button"
                  onClick={handleSend}
                  disabled={isPending || historyLoading || (!input.trim() && !imageFile)}
                  size="icon"
                  className="flex-shrink-0 h-9 w-9 rounded-xl shadow-sm"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {remainingToday != null && (
                <p className="text-[11px] text-muted-foreground/90 mt-1.5">
                  Messages remaining today: {remainingToday}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}

export default function AiAssistantPage() {
  return (
    <AuthGuard>
      <PremiumGuard>
        <AiAssistantContent />
      </PremiumGuard>
    </AuthGuard>
  )
}
