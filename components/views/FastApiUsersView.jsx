"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Check, Plus, RefreshCw, Search, ShieldCheck, UserPlus, Users } from "lucide-react";
import { api } from "@/lib/api";
import { useApp } from "../AppContext";
import { Avatar, Badge, DataTable, EmptyState, ErrorState, GhostButton, Modal, Panel, PanelTitle, PrimaryButton, SelectField, SkeletonTable, Td, TextArea, useToast } from "../ui";

const PAGE_SIZE = 25;
const roleLabel = (role) => ({ developer: "Super Admin", admin: "Admin", moderator: "Moderator", owner: "Pemilik", user: "Pencari" }[role] || role || "—");
const statusLabel = (active) => active ? "Aktif" : "Nonaktif";
const dateLabel = (value) => value
  ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(value))
  : "—";

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
  const [selected, setSelected] = useState(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
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

  useEffect(() => { load(); }, [load]);

  const summary = useMemo(() => ({
    total: users.length,
    active: users.filter((user) => user.is_active === true).length,
    pending: users.filter((user) => user.verification_status === "PENDING").length,
  }), [users]);

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
    const payload = type === "status"
      ? { is_active: !user.is_active, reason: reason.trim() || null }
      : { role: user.role === "moderator" ? "user" : "moderator", reason: reason.trim() || null };
    setSaving(true);
    try {
      await api(`fastapi-users/${encodeURIComponent(user.id)}`, { method: "PATCH", body: payload });
      toast(type === "status" ? `Status akun ${user.name || user.email} berhasil diperbarui.` : `Peran ${user.name || user.email} berhasil diperbarui.`);
      setSelected(null);
      await load();
    } catch (err) {
      toast(err.message || "Perubahan tidak dapat disimpan.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-5">
      <Panel className="p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <PanelTitle eyebrow="Pengguna" title="Manajemen Pengguna" />
            <p className="mt-1 max-w-3xl text-xs sm:text-sm leading-relaxed text-muted">
              Kelola data akun pengguna, hak akses role, serta status keaktifan akun di platform CariKostKita.
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
          <PrimaryButton type="submit" className="h-10 sm:w-auto w-full justify-center"><Search size={16} /> <span>Cari</span></PrimaryButton>
        </form>
      </Panel>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard icon={Users} label="Hasil di halaman" value={summary.total} />
        <SummaryCard icon={Activity} label="Akun aktif" value={summary.active} />
        <SummaryCard icon={ShieldCheck} label="Menunggu verifikasi" value={summary.pending} />
      </div>

      {error ? <ErrorState message={error} onRetry={load} /> : loading ? <SkeletonTable rows={6} cols={6} /> : users.length === 0 ? (
        <EmptyState title="Pengguna tidak ditemukan" message="Coba ubah kata kunci atau filter pencarian." />
      ) : (
        <Panel className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
            <div><h3 className="font-extrabold text-ink">Akun Terdaftar</h3><p className="mt-1 text-xs text-muted">Halaman {page} · {PAGE_SIZE} akun per permintaan</p></div>
          </div>
          {/* Tampilan Desktop: DataTable (hidden on mobile, visible on lg) */}
          <div className="hidden lg:block">
            <DataTable headers={["Pengguna & Kontak", "Role", "Verifikasi", "Status", "Terdaftar", { title: "Aksi", align: "text-center", className: "w-44" }]}>
              {users.map((user) => {
                const staff = ["developer", "admin", "moderator"].includes(user.role);
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
                    <Td><Badge status={roleLabel(user.role)} tone={staff ? "info" : "neutral"} size="sm" /></Td>
                    <Td><span className="text-xs sm:text-sm text-ink">{user.verification_status || "—"}</span>{user.catatan_revisi && <p className="max-w-40 truncate text-xs text-muted" title={user.catatan_revisi}>{user.catatan_revisi}</p>}</Td>
                    <Td><Badge status={statusLabel(user.is_active)} size="sm" /></Td>
                    <Td><span className="whitespace-nowrap text-xs text-muted">{dateLabel(user.created_at)}</span></Td>
                    <Td className="w-44 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {manageable && (
                          <button
                            type="button"
                            onClick={() => openAction(user, "status")}
                            className="inline-flex h-8 items-center gap-1 rounded-lg border border-line px-2.5 text-xs font-bold text-ink hover:bg-track transition"
                          >
                            <Activity size={13} /> <span>{user.is_active ? "Nonaktifkan" : "Aktifkan"}</span>
                          </button>
                        )}
                        {isSuperAdmin && manageable && isRoleTarget && (
                          <button
                            type="button"
                            onClick={() => openAction(user, "role")}
                            className="inline-flex h-8 items-center gap-1 rounded-lg border border-accent/40 bg-accent/5 px-2.5 text-xs font-bold text-accent hover:bg-accent/15 transition"
                          >
                            <ShieldCheck size={13} /> <span>{user.role === "moderator" ? "Cabut mod" : "+Mod"}</span>
                          </button>
                        )}
                        {!manageable && <span className="text-xs text-muted italic">Dilindungi</span>}
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </DataTable>
          </div>

          {/* Tampilan Mobile: Card List (visible on mobile, hidden on lg) */}
          <div className="block lg:hidden divide-y divide-line/70">
            {users.map((user) => {
              const staff = ["developer", "admin", "moderator"].includes(user.role);
              const manageable = !staff && String(user.id) !== String(admin?.id);
              const isRoleTarget = ["user", "moderator"].includes(user.role);
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
                      <Badge status={roleLabel(user.role)} tone={staff ? "info" : "neutral"} />
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
                    <div className="sm:col-span-2 flex items-center justify-between pt-1 border-t border-line/40 text-[11px] text-muted">
                      <span>Verifikasi: <strong className="text-ink">{user.verification_status || "—"}</strong></span>
                      <span>{dateLabel(user.created_at)}</span>
                    </div>
                  </div>

                  {manageable && (
                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => openAction(user, "status")}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line px-3 text-xs font-bold text-ink hover:bg-track w-full transition"
                      >
                        <Activity size={14} />
                        <span>{user.is_active ? "Nonaktifkan Akun" : "Aktifkan Akun"}</span>
                      </button>
                      {isSuperAdmin && isRoleTarget && (
                        <button
                          type="button"
                          onClick={() => openAction(user, "role")}
                          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-accent/40 bg-accent/5 px-3 text-xs font-bold text-accent hover:bg-accent/15 w-full transition"
                        >
                          <ShieldCheck size={14} />
                          <span>{user.role === "moderator" ? "Cabut Moderator" : "Jadikan Moderator"}</span>
                        </button>
                      )}
                    </div>
                  )}
                  {!manageable && (
                    <p className="text-[11px] text-muted italic text-center">Akun staf dilindungi</p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-line px-4 sm:px-5 py-4">
            <span className="text-xs text-muted text-center sm:text-left" aria-live="polite" aria-atomic="true">Menampilkan {users.length} pengguna pada halaman {page}</span>
            <div className="flex gap-2 w-full sm:w-auto">
              <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="min-h-10 rounded-lg border border-line px-4 text-sm font-bold disabled:opacity-40 flex-1 sm:flex-initial">Sebelumnya</button>
              <button type="button" disabled={!hasMore || loading} onClick={() => setPage((value) => value + 1)} className="min-h-10 rounded-lg border border-line px-4 text-sm font-bold disabled:opacity-40 flex-1 sm:flex-initial">Berikutnya</button>
            </div>
          </div>
        </Panel>
      )}

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
              ? `Status akun ${selected.user.name || selected.user.email} akan diubah menjadi ${selected.user.is_active ? "Nonaktif" : "Aktif"}.`
              : `Role akun ${selected.user.name || selected.user.email} akan diubah menjadi ${selected.user.role === "moderator" ? "Pencari Kost" : "Moderator"}.`}
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
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value }) {
  return <Panel className="flex items-center gap-4"><span className="grid h-11 w-11 place-items-center rounded-xl bg-maroon/10 text-maroon"><Icon size={20} aria-hidden="true" /></span><div><p className="text-xs font-bold uppercase tracking-wide text-muted">{label}</p><p className="mt-1 text-2xl font-black text-ink">{value}</p></div></Panel>;
}
