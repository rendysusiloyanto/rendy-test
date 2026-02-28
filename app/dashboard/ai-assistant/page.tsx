"use client"

import { useState, useRef, useEffect } from "react"
import { AppShell } from "@/components/app-shell"
import { AuthGuard } from "@/components/auth-guard"
import { PremiumGuard } from "@/components/premium-guard"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useAiChatWithImage } from "@/hooks/use-ai-chat"
import { useAiChatStream } from "@/hooks/use-ai-chat-stream"
import { ChatMessage } from "@/components/chat-message"
import { AI_IMAGE_ACCEPT, AI_IMAGE_MAX_BYTES } from "@/lib/ai-types"
import { Send, Loader2, ImagePlus, X, Bot, Wrench, Globe, BookOpen, FileCode } from "lucide-react"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"

type Message = { role: "user" | "assistant"; content: string; createdAt?: Date }

const SUGGESTIONS = [
  { label: "Help me debug Nginx", icon: Wrench },
  { label: "Explain DNS setup", icon: Globe },
  { label: "How to prepare for UKK?", icon: BookOpen },
  { label: "Analyze my config", icon: FileCode },
]

function formatMessageTime(d: Date) {
  return formatDistanceToNow(d, { addSuffix: true })
}

function AiAssistantContent() {
  const [messages, setMessages] = useState<Message[]>([])
  const [streamingContent, setStreamingContent] = useState("")
  const [input, setInput] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [remainingToday, setRemainingToday] = useState<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const streamingContentRef = useRef("")

  const chatStream = useAiChatStream()
  const chatWithImage = useAiChatWithImage()
  const isPending = chatStream.isStreaming || chatWithImage.isPending

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, streamingContent])

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const handleSend = () => {
    const text = input.trim()
    if (imageFile) {
      if (imageFile.size > AI_IMAGE_MAX_BYTES) {
        toast.error("Image must be under 10MB")
        return
      }
      const now = new Date()
      setMessages((prev) => [...prev, { role: "user", content: text || "[Image]", createdAt: now }])
      setInput("")
      setImageFile(null)
      chatWithImage.mutate(
        { message: text || null, image: imageFile },
        {
          onSuccess: (data) => {
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: data.reply, createdAt: new Date() },
            ])
            setRemainingToday(data.remaining_today)
          },
        }
      )
      return
    }
    if (!text) return
    const now = new Date()
    setMessages((prev) => [...prev, { role: "user", content: text, createdAt: now }])
    setInput("")
    streamingContentRef.current = ""
    setStreamingContent("")
    setMessages((prev) => [...prev, { role: "assistant", content: "", createdAt: new Date() }])
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
      <div className="flex flex-col h-[calc(100vh-8rem)] max-w-2xl mx-auto w-full">
        <div className="flex items-center gap-2 mb-4">
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
            className="flex flex-col flex-1 min-h-0 p-0 bg-gradient-to-b from-background/50 to-muted/20"
            style={{ backgroundImage: "radial-gradient(ellipse at top, oklch(0.22 0.01 260 / 0.4) 0%, transparent 60%)" }}
          >
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 py-5 space-y-5"
            >
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/80 border border-border shadow-sm mb-4">
                    <Bot className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">How can I help you today?</p>
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
              {messages.map((m, i) => {
                const isLastAssistantStreaming =
                  isPending && i === messages.length - 1 && m.role === "assistant"
                const content = isLastAssistantStreaming ? streamingContent : m.content
                return (
                  <ChatMessage
                    key={i}
                    role={m.role}
                    content={content}
                    timestamp={m.createdAt ? formatMessageTime(m.createdAt) : undefined}
                  />
                )
              })}
              {isPending && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex w-full gap-3 max-w-2xl mx-auto chat-message-in">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 border-background bg-muted shadow-sm">
                    <Bot className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="rounded-2xl rounded-bl-md px-4 py-3 bg-card border border-border shadow-sm">
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

            <div className="p-3 pt-2 border-t border-border/80 bg-card/30 space-y-2">
              {imageFile && (
                <div className="flex items-center gap-2 text-sm">
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
                  disabled={isPending}
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
                  disabled={isPending}
                />
                <Button
                  type="button"
                  onClick={handleSend}
                  disabled={isPending || (!input.trim() && !imageFile)}
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
                <p className="text-[11px] text-muted-foreground/90">
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
