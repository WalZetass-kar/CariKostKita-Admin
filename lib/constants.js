// Konstanta yang dipakai bersama oleh server (API) dan client (UI).

export const ROLES = ["super_admin", "admin", "moderator", "marketing"];
export const ROLE_LABELS = {
  super_admin: "Super Admin",
  admin: "Admin",
  moderator: "Moderator",
  marketing: "Marketing",
};
export const ROLE_MENUS = {
  super_admin: [
    "fastapi_overview",
    "fastapi_kosts",
    "fastapi_owners",
    "verification",
    "fastapi_users",
    "fastapi_reports",
    "fastapi_ads",
    "landing_page",
    "fastapi_analytics",
    "fastapi_activity_logs",
    "settings",
  ],
  admin: [
    "fastapi_overview",
    "fastapi_kosts",
    "fastapi_owners",
    "verification",
    "fastapi_users",
    "fastapi_reports",
    "fastapi_ads",
    "landing_page",
    "fastapi_analytics",
    "settings",
  ],
  moderator: [
    "fastapi_overview",
    "fastapi_kosts",
    "fastapi_owners",
    "verification",
    "fastapi_reports",
  ],
  marketing: [
    "fastapi_overview",
    "fastapi_ads",
    "landing_page",
    "fastapi_analytics",
  ],
};

export const KOST_STATUS = ["Menunggu Verifikasi", "Disetujui", "Aktif", "Nonaktif", "Ditolak", "Diarsipkan"];
export const OWNER_VERIFICATION = ["Pending", "Verified", "Rejected"];
export const OWNER_VERIFICATION_LABEL = { Pending: "Menunggu Verifikasi", Verified: "Terverifikasi", Rejected: "Ditolak" };
export const ACCOUNT_STATUS = ["Aktif", "Nonaktif", "Diarsipkan"];

export const REPORT_TYPES = [
  "Foto tidak sesuai",
  "Harga tidak sesuai",
  "Lokasi tidak sesuai",
  "Informasi kost salah",
  "Kost sudah tidak tersedia",
  "Penipuan/indikasi mencurigakan",
  "Pelanggaran lainnya",
];
export const REPORT_STATUS = ["Baru", "Diproses", "Selesai", "Ditolak"];
export const REPORT_ACTIONS = [
  "Tidak ada tindakan",
  "Meminta pemilik memperbaiki informasi",
  "Memperbaiki data kost",
  "Menonaktifkan kost",
  "Menolak laporan (tidak terbukti)",
];

export const AD_TYPES = ["Pop-up", "Banner", "Promotional card"];
export const AD_PLATFORMS = ["Website", "Android", "Website + Android"];
export const AD_POSITIONS = {
  "Pop-up": ["Saat aplikasi dibuka"],
  Banner: ["Atas halaman beranda", "Bawah halaman beranda", "Hasil pencarian"],
  "Promotional card": ["Beranda", "Hasil pencarian", "Detail kost"],
};
export const AD_STATUS = ["Draft", "Menunggu Review", "Disetujui", "Terjadwal", "Aktif", "Nonaktif", "Selesai", "Diarsipkan"];

export const PERIODS = [
  ["harian", "Harian"],
  ["mingguan", "Mingguan"],
  ["bulanan", "Bulanan"],
  ["tahunan", "Tahunan"],
];

export const PAGE_SIZES = [10, 25, 50, 100];

export const SESSION_COOKIE = "ckk_admin_session";
export const SESSION_HOURS = 8;

export const MAX_IMAGE_CHARS = 1_600_000; // batas panjang data URL gambar yang disimpan
