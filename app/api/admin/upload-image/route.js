import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Vercel Functions accept request bodies up to 4.5 MB. The browser resizes
// raster images before uploading, so normal CMS assets stay well below this.
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const NO_STORE = { "Cache-Control": "no-store, max-age=0" };
const MIME_BY_EXTENSION = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
};

const json = (payload, status = 200) =>
  NextResponse.json(payload, { status, headers: NO_STORE });

export async function POST(request) {
  try {
    const auth = await requireAdmin(["super_admin", "admin", "marketing"]);
    if (!auth) {
      return json({ error: "Unauthorized" }, 401);
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return json({ error: "Berkas gambar tidak ditemukan." }, 400);
    }

    const originalName = String(file.name || "image.png");
    const extMatch = originalName.match(/\.(png|jpg|jpeg|webp|svg)$/i);
    if (!extMatch) {
      return json(
        { error: "Format gambar harus .png, .jpg, .jpeg, .webp, atau .svg" },
        400
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.length === 0) {
      return json({ error: "Berkas gambar kosong." }, 400);
    }
    if (bytes.length > MAX_IMAGE_BYTES) {
      return json(
        {
          error:
            "Ukuran gambar maksimal 4 MB setelah dikompres. " +
            "Pilih gambar yang lebih kecil lalu coba lagi.",
          code: "IMAGE_TOO_LARGE",
        },
        413
      );
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      console.error("Image upload rejected: BLOB_READ_WRITE_TOKEN is not configured");
      return json(
        {
          error:
            "Penyimpanan berkas belum dikonfigurasi. Hubungkan Vercel Blob " +
            "ke proyek Admin lalu coba lagi.",
          code: "BLOB_NOT_CONFIGURED",
        },
        503
      );
    }

    const extension = extMatch[1].toLowerCase();
    const sanitizedBase =
      originalName
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .replace(/\.[^.]+$/, "")
        .replace(/^_+|_+$/g, "") || "image";
    const stamp = new Date()
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\..+$/, "");
    const safeFileName = `${sanitizedBase}.${extension}`;
    const pathname = `uploads/${stamp}/${safeFileName}`;

    const blob = await put(pathname, bytes, {
      access: "public",
      contentType: MIME_BY_EXTENSION[extension] || file.type || "application/octet-stream",
      addRandomSuffix: false,
      cacheControlMaxAge: 60 * 60 * 24 * 365,
      token,
    });

    return json({
      success: true,
      url: blob.url,
      fileName: safeFileName,
      storage: "vercel-blob",
    });
  } catch (error) {
    console.error("Image upload error:", error);
    return json(
      { error: error.message || "Gagal mengunggah berkas gambar." },
      Number.isInteger(error.status) ? error.status : 500
    );
  }
}
