"use client";

import { useMemo } from "react";
import { AlertTriangle, CheckCircle2, Info, Palette, ShieldCheck, Sparkles } from "lucide-react";
import {
  LANDING_BACKGROUNDS,
  SAFE_BRAND_PALETTE,
  evaluateBrandColor,
  nearestSafeColor,
  normalizeHex,
} from "@/lib/color-contrast";

const DEFAULT_BRAND = "#6D0808";

const TONE_BADGE = {
  ok: "bg-ok-bg text-ok-fg",
  warn: "bg-warn-bg text-warn-fg",
  bad: "bg-bad-bg text-bad-fg",
  neutral: "bg-track text-ink",
};

/**
 * Kolom warna aksen brand dengan validasi kontras WCAG.
 *
 * Warna brand dipakai sebagai latar tombol (teks putih) sekaligus sebagai
 * teks aksen di halaman. Field ini menampilkan pratinjau sebenarnya,
 * rasio kontras terhadap tiap latar, serta palet warna yang sudah aman.
 */
export default function BrandColorField({ value, onChange, hint }) {
  const raw = value ?? "";
  const evaluation = useMemo(() => evaluateBrandColor(raw), [raw]);
  const safeSuggestion = useMemo(
    () => (evaluation.valid && !evaluation.allPass ? nearestSafeColor(raw) : null),
    [evaluation.valid, evaluation.allPass, raw]
  );

  const activeHex = evaluation.hex || DEFAULT_BRAND;
  const isDirtyHex = raw.trim() !== "" && !evaluation.valid;

  const toneFor = (grade) => TONE_BADGE[grade.tone] || TONE_BADGE.neutral;

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-bold text-ink mb-1.5">
          Warna Aksen Brand (Primary Color)
        </label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            aria-label="Pemilih warna aksen brand"
            value={activeHex}
            onChange={(e) => onChange(e.target.value)}
            className="h-10 w-12 shrink-0 rounded border border-line cursor-pointer p-0.5 bg-paper"
          />
          <input
            type="text"
            aria-label="Kode hex warna aksen brand"
            value={raw}
            onChange={(e) => onChange(e.target.value)}
            className={`flex-1 min-h-10 rounded-lg border bg-paper px-3 font-mono text-sm text-ink ${
              isDirtyHex ? "border-bad-fg" : "border-line"
            }`}
            placeholder={DEFAULT_BRAND}
            spellCheck={false}
          />
        </div>
        {isDirtyHex && (
          <p className="mt-1 text-[11px] font-bold text-bad-fg">
            Format warna tidak valid. Gunakan hex 3 atau 6 digit, contoh {DEFAULT_BRAND}.
          </p>
        )}
        {!isDirtyHex && (
          <p className="mt-1 text-[11px] text-muted">
            {hint ||
              "Warna ini diterapkan dinamis pada tombol CTA, lencana, dan aksen navigasi."}
          </p>
        )}
      </div>

      {/* Pratinjau nyata: tombol CTA + teks aksen di tiap latar. */}
      <div className="rounded-xl border border-line bg-paper p-3.5 space-y-3">
        <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted">
          Pratinjau di Landing Page
        </p>
        <div className="flex flex-wrap items-center gap-2.5">
          <span
            className="inline-flex min-h-10 items-center rounded-lg px-4 text-sm font-bold"
            style={{ backgroundColor: activeHex, color: "#FFFFFF" }}
          >
            Unduh Aplikasi
          </span>
          <span
            className="inline-flex min-h-10 items-center rounded-lg border px-4 text-sm font-bold"
            style={{ borderColor: activeHex, color: activeHex }}
          >
            Pelajari Selengkapnya
          </span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {LANDING_BACKGROUNDS.filter((bg) => bg.usage === "text-on-light").map((bg) => (
            <div key={bg.key} className="rounded-lg border border-line p-3" style={{ backgroundColor: bg.color }}>
              <p className="text-[11px] font-bold text-ink/70">Teks aksen di latar {bg.key}</p>
              <p className="mt-0.5 text-sm font-extrabold" style={{ color: activeHex }}>
                Cari Kost Murah Sesuai Budget
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Hasil pemeriksaan kontras */}
      <div className="rounded-xl border border-line bg-paper p-3.5 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted">
            Pemeriksaan Kontras (WCAG 2.1)
          </p>
          {evaluation.valid && evaluation.allPass && (
            <span className="inline-flex items-center gap-1 rounded-full bg-ok-bg px-2.5 py-1 text-[10px] font-extrabold text-ok-fg">
              <ShieldCheck size={12} aria-hidden="true" />
              Aman dipakai
            </span>
          )}
        </div>

        {evaluation.valid ? (
          <ul className="space-y-1.5">
            {evaluation.checks.map((check) => (
              <li
                key={check.key}
                className="flex items-start justify-between gap-3 rounded-lg border border-line bg-field px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-ink">{check.label}</p>
                  <p className="text-[11px] text-muted">{check.description}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-mono text-xs font-bold text-ink">
                    {check.ratio.toFixed(2)}:1
                  </span>
                  <span
                    className={`inline-flex min-h-5 items-center rounded-full px-2 text-[10px] font-extrabold ${
                      toneFor(check.grade)
                    }`}
                  >
                    {check.grade.label}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-lg border border-line bg-field px-3 py-2 text-xs text-muted">
            Masukkan warna hex yang valid untuk melihat hasil pemeriksaan kontras.
          </p>
        )}

        {evaluation.valid && !evaluation.allPass && (
          <div className="rounded-lg border border-bad-bg bg-bad-bg px-3 py-2.5">
            <p className="flex items-start gap-2 text-xs font-bold text-bad-fg">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>
                Warna ini belum memenuhi WCAG AA. Rasio terendah{" "}
                {evaluation.worst?.ratio.toFixed(2)}:1 pada "{evaluation.worst?.label}". Teks
                brand atau tombol CTA akan sulit dibaca, dan warna seperti ini tidak bisa
                disimpan.
              </span>
            </p>
            {safeSuggestion && (
              <button
                type="button"
                onClick={() => onChange(safeSuggestion.hex)}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-bad-fg bg-paper px-3 py-1.5 text-[11px] font-extrabold text-bad-fg transition hover:bg-bad-bg"
              >
                <Sparkles size={13} aria-hidden="true" />
                Pakai warna aman terdekat: {safeSuggestion.hex} ({safeSuggestion.name})
              </button>
            )}
          </div>
        )}
      </div>

      {/* Palet aman */}
      <div className="rounded-xl border border-line bg-paper p-3.5 space-y-2.5">
        <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-muted">
          <Palette size={13} aria-hidden="true" />
          Palet Aman (sudah lolos WCAG AA)
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {SAFE_BRAND_PALETTE.map((entry) => {
            const isActive = evaluation.hex === entry.hex;
            return (
              <button
                key={entry.hex}
                type="button"
                title={`${entry.name} — ${entry.hex}`}
                aria-pressed={isActive}
                onClick={() => onChange(entry.hex)}
                className={`group flex items-center gap-2 rounded-lg border px-2 py-2 text-left transition ${
                  isActive
                    ? "border-maroon bg-maroon/10"
                    : "border-line bg-field hover:border-maroon/50 hover:bg-track/40"
                }`}
              >
                <span
                  className="h-7 w-7 shrink-0 rounded-md border border-line"
                  style={{ backgroundColor: entry.hex }}
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <span className="block truncate text-[11px] font-bold text-ink">{entry.name}</span>
                  <span className="block font-mono text-[10px] text-muted">{entry.hex}</span>
                </span>
                {isActive && (
                  <CheckCircle2 size={13} className="ml-auto shrink-0 text-maroon" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
        <p className="flex items-start gap-1.5 text-[11px] text-muted">
          <Info size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            Setiap warna di palet ini punya kontras minimal 4.5:1 terhadap putih, latar halaman,
            dan seksi cream — aman untuk teks aksen maupun tombol CTA.
          </span>
        </p>
      </div>
    </div>
  );
}
