"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Check, RefreshCw, Search, ShieldCheck, Users } from "lucide-react";
import { api } from "@/lib/api";
import { useApp } from "../AppContext";
import { Avatar, Badge, DataTable, EmptyState, ErrorState, Panel, PanelTitle, PrimaryButton, SelectField, SkeletonTable, Td, TextArea, useToast } from "../ui";

const PAGE_SIZE = 25;
const roleLabel = (role) => ({ developer: "Super Admin", admin: "Admin", moderator: "Moderator", owner: "Pemilik", user: "Pencari" }[role] || role || "—");
const statusLabel = (active) => active ? "Aktif" : "Nonaktif";
const dateLabel = (value) => value
  ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(value))
  : "—";

export function FastApiUsersView() {
  const { admin } = useApp();
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
      <Panel>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <PanelTitle eyebrow="Pengguna" title="Manajemen Pengguna" />
            <p className="max-w-3xl text-sm leading-6 text-muted">Kelola data akun pengguna, hak akses role, serta status keaktifan akun di platform CariKostKita.</p>
          </div>
          <PrimaryButton onClick={load} disabled={loading}><RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Perbarui</PrimaryButton>
        </div>
        <form onSubmit={submitSearch} className="mt-5 grid gap-3 sm:grid-cols-[minmax(220px,1fr)_190px_170px_auto]">
          <label className="relative block">
            <span className="sr-only">Cari nama pengguna</span>
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input value={queryInput} maxLength={100} onChange={(event) => setQueryInput(event.target.value)} placeholder="Cari nama pengguna…" className="h-10 w-full rounded-lg border border-line bg-field pl-9 pr-3 text-sm text-ink" />
          </label>
          <SelectField label="Role" className="sm:gap-1" value={role} onChange={(event) => { setRole(event.target.value); setPage(1); }} options={[["", "Semua role"], ["user", "Pencari"], ["owner", "Pemilik"], ["moderator", "Moderator"], ["admin", "Admin"], ["developer", "Super Admin"]]} />
          <SelectField label="Status akun" className="sm:gap-1" value={active} onChange={(event) => { setActive(event.target.value); setPage(1); }} options={[["", "Semua status"], ["true", "Aktif"], ["false", "Nonaktif"]]} />
          <PrimaryButton type="submit"><Search size={16} /> Cari</PrimaryButton>
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
          <DataTable headers={["Pengguna", "Kontak", "Role", "Verifikasi", "Status", "Terdaftar", "Aksi"]} minWidth={960}>
            {users.map((user) => {
              const staff = ["developer", "admin", "moderator"].includes(user.role);
              const manageable = !staff && String(user.id) !== String(admin?.id);
              const isRoleTarget = ["user", "moderator"].includes(user.role);
              return (
                <tr key={user.id} className="hover:bg-track/60">
                  <Td><div className="flex min-w-52 items-center gap-3"><Avatar name={user.name || user.email} src={user.avatar_url} size={38} /><div className="min-w-0"><p className="truncate font-bold text-ink">{user.name || "Tanpa nama"}</p><p className="truncate text-xs text-muted">ID {user.id}</p></div></div></Td>
                  <Td><div className="min-w-40"><p className="max-w-48 truncate text-ink">{user.email || "—"}</p><p className="text-xs text-muted">{user.no_hp || "Tanpa nomor telepon"}</p></div></Td>
                  <Td><Badge status={roleLabel(user.role)} tone={staff ? "info" : "neutral"} /></Td>
                  <Td><span className="text-sm text-ink">{user.verification_status || "—"}</span>{user.catatan_revisi && <p className="max-w-40 truncate text-xs text-muted" title={user.catatan_revisi}>{user.catatan_revisi}</p>}</Td>
                  <Td><Badge status={statusLabel(user.is_active)} /></Td>
                  <Td><span className="whitespace-nowrap text-sm text-muted">{dateLabel(user.created_at)}</span></Td>
                  <Td><div className="flex items-center gap-2">
                    {manageable && <button type="button" onClick={() => openAction(user, "status")} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-line px-3 text-xs font-bold text-ink hover:bg-track"><Activity size={14} /> {user.is_active ? "Nonaktifkan" : "Aktifkan"}</button>}
                    {isSuperAdmin && manageable && isRoleTarget && <button type="button" onClick={() => openAction(user, "role")} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-line px-3 text-xs font-bold text-accent hover:bg-track"><ShieldCheck size={14} /> {user.role === "moderator" ? "Cabut moderator" : "Jadikan moderator"}</button>}
                    {!manageable && <span className="text-xs text-muted">Dilindungi</span>}
                  </div></Td>
                </tr>
              );
            })}
          </DataTable>
          <div className="flex items-center justify-between border-t border-line px-5 py-4">
            <span className="text-xs text-muted" aria-live="polite" aria-atomic="true">Menampilkan {users.length} pengguna pada halaman {page}</span>
            <div className="flex gap-2"><button type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="min-h-10 rounded-lg border border-line px-3 text-sm font-bold disabled:opacity-40">Sebelumnya</button><button type="button" disabled={!hasMore || loading} onClick={() => setPage((value) => value + 1)} className="min-h-10 rounded-lg border border-line px-3 text-sm font-bold disabled:opacity-40">Berikutnya</button></div>
          </div>
        </Panel>
      )}

      {selected && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/45 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setSelected(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="user-moderation-title" className="w-full max-w-lg rounded-2xl border border-line bg-paper p-5 shadow-2xl">
            <h2 id="user-moderation-title" className="text-lg font-extrabold text-ink">Konfirmasi perubahan akun</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{selected.type === "status" ? `Status ${selected.user.name || selected.user.email} akan menjadi ${selected.user.is_active ? "nonaktif" : "aktif"}.` : `Role ${selected.user.name || selected.user.email} akan menjadi ${selected.user.role === "moderator" ? "pencari kost" : "moderator"}.`}</p>
            <div className="mt-4"><TextArea label="Alasan audit (opsional)" rows={3} value={reason} onChange={(event) => setReason(event.target.value)} maxLength={1000} hint="Alasan disimpan bersama catatan tindakan admin." /></div>
            <div className="mt-5 flex flex-wrap justify-end gap-2"><button disabled={saving} onClick={() => setSelected(null)} className="min-h-10 rounded-lg border border-line px-4 text-sm font-bold text-ink">Batal</button><PrimaryButton loading={saving} onClick={saveAction}><Check size={16} /> Simpan melalui FastAPI</PrimaryButton></div>
          </section>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value }) {
  return <Panel className="flex items-center gap-4"><span className="grid h-11 w-11 place-items-center rounded-xl bg-maroon/10 text-maroon"><Icon size={20} aria-hidden="true" /></span><div><p className="text-xs font-bold uppercase tracking-wide text-muted">{label}</p><p className="mt-1 text-2xl font-black text-ink">{value}</p></div></Panel>;
}
