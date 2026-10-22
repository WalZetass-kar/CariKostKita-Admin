// Verifikasi palet aman & logika kontras (dijalankan di Node, tanpa bundler).
import {
  SAFE_BRAND_PALETTE,
  LANDING_BACKGROUNDS,
  contrastRatio,
  evaluateBrandColor,
  nearestSafeColor,
  normalizeHex,
  gradeRatio,
} from "../lib/color-contrast.js";

let failures = 0;
const lines = [];

lines.push("=== Normalisasi ===");
for (const input of ["#fff", "#FFF", "6D0808", "#6D0808", "#6D0808AA", "merah", "biru", "zzz", ""]) {
  lines.push(`  ${JSON.stringify(input).padEnd(12)} -> ${normalizeHex(input)}`);
}

lines.push("");
lines.push("=== Rasio kontras warna brand terhadap latar wajib ===");
for (const bg of LANDING_BACKGROUNDS) {
  lines.push(`  vs ${bg.key} (${bg.color}):`);
  for (const entry of SAFE_BRAND_PALETTE) {
    const ratio = contrastRatio(entry.hex, bg.color);
    const grade = gradeRatio(ratio);
    const ok = ratio >= 4.5;
    if (!ok) failures += 1;
    lines.push(
      `    ${entry.hex} ${entry.name.padEnd(18)} ${ratio.toFixed(2).padStart(6)}:1  ${grade.level.padEnd(14)} ${ok ? "OK" : "GAGAL"}`
    );
  }
}

lines.push("");
lines.push("=== Warna acak (harus ditolak) ===");
const bad = ["#FFFFFF", "#FFFF00", "#00FF00", "#F0F0F0"];
for (const hex of bad) {
  const evaluation = evaluateBrandColor(hex);
  lines.push(
    `  ${hex} allPass=${evaluation.allPass} worst=${evaluation.worst?.ratio.toFixed(2)} (${evaluation.worst?.label})`
  );
  if (evaluation.allPass) {
    failures += 1;
    lines.push("    -> seharusnya GAGAL");
  }
}

lines.push("");
lines.push("=== Latar aksen lembut ikut diperiksa ===");
for (const entry of SAFE_BRAND_PALETTE) {
  const evaluation = evaluateBrandColor(entry.hex);
  const soft = evaluation.checks.find((c) => c.key === "soft");
  const ok = soft && soft.ratio >= 4.5;
  if (!ok) failures += 1;
  lines.push(
    `  ${entry.hex} soft=${soft?.color} rasio=${soft?.ratio.toFixed(2)}:1 ${ok ? "OK" : "GAGAL"}`
  );
}

lines.push("");
lines.push("=== Checksum lintas bahasa (harus sama dengan Python) ===");
const checksum = SAFE_BRAND_PALETTE.map((entry) => {
  const evaluation = evaluateBrandColor(entry.hex);
  return evaluation.checks.map((c) => c.ratio.toFixed(2)).join(",");
}).join("|");
lines.push(`  JS: ${checksum}`);

lines.push("");
lines.push("=== Warna aman terdekat ===");
for (const hex of ["#FF0000", "#00FF00", "#123456", "#790F13"]) {
  const near = nearestSafeColor(hex);
  lines.push(`  ${hex} -> ${near?.hex} (${near?.name}) jarak ${near?.distance.toFixed(1)}`);
}

lines.push("");
lines.push(failures === 0 ? "SEMUA PEMERIKSAAN LULUS" : `${failures} PEMERIKSAAN GAGAL`);

const out = lines.join("\n");
console.log(out);
if (failures > 0) process.exit(1);
