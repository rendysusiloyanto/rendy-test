/**
 * AI API types for jns23lab
 */

/** POST /api/ai/analyze response */
export interface AiAnalyzeResponse {
  explanation: string
  from_cache: boolean
}

/** POST /api/ai/chat body */
export interface AiChatRequest {
  message: string
}

/** POST /api/ai/chat response */
export interface AiChatResponse {
  reply: string
  input_tokens: number
  output_tokens: number
  remaining_today: number
}

/** Error body when limit exceeded or forbidden */
export interface AiErrorBody {
  detail?: string | { message?: string; remaining_today?: number }
  remaining_today?: number
}

export const AI_IMAGE_ACCEPT = "image/png,image/jpeg,image/webp,image/gif"
export const AI_IMAGE_MAX_BYTES = 10 * 1024 * 1024 // 10MB
