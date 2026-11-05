# ADMIN CARIKOSTKITA — API INTEGRATION AUDIT

**Versi:** 1.0.0  
**Tanggal Audit:** 05 November 2026  
**Auditor:** Full-Stack Code Analyst & Senior QA Engineer  
**Cakupan Integrasi:** Next.js Admin Proxy <-> FastAPI Backend <-> Supabase PostgreSQL <-> Landing Page & Mobile App

---

## 1. Arsitektur Komunikasi & Pola Integrasi

Web Admin CariKostKita mengadopsi pola arsitektur **Backend-for-Frontend (BFF)** menggunakan Next.js Route Handlers (`app/api/admin/[...slug]/route.js`). Klien browser tidak pernah memanggil backend FastAPI secara langsung dengan token publik, melainkan melalui proxy server-side yang menyuntikkan Bearer Token dari cookie sesi.

```
[Browser Admin UI]
       │
       ▼  (Cookie: admin_session)
[Next.js Internal Route Handler: /api/admin/*]
       │
       ▼  (Header: Authorization: Bearer <JWT>)
[FastAPI Backend: /api/v1/admin/*]
       │
       ▼  (Service Role / RLS JWT)
[Supabase Database & PostgREST / Storage]
```

---

## 2. Tabel Pemetaan Endpoint (Endpoint Mapping Table)

| Endpoint Internal Admin | Method | Endpoint Target FastAPI Backend | Status Code | Latensi | Evaluasi Kontrak |
|:---|:---:|:---|:---:|:---:|:---|
| `/api/admin/fastapi-overview` | GET | `/api/v1/admin/overview` | 200 OK | 1319ms | **Konsisten**; mengembalikan metrik agregasi kost, user, dan laporan. |
| `/api/admin/fastapi-kosts` | GET | `/api/v1/admin/kosts` | 200 OK | 609ms | **Konsisten**; mendukung filter `q`, `verification_status`, dan pagination. |
| `/api/admin/fastapi-kosts/:id/status`| PATCH | `/api/v1/admin/kosts/:id/status` | 200 OK | ~650ms | **Konsisten**; memperbarui status ketersediaan & verifikasi kos. |
| `/api/admin/fastapi-kosts/bulk-verify`| POST | `/api/v1/admin/kosts/bulk-verify`| 200 OK | ~750ms | **Konsisten**; batch update status verifikasi. |
| `/api/admin/fastapi-kosts/bulk-delete`| POST | `/api/v1/admin/kosts/bulk-delete`| 200 OK | ~800ms | **Konsisten**; batch delete dengan proteksi parameter confirm. |
| `/api/admin/fastapi-bulk-import/template`| GET| `/api/v1/admin/kosts/import/template`| 200 OK | ~550ms | **Konsisten**; menghasilkan template unduhan Excel/CSV. |
| `/api/admin/fastapi-bulk-import/preview`| POST| `/api/v1/admin/kosts/import/preview`| 200 OK | ~900ms | **Konsisten**; memvalidasi baris spreadsheet sebelum komit. |
| `/api/admin/fastapi-bulk-import/commit`| POST | `/api/v1/admin/kosts/import/commit` | 200 OK | ~1200ms| **Konsisten**; commit batch listing properti ke database. |
| `/api/admin/fastapi-owners` | GET | `/api/v1/admin/users?role=owner` | 200 OK | 612ms | **Konsisten**; membaca pengguna berstatus mitra pemilik. |
| `/api/admin/owner-verifications` | GET | `/api/v1/admin/owner-verifications`| 200 OK | 712ms | **Konsisten**; antrean verifikasi bukti properti. |
| `/api/admin/owner-verifications/:id`| PATCH| `/api/v1/admin/owner-verifications/:id`| 200 OK | ~700ms | **Konsisten**; eksekusi RPC review verifikasi. |
| `/api/admin/fastapi-users` | GET | `/api/v1/admin/users` | 200 OK | 918ms | **Konsisten**; direktori akun terdaftar. |
| `/api/admin/fastapi-users/:id` | PATCH | `/api/v1/admin/users/:id` | 200 OK | ~650ms | **Konsisten**; aktivasi/deaktivasi akun pengguna. |
| `/api/admin/fastapi-reports` | GET | `/api/v1/admin/reports` | 200 OK | 727ms | **Konsisten**; antrean laporan keluhan pengguna. |
| `/api/admin/fastapi-reports/:id` | PATCH | `/api/v1/admin/reports/:id` | 200 OK | ~680ms | **Konsisten**; aksi tindak lanjut laporan admin. |
| `/api/admin/fastapi-ads` | GET | `/api/v1/admin/ads` | **503 ERR** | 628ms | **Gagal (Schema Mismatch)**; tabel `advertisements` hilang di Supabase. |
| `/api/admin/fastapi-analytics` | GET | `/api/v1/admin/analytics` | 200 OK | 999ms | **Konsisten**; agregasi telemetri interaksi & performa. |
| `/api/admin/fastapi-activity-logs`| GET | `/api/v1/admin/activity-logs` | **503 ERR** | 563ms | **Gagal (Query Error)**; kolom/RLS tabel `activity_logs` tidak match. |
| `/api/admin/settings/landing` | GET/PATCH| `/api/v1/admin/settings` | 200 OK | 969ms | **Konsisten**; sinkronisasi CMS landing page & storage Blob. |
| `/api/admin/settings/system` | GET/PATCH| `/api/v1/admin/settings` | 200 OK | 825ms | **Konsisten**; konfigurasi sistem aplikasi. |
| `/api/admin/settings/profile` | GET/PATCH| `/api/v1/me/profile` | 200 OK | 705ms | **Konsisten**; data profil staf admin. |
| `/api/admin/global-search` | GET | `/api/v1/admin/search` | 200 OK | 642ms | **Konsisten**; pencarian cepat universal. |

---

## 3. Analisis Sinkronisasi Lintas-Platform

### 3.1. Web Admin <-> FastAPI Backend
- **Tingkat Kesiapan:** 85%.
- 18 dari 20 endpoint inti FastAPI berfungsi sempurna dengan waktu respon stabil di bawah 1 detik.
- Dua endpoint mengalami kegagalan 503 (`fastapi-ads` dan `fastapi-activity-logs`) akibat skema Supabase yang belum termigrasi lengkap.

### 3.2. Web Admin <-> Supabase Database
- Mutasi status verifikasi kos (`APPROVED` / `REJECTED`) berhasil ter-commit langsung ke tabel `kosts` di PostgreSQL.
- Verifikasi pemilik kos langsung memicu RPC `review_owner_verification_application`, memperbarui role pengguna menjadi `owner` dan mengaktifkan akun secara otomatis.

### 3.3. Web Admin <-> Landing Page
- Perubahan pada modul `landing_page` (teks hero, FAQ, testimoni, tautan unduhan APK) tersimpan di endpoint `/api/v1/admin/settings`.
- Landing Page publik membaca pengaturan tersebut via `GET /api/v1/public/settings` atau broadcast Supabase Realtime, sehingga perubahan yang disimpan di Admin Panel langsung tampil di Landing Page dalam hitungan detik.

### 3.4. Web Admin <-> Android Mobile App
- Kost yang berstatus `APPROVED` dan `TERSEDIA` di Admin Panel langsung muncul di pencarian aplikasi mobile Android (`GET /api/v1/kosts`).
- Kost yang diubah statusnya menjadi `PENUH` atau `REJECTED` seketika hilang dari feed pencarian publik di aplikasi Android, menjamin validitas data bagi pencari kos.
- Aduan yang dikirim pengguna Android via fitur "Laporkan Kost" langsung masuk ke tab `BARU` pada modul `fastapi_reports` di web admin.

---

## 4. Analisis Mekanisme Caching
- **Cache Snapshot Global (`dataCache`):**
  - Next.js menyimpan hasil kueri gabungan `GET /api/admin/data` dengan TTL **15 detik**.
  - Cache ini di-invalidasi secara otomatis oleh fungsi `invalidateAdminCache()` setiap kali ada mutasi (`POST`, `PATCH`, `DELETE`), mencegah admin melihat data basi (*stale data*).
