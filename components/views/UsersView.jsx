"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Ban,
  Eye,
  Pencil,
  Power,
  Save,
  Trash2,
  Archive,
  RotateCcw,
  CheckSquare,
  UserCheck,
  AlertTriangle,
} from "lucide-react";
import { useApp } from "../AppContext";
import {
  Avatar,
  Badge,
  ConfirmDialog,
  DataTable,
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
  SelectField,
  Td,
  selectCls,
  useForm,
  usePagination,
  useToast,
  BulkActionBar,
  ActivityTimeline,
} from "../ui";
import { formatDate, formatDateTime, inRange } from "@/lib/format";

/** Modal untuk mengedit data pengguna */
export function UserEditModal({ user, onClose }) {
  const { act } = useApp();
  const toast = useToast();
  const form = useForm({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    status: user?.status || "Aktif",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setErrors({});
    form.setValues({
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      status: user.status || "Aktif",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!user) return null;

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      await act(`users/${user.id}`, { method: "PATCH", body: form.values });
      toast("Data pengguna berhasil diperbarui.");
      onClose();
    } catch (err) {
      setErrors(err.fields || {});
      toast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open title="Edit Data Pengguna" onClose={saving ? undefined : onClose} maxWidth="max-w-md">
      <form onSubmit={submit} noValidate className="grid gap-4">
        <Field label="Nama Lengkap" {...form.bind("name")} error={errors.name} required />
        <Field label="Email" type="email" {...form.bind("email")} error={errors.email} required />
        <Field label="Nomor Telepon" {...form.bind("phone")} error={errors.phone} />
        <SelectField label="Status Akun" {...form.bind("status")} options={["Aktif", "Nonaktif"]} error={errors.status} />
        <div className="flex justify-end gap-2 pt-2 border-t border-line">
          <GhostButton onClick={onClose} disabled={saving}>Batal</GhostButton>
          <PrimaryButton type="submit" loading={saving}><Save size={18} /><span>Simpan Perubahan</span></PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

/** Modal untuk menambah pengguna atau staf admin baru */
export function UserFormModal({ user, onClose, onSaved }) {
  const { act, admin } = useApp();
  const toast = useToast();
  const isSuperAdmin = admin?.role === "super_admin";
  const [role, setRole] = useState(user?.role || (isSuperAdmin ? "admin" : "user"));
  const form = useForm({
    name: user?.name || "",
    username: user?.username || "",
    email: user?.email || "",
    phone: user?.phone || "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const isStaffRole = ["super_admin", "admin", "moderator", "marketing"].includes(role);
      const endpoint = isStaffRole ? "admins" : "users";
      const body = { ...form.values, role };
      await act(endpoint, { method: "POST", body });
      toast(`${isStaffRole ? "Staf admin" : "Pengguna"} baru berhasil ditambahkan.`);
      onClose();
      onSaved?.();
    } catch (err) {
      setErrors(err.fields || {});
      toast(err.message || "Gagal menambahkan akun.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open title="Tambah Pengguna / Staf Baru" onClose={saving ? undefined : onClose} maxWidth="max-w-md">
      <form onSubmit={submit} noValidate className="grid gap-3.5">
        <Field label="Nama Lengkap" {...form.bind("name")} error={errors.name} required />
        <Field label="Username" {...form.bind("username")} error={errors.username} required placeholder="contoh: joko_admin" />
        <Field label="Email" type="email" {...form.bind("email")} error={errors.email} required placeholder="user@carikostkita.id" />
        <Field label="Nomor Telepon" {...form.bind("phone")} error={errors.phone} placeholder="08xxxxxxxxxx" />
        <SelectField
          label="Role / Peran Akun"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          error={errors.role}
          options={
            isSuperAdmin
              ? [
                  ["super_admin", "Super Admin (Akses Penuh)"],
                  ["admin", "Admin (Operasional & Kost)"],
                  ["moderator", "Moderator (Verifikasi & Laporan)"],
                  ["marketing", "Marketing (Iklan & Promo)"],
                  ["owner", "Pemilik Kost (Mitra)"],
                  ["user", "Pencari Kost (Pengguna Biasa)"],
                ]
              : [
                  ["admin", "Admin"],
                  ["moderator", "Moderator"],
                  ["marketing", "Marketing"],
                  ["owner", "Pemilik Kost"],
                  ["user", "Pencari Kost"],
                ]
          }
        />
        <Field label="Password Akun" type="password" {...form.bind("password")} error={errors.password} required placeholder="Minimal 8 karakter" />
        <div className="flex justify-end gap-2 pt-3 border-t border-line">
          <GhostButton onClick={onClose} disabled={saving}>Batal</GhostButton>
          <PrimaryButton type="submit" loading={saving}><Save size={18} /><span>Simpan Akun Baru</span></PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

export function UsersView() {
  const { data, act, admin, targetEntityId, clearTargetEntityId } = useApp();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("Semua");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [detail, setDetail] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [deleteMode, setDeleteMode] = useState("soft"); // "soft" | "permanent"
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkConfirm, setBulkConfirm] = useState(null);

  // Deep linking dari notifikasi atau global search
  useEffect(() => {
    if (targetEntityId && data?.users) {
      const match = data.users.find((u) => u.id === targetEntityId);
      if (match) {
        setDetail(match);
        clearTargetEntityId?.();
      }
    }
  }, [targetEntityId, data?.users, clearTargetEntityId]);

  const hasActiveFilters = tab !== "Semua" || Boolean(from) || Boolean(to) || Boolean(search);
  const resetFilters = () => {
    setTab("Semua");
    setFrom("");
    setTo("");
    setSearch("");
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.users || []).filter((u) => {
      const matchTab =
        tab === "Semua"
          ? true
          : tab === "Diarsipkan"
          ? Boolean(u.archived)
          : tab === "Aktif"
          ? u.status === "Aktif" && !u.archived
          : u.status === "Nonaktif" && !u.archived;
      const matchDates = inRange(u.createdAt, from, to);
      const matchQuery = !q || [u.name, u.email, u.phone].some((v) => String(v).toLowerCase().includes(q));
      return matchTab && matchDates && matchQuery;
    });
  }, [data?.users, tab, from, to, search]);

  const pager = usePagination(filtered, 10);
  useEffect(() => pager.reset(), [tab, from, to, search]); // eslint-disable-line react-hooks/exhaustive-deps

  // Row selection helpers
  const allPageIds = pager.slice.map((u) => u.id);
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
    tab !== "Semua" && `Status: ${tab}`,
    from && `Dari: ${from}`,
    to && `Sampai: ${to}`,
    search && `Pencarian: "${search}"`,
  ].filter(Boolean);

  const columns = [
    { label: "Nama", value: (u) => u.name },
    { label: "Email", value: (u) => u.email },
    { label: "Telepon", value: (u) => u.phone },
    { label: "Status", value: (u) => (u.archived ? "Diarsipkan" : u.status) },
    { label: "Terdaftar", value: (u) => u.createdAt },
  ];

  const toggleStatus = async (user) => {
    const next = user.status === "Aktif" ? "Nonaktif" : "Aktif";
    await act(`users/${user.id}/status`, { body: { status: next } });
    toast(`Akun ${user.name} ${next === "Aktif" ? "diaktifkan" : "dinonaktifkan"}.`);
    setConfirm(null);
    if (detail && detail.id === user.id) {
      setDetail((d) => ({ ...d, status: next }));
    }
  };

  const executeDeleteUser = async (user) => {
    try {
      if (deleteMode === "permanent") {
        await act(`users/${user.id}/permanent`, { method: "DELETE" });
        toast(`Pengguna ${user.name} berhasil dihapus permanen.`);
      } else {
        await act(`users/${user.id}/archive`);
        toast(`Pengguna ${user.name} berhasil dihapus (dipindahkan ke arsip).`);
      }
      setConfirm(null);
      setDetail(null);
    } catch (err) {
      toast(err.message, "error");
    }
  };

  const restoreItem = (user) => async () => {
    try {
      await act(`users/${user.id}/restore`);
      toast(`Pengguna ${user.name} berhasil dipulihkan.`);
      setConfirm(null);
      setDetail(null);
    } catch (err) {
      toast(err.message, "error");
    }
  };

  const permanentDeleteItem = (user) => async () => {
    try {
      await act(`users/${user.id}/permanent`, { method: "DELETE" });
      toast(`Pengguna ${user.name} berhasil dihapus permanen.`);
      setConfirm(null);
      setDetail(null);
    } catch (err) {
      toast(err.message, "error");
    }
  };

  const handleBulkAction = async (action) => {
    try {
      await act("users/bulk", { body: { ids: selectedIds, action } });
      toast(`${selectedIds.length} data pengguna berhasil diproses.`);
      setSelectedIds([]);
      setBulkConfirm(null);
    } catch (err) {
      toast(err.message, "error");
    }
  };

  const openDeleteDialog = (user) => {
    setDeleteMode("soft");
    setConfirm({ type: "delete", user });
  };

  const isSuperAdmin = (admin?.role || data?.admin?.role) === "super_admin";
  const current = detail && (data?.users || []).find((u) => u.id === detail.id);
  const userReports = useMemo(() => (current ? (data?.reports || []).filter((r) => r.reporterId === current.id) : []), [data?.reports, current]);

  return (
    <div className="space-y-4">
      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        onClear={() => setSelectedIds([])}
        actions={[
          { label: "Aktifkan", icon: Power, tone: "primary", onClick: () => setBulkConfirm({ action: "activate", label: "mengaktifkan" }) },
          { label: "Nonaktifkan", icon: Ban, tone: "ghost", onClick: () => setBulkConfirm({ action: "deactivate", label: "menonaktifkan" }) },
          { label: "Hapus Terpilih", icon: Trash2, tone: "danger", onClick: () => setBulkConfirm({ action: "delete", label: "menghapus (mengarsipkan)" }) },
          ...(tab === "Diarsipkan" ? [{ label: "Pulihkan", icon: RotateCcw, tone: "success", onClick: () => setBulkConfirm({ action: "restore", label: "memulihkan" }) }] : []),
        ]}
      />

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Cari nama, email, telepon..."
        extraFilters={
          <>
            <label className="flex items-center gap-1.5 text-xs font-bold text-muted">
              <span>Dari:</span>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Dari tanggal terdaftar" className={`${selectCls} !h-8 text-xs`} />
            </label>
            <label className="flex items-center gap-1.5 text-xs font-bold text-muted">
              <span>Sampai:</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Sampai tanggal terdaftar" className={`${selectCls} !h-8 text-xs`} />
            </label>
          </>
        }
        extraCount={Boolean(from) + Boolean(to)}
        hasActiveFilters={hasActiveFilters}
        onReset={resetFilters}
        actions={<ExportMenu name="Data_Pengguna" title="Data Pengguna" columns={columns} rows={filtered} filters={filters} />}
      >
        <select value={tab} onChange={(e) => setTab(e.target.value)} aria-label="Filter status pengguna" className={selectCls}>
          <option value="Semua">Semua Status</option>
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
            "Pengguna",
            "Email",
            "Telepon",
            "Terdaftar",
            "Status",
            "Aksi",
          ]}
          minWidth={900}
        >
          {pager.slice.length ? pager.slice.map((u) => (
            <tr key={u.id} className={selectedIds.includes(u.id) ? "bg-maroon/5 dark:bg-maroon/15" : ""}>
              <Td className="w-10">
                <input
                  type="checkbox"
                  className="rounded border-line"
                  checked={selectedIds.includes(u.id)}
                  onChange={() => toggleSelectRow(u.id)}
                  aria-label={`Pilih ${u.name}`}
                />
              </Td>
              <Td>
                <div className="flex items-center gap-2.5">
                  <Avatar name={u.name} src={u.photo} size={34} />
                  <div className="min-w-0">
                    <strong className="block truncate text-ink">{u.name}</strong>
                    <span className="text-xs text-muted font-mono">{u.id}</span>
                  </div>
                </div>
              </Td>
              <Td className="text-sm">{u.email}</Td>
              <Td className="text-sm">{u.phone || "-"}</Td>
              <Td className="text-xs">{formatDate(u.createdAt)}</Td>
              <Td>
                {u.archived ? (
                  <Badge status="Diarsipkan" tone="danger" label="Diarsipkan" />
                ) : (
                  <Badge status={u.status} />
                )}
              </Td>
              <Td>
                <div className="flex gap-1.5 items-center">
                  <IconButton label="Detail Pengguna" tone="info" onClick={() => setDetail(u)}>
                    <Eye size={17} />
                  </IconButton>
                  <IconButton label="Edit Pengguna" tone="info" onClick={() => setEditUser(u)}>
                    <Pencil size={17} />
                  </IconButton>
                  {!u.archived && (
                    <IconButton
                      label={u.status === "Aktif" ? "Nonaktifkan" : "Aktifkan"}
                      tone={u.status === "Aktif" ? "warning" : "success"}
                      onClick={() => setConfirm({ type: "status", user: u })}
                    >
                      {u.status === "Aktif" ? <Ban size={17} /> : <Power size={17} />}
                    </IconButton>
                  )}
                  {u.archived ? (
                    <>
                      <IconButton label="Pulihkan Akun" tone="success" onClick={() => setConfirm({ type: "restore", user: u })}>
                        <RotateCcw size={17} />
                      </IconButton>
                      {isSuperAdmin && (
                        <IconButton label="Hapus Permanen" tone="danger" onClick={() => setConfirm({ type: "permanentDelete", user: u })}>
                          <Trash2 size={17} />
                        </IconButton>
                      )}
                    </>
                  ) : (
                    <IconButton label="Hapus Pengguna" tone="danger" onClick={() => openDeleteDialog(u)}>
                      <Trash2 size={17} />
                    </IconButton>
                  )}
                </div>
              </Td>
            </tr>
          )) : (
            <tr>
              <Td colSpan={7}>
                <EmptyState title="Pengguna tidak ditemukan" message="Ubah filter atau kata kunci pencarian." onReset={hasActiveFilters ? resetFilters : undefined} />
              </Td>
            </tr>
          )}
        </DataTable>
        <Pagination pager={pager} />
      </Panel>

      {/* Modal Detail Pengguna: Profil Berada Di Paling Atas */}
      <Modal
        open={Boolean(current)}
        onClose={() => setDetail(null)}
        title="Detail Pengguna"
        maxWidth="max-w-2xl"
        footer={current && (
          <div className="flex flex-wrap items-center justify-between w-full gap-2 pt-2 border-t border-line">
            <div className="flex items-center gap-1.5">
              {current.archived ? (
                <>
                  <PrimaryButton tone="success" onClick={() => setConfirm({ type: "restore", user: current })}>
                    <RotateCcw size={16} /><span>Pulihkan Akun</span>
                  </PrimaryButton>
                  {isSuperAdmin && (
                    <GhostButton tone="danger" onClick={() => setConfirm({ type: "permanentDelete", user: current })}>
                      <Trash2 size={16} /><span>Hapus Permanen</span>
                    </GhostButton>
                  )}
                </>
              ) : (
                <GhostButton tone="danger" onClick={() => openDeleteDialog(current)}>
                  <Trash2 size={16} /><span>Hapus Pengguna</span>
                </GhostButton>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <GhostButton onClick={() => setEditUser(current)}>
                <Pencil size={16} /><span>Edit</span>
              </GhostButton>
              {!current.archived && (
                <GhostButton
                  onClick={() => setConfirm({ type: "status", user: current })}
                  className={current.status === "Aktif" ? "!text-warn-fg" : "!text-ok-fg"}
                >
                  {current.status === "Aktif" ? <Ban size={16} /> : <Power size={16} />}
                  <span>{current.status === "Aktif" ? "Nonaktifkan" : "Aktifkan"}</span>
                </GhostButton>
              )}
            </div>
          </div>
        )}
      >
        {current && (
          <div className="space-y-6">
            {/* 1. PROFIL PENGGUNA (DI BAGIAN PALING ATAS - Sesuai Aturan #13) */}
            <section className="rounded-xl border border-line bg-track/40 p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between border-b border-line pb-2.5">
                <p className="text-xs font-extrabold uppercase tracking-wider text-accent">Profil Pengguna</p>
                {current.archived ? (
                  <Badge status="Diarsipkan" tone="danger" label="Diarsipkan" />
                ) : (
                  <Badge status={current.status} />
                )}
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <Avatar name={current.name} src={current.photo} size={76} className="shadow-md" />
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-extrabold text-ink">{current.name}</h3>
                  <p className="text-sm text-muted">{current.email}</p>
                  <p className="text-xs text-muted font-mono mt-0.5">ID: {current.id}</p>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="font-bold text-muted">Nomor Telepon: </span>
                      <span className="font-semibold text-ink">{current.phone || "-"}</span>
                    </div>
                    <div>
                      <span className="font-bold text-muted">Tanggal Bergabung: </span>
                      <span className="font-semibold text-ink">{formatDate(current.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 2. AKTIVITAS PENGGUNA */}
            <section className="space-y-3">
              <h4 className="text-xs font-extrabold uppercase text-muted tracking-wider">Aktivitas & Riwayat Laporan</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="rounded-lg border border-line bg-paper p-3 text-center">
                  <span className="text-xs text-muted block">Laporan Dikirim</span>
                  <strong className="text-2xl text-maroon">{userReports.length}</strong>
                </div>
                <div className="rounded-lg border border-line bg-paper p-3 text-center">
                  <span className="text-xs text-muted block">Status Akun</span>
                  <strong className="text-sm text-ink">{current.archived ? "Diarsipkan" : current.status}</strong>
                </div>
                <div className="rounded-lg border border-line bg-paper p-3 text-center col-span-2 sm:col-span-1">
                  <span className="text-xs text-muted block">Terdaftar Pada</span>
                  <strong className="text-xs text-ink">{formatDate(current.createdAt)}</strong>
                </div>
              </div>

              {userReports.length > 0 ? (
                <div className="mt-3">
                  <h5 className="text-xs font-bold text-muted mb-2">Daftar Laporan Kost:</h5>
                  <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                    {userReports.map((r) => (
                      <div key={r.id} className="flex items-center justify-between rounded-lg border border-line bg-paper p-2.5 text-xs">
                        <div>
                          <strong className="text-ink">{r.id}</strong>
                          <span className="text-muted ml-2">{r.kostName} ({r.type})</span>
                        </div>
                        <Badge status={r.status} />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="rounded-lg bg-track/40 p-3 text-xs text-muted">Pengguna belum pernah mengirimkan laporan kost.</p>
              )}
            </section>

            {/* 3. RIWAYAT / ACTIVITY TIMELINE */}
            <section className="space-y-3 pt-2 border-t border-line">
              <h4 className="text-xs font-extrabold uppercase text-muted tracking-wider">Riwayat Aktivitas</h4>
              <ActivityTimeline items={current.timeline || []} />
            </section>
          </div>
        )}
      </Modal>

      {/* Modal Edit Pengguna */}
      <UserEditModal user={editUser} onClose={() => setEditUser(null)} />

      {/* Modal Dialog Khusus: Hapus Pengguna (Soft Delete / Hapus Permanen) */}
      {confirm?.type === "delete" && confirm.user && (
        <Modal
          open
          onClose={() => setConfirm(null)}
          title={`Hapus Pengguna: ${confirm.user.name}`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl bg-track/40 p-3 border border-line">
              <Avatar name={confirm.user.name} src={confirm.user.photo} size={42} />
              <div className="min-w-0 flex-1">
                <strong className="block text-ink truncate">{confirm.user.name}</strong>
                <p className="text-xs text-muted truncate">{confirm.user.email} · {confirm.user.phone || "-"}</p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge status={confirm.user.status} />
                  <span className="text-xs text-muted">Terdaftar: {formatDate(confirm.user.createdAt)}</span>
                </div>
              </div>
            </div>

            {/* Pilihan Metode Penghapusan */}
            <div className="space-y-2">
              <p className="text-xs font-extrabold uppercase tracking-wider text-muted">Pilih Jenis Penghapusan:</p>
              <div className="space-y-2">
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    deleteMode === "soft" ? "border-maroon bg-maroon/10 shadow-sm" : "border-line bg-paper hover:bg-track"
                  }`}
                >
                  <input
                    type="radio"
                    name="delete-mode-user"
                    value="soft"
                    checked={deleteMode === "soft"}
                    onChange={() => setDeleteMode("soft")}
                    className="mt-0.5 accent-maroon"
                  />
                  <div>
                    <strong className="block text-xs text-ink">Pindahkan ke Sampah / Arsip (Direkomendasikan)</strong>
                    <p className="text-[11px] text-muted leading-tight mt-0.5">
                      Akun dinonaktifkan dan disimpan di arsip. Akun dapat dipulihkan sewaktu-waktu.
                    </p>
                  </div>
                </label>

                {isSuperAdmin && (
                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                      deleteMode === "permanent" ? "border-bad-fg bg-bad-bg/40 shadow-sm" : "border-line bg-paper hover:bg-track"
                    }`}
                  >
                    <input
                      type="radio"
                      name="delete-mode-user"
                      value="permanent"
                      checked={deleteMode === "permanent"}
                      onChange={() => setDeleteMode("permanent")}
                      className="mt-0.5 accent-bad-fg"
                    />
                    <div>
                      <strong className="block text-xs text-bad-fg">Hapus Permanen (Super Admin)</strong>
                      <p className="text-[11px] text-muted leading-tight mt-0.5">
                        Menghapus data akun pengguna secara permanen dari database. Tindakan ini tidak dapat dibatalkan.
                      </p>
                    </div>
                  </label>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-line">
              <GhostButton onClick={() => setConfirm(null)}>Batal</GhostButton>
              <PrimaryButton tone="danger" onClick={() => executeDeleteUser(confirm.user)}>
                <Trash2 size={16} />
                <span>{deleteMode === "permanent" ? "Hapus Permanen Sekarang" : "Hapus Pengguna"}</span>
              </PrimaryButton>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmation Dialog Single Item (Status Toggle, Restore, PermanentDelete) */}
      <ConfirmDialog
        open={Boolean(confirm) && confirm?.type !== "delete"}
        title={
          confirm?.type === "permanentDelete"
            ? "Hapus Permanen Pengguna"
            : confirm?.type === "restore"
            ? "Pulihkan Pengguna"
            : confirm?.user?.status === "Aktif"
            ? "Nonaktifkan Pengguna"
            : "Aktifkan Pengguna"
        }
        message={
          confirm &&
          (confirm.type === "permanentDelete"
            ? `Apakah Anda yakin ingin menghapus permanen akun pengguna "${confirm.user.name}"? Tindakan ini HANYA untuk Super Admin dan TIDAK dapat dibatalkan.`
            : confirm.type === "restore"
            ? `Pulihkan akun pengguna "${confirm.user.name}" dari arsip? Akun akan diaktifkan kembali.`
            : `Apakah Anda yakin ingin ${confirm.user.status === "Aktif" ? "menonaktifkan" : "mengaktifkan"} akun "${confirm.user.name}"?`)
        }
        confirmLabel={
          confirm?.type === "permanentDelete"
            ? "Hapus Permanen"
            : confirm?.type === "restore"
            ? "Pulihkan"
            : confirm?.user?.status === "Aktif"
            ? "Nonaktifkan"
            : "Aktifkan"
        }
        tone={
          confirm?.type === "permanentDelete" || (confirm?.type === "status" && confirm?.user?.status === "Aktif")
            ? "danger"
            : "primary"
        }
        summary={
          confirm?.user && (
            <div className="flex items-center gap-3 rounded-lg bg-track/50 p-3 border border-line text-xs">
              <Avatar name={confirm.user.name} src={confirm.user.photo} size={36} />
              <div className="min-w-0 flex-1">
                <strong className="block text-ink truncate">{confirm.user.name}</strong>
                <p className="text-muted truncate">{confirm.user.email} · {confirm.user.phone || "-"}</p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge status={confirm.user.status} />
                  <span className="text-muted">Terdaftar: {formatDate(confirm.user.createdAt)}</span>
                </div>
              </div>
            </div>
          )
        }
        onConfirm={
          confirm?.type === "permanentDelete"
            ? permanentDeleteItem(confirm.user)
            : confirm?.type === "restore"
            ? restoreItem(confirm.user)
            : () => toggleStatus(confirm.user)
        }
        onClose={() => setConfirm(null)}
      />

      {/* Dialog Konfirmasi Bulk Action */}
      <ConfirmDialog
        open={Boolean(bulkConfirm)}
        title="Konfirmasi Aksi Massal"
        message={`Apakah Anda yakin ingin ${bulkConfirm?.label} ${selectedIds.length} data pengguna terpilih?`}
        confirmLabel="Ya, Lanjutkan"
        tone={bulkConfirm?.action === "delete" || bulkConfirm?.action === "archive" ? "danger" : "primary"}
        onConfirm={() => handleBulkAction(bulkConfirm?.action)}
        onClose={() => setBulkConfirm(null)}
      />
    </div>
  );
}
