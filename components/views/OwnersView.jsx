"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Ban,
  Eye,
  Pencil,
  Power,
  Save,
  Trash2,
  XCircle,
  ShieldAlert,
  Archive,
  RotateCcw,
  Building2,
  AlertTriangle,
} from "lucide-react";
import { useApp } from "../AppContext";
import {
  Avatar,
  Badge,
  ConfirmDialog,
  DataTable,
  DetailGrid,
  EmptyState,
  ExportMenu,
  Field,
  FilterBar,
  GhostButton,
  IconButton,
  Modal,
  Pagination,
  Panel,
  PrimaryButton,
  Td,
  TextArea,
  selectCls,
  useForm,
  usePagination,
  useToast,
  BulkActionBar,
  ActivityTimeline,
} from "../ui";
import { OWNER_VERIFICATION, OWNER_VERIFICATION_LABEL } from "@/lib/constants";
import { formatDate, inRange } from "@/lib/format";

/** Modal untuk mengedit data pemilik kost */
export function OwnerEditModal({ owner, onClose }) {
  const { act } = useApp();
  const toast = useToast();
  const form = useForm({
    name: owner?.name || "",
    email: owner?.email || "",
    phone: owner?.phone || "",
    propertyName: owner?.propertyName || "",
    address: owner?.address || "",
    businessInfo: owner?.businessInfo || "",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!owner) return;
    setErrors({});
    form.setValues({
      name: owner.name,
      email: owner.email,
      phone: owner.phone,
      propertyName: owner.propertyName || "",
      address: owner.address || "",
      businessInfo: owner.businessInfo || "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner]);

  if (!owner) return null;

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      await act(`owners/${owner.id}`, { method: "PATCH", body: form.values });
      toast("Data pemilik berhasil diperbarui.");
      onClose();
    } catch (err) {
      setErrors(err.fields || {});
      toast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open title="Edit Data Pemilik" onClose={saving ? undefined : onClose}>
      <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Field label="Nama Lengkap" {...form.bind("name")} error={errors.name} required />
        <Field label="Email" type="email" {...form.bind("email")} error={errors.email} required />
        <Field label="Nomor Telepon" {...form.bind("phone")} error={errors.phone} required />
        <Field label="Nama Properti" {...form.bind("propertyName")} error={errors.propertyName} />
        <p className="sm:col-span-2 rounded-lg bg-track/60 p-3 text-xs text-muted">
          Verifikasi pemilik memakai bukti properti (foto tampak depan, kode lokasi, kamar), bukan KTP atau surat pribadi.
        </p>
        <TextArea label="Alamat Properti" className="sm:col-span-2" {...form.bind("address")} error={errors.address} />
        <TextArea label="Informasi Bisnis / Usaha" className="sm:col-span-2" {...form.bind("businessInfo")} error={errors.businessInfo} />
        <div className="flex justify-end gap-2 sm:col-span-2 pt-2 border-t border-line">
          <GhostButton onClick={onClose} disabled={saving}>Batal</GhostButton>
          <PrimaryButton type="submit" loading={saving}><Save size={18} /><span>Simpan Perubahan</span></PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

export function OwnersView() {
  const { data, act, admin, setView, targetEntityId, clearTargetEntityId } = useApp();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("Semua");
  const [account, setAccount] = useState("Semua Akun");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [detail, setDetail] = useState(null);
  const [editOwner, setEditOwner] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [alsoKosts, setAlsoKosts] = useState(true);
  const [deleteMode, setDeleteMode] = useState("soft"); // "soft" | "permanent"
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkConfirm, setBulkConfirm] = useState(null);

  // Deep linking dari notifikasi atau global search
  useEffect(() => {
    if (targetEntityId && data?.owners) {
      const match = data.owners.find((o) => o.id === targetEntityId);
      if (match) {
        setDetail(match);
        clearTargetEntityId?.();
      }
    }
  }, [targetEntityId, data?.owners, clearTargetEntityId]);

  const hasActiveFilters = tab !== "Semua" || account !== "Semua Akun" || Boolean(from) || Boolean(to) || Boolean(search);
  const resetFilters = () => {
    setTab("Semua");
    setAccount("Semua Akun");
    setFrom("");
    setTo("");
    setSearch("");
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.owners || []).filter((o) => {
      const matchVerif = tab === "Semua" || o.verificationStatus === tab;
      const matchAccount =
        account === "Semua Akun"
          ? true
          : account === "Diarsipkan"
          ? Boolean(o.archived)
          : account === "Aktif"
          ? o.accountActive && !o.archived
          : !o.accountActive && !o.archived;
      const matchDates = inRange(o.submittedAt, from, to);
      const matchQuery = !q || [o.name, o.email, o.phone, o.propertyName, o.address].some((v) => String(v).toLowerCase().includes(q));
      return matchVerif && matchAccount && matchDates && matchQuery;
    });
  }, [data?.owners, tab, account, from, to, search]);

  const pager = usePagination(filtered, 10);
  useEffect(() => pager.reset(), [tab, account, from, to, search]); // eslint-disable-line react-hooks/exhaustive-deps
  const current = detail && (data?.owners || []).find((o) => o.id === detail.id);

  // Row selection helpers
  const allPageIds = pager.slice.map((o) => o.id);
  const isAllPageSelected = allPageIds.length > 0 && allPageIds.every((id) => selectedIds.includes(id));
  const toggleSelectAllPage = () => {
    if (isAllPageSelected) {
      setSelectedIds((prev) => prev.filter((id) => !allPageIds.includes(id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...allPageIds])]);
    }
  };
  const toggleSelectRow = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const filters = [
    tab !== "Semua" && `Verifikasi: ${tab}`,
    account !== "Semua Akun" && `Akun: ${account}`,
    from && `Dari: ${from}`,
    to && `Sampai: ${to}`,
    search && `Pencarian: "${search}"`,
  ].filter(Boolean);

  const columns = [
    { label: "Nama", value: (o) => o.name },
    { label: "Email", value: (o) => o.email },
    { label: "Telepon", value: (o) => o.phone },
    { label: "Properti", value: (o) => o.propertyName || "-" },
    { label: "Status Verifikasi", value: (o) => o.verificationStatus },
    { label: "Status Akun", value: (o) => (o.archived ? "Diarsipkan" : o.accountActive ? "Aktif" : "Nonaktif") },
    { label: "Jumlah Kost", value: (o) => o.kostCount },
    { label: "Tanggal Pengajuan", value: (o) => o.submittedAt },
    { label: "Alasan Penolakan", value: (o) => o.rejectReason },
  ];

  const runAction = (owner, action, successMsg) => async (reason) => {
    await act(`owners/${owner.id}/action`, { body: { action, reason, deactivateKosts: alsoKosts } });
    toast(successMsg);
    setConfirm(null);
  };

  const executeDeleteOwner = async (owner) => {
    try {
      if (deleteMode === "permanent") {
        await act(`owners/${owner.id}/permanent`, {
          method: "DELETE",
          body: { deleteLinkedKosts: alsoKosts },
        });
        toast(`Pemilik ${owner.name} berhasil dihapus permanen.`);
      } else {
        await act(`owners/${owner.id}/archive`);
        toast(`Pemilik ${owner.name} berhasil dihapus (dipindahkan ke arsip).`);
      }
      setConfirm(null);
      setDetail(null);
    } catch (err) {
      toast(err.message, "error");
    }
  };

  const restoreItem = (owner) => async () => {
    try {
      await act(`owners/${owner.id}/restore`);
      toast(`Pemilik ${owner.name} berhasil dipulihkan.`);
      setConfirm(null);
      setDetail(null);
    } catch (err) {
      toast(err.message, "error");
    }
  };

  const permanentDeleteItem = (owner) => async () => {
    try {
      await act(`owners/${owner.id}/permanent`, {
        method: "DELETE",
        body: { deleteLinkedKosts: alsoKosts },
      });
      toast(`Pemilik ${owner.name} berhasil dihapus permanen.`);
      setConfirm(null);
      setDetail(null);
    } catch (err) {
      toast(err.message, "error");
    }
  };

  const handleBulkAction = async (action) => {
    try {
      await act("owners/bulk", { body: { ids: selectedIds, action, deleteLinkedKosts: alsoKosts } });
      toast(`${selectedIds.length} data pemilik berhasil diproses.`);
      setSelectedIds([]);
      setBulkConfirm(null);
    } catch (err) {
      toast(err.message, "error");
    }
  };

  const isSuperAdmin = (admin?.role || data?.admin?.role) === "super_admin";

  const rowActions = (o) => [
    o.verificationStatus === "Pending" && ["Setujui", BadgeCheck, "approve", "success"],
    o.verificationStatus === "Pending" && ["Tolak", XCircle, "reject", "danger"],
    !o.archived && (o.accountActive ? ["Nonaktifkan", Ban, "deactivate", "warning"] : ["Aktifkan", Power, "activate", "success"]),
  ].filter(Boolean);

  const openDeleteDialog = (owner) => {
    setDeleteMode("soft");
    setAlsoKosts(true);
    setConfirm({ type: "delete", owner });
  };

  return (
    <div className="space-y-4">
      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        onClear={() => setSelectedIds([])}
        actions={[
          { label: "Setujui", icon: BadgeCheck, tone: "primary", onClick: () => setBulkConfirm({ action: "approve", label: "menyetujui verifikasi" }) },
          { label: "Nonaktifkan", icon: Ban, tone: "ghost", onClick: () => setBulkConfirm({ action: "deactivate", label: "menonaktifkan" }) },
          { label: "Hapus Terpilih", icon: Trash2, tone: "danger", onClick: () => setBulkConfirm({ action: "delete", label: "menghapus (mengarsipkan)" }) },
          ...(account === "Diarsipkan" ? [{ label: "Pulihkan", icon: RotateCcw, tone: "success", onClick: () => setBulkConfirm({ action: "restore", label: "memulihkan" }) }] : []),
        ]}
      />

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Cari nama, email, telepon, properti..."
        extraFilters={
          <>
            <label className="flex items-center gap-1.5 text-xs font-bold text-muted">
              <span>Dari:</span>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Dari tanggal pengajuan" className={`${selectCls} !h-8 text-xs`} />
            </label>
            <label className="flex items-center gap-1.5 text-xs font-bold text-muted">
              <span>Sampai:</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Sampai tanggal pengajuan" className={`${selectCls} !h-8 text-xs`} />
            </label>
          </>
        }
        extraCount={Boolean(from) + Boolean(to)}
        hasActiveFilters={hasActiveFilters}
        onReset={resetFilters}
        actions={<ExportMenu name="Data_Pemilik" title="Data Pemilik" columns={columns} rows={filtered} filters={filters} />}
      >
        <select value={tab} onChange={(e) => setTab(e.target.value)} aria-label="Filter status verifikasi" className={selectCls}>
          <option value="Semua">Semua Verifikasi</option>
          {OWNER_VERIFICATION.map((s) => <option key={s} value={s}>{OWNER_VERIFICATION_LABEL[s] || s}</option>)}
        </select>
        <select value={account} onChange={(e) => setAccount(e.target.value)} aria-label="Filter status akun" className={selectCls}>
          <option value="Semua Akun">Semua Status Akun</option>
          <option value="Aktif">Aktif</option>
          <option value="Nonaktif">Nonaktif</option>
          <option value="Diarsipkan">Sampah / Diarsipkan</option>
        </select>
      </FilterBar>

      <Panel>
        <DataTable
          headers={[
            <input
              key="select-all"
              type="checkbox"
              className="rounded border-line"
              checked={isAllPageSelected}
              onChange={toggleSelectAllPage}
              aria-label="Pilih semua baris halaman ini"
            />,
            "Pemilik & Kontak",
            "Status & Verifikasi",
            "Kost",
            "Diajukan",
            { title: "Aksi", align: "text-center", className: "w-28" },
          ]}
        >
          {pager.slice.length ? pager.slice.map((o) => (
            <tr key={o.id} className={selectedIds.includes(o.id) ? "bg-maroon/5 dark:bg-maroon/15" : ""}>
              <Td className="w-10 text-center">
                <input
                  type="checkbox"
                  className="rounded border-line"
                  checked={selectedIds.includes(o.id)}
                  onChange={() => toggleSelectRow(o.id)}
                  aria-label={`Pilih ${o.name}`}
                />
              </Td>
              <Td>
                <div className="flex items-center gap-2.5">
                  <Avatar name={o.name} src={o.photo} size={36} />
                  <div className="min-w-0">
                    <strong className="block truncate text-ink">{o.name}</strong>
                    <div className="text-xs text-muted truncate">
                      <span>{o.email || "—"}</span>
                      {o.phone && <span className="font-mono"> · {o.phone}</span>}
                    </div>
                    <span className="text-[11px] text-muted font-mono">ID {o.id}</span>
                  </div>
                </div>
              </Td>
              <Td>
                <div className="flex flex-col gap-1 items-start">
                  <Badge status={o.verificationStatus} label={OWNER_VERIFICATION_LABEL[o.verificationStatus]} size="sm" />
                  {o.archived ? (
                    <Badge status="Diarsipkan" tone="danger" label="Diarsipkan" size="sm" />
                  ) : (
                    <Badge status={o.accountActive ? "Aktif" : "Nonaktif"} size="sm" />
                  )}
                </div>
              </Td>
              <Td>
                <span className="inline-flex items-center gap-1 font-bold text-xs bg-track px-2 py-0.5 rounded-full">
                  <Building2 size={13} className="text-muted" /> {o.kostCount}
                </span>
              </Td>
              <Td className="text-xs text-muted whitespace-nowrap">{formatDate(o.submittedAt)}</Td>
              <Td className="text-center">
                <div className="flex gap-1 items-center justify-center">
                  <IconButton label="Lihat Detail" tone="info" onClick={() => setDetail(o)}><Eye size={16} /></IconButton>
                  <IconButton label="Edit Data" tone="info" onClick={() => setEditOwner(o)}><Pencil size={16} /></IconButton>
                  {rowActions(o).map(([label, Icon, type, tone]) => (
                    <IconButton key={label} label={label} tone={tone} onClick={() => setConfirm({ type, owner: o })}><Icon size={16} /></IconButton>
                  ))}
                  {o.archived ? (
                    <>
                      <IconButton label="Pulihkan Akun" tone="success" onClick={() => setConfirm({ type: "restore", owner: o })}>
                        <RotateCcw size={16} />
                      </IconButton>
                      {isSuperAdmin && (
                        <IconButton label="Hapus Permanen" tone="danger" onClick={() => { setAlsoKosts(true); setConfirm({ type: "permanentDelete", owner: o }); }}>
                          <Trash2 size={16} />
                        </IconButton>
                      )}
                    </>
                  ) : (
                    <IconButton label="Hapus Pemilik" tone="danger" onClick={() => openDeleteDialog(o)}>
                      <Trash2 size={17} />
                    </IconButton>
                  )}
                </div>
              </Td>
            </tr>
          )) : (
            <tr>
              <Td colSpan={9}>
                <EmptyState title="Pemilik tidak ditemukan" message="Ubah filter atau kata kunci pencarian." onReset={hasActiveFilters ? resetFilters : undefined} />
              </Td>
            </tr>
          )}
        </DataTable>
        <Pagination pager={pager} />
      </Panel>

      {/* Modal Detail Pemilik */}
      <Modal
        open={Boolean(current)}
        onClose={() => setDetail(null)}
        title="Detail Pemilik Kost"
        maxWidth="max-w-3xl"
        footer={current && (
          <div className="flex flex-wrap items-center justify-between w-full gap-2 pt-2 border-t border-line">
            <div className="flex items-center gap-1.5">
              {current.archived ? (
                <>
                  <PrimaryButton tone="success" onClick={() => setConfirm({ type: "restore", owner: current })}>
                    <RotateCcw size={16} /><span>Pulihkan Akun</span>
                  </PrimaryButton>
                  {isSuperAdmin && (
                    <GhostButton tone="danger" onClick={() => { setAlsoKosts(true); setConfirm({ type: "permanentDelete", owner: current }); }}>
                      <Trash2 size={16} /><span>Hapus Permanen</span>
                    </GhostButton>
                  )}
                </>
              ) : (
                <GhostButton tone="danger" onClick={() => openDeleteDialog(current)}>
                  <Trash2 size={16} /><span>Hapus Pemilik</span>
                </GhostButton>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <GhostButton onClick={() => setEditOwner(current)}><Pencil size={16} /><span>Edit</span></GhostButton>
              {rowActions(current).map(([label, Icon, type]) => (
                type === "approve" ? (
                  <PrimaryButton key={label} onClick={() => setConfirm({ type, owner: current })}><Icon size={16} /><span>{label}</span></PrimaryButton>
                ) : (
                  <GhostButton key={label} onClick={() => setConfirm({ type, owner: current })}><Icon size={16} /><span>{label}</span></GhostButton>
                )
              ))}
            </div>
          </div>
        )}
      >
        {current && (
          <div className="space-y-6">
            {/* Header Profil Pemilik */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-track/40 p-4 rounded-xl border border-line">
              <Avatar name={current.name} src={current.photo} size={76} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-extrabold text-ink">{current.name}</h3>
                  <Badge status={current.verificationStatus} label={OWNER_VERIFICATION_LABEL[current.verificationStatus]} />
                  {current.archived ? (
                    <Badge status="Diarsipkan" tone="danger" label="Diarsipkan" />
                  ) : (
                    <Badge status={current.accountActive ? "Aktif" : "Nonaktif"} />
                  )}
                </div>
                <p className="text-xs text-muted font-mono mt-0.5">ID: {current.id}</p>
                <p className="text-xs text-muted mt-1">{current.email} · {current.phone}</p>
              </div>
            </div>

            {/* Informasi Detail */}
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold uppercase text-muted tracking-wider">Informasi Pemilik</h4>
              <DetailGrid items={[
                ["Email", current.email],
                ["Telepon", current.phone],
                ["Nama Properti", current.propertyName || "-"],
                ["Kode Verifikasi", current.verificationCode || "-"],
                ["Alamat Properti", current.address || "-"],
                ["Informasi Bisnis", current.businessInfo || "-", true],
                ["Tanggal Pengajuan", formatDate(current.submittedAt)],
                ["Terdaftar Sejak", formatDate(current.createdAt)],
                ["Status Verifikasi", current.verifiedAt ? `Diverifikasi pada ${formatDate(current.verifiedAt)} oleh ${current.verifiedBy || "Admin"}` : current.verificationStatus],
                ...(current.rejectReason ? [["Alasan Penolakan", current.rejectReason, true]] : []),
              ]} />
            </div>

            {/* Bukti Properti */}
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold uppercase text-muted tracking-wider">Bukti Properti</h4>
              {(current.propertyPhoto || current.roomPhoto) ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {current.propertyPhoto && (
                    <figure className="space-y-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={current.propertyPhoto} alt="Foto tampak depan properti" className="max-h-56 w-full rounded-lg border border-line object-cover" />
                      <figcaption className="text-xs text-muted">Tampak depan properti</figcaption>
                    </figure>
                  )}
                  {current.roomPhoto && (
                    <figure className="space-y-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={current.roomPhoto} alt="Foto kamar atau area umum" className="max-h-56 w-full rounded-lg border border-line object-cover" />
                      <figcaption className="text-xs text-muted">Kamar / area umum</figcaption>
                    </figure>
                  )}
                </div>
              ) : (
                <div className="rounded-lg bg-track p-3 text-sm text-muted">
                  Belum ada bukti properti. Verifikasi lewat kode lokasi dan kunjungan pemilik.
                </div>
              )}
            </div>

            {/* Kost Terkait */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold uppercase text-muted tracking-wider">
                  Kost Milik Pemilik ({current.kosts?.length || 0})
                </h4>
                {current.verificationStatus !== "Verified" && (
                  <span className="text-xs text-warn-fg font-bold">
                    ⚠️ Belum Verified: Tidak dapat menambah kost baru
                  </span>
                )}
              </div>
              {current.kosts && current.kosts.length ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {current.kosts.map((k) => (
                    <div
                      key={k.id}
                      className="flex items-center justify-between rounded-lg border border-line bg-paper p-3 text-sm"
                    >
                      <div className="min-w-0 pr-2">
                        <strong className="block truncate text-ink">{k.name}</strong>
                        <span className="text-xs text-muted">{k.area || "-"}</span>
                      </div>
                      <Badge status={k.status} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border border-line/60 bg-track/30 p-3 text-sm text-muted">Belum ada kost terdaftar atas nama pemilik ini.</p>
              )}
            </div>

            {/* Riwayat Aktivitas / Timeline */}
            <div className="space-y-2 pt-2 border-t border-line">
              <h4 className="text-xs font-extrabold uppercase text-muted tracking-wider">Riwayat Aktivitas Pemilik</h4>
              <ActivityTimeline items={current.timeline || []} />
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Edit Pemilik */}
      <OwnerEditModal owner={editOwner} onClose={() => setEditOwner(null)} />

      {/* Modal Dialog Khusus: Hapus Pemilik Kost (Soft Delete / Hapus Permanen) */}
      {confirm?.type === "delete" && confirm.owner && (
        <Modal
          open
          onClose={() => setConfirm(null)}
          title={`Hapus Pemilik Kost: ${confirm.owner.name}`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl bg-track/40 p-3 border border-line">
              <Avatar name={confirm.owner.name} src={confirm.owner.photo} size={42} />
              <div className="min-w-0 flex-1">
                <strong className="block text-ink truncate">{confirm.owner.name}</strong>
                <p className="text-xs text-muted truncate">{confirm.owner.email} · {confirm.owner.phone}</p>
                <span className="text-[11px] font-bold text-ink mt-0.5 block">
                  Total Kost: {confirm.owner.kostCount} Kost
                </span>
              </div>
            </div>

            {/* Peringatan jika masih memiliki kost terdaftar */}
            {confirm.owner.kostCount > 0 && (
              <div className="rounded-xl border border-warn-fg/30 bg-warn-bg/80 p-3 text-xs text-warn-fg">
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <AlertTriangle size={15} />
                  <span>Pemilik ini masih memiliki {confirm.owner.kostCount} data kost</span>
                </div>
                <p className="leading-relaxed">
                  Menghapus akun pemilik akan mempengaruhi status publikasi kost miliknya.
                </p>
                <label className="mt-2.5 flex items-center gap-2 cursor-pointer font-bold text-ink bg-field p-2 rounded-lg border border-line">
                  <input
                    type="checkbox"
                    checked={alsoKosts}
                    onChange={(e) => setAlsoKosts(e.target.checked)}
                    className="h-4 w-4 rounded accent-maroon"
                  />
                  <span>
                    {deleteMode === "permanent"
                      ? `Hapus permanen juga seluruh ${confirm.owner.kostCount} kost terkait`
                      : `Nonaktifkan juga seluruh ${confirm.owner.kostCount} kost terkait`}
                  </span>
                </label>
              </div>
            )}

            {/* Pilihan Metode Penghapusan (Soft Delete vs Permanen jika Super Admin) */}
            <div className="space-y-2">
              <p className="text-xs font-extrabold uppercase tracking-wider text-muted">Pilih Jenis Penghapusan:</p>
              <div className="space-y-2">
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    deleteMode === "soft" ? "border-maroon bg-maroon/10 shadow-sm" : "border-line bg-field hover:bg-track"
                  }`}
                >
                  <input
                    type="radio"
                    name="delete-mode"
                    value="soft"
                    checked={deleteMode === "soft"}
                    onChange={() => setDeleteMode("soft")}
                    className="mt-0.5 accent-maroon"
                  />
                  <div>
                    <strong className="block text-xs text-ink">Pindahkan ke Sampah / Arsip (Direkomendasikan)</strong>
                    <p className="text-[11px] text-muted leading-tight mt-0.5">
                      Akun dinonaktifkan dan disimpan di arsip. Data tetap aman dan dapat dipulihkan sewaktu-waktu.
                    </p>
                  </div>
                </label>

                {isSuperAdmin && (
                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                      deleteMode === "permanent" ? "border-bad-fg bg-bad-bg/40 shadow-sm" : "border-line bg-field hover:bg-track"
                    }`}
                  >
                    <input
                      type="radio"
                      name="delete-mode"
                      value="permanent"
                      checked={deleteMode === "permanent"}
                      onChange={() => setDeleteMode("permanent")}
                      className="mt-0.5 accent-bad-fg"
                    />
                    <div>
                      <strong className="block text-xs text-bad-fg">Hapus Permanen (Super Admin)</strong>
                      <p className="text-[11px] text-muted leading-tight mt-0.5">
                        Menghapus data pemilik selamanya dari database. Tindakan ini tidak dapat dibatalkan.
                      </p>
                    </div>
                  </label>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-line">
              <GhostButton onClick={() => setConfirm(null)}>Batal</GhostButton>
              <PrimaryButton tone="danger" onClick={() => executeDeleteOwner(confirm.owner)}>
                <Trash2 size={16} />
                <span>{deleteMode === "permanent" ? "Hapus Permanen Sekarang" : "Hapus Pemilik"}</span>
              </PrimaryButton>
            </div>
          </div>
        </Modal>
      )}

      {/* Dialog Konfirmasi Lainnya (Approve/Reject/Activate/Deactivate/Restore/PermanentDelete) */}
      <ConfirmDialog
        open={Boolean(confirm) && confirm?.type !== "delete"}
        title={
          confirm?.type === "approve"
            ? "Setujui Pemilik"
            : confirm?.type === "reject"
            ? "Tolak Pemilik"
            : confirm?.type === "deactivate"
            ? "Nonaktifkan Pemilik"
            : confirm?.type === "activate"
            ? "Aktifkan Pemilik"
            : confirm?.type === "restore"
            ? "Pulihkan Akun Pemilik"
            : "Hapus Permanen Pemilik"
        }
        message={
          confirm?.type === "approve"
            ? `Setujui ${confirm?.owner?.name} sebagai pemilik terverifikasi? Pemilik dapat langsung menambahkan kost.`
            : confirm?.type === "reject"
            ? `Tolak pengajuan verifikasi ${confirm?.owner?.name}? Pemilik dapat memperbaiki data dan mengajukan kembali.`
            : confirm?.type === "deactivate"
            ? `Apakah Anda yakin ingin menonaktifkan akun ${confirm?.owner?.name}?`
            : confirm?.type === "activate"
            ? `Aktifkan kembali akun ${confirm?.owner?.name}?`
            : confirm?.type === "restore"
            ? `Pulihkan akun pemilik ${confirm?.owner?.name} dari arsip? Akun akan diaktifkan kembali.`
            : `Hapus permanen akun ${confirm?.owner?.name}? Tindakan ini TIDAK DAPAT DIBATALKAN.`
        }
        confirmLabel={
          confirm?.type === "approve"
            ? "Ya, Setujui"
            : confirm?.type === "reject"
            ? "Tolak Pengajuan"
            : confirm?.type === "deactivate"
            ? "Nonaktifkan"
            : confirm?.type === "activate"
            ? "Aktifkan"
            : confirm?.type === "restore"
            ? "Pulihkan Akun"
            : "Hapus Permanen"
        }
        tone={
          confirm?.type === "reject" || confirm?.type === "permanentDelete"
            ? "danger"
            : confirm?.type === "deactivate"
            ? "warning"
            : "primary"
        }
        reasonLabel={confirm?.type === "reject" ? "Alasan penolakan (wajib diisi)" : undefined}
        onConfirm={
          confirm?.type === "approve"
            ? runAction(confirm?.owner, "approve", `${confirm?.owner?.name} berhasil diverifikasi.`)
            : confirm?.type === "reject"
            ? runAction(confirm?.owner, "reject", `Verifikasi ${confirm?.owner?.name} ditolak.`)
            : confirm?.type === "deactivate"
            ? runAction(confirm?.owner, "deactivate", `Akun ${confirm?.owner?.name} dinonaktifkan.`)
            : confirm?.type === "activate"
            ? runAction(confirm?.owner, "activate", `Akun ${confirm?.owner?.name} diaktifkan.`)
            : confirm?.type === "restore"
            ? restoreItem(confirm?.owner)
            : confirm?.type === "permanentDelete"
            ? permanentDeleteItem(confirm?.owner)
            : undefined
        }
        onClose={() => setConfirm(null)}
      />

      {/* Dialog Konfirmasi Bulk Action */}
      <ConfirmDialog
        open={Boolean(bulkConfirm)}
        title="Konfirmasi Aksi Massal"
        message={`Apakah Anda yakin ingin ${bulkConfirm?.label} ${selectedIds.length} data pemilik terpilih?`}
        confirmLabel="Ya, Lanjutkan"
        tone={bulkConfirm?.action === "delete" || bulkConfirm?.action === "archive" ? "danger" : "primary"}
        onConfirm={() => handleBulkAction(bulkConfirm?.action)}
        onClose={() => setBulkConfirm(null)}
      />
    </div>
  );
}
