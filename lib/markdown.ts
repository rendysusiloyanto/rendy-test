/**
 * No normalization: response from /api/ai/chat is rendered as Markdown as-is.
 * The backend (AI prompt) is responsible for Markdown formatting.
 */

export function normalizeMarkdown(text: string): string {
  if (text == null) return ""
  return typeof text === "string" ? text : String(text)
}
