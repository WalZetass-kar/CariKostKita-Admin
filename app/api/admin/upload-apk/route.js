import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import fs from "fs";
import path from "path";

export async function POST(request) {
  try {
    const auth = await requireAdmin(["super_admin", "admin"]);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "Berkas APK tidak ditemukan dalam permintaan." }, { status: 400 });
    }

    const originalName = file.name || "app-release.apk";
    if (!originalName.toLowerCase().endsWith(".apk")) {
      return NextResponse.json({ error: "Format berkas harus berekstensi .apk" }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.length === 0) {
      return NextResponse.json({ error: "Berkas APK kosong." }, { status: 400 });
    }

    // Format size e.g. "8.4 MB"
    const sizeInMb = (bytes.length / (1024 * 1024)).toFixed(1) + " MB";

    // Sanitize file name
    const sanitizedBase = originalName
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/\.apk$/i, "");
    const safeFileName = `${sanitizedBase}-${Date.now()}.apk`;

    // Target directories
    const cwd = process.cwd();
    const landingReleasesDir = path.resolve(cwd, "../Landing Page/public/releases");
    const adminReleasesDir = path.resolve(cwd, "public/releases");

    try {
      if (!fs.existsSync(landingReleasesDir)) {
        fs.mkdirSync(landingReleasesDir, { recursive: true });
      }
      fs.writeFileSync(path.join(landingReleasesDir, safeFileName), bytes);
    } catch (err) {
      console.warn("Could not write to Landing Page releases dir:", err.message);
    }

    try {
      if (!fs.existsSync(adminReleasesDir)) {
        fs.mkdirSync(adminReleasesDir, { recursive: true });
      }
      fs.writeFileSync(path.join(adminReleasesDir, safeFileName), bytes);
    } catch (err) {
      console.warn("Could not write to Admin-Gue releases dir:", err.message);
    }

    const fileUrl = `/releases/${safeFileName}`;

    return NextResponse.json({
      success: true,
      url: fileUrl,
      size: sizeInMb,
      fileName: safeFileName,
      originalName,
    });
  } catch (error) {
    console.error("APK upload error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal mengunggah berkas APK." },
      { status: error.status || 500 }
    );
  }
}
