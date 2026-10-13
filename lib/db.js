import fs from "node:fs";
import path from "node:path";
import { hashPassword, newId } from "./security.js";

/**
 * Lapisan penyimpanan. Saat ini memakai file JSON (data/db.json) supaya langsung
 * berfungsi tanpa setup. Seluruh akses data lewat getDb()/mutate(), jadi mudah
 * diganti dengan database sungguhan (PostgreSQL/MySQL/MongoDB) tanpa mengubah API.
 */
const DIR = path.join(process.cwd(), "data");
const FILE = path.join(DIR, "db.json");

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
    appName: "CariKostKita", logo: "", tagline: "Temukan kost impianmu dengan mudah", supportEmail: "support@carikostkita.id", contactPhone: "0761-555-0123", whatsapp: "6281234567890",
    address: "Jl. Soekarno Hatta No. 1, Pekanbaru, Riau", instagram: "https://instagram.com/carikostkita", facebook: "https://facebook.com/carikostkita", tiktok: "https://tiktok.com/@carikostkita", youtube: "",
    siteTitle: "CariKostKita - Cari Kost Terpercaya", siteDescription: "Platform pencarian kost terverifikasi dengan informasi harga, lokasi, dan fasilitas yang akurat.",
  };

  return { admins, owners: [], kosts: [], users: [], reports: [], ads: [], adEvents: [], audit: [], sessions: [], system, loginAttempts: {}, readNotifications: [] };
}

export function getDb() {
  if (fs.existsSync(FILE)) {
    try {
      const stat = fs.statSync(FILE);
      if (!globalThis.__ckk_db_cache || stat.mtimeMs !== globalThis.__ckk_db_mtime) {
        const raw = fs.readFileSync(FILE, "utf8").replace(/^\uFEFF/, "");
        globalThis.__ckk_db_cache = JSON.parse(raw);
        globalThis.__ckk_db_mtime = stat.mtimeMs;
      }
    } catch {
      if (!globalThis.__ckk_db_cache && fs.existsSync(FILE)) {
        const raw = fs.readFileSync(FILE, "utf8").replace(/^\uFEFF/, "");
        globalThis.__ckk_db_cache = JSON.parse(raw);
      }
    }
  } else {
    globalThis.__ckk_db_cache = createSeed();
    saveDb();
  }
  return globalThis.__ckk_db_cache;
}

export function saveDb() {
  fs.mkdirSync(DIR, { recursive: true });
  const tmp = `${FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(globalThis.__ckk_db_cache, null, 2));
  fs.renameSync(tmp, FILE);
  try {
    globalThis.__ckk_db_mtime = fs.statSync(FILE).mtimeMs;
  } catch {}
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
    globalThis.__ckk_db_cache = JSON.parse(snapshot);
    throw error;
  }
}
