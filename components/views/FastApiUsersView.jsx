"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Check,
  Eye,
  KeyRound,
  Pencil,
  Power,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";
import { useApp } from "../AppContext";
import {
  Avatar,
  Badge,
  ConfirmDialog,
  DataTable,
  EmptyState,
  ErrorState,
  GhostButton,
  Modal,
  Panel,
  PanelTitle,
  PrimaryButton,
  SelectField,
  SkeletonTable,
  Td,
  TextArea,
  useToast,
} from "../ui";

const PAGE_SIZE = 25;
const roleLabel = (role) =>
  ({ developer: "Super Admin", admin: "Admin", moderator: "Moderator", owner: "Pemilik", user: "Pencari" }[role] ||
  role ||
  "—");
const statusLabel = (active) => (active ? "Aktif" : "Nonaktif");
const dateLabel = (value) =>
  value ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(value)) : "—";

export function FastApiUsersView() {
  const { admin, openUserForm } = useApp();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [active, setActive] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Actions & Modals state
  const [selected, setSelected] = useState(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const [detailUser, setDetailUser] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", no_hp: "", role: "user" });
  const [editSaving, setEditSaving] = useState(false);

  const [resetPwdUser, setResetPwdUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetPwdSaving, setResetPwdSaving] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(null);

  const isSuperAdmin = admin?.role === "super_admin";

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
    if (query) params.set("q", query);
    if (role) params.set("role", role);
    if (active) params.set("is_active", active);
    try {
      const result = await api(`fastapi-users?${params}`);
      setUsers(result.data || []);
      setHasMore(Boolean(result.pagination?.has_more));
    } catch (err) {
      setError(err.message || "Direktori FastAPI tidak dapat dimuat.");
      setUsers([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [active, page, query, role]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = useMemo(
    () => ({
      total: users.length,
      active: users.filter((user) => user.is_active === true).length,
      pending: users.filter((user) => user.verification_status === "PENDING").length,
    }),
    [users]
  );

  const submitSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setQuery(queryInput.trim().slice(0, 100));
  };

  const openAction = (user, type) => {
    setSelected({ user, type });
    setReason("");
  };

  const saveAction = async () => {
    if (!selected) return;
    const { user, type } = selected;
    const payload =
      type === "status"
        ? { is_active: !user.is_active, reason: reason.trim() || null }
        : { role: user.role === "moderator" ? "user" : "moderator", reason: reason.trim() || null };
    setSaving(true);
    try {
      await api(`fastapi-users/${encodeURIComponent(user.id)}`, { method: "PATCH", body: payload });
      toast(
        type === "status"
          ? `Status akun ${user.name || user.email} berhasil diperbarui.`
          : `Peran ${user.name || user.email} berhasil diperbarui.`
      );
      setSelected(null);
      await load();
    } catch (err) {
      toast(err.message || "Perubahan tidak dapat disimpan.", "error");
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (user) => {
    setEditUser(user);
    setEditForm({
      name: user.name || "",
      no_hp: user.no_hp || "",
      role: user.role || "user",
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editUser) return;
    setEditSaving(true);
    try {
      await api(`fastapi-users/${editUser.id}/details`, {
        method: "PATCH",
        body: {
          name: editForm.name.trim() || undefined,
          no_hp: editForm.no_hp.trim() || undefined,
          role: editForm.role || undefined,
        },
      });
      toast(`Profil pengguna ${editUser.name || editUser.email} berhasil diperbarui.`);
      setEditUser(null);
      await load();
    } catch (err) {
      toast(err.message || "Gagal memperbarui profil pengguna.", "error");
    } finally {
      setEditSaving(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetPwdUser || !newPassword || newPassword.length < 6) {
      toast("Kata sandi minimal 6 karakter.", "error");
      return;
    }
    setResetPwdSaving(true);
    try {
      await api(`fastapi-users/${resetPwdUser.id}/reset-password`, {
        method: "POST",
        body: { new_password: newPassword },
      });
      toast(`Kata sandi akun ${resetPwdUser.name || resetPwdUser.email} berhasil diubah.`);
      setResetPwdUser(null);
      setNewPassword("");
    } catch (err) {
      toast(err.message || "Gagal mereset kata sandi.", "error");
    } finally {
      setResetPwdSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!confirmDelete) return;
    try {
      await api(`fastapi-users/${confirmDelete.id}`, { method: "DELETE" });
      toast(`Pengguna ${confirmDelete.name || confirmDelete.email} berhasil dihapus.`);
      setConfirmDelete(null);
      await load();
    } catch (err) {
      toast(err.message || "Gagal menghapus pengguna.", "error");
    }
  };

  return (
    <div className="grid gap-5">
      <Panel className="p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <PanelTitle eyebrow="Pengguna" title="Manajemen Pengguna" />
            <p className="mt-1 max-w-3xl text-xs sm:text-sm leading-relaxed text-muted">
              Kelola data akun pengguna, hak akses role, reset kata sandi, serta status keaktifan akun di platform CariKostKita.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <PrimaryButton onClick={() => openUserForm?.({})} className="!h-9 sm:!h-10 text-xs sm:text-sm flex-1 sm:flex-initial justify-center">
              <UserPlus size={16} />
              <span>Tambah Staf / User</span>
            </PrimaryButton>
            <GhostButton onClick={load} disabled={loading} className="!h-9 sm:!h-10 text-xs sm:text-sm flex-1 sm:flex-initial justify-center">
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              <span>Perbarui</span>
            </GhostButton>
          </div>
        </div>
        <form onSubmit={submitSearch} className="mt-4 grid gap-2.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_190px_170px_auto] items-end">
          <label className="relative block">
            <span className="sr-only">Cari nama pengguna</span>
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input value={queryInput} maxLength={100} onChange={(event) => setQueryInput(event.target.value)} placeholder="Cari nama pengguna…" className="h-10 w-full rounded-lg border border-line bg-field pl-9 pr-3 text-sm text-ink" />
          </label>
          <SelectField label="Role" className="sm:gap-1" value={role} onChange={(event) => { setRole(event.target.value); setPage(1); }} options={[["", "Semua role"], ["user", "Pencari"], ["owner", "Pemilik"], ["moderator", "Moderator"], ["admin", "Admin"], ["developer", "Super Admin"]]} />
          <SelectField label="Status akun" className="sm:gap-1" value={active} onChange={(event) => { setActive(event.target.value); setPage(1); }} options={[["", "Semua status"], ["true", "Aktif"], ["false", "Nonaktif"]]} />
          <PrimaryButton type="submit" className="h-10 px-4 w-auto self-end shrink-0">
            <Search size={15} /> <span>Cari</span>
          </PrimaryButton>
        </form>
      </Panel>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard icon={Users} label="Hasil di halaman" value={summary.total} />
        <SummaryCard icon={Activity} label="Akun aktif" value={summary.active} />
        <SummaryCard icon={ShieldCheck} label="Menunggu verifikasi" value={summary.pending} />
      </div>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <SkeletonTable rows={6} cols={6} />
      ) : users.length === 0 ? (
        <EmptyState title="Pengguna tidak ditemukan" message="Coba ubah kata kunci atau filter pencarian." />
      ) : (
        <Panel className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
            <div>
              <h3 className="font-extrabold text-ink">Akun Terdaftar</h3>
              <p className="mt-1 text-xs text-muted">Halaman {page} · {PAGE_SIZE} akun per permintaan</p>
            </div>
          </div>
          {/* Tampilan Desktop */}
          <div className="hidden lg:block">
            <DataTable headers={["Pengguna & Kontak", "Role", "Verifikasi", "Status", "Terdaftar", { title: "Aksi", align: "text-center", className: "w-52" }]}>
              {users.map((user) => {
                const staff = ["developer", "super_admin"].includes(user.role);
                const manageable = !staff && String(user.id) !== String(admin?.id);
                const isRoleTarget = ["user", "moderator"].includes(user.role);
                return (
                  <tr key={user.id} className="hover:bg-track/60 transition-colors">
                    <Td>
                      <div className="flex items-center gap-3">
                        <Avatar name={user.name || user.email} src={user.avatar_url} size={36} />
                        <div className="min-w-0">
                          <p className="truncate font-bold text-ink">{user.name || "Tanpa nama"}</p>
                          <p className="truncate text-xs text-muted">{user.email || "—"}{user.no_hp ? ` · ${user.no_hp}` : ""} · ID #{user.id}</p>
                        </div>
                      </div>
                    </Td>
                    <Td><Badge status={roleLabel(user.role)} tone={["developer", "admin", "moderator"].includes(user.role) ? "info" : "neutral"} size="sm" /></Td>
                    <Td><span className="text-xs sm:text-sm text-ink">{user.verification_status || "—"}</span>{user.catatan_revisi && <p className="max-w-40 truncate text-xs text-muted" title={user.catatan_revisi}>{user.catatan_revisi}</p>}</Td>
                    <Td><Badge status={statusLabel(user.is_active)} size="sm" /></Td>
                    <Td><span className="whitespace-nowrap text-xs text-muted">{dateLabel(user.created_at)}</span></Td>
                    <Td className="w-52 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* Detail */}
                        <button
                          type="button"
                          title="Lihat Detail"
                          onClick={() => setDetailUser(user)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink hover:bg-track transition"
                        >
                          <Eye size={13} />
                        </button>

                        {/* Edit */}
                        {manageable && (
                          <button
                            type="button"
                            title="Edit Profil"
                            onClick={() => openEditModal(user)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink hover:bg-track transition"
                          >
                            <Pencil size={13} />
                          </button>
                        )}

                        {/* Reset Password */}
                        {manageable && (
                          <button
                            type="button"
                            title="Reset Kata Sandi"
                            onClick={() => {
                              setResetPwdUser(user);
                              setNewPassword("");
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink hover:bg-track transition"
                          >
                            <KeyRound size={13} />
                          </button>
                        )}

                        {/* Toggle Status */}
                        {manageable && (
                          <button
                            type="button"
                            title={user.is_active ? "Nonaktifkan Akun" : "Aktifkan Akun"}
                            onClick={() => openAction(user, "status")}
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                              user.is_active
                                ? "border-amber-500/40 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"
                                : "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                            }`}
                          >
                            <Power size={13} />
                          </button>
                        )}

                        {/* Quick Mod Promotion */}
                        {isSuperAdmin && manageable && isRoleTarget && (
                          <button
                            type="button"
                            title={user.role === "moderator" ? "Cabut Moderator" : "Jadikan Moderator"}
                            onClick={() => openAction(user, "role")}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-accent/40 bg-accent/5 text-accent hover:bg-accent/15 transition"
                          >
                            <ShieldCheck size={13} />
                          </button>
                        )}

                        {/* Hapus User */}
                        {manageable && (
                          <button
                            type="button"
                            title="Hapus Akun Pengguna"
                            onClick={() => setConfirmDelete(user)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-500/30 text-red-600 hover:bg-red-500/10 transition"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}

                        {!manageable && <span className="text-xs text-muted italic ml-1">Dilindungi</span>}
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </DataTable>
          </div>

          {/* Tampilan Mobile */}
          <div className="block lg:hidden divide-y divide-line/70">
            {users.map((user) => {
              const staff = ["developer", "super_admin"].includes(user.role);
              const manageable = !staff && String(user.id) !== String(admin?.id);
              return (
                <div key={user.id} className="p-4 space-y-3 hover:bg-track/30 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={user.name || user.email} src={user.avatar_url} size={42} className="shrink-0" />
                      <div className="min-w-0">
                        <p className="font-extrabold text-sm text-ink truncate">{user.name || "Tanpa nama"}</p>
                        <p className="text-xs text-muted truncate">ID #{user.id}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge status={roleLabel(user.role)} tone={["developer", "admin", "moderator"].includes(user.role) ? "info" : "neutral"} />
                      <Badge status={statusLabel(user.is_active)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs rounded-lg border border-line/60 bg-track/40 p-2.5">
                    <div>
                      <span className="text-muted block text-[11px]">Email:</span>
                      <span className="font-medium text-ink truncate block">{user.email || "—"}</span>
                    </div>
                    <div>
                      <span className="text-muted block text-[11px]">Telepon:</span>
                      <span className="font-medium text-ink truncate block">{user.no_hp || "—"}</span>
                    </div>
                  </div>

                  {manageable && (
                    <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-line/40">
                      <button
                        type="button"
                        onClick={() => setDetailUser(user)}
                        className="inline-flex h-8 sm:h-9 items-center gap-1.5 rounded-lg border border-line bg-paper px-2.5 sm:px-3 text-xs font-bold text-ink hover:bg-track transition active:scale-95 shrink-0"
                      >
                        <Eye size={13} /> <span>Detail</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(user)}
                        className="inline-flex h-8 sm:h-9 items-center gap-1.5 rounded-lg border border-line bg-paper px-2.5 sm:px-3 text-xs font-bold text-ink hover:bg-track transition active:scale-95 shrink-0"
                      >
                        <Pencil size={13} /> <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openAction(user, "status")}
                        className={`inline-flex h-8 sm:h-9 items-center gap-1.5 rounded-lg border px-2.5 sm:px-3 text-xs font-bold transition active:scale-95 shrink-0 ${
                          user.is_active
                            ? "border-amber-500/40 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20"
                            : "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20"
                        }`}
                      >
                        <Power size={13} /> <span>{user.is_active ? "Nonaktifkan" : "Aktifkan"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(user)}
                        className="inline-flex h-8 sm:h-9 items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/5 px-2.5 sm:px-3 text-xs font-bold text-red-600 hover:bg-red-500/15 transition active:scale-95 shrink-0"
                      >
                        <Trash2 size={13} /> <span>Hapus</span>
                      </button>
                    </div>
                  )}
                  {!manageable && <p className="text-[11px] text-muted italic text-center">Akun staf dilindungi</p>}
                </div>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-line px-4 sm:px-5 py-4">
            <span className="text-xs text-muted text-center sm:text-left" aria-live="polite" aria-atomic="true">
              Menampilkan {users.length} pengguna pada halaman {page}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((value) => value - 1)}
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-line bg-paper px-3 text-xs font-bold text-ink hover:bg-track disabled:opacity-40 transition"
              >
                <span>Sebelumnya</span>
              </button>
              <button
                type="button"
                disabled={!hasMore || loading}
                onClick={() => setPage((value) => value + 1)}
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-line bg-paper px-3 text-xs font-bold text-ink hover:bg-track disabled:opacity-40 transition"
              >
                <span>Berikutnya</span>
              </button>
            </div>
          </div>
        </Panel>
      )}

      {/* Modal Detail Pengguna */}
      <Modal
        open={Boolean(detailUser)}
        onClose={() => setDetailUser(null)}
        title="Detail Profil Pengguna"
        maxWidth="max-w-md"
      >
        {detailUser && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 border-b border-line pb-4">
              <Avatar name={detailUser.name || detailUser.email} src={detailUser.avatar_url} size={54} />
              <div>
                <h4 className="font-extrabold text-base text-ink">{detailUser.name || "Tanpa nama"}</h4>
                <p className="text-xs text-muted">{detailUser.email || "—"}</p>
                <span className="text-[11px] font-mono text-muted">User ID #{detailUser.id}</span>
              </div>
            </div>

            <div className="space-y-2.5 text-xs sm:text-sm">
              <div className="flex justify-between py-1 border-b border-line/60">
                <span className="text-muted">Peran / Role:</span>
                <Badge status={roleLabel(detailUser.role)} size="sm" />
              </div>
              <div className="flex justify-between py-1 border-b border-line/60">
                <span className="text-muted">Nomor HP / WhatsApp:</span>
                <span className="font-bold text-ink">{detailUser.no_hp || "—"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-line/60">
                <span className="text-muted">Status Akun:</span>
                <Badge status={detailUser.is_active ? "Aktif" : "Nonaktif"} size="sm" />
              </div>
              <div className="flex justify-between py-1 border-b border-line/60">
                <span className="text-muted">Terdaftar Sejak:</span>
                <span className="font-medium text-ink">{dateLabel(detailUser.created_at)}</span>
              </div>
              {detailUser.bio && (
                <div className="py-1">
                  <span className="text-muted block mb-1">Bio:</span>
                  <p className="rounded-lg bg-track/60 p-2.5 text-xs text-ink">{detailUser.bio}</p>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <GhostButton onClick={() => setDetailUser(null)}>Tutup</GhostButton>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Edit Pengguna */}
      <Modal
        open={Boolean(editUser)}
        onClose={() => setEditUser(null)}
        title="Edit Data Pengguna"
        maxWidth="max-w-md"
      >
        {editUser && (
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-muted mb-1">Nama Lengkap</label>
              <input
                type="text"
                required
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="h-10 w-full rounded-lg border border-line bg-field px-3 text-sm text-ink"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted mb-1">Nomor WhatsApp / HP</label>
              <input
                type="text"
                value={editForm.no_hp}
                onChange={(e) => setEditForm({ ...editForm, no_hp: e.target.value })}
                placeholder="08123456789"
                className="h-10 w-full rounded-lg border border-line bg-field px-3 text-sm text-ink"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted mb-1">Role Akun</label>
              <select
                value={editForm.role}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                className="h-10 w-full rounded-lg border border-line bg-field px-3 text-sm text-ink"
              >
                <option value="user">Pencari Kost (user)</option>
                <option value="owner">Pemilik Kost (owner)</option>
                <option value="moderator">Moderator (moderator)</option>
                {isSuperAdmin && <option value="admin">Administrator (admin)</option>}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-line">
              <GhostButton type="button" onClick={() => setEditUser(null)} disabled={editSaving}>
                Batal
              </GhostButton>
              <PrimaryButton type="submit" loading={editSaving}>
                Simpan Perubahan
              </PrimaryButton>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal Reset Password Pengguna */}
      <Modal
        open={Boolean(resetPwdUser)}
        onClose={() => setResetPwdUser(null)}
        title="Reset Kata Sandi Akun"
        maxWidth="max-w-md"
      >
        {resetPwdUser && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <p className="text-xs sm:text-sm text-muted">
              Masukkan kata sandi baru untuk akun <strong>{resetPwdUser.name || resetPwdUser.email}</strong>.
            </p>
            <div>
              <label className="block text-xs font-bold text-muted mb-1">Kata Sandi Baru</label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="h-10 w-full rounded-lg border border-line bg-field px-3 text-sm text-ink"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-line">
              <GhostButton type="button" onClick={() => setResetPwdUser(null)} disabled={resetPwdSaving}>
                Batal
              </GhostButton>
              <PrimaryButton type="submit" loading={resetPwdSaving}>
                Setel Kata Sandi
              </PrimaryButton>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal Konfirmasi Status/Role Quick Action */}
      {selected && (
        <Modal
          open={Boolean(selected)}
          onClose={saving ? undefined : () => setSelected(null)}
          title="Konfirmasi Perubahan Akun"
          maxWidth="max-w-lg"
          footer={
            <>
              <GhostButton disabled={saving} onClick={() => setSelected(null)}>
                Batal
              </GhostButton>
              <PrimaryButton loading={saving} onClick={saveAction}>
                <Check size={16} /> <span>Simpan melalui FastAPI</span>
              </PrimaryButton>
            </>
          }
        >
          <p className="text-sm leading-relaxed text-muted">
            {selected.type === "status"
              ? `Status akun ${selected.user.name || selected.user.email} akan diubah menjadi ${
                  selected.user.is_active ? "Nonaktif" : "Aktif"
                }.`
              : `Role akun ${selected.user.name || selected.user.email} akan diubah menjadi ${
                  selected.user.role === "moderator" ? "Pencari Kost" : "Moderator"
                }.`}
          </p>
          <div className="mt-4">
            <TextArea
              label="Alasan audit (opsional)"
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={1000}
              hint="Alasan akan disimpan ke dalam riwayat log audit admin."
            />
          </div>
        </Modal>
      )}

      {/* Modal Konfirmasi Hapus Pengguna */}
      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Hapus Akun Pengguna"
        tone="danger"
        message={`Apakah Anda yakin ingin menghapus akun "${confirmDelete?.name || confirmDelete?.email || ""}"? Tindakan ini bersifat permanen.`}
        confirmLabel="Ya, Hapus Pengguna"
        onConfirm={handleDeleteUser}
        onClose={() => setConfirmDelete(null)}
      />
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value }) {
  return (
    <Panel className="flex items-center gap-4">
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-maroon/10 text-maroon">
        <Icon size={20} aria-hidden="true" />
      </span>
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-muted">{label}</p>
        <p className="mt-1 text-2xl font-black text-ink">{value}</p>
      </div>
    </Panel>
  );
}
