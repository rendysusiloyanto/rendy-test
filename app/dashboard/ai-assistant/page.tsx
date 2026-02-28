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
import { Send, Loader2, ImagePlus, X, Bot } from "lucide-react"
import { toast } from "sonner"

type Message = { role: "user" | "assistant"; content: string }

function AiAssistantContent() {
  const [messages, setMessages] = useState<Message[]>([])
  const [streamingContent, setStreamingContent] = useState("")
  const [input, setInput] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [remainingToday, setRemainingToday] = useState<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const streamingContentRef = useRef("")

  const chatStream = useAiChatStream()
  const chatWithImage = useAiChatWithImage()
  const isPending = chatStream.isStreaming || chatWithImage.isPending

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, streamingContent])

  const handleSend = () => {
    const text = input.trim()
    if (imageFile) {
      if (imageFile.size > AI_IMAGE_MAX_BYTES) {
        toast.error("Image must be under 10MB")
        return
      }
      setMessages((prev) => [...prev, { role: "user", content: text || "[Image]" }])
      setInput("")
      setImageFile(null)
      chatWithImage.mutate(
        { message: text || null, image: imageFile },
        {
          onSuccess: (data) => {
            setMessages((prev) => [...prev, { role: "assistant", content: data.reply }])
            setRemainingToday(data.remaining_today)
          },
        }
      )
      return
    }
    if (!text) return
    setMessages((prev) => [...prev, { role: "user", content: text }])
    setInput("")
    streamingContentRef.current = ""
    setStreamingContent("")
    setMessages((prev) => [...prev, { role: "assistant", content: "" }])
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
      <div className="flex flex-col h-[calc(100vh-8rem)] max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <Bot className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold text-foreground">AI Assistant</h1>
        </div>

        <Card className="flex-1 flex flex-col min-h-0 border-border bg-card">
          <CardContent className="flex flex-col flex-1 min-h-0 p-0">
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4"
            >
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                  <Bot className="h-12 w-12 mb-3 opacity-50" />
                  <p className="text-sm">Send a message or upload an image to get started.</p>
                </div>
              )}
              {messages.map((m, i) => {
                const isLastAssistantStreaming =
                  isPending &&
                  i === messages.length - 1 &&
                  m.role === "assistant"
                const content = isLastAssistantStreaming ? streamingContent : m.content
                return <ChatMessage key={i} role={m.role} content={content} />
              })}
              {isPending && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-muted border border-border px-4 py-3 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 border-t border-border space-y-2">
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
              <div className="flex gap-2">
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
                  className="flex-shrink-0 border-border"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isPending}
                >
                  <ImagePlus className="h-4 w-4" />
                </Button>
                <input
                  type="text"
                  placeholder="Type a message..."
                  className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  disabled={isPending}
                />
                <Button
                  type="button"
                  onClick={handleSend}
                  disabled={isPending || (!input.trim() && !imageFile)}
                  size="icon"
                  className="flex-shrink-0"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {remainingToday != null && (
                <p className="text-xs text-muted-foreground">
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
