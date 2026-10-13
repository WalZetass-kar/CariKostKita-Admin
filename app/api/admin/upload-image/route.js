import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import fs from "fs";
import path from "path";

export async function POST(request) {
  try {
    const auth = await requireAdmin(["super_admin", "admin", "marketing"]);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "Berkas gambar tidak ditemukan." }, { status: 400 });
    }

    const originalName = file.name || "image.png";
    const extMatch = originalName.match(/\.(png|jpg|jpeg|webp|svg)$/i);
    if (!extMatch) {
      return NextResponse.json({ error: "Format gambar harus .png, .jpg, .jpeg, .webp, atau .svg" }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.length === 0 || bytes.length > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Ukuran gambar tidak boleh melebihi 10 MB." }, { status: 400 });
    }

    const sanitizedBase = originalName
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/\.[^.]+$/, "");
    const safeFileName = `${sanitizedBase}-${Date.now()}${extMatch[0].toLowerCase()}`;

    // Target directories
    const cwd = process.cwd();
    const landingUploadsDir = path.resolve(cwd, "../Landing Page/public/uploads");
    const adminUploadsDir = path.resolve(cwd, "public/uploads");

    try {
      if (!fs.existsSync(landingUploadsDir)) {
        fs.mkdirSync(landingUploadsDir, { recursive: true });
      }
      fs.writeFileSync(path.join(landingUploadsDir, safeFileName), bytes);
    } catch (err) {
      console.warn("Could not write to Landing Page uploads dir:", err.message);
    }

    try {
      if (!fs.existsSync(adminUploadsDir)) {
        fs.mkdirSync(adminUploadsDir, { recursive: true });
      }
      fs.writeFileSync(path.join(adminUploadsDir, safeFileName), bytes);
    } catch (err) {
      console.warn("Could not write to Admin-Gue uploads dir:", err.message);
    }

    const fileUrl = `/uploads/${safeFileName}`;

    return NextResponse.json({
      success: true,
      url: fileUrl,
      fileName: safeFileName,
    });
  } catch (error) {
    console.error("Image upload error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal mengunggah berkas gambar." },
      { status: error.status || 500 }
    );
  }
}
