# Cursor Prompt — AI Chat Markdown Rendering

Gunakan prompt ini saat mengerjakan fitur **render Markdown di AI chat** (frontend v0-frontend). Tujuannya: pesan asisten tampil rapi (list, bold, code, line break) dan tetap aman untuk streaming.

---

## Tujuan

1. **Render pesan asisten dengan Markdown** (bukan plain text): list berpoin, **bold**, *italic*, heading, inline code, code block, link, tabel GFM.
2. **Streaming tetap jalan** — jangan ubah alur streaming atau struktur state pesan; hanya lapisan render.
3. **Normalisasi teks** — sebelum di-parse, teks asisten (streaming & history) dinormalisasi agar list dan line break konsisten.
4. **Tampilan nyaman** — line spacing tidak terlalu tinggi, bullet selalu terlihat, inline code terbaca.

---

## File Penting

- **`lib/markdown.ts`** — `normalizeMarkdown(text)`: aturan normalisasi (sync dengan backend bila ada).
- **`components/chat-message.tsx`** — Render pesan: user = plain text, assistant = `ReactMarkdown` atas `normalizeMarkdown(content)`.

---

## Aturan Normalisasi (`lib/markdown.ts`)

- **Blank line sebelum list (setelah colon):**  
  `:\n-` / `: -` → `:\n\n-`  
  `: *` → `:\n\n*`  
  Jangan ubah `:**Bold**` jadi list: pakai `:\s*\*(?!\*)` (single `*` saja).
- **Satu bullet per baris:**  
  - ` - ` → `\n- ` **hanya jika** setelah spasi ada huruf besar/angka: `\s+-\s+(?=[A-Z0-9])`.  
    Jangan pecah teks seperti "Google Cloud - jika relevan)" jadi dua bullet.
  - ` * ` (single asterisk) → `\n* `: pakai `\s+\*(?!\*)\s+` agar tidak memecah ` * **Bold**`.
- Jangan pakai `dangerouslySetInnerHTML`. Normalizer harus idempotent (aman dipanggil berulang).

---

## Komponen Chat (`components/chat-message.tsx`)

- **Dependencies:** `react-markdown`, `remark-gfm`, `remark-breaks`. Render asisten:  
  `<ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={markdownComponents}>{normalizeMarkdown(content)}</ReactMarkdown>`
- **User message:** tetap `content` plain dengan `whitespace-pre-wrap`; jangan lewatkan ke ReactMarkdown.
- **List (ul):** bullet pakai `::before` dengan `content: '•'` (bukan andalan `list-disc` saja), supaya bullet selalu terlihat meski ada reset CSS.
- **Spacing:** line-height rapat (mis. `leading-5`), margin kecil (mis. `my-1`), jarak antar item list kecil (mis. `space-y-0` + `py-0.5` pada `li`). Jangan pakai `my-3`/`leading-7` yang terlalu tinggi.
- **Custom components:** untuk `code` (inline vs block), `pre`, `p`, `ul`, `ol`, `li`, `strong`, `em`, `h1`–`h3`, `a`, tabel GFM; inline code pakai `font-mono` dan warna yang nyaman (mis. `bg-muted/80`).

---

## Yang Tidak Boleh Diubah

- Backend / endpoint streaming.
- Logika streaming (cara `setMessages` mengupdate `content`).
- Struktur state pesan (role, content). Hanya komponen yang me-render `content` yang boleh berubah.

---

## Nested List (Sub-list)

Agar ada **sub-list** di bawah judul (mis. "Konsep Dasar DevOps" lalu item CI/CD, IaC, dll. sebagai anak):

- **Backend** harus mengirim sub-item dengan **indentasi 2 spasi** sebelum `*`, contoh:  
  `  * CI/CD (...)`  
  `  * Infrastructure as Code (IaC)`  
  Bukan satu level flat: `* **Konsep Dasar DevOps:** * CI/CD * ...`
- Frontend tidak perlu mengubah normalizer untuk ini; cukup render Markdown standar (remark-gfm) dengan custom `ul`/`ol`/`li` di atas.

---

## Ringkasan Cek List

- [ ] Semua konten asisten di-render lewat `normalizeMarkdown(content)` lalu ReactMarkdown.
- [ ] Normalizer: " - " hanya jadi bullet jika diikuti `[A-Z0-9]`; " * " tidak memecah `**bold**`.
- [ ] List pakai bullet custom (•) agar selalu kelihatan; spacing rapat.
- [ ] Tidak ada `dangerouslySetInnerHTML`; tidak mengubah streaming/backend.
