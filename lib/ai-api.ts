"use client"

import { axiosClient } from "./axios-client"
import type { AiAnalyzeResponse, AiChatRequest, AiChatResponse, AiChatHistoryResponse, AiChatDailyLimitResponse } from "./ai-types"
import { ApiError } from "./api"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || ""

function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("access_token")
}

export const aiApi = {
  /** POST /api/ai/analyze - send exam result id; adjust body key if backend expects different (e.g. result_id) */
  async analyze(examResultId: string): Promise<AiAnalyzeResponse> {
    const { data } = await axiosClient.post<AiAnalyzeResponse>("/api/ai/analyze", {
      exam_result_id: examResultId,
    })
    return data
  },

  /** POST /api/ai/chat */
  async chat(payload: AiChatRequest): Promise<AiChatResponse> {
    const { data } = await axiosClient.post<AiChatResponse>("/api/ai/chat", payload)
    return data
  },

  /** GET /api/ai/chat/history - load persistent conversation (one per user). 401 handled by axios interceptor. */
  async getChatHistory(): Promise<AiChatHistoryResponse> {
    const { data } = await axiosClient.get<AiChatHistoryResponse>("/api/ai/chat/history")
    return data
  },

  /** GET /api/ai/chat/limit - daily message limit (5 non-premium, 30 premium). */
  async getChatDailyLimit(): Promise<AiChatDailyLimitResponse> {
    const { data } = await axiosClient.get<AiChatDailyLimitResponse>("/api/ai/chat/limit")
    return data
  },

  /**
   * POST /api/ai/chat/stream - SSE stream (fetch + ReadableStream).
   * Returns Response; caller must check res.ok and read res.body.
   */
  async chatStream(message: string): Promise<Response> {
    const token = getToken()
    const res = await fetch(`${API_BASE}/api/ai/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ message }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      throw new ApiError(res.status, (body?.detail as string) || res.statusText, body)
    }
    return res
  },

  /** POST /api/ai/chat-with-image - multipart/form-data */
  async chatWithImage(message: string | null, image: File): Promise<AiChatResponse> {
    const form = new FormData()
    if (message?.trim()) form.append("message", message.trim())
    form.append("image", image)
    const { data } = await axiosClient.post<AiChatResponse>("/api/ai/chat-with-image", form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    return data
  },
}
