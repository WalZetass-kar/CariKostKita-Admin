/**
 * Utilitas kontras warna (WCAG 2.1) untuk Admin-Gue.
 *
 * Dipakai untuk memvalidasi warna aksen brand sebelum disimpan ke CMS.
 * Warna brand pada Landing Page dipakai sebagai:
 *   - latar tombol CTA dengan teks putih  -> kontras terhadap #FFFFFF
 *   - warna teks aksen di halaman bone    -> kontras terhadap #FCFAF5
 *   - warna teks aksen di seksi cream     -> kontras terhadap #F2EDDF
 *
 * Semua fungsi bersifat murni (pure) supaya aman dipakai di server maupun
 * komponen klien.
 */

/* ---------- Parse & format ---------- */

/**
 * Menormalkan input warna menjadi "#RRGGBB".
 * Mendukung #RGB, #RGBA, #RRGGBB, #RRGGBBAA, dan nama warna dasar.
 * Mengembalikan null bila tidak bisa diparse.
 */
export function normalizeHex(value) {
  if (typeof value !== "string") return null;
  const raw = value.trim().toLowerCase();
  if (!raw) return null;

  if (NAMED_COLORS[raw]) return NAMED_COLORS[raw];

  const hex = raw.startsWith("#") ? raw.slice(1) : raw;
  if (!/^[0-9a-f]+$/.test(hex)) return null;

  if (hex.length === 3) {
    return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`.toUpperCase();
  }
  if (hex.length === 4) {
    return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`.toUpperCase();
  }
  if (hex.length === 6) return `#${hex}`.toUpperCase();
  if (hex.length === 8) return `#${hex.slice(0, 6)}`.toUpperCase();
  return null;
}

export function isValidHex(value) {
  return normalizeHex(value) !== null;
}

/* ---------- Konversi ---------- */

export function hexToRgb(hex) {
  const norm = normalizeHex(hex);
  if (!norm) return null;
  return {
    r: parseInt(norm.slice(1, 3), 16),
    g: parseInt(norm.slice(3, 5), 16),
    b: parseInt(norm.slice(5, 7), 16),
  };
}

export function rgbToHex({ r, g, b }) {
  const to = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
}

/**
 * Mengcampur dua warna dengan semantics CSS `color-mix`:
 * amount 0 = warna b sepenuhnya, amount 1 = warna a sepenuhnya.
 * Contoh `mixHex(brand, "#FFFFFF", 0.09)` = 9% brand + 91% putih.
 */
export function mixHex(a, b, amount) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  if (!ca || !cb) return null;
  const wa = Math.max(0, Math.min(1, amount));
  const wb = 1 - wa;
  return rgbToHex({
    r: ca.r * wa + cb.r * wb,
    g: ca.g * wa + cb.g * wb,
    b: ca.b * wa + cb.b * wb,
  });
}

/* ---------- Luminance & rasio kontras ---------- */

/** Luminansi relatif according to WCAG 2.1. */
export function relativeLuminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const channel = (value) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

/** Rasio kontras 1..21 sesuai WCAG 2.1. */
export function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  if (la === null || lb === null) return null;
  const light = Math.max(la, lb);
  const dark = Math.min(la, lb);
  return (light + 0.05) / (dark + 0.05);
}

/* ---------- Penilaian ---------- */

export const WCAG_AA_TEXT = 4.5;
export const WCAG_AA_LARGE_TEXT = 3;
export const WCAG_AAA_TEXT = 7;

/**
 * Grade kontras untuk rasio tertentu.
 * largeText = true memakai ambang 3:1 (teks besar / komponen UI).
 */
export function gradeRatio(ratio, largeText = false) {
  if (ratio === null || ratio === undefined) {
    return { level: "—", passes: false, tone: "bad", label: "Tidak valid" };
  }
  const threshold = largeText ? WCAG_AA_LARGE_TEXT : WCAG_AA_TEXT;
  if (ratio >= WCAG_AAA_TEXT) {
    return { level: "AAA", passes: true, tone: "ok", label: "AAA" };
  }
  if (ratio >= threshold) {
    return { level: largeText ? "AA (besar)" : "AA", passes: true, tone: "ok", label: "AA" };
  }
  if (ratio >= WCAG_AA_LARGE_TEXT) {
    return { level: "AA besar saja", passes: false, tone: "warn", label: "AA besar" };
  }
  return { level: "Gagal", passes: false, tone: "bad", label: "Gagal" };
}

/* ---------- Latar belakang yang dipakai Landing Page ---------- */

export const LANDING_BACKGROUNDS = [
  {
    key: "white",
    label: "Teks putih di tombol CTA",
    description: "Latar tombol memakai warna brand, teksnya putih.",
    color: "#FFFFFF",
    usage: "text-on-brand",
  },
  {
    key: "bone",
    label: "Teks brand di halaman",
    description: "Warna brand dipakai sebagai teks aksen di latar utama.",
    color: "#FCFAF5",
    usage: "text-on-light",
  },
  {
    key: "cream",
    label: "Teks brand di seksi cream",
    description: "Warna brand dipakai sebagai teks aksen di seksi cream.",
    color: "#F2EDDF",
    usage: "text-on-light",
  },
];

/* ---------- Palet aman ---------- */

/**
 * Warna-warna yang sudah dipastikan aman dipakai sebagai warna brand:
 * kontras >= 4.5:1 terhadap putih, bone, dan cream.
 */
export const SAFE_BRAND_PALETTE = [
  { hex: "#6D0808", name: "Maroon Brand" },
  { hex: "#790F13", name: "Maroon Landing" },
  { hex: "#3A090B", name: "Maroon Deep" },
  { hex: "#8C1C22", name: "Merah bata tua" },
  { hex: "#1F3A5F", name: "Biru navy" },
  { hex: "#0F3D2E", name: "Hijau hutan" },
  { hex: "#4A1D5E", name: "Ungu plum" },
  { hex: "#7C2D12", name: "Terakota tua" },
  { hex: "#1D3557", name: "Biru indigo" },
  { hex: "#134E4A", name: "Teal tua" },
];

/**
 * Menguji satu warna terhadap seluruh latar wajib.
 * Returns { checks, allPass, worst }
 */
export function evaluateBrandColor(hex, backgrounds = LANDING_BACKGROUNDS) {
  const norm = normalizeHex(hex);
  if (!norm) {
    return {
      valid: false,
      hex: null,
      checks: [],
      allPass: false,
      worst: null,
    };
  }
  const checks = backgrounds.map((bg) => {
    const ratio = contrastRatio(norm, bg.color);
    const grade = gradeRatio(ratio);
    return { ...bg, ratio, grade };
  });

  // Landing Page memakai tint 9% dari warna brand sebagai latar aksen
  // lembut (--maroon-soft) dengan teks brand di atasnya. Latar ini ikut
  // diperiksa karena warnanya ikut berubah saat warna brand diganti.
  const soft = mixHex(norm, "#FFFFFF", 0.09);
  if (soft) {
    const ratio = contrastRatio(norm, soft);
    checks.push({
      key: "soft",
      label: "Teks brand di latar aksen lembut",
      description: "Latar aksen lembut diturunkan dari warna brand (9% putih).",
      color: soft,
      usage: "text-on-light",
      ratio,
      grade: gradeRatio(ratio),
    });
  }
  const worst = checks.reduce(
    (acc, item) => (acc === null || item.ratio < acc.ratio ? item : acc),
    null
  );
  return {
    valid: true,
    hex: norm,
    checks,
    allPass: checks.every((c) => c.grade.passes),
    worst,
  };
}

/* ---------- Warna aman terdekat ---------- */

/** Jarak warna (Euclidean terbobot) antar dua hex. */
export function colorDistance(a, b) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  if (!ca || !cb) return Infinity;
  const dr = ca.r - cb.r;
  const dg = ca.g - cb.g;
  const db = ca.b - cb.b;
  // Bobot perceptual sederhana (merah paling sensitif untuk mata).
  return Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db);
}

/** Warna dari palet aman yang paling dekat dengan warna pilihan pengguna. */
export function nearestSafeColor(hex, palette = SAFE_BRAND_PALETTE) {
  const norm = normalizeHex(hex);
  if (!norm) return null;
  let best = null;
  for (const entry of palette) {
    const distance = colorDistance(norm, entry.hex);
    if (!best || distance < best.distance) {
      best = { ...entry, distance };
    }
  }
  return best;
}

/* ---------- Nama warna dasar ---------- */

const NAMED_COLORS = {
  hitam: "#000000",
  black: "#000000",
  putih: "#FFFFFF",
  white: "#FFFFFF",
  merah: "#FF0000",
  red: "#FF0000",
  hijau: "#008000",
  green: "#008000",
  biru: "#0000FF",
  blue: "#0000FF",
  kuning: "#FFFF00",
  yellow: "#FFFF00",
  abu: "#808080",
  gray: "#808080",
  grey: "#808080",
  oranye: "#FFA500",
  orange: "#FFA500",
  ungu: "#800080",
  purple: "#800080",
  coklat: "#A52A2A",
  maroon: "#800000",
  navy: "#000080",
  teal: "#008080",
  olive: "#808000",
  navyblue: "#000080",
};
