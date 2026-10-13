"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BadgeCheck,
  Building2,
  Clock3,
  ExternalLink,
  Flag,
  Megaphone,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";
import { useApp } from "../AppContext";
import { Badge, ErrorState, GhostButton, Panel, PanelTitle, PrimaryButton, SkeletonCard } from "../ui";

const CARDS = [
  ["kosts", "total", "Total listing kost", Building2, "Semua listing yang terdata di sistem"],
  ["kosts", "approved", "Kost disetujui", BadgeCheck, "Status verifikasi APPROVED"],
  ["kosts", "pending", "Kost menunggu review", Clock3, "Status verifikasi PENDING"],
  ["users", "total", "Total pengguna", Users, "Semua akun terdaftar di sistem"],
  ["users", "active", "Akun aktif", ShieldCheck, "Status akun is_active = true"],
  ["users", "owner_verification_pending", "Pemilik perlu verifikasi", Clock3, "Mitra pemilik status PENDING"],
  ["reports", "total", "Total laporan kost", Flag, "Semua aduan pelanggaran"],
  ["reports", "new", "Laporan baru", Flag, "Laporan status BARU butuh respon"],
];

export function FastApiOverviewView() {
  const { admin, openKostForm, openAdForm, openUserForm, setView } = useApp();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const role = admin?.role || "admin";

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api("fastapi-overview");
      setData(result.data || null);
    } catch (err) {
      setData(null);
      setError(err.message || "Ringkasan data platform tidak dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="grid gap-4 sm:gap-5">
      {/* Header Panel */}
      <Panel className="p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <PanelTitle eyebrow="Platform" title="Ringkasan & Metrik Utama" />
            <p className="mt-1 max-w-3xl text-xs sm:text-sm leading-relaxed text-muted">
              Monitoring performa real-time dan pusat kendali cepat platform CariKostKita.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <PrimaryButton onClick={load} disabled={loading} className="!h-9 sm:!h-10 text-xs sm:text-sm">
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              <span>Perbarui</span>
            </PrimaryButton>
          </div>
        </div>
      </Panel>

      {/* QUICK ACTIONS / AKSI CEPAT & TAMBAH BARU */}
      <Panel className="p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-maroon/10 text-maroon">
              <Sparkles size={16} />
            </span>
            <h2 className="text-sm font-extrabold text-ink sm:text-base">Aksi Cepat & Tambah Baru</h2>
          </div>
          <span className="text-[11px] font-bold text-muted">Role: {admin?.role || "Staff"}</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {/* Action 1: Tambah Kost */}
          {["super_admin", "admin"].includes(role) && (
            <button
              type="button"
              onClick={() => openKostForm?.({})}
              className="group flex flex-col justify-between rounded-xl border border-line bg-field p-3 text-left transition hover:border-maroon hover:bg-paper hover:shadow-sm active:scale-[0.98]"
            >
              <div className="flex items-center justify-between w-full mb-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-maroon text-[#EEEAD7] shadow-xs group-hover:scale-105 transition-transform">
                  <Building2 size={16} />
                </span>
                <span className="rounded bg-maroon/10 p-1 text-maroon">
                  <Plus size={14} />
                </span>
              </div>
              <div>
                <strong className="block text-xs sm:text-sm font-extrabold text-ink leading-tight">Tambah Kost</strong>
                <span className="mt-0.5 block text-[10px] sm:text-[11px] text-muted">Listing properti baru</span>
              </div>
            </button>
          )}

          {/* Action 2: Tambah Iklan */}
          {["super_admin", "admin", "marketing"].includes(role) && (
            <button
              type="button"
              onClick={() => (openAdForm ? openAdForm({}) : setView?.("fastapi_ads"))}
              className="group flex flex-col justify-between rounded-xl border border-line bg-field p-3 text-left transition hover:border-[#a8782f] hover:bg-paper hover:shadow-sm active:scale-[0.98]"
            >
              <div className="flex items-center justify-between w-full mb-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#a8782f] text-white shadow-xs group-hover:scale-105 transition-transform">
                  <Megaphone size={16} />
                </span>
                <span className="rounded bg-[#a8782f]/10 p-1 text-[#a8782f]">
                  <Plus size={14} />
                </span>
              </div>
              <div>
                <strong className="block text-xs sm:text-sm font-extrabold text-ink leading-tight">Tambah Iklan</strong>
                <span className="mt-0.5 block text-[10px] sm:text-[11px] text-muted">Banner & promo slot</span>
              </div>
            </button>
          )}

          {/* Action 3: Tambah Pengguna / Staf */}
          {["super_admin", "admin"].includes(role) && (
            <button
              type="button"
              onClick={() => (openUserForm ? openUserForm({}) : setView?.("fastapi_users"))}
              className="group flex flex-col justify-between rounded-xl border border-line bg-field p-3 text-left transition hover:border-accent hover:bg-paper hover:shadow-sm active:scale-[0.98]"
            >
              <div className="flex items-center justify-between w-full mb-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-clay text-white shadow-xs group-hover:scale-105 transition-transform">
                  <UserPlus size={16} />
                </span>
                <span className="rounded bg-clay/10 p-1 text-clay">
                  <Plus size={14} />
                </span>
              </div>
              <div>
                <strong className="block text-xs sm:text-sm font-extrabold text-ink leading-tight">Tambah Staf / User</strong>
                <span className="mt-0.5 block text-[10px] sm:text-[11px] text-muted">Akun admin & publik</span>
              </div>
            </button>
          )}

          {/* Action 4: Antrean Verifikasi Pemilik */}
          {["super_admin", "admin", "moderator"].includes(role) && (
            <button
              type="button"
              onClick={() => setView?.("verification")}
              className="group flex flex-col justify-between rounded-xl border border-line bg-field p-3 text-left transition hover:border-blue hover:bg-paper hover:shadow-sm active:scale-[0.98]"
            >
              <div className="flex items-center justify-between w-full mb-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue text-white shadow-xs group-hover:scale-105 transition-transform">
                  <BadgeCheck size={16} />
                </span>
                {Boolean(data?.users?.owner_verification_pending) && (
                  <span className="rounded-full bg-warn-bg px-1.5 py-0.5 text-[10px] font-black text-warn-fg border border-warn-fg/20">
                    {data.users.owner_verification_pending}
                  </span>
                )}
              </div>
              <div>
                <strong className="block text-xs sm:text-sm font-extrabold text-ink leading-tight">Verifikasi Mitra</strong>
                <span className="mt-0.5 block text-[10px] sm:text-[11px] text-muted">Review identitas KTP</span>
              </div>
            </button>
          )}

          {/* Action 5: Tinjau Laporan Pelanggaran */}
          {["super_admin", "admin", "moderator"].includes(role) && (
            <button
              type="button"
              onClick={() => setView?.("fastapi_reports")}
              className="group flex flex-col justify-between rounded-xl border border-line bg-field p-3 text-left transition hover:border-bad-fg hover:bg-paper hover:shadow-sm active:scale-[0.98]"
            >
              <div className="flex items-center justify-between w-full mb-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-bad-fg text-[#EEEAD7] shadow-xs group-hover:scale-105 transition-transform">
                  <Flag size={16} />
                </span>
                {Boolean(data?.reports?.new) && (
                  <span className="rounded-full bg-bad-bg px-1.5 py-0.5 text-[10px] font-black text-bad-fg border border-bad-fg/20">
                    {data.reports.new} baru
                  </span>
                )}
              </div>
              <div>
                <strong className="block text-xs sm:text-sm font-extrabold text-ink leading-tight">Tinjau Laporan</strong>
                <span className="mt-0.5 block text-[10px] sm:text-[11px] text-muted">Aduan masalah kost</span>
              </div>
            </button>
          )}
        </div>
      </Panel>

      {/* METRIC CARDS */}
      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading && !data ? (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 lg:grid-cols-4 sm:gap-3">
          <SkeletonCard count={8} />
        </div>
      ) : data ? (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 lg:grid-cols-4 sm:gap-3" aria-live="polite" aria-atomic="false">
          {CARDS.map(([group, key, label, Icon, hint]) => (
            <Panel key={`${group}-${key}`} className="min-w-0 p-3 sm:p-4">
              <div className="flex items-start gap-2.5 sm:gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-maroon/10 text-maroon sm:h-10 sm:w-10 sm:rounded-xl">
                  <Icon size={18} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted">{label}</p>
                  <p className="mt-0.5 text-2xl font-black leading-tight text-ink sm:text-3xl">
                    {data[group]?.[key] ?? "—"}
                  </p>
                  <p className="mt-1 hidden truncate text-[11px] text-muted sm:block">{hint}</p>
                </div>
              </div>
            </Panel>
          ))}
        </div>
      ) : null}
    </div>
  );
}
