"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, AlertTriangle, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { Badge, DataTable, EmptyState, ErrorState, Panel, PanelTitle, PrimaryButton, SelectField, SkeletonCard, Td } from "../ui";

const PERIODS = [[7, "7 hari"], [30, "30 hari"], [90, "90 hari"]];
const EVENT_LABELS = {
  search: "Pencarian",
  view_detail: "Lihat detail kost",
  chat_start: "Mulai chat",
  survey_request: "Ajukan survei",
  favorite_add: "Tambah favorit",
};

export function FastApiAnalyticsView() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api(`fastapi-analytics?days=${days}`);
      setData(result.data || null);
    } catch (err) {
      setData(null);
      setError(err.message || "Analitik FastAPI tidak dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { load(); }, [load]);
  const events = data?.events || [];

  return (
    <div className="grid gap-5">
      <Panel>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <PanelTitle eyebrow="FastAPI Â· Supabase Â· Read-only" title="Analitik produk" />
            <p className="max-w-3xl text-sm leading-6 text-muted">Hitungan event dan laporan crash yang terlihat oleh akun staf aktif melalui RLS. Angka event adalah jumlah kejadian, bukan pengguna unik atau rasio konversi.</p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <SelectField label="Rentang waktu" value={days} onChange={(event) => setDays(Number(event.target.value))} options={PERIODS} />
            <Badge status="JWT + RLS" tone="brand" />
            <PrimaryButton onClick={load} disabled={loading}><RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Perbarui</PrimaryButton>
          </div>
        </div>
      </Panel>

      {error ? <ErrorState message={error} onRetry={load} /> : loading && !data ? (
        <div className="grid gap-3 sm:grid-cols-2"><SkeletonCard count={2} /></div>
      ) : data ? (
        <div className={`grid gap-5 ${loading ? "opacity-70" : ""}`} aria-busy={loading}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Panel className="min-w-0">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-maroon/10 text-maroon"><Activity size={19} aria-hidden="true" /></span>
                <div><p className="text-xs font-bold uppercase tracking-wide text-muted">Jenis event</p><p className="mt-1 text-3xl font-black leading-tight text-ink">{events.length}</p><p className="mt-2 text-xs leading-5 text-muted">Event allowlist dalam {data.days} hari</p></div>
              </div>
            </Panel>
            <Panel className="min-w-0">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-warn-bg text-warn-fg"><AlertTriangle size={19} aria-hidden="true" /></span>
                <div><p className="text-xs font-bold uppercase tracking-wide text-muted">Laporan crash</p><p className="mt-1 text-3xl font-black leading-tight text-ink">{Number(data.crashes?.count || 0).toLocaleString("id-ID")}</p><p className="mt-2 text-xs leading-5 text-muted">Jumlah laporan terlihat dalam {data.days} hari; isi dan stack trace tidak dikirim ke layar ini.</p></div>
              </div>
            </Panel>
          </div>

          <Panel className="p-0">
            <div className="border-b border-line px-5 py-4"><PanelTitle eyebrow="Kejadian · bukan funnel konversi" title="Interaksi aplikasi" /></div>
            {events.length === 0 ? <EmptyState title="Belum ada event" message="Tidak ada event yang terlihat pada rentang waktu ini. Ini tidak membuktikan tabel kosong jika RLS membatasi visibilitas." /> : (
              <DataTable headers={["Event", "Jumlah kejadian"]} minWidth={420}>
                {events.map((item) => <tr key={item.event} className="hover:bg-track/60">
                  <Td><div className="font-bold text-ink">{EVENT_LABELS[item.event] || item.event}</div><div className="text-xs text-muted">{item.event}</div></Td>
                  <Td><span className="tabular-nums font-bold text-ink">{Number(item.total || 0).toLocaleString("id-ID")}</span></Td>
                </tr>)}
              </DataTable>
            )}
          </Panel>
          <p role="status" aria-live="polite" aria-atomic="true" className="text-xs text-muted">Data dibatasi akses akun staf dan policy RLS; tidak mewakili angka global bila policy menyembunyikan baris.</p>
        </div>
      ) : null}
    </div>
  );
}
