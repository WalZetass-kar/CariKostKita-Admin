"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Eye, LayoutList, Columns3, PlayCircle, Save, XCircle, AlertCircle } from "lucide-react";
import { useApp } from "../AppContext";
import {
  Badge,
  ConfirmDialog,
  DataTable,
  DetailGrid,
  EmptyState,
  ExportMenu,
  FilterBar,
  GhostButton,
  IconButton,
  Modal,
  Pagination,
  Panel,
  PrimaryButton,
  SelectField,
  Td,
  TextArea,
  selectCls,
  usePagination,
  useToast,
  ActivityTimeline,
} from "../ui";
import { REPORT_ACTIONS, REPORT_STATUS, REPORT_TYPES } from "@/lib/constants";
import { formatCurrency, formatDate, formatDateTime, inRange } from "@/lib/format";

export function ReportsView() {
  const { data, act, targetEntityId, clearTargetEntityId } = useApp();
  const toast = useToast();
  const [mode, setMode] = useState("list");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("Semua");
  const [type, setType] = useState("Semua Jenis");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [openId, setOpenId] = useState(null);

  // Deep linking dari notifikasi atau global search
  useEffect(() => {
    if (targetEntityId && data?.reports) {
      const match = data.reports.find((r) => r.id === targetEntityId);
      if (match) {
        setOpenId(match.id);
        clearTargetEntityId?.();
      }
    }
  }, [targetEntityId, data?.reports, clearTargetEntityId]);

  const hasActiveFilters = tab !== "Semua" || type !== "Semua Jenis" || Boolean(from) || Boolean(to) || Boolean(search);
  const resetFilters = () => {
    setTab("Semua");
    setType("Semua Jenis");
    setFrom("");
    setTo("");
    setSearch("");
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.reports || []).filter((r) =>
      (tab === "Semua" || r.status === tab) &&
      (type === "Semua Jenis" || r.type === type) &&
      inRange(r.createdAt, from, to) &&
      (!q || [r.id, r.kostName, r.reporterName, r.type, r.description].some((v) => String(v).toLowerCase().includes(q))),
    );
  }, [data?.reports, tab, type, from, to, search]);

  const pager = usePagination(filtered, 10);
  useEffect(() => pager.reset(), [tab, type, from, to, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const filters = [
    tab !== "Semua" && `Status: ${tab}`,
    type !== "Semua Jenis" && `Jenis: ${type}`,
    from && `Dari: ${from}`,
    to && `Sampai: ${to}`,
    search && `Pencarian: "${search}"`,
  ].filter(Boolean);

  const columns = [
    { label: "ID", value: (r) => r.id },
    { label: "Kost", value: (r) => r.kostName },
    { label: "ID Kost", value: (r) => r.kostId },
    { label: "Pelapor", value: (r) => r.reporterName },
    { label: "Jenis", value: (r) => r.type },
    { label: "Deskripsi", value: (r) => r.description },
    { label: "Tanggal", value: (r) => formatDate(r.createdAt) },
    { label: "Status", value: (r) => r.status },
    { label: "Ditangani", value: (r) => r.handledByName },
    { label: "Tindakan", value: (r) => r.adminAction },
    { label: "Catatan", value: (r) => r.note },
  ];

  const report = openId && (data?.reports || []).find((r) => r.id === openId);

  return (
    <div className="space-y-4">
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Cari ID, kost, pelapor, jenis..."
        extraFilters={
          <>
            <label className="flex items-center gap-1.5 text-xs font-bold text-muted">
              <span>Dari:</span>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Dari tanggal" className={`${selectCls} !h-8 text-xs`} />
            </label>
            <label className="flex items-center gap-1.5 text-xs font-bold text-muted">
              <span>Sampai:</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Sampai tanggal" className={`${selectCls} !h-8 text-xs`} />
            </label>
          </>
        }
        extraCount={Boolean(from) + Boolean(to)}
        hasActiveFilters={hasActiveFilters}
        onReset={resetFilters}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex overflow-hidden rounded-lg border border-line">
              <button
                type="button"
                aria-label="Tampilan daftar"
                title="Daftar"
                onClick={() => setMode("list")}
                className={`grid h-10 w-10 place-items-center transition-colors ${mode === "list" ? "bg-maroon text-[#EEEAD7] font-bold" : "bg-paper text-accent hover:bg-track"}`}
              >
                <LayoutList size={17} />
              </button>
              <button
                type="button"
                aria-label="Tampilan papan"
                title="Papan status"
                onClick={() => setMode("board")}
                className={`grid h-10 w-10 place-items-center transition-colors ${mode === "board" ? "bg-maroon text-[#EEEAD7] font-bold" : "bg-paper text-accent hover:bg-track"}`}
              >
                <Columns3 size={17} />
              </button>
            </div>
            <ExportMenu name="Laporan_Kost" title="Laporan Kost" columns={columns} rows={filtered} filters={filters} />
          </div>
        }
      >
        <select value={tab} onChange={(e) => setTab(e.target.value)} aria-label="Filter status laporan" className={selectCls}>
          <option value="Semua">Semua Status</option>
          {REPORT_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter jenis laporan" className={selectCls}>
          <option>Semua Jenis</option>
          {REPORT_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
      </FilterBar>

      {mode === "list" ? (
        <Panel>
          <DataTable headers={["Laporan & Kost", "Pelapor", "Jenis Laporan", "Tanggal", "Status", { title: "Aksi", align: "text-center", className: "w-20" }]}>
            {pager.slice.length ? pager.slice.map((r) => (
              <tr key={r.id}>
                <Td>
                  <strong className="block text-ink">{r.kostName}</strong>
                  <span className="text-xs text-muted font-mono">{r.id}</span>
                </Td>
                <Td><span className="text-sm text-ink">{r.reporterName}</span></Td>
                <Td><span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-track">{r.type}</span></Td>
                <Td className="text-xs text-muted whitespace-nowrap">{formatDate(r.createdAt)}</Td>
                <Td><Badge status={r.status} size="sm" /></Td>
                <Td className="text-center">
                  <div className="flex justify-center">
                    <IconButton label="Detail & tindak lanjut" tone="info" onClick={() => setOpenId(r.id)}>
                      <Eye size={16} />
                    </IconButton>
                  </div>
                </Td>
              </tr>
            )) : (
              <tr>
                <Td colSpan={6}>
                  <EmptyState title="Laporan tidak ditemukan" message="Ubah filter atau kata kunci pencarian." onReset={hasActiveFilters ? resetFilters : undefined} />
                </Td>
              </tr>
            )}
          </DataTable>
          <Pagination pager={pager} />
        </Panel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {REPORT_STATUS.map((s) => (
            <section key={s} className="min-h-[300px] rounded-xl border border-line bg-paper p-4 flex flex-col shadow-sm">
              <h2 className="mb-3 flex items-center justify-between text-base font-extrabold text-ink">
                <span>{s}</span>
                <Badge status={s} label={String(filtered.filter((r) => r.status === s).length)} />
              </h2>
              <div className="grid gap-3 flex-1 content-start">
                {filtered.filter((r) => r.status === s).map((r) => (
                  <article key={r.id} className="grid gap-2 rounded-lg border border-line bg-field p-3 transition-shadow hover:shadow-sm">
                    <div className="flex items-start justify-between gap-1">
                      <strong className="text-ink text-sm leading-tight">{r.kostName}</strong>
                      <span className="font-mono text-[10px] text-muted">{r.id}</span>
                    </div>
                    <span className="text-xs font-medium text-muted">{r.type}</span>
                    <p className="text-xs text-muted">
                      {r.reporterName} · {formatDate(r.createdAt)}
                    </p>
                    <div className="pt-1">
                      <GhostButton onClick={() => setOpenId(r.id)} className="w-full justify-center !text-xs !py-1">
                        <Eye size={14} /><span>Tindak Lanjut</span>
                      </GhostButton>
                    </div>
                  </article>
                ))}
                {!filtered.some((r) => r.status === s) && (
                  <p className="py-12 text-center text-xs text-muted">Tidak ada laporan pada status ini.</p>
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      {report && <ReportDetail report={report} data={data} act={act} toast={toast} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function ReportDetail({ report, data, act, toast, onClose }) {
  const [note, setNote] = useState(report.note || "");
  const [adminAction, setAdminAction] = useState(report.adminAction || "");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const kost = (data?.kosts || []).find((k) => k.id === report.kostId);
  const reporter = (data?.users || []).find((u) => u.id === report.reporterId);
  const locked = ["Selesai", "Ditolak"].includes(report.status);

  const send = async (status, message) => {
    setErrors({});
    try {
      await act(`reports/${report.id}`, { method: "PATCH", body: { status, note, adminAction } });
      toast(message);
      if (status !== report.status && ["Selesai", "Ditolak"].includes(status)) onClose();
    } catch (e) {
      setErrors(e.fields || {});
      throw e;
    }
  };

  const saveNote = async () => {
    setSaving(true);
    try {
      await send(report.status, "Catatan laporan disimpan.");
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const ask = (type) => {
    const e = {};
    if (note.trim().length < 5) e.note = "Catatan/tindakan Admin wajib diisi (minimal 5 karakter).";
    if (type === "Selesai" && !adminAction) e.adminAction = "Pilih tindakan yang diambil.";
    setErrors(e);
    if (!Object.keys(e).length) setConfirm(type);
  };

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title={`Laporan ${report.id}`}
        maxWidth="max-w-3xl"
        footer={!locked && (
          <div className="flex flex-wrap items-center justify-between w-full gap-2 pt-2 border-t border-line">
            <GhostButton onClick={saveNote} loading={saving}>
              <Save size={16} /><span>Simpan Catatan</span>
            </GhostButton>
            <div className="flex flex-wrap gap-2">
              {report.status === "Baru" && (
                <PrimaryButton onClick={() => setConfirm("Diproses")}>
                  <PlayCircle size={16} /><span>Proses Laporan</span>
                </PrimaryButton>
              )}
              {report.status === "Diproses" && (
                <PrimaryButton tone="success" onClick={() => ask("Selesai")}>
                  <CheckCircle2 size={16} /><span>Selesaikan Laporan</span>
                </PrimaryButton>
              )}
              <GhostButton tone="danger" onClick={() => ask("Ditolak")}>
                <XCircle size={16} /><span>Tolak Laporan</span>
              </GhostButton>
            </div>
          </div>
        )}
      >
        <div className="space-y-6">
          {/* Header Status & Tanggal */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-track/40 p-3 rounded-lg border border-line">
            <div className="flex items-center gap-2">
              <Badge status={report.status} />
              <span className="font-semibold text-xs px-2.5 py-0.5 rounded-full bg-field border border-line">
                {report.type}
              </span>
            </div>
            <span className="text-xs text-muted">Dilaporkan: {formatDateTime(report.createdAt)}</span>
          </div>

          {/* Deskripsi Laporan */}
          <div className="space-y-2">
            <h4 className="text-xs font-extrabold uppercase text-muted tracking-wider">Deskripsi Laporan</h4>
            <div className="p-3 rounded-lg border border-line bg-field text-sm text-ink leading-relaxed">
              {report.description}
            </div>
          </div>

          {/* Bukti Laporan */}
          <div className="space-y-2">
            <h4 className="text-xs font-extrabold uppercase text-muted tracking-wider">Bukti Lampiran Pelapor</h4>
            {report.evidence?.length ? (
              <div className="flex flex-wrap gap-3">
                {report.evidence.map((src, i) => (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <a key={i} href={src} target="_blank" rel="noreferrer" className="group relative block overflow-hidden rounded-lg border border-line">
                    <img src={src} alt={`Bukti ${i + 1}`} className="h-28 w-28 object-cover transition-transform group-hover:scale-105" />
                  </a>
                ))}
              </div>
            ) : (
              <p className="rounded-lg bg-track/50 p-3 text-xs text-muted">Pelapor tidak melampirkan foto/bukti.</p>
            )}
          </div>

          {/* Kost & Pelapor */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-line bg-field p-4 space-y-2">
              <p className="text-xs font-extrabold uppercase text-muted tracking-wider">Kost yang Dilaporkan</p>
              {kost ? (
                <DetailGrid items={[
                  ["Nama", kost.name],
                  ["ID Kost", kost.id],
                  ["Harga", formatCurrency(kost.price)],
                  ["Status", <Badge key="s" status={kost.status} />],
                  ["Alamat", `${kost.address}, ${kost.area}`, true],
                  ["Pemilik", kost.ownerName, true],
                ]} />
              ) : (
                <p className="text-xs font-bold text-bad-fg">Data kost "{report.kostName}" telah dihapus atau tidak ditemukan.</p>
              )}
            </div>

            <div className="rounded-xl border border-line bg-field p-4 space-y-2">
              <p className="text-xs font-extrabold uppercase text-muted tracking-wider">Informasi Pelapor</p>
              {reporter ? (
                <DetailGrid items={[
                  ["Nama", reporter.name],
                  ["Email", reporter.email],
                  ["Telepon", reporter.phone || "-"],
                  ["Status Akun", <Badge key="s" status={reporter.status} />],
                ]} />
              ) : (
                <p className="text-xs text-muted">Data akun pelapor tidak tersedia.</p>
              )}
            </div>
          </div>

          {/* Tindakan & Catatan Admin */}
          <div className="space-y-4 rounded-xl border border-line bg-track/30 p-4">
            <h4 className="text-xs font-extrabold uppercase text-muted tracking-wider">Tindakan Penyelesaian Admin</h4>
            <SelectField
              label="Tindakan yang Diambil"
              value={adminAction}
              onChange={(e) => setAdminAction(e.target.value)}
              options={REPORT_ACTIONS}
              placeholder="Pilih tindakan administratif"
              disabled={locked}
              error={errors.adminAction}
            />
            <TextArea
              label="Catatan Admin / Hasil Investigasi"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              disabled={locked}
              error={errors.note}
              hint={locked ? "Laporan telah diselesaikan dan berstatus arsip/final." : "Wajib diisi minimal 5 karakter sebelum menyelesaikan atau menolak laporan."}
            />
            {adminAction === "Menonaktifkan kost" && !locked && (
              <div className="flex items-center gap-2 rounded-lg bg-warn-bg/80 border border-warn-fg/30 p-2.5 text-xs font-bold text-warn-fg">
                <AlertCircle size={16} className="shrink-0" />
                <span>Saat laporan diselesaikan dengan tindakan ini, kost terkait akan otomatis dinonaktifkan dari publikasi.</span>
              </div>
            )}
            {report.handledByName && (
              <p className="text-xs text-muted">
                Ditangani oleh: <strong>{report.handledByName}</strong> · Terakhir diperbarui: {formatDateTime(report.updatedAt)}
              </p>
            )}
          </div>

          {/* Riwayat Aktivitas Laporan */}
          <div className="space-y-2 pt-2 border-t border-line">
            <h4 className="text-xs font-extrabold uppercase text-muted tracking-wider">Riwayat Aktivitas Laporan</h4>
            <ActivityTimeline items={report.timeline || []} />
          </div>
        </div>
      </Modal>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        tone={confirm === "Ditolak" ? "danger" : confirm === "Selesai" ? "success" : "primary"}
        title={confirm === "Diproses" ? "Mulai Proses Laporan" : confirm === "Selesai" ? "Selesaikan Laporan" : "Tolak Laporan"}
        message={
          confirm === "Diproses"
            ? "Mulai memproses laporan ini? Anda akan tercatat sebagai admin penanggung jawab."
            : confirm === "Selesai"
            ? "Tandai laporan telah selesai dengan tindakan dan catatan yang telah diisi? Status laporan ini akan menjadi final."
            : "Apakah Anda yakin ingin menolak laporan ini? Status tidak dapat diubah lagi setelah penolakan."
        }
        confirmLabel={confirm === "Diproses" ? "Ya, Proses Sekarang" : confirm === "Selesai" ? "Ya, Selesaikan" : "Tolak Laporan"}
        onConfirm={async () => {
          await send(confirm, confirm === "Diproses" ? "Laporan sedang diproses." : confirm === "Selesai" ? "Laporan diselesaikan." : "Laporan ditolak.");
          setConfirm(null);
        }}
      />
    </>
  );
}
