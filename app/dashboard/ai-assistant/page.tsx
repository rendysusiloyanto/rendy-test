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
import { Send, Loader2, ImagePlus, X, Bot, Wrench, Globe, BookOpen, FileCode, ArrowDown, RefreshCw, PanelLeft, PanelLeftClose } from "lucide-react"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { ApiError } from "@/lib/api"

/** Message shape matches backend history */
type Message = Omit<AiChatHistoryMessage, "id"> & { id?: number }

const SUGGESTIONS = [
  { label: "Help me debug Nginx", icon: Wrench },
  { label: "Explain DNS setup", icon: Globe },
  { label: "How to prepare for UKK?", icon: BookOpen },
  { label: "Analyze my config", icon: FileCode },
]

const SCROLL_THRESHOLD = 80
/** Parse Markdown every N ms during stream so partial fences get time to complete; when done, final content parses once. */
const STREAM_RENDER_INTERVAL_MS = 400
const STREAM_MODE_STORAGE_KEY = "ai-assistant-use-stream"
const SIDEBAR_OPEN_STORAGE_KEY = "ai-assistant-sidebar-open"

function formatMessageTime(createdAt: string) {
  return formatDistanceToNow(new Date(createdAt), { addSuffix: true })
}

function AiAssistantContent() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [streamingBuffer, setStreamingBuffer] = useState("")
  const [input, setInput] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [remainingToday, setRemainingToday] = useState<number | null>(null)
  const [showScrollBottom, setShowScrollBottom] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [useStreamMode, setUseStreamModeState] = useState(true)
  const [bulkPending, setBulkPending] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [displayedStreamingLength, setDisplayedStreamingLength] = useState(0)
  const [justFinishedStreaming, setJustFinishedStreaming] = useState(false)

  const setUseStreamMode = useCallback((value: boolean) => {
    setUseStreamModeState(value)
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STREAM_MODE_STORAGE_KEY, value ? "1" : "0")
      } catch {
        // ignore
      }
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const stored = localStorage.getItem(STREAM_MODE_STORAGE_KEY)
      if (stored === "0") setUseStreamModeState(false)
      else if (stored === "1") setUseStreamModeState(true)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const stored = localStorage.getItem(SIDEBAR_OPEN_STORAGE_KEY)
      if (stored === "0") setSidebarOpen(false)
      else if (stored === "1") setSidebarOpen(true)
      else setSidebarOpen(window.matchMedia("(min-width: 768px)").matches)
    } catch {
      setSidebarOpen(window.matchMedia("(min-width: 768px)").matches)
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      localStorage.setItem(SIDEBAR_OPEN_STORAGE_KEY, sidebarOpen ? "1" : "0")
    } catch {
      // ignore
    }
  }, [sidebarOpen])
  const [historyError, setHistoryError] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const streamingBufferRef = useRef("")
  const streamThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const streamLastFlushRef = useRef(0)
  const typingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const chatStream = useAiChatStream()

  useEffect(() => {
    if (!chatStream.isStreaming) return
    typingIntervalRef.current = setInterval(() => {
      setDisplayedStreamingLength((prev) => {
        const target = streamingBufferRef.current.length
        if (prev >= target) return prev
        const step = Math.min(4, target - prev)
        return prev + step
      })
    }, 24)
    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current)
        typingIntervalRef.current = null
      }
    }
  }, [chatStream.isStreaming])

  useEffect(() => {
    if (!justFinishedStreaming) return
    const t = setTimeout(() => setJustFinishedStreaming(false), 400)
    return () => clearTimeout(t)
  }, [justFinishedStreaming])
  const chatWithImage = useAiChatWithImage()
  const isPending = chatStream.isStreaming || chatWithImage.isPending || bulkPending

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
  }, [messages, streamingBuffer, scrollToBottom])

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

  const handleSend = async () => {
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

    if (!useStreamMode) {
      setBulkPending(true)
      try {
        const data = await aiApi.chat({ message: text })
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.reply, created_at: new Date().toISOString() },
        ])
        setRemainingToday(data.remaining_today)
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.status === 401) {
            router.push("/login")
            return
          }
          if (err.status === 403) {
            toast.error("Premium required to use AI assistant.")
            setMessages((prev) => prev.slice(0, -1))
            return
          }
          if (err.status === 429) {
            const body = err.body as { remaining_today?: number } | undefined
            toast.error(
              body?.remaining_today != null
                ? `Daily limit reached. ${body.remaining_today} messages left today.`
                : "Daily message limit exceeded."
            )
            setMessages((prev) => prev.slice(0, -1))
            return
          }
        }
        toast.error("Failed to send message.")
        setMessages((prev) => prev.slice(0, -1))
      } finally {
        setBulkPending(false)
      }
      return
    }

    streamingBufferRef.current = ""
    setStreamingBuffer("")
    setDisplayedStreamingLength(0)
    setMessages((prev) => [...prev, { role: "assistant", content: "", created_at: new Date().toISOString() }])
    chatStream.startStream(text, {
      onDelta: (delta) => {
        streamingBufferRef.current += delta
        const now = Date.now()
        if (now - streamLastFlushRef.current >= STREAM_RENDER_INTERVAL_MS) {
          streamLastFlushRef.current = now
          setStreamingBuffer(streamingBufferRef.current)
        } else if (!streamThrottleRef.current) {
          streamThrottleRef.current = setTimeout(() => {
            streamThrottleRef.current = null
            streamLastFlushRef.current = Date.now()
            setStreamingBuffer(streamingBufferRef.current)
          }, STREAM_RENDER_INTERVAL_MS - (now - streamLastFlushRef.current))
        }
      },
      onDone: (remaining) => {
        if (streamThrottleRef.current) {
          clearTimeout(streamThrottleRef.current)
          streamThrottleRef.current = null
        }
        const finalContent = streamingBufferRef.current
        setStreamingBuffer("")
        streamingBufferRef.current = ""
        setDisplayedStreamingLength(0)
        setJustFinishedStreaming(true)
        setRemainingToday(remaining)
        setMessages((prev) => {
          const next = [...prev]
          const last = next[next.length - 1]
          if (last?.role === "assistant") next[next.length - 1] = { ...last, content: finalContent }
          return next
        })
      },
      onError: () => {
        if (streamThrottleRef.current) {
          clearTimeout(streamThrottleRef.current)
          streamThrottleRef.current = null
        }
        setMessages((prev) => prev.filter((_, i) => i < prev.length - 1))
        streamingBufferRef.current = ""
        setStreamingBuffer("")
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
      <div className="relative flex h-[calc(100vh-88px)] w-full max-w-7xl mx-auto px-2 gap-0">
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            aria-hidden
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <aside
          className={`flex flex-col gap-4 py-4 border-r border-border bg-background/95 backdrop-blur-sm transition-[transform,width] duration-200 ease-out z-50
            fixed md:relative inset-y-0 left-0
            w-52 md:w-40 md:overflow-hidden
            ${sidebarOpen
              ? "translate-x-0 flex-shrink-0 md:w-40"
              : "-translate-x-full md:translate-x-0 md:w-0 md:min-w-0 md:max-w-0 md:shrink md:py-0 md:px-0 md:border-r-0 md:opacity-0"}`}
        >
          <div className={`flex items-center gap-2 px-3 md:pr-3 min-w-0 ${sidebarOpen ? "min-w-[10rem] md:min-w-[8rem]" : "md:min-w-0"}`}>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 shadow-sm">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground leading-tight">AI Assistant</h1>
              <p className="text-[11px] text-muted-foreground">Premium</p>
            </div>
          </div>
          <div className={`flex flex-col gap-1.5 px-3 min-w-0 ${sidebarOpen ? "min-w-[10rem] md:min-w-[8rem]" : "md:min-w-0"}`}>
            <span className="text-xs text-muted-foreground font-medium">Chat</span>
            <button
              type="button"
              onClick={() => setUseStreamMode(true)}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${useStreamMode ? "bg-primary text-primary-foreground" : "bg-muted/80 text-muted-foreground hover:bg-muted"}`}
            >
              Stream
            </button>
            <button
              type="button"
              onClick={() => setUseStreamMode(false)}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${!useStreamMode ? "bg-primary text-primary-foreground" : "bg-muted/80 text-muted-foreground hover:bg-muted"}`}
            >
              Non-stream
            </button>
          </div>
        </aside>

        <div className="flex-1 min-w-0 w-full flex flex-col min-h-0 relative">
          <div className="flex items-center gap-2 flex-shrink-0 py-2 md:py-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-lg border-border"
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            >
              {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
            </Button>
          </div>
        <Card className="flex-1 flex flex-col min-h-0 border-border bg-card/80 shadow-lg shadow-black/5 backdrop-blur-sm overflow-hidden">
          <CardContent
            className="relative flex flex-col flex-1 min-h-0 p-0 bg-gradient-to-b from-background/50 to-muted/20"
            style={{ backgroundImage: "radial-gradient(ellipse at top, oklch(0.22 0.01 260 / 0.4) 0%, transparent 60%)" }}
          >
            <div
              ref={scrollRef}
              className={`chat-scroll-area flex-1 overflow-y-auto py-6 px-1 ${!sidebarOpen ? "flex flex-col items-center" : ""}`}
            >
              <div className={`w-full space-y-6 ${!sidebarOpen ? "max-w-3xl" : ""}`}>
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
                  const content = isLastAssistantStreaming
                    ? streamingBuffer.slice(0, Math.min(displayedStreamingLength, streamingBuffer.length))
                    : m.content
                  const showRefresh =
                    justFinishedStreaming && i === messages.length - 1 && m.role === "assistant"
                  return (
                    <ChatMessage
                      key={m.id ?? `msg-${i}`}
                      role={m.role}
                      content={content}
                      timestamp={formatMessageTime(m.created_at)}
                      isStreaming={isLastAssistantStreaming}
                      justFinishedStreaming={showRefresh}
                    />
                  )
                })}
              {isPending && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex w-full gap-2 chat-message-in">
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
