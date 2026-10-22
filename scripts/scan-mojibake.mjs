/**
 * Penjaga encoding: source tidak boleh memuat karakter CJK tak terduga.
 *
 * PowerShell 5.1 memakai codepage ANSI untuk Get-Content/Set-Content,
 * sehingga teks non-ASCII bisa rusak jadi karakter Mandarin di tengah
 * kalimat Indonesia. Kerusakan ini sulit terlihat dan sempat menimpa
 * beberapa file.
 *
 * Jalankan: npm run verify:encoding
 */

import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";

const ROOT = resolve(process.argv[2] ?? ".");
const SCAN_DIRS = ["app", "components", "lib", "scripts", "pages", "public", "docs"];
const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  "build",
  "coverage",
  ".vercel",
  "out",
]);
const EXTS = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".css",
  ".html",
  ".txt",
  ".yml",
  ".yaml",
]);

/** Rentang karakter yang hanya mungkin muncul karena salah encoding. */
const CJK_RANGES = [
  [0x3000, 0x303f], // CJK punctuation
  [0x3400, 0x4dbf], // Extension A
  [0x4e00, 0x9fff], // Unified Ideographs
  [0xac00, 0xd7af], // Hangul syllables
  [0xf900, 0xfaff], // Compatibility ideographs
  [0xff00, 0xffef], // Fullwidth forms
];

function isCjk(ch) {
  const code = ch.codePointAt(0);
  return CJK_RANGES.some(([low, high]) => code >= low && code <= high);
}

async function* walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      yield* walk(join(dir, entry.name));
    } else if (entry.isFile()) {
      yield join(dir, entry.name);
    }
  }
}

const offenders = [];
let scanned = 0;

for (const folder of SCAN_DIRS) {
  const dir = join(ROOT, folder);
  const info = await stat(dir).catch(() => null);
  if (!info || !info.isDirectory()) continue;
  for await (const file of walk(dir)) {
    if (!EXTS.has(extname(file).toLowerCase())) continue;
    let text;
    try {
      text = await readFile(file, "utf8");
    } catch {
      continue;
    }
    scanned += 1;
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      const bad = [...line].filter(isCjk);
      if (bad.length > 0) {
        const codes = bad.map((c) => "U+" + c.codePointAt(0).toString(16).toUpperCase().padStart(4, "0"));
        offenders.push(
          `  ${relative(ROOT, file)}:${i + 1}  [${codes.join(" ")}]  ${line.trim().slice(0, 100)}`
        );
      }
    }
  }
}

if (offenders.length > 0) {
  console.error(`DITEMUKAN ${offenders.length} baris dengan karakter CJK tak terduga:\n`);
  console.error(offenders.join("\n"));
  process.exit(1);
}

console.log(`BERSIH: ${scanned} file source diperiksa, tidak ada karakter CJK.`);
