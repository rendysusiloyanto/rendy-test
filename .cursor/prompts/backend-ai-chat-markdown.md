# Cursor Prompt — Backend AI Chat (Streaming + Markdown)

Gunakan prompt ini saat mengerjakan **backend** untuk fitur AI chat (streaming response, simpan history, normalisasi Markdown). Tujuannya: format output selaras dengan frontend agar list, bold, dan line break tampil rapi.

---

## Konteks Frontend

- Frontend (v0-frontend) merender pesan asisten dengan **ReactMarkdown** atas teks yang sudah dinormalisasi (`normalizeMarkdown(content)`).
- Frontend punya normalizer di `lib/markdown.ts` dengan aturan: blank line sebelum list setelah colon, satu bullet per baris, dan **tidak** memecah "X - jika relevan" atau " * **Bold**".
- Agar tampilan konsisten, backend sebaiknya **menyimpan dan meng-stream teks yang sudah mengikuti konvensi yang sama**.

---

## Format Streaming Response

- Tetap gunakan format yang sudah ada, misalnya:
  - `data: {"delta": "chunk teks di sini"}`
  - `data: {"done": true, "remaining_today": N}` (atau field lain sesuai API)
- Setiap `delta` adalah **plain text** (bukan HTML). Frontend akan menggabungkan delta lalu memakai normalizer + ReactMarkdown.

---

## Aturan Output Markdown (agar frontend render benar)

1. **List setelah intro**
   - Setelah kalimat yang diakhiri colon (mis. "Here's how it works:" atau "Berikut fungsinya:"), **wajib** ada baris kosong lalu bullet:
   - Contoh benar: `...overview:\n\n* Item pertama\n* Item kedua`
   - Jangan: `...overview: * Item pertama` (tanpa newline sebelum `*`).

2. **Satu bullet per baris**
   - Setiap item list harus diawali `* ` atau `- ` di **awal baris** (setelah newline).
   - Contoh benar: `* CI/CD (...)\n* Infrastructure as Code\n* Containerization`
   - Saat stream, boleh kirim `* Item A` di satu delta dan `* Item B` di delta berikutnya; yang penting saat digabung terbentuk pola `...\n* Item A ... * Item B`.

3. **Jangan pecah frasa dengan " - " sebagai bullet**
   - Teks seperti "Cloud Platforms (AWS, Azure, Google Cloud - jika relevan)" **jangan** di-stream sehingga " - " di tengah dianggap bullet. Frontend hanya menganggap " - " sebagai bullet jika diikuti huruf besar/angka.
   - Aman: gunakan "–" (en-dash) atau "jika relevan" tanpa strip di tengah, atau pastikan setelah " - " huruf besar (mis. " - Item").

4. **Bold**
   - Gunakan `**teks**` untuk bold. Jangan sampai ada spasi antara `*` list dan `**` bold, misalnya: `* **Judul:** penjelasan` (satu item list dengan bold di dalamnya) — itu valid.

5. **Nested list (sub-list)**
   - Agar "Konsep Dasar DevOps" punya anak (CI/CD, IaC, dll.) sebagai **sub-list**, kirim sub-item dengan **indentasi 2 spasi** sebelum `*`:
   - Contoh:
     ```
     * **Konsep Dasar DevOps:**
       * CI/CD (Continuous Integration/Continuous Delivery)
       * Infrastructure as Code (IaC)
       * Containerization (Docker, Kubernetes)
       * Monitoring dan Logging
     * **Tools dan Teknologi:**
       * Version Control (Git)
       * Cloud Platforms (AWS, Azure, Google Cloud jika relevan)
     ```
   - Dalam stream, kirim literal `  * ` (2 spasi + asterisk + spasi) untuk sub-item.

---

## Normalisasi di Backend (opsional tapi disarankan)

Jika ada modul normalisasi (mis. `app/utils/markdown.py`), **sinkronkan** dengan frontend:

- Setelah colon, tambah newline sebelum bullet: `:\n-` / `: -` → `:\n\n-`, dan `: *` (single asterisk) → `:\n\n*`.
- " - " → newline + "- " **hanya jika** karakter setelah spasi adalah huruf besar atau angka (jangan ubah "X - jika relevan").
- " * " (satu asterisk, bukan "**") → newline + "* ".
- Simpan ke DB/Redis **setelah** normalisasi agar response dari history juga rapi saat di-render frontend.

Contoh aturan (Python-style regex, sesuaikan dengan bahasa backend):

- `:\s*\n?\s*-` → `:\n\n-`
- `:\s*\*(?!\*)` → `:\n\n*`  (single `*` saja)
- `\s+-\s+(?=[A-Z0-9])` → `\n- `  (spasi-strip-spasi hanya jika diikuti A-Z atau 0-9)
- `\s+\*(?!\*)\s+` → `\n* `  (spasi-asterisk-spasi, asterisk bukan double)

---

## Checklist Backend

- [ ] Streaming mengirim teks plain per `delta`; tidak mengubah format endpoint yang dipakai frontend.
- [ ] Setelah intro dengan colon, list pakai newline lalu `* ` atau `- `.
- [ ] Setiap item list di awalan baris (newline + bullet); tidak ada " - " di tengah frasa yang salah (mis. "X - jika relevan").
- [ ] Nested list: sub-item dikirim dengan **2 spasi** sebelum `* `.
- [ ] Jika ada normalizer, aturannya sync dengan frontend (`lib/markdown.ts`); simpan ke DB/Redis setelah normalisasi.

---

## Referensi Frontend

- Normalizer: `v0-frontend/lib/markdown.ts` — `normalizeMarkdown(text)`
- Render: `v0-frontend/components/chat-message.tsx` — ReactMarkdown + custom components
- Prompt frontend: `.cursor/prompts/ai-chat-markdown.md` (di repo frontend)
