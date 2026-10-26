import { createHash } from "node:crypto";
import { put } from "@vercel/blob";

/**
 * Legacy CMS documents sometimes contain `data:image/...;base64,...` values.
 * Those values are not allowed in `platform_settings`: they inflate the
 * document past the durable-store limit and make every save fail with 413.
 *
 * This module moves inline images to Vercel Blob before the dashboard forwards
 * a settings PATCH to FastAPI. It is deliberately server-side so even a tab
 * that is still running an older dashboard bundle can be repaired without the
 * administrator having to upload every image again.
 */

const MAX_INLINE_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_INLINE_IMAGES = 25;
const MIME_TO_EXTENSION = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
  ["image/svg+xml", "svg"],
]);

export class InlineSettingsImageError extends Error {
  constructor(message, { status = 400, code = "INLINE_SETTINGS_IMAGE", fields = [] } = {}) {
    super(message);
    this.name = "InlineSettingsImageError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

const isInlineImage = (value) =>
  typeof value === "string" && value.startsWith("data:image/");

function collectInlineImages(value, path, found) {
  if (typeof value === "string") {
    if (isInlineImage(value)) found.push({ path, value });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((child, index) =>
      collectInlineImages(child, `${path}[${index}]`, found)
    );
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      collectInlineImages(child, path ? `${path}.${key}` : key, found);
    }
  }
}

function replaceInlineImages(value, replacements) {
  if (typeof value === "string") {
    return replacements.get(value) || value;
  }
  if (Array.isArray(value)) {
    return value.map((child) => replaceInlineImages(child, replacements));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        replaceInlineImages(child, replacements),
      ])
    );
  }
  return value;
}

function parseInlineImage(dataUrl, field) {
  const comma = dataUrl.indexOf(",");
  const header = comma >= 0 ? dataUrl.slice(0, comma).toLowerCase() : "";
  if (!header.startsWith("data:image/") || !header.endsWith(";base64")) {
    throw new InlineSettingsImageError(
      `Gambar pada "${field}" harus berupa data URL Base64 yang valid.`,
      { fields: [field] }
    );
  }

  const mimeWithParams = header.slice("data:".length, -";base64".length);
  const rawMime = mimeWithParams.split(";")[0].trim();
  const mime = rawMime === "image/jpg" ? "image/jpeg" : rawMime;
  const extension = MIME_TO_EXTENSION.get(mime);
  if (!extension) {
    throw new InlineSettingsImageError(
      `Format gambar pada "${field}" tidak didukung. Gunakan PNG, JPG, WEBP, atau SVG.`,
      { fields: [field] }
    );
  }

  const base64 = dataUrl.slice(comma + 1).replace(/\s+/g, "");
  if (!base64) {
    throw new InlineSettingsImageError(
      `Gambar pada "${field}" kosong sehingga tidak dapat dipindahkan.`,
      { fields: [field] }
    );
  }

  const bytes = Buffer.from(base64, "base64");
  if (!bytes.length) {
    throw new InlineSettingsImageError(
      `Gambar pada "${field}" tidak berisi data yang valid.`,
      { fields: [field] }
    );
  }
  if (bytes.length > MAX_INLINE_IMAGE_BYTES) {
    throw new InlineSettingsImageError(
      `Gambar pada "${field}" lebih dari 4 MB. Unggah ulang melalui tombol Upload.`,
      { status: 413, code: "INLINE_IMAGE_TOO_LARGE", fields: [field] }
    );
  }

  return { mime, extension, bytes };
}

function safeFieldBase(field) {
  return (
    String(field || "image")
      .replace(/\[\d+\]/g, "")
      .split(".")
      .pop()
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "image"
  );
}

async function uploadInlineImage(dataUrl, field, token) {
  const parsed = parseInlineImage(dataUrl, field);
  const digest = createHash("sha256").update(parsed.bytes).digest("hex").slice(0, 12);
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\..+$/, "");
  const pathname = `uploads/settings/${stamp}/${safeFieldBase(field)}-${digest}.${parsed.extension}`;

  const blob = await put(pathname, parsed.bytes, {
    access: "public",
    contentType: parsed.mime,
    addRandomSuffix: false,
    cacheControlMaxAge: 60 * 60 * 24 * 365,
    token,
  });
  return blob.url;
}

/**
 * Return a copy of `payload` with every inline image replaced by a public
 * object-storage URL. Identical data URLs (for example camelCase and
 * snake_case aliases) are uploaded only once.
 *
 * Pass `upload` to substitute a test double. The default uses Vercel Blob.
 */
export async function materializeInlineSettingsImages(payload, { upload } = {}) {
  if (!payload || typeof payload !== "object") {
    return { payload, migratedFields: [], uploadedImages: 0 };
  }

  const found = [];
  collectInlineImages(payload, "", found);
  if (!found.length) {
    return { payload, migratedFields: [], uploadedImages: 0 };
  }

  const byValue = new Map();
  for (const item of found) {
    if (!byValue.has(item.value)) {
      byValue.set(item.value, { value: item.value, fields: [] });
    }
    byValue.get(item.value).fields.push(item.path || "image");
  }
  if (byValue.size > MAX_INLINE_IMAGES) {
    throw new InlineSettingsImageError(
      `Terlalu banyak gambar Base64 (${byValue.size}). Maksimal ${MAX_INLINE_IMAGES} gambar per penyimpanan.`,
      { fields: found.map((item) => item.path) }
    );
  }

  const token = (process.env.BLOB_READ_WRITE_TOKEN || "").trim();
  if (!upload && !token) {
    throw new InlineSettingsImageError(
      "Gambar lama masih berupa Base64, tetapi penyimpanan objek belum dikonfigurasi. " +
        "Hubungkan Vercel Blob ke proyek Admin lalu coba lagi.",
      {
        status: 503,
        code: "BLOB_NOT_CONFIGURED",
        fields: found.map((item) => item.path),
      }
    );
  }

  const uploader =
    upload ||
    ((value, field) => uploadInlineImage(value, field || "image", token));
  const replacements = new Map();

  for (const [value, info] of byValue) {
    const field = info.fields[0] || "image";
    try {
      // Validate even when a custom uploader is supplied: an unsupported MIME
      // or an oversized image must never reach object storage.
      parseInlineImage(value, field);
      const url = await uploader(value, field);
      if (typeof url !== "string" || !/^https?:\/\//i.test(url)) {
        throw new Error("Penyimpanan tidak mengembalikan URL publik.");
      }
      replacements.set(value, url);
    } catch (error) {
      if (error instanceof InlineSettingsImageError) throw error;
      throw new InlineSettingsImageError(
        `Gagal memindahkan gambar lama pada "${info.fields.join(", ")}" ke penyimpanan objek: ${
          error?.message || "kesalahan penyimpanan"
        }`,
        {
          status: 502,
          code: "INLINE_IMAGE_UPLOAD_FAILED",
          fields: info.fields,
        }
      );
    }
  }

  return {
    payload: replaceInlineImages(payload, replacements),
    migratedFields: found.map((item) => item.path),
    uploadedImages: byValue.size,
  };
}
