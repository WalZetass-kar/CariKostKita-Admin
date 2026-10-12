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
          <PrimaryButton onClick={load} disabled={loading}><RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Perbarui</PrimaryButton>
        </div>
        <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Filter status pengajuan">
          {STATUS_TABS.map(([key, label]) => (
            <button key={key} role="tab" aria-selected={status === key} onClick={() => setStatus(key)}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${status === key ? "border-accent bg-accent text-white" : "border-line bg-paper text-muted hover:text-ink"}`}>
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
              <Panel key={application.id}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-ink">{owner.name || "Nama tidak tersedia"}</h3>
                      <Badge label={application.status} status={application.status} tone={application.status === "PENDING" ? "warn" : application.status === "REJECTED" ? "bad" : "ok"} />
                    </div>
                    <p className="mt-1 text-sm text-muted">{owner.email || "Email tidak tersedia"}{owner.no_hp || owner.phone ? ` · ${owner.no_hp || owner.phone}` : ""}</p>
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-muted"><Clock3 size={14} /> Diajukan {dateTime(application.created_at)}</div>
                    <div className="mt-4 rounded-xl border border-line bg-track p-4">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Catatan pengajuan</p>
                      <p className="whitespace-pre-wrap text-sm leading-6 text-ink">{application.submission_note}</p>
                    </div>
                    {application.review_note && <p className="mt-3 text-sm text-muted"><span className="font-medium text-ink">Catatan keputusan:</span> {application.review_note}</p>}
                  </div>
                  {application.status === "PENDING" && (
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <PrimaryButton onClick={() => { setDecision({ id: application.id, status: "APPROVED" }); setNote(""); }}>
                        <BadgeCheck size={16} /> Setujui
                      </PrimaryButton>
                      <button onClick={() => { setDecision({ id: application.id, status: "REVISION_REQUIRED" }); setNote(""); }} className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-ink hover:bg-track">
                        <FileCheck2 size={16} /> Minta revisi
                      </button>
                      <button onClick={() => { setDecision({ id: application.id, status: "REJECTED" }); setNote(""); }} className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-bad-fg hover:bg-track">
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
            <div className="mt-5 flex justify-end gap-2">
              <button disabled={saving} onClick={() => setDecision(null)} className="rounded-lg border border-line px-4 py-2 text-sm text-ink">Batal</button>
              <PrimaryButton loading={saving} onClick={submitDecision}>{decision.status === "APPROVED" ? "Konfirmasi persetujuan" : "Simpan keputusan"}</PrimaryButton>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
