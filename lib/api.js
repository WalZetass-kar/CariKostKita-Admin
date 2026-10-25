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
export function readImage(file, maxSize = 1000) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve("");
    if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) return reject(new Error("Format gambar harus PNG, JPG, WEBP, atau GIF."));
    if (file.size > 8 * 1024 * 1024) return reject(new Error("Ukuran gambar maksimal 8 MB."));
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
        resolve(canvas.toDataURL("image/jpeg", 0.82));
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
  return new File([blob], `${safeBase}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}
