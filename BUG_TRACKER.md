# ADMIN CARIKOSTKITA — BUG TRACKER (DAFTAR TEMUAN BUG)

**Versi:** 1.0.0  
**Tanggal Pelaporan:** 05 November 2026  
**Standar Pelaporan:** P0 (Critical), P1 (High), P2 (Medium), P3 (Low)  
**Total Bug Teridentifikasi:** 10 Temuan

---

## Ringkasan Distribusi Bug Berdasarkan Prioritas

```
┌──────────────┬───────┬────────────────────────────────────────────────────────┐
│ Prioritas    │ Total │ Deskripsi Dampak                                       │
├──────────────┼───────┼────────────────────────────────────────────────────────┤
│ P0 Critical  │   1   │ Sistem/fitur lumpuh total tanpa alternatif (503 error) │
│ P1 High      │   4   │ Fitur inti gagal, data tidak persisten ke database     │
│ P2 Medium    │   4   │ Penanganan error buruk, layout mobile cacat, limitasi  │
│ P3 Low       │   1   │ Code smell, dead legacy code & file mock               │
└──────────────┴───────┴────────────────────────────────────────────────────────┘
```

---

## Rincian Tiket Bug

### [BUG-001] Manajemen Iklan (FastAPI Ads) Gagal Dimuat (HTTP 503 Service Unavailable)
- **Prioritas:** P0 (Critical)
- **Modul / Fitur:** Pemasaran — Manajemen Iklan (`fastapi_ads` / `FastApiAdsView.jsx`)
- **Lokasi Kode:** `app/admin_ads.py:30` (FastAPI Backend) & `Admin-Gue/components/views/FastApiAdsView.jsx:43`
- **Langkah Reproduksi:**
  1. Login ke web admin dengan kredensial Super Admin atau Marketing.
  2. Buka menu navigasi "Manajemen Iklan" (`/#fastapi_ads`).
  3. Perhatikan layar antarmuka dan panel jaringan (Network Tab).
- **Expected Result:** Tabel inventaris iklan muncul dengan status 200 OK.
- **Actual Result:** Server mengembalikan HTTP 503 dengan payload `{"error":"Advertisement data is temporarily unavailable."}`. Layar menampilkan ErrorState merah.
- **Bukti / Evidence:**
  ```json
  [503 ERR] GET /api/admin/fastapi-ads (628ms)
  {"error":"Advertisement data is temporarily unavailable.","fields":null}
  ```
- **Dampak (Impact):** Staf Marketing dan Admin tidak dapat melihat atau memantau kampanye iklan di aplikasi mobile maupun website.
- **Akar Masalah (Root Cause):** Backend FastAPI menjalankan kueri `context.database.table("advertisements")`, tetapi tabel `advertisements` belum dibuat di skema database Supabase publik (`supabase_all_migrations_fastapi.sql` tidak memuat tabel ini).
- **Rekomendasi Solusi:** Buat migrasi SQL untuk tabel `public.advertisements` lengkap dengan kolom `(id, title, image_url, target_url, start_date, end_date, is_active, impressions, clicks, created_at, updated_at)` dan atur kebijakan RLS untuk staf.

---

### [BUG-002] Penambahan & Pengeditan Iklan Hanya Tersimpan di File Lokal (Ephemeral db.json)
- **Prioritas:** P1 (High)
- **Modul / Fitur:** Pemasaran — Form Tambah/Edit Iklan (`AdFormModal` / `AdsView.jsx`)
- **Lokasi Kode:** `Admin-Gue/app/api/admin/[...slug]/route.js:754` & `Admin-Gue/components/views/AdsView.jsx:162`
- **Langkah Reproduksi:**
  1. Buka modal "Tambah Iklan".
  2. Lengkapi formulir iklan dan klik "Simpan".
  3. Halaman melakukan reload atau aplikasi di-restart di Vercel.
- **Expected Result:** Data iklan tersimpan secara permanen ke Supabase PostgreSQL melalui FastAPI.
- **Actual Result:** Route proxy di Next.js memanggil `{ method: 'POST', path: '/admin/ads' }` (tanpa prefix `/api/v1`). Backend FastAPI mengembalikan 404, lalu Next.js secara diam-diam (*silent fallback*) menyimpan iklan ke file lokal `data/db.json` di server Vercel. Ketika instance serverless mati (*cold start*), data hilang permanen.
- **Dampak (Impact):** Kehilangan data iklan; staf merasa berhasil menambah iklan padahal data tidak masuk ke database riil.
- **Rekomendasi Solusi:** Implementasikan endpoint `POST`, `PATCH`, dan `DELETE` pada `app/admin_ads.py` di backend FastAPI, dan arahkan rute Next.js ke `/api/v1/admin/ads`.

---

### [BUG-003] Audit Log Aktivitas Gagal Dimuat (HTTP 503 Service Unavailable)
- **Prioritas:** P1 (High)
- **Modul / Fitur:** Keamanan — Audit Log Aktivitas (`fastapi_activity_logs` / `FastApiActivityLogsView.jsx`)
- **Lokasi Kode:** `app/activity_logs.py:131` & `Admin-Gue/components/views/FastApiActivityLogsView.jsx:31`
- **Langkah Reproduksi:**
  1. Login sebagai Super Admin.
  2. Buka menu "Audit Log" (`/#fastapi_activity_logs`).
- **Expected Result:** Riwayat aktivitas staf administratif termuat dalam tabel (HTTP 200).
- **Actual Result:** Server mengembalikan HTTP 503 dengan payload `{"error":"Activity log service is temporarily unavailable."}`.
- **Bukti / Evidence:**
  ```json
  [503 ERR] GET /api/admin/fastapi-activity-logs (563ms)
  {"error":"Activity log service is temporarily unavailable.","fields":null}
  ```
- **Dampak (Impact):** Transparansi sistem terganggu; Super Admin tidak dapat memeriksa jejak audit staf dan mendeteksi aktivitas mencurigakan.
- **Akar Masalah (Root Cause):** Kueri PostgREST `context.database.table("activity_logs").select(...)` gagal dieksekusi di database produksi, kemungkinan akibat ketidaksesuaian nama kolom (`actor_name`, `target_type`, `target_id`) atau kegagalan fungsi pembantu RLS `public.is_app_staff()`.
- **Rekomendasi Solusi:** Jalankan verifikasi schema pada tabel `public.activity_logs` di Supabase produksi dan pastikan fungsi RLS `public.is_app_staff()` mengenali role JWT Super Admin.

---

### [BUG-004] Dropdown Pemilik Kos Kosong Permanen pada Form Tambah Kost
- **Prioritas:** P1 (High)
- **Modul / Fitur:** Properti — Form Tambah Kost (`KostFormModal` / `KostView.jsx`)
- **Lokasi Kode:** `Admin-Gue/components/views/KostView.jsx:61-62` & `Admin-Gue/app/api/admin/[...slug]/route.js:642-669`
- **Langkah Reproduksi:**
  1. Masuk ke halaman "Manajemen Kost" (`/#fastapi_kosts`).
  2. Klik tombol "Tambah Kost".
  3. Buka dropdown "Pemilik".
- **Expected Result:** Dropdown menampilkan daftar nama pemilik kost yang berstatus terverifikasi.
- **Actual Result:** Dropdown kosong melompong (hanya teks placeholder). Muncul petunjuk "Belum ada pemilik terverifikasi. Silakan verifikasi pemilik terlebih dahulu." padahal mitra pemilik terverifikasi ada di sistem.
- **Bukti / Evidence:**
  Inspeksi kode `KostView.jsx:61`:
  `const eligible = (data?.owners || []).filter((o) => o.verificationStatus === "Verified" ...);`
  Endpoint `GET /api/admin/data` di `route.js:642` mengembalikan objek tanpa properti `owners`, sehingga `data?.owners` bernilai `undefined`.
- **Dampak (Impact):** Admin sama sekali tidak bisa menambahkan listing kost baru melalui tombol Tambah Kost di antarmuka.
- **Rekomendasi Solusi:** Sertakan data mitra pemilik pada payload `GET /api/admin/data` atau ubah `KostFormModal` untuk mengambil opsi pemilik langsung dari endpoint `GET /api/admin/fastapi-owners`.

---

### [BUG-005] Penambahan Kost Baru Menggunakan Mock Lokal dan Tidak Terkoneksi ke PostgreSQL
- **Prioritas:** P1 (High)
- **Modul / Fitur:** Properti — Tambah Listing Kost (`app/api/admin/[...slug]/route.js:702`)
- **Lokasi Kode:** `Admin-Gue/app/api/admin/[...slug]/route.js:702`
- **Langkah Reproduksi:**
  1. Lakukan mutasi `POST /api/admin/kosts` dengan payload data kost.
  2. Periksa apakah baris baru muncul di database Supabase atau di `FastApiKostsView`.
- **Expected Result:** Data tersimpan ke PostgreSQL Supabase melalui FastAPI.
- **Actual Result:** Route definition `["POST", "kosts", ...]` hanya memanggil `svc.createKost(db, auth.admin, body)` yang menulis ke file lokal `db.json`. Tidak ada parameter `proxyTarget` yang mengarah ke FastAPI. Listing kos baru tidak pernah muncul di `FastApiKostsView` dan tidak terlihat di aplikasi Android.
- **Dampak (Impact):** Inkonsistensi data parah; kost yang diinput admin tidak pernah sampai ke database produksi.
- **Rekomendasi Solusi:** Sambungkan `POST /api/admin/kosts` ke endpoint backend FastAPI `POST /api/v1/admin/kosts` (atau gunakan fitur `fastapi_bulk_import` sebagai rujukan arsitektur mutasi langsung).

---

### [BUG-006] Pusat Notifikasi (Notification Center) Selalu Kosong
- **Prioritas:** P2 (Medium)
- **Modul / Fitur:** Global Header — Dropdown Notifikasi (`NotificationCenterDropdown`)
- **Lokasi Kode:** `Admin-Gue/components/AdminApp.jsx:268` & `Admin-Gue/app/api/admin/[...slug]/route.js:642`
- **Langkah Reproduksi:**
  1. Klik ikon lonceng pada header navigasi.
- **Expected Result:** Muncul daftar notifikasi sistem, laporan baru, atau pengajuan verifikasi yang belum dibaca.
- **Actual Result:** Dropdown selalu menampilkan status "Belum ada notifikasi" karena array `data?.notifications` tidak pernah disediakan oleh endpoint `api("data")`.
- **Dampak (Impact):** Fitur notifikasi tidak memberikan nilai tambah (*dead feature*) bagi staf operasional.
- **Rekomendasi Solusi:** Buat endpoint terdedikasi `GET /api/admin/notifications` yang mengumpulkan aduan baru dan verifikasi pending secara real-time.

---

### [BUG-007] Tombol Menu Hamburger Mobile Tertutup / Tidak Ditemukan pada Layar Sempit (<640px)
- **Prioritas:** P2 (Medium)
- **Modul / Fitur:** UI/UX — Responsivitas Mobile Header (`AdminApp.jsx`)
- **Lokasi Kode:** `Admin-Gue/components/AdminApp.jsx:450-480`
- **Langkah Reproduksi:**
  1. Buka website admin dengan resolusi ponsel (misal iPhone viewport 375x812).
  2. Cari tombol pembuka menu samping (drawer hamburger).
- **Expected Result:** Ikon hamburger menu terlihat jelas di pojok kiri atas untuk membuka drawer menu navigasi.
- **Actual Result:** Ikon burger tidak terdeteksi atau tertumpuk dengan elemen judul panel, menyebabkan pengguna mobile terisolasi di halaman yang sedang aktif.
- **Dampak (Impact):** Pengalaman pengguna mobile buruk; staf kesulitan bernavigasi menggunakan ponsel pintar.
- **Rekomendasi Solusi:** Sesuaikan kelas utility Tailwind `block sm:hidden` pada tombol drawer header dan berikan `z-index` yang memadai agar tidak tertutup konten panel.

---

### [BUG-008] Login Kredensial Salah Tidak Menampilkan Feedback Error yang Jelas
- **Prioritas:** P2 (Medium)
- **Modul / Fitur:** Otentikasi — Form Login (`LoginForm.jsx`)
- **Lokasi Kode:** `Admin-Gue/app/login/LoginForm.jsx:55-80`
- **Langkah Reproduksi:**
  1. Buka `/login`.
  2. Masukkan email benar, namun ketikkan password yang salah.
  3. Klik tombol "Masuk ke Dashboard".
- **Expected Result:** Muncul kotak dialog peringatan merah atau toast error bertuliskan "Email atau kata sandi salah".
- **Actual Result:** Tombol kembali ke state semula tanpa menampilkan pesan kesalahan visual yang mencolok di layar.
- **Dampak (Impact):** Kebingungan bagi pengguna apakah permintaan login mereka sedang diproses atau ditolak.
- **Rekomendasi Solusi:** Pastikan state `error` pada `LoginForm.jsx` selalu dirender di atas tombol submit dengan komponen `alert` berlatar belakang merah kontras.

---

### [BUG-009] Batas Maksimal Upload APK di Serverless Function Hanya 4 MB
- **Prioritas:** P2 (Medium)
- **Modul / Fitur:** Rilis Aplikasi — Upload APK Android (`upload-apk/route.js`)
- **Lokasi Kode:** `Admin-Gue/app/api/admin/upload-apk/route.js:11`
- **Langkah Reproduksi:**
  1. Coba upload file APK rilis Android CariKostKita yang berukuran standar (misal 20 MB).
- **Expected Result:** File APK berhasil diunggah ke Vercel Blob dan link download diperbarui.
- **Actual Result:** Ditolak dengan pesan kesalahan batas 4 MB (`MAX_APK_BYTES = 4 * 1024 * 1024`).
- **Dampak (Impact):** Admin tidak bisa mengunggah APK rilis aplikasi mobile secara langsung melalui panel admin.
- **Rekomendasi Solusi:** Gunakan pola upload langsung dari browser ke Vercel Blob (*Client Upload with Presigned Token*) menggunakan library `@vercel/blob/client` sehingga payload tidak melalui batasan body serverless function Vercel (4.5 MB).

---

### [BUG-010] Residu File Mock db.json dan Dead Code Rute Legacy
- **Prioritas:** P3 (Low)
- **Modul / Fitur:** Arsitektur & Pemeliharaan Kode (`lib/db.json`, `route.js`)
- **Lokasi Kode:** `Admin-Gue/data/db.json` & `Admin-Gue/app/api/admin/[...slug]/route.js:700-790`
- **Langkah Reproduksi:**
  1. Periksa struktur file `Admin-Gue/data/db.json`.
- **Expected Result:** Seluruh data operasional dikelola secara murni oleh database PostgreSQL Supabase.
- **Actual Result:** Masih terdapat file `db.json` berisi data mock dummy tahun 2024 dan sejumlah fungsi `svc.*` yang tidak pernah terhubung ke database produksi.
- **Dampak (Impact):** Membingungkan developer dan berisiko terjadinya divergensi data jika ada rute yang tidak sengaja memakai mock lokal.
- **Rekomendasi Solusi:** Bersihkan dan deprecate file `db.json` setelah seluruh rute mutasi (`kosts`, `ads`, `users`) terintegrasi penuh ke backend FastAPI.
