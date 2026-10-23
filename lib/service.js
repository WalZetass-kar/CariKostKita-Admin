import { newId, hashPassword, verifyPassword } from "./security.js";
import { HttpError, publicAdmin } from "./auth.js";
import { addDays, toDate } from "./db.js";
import { AD_PLATFORMS, AD_POSITIONS, AD_TYPES, KOST_STATUS, MAX_IMAGE_CHARS, REPORT_ACTIONS, REPORT_STATUS, REPORT_TYPES, ROLES } from "./constants.js";

/* ---------- util ---------- */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
const isPhone = (v) => /^[0-9+\-\s()]{8,20}$/.test(v);
const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
const isLink = (v) => /^(https?:\/\/[^\s]+|\/[^\s]*)$/.test(v);
const str = (v) => (typeof v === "string" ? v.trim() : "");

function fail(fields, message = "Data tidak valid. Periksa kembali isian Anda.") {
  throw new HttpError(422, message, fields);
}
function imageField(value, errors, key, label) {
  if (!value) return "";
  if (typeof value !== "string" || !/^data:image\/(png|jpe?g|webp|gif|svg\+xml)[;,]/.test(value) && !/^https?:\/\//.test(value)) errors[key] = `${label} harus berupa gambar (PNG/JPG/WEBP) atau URL.`;
  else if (value.length > MAX_IMAGE_CHARS) errors[key] = `Ukuran ${label.toLowerCase()} terlalu besar.`;
  return value;
}

export function audit(db, admin, activity, target, object, status = "Sukses") {
  db.audit.unshift({ id: newId("aud"), adminId: admin?.id || null, adminName: admin?.name || "Sistem", activity, target, object, time: new Date().toISOString(), status });
  if (db.audit.length > 2000) db.audit.length = 2000;
}

const findOrThrow = (list, id, label) => {
  const item = list.find((x) => x.id === id);
  if (!item) throw new HttpError(404, `${label} tidak ditemukan.`);
  return item;
};

/* ---------- iklan ---------- */
export function adEffective(ad, today = toDate()) {
  if (ad.status !== "Aktif") return "Nonaktif";
  if (ad.end < today) return "Selesai";
  if (ad.start > today) return "Terjadwal";
  return "Aktif";
}
const platformMatches = (ad, platform) => ad.platform === "Website + Android" || ad.platform === platform;

export function publicAds(db, platform) {
  const today = toDate();
  const wanted = String(platform || "").toLowerCase() === "android" ? "Android" : String(platform || "").toLowerCase() === "website" ? "Website" : null;
  return db.ads
    .filter((ad) => adEffective(ad, today) === "Aktif" && (!wanted || platformMatches(ad, wanted)))
    .map(({ id, title, description, image, link, type, platform: p, position, start, end }) => ({ id, title, description, image, link, type, platform: p, position, start, end }));
}

export function recordAdEvent(db, adId, type, platform) {
  const ad = db.ads.find((a) => a.id === adId);
  if (!ad) throw new HttpError(404, "Iklan tidak ditemukan.");
  if (adEffective(ad) !== "Aktif") throw new HttpError(409, "Iklan tidak sedang tayang.");
  if (!["impression", "click"].includes(type)) throw new HttpError(422, "Tipe event tidak valid.");
  const p = platform === "Android" ? "Android" : "Website";
  if (!platformMatches(ad, p)) throw new HttpError(409, "Iklan tidak ditayangkan di platform ini.");
  const date = toDate();
  let row = db.adEvents.find((e) => e.adId === adId && e.date === date && e.platform === p);
  if (!row) db.adEvents.push((row = { adId, date, platform: p, impressions: 0, clicks: 0 }));
  if (type === "impression") row.impressions += 1;
  else row.clicks += 1;
}

function adTotals(db, adId) {
  return db.adEvents.filter((e) => e.adId === adId).reduce((t, e) => ({ impressions: t.impressions + e.impressions, clicks: t.clicks + e.clicks }), { impressions: 0, clicks: 0 });
}

function validateAd(body, existing) {
  const e = {};
  const data = {
    title: str(body.title), description: str(body.description), link: str(body.link), type: body.type, platform: body.platform, position: body.position,
    start: str(body.start), end: str(body.end), status: body.status || "Aktif",
  };
  if (data.title.length < 3) e.title = "Judul iklan minimal 3 karakter.";
  if (!data.description) e.description = "Deskripsi wajib diisi.";
  if (!data.link) e.link = "Link tujuan wajib diisi.";
  else if (!isLink(data.link)) e.link = "Link harus diawali http://, https://, atau / (halaman internal).";
  if (!AD_TYPES.includes(data.type)) e.type = "Pilih tipe iklan.";
  if (!AD_PLATFORMS.includes(data.platform)) e.platform = "Pilih platform tujuan.";
  if (AD_TYPES.includes(data.type) && !AD_POSITIONS[data.type].includes(data.position)) e.position = "Pilih posisi iklan yang sesuai tipe.";
  if (!isDate(data.start)) e.start = "Tanggal mulai tidak valid.";
  if (!isDate(data.end)) e.end = "Tanggal berakhir tidak valid.";
  else if (isDate(data.start) && data.end < data.start) e.end = "Tanggal berakhir tidak boleh lebih awal dari tanggal mulai.";
  if (!["Aktif", "Nonaktif"].includes(data.status)) e.status = "Status tidak valid.";
  data.image = imageField(body.image ?? existing?.image, e, "image", "Gambar");
  if (!data.image && !e.image) e.image = "Gambar/banner wajib diunggah.";
  if (Object.keys(e).length) fail(e);
  return data;
}

export function createAd(db, admin, body) {
  const data = validateAd(body);
  const ad = { id: newId("ad"), ...data, createdAt: toDate(), updatedAt: toDate() };
  db.ads.unshift(ad);
  audit(db, admin, `Menambah iklan ${ad.title}`, `Iklan: ${ad.title}`, "Iklan");
  return ad;
}
export function updateAd(db, admin, id, body) {
  const ad = findOrThrow(db.ads, id, "Iklan");
  Object.assign(ad, validateAd(body, ad), { updatedAt: toDate() });
  audit(db, admin, `Mengubah iklan ${ad.title}`, `Iklan: ${ad.title}`, "Iklan");
  return ad;
}
export function deleteAd(db, admin, id) {
  return archiveAd(db, admin, id);
}
export function archiveAd(db, admin, id) {
  const ad = findOrThrow(db.ads, id, "Iklan");
  ad.archived = true;
  ad.status = "Diarsipkan";
  ad.updatedAt = toDate();
  audit(db, admin, `Mengarsipkan iklan ${ad.title}`, `Iklan: ${ad.title}`, "Iklan");
  return ad;
}
export function restoreAd(db, admin, id) {
  const ad = findOrThrow(db.ads, id, "Iklan");
  ad.archived = false;
  ad.status = "Aktif";
  ad.updatedAt = toDate();
  audit(db, admin, `Memulihkan iklan ${ad.title}`, `Iklan: ${ad.title}`, "Iklan");
  return ad;
}
export function permanentDeleteAd(db, admin, id) {
  if (admin.role !== "super_admin") throw new HttpError(403, "Hanya Super Admin yang dapat menghapus data permanen.");
  const ad = findOrThrow(db.ads, id, "Iklan");
  db.ads = db.ads.filter((a) => a.id !== id);
  db.adEvents = db.adEvents.filter((e) => e.adId !== id);
  audit(db, admin, `Menghapus permanen iklan ${ad.title}`, `Iklan: ${ad.title}`, "Iklan");
  return { success: true };
}
export function toggleAd(db, admin, id) {
  const ad = findOrThrow(db.ads, id, "Iklan");
  ad.status = ad.status === "Aktif" ? "Nonaktif" : "Aktif";
  ad.updatedAt = toDate();
  audit(db, admin, `${ad.status === "Aktif" ? "Mengaktifkan" : "Menonaktifkan"} iklan ${ad.title}`, `Iklan: ${ad.title}`, "Iklan");
  return ad;
}

/* ---------- kost ---------- */
function validateKost(body) {
  const e = {};
  const data = {
    name: str(body.name), area: str(body.area), address: str(body.address), description: str(body.description), facilities: str(body.facilities),
    price: Number(body.price), rooms: body.rooms === "" || body.rooms == null ? 1 : Number(body.rooms),
    latitude: body.latitude === "" || body.latitude == null ? null : Number(body.latitude),
    longitude: body.longitude === "" || body.longitude == null ? null : Number(body.longitude),
  };
  if (data.name.length < 3) e.name = "Nama kost wajib diisi (minimal 3 karakter).";
  if (!Number.isFinite(data.price) || data.price <= 0) e.price = "Harga harus berupa angka lebih dari 0.";
  if (!data.area) e.area = "Kecamatan wajib diisi.";
  if (!data.address) e.address = "Alamat wajib diisi.";
  if (!Number.isInteger(data.rooms) || data.rooms < 1) e.rooms = "Jumlah kamar harus bilangan bulat minimal 1.";
  if (data.latitude !== null && !(data.latitude >= -90 && data.latitude <= 90)) e.latitude = "Latitude harus antara -90 dan 90.";
  if (data.longitude !== null && !(data.longitude >= -180 && data.longitude <= 180)) e.longitude = "Longitude harus antara -180 dan 180.";
  if ((data.latitude === null) !== (data.longitude === null)) e.latitude = "Isi latitude dan longitude bersamaan.";
  data.photo = imageField(body.photo, e, "photo", "Foto");
  return { data, errors: e };
}

export function assertOwnerCanAddKost(owner) {
  if (!owner) throw new HttpError(404, "Pemilik tidak ditemukan.");
  if (!owner.accountActive) throw new HttpError(403, "Akun pemilik nonaktif. Tidak dapat menambahkan kost.");
  if (owner.verificationStatus !== "Verified") {
    throw new HttpError(403, owner.verificationStatus === "Rejected" ? "Verifikasi pemilik ditolak. Perbaiki data dan ajukan ulang sebelum menambahkan kost." : "Pemilik belum terverifikasi. Tunggu persetujuan Admin sebelum menambahkan kost.");
  }
}

export function createKost(db, admin, body, ownerId = body.ownerId) {
  const { data, errors } = validateKost(body);
  const owner = db.owners.find((o) => o.id === ownerId);
  if (!owner) errors.ownerId = "Pilih pemilik kost.";
  if (Object.keys(errors).length) fail(errors);
  assertOwnerCanAddKost(owner);
  const kost = { id: newId("kst"), ...data, ownerId: owner.id, status: "Menunggu Verifikasi", createdAt: toDate(), updatedAt: toDate(), verifiedAt: null, verifiedBy: null, rejectReason: "" };
  db.kosts.unshift(kost);
  audit(db, admin, `Menambah kost ${kost.name}`, `Kost: ${kost.name}`, "Kost");
  return kost;
}

export function updateKost(db, admin, id, body) {
  const kost = findOrThrow(db.kosts, id, "Kost");
  const { data, errors } = validateKost(body);
  if (body.ownerId && body.ownerId !== kost.ownerId) errors.ownerId = "Pemilik kost tidak dapat dipindahkan dari sini.";
  if (Object.keys(errors).length) fail(errors);
  Object.assign(kost, data, { updatedAt: toDate() });
  audit(db, admin, `Mengubah data kost ${kost.name}`, `Kost: ${kost.name}`, "Kost");
  return kost;
}

export function buildTimeline(db, objectType, objectId, objectName, createdAt) {
  const events = [];
  if (createdAt) {
    events.push({
      id: `init-${objectId}`,
      time: createdAt.length === 10 ? `${createdAt}T00:00:00.000Z` : createdAt,
      action: `${objectType} dibuat / didaftarkan`,
      actor: "Sistem",
      status: "Sukses",
    });
  }
  const needle = objectName ? String(objectName).toLowerCase() : String(objectId).toLowerCase();
  (db.audit || []).forEach((a) => {
    if (a.object === objectType && (a.target.toLowerCase().includes(needle) || a.target.includes(objectId))) {
      events.push({
        id: a.id,
        time: a.time,
        action: a.activity,
        actor: a.adminName,
        status: a.status,
      });
    }
  });
  events.sort((a, b) => new Date(b.time) - new Date(a.time));
  return events;
}

export function deleteKost(db, admin, id) {
  return archiveKost(db, admin, id);
}

export function archiveKost(db, admin, id) {
  const kost = findOrThrow(db.kosts, id, "Kost");
  kost.archived = true;
  kost.status = "Diarsipkan";
  kost.updatedAt = toDate();
  audit(db, admin, `Mengarsipkan kost ${kost.name}`, `Kost: ${kost.name}`, "Kost");
  return kost;
}

export function restoreKost(db, admin, id) {
  const kost = findOrThrow(db.kosts, id, "Kost");
  kost.archived = false;
  kost.status = "Nonaktif";
  kost.updatedAt = toDate();
  audit(db, admin, `Memulihkan kost ${kost.name}`, `Kost: ${kost.name}`, "Kost");
  return kost;
}

export function permanentDeleteKost(db, admin, id) {
  if (admin.role !== "super_admin") throw new HttpError(403, "Hanya Super Admin yang dapat menghapus data permanen.");
  const kost = findOrThrow(db.kosts, id, "Kost");
  db.kosts = db.kosts.filter((k) => k.id !== id);
  audit(db, admin, `Menghapus permanen kost ${kost.name}`, `Kost: ${kost.name}`, "Kost");
  return { success: true };
}

export function bulkKostAction(db, admin, { ids, action, reason }) {
  if (!Array.isArray(ids) || !ids.length) throw new HttpError(422, "Pilih minimal satu data kost.");
  const affected = [];
  ids.forEach((id) => {
    const k = db.kosts.find((x) => x.id === id);
    if (!k) return;
    if (action === "activate") {
      setKostStatus(db, admin, id, "Aktif");
      affected.push(k);
    } else if (action === "deactivate") {
      setKostStatus(db, admin, id, "Nonaktif");
      affected.push(k);
    } else if (action === "archive") {
      archiveKost(db, admin, id);
      affected.push(k);
    } else if (action === "restore") {
      restoreKost(db, admin, id);
      affected.push(k);
    }
  });
  return { count: affected.length };
}

export function setKostStatus(db, admin, id, status, reason = "") {
  const kost = findOrThrow(db.kosts, id, "Kost");
  if (!KOST_STATUS.includes(status)) throw new HttpError(422, "Status kost tidak valid.");
  if (status === kost.status) return kost;
  const owner = db.owners.find((o) => o.id === kost.ownerId);
  let activity;

  if (status === "Aktif") {
    if (!owner || owner.verificationStatus !== "Verified") throw new HttpError(409, "Kost tidak dapat diaktifkan karena pemilik belum terverifikasi.");
    if (!owner.accountActive) throw new HttpError(409, "Kost tidak dapat diaktifkan karena akun pemilik nonaktif.");
    const first = !kost.verifiedAt;
    if (first) Object.assign(kost, { verifiedAt: toDate(), verifiedBy: admin.name });
    kost.rejectReason = "";
    kost.archived = false;
    activity = first ? `Menyetujui verifikasi kost ${kost.name}` : `Mengaktifkan kost ${kost.name}`;
  } else if (status === "Disetujui") {
    if (!owner || owner.verificationStatus !== "Verified") throw new HttpError(409, "Kost tidak dapat disetujui karena pemilik belum terverifikasi.");
    kost.verifiedAt = toDate();
    kost.verifiedBy = admin.name;
    kost.rejectReason = "";
    activity = `Menyetujui kost ${kost.name}`;
  } else if (status === "Ditolak") {
    if (kost.status !== "Menunggu Verifikasi") throw new HttpError(409, "Hanya kost yang menunggu verifikasi yang dapat ditolak.");
    if (str(reason).length < 5) fail({ reason: "Alasan penolakan wajib diisi (minimal 5 karakter)." }, "Alasan penolakan wajib diisi.");
    kost.rejectReason = str(reason);
    activity = `Menolak verifikasi kost ${kost.name}`;
  } else if (status === "Nonaktif") {
    activity = `Menonaktifkan kost ${kost.name}`;
  } else if (status === "Diarsipkan") {
    kost.archived = true;
    activity = `Mengarsipkan kost ${kost.name}`;
  } else {
    activity = `Mengembalikan kost ${kost.name} ke antrean verifikasi`;
  }
  kost.status = status;
  kost.updatedAt = toDate();
  audit(db, admin, activity, `Kost: ${kost.name}`, "Kost");
  return kost;
}

/* ---------- pemilik ---------- */
export function registerOwner(db, body) {
  const e = {};
  const data = { name: str(body.name), email: str(body.email).toLowerCase(), phone: str(body.phone), idType: str(body.idType) || "KTP", idNumber: str(body.idNumber), address: str(body.address), businessInfo: str(body.businessInfo) };
  if (data.name.length < 3) e.name = "Nama wajib diisi.";
  if (!isEmail(data.email)) e.email = "Format email tidak valid.";
  if (!isPhone(data.phone)) e.phone = "Nomor telepon tidak valid.";
  if (!/^\d{16}$/.test(data.idNumber.replace(/\s/g, ""))) e.idNumber = "Nomor identitas (NIK) harus 16 digit.";
  data.photo = imageField(body.photo, e, "photo", "Foto profil");
  data.idPhoto = imageField(body.idPhoto, e, "idPhoto", "Foto identitas");
  const existing = db.owners.find((o) => o.email === data.email);
  if (existing && existing.verificationStatus !== "Rejected") e.email = "Email sudah terdaftar.";
  if (Object.keys(e).length) fail(e);

  if (existing) {
    // Pengajuan ulang setelah ditolak.
    Object.assign(existing, data, { idNumber: data.idNumber.replace(/\s/g, ""), verificationStatus: "Pending", submittedAt: toDate(), rejectReason: "" });
    return existing;
  }
  const owner = { id: newId("own"), ...data, idNumber: data.idNumber.replace(/\s/g, ""), accountActive: true, verificationStatus: "Pending", submittedAt: toDate(), verifiedAt: null, verifiedBy: null, rejectReason: "", createdAt: toDate() };
  db.owners.unshift(owner);
  return owner;
}

export function ownerAction(db, admin, id, body) {
  const owner = findOrThrow(db.owners, id, "Pemilik");
  const { action } = body;
  if (action === "approve") {
    if (owner.verificationStatus === "Verified") throw new HttpError(409, "Pemilik sudah terverifikasi.");
    Object.assign(owner, { verificationStatus: "Verified", verifiedAt: toDate(), verifiedBy: admin.name, rejectReason: "" });
    audit(db, admin, `Menyetujui verifikasi pemilik ${owner.name}`, `Pemilik: ${owner.name}`, "Pemilik");
  } else if (action === "reject") {
    if (owner.verificationStatus !== "Pending") throw new HttpError(409, "Hanya pengajuan berstatus Pending yang dapat ditolak.");
    if (str(body.reason).length < 5) fail({ reason: "Alasan penolakan wajib diisi (minimal 5 karakter)." }, "Alasan penolakan wajib diisi.");
    Object.assign(owner, { verificationStatus: "Rejected", rejectReason: str(body.reason), verifiedAt: null, verifiedBy: null });
    audit(db, admin, `Menolak verifikasi pemilik ${owner.name}`, `Pemilik: ${owner.name}`, "Pemilik");
  } else if (action === "deactivate") {
    if (!owner.accountActive) throw new HttpError(409, "Akun pemilik sudah nonaktif.");
    owner.accountActive = false;
    let affected = 0;
    if (body.deactivateKosts) {
      db.kosts.forEach((k) => {
        if (k.ownerId === owner.id && k.status === "Aktif") {
          k.status = "Nonaktif";
          k.updatedAt = toDate();
          affected += 1;
        }
      });
    }
    audit(db, admin, `Menonaktifkan pemilik ${owner.name}${affected ? ` (${affected} kost ikut dinonaktifkan)` : ""}`, `Pemilik: ${owner.name}`, "Pemilik");
  } else if (action === "activate") {
    if (owner.accountActive) throw new HttpError(409, "Akun pemilik sudah aktif.");
    owner.accountActive = true;
    audit(db, admin, `Mengaktifkan pemilik ${owner.name}`, `Pemilik: ${owner.name}`, "Pemilik");
  } else throw new HttpError(422, "Aksi tidak dikenal.");
  return owner;
}

export function updateOwner(db, admin, id, body) {
  const owner = findOrThrow(db.owners, id, "Pemilik");
  const e = {};
  const data = {
    name: str(body.name),
    email: str(body.email).toLowerCase(),
    phone: str(body.phone),
    idType: str(body.idType) || "KTP",
    idNumber: str(body.idNumber).replace(/\s/g, ""),
    address: str(body.address),
    businessInfo: str(body.businessInfo),
  };
  if (data.name.length < 3) e.name = "Nama wajib diisi (minimal 3 karakter).";
  if (!isEmail(data.email)) e.email = "Format email tidak valid.";
  else if (db.owners.some((o) => o.id !== id && o.email === data.email)) e.email = "Email sudah digunakan pemilik lain.";
  if (!isPhone(data.phone)) e.phone = "Nomor telepon tidak valid.";
  if (!/^\d{16}$/.test(data.idNumber)) e.idNumber = "Nomor identitas (NIK) harus 16 digit.";
  if (body.photo !== undefined) data.photo = imageField(body.photo, e, "photo", "Foto profil");
  if (body.idPhoto !== undefined) data.idPhoto = imageField(body.idPhoto, e, "idPhoto", "Foto identitas");
  if (Object.keys(e).length) fail(e);

  Object.assign(owner, data);
  audit(db, admin, `Mengubah data pemilik ${owner.name}`, `Pemilik: ${owner.name}`, "Pemilik");
  return owner;
}

export function deleteOwner(db, admin, id) {
  return archiveOwner(db, admin, id);
}

export function archiveOwner(db, admin, id) {
  const owner = findOrThrow(db.owners, id, "Pemilik");
  owner.archived = true;
  owner.accountActive = false;
  let affected = 0;
  db.kosts.forEach((k) => {
    if (k.ownerId === id && k.status === "Aktif") {
      k.status = "Nonaktif";
      k.updatedAt = toDate();
      affected += 1;
    }
  });
  audit(db, admin, `Mengarsipkan pemilik ${owner.name}${affected ? ` (${affected} kost dinonaktifkan)` : ""}`, `Pemilik: ${owner.name}`, "Pemilik");
  return owner;
}

export function restoreOwner(db, admin, id) {
  const owner = findOrThrow(db.owners, id, "Pemilik");
  owner.archived = false;
  owner.accountActive = true;
  audit(db, admin, `Memulihkan akun pemilik ${owner.name}`, `Pemilik: ${owner.name}`, "Pemilik");
  return owner;
}

export function permanentDeleteOwner(db, admin, id, { deleteLinkedKosts = false } = {}) {
  if (admin.role !== "super_admin") throw new HttpError(403, "Hanya Super Admin yang dapat menghapus data permanen.");
  const owner = findOrThrow(db.owners, id, "Pemilik");
  const linkedKosts = db.kosts.filter((k) => k.ownerId === id);
  if (linkedKosts.length > 0 && !deleteLinkedKosts) {
    throw new HttpError(
      409,
      `Pemilik ini masih memiliki ${linkedKosts.length} data kost. Hapus data kost terlebih dahulu atau centang opsi hapus beserta seluruh kost terkait.`
    );
  }
  if (linkedKosts.length > 0 && deleteLinkedKosts) {
    const linkedIds = new Set(linkedKosts.map((k) => k.id));
    db.kosts = db.kosts.filter((k) => !linkedIds.has(k.id));
    db.reports = db.reports.filter((r) => !linkedIds.has(r.kostId));
  }
  db.owners = db.owners.filter((o) => o.id !== id);
  audit(db, admin, `Menghapus permanen pemilik ${owner.name}${deleteLinkedKosts ? ` beserta ${linkedKosts.length} kost terkait` : ""}`, `Pemilik: ${owner.name}`, "Pemilik");
  return { success: true };
}

export function bulkOwnerAction(db, admin, { ids, action, deleteLinkedKosts = false }) {
  if (!Array.isArray(ids) || !ids.length) throw new HttpError(422, "Pilih minimal satu data pemilik.");
  const affected = [];
  ids.forEach((id) => {
    const o = db.owners.find((x) => x.id === id);
    if (!o) return;
    if (action === "approve") {
      ownerAction(db, admin, id, { action: "approve" });
      affected.push(o);
    } else if (action === "deactivate") {
      ownerAction(db, admin, id, { action: "deactivate" });
      affected.push(o);
    } else if (action === "activate") {
      ownerAction(db, admin, id, { action: "activate" });
      affected.push(o);
    } else if (action === "archive" || action === "delete") {
      archiveOwner(db, admin, id);
      affected.push(o);
    } else if (action === "restore") {
      restoreOwner(db, admin, id);
      affected.push(o);
    } else if (action === "permanentDelete") {
      try {
        permanentDeleteOwner(db, admin, id, { deleteLinkedKosts });
        affected.push(o);
      } catch (err) {
        // proceed
      }
    }
  });
  return { count: affected.length };
}

/* ---------- pengguna ---------- */
export function setUserStatus(db, admin, id, status) {
  const user = findOrThrow(db.users, id, "Pengguna");
  if (!["Aktif", "Nonaktif"].includes(status)) throw new HttpError(422, "Status tidak valid.");
  user.status = status;
  audit(db, admin, `${status === "Aktif" ? "Mengaktifkan" : "Menonaktifkan"} akun pengguna ${user.name}`, `Pengguna: ${user.name}`, "Pengguna");
  return user;
}

export function createUser(db, admin, body) {
  if (!["super_admin", "admin"].includes(admin.role)) throw new HttpError(403, "Hanya Super Admin atau Admin yang dapat menambah pengguna.");
  const e = {};
  const name = str(body.name);
  const email = str(body.email).toLowerCase();
  const phone = str(body.phone);
  const role = str(body.role || "user");
  if (name.length < 3) e.name = "Nama wajib diisi (minimal 3 karakter).";
  if (!isEmail(email)) e.email = "Format email tidak valid.";
  else if (db.users.some((u) => u.email === email)) e.email = "Email sudah digunakan pengguna lain.";
  if (phone && !isPhone(phone)) e.phone = "Nomor telepon tidak valid.";
  if (Object.keys(e).length) fail(e);

  const newUser = {
    id: newId("usr"),
    name,
    email,
    phone,
    role,
    status: "Aktif",
    photo: "",
    registeredAt: toDate(),
    archived: false,
  };
  db.users.unshift(newUser);
  audit(db, admin, `Menambahkan pengguna baru ${name} (${role})`, `Pengguna: ${name}`, "Pengguna");
  return newUser;
}

export function updateUser(db, admin, id, body) {
  const user = findOrThrow(db.users, id, "Pengguna");
  const e = {};
  const data = {
    name: str(body.name),
    email: str(body.email).toLowerCase(),
    phone: str(body.phone),
  };
  if (data.name.length < 3) e.name = "Nama wajib diisi (minimal 3 karakter).";
  if (!isEmail(data.email)) e.email = "Format email tidak valid.";
  else if (db.users.some((u) => u.id !== id && u.email === data.email)) e.email = "Email sudah digunakan pengguna lain.";
  if (data.phone && !isPhone(data.phone)) e.phone = "Nomor telepon tidak valid.";
  if (body.status && !["Aktif", "Nonaktif"].includes(body.status)) e.status = "Status tidak valid.";
  else if (body.status) data.status = body.status;
  if (body.photo !== undefined) data.photo = imageField(body.photo, e, "photo", "Foto profil");
  if (Object.keys(e).length) fail(e);

  Object.assign(user, data);
  audit(db, admin, `Mengubah data pengguna ${user.name}`, `Pengguna: ${user.name}`, "Pengguna");
  return user;
}

export function deleteUser(db, admin, id) {
  return archiveUser(db, admin, id);
}

export function archiveUser(db, admin, id) {
  const user = findOrThrow(db.users, id, "Pengguna");
  user.archived = true;
  user.status = "Nonaktif";
  audit(db, admin, `Mengarsipkan pengguna ${user.name}`, `Pengguna: ${user.name}`, "Pengguna");
  return user;
}

export function restoreUser(db, admin, id) {
  const user = findOrThrow(db.users, id, "Pengguna");
  user.archived = false;
  user.status = "Aktif";
  audit(db, admin, `Memulihkan akun pengguna ${user.name}`, `Pengguna: ${user.name}`, "Pengguna");
  return user;
}

export function permanentDeleteUser(db, admin, id) {
  if (admin.role !== "super_admin") throw new HttpError(403, "Hanya Super Admin yang dapat menghapus data permanen.");
  const user = findOrThrow(db.users, id, "Pengguna");
  db.reports.forEach((r) => {
    if (r.reporterId === id && !r.reporterName) {
      r.reporterName = user.name;
    }
  });
  db.users = db.users.filter((u) => u.id !== id);
  audit(db, admin, `Menghapus permanen pengguna ${user.name}`, `Pengguna: ${user.name}`, "Pengguna");
  return { success: true };
}

export function bulkUserAction(db, admin, { ids, action }) {
  if (!Array.isArray(ids) || !ids.length) throw new HttpError(422, "Pilih minimal satu data pengguna.");
  const affected = [];
  ids.forEach((id) => {
    const u = db.users.find((x) => x.id === id);
    if (!u) return;
    if (action === "activate") {
      setUserStatus(db, admin, id, "Aktif");
      affected.push(u);
    } else if (action === "deactivate") {
      setUserStatus(db, admin, id, "Nonaktif");
      affected.push(u);
    } else if (action === "archive" || action === "delete") {
      archiveUser(db, admin, id);
      affected.push(u);
    } else if (action === "restore") {
      restoreUser(db, admin, id);
      affected.push(u);
    } else if (action === "permanentDelete") {
      try {
        permanentDeleteUser(db, admin, id);
        affected.push(u);
      } catch (err) {
        // proceed
      }
    }
  });
  return { count: affected.length };
}

/* ---------- laporan ---------- */
export function createReport(db, body) {
  const e = {};
  const kost = db.kosts.find((k) => k.id === body.kostId);
  const user = db.users.find((u) => u.id === body.reporterId);
  if (!kost) e.kostId = "Kost tidak ditemukan.";
  if (!user) e.reporterId = "Pelapor tidak ditemukan.";
  if (!REPORT_TYPES.includes(body.type)) e.type = "Jenis laporan tidak valid.";
  if (str(body.description).length < 10) e.description = "Deskripsi minimal 10 karakter.";
  const evidence = (Array.isArray(body.evidence) ? body.evidence : []).slice(0, 4);
  evidence.forEach((img, i) => imageField(img, e, `evidence${i}`, "Bukti"));
  if (Object.keys(e).length) fail(e);
  const n = db.reports.length + 1;
  const now = new Date().toISOString();
  const report = { id: `LP-${String(n).padStart(4, "0")}`, kostId: kost.id, kostName: kost.name, reporterId: user.id, type: body.type, description: str(body.description), evidence, status: "Baru", createdAt: now, updatedAt: now, handledBy: null, handledByName: "", note: "", adminAction: "" };
  db.reports.unshift(report);
  return report;
}

const REPORT_FLOW = { Baru: ["Diproses", "Ditolak"], Diproses: ["Selesai", "Ditolak"], Selesai: [], Ditolak: [] };

export function updateReport(db, admin, id, body) {
  const report = findOrThrow(db.reports, id, "Laporan");
  const status = body.status || report.status;
  const note = body.note !== undefined ? str(body.note) : report.note;
  const adminAction = body.adminAction !== undefined ? body.adminAction : report.adminAction;
  const errors = {};

  if (!REPORT_STATUS.includes(status)) errors.status = "Status tidak valid.";
  if (adminAction && !REPORT_ACTIONS.includes(adminAction)) errors.adminAction = "Tindakan tidak valid.";
  if (["Selesai", "Ditolak"].includes(report.status)) throw new HttpError(409, "Laporan yang sudah selesai/ditolak tidak dapat diubah.");
  if (status !== report.status && !REPORT_FLOW[report.status].includes(status)) throw new HttpError(409, `Status tidak dapat berubah dari ${report.status} ke ${status}.`);
  if (["Selesai", "Ditolak"].includes(status) && note.length < 5) errors.note = "Catatan/tindakan Admin wajib diisi (minimal 5 karakter).";
  if (status === "Selesai" && !adminAction) errors.adminAction = "Pilih tindakan yang diambil.";
  if (Object.keys(errors).length) fail(errors);

  if (adminAction === "Menonaktifkan kost" && status === "Selesai") {
    const kost = db.kosts.find((k) => k.id === report.kostId);
    if (kost && kost.status === "Aktif") setKostStatus(db, admin, kost.id, "Nonaktif");
  }
  const prevStatus = report.status;
  Object.assign(report, { status, note, adminAction, updatedAt: new Date().toISOString() });
  if (!report.handledBy) Object.assign(report, { handledBy: admin.id, handledByName: admin.name });
  audit(db, admin, status !== prevStatus ? `Mengubah status laporan ${report.id} menjadi ${status}` : `Memperbarui catatan laporan ${report.id}`, `Laporan: ${report.id}`, "Laporan");
  return report;
}

/* ---------- pengaturan ---------- */
export function updateProfile(db, admin, body) {
  const e = {};
  const data = { name: str(body.name), email: str(body.email).toLowerCase(), phone: str(body.phone) };
  if (data.name.length < 3) e.name = "Nama minimal 3 karakter.";
  if (!isEmail(data.email)) e.email = "Format email tidak valid.";
  else if ((db.admins || []).some((a) => a.id !== admin.id && a.email.toLowerCase() === data.email)) e.email = "Email sudah dipakai admin lain.";
  if (data.phone && !isPhone(data.phone)) e.phone = "Nomor telepon tidak valid.";
  const photo = imageField(body.photo ?? admin.photo, e, "photo", "Foto profil");
  if (Object.keys(e).length) fail(e);
  if (!Array.isArray(db.admins)) db.admins = [];
  let me = db.admins.find((a) => a.id === admin.id || a.email.toLowerCase() === data.email.toLowerCase());
  if (!me) {
    me = {
      id: String(admin.id || newId("adm")),
      name: data.name,
      username: data.email.split("@")[0],
      email: data.email,
      phone: data.phone,
      role: admin.role || "super_admin",
      photo,
      active: true,
      createdAt: toDate(),
      notifications: { newReport: true, newOwner: true, pendingKost: true, other: true },
    };
    db.admins.push(me);
  } else {
    Object.assign(me, data, { photo });
  }
  audit(db, me, "Mengubah profil Admin", `Admin: ${me.name}`, "Pengaturan");
  return publicAdmin(me);
}

export function changePassword(db, admin, sessionToken, body) {
  const e = {};
  const me = db.admins.find((a) => a.id === admin.id);
  if (!verifyPassword(String(body.currentPassword || ""), me.passwordHash)) e.currentPassword = "Password saat ini salah.";
  const next = String(body.newPassword || "");
  if (next.length < 8 || !/[A-Za-z]/.test(next) || !/\d/.test(next)) e.newPassword = "Password baru minimal 8 karakter dan mengandung huruf serta angka.";
  else if (next === body.currentPassword) e.newPassword = "Password baru harus berbeda dari password saat ini.";
  if (next !== body.confirmPassword) e.confirmPassword = "Konfirmasi password tidak cocok.";
  if (Object.keys(e).length) fail(e);
  me.passwordHash = hashPassword(next);
  // Perubahan password mengeluarkan seluruh perangkat lain.
  db.sessions = db.sessions.filter((s) => s.adminId !== me.id || s.token === sessionToken);
  audit(db, me, "Mengubah password Admin", `Admin: ${me.name}`, "Pengaturan");
}

export function updateNotifications(db, admin, body) {
  const me = db.admins.find((a) => a.id === admin.id);
  const keys = ["newReport", "newOwner", "pendingKost", "other"];
  me.notifications = keys.reduce((acc, k) => ({ ...acc, [k]: Boolean(body[k]) }), {});
  audit(db, me, "Mengubah pengaturan notifikasi", `Admin: ${me.name}`, "Pengaturan");
  return me.notifications;
}

export function updateSystem(db, admin, body) {
  const e = {};
  const strKeys = [
    "appName", "tagline", "supportEmail", "contactPhone", "whatsapp",
    "address", "instagram", "facebook", "tiktok", "youtube", "linkedin", "siteTitle", "siteDescription", "metaKeywords",
    "apkUrl", "versionName", "releaseNotes", "targetCity", "apkSize", "minAndroid",
    "heroBadge1", "heroBadge2", "bannerText", "bannerLink", "bannerType",
    "heroImageUrl", "logoUrl", "footerLogoUrl", "appIconUrl", "faviconUrl", "ogImageUrl", "githubUrl", "brandColor", "brandBgColor",
    "popupTitle", "popupContent", "popupImageUrl", "popupButtonLabel", "popupButtonUrl",
    "heroHeadline", "heroSubheadline", "heroCtaPrimaryLabel", "heroCtaSecondaryLabel", "heroCtaSecondaryLink",
    "heroAdFreeText", "heroTrustBadge1", "heroTrustBadge2", "heroTrustBadge3",
    "ownerTitle", "ownerIntro", "ownerWaLabel",
    "aboutTitle", "aboutStory",
    "feedbackTitle", "feedbackDesc", "feedbackButtonLabel",
    "finalCtaEyebrow", "finalCtaTitle", "finalCtaDesc", "finalCtaButtonLabel",
    "footerTagline", "footerCopyright",
    "securityModalTitle", "securityModalDesc", "securityModalNote",
    "legalPrivacy", "legalTerms"
  ];
  const listKeys = [
    "navLinks", "trustItems", "featureItems", "installSteps", "ownerSteps", "faqItems"
  ];

  const data = { ...(db.system || {}) };

  // Version code adalah angka build. Simpan sebagai number agar bisa
  // dibandingkan langsung dengan versionCode di build.gradle.
  const rawVersionCode = body.versionCode ?? body.version_code;
  if (rawVersionCode !== undefined && rawVersionCode !== null && rawVersionCode !== "") {
    const code = Number(rawVersionCode);
    if (!Number.isInteger(code) || code < 1) {
      e.versionCode = "Version code harus bilangan bulat minimal 1.";
    } else {
      data.versionCode = code;
    }
  }

  // Update string keys
  strKeys.forEach((k) => {
    if (body[k] !== undefined) data[k] = str(body[k]);
  });

  // Support snake_case input mappings for string keys
  if (body.footer_logo_url !== undefined && body.footerLogoUrl === undefined) data.footerLogoUrl = str(body.footer_logo_url);
  if (body.app_icon_url !== undefined && body.appIconUrl === undefined) data.appIconUrl = str(body.app_icon_url);
  if (body.popup_title !== undefined && body.popupTitle === undefined) data.popupTitle = str(body.popup_title);
  if (body.popup_content !== undefined && body.popupContent === undefined) data.popupContent = str(body.popup_content);
  if (body.popup_image_url !== undefined && body.popupImageUrl === undefined) data.popupImageUrl = str(body.popup_image_url);
  if (body.popup_button_label !== undefined && body.popupButtonLabel === undefined) data.popupButtonLabel = str(body.popup_button_label);
  if (body.popup_button_url !== undefined && body.popupButtonUrl === undefined) data.popupButtonUrl = str(body.popup_button_url);

  // Update list keys
  listKeys.forEach((k) => {
    if (Array.isArray(body[k])) {
      data[k] = body[k];
    }
  });

  // Update boolean keys
  if (body.bannerActive !== undefined) data.bannerActive = Boolean(body.bannerActive);
  else if (body.banner_active !== undefined) data.bannerActive = Boolean(body.banner_active);

  if (body.popupActive !== undefined) data.popupActive = Boolean(body.popupActive);
  else if (body.popup_active !== undefined) data.popupActive = Boolean(body.popup_active);

  if (body.securityModalActive !== undefined) data.securityModalActive = Boolean(body.securityModalActive);
  else if (body.security_modal_active !== undefined) data.securityModalActive = Boolean(body.security_modal_active);

  if (body.feedbackActive !== undefined) data.feedbackActive = Boolean(body.feedbackActive);
  else if (body.feedback_active !== undefined) data.feedbackActive = Boolean(body.feedback_active);

  if (data.appName && data.appName.length < 2) e.appName = "Nama aplikasi wajib diisi.";
  if (data.supportEmail && !isEmail(data.supportEmail)) e.supportEmail = "Format email support tidak valid.";
  if (data.contactPhone && !isPhone(data.contactPhone)) e.contactPhone = "Nomor kontak tidak valid.";
  if (data.whatsapp && !/^\d{9,15}$/.test(data.whatsapp)) e.whatsapp = "Gunakan format internasional tanpa +, contoh 6281234567890.";
  ["instagram", "facebook", "tiktok", "youtube", "linkedin", "githubUrl"].forEach((k) => {
    if (data[k] && !/^https?:\/\/[^\s]+$/.test(data[k])) e[k] = "Link harus diawali http:// atau https://.";
  });
  if (data.apkUrl && !/^(\/releases\/|https?:\/\/[^\s]+)/.test(data.apkUrl)) e.apkUrl = "URL APK harus diawali http://, https://, atau /releases/.";
  if (!data.siteTitle && body.siteTitle !== undefined) e.siteTitle = "Judul website wajib diisi.";
  if (Object.keys(e).length) fail(e);

  // Synchronize snake_case aliases so both naming styles are always identical
  data.app_name = data.appName;
  data.contact_whatsapp = data.whatsapp;
  data.apk_url = data.apkUrl;
  data.version_name = data.versionName;
  if (data.versionCode !== undefined) data.version_code = data.versionCode;
  data.release_notes = data.releaseNotes;
  data.support_email = data.supportEmail;
  data.contact_phone = data.contactPhone;
  data.office_address = data.address;
  data.site_title = data.siteTitle;
  data.site_description = data.siteDescription;
  data.meta_keywords = data.metaKeywords;
  data.target_city = data.targetCity;
  data.apk_size = data.apkSize;
  data.min_android = data.minAndroid;
  data.hero_badge_1 = data.heroBadge1;
  data.hero_badge_2 = data.heroBadge2;
  data.banner_active = Boolean(data.bannerActive);
  data.banner_text = data.bannerText || "";
  data.banner_link = data.bannerLink || "";
  data.banner_type = data.bannerType || "promo";
  data.hero_image_url = data.heroImageUrl || "";
  data.logo_url = data.logoUrl || "";
  data.footer_logo_url = data.footerLogoUrl || "";
  data.app_icon_url = data.appIconUrl || "";
  data.favicon_url = data.faviconUrl || "";
  data.og_image_url = data.ogImageUrl || "";
  data.popup_active = Boolean(data.popupActive);
  data.popup_title = data.popupTitle || "";
  data.popup_content = data.popupContent || "";
  data.popup_image_url = data.popupImageUrl || "";
  data.popup_button_label = data.popupButtonLabel || "";
  data.popup_button_url = data.popupButtonUrl || "";
  data.github_url = data.githubUrl || "https://github.com/WalZetass-kar/CariKostKita";
  data.brand_color = data.brandColor || "#6D0808";

  data.nav_links = data.navLinks || [];
  data.trust_items = data.trustItems || [];
  data.feature_items = data.featureItems || [];
  data.install_steps = data.installSteps || [];
  data.owner_steps = data.ownerSteps || [];
  data.faq_items = data.faqItems || [];

  data.hero_headline = data.heroHeadline;
  data.hero_subheadline = data.heroSubheadline;
  data.hero_cta_primary_label = data.heroCtaPrimaryLabel;
  data.hero_cta_secondary_label = data.heroCtaSecondaryLabel;
  data.hero_cta_secondary_link = data.heroCtaSecondaryLink;
  data.hero_ad_free_text = data.heroAdFreeText;
  data.hero_trust_badge_1 = data.heroTrustBadge1;
  data.hero_trust_badge_2 = data.heroTrustBadge2;
  data.hero_trust_badge_3 = data.heroTrustBadge3;

  data.owner_title = data.ownerTitle;
  data.owner_intro = data.ownerIntro;
  data.owner_wa_label = data.ownerWaLabel;
  data.about_title = data.aboutTitle;
  data.about_story = data.aboutStory;
  data.feedback_active = Boolean(data.feedbackActive ?? true);
  data.feedback_title = data.feedbackTitle;
  data.feedback_desc = data.feedbackDesc;
  data.feedback_button_label = data.feedbackButtonLabel;

  data.final_cta_eyebrow = data.finalCtaEyebrow;
  data.final_cta_title = data.finalCtaTitle;
  data.final_cta_desc = data.finalCtaDesc;
  data.final_cta_button_label = data.finalCtaButtonLabel;

  data.footer_tagline = data.footerTagline;
  data.footer_copyright = data.footerCopyright;

  data.security_modal_active = Boolean(data.securityModalActive ?? true);
  data.security_modal_title = data.securityModalTitle;
  data.security_modal_desc = data.securityModalDesc;
  data.security_modal_note = data.securityModalNote;

  data.legal_privacy = data.legalPrivacy;
  data.legal_terms = data.legalTerms;

  db.system = data;
  audit(db, admin, "Mengubah pengaturan sistem & landing page", "Pengaturan: Landing Page", "Pengaturan");
  return db.system;
}


/* ---------- statistik ---------- */
function buckets(period) {
  const today = toDate();
  const out = [];
  const [y, m] = today.split("-").map(Number);
  if (period === "harian") {
    for (let i = 13; i >= 0; i -= 1) {
      const d = addDays(today, -i);
      out.push({ label: `${d.slice(8)}/${d.slice(5, 7)}`, from: d, to: d });
    }
  } else if (period === "mingguan") {
    for (let i = 7; i >= 0; i -= 1) {
      const to = addDays(today, -i * 7);
      const from = addDays(to, -6);
      out.push({ label: `${from.slice(8)}/${from.slice(5, 7)}`, from, to });
    }
  } else if (period === "tahunan") {
    for (let i = 4; i >= 0; i -= 1) out.push({ label: String(y - i), from: `${y - i}-01-01`, to: `${y - i}-12-31` });
  } else {
    for (let i = 9; i >= 0; i -= 1) {
      const d = new Date(Date.UTC(y, m - 1 - i, 1));
      const yy = d.getUTCFullYear();
      const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
      out.push({ label: MONTHS[d.getUTCMonth()], from: `${yy}-${mm}-01`, to: `${yy}-${mm}-31` });
    }
  }
  return out;
}

const countBy = (items, fn) => items.reduce((acc, item) => ({ ...acc, [fn(item)]: (acc[fn(item)] || 0) + 1 }), {});

export function computeStats(db, period = "bulanan") {
  const today = toDate();
  const b = buckets(period);
  const growth = (items, getDate) => ({ labels: b.map((x) => x.label), values: b.map((x) => items.filter((i) => { const d = String(getDate(i)).slice(0, 10); return d >= x.from && d <= x.to; }).length) });

  const adRows = db.ads.map((ad) => {
    const t = adTotals(db, ad.id);
    return { id: ad.id, title: ad.title, type: ad.type, platform: ad.platform, ...t, ctr: t.impressions ? (t.clicks / t.impressions) * 100 : 0, effective: adEffective(ad, today) };
  });
  const impressions = adRows.reduce((s, a) => s + a.impressions, 0);
  const clicks = adRows.reduce((s, a) => s + a.clicks, 0);
  const daily = buckets("harian");
  const sumRange = (key, x) => db.adEvents.filter((e) => e.date >= x.from && e.date <= x.to).reduce((s, e) => s + e[key], 0);
  const top = (key) => [...adRows].filter((a) => a[key] > 0).sort((a, c) => c[key] - a[key])[0] || null;

  const reportCounts = REPORT_STATUS.reduce((acc, s) => ({ ...acc, [s]: db.reports.filter((r) => r.status === s).length }), {});
  const kostCounts = KOST_STATUS.reduce((acc, s) => ({ ...acc, [s]: db.kosts.filter((k) => k.status === s).length }), {});

  return {
    period,
    totals: {
      kost: db.kosts.length, kostActive: kostCounts.Aktif, kostPending: kostCounts["Menunggu Verifikasi"], kostRejected: kostCounts.Ditolak, kostInactive: kostCounts.Nonaktif,
      owners: db.owners.length, ownersPending: db.owners.filter((o) => o.verificationStatus === "Pending").length,
      users: db.users.length, reports: db.reports.length, reportsNew: reportCounts.Baru, adsActive: adRows.filter((a) => a.effective === "Aktif").length, adsFinished: adRows.filter((a) => a.effective === "Selesai").length,
    },
    kostGrowth: growth(db.kosts, (k) => k.createdAt),
    userGrowth: growth(db.users, (u) => u.createdAt),
    ownerGrowth: growth(db.owners, (o) => o.createdAt),
    kostStatus: kostCounts,
    kostArea: countBy(db.kosts, (k) => k.area),
    reportStatus: reportCounts,
    ads: {
      impressions, clicks, ctr: impressions ? (clicks / impressions) * 100 : 0,
      series: { labels: b.map((x) => x.label), impressions: b.map((x) => sumRange("impressions", x)), clicks: b.map((x) => sumRange("clicks", x)) },
      daily: { labels: daily.map((x) => x.label), impressions: daily.map((x) => sumRange("impressions", x)), clicks: daily.map((x) => sumRange("clicks", x)) },
      comparison: adRows, mostViewed: top("impressions"), mostClicked: top("clicks"),
    },
  };
}

/* ---------- payload awal ---------- */
export function loadAll(db, admin) {
  const ownerOf = (id) => db.owners.find((o) => o.id === id);
  const userOf = (id) => db.users.find((u) => u.id === id);
  const readSet = new Set(db.readNotifications || []);

  const notifications = [];
  db.owners.filter((o) => o.verificationStatus === "Pending" && !o.archived).forEach((o) => {
    notifications.push({
      id: `notif-own-${o.id}`,
      type: "owner",
      title: "Pemilik Baru Menunggu Verifikasi",
      message: `${o.name} mendaftarkan akun pemilik kost.`,
      time: o.submittedAt || o.createdAt,
      targetView: "owners",
      targetId: o.id,
      read: readSet.has(`notif-own-${o.id}`),
    });
  });
  db.reports.filter((r) => r.status === "Baru").forEach((r) => {
    notifications.push({
      id: `notif-rep-${r.id}`,
      type: "report",
      title: "Laporan Kost Baru",
      message: `${r.id} (${r.type}) dilaporkan pada ${r.kostName}.`,
      time: r.createdAt,
      targetView: "reports",
      targetId: r.id,
      read: readSet.has(`notif-rep-${r.id}`),
    });
  });
  db.kosts.filter((k) => k.status === "Menunggu Verifikasi" && !k.archived).forEach((k) => {
    notifications.push({
      id: `notif-kst-${k.id}`,
      type: "kost",
      title: "Kost Baru Perlu Review",
      message: `${k.name} di ${k.area} menunggu persetujuan admin.`,
      time: k.createdAt,
      targetView: "kost",
      targetId: k.id,
      read: readSet.has(`notif-kst-${k.id}`),
    });
  });
  const soon = (ad) => adEffective(ad) === "Aktif" && (new Date(`${ad.end}T23:59:59`) - Date.now()) / 86400000 <= 3;
  db.ads.filter(soon).forEach((a) => {
    notifications.push({
      id: `notif-ad-${a.id}`,
      type: "ad",
      title: "Iklan Akan Berakhir",
      message: `Iklan "${a.title}" berakhir pada ${a.end}.`,
      time: a.updatedAt || a.createdAt,
      targetView: "ads",
      targetId: a.id,
      read: readSet.has(`notif-ad-${a.id}`),
    });
  });
  notifications.sort((a, b) => new Date(b.time) - new Date(a.time));

  return {
    admin: publicAdmin(admin),
    kosts: db.kosts.map((k) => ({
      ...k,
      ownerName: ownerOf(k.ownerId)?.name || "-",
      ownerEmail: ownerOf(k.ownerId)?.email || "-",
      ownerPhone: ownerOf(k.ownerId)?.phone || "-",
      ownerVerification: ownerOf(k.ownerId)?.verificationStatus || "-",
      reports: db.reports.filter((r) => r.kostId === k.id).map((r) => ({ id: r.id, type: r.type, status: r.status, createdAt: r.createdAt, reporterName: r.reporterName || userOf(r.reporterId)?.name || "-" })),
      timeline: buildTimeline(db, "Kost", k.id, k.name, k.createdAt),
    })),
    owners: db.owners.map((o) => ({
      ...o,
      kostCount: db.kosts.filter((k) => k.ownerId === o.id).length,
      kosts: db.kosts.filter((k) => k.ownerId === o.id).map((k) => ({ id: k.id, name: k.name, status: k.status, price: k.price, area: k.area })),
      timeline: buildTimeline(db, "Pemilik", o.id, o.name, o.createdAt),
    })),
    users: db.users.map((u) => ({
      ...u,
      reports: db.reports.filter((r) => r.reporterId === u.id).map((r) => ({ id: r.id, kostName: r.kostName, type: r.type, status: r.status, createdAt: r.createdAt })),
      timeline: buildTimeline(db, "Pengguna", u.id, u.name, u.createdAt),
    })),
    reports: db.reports.map((r) => ({
      ...r,
      reporterName: r.reporterName || userOf(r.reporterId)?.name || "-",
      reporterEmail: userOf(r.reporterId)?.email || "-",
      reporterPhone: userOf(r.reporterId)?.phone || "-",
      timeline: buildTimeline(db, "Laporan", r.id, r.id, r.createdAt),
    })),
    ads: db.ads.map((a) => ({
      ...a,
      ...adTotals(db, a.id),
      effective: adEffective(a),
      timeline: buildTimeline(db, "Iklan", a.id, a.title, a.createdAt),
    })),
    audit: db.audit.slice(0, 500),
    system: db.system,
    admins: db.admins.map((a) => ({ id: a.id, name: a.name, username: a.username, email: a.email, role: a.role, active: a.active, phone: a.phone || "", createdAt: a.createdAt })),
    notifications,
  };
}

export function markNotificationRead(db, admin, id) {
  if (!db.readNotifications) db.readNotifications = [];
  if (!db.readNotifications.includes(id)) db.readNotifications.push(id);
  return { success: true };
}

export function markAllNotificationsRead(db, admin) {
  if (!db.readNotifications) db.readNotifications = [];
  const data = loadAll(db, admin);
  (data.notifications || []).forEach((n) => {
    if (!db.readNotifications.includes(n.id)) db.readNotifications.push(n.id);
  });
  return { success: true };
}

export function globalSearch(db, admin, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return { results: [] };
  const results = [];

  db.kosts.forEach((k) => {
    if (k.name.toLowerCase().includes(q) || k.area.toLowerCase().includes(q) || k.address.toLowerCase().includes(q)) {
      results.push({
        id: k.id,
        category: "Kost",
        title: k.name,
        subtitle: `${k.area} · Rp${Number(k.price).toLocaleString("id-ID")} · Status: ${k.status}`,
        targetView: "kost",
        targetId: k.id,
      });
    }
  });

  db.owners.forEach((o) => {
    if (o.name.toLowerCase().includes(q) || o.email.toLowerCase().includes(q) || o.phone.toLowerCase().includes(q)) {
      results.push({
        id: o.id,
        category: "Pemilik",
        title: o.name,
        subtitle: `${o.email} · ${o.phone} · Status: ${o.verificationStatus}`,
        targetView: "owners",
        targetId: o.id,
      });
    }
  });

  db.users.forEach((u) => {
    if (u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.phone && u.phone.toLowerCase().includes(q))) {
      results.push({
        id: u.id,
        category: "Pengguna",
        title: u.name,
        subtitle: `${u.email} · Status: ${u.status}`,
        targetView: "users",
        targetId: u.id,
      });
    }
  });

  db.reports.forEach((r) => {
    if (r.id.toLowerCase().includes(q) || r.kostName.toLowerCase().includes(q) || r.type.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)) {
      results.push({
        id: r.id,
        category: "Laporan",
        title: `${r.id} - ${r.type}`,
        subtitle: `Kost: ${r.kostName} · Status: ${r.status}`,
        targetView: "reports",
        targetId: r.id,
      });
    }
  });

  return { results: results.slice(0, 20) };
}

/* ---------- kelola admin (super_admin) ---------- */
export function listAdmins(db, admin) {
  return db.admins.map((a) => ({
    id: a.id,
    name: a.name,
    username: a.username,
    email: a.email,
    phone: a.phone || "",
    role: a.role,
    active: a.active,
    createdAt: a.createdAt,
  }));
}

export function createAdmin(db, admin, body) {
  if (admin.role !== "super_admin") throw new HttpError(403, "Hanya Super Admin yang dapat menambah admin.");
  const name = str(body.name);
  const username = str(body.username).toLowerCase();
  const email = str(body.email).toLowerCase();
  const phone = str(body.phone);
  const role = str(body.role);
  const password = String(body.password || "");
  const errors = {};
  if (name.length < 3) errors.name = "Nama admin minimal 3 karakter.";
  if (username.length < 3) errors.username = "Username minimal 3 karakter.";
  else if (db.admins.some((a) => a.username.toLowerCase() === username)) errors.username = "Username sudah digunakan.";
  if (!isEmail(email)) errors.email = "Email tidak valid.";
  else if (db.admins.some((a) => a.email.toLowerCase() === email)) errors.email = "Email sudah digunakan.";
  if (!ROLES.includes(role)) errors.role = "Pilih role yang valid.";
  if (password.length < 8) errors.password = "Password minimal 8 karakter.";
  if (Object.keys(errors).length) fail(errors);

  const newAdmin = {
    id: newId("adm"),
    name,
    username,
    email,
    phone,
    role,
    photo: "",
    passwordHash: hashPassword(password),
    active: true,
    createdAt: toDate(),
    notifications: { newReport: true, newOwner: true, pendingKost: true, other: true },
  };
  db.admins.push(newAdmin);
  audit(db, admin, `Menambahkan admin baru ${name} (${role})`, `Admin: ${name}`, "Pengaturan");
  return publicAdmin(newAdmin);
}

export function updateAdmin(db, admin, id, body) {
  if (admin.role !== "super_admin") throw new HttpError(403, "Hanya Super Admin yang dapat mengedit admin.");
  const target = findOrThrow(db.admins, id, "Admin");
  const errors = {};
  if (body.name !== undefined) {
    const name = str(body.name);
    if (name.length < 3) errors.name = "Nama minimal 3 karakter.";
    target.name = name;
  }
  if (body.email !== undefined) {
    const email = str(body.email).toLowerCase();
    if (!isEmail(email)) errors.email = "Format email tidak valid.";
    else if (db.admins.some((a) => a.id !== id && a.email.toLowerCase() === email)) errors.email = "Email sudah dipakai admin lain.";
    target.email = email;
  }
  if (body.role !== undefined) {
    if (!ROLES.includes(body.role)) errors.role = "Role tidak valid.";
    else if (target.id === admin.id && body.role !== "super_admin") errors.role = "Tidak dapat mencabut hak Super Admin dari akun Anda sendiri.";
    else target.role = body.role;
  }
  if (body.active !== undefined) {
    if (target.id === admin.id && !body.active) errors.active = "Tidak dapat menonaktifkan akun sendiri.";
    else target.active = Boolean(body.active);
  }
  if (body.phone !== undefined) target.phone = str(body.phone);
  if (body.password) {
    const p = String(body.password);
    if (p.length < 8) errors.password = "Password minimal 8 karakter.";
    else target.passwordHash = hashPassword(p);
  }
  if (Object.keys(errors).length) fail(errors);
  audit(db, admin, `Memperbarui data admin ${target.name}`, `Admin: ${target.name}`, "Pengaturan");
  return publicAdmin(target);
}

export function deleteAdmin(db, admin, id) {
  if (admin.role !== "super_admin") throw new HttpError(403, "Hanya Super Admin yang dapat menghapus admin.");
  if (id === admin.id) throw new HttpError(409, "Tidak dapat menghapus akun sendiri.");
  const target = findOrThrow(db.admins, id, "Admin");
  db.admins = db.admins.filter((a) => a.id !== id);
  db.sessions = db.sessions.filter((s) => s.adminId !== id);
  audit(db, admin, `Menghapus akun admin ${target.name}`, `Admin: ${target.name}`, "Pengaturan");
  return { success: true };
}

export function listSessions(db, admin, currentToken) {
  const now = Date.now();
  return db.sessions
    .filter((s) => s.adminId === admin.id && s.expiresAt > now)
    .map((s) => ({ id: s.id, device: s.device, ip: s.ip, createdAt: s.createdAt, lastActive: s.lastActive, expiresAt: new Date(s.expiresAt).toISOString(), current: s.token === currentToken }));
}

export function revokeSession(db, admin, currentToken, id) {
  const target = db.sessions.find((s) => s.adminId === admin.id && s.id === id);
  if (!target) throw new HttpError(404, "Session tidak ditemukan.");
  if (target.token === currentToken) throw new HttpError(409, "Gunakan tombol Logout untuk keluar dari session ini.");
  db.sessions = db.sessions.filter((s) => s !== target);
  audit(db, admin, `Mengeluarkan perangkat ${target.device}`, `Admin: ${admin.name}`, "Pengaturan");
}

export function revokeOtherSessions(db, admin, currentToken) {
  const before = db.sessions.length;
  db.sessions = db.sessions.filter((s) => s.adminId !== admin.id || s.token === currentToken);
  audit(db, admin, "Mengeluarkan semua perangkat lain", `Admin: ${admin.name}`, "Pengaturan");
  return before - db.sessions.length;
}
