"use client"

import { useMutation } from "@tanstack/react-query"
import { aiApi } from "@/lib/ai-api"
import type { AiChatResponse } from "@/lib/ai-types"
import { ApiError } from "@/lib/api"
import { toast } from "sonner"

export function useAiChat() {
  return useMutation({
    mutationFn: (message: string) => aiApi.chat({ message }),
    onError: (err: unknown) => {
      if (err instanceof ApiError) {
        if (err.status === 403) {
          toast.error("Premium required to use AI assistant.")
          return
        }
        if (err.status === 429) {
          const body = err.body as { remaining_today?: number; detail?: { remaining_today?: number } } | undefined
          const remaining = body?.remaining_today ?? (body?.detail as { remaining_today?: number } | undefined)?.remaining_today
          toast.error(
            remaining != null
              ? `Daily limit reached. ${remaining} messages left today.`
              : "Daily message limit exceeded."
          )
          return
        }
        toast.error(err.message || "Failed to send message.")
      } else {
        toast.error("Something went wrong.")
      }
    },
  })
}

export function useAiChatWithImage() {
  return useMutation({
    mutationFn: ({ message, image }: { message: string | null; image: File }) =>
      aiApi.chatWithImage(message, image),
    onError: (err: unknown) => {
      if (err instanceof ApiError) {
        if (err.status === 403) {
          toast.error("Premium required to use AI assistant.")
          return
        }
        if (err.status === 429) {
          toast.error("Daily message limit exceeded.")
          return
        }
        toast.error(err.message || "Failed to send image.")
      } else {
        toast.error("Something went wrong.")
      }
    },
  })
}

export type AiChatResult = AiChatResponse
