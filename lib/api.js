export class ApiError extends Error {
  constructor(message, status, fields) {
    super(message);
    this.status = status;
    this.fields = fields || null;
  }
}

/** Client untuk REST API Admin. Redirect otomatis ke login jika session berakhir. */
export async function api(path, { method = "GET", body } = {}) {
  let res;
  try {
    res = await fetch(`/api/admin/${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError("Tidak dapat terhubung ke server. Periksa koneksi Anda.", 0);
  }
  let json = {};
  try {
    json = await res.json();
  } catch {}
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") window.location.replace("/login?expired=1");
    throw new ApiError(json.error || "Terjadi kesalahan pada server.", res.status, json.fields);
  }
  return json;
}

/**
 * Kompres gambar di browser untuk pratinjau/upload. Jangan menyimpan hasil
 * data URL ke settings: CMS hanya boleh berisi URL object storage yang pendek.
 */
export function readImage(file, maxSize = 1200) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve("");
    if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) return reject(new Error("Format gambar harus PNG, JPG, WEBP, atau GIF."));
    if (file.size > 15 * 1024 * 1024) return reject(new Error("Ukuran gambar maksimal 15 MB."));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("File bukan gambar yang valid."));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        // Prioritaskan WebP untuk kompresi modern yang hemat disk & bandwidth
        let dataUrl = "";
        try {
          dataUrl = canvas.toDataURL("image/webp", 0.80);
        } catch (_) {}
        if (!dataUrl || !dataUrl.startsWith("data:image/webp")) {
          dataUrl = canvas.toDataURL("image/jpeg", 0.82);
        }
        resolve(dataUrl);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Siapkan berkas gambar untuk dikirim ke /api/admin/upload-image.
 *
 * Raster images are resized client-side so the multipart request stays small;
 * SVGs are sent as-is because rasterizing them would lose vector quality.
 * The returned File is uploaded to object storage, never stored as Base64.
 */
export async function prepareImageFile(file, maxSize = 1200) {
  if (!file) throw new Error("Pilih berkas gambar terlebih dahulu.");
  if (file.type === "image/svg+xml") {
    if (file.size > 4 * 1024 * 1024) {
      throw new Error("Ukuran SVG maksimal 4 MB.");
    }
    return file;
  }

  const dataUrl = await readImage(file, maxSize);
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const safeBase =
    String(file.name || "image")
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/^_+|_+$/g, "") || "image";
  const isWebp = dataUrl.startsWith("data:image/webp");
  const ext = isWebp ? "webp" : "jpg";
  const mime = isWebp ? "image/webp" : "image/jpeg";
  return new File([blob], `${safeBase}.${ext}`, {
    type: mime,
    lastModified: Date.now(),
  });
}
