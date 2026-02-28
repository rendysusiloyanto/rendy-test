"use client"

import { axiosClient } from "./axios-client"
import type { AiAnalyzeResponse, AiChatRequest, AiChatResponse } from "./ai-types"

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
