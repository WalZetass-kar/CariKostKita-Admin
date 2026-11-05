"use client";

import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, Building2, Clock3, Eye, FileCheck2, MapPin, Phone, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import { useApp } from "../AppContext";
import { Badge, EmptyState, ErrorState, GhostButton, Modal, Panel, PanelTitle, PrimaryButton, DangerButton, SkeletonTable, TextArea, useToast } from "../ui";

const STATUS_TABS = [
  ["PENDING", "Menunggu"],
  ["APPROVED", "Disetujui"],
  ["REVISION_REQUIRED", "Perlu revisi"],
  ["REJECTED", "Ditolak"],
];

const dateTime = (value) => value
  ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
  : "—";

function parseSubmissionNote(rawNote) {
  const raw = String(rawNote || "").trim();
  const isPropertyFlow = raw.startsWith("[verifikasi-properti]");
  const cleaned = raw.replace(/^\[verifikasi-properti\]\s*/, "");
  const parts = cleaned.split(/\s*\|\s*/).filter(Boolean);
  const fields = {
    isPropertyFlow,
    verificationCode: "",
    propertyName: "",
    propertyAddress: "",
    whatsapp: "",
    note: "",
    facadePhoto: "",
    codePhoto: "",
    roomPhoto: "",
    rawText: cleaned || "Tidak ada catatan.",
  };

  for (const part of parts) {
    const idx = part.indexOf(":");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim().toLowerCase();
    const val = part.slice(idx + 1).trim();
    if (key === "kode") fields.verificationCode = val;
    else if (key === "nama kost") fields.propertyName = val;
    else if (key === "alamat") fields.propertyAddress = val;
    else if (key === "wa" || key === "whatsapp") fields.whatsapp = val;
    else if (key === "catatan") fields.note = val;
    else if (key === "foto properti") fields.facadePhoto = val;
    else if (key === "foto kode") fields.codePhoto = val;
    else if (key === "foto kamar") fields.roomPhoto = val;
  }

  return fields;
}

export function OwnerVerificationQueueView() {
  const appCtx = useApp();
  const [status, setStatus] = useState("PENDING");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedApp, setSelectedApp] = useState(null);
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
      toast(
        decision.status === "APPROVED"
          ? "Pengajuan disetujui; akun pemilik telah diaktifkan."
          : decision.status === "REJECTED"
          ? "Pengajuan pemilik kost telah ditolak."
          : "Permintaan revisi verifikasi telah dikirim."
      );
      setDecision(null);
      setSelectedApp(null);
      setNote("");
      await load();
      if (appCtx?.reload) {
        appCtx.reload();
      }
    } catch (err) {
      toast(err.message || "Keputusan tidak dapat disimpan.", "error");
    } finally {
      setSaving(false);
    }
  };

  const selectedParsed = selectedApp ? parseSubmissionNote(selectedApp.submission_note) : null;
  const selectedOwner = selectedApp?.owner || {};

  return (
    <div className="grid gap-5">
      <Panel>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <PanelTitle eyebrow="Moderasi" title="Antrean Verifikasi Pemilik" />
            <p className="mt-2 max-w-2xl text-sm text-muted">Tinjau dan proses permohonan verifikasi properti pemilik kost secara real-time.</p>
            <p className="mt-1 max-w-2xl text-xs text-muted">Bukti yang diperiksa: foto tampak depan properti, kode lokasi, dan foto kamar. Tidak ada KTP.</p>
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
            const parsed = parseSubmissionNote(application.submission_note);
            const contactPhone = parsed.whatsapp || owner.no_hp || owner.phone || "";
            return (
              <Panel key={application.id} className="p-4 sm:p-5">
                <div className="flex flex-col gap-3.5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-extrabold text-ink truncate">{owner.name || "Nama tidak tersedia"}</h3>
                          {parsed.verificationCode && (
                            <span className="inline-flex items-center gap-1 rounded-md border border-accent/30 bg-accent/10 px-2 py-0.5 text-[11px] font-bold text-accent">
                              <ShieldCheck size={12} /> {parsed.verificationCode}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-muted truncate">
                          {owner.email || "Email tidak tersedia"}
                          {contactPhone ? ` · ${contactPhone}` : ""}
                        </p>
                      </div>
                      <Badge label={application.status} status={application.status} tone={application.status === "PENDING" ? "warn" : application.status === "REJECTED" ? "bad" : "ok"} />
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                      <span className="inline-flex items-center gap-1.5"><Clock3 size={13} /> Diajukan {dateTime(application.created_at)}</span>
                      {parsed.propertyName && (
                        <span className="inline-flex items-center gap-1.5 font-semibold text-ink"><Building2 size={13} /> {parsed.propertyName}</span>
                      )}
                      {parsed.propertyAddress && (
                        <span className="inline-flex items-center gap-1.5"><MapPin size={13} /> {parsed.propertyAddress}</span>
                      )}
                    </div>

                    {parsed.propertyName || parsed.propertyAddress || parsed.whatsapp ? (
                      <div className="grid gap-2 rounded-lg border border-line bg-track/50 p-3 sm:grid-cols-2">
                        <div>
                          <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted">Nama Properti Kost</p>
                          <p className="text-xs sm:text-sm font-semibold text-ink">{parsed.propertyName || "—"}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted">Kontak WhatsApp</p>
                          <p className="text-xs sm:text-sm font-semibold text-ink">{parsed.whatsapp || owner.no_hp || owner.phone || "—"}</p>
                        </div>
                        <div className="sm:col-span-2">
                          <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted">Alamat Lengkap Properti</p>
                          <p className="text-xs sm:text-sm text-ink">{parsed.propertyAddress || "—"}</p>
                        </div>
                        {parsed.note && (
                          <div className="sm:col-span-2">
                            <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted">Catatan Pemohon</p>
                            <p className="text-xs sm:text-sm text-ink">{parsed.note}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-line bg-track/50 p-3">
                        <p className="mb-1 text-[11px] font-extrabold uppercase tracking-wide text-muted">Catatan pengajuan</p>
                        <p className="whitespace-pre-wrap text-xs sm:text-sm leading-relaxed text-ink">{parsed.rawText}</p>
                      </div>
                    )}

                    {application.review_note && (
                      <div className="rounded-lg border border-line bg-paper p-2.5 text-xs text-muted">
                        <span className="font-bold text-ink">Catatan keputusan admin:</span> {application.review_note}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-2 w-full lg:w-auto pt-2 border-t border-line/60 lg:border-t-0 lg:pt-0">
                    <button
                      type="button"
                      onClick={() => setSelectedApp(application)}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line bg-paper px-3 py-2 text-xs sm:text-sm font-bold text-ink hover:bg-track w-full sm:w-auto transition"
                    >
                      <Eye size={16} /> Detail Pengajuan
                    </button>
                    {application.status === "PENDING" && (
                      <>
                        <PrimaryButton onClick={() => { setDecision({ id: application.id, status: "APPROVED" }); setNote(""); }} className="w-full sm:w-auto justify-center text-xs sm:text-sm">
                          <BadgeCheck size={16} /> Setujui
                        </PrimaryButton>
                        <button type="button" onClick={() => { setDecision({ id: application.id, status: "REVISION_REQUIRED" }); setNote(""); }} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line px-3 py-2 text-xs sm:text-sm font-bold text-ink hover:bg-track w-full sm:w-auto transition">
                          <FileCheck2 size={16} /> Minta revisi
                        </button>
                        <button type="button" onClick={() => { setDecision({ id: application.id, status: "REJECTED" }); setNote(""); }} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line px-3 py-2 text-xs sm:text-sm font-bold text-bad-fg hover:bg-track w-full sm:w-auto transition">
                          <XCircle size={16} /> Tolak
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      )}

      {selectedApp && selectedParsed && (
        <Modal
          open={Boolean(selectedApp)}
          onClose={() => setSelectedApp(null)}
          title="Detail Pengajuan Pemilik Kost"
          maxWidth="max-w-2xl"
          footer={
            <>
              <GhostButton onClick={() => setSelectedApp(null)}>Tutup</GhostButton>
              {selectedApp.status === "PENDING" && (
                <>
                  <button
                    type="button"
                    onClick={() => { setDecision({ id: selectedApp.id, status: "REVISION_REQUIRED" }); setNote(""); }}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line px-3 py-2 text-xs sm:text-sm font-bold text-ink hover:bg-track transition"
                  >
                    <FileCheck2 size={16} /> Minta Revisi
                  </button>
                  <DangerButton onClick={() => { setDecision({ id: selectedApp.id, status: "REJECTED" }); setNote(""); }}>
                    <XCircle size={16} /> Tolak
                  </DangerButton>
                  <PrimaryButton onClick={() => { setDecision({ id: selectedApp.id, status: "APPROVED" }); setNote(""); }}>
                    <BadgeCheck size={16} /> Setujui Pemilik
                  </PrimaryButton>
                </>
              )}
            </>
          }
        >
          <div className="grid gap-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-track/40 p-3">
              <div>
                <p className="text-xs text-muted">Pemohon</p>
                <p className="font-extrabold text-ink">{selectedOwner.name || "—"}</p>
                <p className="text-xs text-muted">{selectedOwner.email || "—"}</p>
              </div>
              <div className="text-right">
                <Badge label={selectedApp.status} status={selectedApp.status} tone={selectedApp.status === "PENDING" ? "warn" : selectedApp.status === "REJECTED" ? "bad" : "ok"} />
                <p className="mt-1 text-xs text-muted">ID Pengajuan: #{selectedApp.id}</p>
              </div>
            </div>

            <div className="grid gap-3 rounded-lg border border-line p-3.5 sm:grid-cols-2">
              <div>
                <p className="text-xs font-bold text-muted">Kode Verifikasi Lokasi</p>
                <p className="mt-0.5 font-extrabold text-accent">{selectedParsed.verificationCode || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-muted">Waktu Pengajuan</p>
                <p className="mt-0.5 font-semibold text-ink">{dateTime(selectedApp.created_at)}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-muted">Nama Properti Kost</p>
                <p className="mt-0.5 font-semibold text-ink">{selectedParsed.propertyName || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-muted">Nomor WhatsApp Aktif</p>
                <p className="mt-0.5 font-semibold text-ink inline-flex items-center gap-1.5">
                  <Phone size={13} /> {selectedParsed.whatsapp || selectedOwner.no_hp || selectedOwner.phone || "—"}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs font-bold text-muted">Alamat Properti Kost</p>
                <p className="mt-0.5 text-ink">{selectedParsed.propertyAddress || "—"}</p>
              </div>
              {selectedParsed.note && (
                <div className="sm:col-span-2">
                  <p className="text-xs font-bold text-muted">Catatan Tambahan Pemohon</p>
                  <p className="mt-0.5 text-ink">{selectedParsed.note}</p>
                </div>
              )}
              <div className="sm:col-span-2">
                <p className="text-xs font-bold text-muted">Data Mentah Pengajuan</p>
                <p className="mt-1 rounded bg-track/60 p-2 font-mono text-xs text-ink whitespace-pre-wrap break-words">{selectedApp.submission_note}</p>
              </div>
            </div>

            {(selectedParsed.facadePhoto || selectedParsed.codePhoto || selectedParsed.roomPhoto) && (
              <div className="grid gap-3 sm:grid-cols-3">
                {selectedParsed.facadePhoto && (
                  <a href={selectedParsed.facadePhoto} target="_blank" rel="noreferrer" className="block rounded-lg border border-line p-2 hover:border-accent">
                    <p className="mb-1 text-xs font-bold text-muted">Foto Tampak Depan</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={selectedParsed.facadePhoto} alt="Foto Properti" className="h-28 w-full rounded object-cover" />
                  </a>
                )}
                {selectedParsed.codePhoto && (
                  <a href={selectedParsed.codePhoto} target="_blank" rel="noreferrer" className="block rounded-lg border border-line p-2 hover:border-accent">
                    <p className="mb-1 text-xs font-bold text-muted">Foto Kode Verifikasi</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={selectedParsed.codePhoto} alt="Foto Kode" className="h-28 w-full rounded object-cover" />
                  </a>
                )}
                {selectedParsed.roomPhoto && (
                  <a href={selectedParsed.roomPhoto} target="_blank" rel="noreferrer" className="block rounded-lg border border-line p-2 hover:border-accent">
                    <p className="mb-1 text-xs font-bold text-muted">Foto Kamar</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={selectedParsed.roomPhoto} alt="Foto Kamar" className="h-28 w-full rounded object-cover" />
                  </a>
                )}
              </div>
            )}

            {selectedApp.review_note && (
              <div className="rounded-lg border border-line bg-track/40 p-3">
                <p className="text-xs font-bold text-muted">Catatan Keputusan Admin</p>
                <p className="mt-1 text-sm text-ink">{selectedApp.review_note}</p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {decision && (
        <Modal
          open={Boolean(decision)}
          onClose={saving ? undefined : () => setDecision(null)}
          title={
            decision.status === "APPROVED"
              ? "Setujui Verifikasi Pemilik"
              : decision.status === "REJECTED"
              ? "Tolak Verifikasi Pemilik"
              : "Minta Revisi Dokumen Pemilik"
          }
          maxWidth="max-w-lg"
          footer={
            <>
              <GhostButton disabled={saving} onClick={() => setDecision(null)}>
                Batal
              </GhostButton>
              {decision.status === "REJECTED" ? (
                <DangerButton loading={saving} onClick={submitDecision}>
                  Tolak Pengajuan
                </DangerButton>
              ) : (
                <PrimaryButton loading={saving} onClick={submitDecision}>
                  {decision.status === "APPROVED" ? "Konfirmasi Persetujuan" : "Kirim Permintaan Revisi"}
                </PrimaryButton>
              )}
            </>
          }
        >
          <p className="text-sm leading-relaxed text-muted">
            {decision.status === "APPROVED"
              ? "Akun akan diverifikasi resmi sebagai pemilik kost dan listing kost miliknya dapat segera dipublikasikan."
              : "Berikan catatan atau instruksi yang jelas kepada pemohon mengenai kelengkapan dokumen yang diperlukan."}
          </p>
          {decision.status !== "APPROVED" && (
            <div className="mt-4">
              <TextArea
                label="Catatan untuk pemohon"
                rows={4}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={1000}
                required
                hint="Catatan ini akan ditampilkan kepada pemilik di aplikasi Android CariKostKita."
              />
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
