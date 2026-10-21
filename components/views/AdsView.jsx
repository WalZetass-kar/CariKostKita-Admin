"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Eye,
  Pencil,
  Plus,
  Power,
  Save,
  Trash2,
  X,
  Archive,
  RotateCcw,
  BarChart3,
  ExternalLink,
  CheckCircle,
} from "lucide-react";
import { useApp, useStats } from "../AppContext";
import { ChartCanvas } from "../charts";
import { PeriodSelect } from "./DashboardView";
import {
  Badge,
  ConfirmDialog,
  DataTable,
  EmptyState,
  ErrorState,
  ExportMenu,
  Field,
  FilterBar,
  FilterTabs,
  GhostButton,
  IconButton,
  ImageField,
  Modal,
  Pagination,
  Panel,
  PanelTitle,
  PrimaryButton,
  SelectField,
  SkeletonCard,
  SkeletonChart,
  Td,
  TextArea,
  selectCls,
  useForm,
  usePagination,
  useToast,
  ActivityTimeline,
} from "../ui";
import { AD_POSITIONS, AD_TYPES } from "@/lib/constants";
import { formatDate, formatNumber, inRange, todayString } from "@/lib/format";

const ctr = (a) => (a.impressions ? ((a.clicks / a.impressions) * 100).toFixed(2) : "0.00");
const emptyAd = () => ({
  title: "",
  description: "",
  image: "",
  link: "",
  type: "Banner",
  position: AD_POSITIONS.Banner[0],
  web: true,
  android: true,
  start: todayString(),
  end: "",
  status: "Aktif",
});
const platformOf = (v) => (v.web && v.android ? "Website + Android" : v.web ? "Website" : v.android ? "Android" : "");

/** Pratinjau iklan sebagaimana tampil di Website / Android. */
export function AdPreview({ ad }) {
  const available = ad.platform === "Website + Android" ? ["Website", "Android"] : [ad.platform || "Website"];
  const [target, setTarget] = useState(available[0]);
  useEffect(() => setTarget(available[0]), [ad.platform]); // eslint-disable-line react-hooks/exhaustive-deps
  const android = target === "Android";
  const content = (
    <>
      {ad.image && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={ad.image} alt={ad.title} className="aspect-[5/2] w-full object-cover" />
      )}
      <div className="p-3">
        <strong className="block text-sm text-[#211D1A]">{ad.title || "Judul iklan"}</strong>
        <p className="mt-1 text-xs text-[#706861]">{ad.description || "Deskripsi iklan"}</p>
        <span className="mt-2 inline-block rounded-md bg-maroon px-3 py-1.5 text-xs font-bold text-[#EEEAD7]">
          Lihat Selengkapnya
        </span>
      </div>
    </>
  );
  return (
    <div className="grid gap-3">
      {available.length > 1 && <FilterTabs options={available} value={target} onChange={setTarget} />}
      <div
        className={`relative mx-auto w-full overflow-hidden border border-line bg-[#EEEAD7] ${
          android ? "max-w-[300px] rounded-[28px] p-2" : "max-w-xl rounded-lg"
        }`}
        style={{ minHeight: 280 }}
      >
        <div
          className={`flex items-center gap-2 bg-maroon px-3 py-2 text-xs font-bold text-[#EEEAD7] ${
            android ? "rounded-t-[20px]" : ""
          }`}
        >
          CariKostKita <span className="opacity-60">{android ? "Android" : "Website"}</span>
        </div>
        <div className="relative p-3" style={{ minHeight: 230 }}>
          {ad.type === "Pop-up" ? (
            <div className="absolute inset-0 grid place-items-center bg-black/60 p-4">
              <div className="relative w-full max-w-[260px] overflow-hidden rounded-xl bg-field shadow-2xl">
                <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-black/50 text-white">
                  <X size={14} />
                </span>
                {content}
              </div>
            </div>
          ) : ad.type === "Banner" ? (
            <div className="grid gap-3">
              <div className="overflow-hidden rounded-lg bg-field shadow">{content}</div>
              <div className="skeleton h-14" />
              <div className="skeleton h-14" />
            </div>
          ) : (
            <div className="grid gap-3">
              <div className="skeleton h-14" />
              <div className="max-w-[260px] overflow-hidden rounded-lg border border-line bg-field shadow">{content}</div>
            </div>
          )}
        </div>
      </div>
      <p className="text-center text-xs text-muted">
        {ad.type} · Posisi: {ad.position}
      </p>
    </div>
  );
}

export function AdFormModal({ ad, onClose, onSaved }) {
  const { act } = useApp();
  const toast = useToast();
  const form = useForm(emptyAd());
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(ad?.id);

  useEffect(() => {
    if (!ad) return;
    setErrors({});
    form.setValues(isEdit ? { ...ad, web: ad.platform !== "Android", android: ad.platform !== "Website" } : emptyAd());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ad]);
  if (!ad) return null;
  const v = form.values;
  const draft = { ...v, platform: platformOf(v) || "Website" };

  const submit = async (e) => {
    e.preventDefault();
    const platform = platformOf(v);
    if (!platform) return setErrors({ platform: "Pilih minimal satu platform." });
    setSaving(true);
    setErrors({});
    try {
      await act(isEdit ? `ads/${ad.id}` : "ads", { method: isEdit ? "PATCH" : "POST", body: { ...v, platform } });
      toast(isEdit ? "Iklan berhasil diperbarui." : "Iklan berhasil ditambahkan.");
      onClose();
      onSaved?.();
    } catch (err) {
      setErrors(err.fields || {});
      toast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={saving ? undefined : onClose} title={isEdit ? "Edit Iklan" : "Tambah Iklan"} maxWidth="max-w-4xl">
      <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Judul Iklan" className="sm:col-span-2" {...form.bind("title")} error={errors.title} required />
          <TextArea label="Deskripsi Singkat" className="sm:col-span-2" {...form.bind("description")} error={errors.description} />
          <ImageField label="Gambar / Banner Iklan" className="sm:col-span-2" value={v.image} onChange={(x) => form.set("image", x)} error={errors.image} hint="Disarankan rasio 5:2 (contoh 1200x480 piksel)." />
          <Field label="Link Tujuan (URL)" className="sm:col-span-2" {...form.bind("link")} error={errors.link} placeholder="https://carikostkita.id/promo" />
          <SelectField label="Tipe Iklan" value={v.type} onChange={(e) => setErrorsAndType(e.target.value)} options={AD_TYPES} error={errors.type} />
          <SelectField label="Posisi Iklan" {...form.bind("position")} options={AD_POSITIONS[v.type] || []} error={errors.position} />
          <fieldset className="sm:col-span-2">
            <legend className="mb-2 text-sm font-extrabold text-muted">Platform Penayangan</legend>
            <div className="flex flex-wrap gap-4">
              {[["web", "Website"], ["android", "Android"]].map(([k, l]) => (
                <label key={k} className="flex items-center gap-2 font-bold cursor-pointer">
                  <input type="checkbox" checked={v[k]} onChange={(e) => form.set(k, e.target.checked)} className="h-4 w-4 rounded border-line" />
                  <span>{l}</span>
                </label>
              ))}
            </div>
            {errors.platform && <span role="alert" className="text-xs font-bold text-bad-fg">{errors.platform}</span>}
          </fieldset>
          <Field label="Tanggal Mulai Tayang" type="date" {...form.bind("start")} error={errors.start} required />
          <Field label="Tanggal Berakhir Tayang" type="date" min={v.start} {...form.bind("end")} error={errors.end} required />
          <SelectField label="Status Iklan" {...form.bind("status")} options={["Aktif", "Nonaktif"]} error={errors.status} hint="Iklan otomatis berhenti tayang setelah tanggal berakhir." />
          <div className="flex items-end justify-end gap-2 sm:col-span-2 pt-2 border-t border-line">
            <GhostButton onClick={onClose} disabled={saving}>Batal</GhostButton>
            <PrimaryButton type="submit" loading={saving}><Save size={18} /><span>Simpan Iklan</span></PrimaryButton>
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-extrabold uppercase text-muted tracking-wider">Pratinjau Tampilan</p>
          <AdPreview ad={draft} />
        </div>
      </form>
    </Modal>
  );

  function setErrorsAndType(type) {
    form.setValues((x) => ({ ...x, type, position: AD_POSITIONS[type]?.[0] || "" }));
  }
}

export function AdsView() {
  const { data, act, admin, targetEntityId, clearTargetEntityId } = useApp();
  const toast = useToast();
  const [tab, setTab] = useState("Daftar Iklan");
  const [status, setStatus] = useState("Semua");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [form, setForm] = useState(null);
  const [preview, setPreview] = useState(null);
  const [search, setSearch] = useState("");
  const [confirm, setConfirm] = useState(null);

  // Deep linking dari notifikasi atau global search
  useEffect(() => {
    if (targetEntityId && data?.ads) {
      const match = data.ads.find((a) => a.id === targetEntityId);
      if (match) {
        setPreview(match);
        clearTargetEntityId?.();
      }
    }
  }, [targetEntityId, data?.ads, clearTargetEntityId]);

  const hasActiveFilters = status !== "Semua" || Boolean(from) || Boolean(to) || Boolean(search);
  const resetFilters = () => {
    setStatus("Semua");
    setFrom("");
    setTo("");
    setSearch("");
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.ads || []).filter((a) => {
      const matchStatus =
        status === "Semua"
          ? true
          : status === "Diarsipkan"
          ? Boolean(a.archived)
          : a.effective === status && !a.archived;
      const matchDates = (!from || a.end >= from) && (!to || a.start <= to);
      const matchQuery = !q || [a.title, a.type, a.platform, a.position].some((x) => x.toLowerCase().includes(q));
      return matchStatus && matchDates && matchQuery;
    });
  }, [data?.ads, status, from, to, search]);

  const pager = usePagination(filtered, 10);
  useEffect(() => pager.reset(), [status, from, to, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const filters = [
    status !== "Semua" && `Status: ${status}`,
    from && `Tayang dari: ${from}`,
    to && `Tayang sampai: ${to}`,
    search && `Pencarian: "${search}"`,
  ].filter(Boolean);

  const columns = [
    { label: "Judul", value: (a) => a.title },
    { label: "Tipe", value: (a) => a.type },
    { label: "Platform", value: (a) => a.platform },
    { label: "Posisi", value: (a) => a.position },
    { label: "Mulai", value: (a) => a.start },
    { label: "Berakhir", value: (a) => a.end },
    { label: "Status", value: (a) => (a.archived ? "Diarsipkan" : a.effective) },
    { label: "Impression", value: (a) => a.impressions },
    { label: "Click", value: (a) => a.clicks },
    { label: "CTR (%)", value: (a) => ctr(a) },
    { label: "Link", value: (a) => a.link },
  ];

  const toggle = async (ad) => {
    const res = await act(`ads/${ad.id}/toggle`);
    toast(`Iklan ${res.ad.status === "Aktif" ? "diaktifkan" : "dinonaktifkan"}.`);
    setConfirm(null);
  };

  const archiveItem = (ad) => async () => {
    try {
      await act(`ads/${ad.id}/archive`);
      toast(`Iklan "${ad.title}" berhasil diarsipkan.`);
      setConfirm(null);
      setPreview(null);
    } catch (err) {
      toast(err.message, "error");
    }
  };

  const restoreItem = (ad) => async () => {
    try {
      await act(`ads/${ad.id}/restore`);
      toast(`Iklan "${ad.title}" berhasil dipulihkan.`);
      setConfirm(null);
      setPreview(null);
    } catch (err) {
      toast(err.message, "error");
    }
  };

  const permanentDeleteItem = (ad) => async () => {
    try {
      await act(`ads/${ad.id}/permanent`, { method: "DELETE" });
      toast(`Iklan "${ad.title}" berhasil dihapus permanen.`);
      setConfirm(null);
      setPreview(null);
    } catch (err) {
      toast(err.message, "error");
    }
  };

  const isSuperAdmin = (admin?.role || data?.admin?.role) === "super_admin";

  return (
    <div className="space-y-4">
      <FilterTabs options={["Daftar Iklan", "Statistik Iklan"]} value={tab} onChange={setTab} />
      {tab === "Daftar Iklan" ? (
        <>
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Cari judul, tipe, posisi..."
            extraFilters={
              <>
                <label className="flex items-center gap-1.5 text-xs font-bold text-muted">
                  <span>Dari:</span>
                  <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Tayang dari" className={`${selectCls} !h-8 text-xs`} />
                </label>
                <label className="flex items-center gap-1.5 text-xs font-bold text-muted">
                  <span>Sampai:</span>
                  <input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Tayang sampai" className={`${selectCls} !h-8 text-xs`} />
                </label>
              </>
            }
            extraCount={Boolean(from) + Boolean(to)}
            hasActiveFilters={hasActiveFilters}
            onReset={resetFilters}
            actions={
              <>
                <ExportMenu name="Data_Iklan" title="Data Iklan" columns={columns} rows={filtered} filters={filters} />
                <PrimaryButton onClick={() => setForm({})}><Plus size={18} /><span>Tambah Iklan</span></PrimaryButton>
              </>
            }
          >
            <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter status iklan" className={selectCls}>
              {["Semua", "Aktif", "Terjadwal", "Selesai", "Nonaktif", "Diarsipkan"].map((s) => <option key={s}>{s}</option>)}
            </select>
          </FilterBar>

          <Panel>
            <DataTable headers={["Iklan & Format", "Periode", "Status", "Performa & CTR", { title: "Aksi", align: "text-center", className: "w-28" }]}>
              {pager.slice.length ? pager.slice.map((a) => (
                <tr key={a.id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={a.image} alt="" className="h-11 w-16 shrink-0 rounded-md object-cover border border-line" />
                      <div className="min-w-0">
                        <strong className="block truncate text-ink">{a.title}</strong>
                        <span className="block text-xs text-muted truncate">
                          {a.type} · {a.platform} · {a.position}
                        </span>
                      </div>
                    </div>
                  </Td>
                  <Td><span className="text-xs text-muted whitespace-nowrap">{formatDate(a.start)} - {formatDate(a.end)}</span></Td>
                  <Td>
                    {a.archived ? (
                      <Badge status="Diarsipkan" tone="danger" label="Diarsipkan" size="sm" />
                    ) : (
                      <>
                        <Badge status={a.effective} size="sm" />
                        {a.effective === "Selesai" && a.status === "Aktif" && (
                          <span className="block text-[11px] text-muted">Periode berakhir</span>
                        )}
                      </>
                    )}
                  </Td>
                  <Td>
                    <div className="text-xs space-y-0.5">
                      <div className="font-bold text-ink tabular-nums">{ctr(a)}% CTR</div>
                      <div className="text-muted tabular-nums text-[11px]">{formatNumber(a.impressions)} imp / {formatNumber(a.clicks)} clk</div>
                    </div>
                  </Td>
                  <Td className="text-center">
                    <div className="flex gap-1 items-center justify-center">
                      <IconButton label="Preview Detail" tone="info" onClick={() => setPreview(a)}><Eye size={16} /></IconButton>
                      <IconButton label="Edit" tone="info" onClick={() => setForm(a)}><Pencil size={16} /></IconButton>
                      {!a.archived && (
                        <IconButton
                          label={a.status === "Aktif" ? "Nonaktifkan" : "Aktifkan"}
                          tone={a.status === "Aktif" ? "warning" : "success"}
                          onClick={() => setConfirm({ type: "toggle", ad: a })}
                        >
                          <Power size={17} />
                        </IconButton>
                      )}
                      {a.archived ? (
                        <>
                          <IconButton label="Pulihkan Iklan" tone="success" onClick={() => setConfirm({ type: "restore", ad: a })}>
                            <RotateCcw size={17} />
                          </IconButton>
                          {isSuperAdmin && (
                            <IconButton label="Hapus Permanen" tone="danger" onClick={() => setConfirm({ type: "permanentDelete", ad: a })}>
                              <Trash2 size={17} />
                            </IconButton>
                          )}
                        </>
                      ) : (
                        <IconButton label="Arsipkan Iklan" tone="danger" onClick={() => setConfirm({ type: "archive", ad: a })}>
                          <Archive size={17} />
                        </IconButton>
                      )}
                    </div>
                  </Td>
                </tr>
              )) : (
                <tr>
                  <Td colSpan={7}>
                    <EmptyState
                      title="Belum ada iklan"
                      message="Tambahkan iklan promosi baru atau ubah filter pencarian."
                      onReset={hasActiveFilters ? resetFilters : undefined}
                      action={<PrimaryButton onClick={() => setForm({})}><Plus size={16} />Tambah Iklan</PrimaryButton>}
                    />
                  </Td>
                </tr>
              )}
            </DataTable>
            <Pagination pager={pager} />
          </Panel>
        </>
      ) : (
        <AdStats />
      )}

      {/* Modal Form Tambah/Edit Iklan */}
      <AdFormModal ad={form} onClose={() => setForm(null)} />

      {/* Modal Detail / Preview Iklan */}
      <Modal
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        title="Detail & Pratinjau Iklan"
        maxWidth="max-w-2xl"
        footer={preview && (
          <div className="flex flex-wrap items-center justify-between w-full gap-2 pt-2 border-t border-line">
            <div className="flex items-center gap-1.5">
              {preview.archived ? (
                <>
                  <PrimaryButton tone="success" onClick={() => setConfirm({ type: "restore", ad: preview })}>
                    <RotateCcw size={16} /><span>Pulihkan</span>
                  </PrimaryButton>
                  {isSuperAdmin && (
                    <GhostButton tone="danger" onClick={() => setConfirm({ type: "permanentDelete", ad: preview })}>
                      <Trash2 size={16} /><span>Hapus Permanen</span>
                    </GhostButton>
                  )}
                </>
              ) : (
                <GhostButton tone="danger" onClick={() => setConfirm({ type: "archive", ad: preview })}>
                  <Archive size={16} /><span>Arsipkan</span>
                </GhostButton>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <GhostButton onClick={() => { setForm(preview); setPreview(null); }}>
                <Pencil size={16} /><span>Edit</span>
              </GhostButton>
              {preview.link && (
                <a
                  href={preview.link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line text-xs font-bold hover:bg-track"
                >
                  <ExternalLink size={14} /><span>Kunjungi Link</span>
                </a>
              )}
            </div>
          </div>
        )}
      >
        {preview && (
          <div className="space-y-6">
            <AdPreview ad={preview} />

            {/* Statistik Ringkas Iklan */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-line bg-field p-3 text-center">
                <span className="text-xs text-muted block">Impression</span>
                <strong className="text-xl text-ink">{formatNumber(preview.impressions || 0)}</strong>
              </div>
              <div className="rounded-lg border border-line bg-field p-3 text-center">
                <span className="text-xs text-muted block">Klik</span>
                <strong className="text-xl text-ink">{formatNumber(preview.clicks || 0)}</strong>
              </div>
              <div className="rounded-lg border border-line bg-field p-3 text-center">
                <span className="text-xs text-muted block">CTR</span>
                <strong className="text-xl text-maroon">{ctr(preview)}%</strong>
              </div>
            </div>

            {/* Riwayat Aktivitas Iklan */}
            <div className="space-y-2 pt-2 border-t border-line">
              <h4 className="text-xs font-extrabold uppercase text-muted tracking-wider">Riwayat Aktivitas Iklan</h4>
              <ActivityTimeline items={preview.timeline || []} />
            </div>
          </div>
        )}
      </Modal>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(confirm)}
        tone={
          confirm?.type === "permanentDelete" || confirm?.type === "archive" || (confirm?.type === "toggle" && confirm?.ad?.status === "Aktif")
            ? "danger"
            : "primary"
        }
        title={
          confirm?.type === "permanentDelete"
            ? "Hapus Permanen Iklan"
            : confirm?.type === "archive"
            ? "Arsipkan Iklan"
            : confirm?.type === "restore"
            ? "Pulihkan Iklan"
            : confirm?.ad?.status === "Aktif"
            ? "Nonaktifkan Iklan"
            : "Aktifkan Iklan"
        }
        message={
          confirm &&
          (confirm.type === "permanentDelete"
            ? `Apakah Anda yakin ingin menghapus permanen iklan "${confirm.ad.title}"? Seluruh data event tayang & klik akan dihapus. Tindakan ini tidak dapat dibatalkan.`
            : confirm.type === "archive"
            ? `Arsipkan iklan "${confirm.ad.title}"? Iklan akan berhenti tayang dan dapat dipulihkan sewaktu-waktu.`
            : confirm.type === "restore"
            ? `Pulihkan iklan "${confirm.ad.title}" dari arsip? Iklan akan diaktifkan kembali sesuai jadwal.`
            : confirm.ad.status === "Aktif"
            ? `Nonaktifkan iklan "${confirm.ad.title}"? Iklan akan berhenti tayang di Website dan Android.`
            : `Aktifkan kembali iklan "${confirm.ad.title}"?`)
        }
        confirmLabel={
          confirm?.type === "permanentDelete"
            ? "Hapus Permanen"
            : confirm?.type === "archive"
            ? "Arsipkan"
            : confirm?.type === "restore"
            ? "Pulihkan"
            : confirm?.ad?.status === "Aktif"
            ? "Nonaktifkan"
            : "Aktifkan"
        }
        summary={
          confirm?.ad && (
            <div className="space-y-1 rounded-lg bg-track/50 p-3 border border-line text-xs">
              <strong className="block text-ink">{confirm.ad.title}</strong>
              <p className="text-muted">{confirm.ad.type} · {confirm.ad.platform} · {confirm.ad.position}</p>
              <p className="text-muted">Periode: {formatDate(confirm.ad.start)} s/d {formatDate(confirm.ad.end)}</p>
            </div>
          )
        }
        onConfirm={
          confirm?.type === "permanentDelete"
            ? permanentDeleteItem(confirm.ad)
            : confirm?.type === "archive"
            ? archiveItem(confirm.ad)
            : confirm?.type === "restore"
            ? restoreItem(confirm.ad)
            : () => toggle(confirm.ad)
        }
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}

export function StatCard({ label, value, hint }) {
  return (
    <div className="animate-fade-in rounded-xl border border-line bg-paper p-3.5 sm:p-4 shadow-panel transition hover:-translate-y-0.5 min-w-0">
      <p className="text-[11px] font-bold text-muted uppercase tracking-wider truncate">{label}</p>
      <strong className="mt-1 block text-xl sm:text-2xl font-extrabold leading-tight text-ink">{value}</strong>
      {hint && <span className="mt-1 block truncate text-[11px] text-muted">{hint}</span>}
    </div>
  );
}

export function adStatColumns() {
  return [
    { label: "Iklan", value: (a) => a.title },
    { label: "Tipe", value: (a) => a.type },
    { label: "Platform", value: (a) => a.platform },
    { label: "Impression", value: (a) => a.impressions },
    { label: "Click", value: (a) => a.clicks },
    { label: "CTR (%)", value: (a) => a.ctr.toFixed(2) },
    { label: "Status", value: (a) => a.effective },
  ];
}

function AdStats() {
  const [period, setPeriod] = useState("harian");
  const { stats, loading, error, retry } = useStats(period);
  if (error && !stats) return <Panel><ErrorState message={error} onRetry={retry} /></Panel>;
  if (!stats) return (
    <div className="space-y-4">
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6">
        <SkeletonCard count={6} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <SkeletonChart height={220} />
        <SkeletonChart height={220} />
      </div>
    </div>
  );
  const a = stats.ads;
  return (
    <div className={`space-y-4 ${loading ? "opacity-70" : ""}`}>
      <div className="flex flex-wrap justify-end gap-2">
        <PeriodSelect value={period} onChange={setPeriod} />
        <ExportMenu name="Statistik_Iklan" title="Statistik Iklan" columns={adStatColumns()} rows={a.comparison} filters={["Seluruh periode tayang"]} />
      </div>
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total Impression" value={formatNumber(a.impressions)} />
        <StatCard label="Total Click" value={formatNumber(a.clicks)} />
        <StatCard label="Rata-rata CTR" value={`${a.ctr.toFixed(2)}%`} hint="Rumus: (Click / Impression) × 100%" />
        <StatCard label="Iklan Aktif / Selesai" value={`${stats.totals.adsActive} / ${stats.totals.adsFinished}`} />
        <StatCard label="Paling Banyak Dilihat" value={a.mostViewed ? formatNumber(a.mostViewed.impressions) : "-"} hint={a.mostViewed?.title} />
        <StatCard label="Paling Banyak Diklik" value={a.mostClicked ? formatNumber(a.mostClicked.clicks) : "-"} hint={a.mostClicked?.title} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel>
          <PanelTitle eyebrow="Impression" title="Impression Berdasarkan Waktu" />
          <ChartCanvas type="line" labels={a.series.labels} series={[{ name: "Impression", values: a.series.impressions, color: "#6D0808" }]} />
        </Panel>
        <Panel>
          <PanelTitle eyebrow="Click" title="Click Berdasarkan Waktu" />
          <ChartCanvas type="line" labels={a.series.labels} series={[{ name: "Click", values: a.series.clicks, color: "#3F6475" }]} />
        </Panel>
      </div>
      <Panel>
        <PanelTitle eyebrow="Perbandingan" title="Performa Antar Iklan" />
        <ChartCanvas
          type="bar"
          labels={a.comparison.map((x) => x.title.slice(0, 14))}
          series={[
            { name: "Impression", values: a.comparison.map((x) => x.impressions), color: "#6D0808" },
            { name: "Click", values: a.comparison.map((x) => x.clicks), color: "#64705F" },
          ]}
        />
        <div className="mt-4">
          <DataTable headers={["Iklan", "Platform", "Impression", "Click", "CTR", "Status"]}>
            {a.comparison.map((x) => (
              <tr key={x.id}>
                <Td><strong>{x.title}</strong></Td>
                <Td>{x.platform}</Td>
                <Td>{formatNumber(x.impressions)}</Td>
                <Td>{formatNumber(x.clicks)}</Td>
                <Td className="font-bold">{x.ctr.toFixed(2)}%</Td>
                <Td><Badge status={x.effective} /></Td>
              </tr>
            ))}
          </DataTable>
        </div>
      </Panel>
    </div>
  );
}
