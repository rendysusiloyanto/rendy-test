"use client"

import { useMutation } from "@tanstack/react-query"
import { aiApi } from "@/lib/ai-api"
import type { AiAnalyzeResponse } from "@/lib/ai-types"
import { ApiError } from "@/lib/api"
import { toast } from "sonner"

export function useAiAnalyze() {
  return useMutation({
    mutationFn: (examResultId: string) => aiApi.analyze(examResultId),
    onError: (err: unknown) => {
      if (err instanceof ApiError) {
        if (err.status === 403) {
          toast.error("Premium required to use AI analysis.")
          return
        }
        if (err.status === 429) {
          const body = err.body as { remaining_today?: number; detail?: { remaining_today?: number } } | undefined
          const remaining = body?.remaining_today ?? body?.detail?.remaining_today
          toast.error(
            remaining != null
              ? `Daily limit reached. You have ${remaining} analyses left today.`
              : "Daily analysis limit exceeded."
          )
          return
        }
        toast.error(err.message || "Analysis failed.")
      } else {
        toast.error("Something went wrong.")
      }
    },
  })
}

export type AiAnalyzeResult = AiAnalyzeResponse
