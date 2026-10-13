"use client";

import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, Clock3, FileCheck2, RefreshCw, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import { Badge, EmptyState, ErrorState, Panel, PanelTitle, PrimaryButton, SkeletonTable, TextArea, useToast } from "../ui";

const STATUS_TABS = [
  ["PENDING", "Menunggu"],
  ["APPROVED", "Disetujui"],
  ["REVISION_REQUIRED", "Perlu revisi"],
  ["REJECTED", "Ditolak"],
];

const dateTime = (value) => value
  ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
  : "—";

export function OwnerVerificationQueueView() {
  const [status, setStatus] = useState("PENDING");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [decision, setDecision] = useState(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api(`owner-verifications?status=${encodeURIComponent(status)}&page=1&page_size=100`);
      setRows(result.data || []);
    } catch (err) {
      setError(err.message || "Antrean verifikasi tidak dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const submitDecision = async () => {
    if (!decision) return;
    if (decision.status !== "APPROVED" && !note.trim()) {
      toast("Catatan wajib diisi untuk penolakan atau permintaan revisi.", "error");
      return;
    }
    setSaving(true);
    try {
      await api(`owner-verifications/${decision.id}`, {
        method: "PATCH",
        body: { status: decision.status, review_note: note.trim() || null },
      });
      toast(decision.status === "APPROVED" ? "Pengajuan disetujui; akun pemilik telah diaktifkan." : "Keputusan verifikasi tersimpan.");
      setDecision(null);
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
            <PanelTitle eyebrow="Moderasi" title="Antrean Verifikasi Pemilik" />
            <p className="mt-2 max-w-2xl text-sm text-muted">Tinjau dan proses permohonan verifikasi identitas pemilik kost secara real-time.</p>
          </div>
          <PrimaryButton onClick={load} disabled={loading} className="w-full sm:w-auto justify-center">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Perbarui
          </PrimaryButton>
        </div>
        <div className="mt-5 flex overflow-x-auto gap-2 pb-1 scrollbar-none touch-pan-x [-webkit-overflow-scrolling:touch]" role="tablist" aria-label="Filter status pengajuan">
          {STATUS_TABS.map(([key, label]) => (
            <button key={key} role="tab" aria-selected={status === key} onClick={() => setStatus(key)}
              className={`rounded-full border px-3.5 py-1.5 text-xs sm:text-sm font-semibold shrink-0 transition ${status === key ? "border-accent bg-accent text-white" : "border-line bg-paper text-muted hover:text-ink"}`}>
              {label}
            </button>
          ))}
        </div>
      </Panel>

      {error ? <ErrorState message={error} onRetry={load} /> : loading ? <SkeletonTable rows={4} cols={3} /> : rows.length === 0 ? (
        <EmptyState title="Antrean kosong" message="Tidak ada pengajuan pada status ini." />
      ) : (
        <div className="grid gap-4">
          {rows.map((application) => {
            const owner = application.owner || {};
            return (
              <Panel key={application.id} className="p-4 sm:p-5">
                <div className="flex flex-col gap-3.5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-base font-extrabold text-ink truncate">{owner.name || "Nama tidak tersedia"}</h3>
                        <p className="mt-0.5 text-xs text-muted truncate">{owner.email || "Email tidak tersedia"}{owner.no_hp || owner.phone ? ` · ${owner.no_hp || owner.phone}` : ""}</p>
                      </div>
                      <Badge label={application.status} status={application.status} tone={application.status === "PENDING" ? "warn" : application.status === "REJECTED" ? "bad" : "ok"} />
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-xs text-muted"><Clock3 size={13} /> Diajukan {dateTime(application.created_at)}</div>
                    
                    <div className="rounded-lg border border-line bg-track/50 p-3">
                      <p className="mb-1 text-[11px] font-extrabold uppercase tracking-wide text-muted">Catatan pengajuan</p>
                      <p className="whitespace-pre-wrap text-xs sm:text-sm leading-relaxed text-ink">{application.submission_note || "Tidak ada catatan."}</p>
                    </div>
                    {application.review_note && <p className="text-xs text-muted"><span className="font-bold text-ink">Catatan keputusan:</span> {application.review_note}</p>}
                  </div>

                  {application.status === "PENDING" && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 lg:flex lg:flex-wrap gap-2 w-full lg:w-auto pt-2 border-t border-line/60 lg:border-t-0 lg:pt-0">
                      <PrimaryButton onClick={() => { setDecision({ id: application.id, status: "APPROVED" }); setNote(""); }} className="w-full sm:w-auto justify-center text-xs sm:text-sm">
                        <BadgeCheck size={16} /> Setujui
                      </PrimaryButton>
                      <button onClick={() => { setDecision({ id: application.id, status: "REVISION_REQUIRED" }); setNote(""); }} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line px-3 py-2 text-xs sm:text-sm font-bold text-ink hover:bg-track w-full sm:w-auto transition">
                        <FileCheck2 size={16} /> Minta revisi
                      </button>
                      <button onClick={() => { setDecision({ id: application.id, status: "REJECTED" }); setNote(""); }} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line px-3 py-2 text-xs sm:text-sm font-bold text-bad-fg hover:bg-track w-full sm:w-auto transition">
                        <XCircle size={16} /> Tolak
                      </button>
                    </div>
                  )}
                </div>
              </Panel>
            );
          })}
        </div>
      )}

      {decision && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/45 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setDecision(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="verification-decision-title" className="w-full max-w-lg rounded-2xl border border-line bg-paper p-5 shadow-2xl">
            <h2 id="verification-decision-title" className="text-lg font-semibold text-ink">
              {decision.status === "APPROVED" ? "Setujui pengajuan?" : decision.status === "REJECTED" ? "Tolak pengajuan?" : "Minta revisi dokumen?"}
            </h2>
            <p className="mt-1 text-sm text-muted">{decision.status === "APPROVED" ? "Akun akan diberi status pemilik dan verifikasi disetujui." : "Berikan alasan yang jelas agar pemohon memahami tindak lanjutnya."}</p>
            {decision.status !== "APPROVED" && <TextArea label="Catatan untuk pemohon" rows={4} value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} required />}
            <div className="mt-5 flex flex-col-reverse sm:flex-row justify-end gap-2">
              <button disabled={saving} onClick={() => setDecision(null)} className="rounded-lg border border-line px-4 py-2 text-sm text-ink w-full sm:w-auto">Batal</button>
              <PrimaryButton loading={saving} onClick={submitDecision} className="w-full sm:w-auto justify-center">{decision.status === "APPROVED" ? "Konfirmasi persetujuan" : "Simpan keputusan"}</PrimaryButton>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
