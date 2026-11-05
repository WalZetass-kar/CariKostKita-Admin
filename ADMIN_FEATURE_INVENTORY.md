# ADMIN CARIKOSTKITA — FEATURE INVENTORY (KATALOG FITUR)

**Versi:** 1.0.0  
**Tanggal Audit:** 05 November 2026  
**Auditor:** Senior QA Engineer, Security Auditor & Full-Stack Analyst  
**Target:** Web Admin CariKostKita (`https://admin-carikostkita.vercel.app`) & Backend FastAPI (`https://api.carikostkita.my.id`)

---

## 1. Ringkasan Eksekutif & Struktur Modul

Platform Admin CariKostKita dibangun menggunakan **Next.js (App Router)** yang terhubung ke **FastAPI Backend (Python)** dan **Supabase PostgreSQL & Storage**. Terdapat 12 modul utama yang diatur dalam navigasi berbasis hak akses peran (*Role-Based Access Control*).

```
Admin-Gue/
├── app/
│   ├── login/                  # Halaman Login Admin
│   ├── api/auth/               # Otentikasi Next.js (login, me, logout)
│   ├── api/admin/              # API Proxy & Gateway (/api/admin/[...slug])
│   │   ├── upload-image/       # Upload Gambar CMS & Kost ke Vercel Blob
│   │   └── upload-apk/         # Upload APK Rilis Android ke Vercel Blob
├── components/
│   ├── AdminApp.jsx            # Shell aplikasi utama & Sidebar Navigation
│   ├── AppContext.jsx          # Context state global & data cache
│   ├── ui.jsx                  # Library komponen atomik (Table, Modal, Badge, dll)
│   └── views/                  # 12 Tampilan Modul Administratif
```

---

## 2. Matriks Hak Akses Berdasarkan Peran (RBAC Matrix)

Daftar peran yang didukung:
- `super_admin`: Akses penuh ke seluruh modul, manajemen staf admin, dan aksi destruktif permanen.
- `admin`: Manajemen operasional kost, pengguna, laporan, iklan, bulk import, dan CMS.
- `moderator`: Verifikasi kost, verifikasi KTP/dokumen pemilik, dan moderasi laporan pelanggaran.
- `marketing`: Manajemen kampanye iklan banner, CMS landing page, dan analitik telemetri.

| No | Modul / Menu ID | Label Menu | Super Admin | Admin | Moderator | Marketing |
|:---|:---|:---|:---:|:---:|:---:|:---:|
| 1 | `fastapi_overview` | Ringkasan Platform | ✅ | ✅ | ✅ | ✅ |
| 2 | `fastapi_kosts` | Manajemen Kost | ✅ | ✅ | ✅ | ❌ |
| 3 | `fastapi_bulk_import` | Import Data Kos (Excel/CSV) | ✅ | ✅ | ❌ | ❌ |
| 4 | `fastapi_owners` | Pemilik Kost (Mitra) | ✅ | ✅ | ✅ | ❌ |
| 5 | `verification` | Antrean Verifikasi Pemilik | ✅ | ✅ | ✅ | ❌ |
| 6 | `fastapi_users` | Manajemen Pengguna | ✅ | ✅ | ❌ | ❌ |
| 7 | `fastapi_reports` | Laporan Pelanggaran Kost | ✅ | ✅ | ✅ | ❌ |
| 8 | `fastapi_ads` | Manajemen Iklan | ✅ | ✅ | ❌ | ✅ |
| 9 | `landing_page` | Konten Landing Page CMS | ✅ | ✅ | ❌ | ✅ |
| 10 | `fastapi_analytics` | Analitik & Telemetri | ✅ | ✅ | ❌ | ✅ |
| 11 | `fastapi_activity_logs`| Audit Log Aktivitas | ✅ | ❌ | ❌ | ❌ |
| 12 | `settings` | Pengaturan Profil & Sistem | ✅ | ✅ | ❌ | ❌ |

---

## 3. Rincian Fitur Per Modul

### 3.1. Modul Otentikasi (`/login`, `/api/auth/*`)
- **Fitur:**
  - Form Login: Input email/username dan kata sandi.
  - Validasi Klien: Pencegahan submit form kosong.
  - Session Management: Penyimpanan JWT ke dalam HTTP-Only Cookie (`admin_session`) dengan durasi `SESSION_HOURS` (24 jam).
  - Auth Guard: Redirect otomatis ke `/login` jika sesi berakhir atau tidak berwenang (`401 Unauthorized`).
  - Proteksi Tombol Back: Pemeriksaan via `pageshow` listener pada `/api/auth/me`.

### 3.2. Modul Ringkasan (`fastapi_overview` / `FastApiOverviewView.jsx`)
- **Komponen Interaktif:**
  - 8 Kartu Metrik Utama: Total Kost, Kost Disetujui, Kost Pending, Total User, User Aktif, Pending Verifikasi Pemilik, Total Laporan, Laporan Baru.
  - Tombol Perbarui (*Refresh*) dengan animasi spinner.
  - Panel Aksi Cepat (*Quick Actions*): Tambah Kost, Tambah Iklan, Tambah Pengguna/Staf, Verifikasi Mitra, Tinjau Laporan.
- **Endpoint API:** `GET /api/admin/fastapi-overview` -> Backend: `GET /api/v1/admin/overview`.

### 3.3. Modul Manajemen Kost (`fastapi_kosts` / `FastApiKostsView.jsx`)
- **Operasi CRUD:**
  - **Create:** Modal `KostFormModal` (Tambah listing kost baru).
  - **Read:** Tabel listing properti dengan pagination (25 baris per halaman), pencarian nama kost, filter status verifikasi (`APPROVED`, `PENDING`, `REVISION_REQUIRED`, `REJECTED`).
  - **Update:**
    - Toggle Ketersediaan: `PATCH /api/admin/fastapi-kosts/:id/status` (`TERSEDIA` / `PENUH`).
    - Update Verifikasi: `PATCH /api/admin/fastapi-kosts/:id/status` (`APPROVED`, `REJECTED`, dll).
    - Bulk Verify: `POST /api/admin/fastapi-kosts/bulk-verify` (Verifikasi massal item terpilih atau semua yang pending).
  - **Delete:**
    - Hapus Tunggal: `DELETE /api/admin/fastapi-kosts/:id`.
    - Hapus Terpilih: `POST /api/admin/fastapi-kosts/bulk-delete` dengan array `kost_ids`.
    - Hapus Semua Katalog: `POST /api/admin/fastapi-kosts/bulk-delete` dengan `{ delete_all: true, confirm: true }`.

### 3.4. Modul Import Data Kos (`fastapi_bulk_import` / `FastApiBulkImportView.jsx`)
- **Fitur:**
  - Stepper Alur 3 Langkah: Upload File -> Pratinjau & Validasi -> Komit ke Database.
  - Unduh Template: Mendukung format `.xlsx` dan `.csv` via `GET /api/admin/fastapi-bulk-import/template`.
  - Preview & Validasi: `POST /api/admin/fastapi-bulk-import/preview` (validasi header kolom, format baris, duplikasi nama).
  - Opsi Duplikasi: Skip, Timpa (*Overwrite*), atau Batalkan jika duplikat ditemukan.
  - Komit Batch: `POST /api/admin/fastapi-bulk-import/commit`.

### 3.5. Modul Pemilik Kost (`fastapi_owners` / `FastApiOwnersView.jsx`)
- **Fitur:**
  - Direktori mitra pemilik dengan nomor kontak WhatsApp.
  - Tombol aksi langsung "Hubungi WhatsApp" (membuka `https://wa.me/...`).
  - Status Verifikasi Identitas Pemilik (`Pending`, `Verified`, `Rejected`).
  - Filter pencarian nama dan nomor telepon.
- **Endpoint API:** `GET /api/admin/fastapi-owners` -> Backend: `GET /api/v1/admin/users?role=owner`.

### 3.6. Modul Antrean Verifikasi Pemilik (`verification` / `OwnerVerificationQueueView.jsx`)
- **Fitur:**
  - 4 Tab Status: `PENDING` (Menunggu), `APPROVED` (Disetujui), `REVISION_REQUIRED` (Perlu Revisi), `REJECTED` (Ditolak).
  - Parser Dokumen Bukti Properti: Mendeteksi tag `[verifikasi-properti]` (Kode Verifikasi, Nama Kost, Alamat, WhatsApp, Foto Tampak Depan, Foto Kode Kertas, Foto Kamar).
  - Modal Keputusan Review: Form input catatan alasan wajib untuk penolakan dan revisi.
- **Endpoint API:**
  - List: `GET /api/admin/owner-verifications?status=...&page=...`.
  - Review: `PATCH /api/admin/owner-verifications/:id` dengan `{ status, review_note }`.

### 3.7. Modul Manajemen Pengguna (`fastapi_users` / `FastApiUsersView.jsx`)
- **Fitur:**
  - Tabel direktori pengguna platform (Pencari kost, Pemilik, Admin, Moderator).
  - Pencarian keyword nama/email dan filter status aktif.
  - Toggle Status Pengguna: Mengaktifkan atau menonaktifkan akun (`PATCH /api/admin/fastapi-users/:id`).
  - Modal Tambah Pengguna/Staf (`UserFormModal`): Pilihan role dinamis berdasarkan kewenangan Super Admin.

### 3.8. Modul Laporan Kost (`fastapi_reports` / `FastApiReportQueueView.jsx`)
- **Fitur:**
  - 4 Tab Aduan: `BARU`, `DITINJAU`, `SELESAI`, `DITOLAK`.
  - Metadata Aduan: Kategori pelanggaran, identitas pelapor, target kos yang dilaporkan, tanggal kejadian.
  - Aksi Moderasi: Dialog tindak lanjut dengan catatan tindakan admin (`admin_action`).
- **Endpoint API:**
  - List: `GET /api/admin/fastapi-reports?status=...`.
  - Mutasi: `PATCH /api/admin/fastapi-reports/:id`.

### 3.9. Modul Manajemen Iklan (`fastapi_ads` / `FastApiAdsView.jsx`)
- **Fitur:**
  - Inventaris iklan banner dan slot promosi.
  - Modal Tambah Iklan (`AdFormModal`): Judul, link tujuan, tipe, posisi, target platform (Website/Android), tanggal tayang.
  - Filter status aktif/nonaktif iklan.
- **Endpoint API:** `GET /api/admin/fastapi-ads` -> Backend: `GET /api/v1/admin/ads`.

### 3.10. Modul CMS Landing Page (`landing_page` / `LandingPageManagerView.jsx`)
- **Fitur:**
  - Editor Konten Lengkap: Bagian Hero, Fitur Unggulan, Testimoni, FAQ, Footer, Metadata SEO.
  - Manajemen Brand Color Token (Hex Color Picker dengan kontras WCAG validator).
  - Upload Gambar Terpadu: Otomatis memindahkan Base64 inline menjadi link permanen Vercel Blob via `materializeInlineSettingsImages`.
- **Endpoint API:** `GET /api/admin/settings/landing` dan `PATCH /api/admin/settings/landing`.

### 3.11. Modul Analitik & Telemetri (`fastapi_analytics` / `FastApiAnalyticsView.jsx`)
- **Fitur:**
  - Visualisasi metrik interaksi (Pencarian, Tampilan Detail Kost, Klik WhatsApp, Bookmark).
  - Selector rentang waktu: Harian, Mingguan, Bulanan.
  - Distribusi status kost dan pertumbuhan pengguna.
- **Endpoint API:** `GET /api/admin/fastapi-analytics`.

### 3.12. Modul Audit Log Aktivitas (`fastapi_activity_logs` / `FastApiActivityLogsView.jsx`)
- **Fitur:**
  - Tabel catatan kronologis seluruh operasi staf administratif.
  - Kolom: Waktu (*timestamp*), Aktor (*Actor Name*), Tipe Aksi (*Action Type*), Deskripsi, Target Entitas.
  - Paginasi 100 log per halaman.
- **Endpoint API:** `GET /api/admin/fastapi-activity-logs` -> Backend: `GET /api/v1/admin/activity-logs`.

### 3.13. Modul Pengaturan (`settings` / `SettingsView.jsx`)
- **Fitur:**
  - Tab Profil: Nama, email (read-only), nomor telepon, avatar.
  - Tab Kata Sandi: Validasi kata sandi lama, kata sandi baru (minimal 8 karakter), dan konfirmasi.
  - Tab Konfigurasi Sistem: Pengaturan nama aplikasi, kontak bantuan, maintenance mode.
  - Tab Manajemen Staf Admin: Daftar staf, tambah staf baru, pencabutan sesi aktif pada perangkat lain (*Revoke Other Sessions*).

### 3.14. Fitur & Komponen Lintas-Aplikasi (Cross-App Components)
1. **Pencarian Global (`GlobalSearchModal` - `Ctrl+K`):**
   - Modal pencarian cepat lintas entitas (Kost, Pemilik, Pengguna, Laporan).
   - Menghubungi `GET /api/admin/global-search?q=...`.
2. **Pusat Notifikasi (`NotificationCenterDropdown`):**
   - Ikon lonceng pada header dengan badge jumlah unread.
   - Filter notifikasi: Semua vs Belum Dibaca.
   - Tombol "Tandai Semua Telah Dibaca".
3. **Ekspor Data (`jspdf`, `jspdf-autotable`, `xlsx`):**
   - Fitur ekspor laporan tabel ke format PDF dan Excel di sisi browser.
