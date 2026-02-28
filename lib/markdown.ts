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
  // Blank line before list when bullet follows colon (e.g. "intro:\n- Item" or "intro: - Item")
  out = out.replace(/:\s*\n?\s*-/g, ":\n\n-")
  out = out.replace(/:\s*\*/g, ":\n\n*")
  // After ) or . ensure newline before next list item (fixes "...DNSMasq)- DNS propagation" merging)
  out = out.replace(/\)\s*(-\s)/g, ")\n\n- ")
  out = out.replace(/\)\s*(\*\s)/g, ")\n\n* ")
  out = out.replace(/\.\s*(-\s)/g, ".\n\n- ")
  out = out.replace(/\.\s*(\*\s)/g, ".\n\n* ")
  // One bullet per line: put "-" and "*" list markers on their own line
  out = out.replace(/\s+-\s+/g, "\n- ")
  out = out.replace(/\s+\*\s+/g, "\n* ")
  return out
}
