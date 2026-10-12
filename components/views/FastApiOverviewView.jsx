"use client";

import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, Building2, Clock3, Flag, RefreshCw, ShieldCheck, Users } from "lucide-react";
import { api } from "@/lib/api";
import { Badge, ErrorState, Panel, PanelTitle, PrimaryButton, SkeletonCard } from "../ui";

const CARDS = [
  ["kosts", "total", "Total listing kost", Building2, "Semua listing yang terlihat lewat RLS"],
  ["kosts", "approved", "Kost disetujui", BadgeCheck, "Status verifikasi APPROVED"],
  ["kosts", "pending", "Kost menunggu review", Clock3, "Status verifikasi PENDING"],
  ["users", "total", "Total pengguna", Users, "Semua akun yang terlihat lewat RLS"],
  ["users", "active", "Akun aktif", ShieldCheck, "Status is_active = true"],
  ["users", "owner_verification_pending", "Pemilik menunggu verifikasi", Clock3, "Role owner · PENDING"],
  ["reports", "total", "Total laporan kost", Flag, "Semua laporan yang terlihat lewat RLS"],
  ["reports", "new", "Laporan baru", Flag, "Status BARU"],
];

export function FastApiOverviewView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api("fastapi-overview");
      setData(result.data || null);
    } catch (err) {
      setData(null);
      setError(err.message || "Ringkasan FastAPI tidak dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="grid gap-5">
      <Panel>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <PanelTitle eyebrow="Platform" title="Ringkasan & Metrik Utama" />
            <p className="max-w-3xl text-sm leading-6 text-muted">Metrik platform dihitung secara real-time berdasarkan data terkini di database platform CariKostKita.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2"><PrimaryButton onClick={load} disabled={loading}><RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Perbarui</PrimaryButton></div>
        </div>
      </Panel>

      {error ? <ErrorState message={error} onRetry={load} /> : loading && !data ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><SkeletonCard count={8} /></div>
      ) : data ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-live="polite" aria-atomic="false">
          {CARDS.map(([group, key, label, Icon, hint]) => (
            <Panel key={`${group}-${key}`} className="min-w-0">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-maroon/10 text-maroon"><Icon size={19} aria-hidden="true" /></span>
                <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wide text-muted">{label}</p><p className="mt-1 text-3xl font-black leading-tight text-ink">{data[group]?.[key] ?? "—"}</p><p className="mt-2 text-xs leading-5 text-muted">{hint}</p></div>
              </div>
            </Panel>
          ))}
        </div>
      ) : null}
    </div>
  );
}
