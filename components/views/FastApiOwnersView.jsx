"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, MessageCircle, Pencil, Power, RefreshCw, Search, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
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
  useToast,
} from "../ui";

const PAGE_SIZE = 25;
const VERIFICATION = [
  ["", "Semua status verifikasi"],
  ["PENDING", "Menunggu verifikasi"],
  ["APPROVED", "Disetujui"],
  ["REVISION_REQUIRED", "Perlu revisi"],
  ["REJECTED", "Ditolak"],
];
const dateLabel = (value) =>
  value ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(value)) : "—";

export function FastApiOwnersView() {
  const toast = useToast();
  const [owners, setOwners] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [verification, setVerification] = useState("");
  const [active, setActive] = useState("");
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modals state
  const [detailOwner, setDetailOwner] = useState(null);
  const [editOwner, setEditOwner] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", no_hp: "", verification_status: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
    if (query) params.set("q", query);
    if (verification) params.set("verification_status", verification);
    if (active) params.set("is_active", active);
    try {
      const result = await api(`fastapi-owners?${params}`);
      setOwners(result.data || []);
      setHasMore(Boolean(result.pagination?.has_more));
    } catch (err) {
      setError(err.message || "Direktori pemilik FastAPI tidak dapat dimuat.");
      setOwners([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [active, page, query, verification]);

  useEffect(() => {
    load();
  }, [load]);

  const search = (event) => {
    event.preventDefault();
    setPage(1);
    setQuery(queryInput.trim().slice(0, 100));
  };

  const handleToggleStatus = async (owner) => {
    setTogglingId(owner.id);
    try {
      await api(`fastapi-users/${owner.id}`, {
        method: "PATCH",
        body: { is_active: !owner.is_active },
      });
      toast(`Akun pemilik ${owner.name || owner.email} ${!owner.is_active ? "diaktifkan" : "dinonaktifkan"}.`);
      await load();
    } catch (err) {
      toast(err.message || "Gagal mengubah status akun pemilik.", "error");
    } finally {
      setTogglingId(null);
    }
  };

  const openEditModal = (owner) => {
    setEditOwner(owner);
    setEditForm({
      name: owner.name || "",
      no_hp: owner.no_hp || "",
      verification_status: owner.verification_status || "NONE",
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editOwner) return;
    setEditSaving(true);
    try {
      await api(`fastapi-users/${editOwner.id}/details`, {
        method: "PATCH",
        body: {
          name: editForm.name.trim() || undefined,
          no_hp: editForm.no_hp.trim() || undefined,
          verification_status: editForm.verification_status || undefined,
        },
      });
      toast(`Profil pemilik ${editOwner.name || editOwner.email} berhasil diperbarui.`);
      setEditOwner(null);
      await load();
    } catch (err) {
      toast(err.message || "Gagal memperbarui profil pemilik.", "error");
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteOwner = async () => {
    if (!confirmDelete) return;
    try {
      await api(`fastapi-users/${confirmDelete.id}`, { method: "DELETE" });
      toast(`Akun pemilik ${confirmDelete.name || confirmDelete.email} berhasil dihapus.`);
      setConfirmDelete(null);
      await load();
    } catch (err) {
      toast(err.message || "Gagal menghapus akun pemilik.", "error");
    }
  };

  return (
    <div className="grid gap-5">
      <Panel>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <PanelTitle eyebrow="Mitra" title="Direktori Pemilik Kost" />
            <p className="max-w-3xl text-sm leading-6 text-muted">
              Kelola data akun mitra pemilik kost, kontak WhatsApp, verifikasi berkas, serta keaktifan akun.
            </p>
          </div>
          <PrimaryButton onClick={load} disabled={loading} className="w-full md:w-auto justify-center">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Perbarui
          </PrimaryButton>
        </div>
        <form
          onSubmit={search}
          className="mt-4 grid gap-2.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(210px,1fr)_220px_170px_auto] items-end"
        >
          <label className="relative block">
            <span className="sr-only">Cari nama pemilik</span>
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              value={queryInput}
              maxLength={100}
              onChange={(event) => setQueryInput(event.target.value)}
              placeholder="Cari nama pemilik…"
              className="h-10 w-full rounded-lg border border-line bg-field pl-9 pr-3 text-sm text-ink"
            />
          </label>
          <SelectField
            label="Verifikasi"
            className="sm:gap-1"
            value={verification}
            onChange={(event) => {
              setVerification(event.target.value);
              setPage(1);
            }}
            options={VERIFICATION}
          />
          <SelectField
            label="Status akun"
            className="sm:gap-1"
            value={active}
            onChange={(event) => {
              setActive(event.target.value);
              setPage(1);
            }}
            options={[
              ["", "Semua akun"],
              ["true", "Aktif"],
              ["false", "Nonaktif"],
            ]}
          />
          <PrimaryButton type="submit" className="h-10 sm:w-auto w-full justify-center">
            <Search size={16} /> <span>Cari</span>
          </PrimaryButton>
        </form>
      </Panel>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <SkeletonTable rows={6} cols={5} />
      ) : owners.length === 0 ? (
        <EmptyState title="Pemilik tidak ditemukan" message="Tidak ada profil pemilik pada filter ini yang terlihat." />
      ) : (
        <Panel className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
            <div>
              <h3 className="font-extrabold text-ink">Profil Pemilik</h3>
              <p className="mt-1 text-xs text-muted">Halaman {page} · {PAGE_SIZE} akun per permintaan</p>
            </div>
          </div>
          <DataTable headers={["Pemilik & Kontak", "Verifikasi", "Status akun", "Terdaftar", { title: "Aksi", align: "text-center", className: "w-36" }]}>
            {owners.map((owner) => (
              <tr key={owner.id} className="hover:bg-track/60 transition-colors">
                <Td>
                  <div className="flex items-center gap-3">
                    <Avatar name={owner.name || owner.email} src={owner.avatar_url} size={36} />
                    <div className="min-w-0">
                      <p className="truncate font-bold text-ink">{owner.name || "Tanpa nama"}</p>
                      <p className="truncate text-xs text-muted">
                        {owner.email || "—"}{owner.no_hp ? ` · ${owner.no_hp}` : ""}
                      </p>
                      <p className="truncate text-[11px] text-muted font-mono">ID #{owner.id}</p>
                    </div>
                  </div>
                </Td>
                <Td>
                  <Badge
                    status={owner.verification_status || "—"}
                    tone={
                      owner.verification_status === "APPROVED"
                        ? "ok"
                        : owner.verification_status === "REJECTED"
                        ? "bad"
                        : "warn"
                    }
                    size="sm"
                  />
                  {owner.catatan_revisi && (
                    <p className="mt-1 max-w-44 truncate text-xs text-muted" title={owner.catatan_revisi}>
                      {owner.catatan_revisi}
                    </p>
                  )}
                </Td>
                <Td>
                  <Badge status={owner.is_active === true ? "Aktif" : "Nonaktif"} size="sm" />
                </Td>
                <Td>
                  <span className="whitespace-nowrap text-xs text-muted">{dateLabel(owner.created_at)}</span>
                </Td>
                <Td className="w-36 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    {/* Detail Modal */}
                    <button
                      type="button"
                      title="Lihat Detail Pemilik"
                      onClick={() => setDetailOwner(owner)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink hover:bg-track active:scale-95 transition"
                    >
                      <Eye size={14} />
                    </button>

                    {/* Quick Toggle Status */}
                    <button
                      type="button"
                      title={owner.is_active ? "Nonaktifkan Akun" : "Aktifkan Akun"}
                      disabled={togglingId === owner.id}
                      onClick={() => handleToggleStatus(owner)}
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                        owner.is_active
                          ? "border-amber-500/40 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"
                          : "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                      }`}
                    >
                      <Power size={14} className={togglingId === owner.id ? "animate-spin" : ""} />
                    </button>

                    {/* Edit Profil */}
                    <button
                      type="button"
                      title="Edit Data Pemilik"
                      onClick={() => openEditModal(owner)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink hover:bg-track active:scale-95 transition"
                    >
                      <Pencil size={14} />
                    </button>

                    {/* Hapus Pemilik */}
                    <button
                      type="button"
                      title="Hapus Akun Pemilik"
                      onClick={() => setConfirmDelete(owner)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-500/30 text-red-600 hover:bg-red-500/10 active:scale-95 transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </DataTable>
          <div className="flex items-center justify-between border-t border-line px-5 py-4">
            <span aria-live="polite" aria-atomic="true" className="text-xs text-muted">
              Menampilkan {owners.length} pemilik pada halaman {page}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((value) => value - 1)}
                className="min-h-10 rounded-lg border border-line px-3 text-sm font-bold disabled:opacity-40"
              >
                Sebelumnya
              </button>
              <button
                type="button"
                disabled={!hasMore || loading}
                onClick={() => setPage((value) => value + 1)}
                className="min-h-10 rounded-lg border border-line px-3 text-sm font-bold disabled:opacity-40"
              >
                Berikutnya
              </button>
            </div>
          </div>
        </Panel>
      )}

      {/* Modal Detail Pemilik */}
      <Modal
        open={Boolean(detailOwner)}
        onClose={() => setDetailOwner(null)}
        title="Detail Akun Pemilik Kost"
        maxWidth="max-w-md"
      >
        {detailOwner && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 border-b border-line pb-4">
              <Avatar name={detailOwner.name || detailOwner.email} src={detailOwner.avatar_url} size={54} />
              <div>
                <h4 className="font-extrabold text-base text-ink">{detailOwner.name || "Tanpa nama"}</h4>
                <p className="text-xs text-muted">{detailOwner.email || "—"}</p>
                <span className="text-[11px] font-mono text-muted">User ID #{detailOwner.id}</span>
              </div>
            </div>

            <div className="space-y-2.5 text-xs sm:text-sm">
              <div className="flex justify-between py-1 border-b border-line/60">
                <span className="text-muted">Nomor WhatsApp:</span>
                <span className="font-bold text-ink">
                  {detailOwner.no_hp ? (
                    <a
                      href={`https://wa.me/${detailOwner.no_hp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-accent hover:underline font-bold"
                    >
                      <MessageCircle size={13} /> {detailOwner.no_hp}
                    </a>
                  ) : (
                    "—"
                  )}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-line/60">
                <span className="text-muted">Status Akun:</span>
                <Badge status={detailOwner.is_active ? "Aktif" : "Nonaktif"} size="sm" />
              </div>
              <div className="flex justify-between py-1 border-b border-line/60">
                <span className="text-muted">Status Verifikasi:</span>
                <Badge status={detailOwner.verification_status || "NONE"} size="sm" />
              </div>
              <div className="flex justify-between py-1 border-b border-line/60">
                <span className="text-muted">Terdaftar Sejak:</span>
                <span className="font-medium text-ink">{dateLabel(detailOwner.created_at)}</span>
              </div>
              {detailOwner.catatan_revisi && (
                <div className="py-1">
                  <span className="text-muted block mb-1">Catatan Verifikasi:</span>
                  <p className="rounded-lg bg-track/60 p-2.5 text-xs text-ink">{detailOwner.catatan_revisi}</p>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <GhostButton onClick={() => setDetailOwner(null)}>Tutup</GhostButton>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Edit Pemilik */}
      <Modal
        open={Boolean(editOwner)}
        onClose={() => setEditOwner(null)}
        title="Edit Profil Pemilik Kost"
        maxWidth="max-w-md"
      >
        {editOwner && (
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
              <label className="block text-xs font-bold text-muted mb-1">Status Verifikasi</label>
              <select
                value={editForm.verification_status}
                onChange={(e) => setEditForm({ ...editForm, verification_status: e.target.value })}
                className="h-10 w-full rounded-lg border border-line bg-field px-3 text-sm text-ink"
              >
                <option value="NONE">Belum Verifikasi (NONE)</option>
                <option value="PENDING">Menunggu Verifikasi (PENDING)</option>
                <option value="APPROVED">Disetujui (APPROVED)</option>
                <option value="REVISION_REQUIRED">Perlu Revisi (REVISION_REQUIRED)</option>
                <option value="REJECTED">Ditolak (REJECTED)</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-line">
              <GhostButton type="button" onClick={() => setEditOwner(null)} disabled={editSaving}>
                Batal
              </GhostButton>
              <PrimaryButton type="submit" loading={editSaving}>
                Simpan Perubahan
              </PrimaryButton>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal Konfirmasi Hapus Pemilik */}
      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Hapus Akun Pemilik"
        tone="danger"
        message={`Apakah Anda yakin ingin menghapus akun pemilik "${confirmDelete?.name || confirmDelete?.email || ""}"? Tindakan ini akan menghapus akses pemilik ke platform.`}
        confirmLabel="Ya, Hapus Pemilik"
        onConfirm={handleDeleteOwner}
        onClose={() => setConfirmDelete(null)}
      />
    </div>
  );
}
