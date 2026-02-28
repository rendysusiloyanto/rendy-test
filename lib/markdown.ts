/**
 * Markdown normalization for AI assistant content.
 * Same rules as backend app/utils/markdown.py so lists always render correctly:
 * - Blank line before list: "intro:\n- item" or "intro: - item" → "intro:\n\n- item" (and for *).
 * - One bullet per line: "-" and "*" in the middle of a sentence → newline before bullet.
 *
 * Use for all assistant content (streaming and from history) before passing to ReactMarkdown.
 * Safe to run on already-normalized text (idempotent).
 *
 * @example
 * normalizeMarkdown("Berikut fungsi:\n- Memberikan informasi\n- Menjawab pertanyaan")
 * // → "Berikut fungsi:\n\n- Memberikan informasi\n- Menjawab pertanyaan"
 */
export function normalizeMarkdown(text: string): string {
  if (!text?.trim()) return text
  let out = text
  // Blank line before list when bullet follows colon (e.g. "Here's how it works: * You" → "works:\n\n* You")
  out = out.replace(/:\s*\n?\s*-/g, ":\n\n-")
  out = out.replace(/:\s*\*/g, ":\n\n*")
  // One bullet per line: " * " in the middle of text → newline before "* " (handles streamed "browser. * Your")
  out = out.replace(/\s+-\s+/g, "\n- ")
  out = out.replace(/\s+\*\s+/g, "\n* ")
  return out
}
