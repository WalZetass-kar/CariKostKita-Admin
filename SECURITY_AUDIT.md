# ADMIN CARIKOSTKITA — APPLICATION SECURITY AUDIT

**Versi:** 1.0.0  
**Tanggal Audit:** 05 November 2026  
**Auditor:** Application Security Auditor & Senior QA Engineer  
**Target:** Web Admin CariKostKita (`https://admin-carikostkita.vercel.app`) & Backend FastAPI (`https://api.carikostkita.my.id`)

---

## 1. Ringkasan Eksekutif Postur Keamanan

Audit keamanan menyeluruh dilakukan terhadap aspek arsitektur autentikasi, manajemen sesi, penegakan kontrol akses berbasis peran (RBAC), integritas data, validasi upload file, dan ketahanan terhadap kerentanan OWASP Top 10.

Secara umum, postur keamanan aplikasi menunjukkan **fondasi yang sangat baik** dalam manajemen sesi berbasis HTTP-Only cookie dan proteksi injeksi SQL via PostgREST. Namun, terdapat celah pemisahan tanggung jawab pada rute proxy mutasi yang berpotensi mem-bypass otorisasi backend jika tidak diselaraskan.

```
┌─────────────────────────────────┬──────────┬───────────────────────────────────────┐
│ Domain Pengujian Keamanan       │ Status   │ Catatan Evaluasi                      │
├─────────────────────────────────┼──────────┼───────────────────────────────────────┤
│ Autentikasi & Cookie Management │ AMAN     │ HttpOnly, SameSite=lax, Secure prod   │
│ Role-Based Access Control (RBAC)│ WASPADA  │ Validasi level UI & Next.js; cek API  │
│ SQL Injection & Data Tampering  │ AMAN     │ PostgREST parameterized + Pydantic    │
│ Sanitasi & Validasi Input       │ AMAN     │ Validasi tipe ketat di Pydantic & UI  │
│ Keamanan Upload Berkas          │ BAIK     │ MIME & ekstensi dicek; batas ukuran   │
│ Proteksi Kebocoran Kredensial   │ SANGAT   │ Password di-hash bcrypt, token masked │
└─────────────────────────────────┴──────────┴───────────────────────────────────────┘
```

---

## 2. Analisis Rinci Parameter Keamanan

### 2.1. Manajemen Sesi & Autentikasi
- **Penyimpanan Sesi:** Sesi admin tidak disimpan di `localStorage` atau `sessionStorage` browser (mencegah pencurian token via serangan Cross-Site Scripting / XSS). Sesi disimpan menggunakan cookie terenkripsi HTTP-Only dengan nama `admin_session`.
  ```javascript
  // lib/auth.js:56
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_HOURS * 3600 // 24 Jam
  });
  ```
- **Session Revocation:** Endpoint `POST /api/admin/sessions/revoke-others` tersedia dan terhubung ke backend FastAPI `/api/v1/auth/revoke-others`, memungkinkan admin mencabut sesi pada perangkat lain jika terjadi indikasi kompromi akun.
- **Proteksi Tombol Kembali (Cache Poisoning / History Sniffing):**
  Event listener `pageshow` pada `AdminApp.jsx:194` melakukan ping ke `/api/auth/me`. Jika respon `401 Unauthorized`, browser langsung mengeksekusi `window.location.replace("/login?expired=1")`, memastikan halaman administratif sensitif tidak tertinggal di cache browser publik.

### 2.2. Role-Based Access Control (RBAC)
- **Frontend Masking:** Navigasi disaring melalui `ROLE_MENUS` di `lib/constants.js`. Role `moderator` hanya melihat Overview, Kosts, Owners, Verification, dan Reports. Role `marketing` hanya melihat Overview, Ads, Landing Page, dan Analytics.
- **Next.js Proxy Enforcement:** Pada `app/api/admin/[...slug]/route.js`, setiap rute dilindungi array kewenangan peran:
  ```javascript
  ["POST", "fastapi-bulk-import/preview", ..., ["super_admin", "admin"]],
  ["PATCH", "owner-verifications/:id", ..., ["super_admin", "admin", "moderator"]],
  ["POST", "ads", ..., ["super_admin", "marketing"]],
  ```
- **Backend FastAPI Enforcement:** Router admin di FastAPI (`app/admin_auth.py`) memvalidasi klaim token JWT terhadap tabel `users` dan fungsi RLS `public.is_app_staff()`. Permintaan dengan token non-staf otomatis ditolak dengan `403 Forbidden`.

### 2.3. Proteksi Terhadap Injeksi SQL (SQLi)
- **FastAPI / Supabase PostgREST:** Seluruh interaksi database dilakukan melalui klien Supabase Python (`context.database.table(...)`) atau prosedur tersimpan (*RPC*) seperti `review_owner_verification_application`. Seluruh parameter dikirim dalam bentuk nilai terparameterisasi (*parameterized queries*), sehingga injeksi SQL klasik via form input string sepenuhnya termitigasi.

### 2.4. Validasi Upload Berkas & Integritas Storage
- **Upload Gambar (`upload-image/route.js`):**
  - Pembatasan ekstensi ketat: `.png`, `.jpg`, `.jpeg`, `.webp`, `.svg`.
  - Pembatasan ukuran maksimum: 4 MB.
  - Gambar disimpan di Vercel Blob (object storage terisolasi), bukan di filesystem server, mencegah eksekusi Remote Code Execution (RCE) via web shell.
- **Upload APK Android (`upload-apk/route.js`):**
  - Validasi MIME: `application/vnd.android.package-archive`.
  - Sanitasi nama rilis menggunakan regex: `[^0-9A-Za-z._-]`.

### 2.5. Kerahasiaan Kredensial & Log Masking
- **Penyimpanan Password:** Kata sandi pengguna dan staf di database di-hash menggunakan algoritma modern (bcrypt / Argon2 melalui Supabase Auth).
- **Respon API:** Respon endpoint login `/api/v1/admin/auth/login` dan `/api/auth/login` tidak pernah menyertakan `password_hash` atau salt ke payload JSON klien (menggunakan sanitizer helper `publicAdmin`).
- **Pemberitahuan Audit:** Sesuai aturan operasional, seluruh token JWT dan kredensial pengujian di-mask (`********`) dalam seluruh laporan audit.

---

## 3. Temuan Risiko Keamanan & Mitigasi

### [SEC-001] Risiko Silo Data pada Rute Ephemeral Fallback
- **Tingkat Keparahan:** Medium
- **Deskripsi:** Mekanisme `write(auth, fn, proxyTarget)` pada `route.js` memiliki fallback: jika backend FastAPI mengembalikan 404, rute akan secara diam-diam menulis ke file lokal `db.json`. Ini membuka celah inkonsistensi: staf mengira operasi administratif mereka valid dan terotorisasi di server, padahal hanya termutasi di filesystem lokal serverless yang bersifat sementara (*ephemeral*).
- **Rekomendasi:** Matikan fallback ke `db.json` pada mode produksi (`NODE_ENV === 'production'`). Jika backend menolak atau rute belum ada, lemparkan error eksplisit `501 Not Implemented` atau `502 Bad Gateway` agar anomali terdeteksi segera.

### [SEC-002] Content Security Policy (CSP) & CORS Header Tuning
- **Tingkat Keparahan:** Low
- **Deskripsi:** Header `Content-Security-Policy` belum dikonfigurasi secara eksplisit pada `next.config.mjs` untuk membatasi domain asal skrip eksternal dan koneksi WebSocket realtime.
- **Rekomendasi:** Tambahkan header security pada `next.config.mjs`:
  ```javascript
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ],
    },
  ],
  ```
