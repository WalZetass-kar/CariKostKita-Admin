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
            <PanelTitle eyebrow="Performa" title="Analitik & Telemetri" />
            <p className="max-w-3xl text-sm leading-6 text-muted">Statistik aktivitas pengguna, interaksi fitur, dan metrik stabilitas sistem CariKostKita.</p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end gap-2.5 w-full sm:w-auto">
            <SelectField label="Rentang waktu" value={days} onChange={(event) => setDays(Number(event.target.value))} options={PERIODS} className="w-full sm:w-auto" />
            <PrimaryButton onClick={load} disabled={loading} className="w-full sm:w-auto justify-center">
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Perbarui
            </PrimaryButton>
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
              <div className="w-full overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-line bg-track/40">
                      <th className="px-4 py-3 text-xs font-extrabold uppercase text-muted">Event</th>
                      <th className="px-4 py-3 text-right text-xs font-extrabold uppercase text-muted">Jumlah Kejadian</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {events.map((item) => (
                      <tr key={item.event} className="hover:bg-track/50 transition">
                        <td className="px-4 py-3 align-middle">
                          <div className="font-extrabold text-sm text-ink">{EVENT_LABELS[item.event] || item.event}</div>
                          <div className="text-xs text-muted font-mono">{item.event}</div>
                        </td>
                        <td className="px-4 py-3 align-middle text-right">
                          <span className="tabular-nums font-extrabold text-sm sm:text-base text-ink">
                            {Number(item.total || 0).toLocaleString("id-ID")}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
          <p role="status" aria-live="polite" aria-atomic="true" className="text-xs text-muted">Data dibatasi akses akun staf dan policy RLS; tidak mewakili angka global bila policy menyembunyikan baris.</p>
        </div>
      ) : null}
    </div>
  );
}
