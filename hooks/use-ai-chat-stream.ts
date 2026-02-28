"use client"

import { useState, useCallback } from "react"
import { aiApi } from "@/lib/ai-api"
import { ApiError } from "@/lib/api"
import { toast } from "sonner"

export interface StreamCallbacks {
  onDelta: (delta: string) => void
  onDone: (remainingToday: number) => void
  onError: (message: string) => void
}

export function useAiChatStream() {
  const [isStreaming, setIsStreaming] = useState(false)

  const startStream = useCallback(async (message: string, callbacks: StreamCallbacks) => {
    setIsStreaming(true)
    try {
      const res = await aiApi.chatStream(message)
      const reader = res.body?.getReader()
      if (!reader) {
        callbacks.onError("No response body")
        return
      }
      const decoder = new TextDecoder()
      let buffer = ""
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6)) as
                | { delta?: string }
                | { done: true; remaining_today: number }
                | { error: string }
              if ("delta" in data && data.delta) callbacks.onDelta(data.delta)
              if ("done" in data && data.done === true)
                callbacks.onDone((data as { remaining_today: number }).remaining_today)
              if ("error" in data) callbacks.onError((data as { error: string }).error)
            } catch {
              // skip invalid JSON lines
            }
          }
        }
      }
      // flush remaining buffer as last line
      if (buffer.trim() && buffer.startsWith("data: ")) {
        try {
          const data = JSON.parse(buffer.slice(6)) as
            | { delta?: string }
            | { done: true; remaining_today: number }
            | { error: string }
          if ("delta" in data && data.delta) callbacks.onDelta(data.delta)
          if ("done" in data && data.done === true)
            callbacks.onDone((data as { remaining_today: number }).remaining_today)
          if ("error" in data) callbacks.onError((data as { error: string }).error)
        } catch {
          // ignore
        }
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 403) {
          toast.error("Premium required to use AI assistant.")
          callbacks.onError("Premium required")
          return
        }
        if (err.status === 429) {
          const body = err.body as { remaining_today?: number } | undefined
          const remaining = body?.remaining_today
          toast.error(
            remaining != null
              ? `Daily limit reached. ${remaining} messages left today.`
              : "Daily message limit exceeded."
          )
          callbacks.onError("Limit exceeded")
          return
        }
        if (err.status === 401) {
          callbacks.onError("Unauthorized")
          return
        }
        toast.error(err.message || "Failed to send message.")
        callbacks.onError(err.message)
      } else {
        toast.error("Something went wrong.")
        callbacks.onError("Request failed")
      }
    } finally {
      setIsStreaming(false)
    }
  }, [])

  return { startStream, isStreaming }
}
