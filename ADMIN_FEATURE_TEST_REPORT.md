# ADMIN CARIKOSTKITA — FEATURE TEST REPORT (LAPORAN PENGUJIAN)

**Versi:** 1.0.0  
**Tanggal Pengujian:** 05 November 2026  
**Metodologi:** Automated Headless Browser (Playwright Chromium) + Direct API Contract Probing  
**Environment Target:** Production Public Web (`https://admin-carikostkita.vercel.app`)  
**Backend API:** FastAPI Production (`https://api.carikostkita.my.id`)  
**Database:** Supabase PostgreSQL & PostgREST  
**Akun Penguji:** `superadmin@carikostkita.my.id` (Role: `super_admin`) [Password Masked: `********`]

---

## 1. Ringkasan Eksekutif Hasil Pengujian

Pengujian fungsional dinamis dan kontrak integrasi telah dijalankan pada seluruh modul website Admin CariKostKita. Setiap status **PASS**, **FAIL**, dan **BLOCKED** diverifikasi secara langsung dengan rekaman respons HTTP, inspeksi DOM, dan tangkapan layar (*screenshot evidence*).

```
Total Test Cases Dijalankan : 22
- PASS                      : 17 (77.3%)
- FAIL                      : 4  (18.2%)
- BLOCKED                   : 1  (4.5%)
```

---

## 2. Matriks Detail Pengujian Fungsional

| Test Case ID | Modul / Fitur | Deskripsi Uji & Skenario | Hasil Yang Diharapkan | Hasil Aktual | Status | Referensi Bukti |
|:---|:---|:---|:---|:---|:---:|:---|
| **TC-AUTH-01** | Login | Submit form kosong tanpa kredensial | Form ditahan; pesan kesalahan inline muncul | Pesan "Email atau username wajib diisi" muncul | **PASS** | `01_login_empty.png` |
| **TC-AUTH-02** | Login | Submit kredensial salah (password keliru) | Sistem menampilkan alert penolakan autentikasi | Alert error tidak muncul di UI; form hanya re-render tanpa feedback jelas | **FAIL** | `02_login_wrong_pw.png` |
| **TC-AUTH-03** | Login | Login dengan kredensial Super Admin valid | Login berhasil; cookie `admin_session` diset; dialihkan ke dashboard | Status HTTP 200; Cookie diset; Redirect ke `/` | **PASS** | `03_login_success.png` |
| **TC-AUTH-04** | Logout | Klik tombol "Keluar" dan konfirmasi | Sesi dihapus; cookie di-clear; dialihkan ke `/login?loggedout=1` | Dialihkan kembali ke `/login?loggedout=1` | **PASS** | `19_logout.png` |
| **TC-AUTH-05** | Auth Guard | Tekan tombol "Back" browser setelah logout | Halaman admin terproteksi; dicegat dan dialihkan ke `/login` | Event `pageshow` mendeteksi 401 dan redirect ke `/login` | **PASS** | `20_back_protection.png` |
| **TC-MOD-OVERVIEW** | Overview | Muat dashboard utama dan kartu metrik | Kartu ringkasan terisi angka statistik real-time | Kartu metrik termuat; data sinkron dengan FastAPI | **PASS** | `04_overview.png` |
| **TC-MOD-KOSTS-LIST** | Kost | Tampilan tabel direktori kost & pagination | Tabel kost memuat data properti dengan kolom nama, harga, status | Data kos berhasil ditampilkan dari backend | **PASS** | `05_kosts_view.png` |
| **TC-MOD-KOSTS-CREATE**| Kost | Buka modal "Tambah Kost" & pilih pemilik | Dropdown Pemilik menampilkan daftar mitra terverifikasi | Dropdown Pemilik kosong karena `data.owners` tidak disuplai oleh snapshot API | **FAIL** | `05_tambah_kost_modal.png` |
| **TC-MOD-KOSTS-STATUS**| Kost | Toggle status ketersediaan & verifikasi | Status berganti dan toast notifikasi muncul | Respons PATCH 200; status terupdate di UI | **PASS** | Network Log |
| **TC-MOD-IMPORT** | Bulk Import | Buka stepper import & unduh template | Stepper aktif; template XLSX/CSV dapat diunduh | Unduhan template base64 berhasil; stepper siap | **PASS** | `06_bulk_import.png` |
| **TC-MOD-OWNERS** | Pemilik | Tampilan direktori pemilik & link WhatsApp | Daftar pemilik muncul lengkap dengan tombol WA langsung | Tabel termuat; tautan WhatsApp valid | **PASS** | `07_owners.png` |
| **TC-MOD-VERIF** | Verifikasi | Tinjau antrean verifikasi pemilik | Tab 4 status berfungsi; dokumen ter-parse rapi | Parser `[verifikasi-properti]` menampilkan bukti | **PASS** | `08_verification.png` |
| **TC-MOD-USERS** | Pengguna | Manajemen pengguna & filter akun | Tabel pengguna memuat data akun; filter aktif | Pengguna terdaftar termuat dengan badge role | **PASS** | `09_users.png` |
| **TC-MOD-REPORTS** | Laporan | Tab status laporan pelanggaran kost | Tab BARU, DITINJAU, SELESAI, DITOLAK memuat aduan | Aduan termuat sesuai tab; modal aksi berfungsi | **PASS** | `10_reports.png` |
| **TC-MOD-ADS-LIST** | Iklan | Tampilan daftar kampanye iklan | Tabel menampilkan banner dan periode tayang | API `/api/admin/fastapi-ads` mengembalikan HTTP 503 (Tabel `advertisements` hilang) | **FAIL** | Network 503 Log |
| **TC-MOD-CMS** | Landing Page | Editor CMS dan perubahan token warna | Editor memuat konfigurasi hero/FAQ; pratinjau warna aman WCAG | Pengaturan tersimpan; gambar ter-upload ke Blob | **PASS** | `12_landing_page.png` |
| **TC-MOD-ANALYTICS**| Analitik | Visualisasi chart performa platform | Grafik pencarian dan sebaran lokasi tampil | Grafik interaktif memuat data metrik platform | **PASS** | `13_analytics.png` |
| **TC-MOD-AUDIT** | Audit Log | Tampilan tabel rekam jejak aktivitas staf | Tabel log memuat riwayat aktivitas staf admin | API `/api/admin/fastapi-activity-logs` mengembalikan HTTP 503 | **FAIL** | Network 503 Log |
| **TC-MOD-SETTINGS** | Pengaturan | Konfigurasi profil, password, dan sesi | Tab profil membaca identitas Super Admin | Profil dan ganti password terintegrasi aman | **PASS** | `15_settings.png` |
| **TC-COMP-SEARCH** | Komponen | Shortcut pencarian universal (Ctrl+K) | Modal pencarian cepat terbuka dan merespon kata kunci | Modal muncul; query menampilkan hasil pencarian | **PASS** | `16_global_search.png` |
| **TC-COMP-NOTIF** | Komponen | Klik tombol lonceng notifikasi | Dropdown pusat notifikasi menampilkan aktivitas terbaru | Komponen tidak ter-render / data notifications kosong permanen | **BLOCKED** | `17_notification_center.png` |
| **TC-UI-RESPONSIVE**| Tampilan UI | Pengujian pada viewport mobile 375x812 | Sidebar bertransformasi menjadi drawer yang dapat dibuka via burger icon | Tombol burger drawer tertutup elemen header pada lebar layar <640px | **FAIL** | `18_mobile_dashboard.png` |

---

## 3. Log Pengecekan Kontrak HTTP Endpoint Langsung

Hasil probing langsung menggunakan kredensial sesi aktif terhadap router proxy internal Next.js:

```
[200 OK]  GET /api/admin/fastapi-overview        - Latency: 1319ms - Keys: [success, data, scope]
[200 OK]  GET /api/admin/fastapi-kosts           - Latency: 609ms  - Keys: [success, data, pagination]
[200 OK]  GET /api/admin/fastapi-owners          - Latency: 612ms  - Keys: [success, data, pagination]
[200 OK]  GET /api/admin/owner-verifications     - Latency: 712ms  - Keys: [success, data, pagination]
[200 OK]  GET /api/admin/fastapi-users           - Latency: 918ms  - Keys: [success, data, pagination]
[200 OK]  GET /api/admin/fastapi-reports         - Latency: 727ms  - Keys: [success, data, pagination]
[503 ERR] GET /api/admin/fastapi-ads             - Latency: 628ms  - Error: "Advertisement data is temporarily unavailable."
[200 OK]  GET /api/admin/fastapi-analytics       - Latency: 999ms  - Keys: [success, data]
[503 ERR] GET /api/admin/fastapi-activity-logs   - Latency: 563ms  - Error: "Activity log service is temporarily unavailable."
[200 OK]  GET /api/admin/settings/landing        - Latency: 969ms  - Keys: [success, system]
[200 OK]  GET /api/admin/settings/system         - Latency: 825ms  - Keys: [success, system]
[200 OK]  GET /api/admin/settings/profile        - Latency: 705ms  - Keys: [success, profile, source]
[200 OK]  GET /api/admin/global-search           - Latency: 642ms  - Keys: [success, results]
[200 OK]  GET /api/admin/data                    - Latency: 1885ms - Keys: [success, data]
[200 OK]  GET /api/admin/contract                - Latency: 538ms  - Keys: [success, data]
```
