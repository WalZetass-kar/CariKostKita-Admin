"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Archive, ArchiveRestore, ArrowUpRight, BadgeCheck, Ban, CheckCircle2,
  ExternalLink, Eye, MapPin, Pencil, Plus, Power, RotateCcw, Save,
  ShieldAlert, Trash2, XCircle
} from "lucide-react";
import { useApp } from "../AppContext";
import {
  ActivityTimeline, Badge, BulkActionBar, ConfirmDialog, DataTable,
  DetailGrid, EmptyState, ExportMenu, Field, FilterBar, GhostButton,
  IconButton, ImageField, Modal, Pagination, Panel, PrimaryButton,
  SelectField, Td, TextArea, selectCls, useForm, usePagination, useToast
} from "../ui";
import { KOST_STATUS } from "@/lib/constants";
import { formatCurrency, formatDate, inRange } from "@/lib/format";

const emptyForm = {
  name: "",
  price: "",
  area: "",
  ownerId: "",
  address: "",
  description: "",
  facilities: "",
  rooms: "1",
  latitude: "",
  longitude: "",
  photo: "",
};

/** Form tambah/edit kost. Hanya ada satu tombol Tambah Kost di halaman. */
export function KostFormModal({ kost, onClose }) {
  const { data, act } = useApp();
  const toast = useToast();
  const form = useForm(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(kost?.id);

  useEffect(() => {
    if (!kost) return;
    setErrors({});
    form.setValues(
      isEdit
        ? {
            ...emptyForm,
            ...kost,
            price: String(kost.price),
            rooms: String(kost.rooms ?? 1),
            latitude: kost.latitude ?? "",
            longitude: kost.longitude ?? "",
          }
        : emptyForm
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kost]);

  if (!kost) return null;
  const eligible = (data?.owners || []).filter((o) => o.verificationStatus === "Verified" && o.accountActive && !o.archived);
  const options = isEdit ? (data?.owners || []).filter((o) => o.id === kost.ownerId) : eligible;

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      await act(isEdit ? `kosts/${kost.id}` : "kosts", { method: isEdit ? "PATCH" : "POST", body: form.values });
      toast(isEdit ? "Data kost berhasil diperbarui." : "Kost berhasil ditambahkan dan menunggu verifikasi.");
      onClose();
    } catch (err) {
      setErrors(err.fields || {});
      toast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open title={isEdit ? "Edit Kost" : "Tambah Kost Baru"} onClose={saving ? undefined : onClose}>
      <form id="kost-form" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Field label="Nama Kost" {...form.bind("name")} error={errors.name} required />
        <Field label="Harga Sewa / bulan" type="number" min="0" {...form.bind("price")} error={errors.price} required />
        <Field label="Kecamatan" {...form.bind("area")} error={errors.area} required />
        <SelectField
          label="Pemilik"
          {...form.bind("ownerId")}
          options={options.map((o) => [o.id, o.name])}
          placeholder="Pilih pemilik terverifikasi"
          disabled={isEdit}
          error={errors.ownerId}
          hint={
            isEdit
              ? "Pemilik tidak dapat dipindahkan."
              : eligible.length
              ? "Hanya pemilik berstatus Terverifikasi dan akun aktif yang dapat menambahkan kost."
              : "Belum ada pemilik terverifikasi. Silakan verifikasi pemilik terlebih dahulu."
          }
        />
        <TextArea label="Alamat Lengkap" className="sm:col-span-2" {...form.bind("address")} error={errors.address} required />
        <TextArea label="Deskripsi Kost" className="sm:col-span-2" {...form.bind("description")} error={errors.description} />
        <Field label="Fasilitas" className="sm:col-span-2" {...form.bind("facilities")} hint="Pisahkan dengan koma (contoh: AC, Wi-Fi, Kamar mandi dalam, Kasur)" />
        <Field label="Jumlah Kamar" type="number" min="1" {...form.bind("rooms")} error={errors.rooms} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Latitude" type="number" step="any" {...form.bind("latitude")} error={errors.latitude} placeholder="0.4651" />
          <Field label="Longitude" type="number" step="any" {...form.bind("longitude")} error={errors.longitude} placeholder="101.3921" />
        </div>
        <ImageField label="Foto Kost" className="sm:col-span-2" value={form.values.photo} onChange={(v) => form.set("photo", v)} error={errors.photo} hint="Format PNG/JPG/WEBP, otomatis dikompres." />
        {isEdit && (
          <p className="sm:col-span-2 text-xs text-muted">
            Status saat ini: <Badge status={kost.status} />. Perubahan status resmi dilakukan via tombol aksi verifikasi.
          </p>
        )}
        <div className="flex justify-end gap-2 sm:col-span-2 pt-2 border-t border-line">
          <GhostButton onClick={onClose} disabled={saving}>Batal</GhostButton>
          <PrimaryButton type="submit" loading={saving} disabled={!isEdit && !eligible.length}>
            <Save size={18} /><span>Simpan Kost</span>
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

export function KostView() {
  const { data, act, openKostForm, admin, setView, targetEntityId, clearTargetEntityId } = useApp();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Semua");
  const [area, setArea] = useState("Semua Wilayah");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [detail, setDetail] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkConfirm, setBulkConfirm] = useState(null);

  // Deep linking dari notifikasi atau global search
  useEffect(() => {
    if (targetEntityId && data?.kosts) {
      const match = data.kosts.find((k) => k.id === targetEntityId);
      if (match) {
        setDetail(match);
        clearTargetEntityId?.();
      }
    }
  }, [targetEntityId, data?.kosts, clearTargetEntityId]);

  const areas = useMemo(() => ["Semua Wilayah", ...new Set((data?.kosts || []).map((k) => k.area))], [data?.kosts]);

  const hasActiveFilters = status !== "Semua" || area !== "Semua Wilayah" || Boolean(from) || Boolean(to) || Boolean(search);
  const resetFilters = () => {
    setStatus("Semua");
    setArea("Semua Wilayah");
    setFrom("");
    setTo("");
    setSearch("");
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.kosts || []).filter((k) =>
      (status === "Semua" || k.status === status) &&
      (area === "Semua Wilayah" || k.area === area) &&
      inRange(k.createdAt, from, to) &&
      (!q || [k.name, k.area, k.ownerName, k.status, k.address].some((v) => String(v).toLowerCase().includes(q)))
    );
  }, [data?.kosts, status, area, from, to, search]);

  const pager = usePagination(filtered, 10);
  useEffect(() => pager.reset(), [status, area, from, to, search]);

  const allPageIds = pager.slice.map((k) => k.id);
  const isAllPageSelected = allPageIds.length > 0 && allPageIds.every((id) => selectedIds.includes(id));
  const toggleSelectAllPage = () => {
    if (isAllPageSelected) {
      setSelectedIds((prev) => prev.filter((id) => !allPageIds.includes(id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...allPageIds])]);
    }
  };
  const toggleSelectRow = (id) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const filters = [
    status !== "Semua" && `Status: ${status}`,
    area !== "Semua Wilayah" && `Wilayah: ${area}`,
    from && `Dari: ${from}`,
    to && `Sampai: ${to}`,
    search && `Pencarian: "${search}"`,
  ].filter(Boolean);

  const columns = [
    { label: "Nama Kost", value: (k) => k.name },
    { label: "Kecamatan", value: (k) => k.area },
    { label: "Alamat", value: (k) => k.address },
    { label: "Harga", value: (k) => k.price },
    { label: "Kamar", value: (k) => k.rooms },
    { label: "Pemilik", value: (k) => k.ownerName },
    { label: "Status", value: (k) => k.status },
    { label: "Dibuat", value: (k) => k.createdAt },
    { label: "Alasan Penolakan", value: (k) => k.rejectReason },
  ];

  const changeStatus = (kost, next) => async (reason) => {
    await act(`kosts/${kost.id}/status`, { body: { status: next, reason } });
    toast(next === "Aktif" ? `${kost.name} berhasil diaktifkan.` : next === "Ditolak" ? `${kost.name} ditolak.` : `${kost.name} berstatus ${next}.`);
    setConfirm(null);
    setDetail(null);
  };

  const archiveItem = (kost) => async () => {
    await act(`kosts/${kost.id}/archive`);
    toast(`${kost.name} berhasil diarsipkan.`);
    setConfirm(null);
    setDetail(null);
  };

  const restoreItem = (kost) => async () => {
    await act(`kosts/${kost.id}/restore`);
    toast(`${kost.name} berhasil dipulihkan ke status Nonaktif.`);
    setConfirm(null);
    setDetail(null);
  };

  const permanentRemove = (kost) => async () => {
    await act(`kosts/${kost.id}/permanent`, { method: "DELETE" });
    toast(`${kost.name} telah dihapus permanen.`);
    setConfirm(null);
    setDetail(null);
  };

  const handleBulkAction = async (action) => {
    await act("kosts/bulk", { body: { ids: selectedIds, action } });
    toast(`${selectedIds.length} kost berhasil ${action === "activate" ? "diaktifkan" : action === "deactivate" ? "dinonaktifkan" : action === "archive" ? "diarsipkan" : "dipulihkan"}.`);
    setSelectedIds([]);
    setBulkConfirm(null);
  };

  const actionsFor = (k) => {
    const list = [];
    if (k.status === "Menunggu Verifikasi") {
      list.push(["Verifikasi & Aktifkan", BadgeCheck, "verify", "success"]);
      list.push(["Tolak", XCircle, "reject", "danger"]);
    }
    if (k.status === "Nonaktif" || k.status === "Ditolak") {
      list.push(["Aktifkan", Power, "verify", "success"]);
    }
    if (k.status === "Aktif") {
      list.push(["Nonaktifkan", Ban, "deactivate", "warning"]);
    }
    if (k.status !== "Diarsipkan") {
      list.push(["Arsipkan", Archive, "archive", "warning"]);
    } else {
      list.push(["Pulihkan", ArchiveRestore, "restore", "success"]);
    }
    return list;
  };

  const confirmConfig = confirm && {
    verify: {
      title: confirm.kost.verifiedAt ? "Aktifkan Kost" : "Verifikasi Kost",
      message: confirm.kost.verifiedAt ? `Aktifkan kembali ${confirm.kost.name}? Kost akan tampil kepada pengguna.` : `Setujui verifikasi ${confirm.kost.name}? Kost akan berstatus Aktif dan tampil kepada pengguna.`,
      label: "Ya, Aktifkan",
      tone: "primary",
      run: changeStatus(confirm.kost, "Aktif"),
    },
    reject: {
      title: "Tolak Pengajuan Kost",
      message: `Tolak pengajuan ${confirm.kost.name}? Pemilik perlu memperbaiki data kost.`,
      label: "Tolak Kost",
      tone: "danger",
      reason: "Alasan penolakan",
      run: changeStatus(confirm.kost, "Ditolak"),
    },
    deactivate: {
      title: "Nonaktifkan Kost",
      message: `Apakah Anda yakin ingin menonaktifkan ${confirm.kost.name}? Kost tidak lagi muncul pada hasil pencarian pengguna.`,
      label: "Nonaktifkan",
      tone: "warning",
      run: changeStatus(confirm.kost, "Nonaktif"),
    },
    archive: {
      title: "Arsipkan Kost",
      message: `Apakah Anda yakin ingin mengarsipkan ${confirm.kost.name}? Data dapat dipulihkan kapan saja.`,
      label: "Arsipkan",
      tone: "warning",
      run: archiveItem(confirm.kost),
    },
    restore: {
      title: "Pulihkan Kost",
      message: `Pulihkan kost ${confirm.kost.name}? Kost akan dikembalikan ke status Nonaktif.`,
      label: "Pulihkan",
      tone: "primary",
      run: restoreItem(confirm.kost),
    },
    permanentDelete: {
      title: "Hapus Kost Permanen",
      message: `PERINGATAN: Anda akan menghapus permanen data kost ${confirm.kost.name}. Tindakan ini tidak dapat dibatalkan!`,
      label: "Hapus Permanen",
      tone: "danger",
      run: permanentRemove(confirm.kost),
    },
  }[confirm.type];

  const mapUrl = detail && (detail.latitude && detail.longitude
    ? `https://www.google.com/maps/search/?api=1&query=${detail.latitude},${detail.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(detail.address + ", " + detail.area)}`);

  return (
    <div className="space-y-4">
      {/* FILTER BAR SEDERHANA */}
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Cari nama, wilayah, pemilik, alamat..."
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
          <>
            <ExportMenu
              name="Data_Kost"
              title="Data Kost"
              columns={columns}
              rows={filtered}
              allRows={data?.kosts || []}
              pageRows={pager.slice}
              filters={filters}
            />
            {/* HANYA SATU TOMBOL TAMBAH KOST SESUAI ATURAN */}
            {["super_admin", "admin"].includes(admin?.role) && (
              <PrimaryButton onClick={() => openKostForm({})}>
                <Plus size={18} /><span>Tambah Kost</span>
              </PrimaryButton>
            )}
          </>
        }
      >
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter status kost" className={selectCls}>
          <option value="Semua">Semua Status</option>
          {KOST_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={area} onChange={(e) => setArea(e.target.value)} aria-label="Filter wilayah" className={selectCls}>
          {areas.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </FilterBar>

      {/* BULK ACTION BAR */}
      <BulkActionBar selectedCount={selectedIds.length} onClear={() => setSelectedIds([])}>
        <GhostButton onClick={() => setBulkConfirm("activate")} className="!h-8 text-xs">
          <Power size={14} className="text-ok-fg" /><span>Aktifkan</span>
        </GhostButton>
        <GhostButton onClick={() => setBulkConfirm("deactivate")} className="!h-8 text-xs">
          <Ban size={14} className="text-warn-fg" /><span>Nonaktifkan</span>
        </GhostButton>
        <GhostButton onClick={() => setBulkConfirm("archive")} className="!h-8 text-xs">
          <Archive size={14} className="text-clay" /><span>Arsipkan</span>
        </GhostButton>
      </BulkActionBar>

      <Panel>
        <DataTable
          headers={[
            <input
              key="select-all"
              type="checkbox"
              checked={isAllPageSelected}
              onChange={toggleSelectAllPage}
              title="Pilih semua data di halaman ini"
              className="h-4 w-4 rounded accent-maroon"
            />,
            "Properti & Lokasi",
            "Harga",
            "Pemilik",
            "Status",
            "Tanggal",
            { title: "Aksi", align: "text-center", className: "w-28" },
          ]}
        >
          {pager.slice.length ? (
            pager.slice.map((k) => (
              <tr key={k.id} className={selectedIds.includes(k.id) ? "bg-maroon/5" : undefined}>
                <Td className="w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(k.id)}
                    onChange={() => toggleSelectRow(k.id)}
                    className="h-4 w-4 rounded accent-maroon"
                  />
                </Td>
                <Td>
                  <strong className="block text-ink">{k.name}</strong>
                  <span className="block text-xs text-muted truncate max-w-sm">
                    {k.area ? `${k.area} · ` : ""}{k.address}
                  </span>
                </Td>
                <Td>
                  <span className="font-semibold tabular-nums text-ink text-sm">
                    {formatCurrency(k.price)}
                  </span>
                </Td>
                <Td>
                  <button
                    type="button"
                    onClick={() => { setView("owners"); }}
                    className="text-left font-medium text-ink hover:underline text-xs sm:text-sm block"
                  >
                    {k.ownerName}
                  </button>
                  {k.ownerVerification !== "Verified" && (
                    <span className="block text-[11px] font-bold text-warn-fg">Belum Verified</span>
                  )}
                </Td>
                <Td><Badge status={k.status} size="sm" /></Td>
                <Td><span className="text-xs text-muted whitespace-nowrap">{formatDate(k.createdAt)}</span></Td>
                <Td>
                  <div className="flex items-center gap-1">
                    <IconButton label="Detail Lengkap" tone="info" onClick={() => setDetail(k)}>
                      <Eye size={16} />
                    </IconButton>
                    {["super_admin", "admin", "moderator"].includes(admin?.role) && (
                      <IconButton label="Edit" tone="info" onClick={() => openKostForm(k)}>
                        <Pencil size={16} />
                      </IconButton>
                    )}
                    {actionsFor(k).map(([label, Icon, type, tone]) => (
                      <IconButton
                        key={label}
                        label={label}
                        tone={tone}
                        onClick={() => setConfirm({ type, kost: k })}
                      >
                        <Icon size={16} />
                      </IconButton>
                    ))}
                    {admin?.role === "super_admin" && (
                      <IconButton
                        label="Hapus Permanen"
                        tone="danger"
                        onClick={() => setConfirm({ type: "permanentDelete", kost: k })}
                      >
                        <Trash2 size={16} />
                      </IconButton>
                    )}
                  </div>
                </Td>
              </tr>
            ))
          ) : (
            <tr>
              <Td colSpan={8}>
                <EmptyState
                  title="Kost tidak ditemukan"
                  message="Belum ada data kost yang sesuai dengan kriteria filter Anda."
                  onReset={hasActiveFilters ? resetFilters : undefined}
                />
              </Td>
            </tr>
          )}
        </DataTable>
        <Pagination pager={pager} />
      </Panel>

      {/* DETAIL KOST MODAL — STRUKTUR SESUAI SPESIFIKASI */}
      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail?.name || "Detail Kost"}
        maxWidth="max-w-3xl"
        footer={
          detail && (
            <div className="flex flex-wrap items-center justify-between gap-2 w-full">
              <div className="flex items-center gap-2">
                {actionsFor(detail).map(([label, Icon, type]) => (
                  <GhostButton key={label} onClick={() => setConfirm({ type, kost: detail })}>
                    <Icon size={15} /><span>{label}</span>
                  </GhostButton>
                ))}
              </div>
              <div className="flex items-center gap-2">
                {["super_admin", "admin", "moderator"].includes(admin?.role) && (
                  <PrimaryButton onClick={() => { openKostForm(detail); setDetail(null); }}>
                    <Pencil size={15} /><span>Edit Kost</span>
                  </PrimaryButton>
                )}
              </div>
            </div>
          )
        }
      >
        {detail && (
          <div className="space-y-5">
            {/* 1. Foto / Gallery */}
            {detail.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={detail.photo} alt={detail.name} className="h-64 w-full rounded-xl object-cover border border-line" />
            ) : (
              <div className="grid h-48 w-full place-items-center rounded-xl border border-dashed border-line bg-field text-muted text-xs">
                Tidak ada foto kost yang diunggah.
              </div>
            )}

            {/* Nama & Status */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
              <div>
                <span className="text-xs font-extrabold uppercase text-accent">{detail.area}</span>
                <h2 className="text-2xl font-extrabold text-ink">{detail.name}</h2>
              </div>
              <Badge status={detail.status} />
            </div>

            {/* 2. Informasi Kost */}
            <div>
              <h3 className="text-xs font-extrabold uppercase text-accent mb-2">Informasi Kost</h3>
              <DetailGrid
                items={[
                  ["Harga Sewa", formatCurrency(detail.price) + " / bulan"],
                  ["Kecamatan", detail.area],
                  ["Jumlah Kamar", `${detail.rooms} Kamar`],
                  ["Alamat Lengkap", detail.address, true],
                  ["Fasilitas", detail.facilities || "Tidak disebutkan", true],
                  ["Deskripsi", detail.description || "-", true],
                ]}
              />
            </div>

            {/* 3. Pemilik */}
            <div className="border-t border-line pt-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-extrabold uppercase text-accent">Data Pemilik</h3>
                <button
                  type="button"
                  onClick={() => { setView("owners"); }}
                  className="inline-flex items-center gap-1 text-xs font-bold text-accent hover:underline"
                >
                  <span>Lihat di Manajemen Pemilik</span>
                  <ArrowUpRight size={14} />
                </button>
              </div>
              <DetailGrid
                items={[
                  ["Nama Pemilik", detail.ownerName],
                  ["Status Verifikasi", <Badge key="ov" status={detail.ownerVerification} />],
                  ["Email Pemilik", detail.ownerEmail || "-"],
                  ["Nomor Telepon", detail.ownerPhone || "-"],
                ]}
              />
              {detail.ownerVerification !== "Verified" && (
                <p className="mt-2 flex items-center gap-2 rounded-lg bg-warn-bg p-3 text-xs font-bold text-warn-fg">
                  <ShieldAlert size={16} />
                  Pemilik belum terverifikasi resmi. Kost tidak dapat diaktifkan sebelum pemilik lolos verifikasi.
                </p>
              )}
            </div>

            {/* 4. Lokasi & Google Maps */}
            <div className="border-t border-line pt-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-extrabold uppercase text-accent">Lokasi & Peta</h3>
                {mapUrl && (
                  <a
                    href={mapUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-line bg-paper px-2.5 py-1 text-xs font-bold text-ink hover:bg-track"
                  >
                    <MapPin size={13} className="text-clay" />
                    <span>Buka di Google Maps</span>
                    <ExternalLink size={12} className="text-muted" />
                  </a>
                )}
              </div>
              <DetailGrid
                items={[
                  ["Latitude", detail.latitude ?? "Belum diisi"],
                  ["Longitude", detail.longitude ?? "Belum diisi"],
                ]}
              />
            </div>

            {/* 5. Laporan Terkait */}
            {detail.reports && detail.reports.length > 0 && (
              <div className="border-t border-line pt-4">
                <h3 className="text-xs font-extrabold uppercase text-accent mb-2">Laporan Pengguna Terkait ({detail.reports.length})</h3>
                <div className="space-y-2">
                  {detail.reports.map((r) => (
                    <div key={r.id} className="flex items-center justify-between rounded-lg border border-line bg-field p-2.5 text-xs">
                      <div>
                        <strong>{r.type}</strong>
                        <span className="block text-muted">{formatDate(r.createdAt)} · Pelapor: {r.reporterName}</span>
                      </div>
                      <Badge status={r.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6. Riwayat Aktivitas (Timeline) */}
            <div className="border-t border-line pt-4">
              <h3 className="text-xs font-extrabold uppercase text-accent mb-2">Riwayat Aktivitas Kost</h3>
              <ActivityTimeline events={detail.timeline} />
            </div>
          </div>
        )}
      </Modal>

      {/* CONFIRM SINGLE ACTION */}
      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirmConfig?.title}
        message={confirmConfig?.message}
        confirmLabel={confirmConfig?.label}
        tone={confirmConfig?.tone}
        reasonLabel={confirmConfig?.reason}
        onConfirm={confirmConfig?.run}
        onClose={() => setConfirm(null)}
      />

      {/* CONFIRM BULK ACTION */}
      <ConfirmDialog
        open={Boolean(bulkConfirm)}
        title={`Konfirmasi Aksi Massal (${selectedIds.length} Kost)`}
        message={`Apakah Anda yakin ingin melakukan aksi "${bulkConfirm}" pada ${selectedIds.length} kost yang dipilih?`}
        confirmLabel="Lanjutkan"
        tone={bulkConfirm === "archive" ? "warning" : "primary"}
        onConfirm={() => handleBulkAction(bulkConfirm)}
        onClose={() => setBulkConfirm(null)}
      />
    </div>
  );
}
