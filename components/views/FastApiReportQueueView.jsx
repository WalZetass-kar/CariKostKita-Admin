"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Clock3, Flag, RefreshCw, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import { Badge, EmptyState, ErrorState, Panel, PanelTitle, PrimaryButton, SkeletonTable, TextArea, useToast } from "../ui";

const TABS = [["BARU", "Baru"], ["DITINJAU", "Ditinjau"], ["SELESAI", "Selesai"], ["DITOLAK", "Ditolak"]];
const formatDateTime = (value) => value
  ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
  : "—";

export function FastApiReportQueueView() {
  const [status, setStatus] = useState("BARU");
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [action, setAction] = useState(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const requestId = useRef(0);
  const toast = useToast();

  const load = useCallback(async () => {
    const activeRequest = ++requestId.current;
    setLoading(true);
    setError("");
    try {
      const result = await api(`fastapi-reports?status=${status}&page=${page}&page_size=100`);
      if (!Array.isArray(result.data) || typeof result.pagination?.has_more !== "boolean") {
        throw new Error("Respons paginasi antrean laporan tidak valid.");
      }
      if (result.pagination.has_more && result.data.length === 0) {
        throw new Error("API menandai antrean berlanjut tetapi halaman ini kosong.");
      }
      if (activeRequest === requestId.current) {
        setReports(result.data);
        setHasMore(result.pagination.has_more);
      }
    } catch (err) {
      if (activeRequest === requestId.current) {
        setError(err.message || "Antrean laporan FastAPI tidak dapat dimuat.");
      }
    } finally {
      if (activeRequest === requestId.current) setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    load();
    return () => { requestId.current += 1; };
  }, [load]);

  const submit = async () => {
    if (!action) return;
    setSaving(true);
    try {
      await api(`fastapi-reports/${action.report.id}`, {
        method: "PATCH",
        body: { status: action.status, admin_action: note.trim() || null },
      });
      toast("Keputusan laporan tersimpan melalui FastAPI.");
      setAction(null);
      setNote("");
      await load();
    } catch (err) {
      toast(err.message || "Keputusan tidak dapat disimpan.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-5">
      <Panel>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <PanelTitle eyebrow="FastAPI · Supabase" title="Antrean laporan kost" />
            <p className="mt-2 max-w-2xl text-sm text-muted">Layar ini membaca dan memoderasi laporan melalui FastAPI. Data snapshot legacy tetap tersedia pada menu Laporan Kost selama fase validasi.</p>
          </div>
          <PrimaryButton onClick={load} disabled={loading}><RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Perbarui</PrimaryButton>
        </div>
        <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Status laporan">
          {TABS.map(([key, label]) => (
            <button key={key} role="tab" aria-selected={status === key} onClick={() => { setPage(1); setStatus(key); }}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${status === key ? "border-accent bg-accent text-white" : "border-line bg-paper text-muted hover:text-ink"}`}>
              {label}
            </button>
          ))}
        </div>
      </Panel>

      {error ? <ErrorState message={error} onRetry={load} /> : loading ? <SkeletonTable rows={4} cols={3} /> : reports.length === 0 ? (
        <>
          <EmptyState title="Tidak ada laporan" message="Belum ada laporan dengan status ini." />
          {page > 1 && <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="min-h-10 justify-self-start rounded-lg border border-line px-3 text-sm text-ink">
            Kembali ke halaman sebelumnya
          </button>}
        </>
      ) : (
        <div className="grid gap-4">
          {reports.map((report) => (
            <Panel key={report.id}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-extrabold text-ink">Laporan #{report.id}</h3>
                    <Badge status={report.status} tone={report.status === "BARU" ? "warn" : report.status === "DITOLAK" ? "bad" : report.status === "SELESAI" ? "ok" : "info"} />
                  </div>
                  <p className="mt-1 text-sm text-muted">{report.kost_name || `Kost #${report.kost_id ?? "—"}`} · {report.reporter_name || `Pelapor #${report.reporter_id}`}</p>
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-muted"><Clock3 size={14} /> {formatDateTime(report.created_at)}</div>
                  <div className="mt-4 rounded-lg border border-line bg-track p-4">
                    <p className="mb-1 text-xs font-extrabold uppercase tracking-wide text-muted">{report.reason || "Detail laporan"}</p>
                    <p className="whitespace-pre-wrap text-sm leading-6 text-ink">{report.description || "Tidak ada deskripsi tambahan."}</p>
                  </div>
                  {report.admin_action && <p className="mt-3 text-sm text-muted"><span className="font-bold text-ink">Catatan moderasi terakhir:</span> {report.admin_action}</p>}
                </div>
                {!(["SELESAI", "DITOLAK"].includes(report.status)) && (
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    {report.status === "BARU" && <button onClick={() => { setAction({ report, status: "DITINJAU" }); setNote(""); }} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line px-3 text-sm text-ink hover:bg-track"><Flag size={16} /> Tandai ditinjau</button>}
                    <PrimaryButton onClick={() => { setAction({ report, status: "SELESAI" }); setNote(""); }}><CheckCircle2 size={16} /> Selesaikan</PrimaryButton>
                    <button onClick={() => { setAction({ report, status: "DITOLAK" }); setNote(""); }} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line px-3 text-sm text-bad-fg hover:bg-track"><XCircle size={16} /> Tolak</button>
                  </div>
                )}
              </div>
            </Panel>
          ))}
          <nav className="flex items-center justify-between gap-3" aria-label="Halaman antrean laporan">
            <span className="text-sm text-muted" aria-live="polite">Halaman {page} · {reports.length} laporan</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={loading || page === 1}
                className="min-h-10 rounded-lg border border-line px-3 text-sm text-ink disabled:cursor-not-allowed disabled:opacity-50">
                Sebelumnya
              </button>
              <button type="button" onClick={() => setPage((current) => current + 1)} disabled={loading || !hasMore}
                className="min-h-10 rounded-lg border border-line px-3 text-sm text-ink disabled:cursor-not-allowed disabled:opacity-50">
                Berikutnya
              </button>
            </div>
          </nav>
        </div>
      )}

      {action && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/45 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setAction(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="report-action-title" className="w-full max-w-lg rounded-2xl border border-line bg-paper p-5 shadow-2xl">
            <h2 id="report-action-title" className="text-lg font-extrabold text-ink">Konfirmasi keputusan laporan</h2>
            <p className="mt-1 text-sm text-muted">Laporan #{action.report.id} akan diubah menjadi {TABS.find(([key]) => key === action.status)?.[1]}.</p>
            <TextArea label="Catatan tindakan (opsional)" rows={4} value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} />
            <div className="mt-5 flex justify-end gap-2">
              <button disabled={saving} onClick={() => setAction(null)} className="rounded-lg border border-line px-4 py-2 text-sm text-ink">Batal</button>
              <PrimaryButton loading={saving} onClick={submit}>Simpan keputusan</PrimaryButton>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
