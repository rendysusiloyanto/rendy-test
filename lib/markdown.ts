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
  // Blank line before list when bullet follows colon; don’t treat ":**Bold**" as list
  // Preserve indent so sublists stay (e.g. ":\n  -" → ":\n\n  -")
  out = out.replace(/:\s*\n?\s*(\s*)-/g, ":\n\n$1-")
  out = out.replace(/:\s*\n?\s*(\s*)\*(?!\*)/g, ":\n\n$1*")
  // One bullet per line: " - " and " * " only when followed by list-item start (avoid "X - jika relevan").
  // Use (?<!\n) so we do NOT replace when the bullet is already at line start (preserves nested lists like "  - subitem").
  out = out.replace(/(?<!\n)\s+-\s+(?=[A-Z0-9])/g, "\n- ")
  out = out.replace(/(?<!\n)\s+\*(?!\*)\s+/g, "\n* ")
  // Ensure closing question on its own line (fixes streaming where it is appended without newline)
  out = out.replace(/\.\s*(Apakah ada hal lain[^.?]*[.?])/gi, ".\n\n$1")
  return out
}
