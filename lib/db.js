import fs from "node:fs";
import path from "node:path";
import { hashPassword, newId } from "./security.js";

/**
 * Lapisan penyimpanan. Saat ini memakai file JSON (data/db.json) supaya langsung
 * berfungsi tanpa setup. Seluruh akses data lewat getDb()/mutate(), jadi mudah
 * diganti dengan database sungguhan (PostgreSQL/MySQL/MongoDB) tanpa mengubah API.
 * Di lingkungan serverless (Vercel), penulisan file menggunakan fallback /tmp
 * dan in-memory cache agar tidak pernah gagal karena filesystem read-only.
 */
const DIR = path.join(process.cwd(), "data");
const FILE = path.join(DIR, "db.json");
const TMP_FILE = path.join("/tmp", "ckk-db.json");

export const toDate = (d = new Date()) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};
export const addDays = (dateStr, n) => {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

function createSeed() {
  const pass = hashPassword("Admin#12345");

  const admins = [
    { id: "adm-1", name: "Admin Rafi", username: "admin", email: "admin@carikostkita.id", phone: "0811-0000-0001", role: "super_admin", photo: "", passwordHash: pass, active: true, createdAt: "2026-01-02", notifications: { newReport: true, newOwner: true, pendingKost: true, other: true } },
    { id: "adm-2", name: "Admin Dina", username: "dina", email: "dina@carikostkita.id", phone: "0811-0000-0002", role: "admin", photo: "", passwordHash: pass, active: true, createdAt: "2026-02-10", notifications: { newReport: true, newOwner: true, pendingKost: true, other: false } },
    { id: "adm-3", name: "Moderator Reza", username: "moderator", email: "moderator@carikostkita.id", phone: "0811-0000-0003", role: "moderator", photo: "", passwordHash: pass, active: true, createdAt: "2026-03-01", notifications: { newReport: true, newOwner: true, pendingKost: true, other: false } },
    { id: "adm-4", name: "Marketing Maya", username: "marketing", email: "marketing@carikostkita.id", phone: "0811-0000-0004", role: "marketing", photo: "", passwordHash: pass, active: true, createdAt: "2026-03-15", notifications: { newReport: false, newOwner: false, pendingKost: false, other: true } },
  ];

  const system = {
    appName: "CariKostKita",
    logo: "",
    tagline: "Temukan Kost Nyaman & Terpercaya di Pekanbaru",
    supportEmail: "support@carikostkita.id",
    contactPhone: "0761-555-0123",
    whatsapp: "6281270008899",
    address: "Jl. Soekarno Hatta No. 1, Pekanbaru, Riau",
    instagram: "https://instagram.com/carikostkita",
    facebook: "https://facebook.com/carikostkita",
    tiktok: "https://tiktok.com/@carikostkita",
    youtube: "",
    linkedin: "",
    siteTitle: "CariKostKita - Cari Kost Terpercaya di Pekanbaru",
    siteDescription: "Platform pencarian kost terverifikasi dengan informasi harga, lokasi, dan fasilitas yang akurat.",
    metaKeywords: "cari kost pekanbaru, kost UIR, kost UNRI, kost Bukit Raya, APK CariKostKita",
    targetCity: "Pekanbaru",
    apkSize: "3.3 MB",
    minAndroid: "Android 8.0+",
    heroBadge1: "Lokasi dekat kampus & area strategis",
    heroBadge2: "Detail kost & foto kamar lengkap",
    apkUrl:
      "https://github.com/WalZetass-kar/CariKostKita/releases/download/v1.1.2/CariKostKita-v1.1.2-release.apk",
    versionName: "v1.1.2",
    versionCode: 4,
    releaseNotes:
      "Rilis resmi CariKostKita v1.1.2: beranda menampilkan 10 kost terdekat lebih dulu lalu memuat sisanya saat digulir.",
    brandColor: "#6D0808",
    heroHeadline: "Temukan Kost Nyaman & Terpercaya di Pekanbaru",
    heroSubheadline: "CariKostKita hadir untuk memudahkan kamu menemukan kost terbaik di Pekanbaru. Dengan tampilan yang simpel, cepat, dan lengkap, semua kebutuhan kost ada di genggaman.",
    heroCtaPrimaryLabel: "Download APK",
    heroCtaSecondaryLabel: "Lihat Fitur",
    heroCtaSecondaryLink: "#fitur",
    heroAdFreeText: "Bebas Iklan",
    heroTrustBadge1: "Mudah Digunakan",
    heroTrustBadge2: "Data Terpercaya",
    heroTrustBadge3: "Update Rutin",
    ownerTitle: "Anda punya kost di Pekanbaru?",
    ownerIntro: "Daftarkan kost Anda di CariKostKita agar lebih mudah ditemukan calon penyewa mahasiswa dan pekerja tanpa komisi perantara.",
    ownerWaLabel: "Daftar via WhatsApp",
    aboutTitle: "Dibangun untuk Kebutuhan Pencari Kost",
    aboutStory: "CariKostKita adalah aplikasi yang dikembangkan untuk membantu masyarakat, terutama anak rantau dan mahasiswa, dalam mencari kost dengan lebih mudah, cepat, dan terpercaya.",
    feedbackActive: true,
    feedbackTitle: "Bantu kami menyempurnakan CariKostKita",
    feedbackDesc: "Menemukan bug atau punya usulan fitur untuk CariKostKita? Sampaikan masukan Anda langsung ke admin WhatsApp kami.",
    feedbackButtonLabel: "Kirim Masukan via WhatsApp",
    finalCtaEyebrow: "JANGAN TUNGGU LAGI!",
    finalCtaTitle: "Yuk, Temukan Kost Terbaikmu Sekarang!",
    finalCtaDesc: "Download CariKostKita sekarang dan mulai pencarian kost impianmu.",
    finalCtaButtonLabel: "Download APK Sekarang",
    footerTagline: "Kost terbaik, untuk masa depanmu.",
    footerCopyright: "© 2026 CariKostKita. All rights reserved.",
    securityModalTitle: "Panduan Dialog Download Android",
    securityModalDesc: "Saat mengunduh berkas APK di luar Google Play Store, peramban (Chrome) akan menampilkan pesan standar keamanan:",
    securityModalNote: "Berkas APK CariKostKita 100% aman dan diverifikasi langsung dari repositori resmi proyek.",
    legalPrivacy: "Kebijakan Privasi CariKostKita: Kami menghargai privasi Anda dan hanya menggunakan data untuk keperluan operasional layanan pencarian kost.",
    legalTerms: "Syarat & Ketentuan CariKostKita: Layanan ini disediakan secara gratis untuk mempermudah pencarian kost di Pekanbaru.",
    navLinks: [
      { id: "nav-1", label: "Beranda", href: "#beranda", order: 1, is_active: true },
      { id: "nav-2", label: "Fitur", href: "#fitur", order: 2, is_active: true },
      { id: "nav-3", label: "Cara Install", href: "#install", order: 3, is_active: true },
      { id: "nav-4", label: "Untuk Pemilik Kost", href: "#pemilik", order: 4, is_active: true },
      { id: "nav-5", label: "FAQ", href: "#faq", order: 5, is_active: true },
    ],
    trustItems: [
      { id: "trust-1", icon: "shield", title: "Berkas resmi & terverifikasi", desc: "Dirilis dari repositori resmi proyek tanpa adware atau pihak ketiga.", order: 1, is_active: true },
      { id: "trust-2", icon: "bolt", title: "Ringan & hemat kuota", desc: "Ukuran berkas sangat ringkas agar cepat diunduh tanpa membebani memori ponsel.", order: 2, is_active: true },
      { id: "trust-3", icon: "lock", title: "Izin yang masuk akal", desc: "Hanya izin lokasi untuk peta navigasi kost dan galeri foto bagi pemilik kost.", order: 3, is_active: true },
    ],
    featureItems: [
      { id: "feat-1", icon: "search", title: "Pencarian Mudah", desc: "Temukan kost sesuai lokasi kampus, rentang harga, dan fasilitas yang kamu butuhkan.", order: 1, is_active: true },
      { id: "feat-2", icon: "file-lines", title: "Informasi Lengkap", desc: "Lihat detail kamar, foto asli terverifikasi, fasilitas lengkap, serta kontak langsung pemilik tanpa perantara.", order: 2, is_active: true },
      { id: "feat-3", icon: "location-dot", title: "Lokasi Strategis", desc: "Pilihan kost terverifikasi di area strategis yang dekat dengan kampus dan pusat aktivitas.", order: 3, is_active: true },
      { id: "feat-4", icon: "sliders", title: "Tampilan Sederhana", desc: "Desain antarmuka bersih, ringan, dan sangat mudah digunakan oleh siapa saja.", order: 4, is_active: true },
    ],
    installSteps: [
      { id: "step-1", step_number: "1", title: "Download APK", desc: "Klik tombol unduh untuk mendapatkan berkas aplikasi resmi.", order: 1, is_active: true },
      { id: "step-2", step_number: "2", title: "Konfirmasi Dialog", desc: "Pilih \"Tetap Download\" jika muncul peringatan browser.", order: 2, is_active: true },
      { id: "step-3", step_number: "3", title: "Izinkan Sumber", desc: "Buka berkas unduhan dan aktifkan izin instalasi dari sumber ini.", order: 3, is_active: true },
      { id: "step-4", step_number: "4", title: "Selesai!", desc: "Buka aplikasi dan mulai mencari kost idamanmu.", order: 4, is_active: true },
    ],
    ownerSteps: [
      { id: "ostep-1", title: "Unduh dan pasang aplikasi CariKostKita.", order: 1, is_active: true },
      { id: "ostep-2", title: "Buka Profil, lalu pilih \"Daftar sebagai Pemilik Kost\".", order: 2, is_active: true },
      { id: "ostep-3", title: "Isi identitas, alamat kost, fasilitas, dan foto kamar dengan lengkap.", order: 3, is_active: true },
      { id: "ostep-4", title: "Tim verifikasi meninjau pengajuan Anda dalam kurun waktu 1x24 jam.", order: 4, is_active: true },
      { id: "ostep-5", title: "Setelah disetujui, listing kost Anda langsung tayang dan dashboard pemilik dapat digunakan.", order: 5, is_active: true },
    ],
    faqItems: [
      { id: "faq-1", question: "Mengapa aplikasi belum ada di Google Play Store?", answer: "Aplikasi dirilis resmi lewat GitHub, sehingga kamu bisa mengunduh berkas APK langsung dan terverifikasi tanpa menunggu proses peninjauan Play Store.", order: 1, is_active: true },
      { id: "faq-2", question: "Apakah aman menginstal file APK ini?", answer: "Sangat aman. Berkas APK dikompilasi langsung dari repositori resmi proyek tanpa injeksi kode pihak ketiga. Android akan menampilkan dialog standar yang aman untuk disetujui.", order: 2, is_active: true },
      { id: "faq-3", question: "Versi Android apa yang didukung?", answer: "Mendukung Android 8.0+ hingga versi Android yang lebih baru dengan ukuran hemat kuota.", order: 3, is_active: true },
      { id: "faq-4", question: "Apakah mencari kost dikenakan biaya?", answer: "Tidak. Layanan pencarian kost 100% gratis untuk para pencari kost tanpa biaya langganan, biaya admin, maupun komisi perantara.", order: 4, is_active: true },
      { id: "faq-5", question: "Bagaimana jika data kost tidak sesuai?", answer: "Gunakan fitur lapor di aplikasi atau hubungi kami langsung via WhatsApp atau email bantuan. Tim verifikasi kami akan segera menindaklanjuti.", order: 5, is_active: true },
      { id: "faq-6", question: "Apakah pemilik kost bisa langsung mengunggah?", answer: "Bisa! Setiap pengajuan kost akan ditinjau oleh tim kurasi kami dalam 1x24 jam untuk mencegah penipuan dan memastikan listing valid.", order: 6, is_active: true },
    ],
  };

  return { admins, owners: [], kosts: [], users: [], reports: [], ads: [], adEvents: [], audit: [], sessions: [], system, loginAttempts: {}, readNotifications: [] };
}

export function getDb() {
  if (globalThis.__ckk_db_cache) {
    return globalThis.__ckk_db_cache;
  }

  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  const candidates = isServerless ? [TMP_FILE, FILE] : [FILE, TMP_FILE];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        const raw = fs.readFileSync(candidate, "utf8").replace(/^\uFEFF/, "");
        globalThis.__ckk_db_cache = JSON.parse(raw);
        return globalThis.__ckk_db_cache;
      }
    } catch {}
  }

  globalThis.__ckk_db_cache = createSeed();
  saveDb();
  return globalThis.__ckk_db_cache;
}

export function saveDb() {
  if (!globalThis.__ckk_db_cache) return;
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  const targets = isServerless ? [TMP_FILE, FILE] : [FILE, TMP_FILE];

  for (const target of targets) {
    try {
      const dir = path.dirname(target);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const tmp = `${target}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(globalThis.__ckk_db_cache, null, 2));
      fs.renameSync(tmp, target);
      try {
        globalThis.__ckk_db_mtime = fs.statSync(target).mtimeMs;
      } catch {}
      break; // Successfully saved
    } catch {
      // Continue to next candidate or fall back gracefully in-memory
    }
  }
}

/** Jalankan perubahan data secara atomik: jika fn melempar error, tidak ada yang disimpan. */
export function mutate(fn) {
  const db = getDb();
  const snapshot = JSON.stringify(db);
  try {
    const result = fn(db);
    saveDb();
    return result;
  } catch (error) {
    try {
      globalThis.__ckk_db_cache = JSON.parse(snapshot);
    } catch {}
    throw error;
  }
}
