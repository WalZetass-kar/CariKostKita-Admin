import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const APK_MIME = "application/vnd.android.package-archive";
// Vercel Functions accept request bodies up to 4.5 MB. Keep a small safety
// margin and tell the administrator to use a release URL for larger builds.
const MAX_APK_BYTES = 4 * 1024 * 1024;
const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

const json = (payload, status = 200) =>
  NextResponse.json(payload, { status, headers: NO_STORE });

const safeVersion = (raw) =>
  String(raw || "")
    .trim()
    .replace(/[^0-9A-Za-z._-]/g, "")
    .replace(/^[vV]/, "");

const formatSize = (bytes) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

export async function POST(request) {
  try {
    const auth = await requireAdmin(["super_admin", "admin"]);
    if (!auth) {
      return json({ error: "Unauthorized" }, 401);
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return json({ error: "Berkas APK tidak ditemukan dalam permintaan." }, 400);
    }

    const originalName = String(file.name || "app-release.apk");
    if (!originalName.toLowerCase().endsWith(".apk")) {
      return json({ error: "Format berkas harus berekstensi .apk" }, 400);
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.length === 0) {
      return json({ error: "Berkas APK kosong." }, 400);
    }
    if (bytes.length > MAX_APK_BYTES) {
      return json(
        {
          error:
            "Ukuran APK maksimal 4 MB untuk unggahan dashboard. " +
            "Untuk berkas yang lebih besar, gunakan URL rilis resmi.",
          code: "APK_TOO_LARGE",
        },
        413
      );
    }

    // APK is a ZIP container. Reject files that only have an .apk extension
    // instead of silently publishing an unusable release.
    if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
      return json(
        {
          error: "Berkas bukan APK yang valid (header ZIP tidak ditemukan).",
          code: "APK_INVALID",
        },
        400
      );
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      console.error("APK upload rejected: BLOB_READ_WRITE_TOKEN is not configured");
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

    // The version is optional. Prefer the value explicitly supplied by the
    // form; fall back to a version embedded in the uploaded filename.
    const requestedVersion = safeVersion(formData.get("version"));
    const versionFromName =
      (originalName.match(/v?(\d+\.\d+\.\d+(?:[-._][0-9A-Za-z]+)?)/i) || [])[1] || "";
    const version = requestedVersion || safeVersion(versionFromName);
    const sanitizedBase =
      originalName
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .replace(/\.apk$/i, "")
        .replace(/^_+|_+$/g, "") || "CariKostKita-release";
    const baseName = version
      ? `CariKostKita-v${version}-release`
      : sanitizedBase;

    // A timestamped folder keeps each upload immutable and cacheable while
    // preserving a friendly download filename.
    const stamp = new Date()
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\..+$/, "");
    const pathname = `releases/${stamp}/${baseName}.apk`;

    const blob = await put(pathname, bytes, {
      access: "public",
      contentType: APK_MIME,
      addRandomSuffix: false,
      cacheControlMaxAge: 60 * 60 * 24 * 365,
      token,
    });

    return json({
      success: true,
      url: blob.url,
      size: formatSize(bytes.length),
      sizeBytes: bytes.length,
      fileName: `${baseName}.apk`,
      originalName,
      version: version || null,
      storage: "vercel-blob",
    });
  } catch (error) {
    console.error("APK upload error:", error);
    return json(
      { error: error.message || "Gagal mengunggah berkas APK." },
      Number.isInteger(error.status) ? error.status : 500
    );
  }
}
