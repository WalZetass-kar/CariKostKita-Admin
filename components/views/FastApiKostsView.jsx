"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  CheckCheck,
  CheckCircle2,
  Eye,
  MapPin,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ToggleLeft,
  ToggleRight,
  Trash2,
  XCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { useApp } from "../AppContext";
import {
  Badge,
  ConfirmDialog,
  DataTable,
  EmptyState,
  ErrorState,
  GhostButton,
  IconButton,
  Modal,
  Panel,
  PanelTitle,
  PrimaryButton,
  SelectField,
  SkeletonTable,
  Td,
  useToast,
} from "../ui";
import { formatCurrency } from "@/lib/format";

const PAGE_SIZE = 25;
const STATUSES = [
  ["", "Semua Kost (Semua Status)"],
  ["APPROVED", "Terverifikasi (Disetujui / APPROVED)"],
  ["PENDING", "Menunggu Verifikasi (PENDING)"],
  ["REVISION_REQUIRED", "Perlu Revisi (REVISION_REQUIRED)"],
  ["REJECTED", "Ditolak (REJECTED)"],
];
const dateLabel = (value) =>
  value ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(value)) : "—";

export function FastApiKostsView() {
  const { openKostForm } = useApp();
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [status, setStatus] = useState("");
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detailKost, setDetailKost] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkAction, setBulkAction] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const pendingInRows = rows.filter((r) => r.verification_status === "PENDING");
  const pendingCount = pendingInRows.length;

  const toggleSelectAll = () => {
    if (selectedIds.size === rows.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(rows.map((r) => r.id)));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkVerify = async (actionType, nextVerificationStatus) => {
    setBulkLoading(true);
    let targetIds = [];
    if (actionType === "selected") {
      targetIds = Array.from(selectedIds);
    } else {
      targetIds = pendingInRows.map((r) => r.id);
    }

    try {
      const res = await api("fastapi-kosts/bulk-verify", {
        method: "POST",
        body: {
          kost_ids: targetIds.length > 0 ? targetIds : null,
          verification_status: nextVerificationStatus,
        },
      });
      const updatedCount = res.count ?? targetIds.length;
      const label = nextVerificationStatus === "APPROVED" ? "disetujui (APPROVED)" : "ditolak (REJECTED)";
      toast(`Berhasil! ${updatedCount} kos telah ${label}.`);
      setRows((prev) =>
        prev.map((item) =>
          targetIds.length === 0 || targetIds.includes(item.id)
            ? { ...item, verification_status: nextVerificationStatus }
            : item
        )
      );
      setSelectedIds(new Set());
      setBulkAction(null);
    } catch (err) {
      toast(err.message || "Gagal memproses persetujuan massal.", "error");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleDeleteKosts = async () => {
    if (!deleteDialog) return;
    setDeleteLoading(true);
    try {
      if (deleteDialog.type === "single") {
        const res = await api(`fastapi-kosts/${deleteDialog.kost.id}`, { method: "DELETE" });
        toast(res?.message || `Listing kost "${deleteDialog.kost.name || ""}" berhasil dihapus.`);
      } else if (deleteDialog.type === "selected") {
        const targetIds = Array.from(selectedIds);
        const res = await api("fastapi-kosts/bulk-delete", {
          method: "POST",
          body: { kost_ids: targetIds, delete_all: false },
        });
        const removed = res?.count ?? targetIds.length;
        toast(res?.message || `Berhasil menghapus ${removed} kost terpilih.`);
        setSelectedIds(new Set());
      } else if (deleteDialog.type === "all") {
        // `confirm` wajib diisi untuk penghapusan seluruh katalog; dialog
        // konfirmasi di layar sudah menjadi persetujuan eksplisit pengguna.
        const res = await api("fastapi-kosts/bulk-delete", {
          method: "POST",
          body: { delete_all: true, confirm: true },
        });
        const removed = res?.count ?? 0;
        toast(res?.message || `Seluruh listing kost berhasil dihapus (${removed} listing).`);
        setSelectedIds(new Set());
      }
      setDeleteDialog(null);
      if (
        detailKost &&
        (deleteDialog.type === "all" ||
          (deleteDialog.type === "selected" && selectedIds.has(detailKost.id)) ||
          (deleteDialog.type === "single" && detailKost.id === deleteDialog.kost?.id))
      ) {
        setDetailKost(null);
      }
      await load();
    } catch (err) {
      toast(err.message || "Gagal menghapus listing kost.", "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
    if (query) params.set("q", query);
    if (status) params.set("verification_status", status);
    try {
      const result = await api(`fastapi-kosts?${params}`);
      setRows(result.data || []);
      setHasMore(Boolean(result.pagination?.has_more));
    } catch (err) {
      setError(err.message || "Direktori kost tidak dapat dimuat.");
      setRows([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [page, query, status]);

  useEffect(() => {
    load();
  }, [load]);

  const search = (event) => {
    event.preventDefault();
    setPage(1);
    setQuery(queryInput.trim().slice(0, 100));
  };

  const toggleAvailability = async (kost) => {
    const nextStatus = kost.status === "TERSEDIA" ? "PENUH" : "TERSEDIA";
    setUpdatingId(kost.id);
    try {
      await api(`fastapi-kosts/${kost.id}/status`, {
        method: "PATCH",
        body: { status: nextStatus },
      });
      toast(`Status kost ${kost.name || ""} diubah menjadi ${nextStatus}.`);
      setRows((prev) =>
        prev.map((item) => (item.id === kost.id ? { ...item, status: nextStatus } : item))
      );
      if (detailKost?.id === kost.id) {
        setDetailKost((prev) => (prev ? { ...prev, status: nextStatus } : null));
      }
    } catch (err) {
      toast(err.message || "Gagal mengubah status ketersediaan.", "error");
    } finally {
      setUpdatingId(null);
    }
  };

  const updateVerificationStatus = async (kost, nextVerificationStatus) => {
    setUpdatingId(kost.id);
    try {
      await api(`fastapi-kosts/${kost.id}/status`, {
        method: "PATCH",
        body: { verification_status: nextVerificationStatus },
      });
      const label =
        nextVerificationStatus === "APPROVED"
          ? "Disetujui (APPROVED)"
          : nextVerificationStatus === "REJECTED"
          ? "Ditolak (REJECTED)"
          : nextVerificationStatus === "REVISION_REQUIRED"
          ? "Perlu Revisi"
          : "Menunggu Verifikasi (PENDING)";
      toast(`Status verifikasi "${kost.name || ""}" berhasil diubah menjadi ${label}.`);
      setRows((prev) =>
        prev.map((item) =>
          item.id === kost.id ? { ...item, verification_status: nextVerificationStatus } : item
        )
      );
      if (detailKost?.id === kost.id) {
        setDetailKost((prev) =>
          prev ? { ...prev, verification_status: nextVerificationStatus } : null
        );
      }
    } catch (err) {
      toast(err.message || "Gagal mengubah status verifikasi.", "error");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="grid gap-4 sm:gap-5">
      <Panel className="p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <PanelTitle eyebrow="Properti" title="Manajemen Kost" />
            <p className="mt-1 max-w-3xl text-xs sm:text-sm leading-relaxed text-muted">
              Kelola direktori listing kost, status ketersediaan, dan pantau status verifikasi secara real-time.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {pendingCount > 0 && (
              <PrimaryButton
                type="button"
                onClick={() => setBulkAction({ type: "all_pending", status: "APPROVED" })}
                disabled={bulkLoading}
                className="!h-9 sm:!h-10 text-xs sm:text-sm !bg-good-fg hover:opacity-95 text-white shadow-xs"
                title="Setujui semua kos yang berstatus PENDING"
              >
                <CheckCheck size={16} />
                <span>Setujui Semua ({pendingCount} Pending)</span>
              </PrimaryButton>
            )}
            <PrimaryButton onClick={() => openKostForm?.({})} className="!h-9 sm:!h-10 text-xs sm:text-sm flex-1 sm:flex-initial justify-center">
              <Plus size={16} />
              <span>Tambah Kost</span>
            </PrimaryButton>
            <button
              type="button"
              onClick={() => setDeleteDialog({ type: "all" })}
              disabled={loading || rows.length === 0 || deleteLoading}
              className="!h-9 sm:!h-10 text-xs sm:text-sm px-3 rounded-lg bg-bad-bg text-bad-fg border border-bad-border hover:bg-bad-fg hover:text-white font-bold flex items-center gap-1.5 shadow-xs transition active:scale-95 disabled:opacity-40 cursor-pointer"
              title="Hapus SEMUA listing kost dari database"
            >
              <Trash2 size={16} />
              <span>Hapus Semua</span>
            </button>
            <GhostButton onClick={load} disabled={loading} className="!h-9 sm:!h-10 text-xs sm:text-sm flex-1 sm:flex-initial justify-center">
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              <span>Perbarui</span>
            </GhostButton>
          </div>
        </div>
        <form onSubmit={search} className="mt-4 grid gap-2.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_240px_auto] items-end">
          <label className="relative block">
            <span className="sr-only">Cari nama kost</span>
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              value={queryInput}
              maxLength={100}
              onChange={(event) => setQueryInput(event.target.value)}
              placeholder="Cari nama kost…"
              className="h-10 w-full rounded-lg border border-line bg-field pl-9 pr-3 text-sm text-ink"
            />
          </label>
          <SelectField
            label="Status verifikasi"
            className="sm:gap-1"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            options={STATUSES}
          />
          <PrimaryButton type="submit" className="h-10 w-full sm:w-auto justify-center">
            <Search size={16} /> <span>Cari</span>
          </PrimaryButton>
        </form>
      </Panel>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <SkeletonTable rows={6} cols={6} />
      ) : rows.length === 0 ? (
        <EmptyState title="Kost tidak ditemukan" message="Tidak ada listing kost yang sesuai dengan kriteria filter saat ini." />
      ) : (
        <Panel className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
            <div>
              <h3 className="font-extrabold text-ink">Daftar Properti Kost</h3>
              <p className="mt-1 text-xs text-muted">Halaman {page} · {PAGE_SIZE} item per permintaan</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-xs text-muted hover:text-ink font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <input
                  type="checkbox"
                  aria-label="Pilih semua listing"
                  checked={rows.length > 0 && selectedIds.size === rows.length}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-line text-maroon focus:ring-maroon cursor-pointer"
                />
                <span>Pilih Semua Halaman Ini</span>
              </button>
            </div>
          </div>

          {selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-good-bg/30 border-b border-good-border px-5 py-3">
              <span className="text-xs font-bold text-ink flex items-center gap-2">
                <CheckCheck size={16} className="text-good-fg" />
                <span>{selectedIds.size} kos dipilih</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={bulkLoading}
                  onClick={() => setBulkAction({ type: "selected", status: "APPROVED" })}
                  className="px-3 py-1.5 rounded-lg bg-good-fg hover:opacity-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition active:scale-95 disabled:opacity-50"
                >
                  <CheckCircle2 size={14} />
                  <span>Setujui Terpilih ({selectedIds.size})</span>
                </button>
                <button
                  type="button"
                  disabled={bulkLoading}
                  onClick={() => setBulkAction({ type: "selected", status: "REJECTED" })}
                  className="px-3 py-1.5 rounded-lg bg-bad-bg text-bad-fg border border-bad-border hover:bg-bad-bg/80 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
                >
                  <XCircle size={14} />
                  <span>Tolak Terpilih</span>
                </button>
                <button
                  type="button"
                  disabled={bulkLoading || deleteLoading}
                  onClick={() => setDeleteDialog({ type: "selected", ids: Array.from(selectedIds) })}
                  className="px-3 py-1.5 rounded-lg bg-bad-bg text-bad-fg border border-bad-border hover:bg-bad-fg hover:text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
                  title="Hapus listing kost yang dipilih secara permanen"
                >
                  <Trash2 size={14} />
                  <span>Hapus Terpilih ({selectedIds.size})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="text-xs text-muted hover:text-ink underline ml-1 cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </div>
          )}

          <DataTable
            headers={[
              {
                title: (
                  <input
                    type="checkbox"
                    aria-label="Pilih semua listing"
                    checked={rows.length > 0 && selectedIds.size === rows.length}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-line text-maroon focus:ring-maroon cursor-pointer"
                  />
                ),
                align: "text-center",
                className: "w-10",
              },
              "Properti Kost & Lokasi",
              "Harga",
              "Status & Verifikasi",
              "Dibuat",
              { title: "Aksi", align: "text-center", className: "w-24" },
            ]}
          >
            {rows.map((kost) => (
              <tr key={kost.id} className="hover:bg-track/60 transition-colors">
                <Td className="w-10 text-center">
                  <input
                    type="checkbox"
                    aria-label={`Pilih ${kost.name || "kost"}`}
                    checked={selectedIds.has(kost.id)}
                    onChange={() => toggleSelect(kost.id)}
                    className="h-4 w-4 rounded border-line text-maroon focus:ring-maroon cursor-pointer"
                  />
                </Td>
                <Td>
                  <div className="flex items-start gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-maroon/10 text-maroon mt-0.5">
                      <Building2 size={17} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-ink">{kost.name || "Tanpa nama"}</p>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted mt-0.5">
                        <span className="flex items-center gap-1">
                          <MapPin size={12} className="shrink-0 text-accent" />
                          <span>{[kost.district, kost.city].filter(Boolean).join(", ") || kost.address || "Pekanbaru"}</span>
                        </span>
                        <span>·</span>
                        <span>ID #{kost.id}</span>
                        {kost.gender && (
                          <>
                            <span>·</span>
                            <span className="font-semibold text-ink">Kost {kost.gender}</span>
                          </>
                        )}
                        {kost.owner_id && (
                          <>
                            <span>·</span>
                            <span>Owner #{kost.owner_id}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </Td>
                <Td>
                  <span className="font-bold text-xs sm:text-sm text-ink whitespace-nowrap">
                    {kost.price_min && Number(kost.price_min) > 0 ? (
                      `${formatCurrency(kost.price_min)}${kost.price_max && Number(kost.price_max) > Number(kost.price_min) ? ` - ${formatCurrency(kost.price_max)}` : " / bln"}`
                    ) : kost.price || kost.harga ? (
                      `${formatCurrency(kost.price || kost.harga)} / bln`
                    ) : (
                      <span className="text-muted text-xs italic">Belum diatur</span>
                    )}
                  </span>
                </Td>
                <Td>
                  <div className="flex flex-col gap-1.5 items-start">
                    <div className="flex items-center gap-1.5">
                      <Badge
                        status={kost.verification_status || "—"}
                        tone={kost.verification_status === "APPROVED" ? "ok" : kost.verification_status === "REJECTED" ? "bad" : "warn"}
                        size="sm"
                      />
                      {updatingId === kost.id ? (
                        <RefreshCw size={12} className="animate-spin text-muted" />
                      ) : kost.verification_status !== "APPROVED" ? (
                        <button
                          type="button"
                          disabled={updatingId === kost.id}
                          onClick={() => updateVerificationStatus(kost, "APPROVED")}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-good-bg text-good-fg hover:opacity-90 transition disabled:opacity-50"
                          title="Setujui verifikasi listing ini"
                        >
                          <CheckCircle2 size={11} />
                          <span>Setujui</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={updatingId === kost.id}
                          onClick={() => updateVerificationStatus(kost, "PENDING")}
                          className="text-[10px] text-muted hover:text-ink underline text-left"
                          title="Kembalikan status verifikasi ke PENDING"
                        >
                          Batal
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleAvailability(kost)}
                      disabled={updatingId === kost.id}
                      title="Klik untuk ubah ketersediaan"
                      className="inline-flex items-center gap-1.5 cursor-pointer rounded-md px-1.5 py-0.5 text-[11px] font-semibold border border-line hover:border-ink transition-colors disabled:opacity-50"
                    >
                      <Badge status={kost.status || "—"} tone={kost.status === "TERSEDIA" ? "ok" : "warn"} size="sm" />
                      <span className="text-[10px] text-muted underline">Ubah</span>
                    </button>
                  </div>
                </Td>
                <Td>
                  <span className="whitespace-nowrap text-xs text-muted">{dateLabel(kost.created_at)}</span>
                </Td>
                <Td className="w-24 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <IconButton
                      label="Lihat Detail"
                      tone="info"
                      className="!h-8 !w-8"
                      onClick={() => setDetailKost(kost)}
                    >
                      <Eye size={15} />
                    </IconButton>
                    <IconButton
                      label={`Hapus ${kost.name || "kost"}`}
                      tone="danger"
                      className="!h-8 !w-8"
                      disabled={deleteLoading}
                      onClick={() => setDeleteDialog({ type: "single", kost })}
                    >
                      <Trash2 size={15} />
                    </IconButton>
                  </div>
                </Td>
              </tr>
            ))}
          </DataTable>
          <div className="flex items-center justify-between border-t border-line px-5 py-4">
            <span aria-live="polite" aria-atomic="true" className="text-xs text-muted">
              Menampilkan {rows.length} listing pada halaman {page}
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

      {/* Modal Detail Kost */}
      {detailKost && (
        <Modal
          open={Boolean(detailKost)}
          onClose={() => setDetailKost(null)}
          title={`Detail Kost: ${detailKost.name || "Tanpa Nama"}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-track/40 p-3">
                <span className="text-xs text-muted">Nama Kost</span>
                <p className="font-bold text-ink">{detailKost.name || "—"}</p>
              </div>
              <div className="rounded-lg bg-track/40 p-3">
                <span className="text-xs text-muted">ID & Tipe</span>
                <p className="font-bold text-ink">ID: {detailKost.id} ({detailKost.gender || "Campur"})</p>
              </div>
              <div className="rounded-lg bg-track/40 p-3">
                <span className="text-xs text-muted">Rentang Harga</span>
                <p className="font-bold text-maroon">
                  {detailKost.price_min && Number(detailKost.price_min) > 0
                    ? `${formatCurrency(detailKost.price_min)}${detailKost.price_max && Number(detailKost.price_max) > Number(detailKost.price_min) ? ` - ${formatCurrency(detailKost.price_max)}` : " / bulan"}`
                    : detailKost.price || detailKost.harga
                    ? `${formatCurrency(detailKost.price || detailKost.harga)} / bulan`
                    : "—"}
                </p>
              </div>
              <div className="rounded-lg bg-track/40 p-3">
                <span className="text-xs text-muted">Status Ketersediaan</span>
                <div className="mt-1 flex items-center gap-2">
                  <Badge status={detailKost.status || "—"} tone={detailKost.status === "TERSEDIA" ? "ok" : "warn"} />
                  <GhostButton
                    onClick={() => toggleAvailability(detailKost)}
                    disabled={updatingId === detailKost.id}
                  >
                    Ubah ke {detailKost.status === "TERSEDIA" ? "PENUH" : "TERSEDIA"}
                  </GhostButton>
                </div>
              </div>
            </div>

            {/* Status Moderasi & Verifikasi Listing */}
            <div className="rounded-xl border border-line bg-surface p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-semibold text-muted block mb-1">Status Verifikasi & Moderasi</span>
                  <div className="flex items-center gap-2">
                    <Badge
                      status={detailKost.verification_status || "—"}
                      tone={detailKost.verification_status === "APPROVED" ? "ok" : detailKost.verification_status === "REJECTED" ? "bad" : "warn"}
                    />
                    <span className="text-xs text-muted">
                      {detailKost.verification_status === "APPROVED"
                        ? "Listing telah disetujui & aktif di pencarian publik."
                        : detailKost.verification_status === "PENDING"
                        ? "Menunggu persetujuan admin."
                        : detailKost.verification_status === "REJECTED"
                        ? "Listing ditolak."
                        : "Perlu revisi data/foto."}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {detailKost.verification_status !== "APPROVED" && (
                    <button
                      type="button"
                      disabled={updatingId === detailKost.id}
                      onClick={() => updateVerificationStatus(detailKost, "APPROVED")}
                      className="px-3 py-1.5 rounded-lg bg-good-fg hover:opacity-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition active:scale-95 disabled:opacity-50"
                    >
                      <CheckCircle2 size={14} />
                      <span>Setujui (Approve)</span>
                    </button>
                  )}
                  {detailKost.verification_status !== "REJECTED" && (
                    <button
                      type="button"
                      disabled={updatingId === detailKost.id}
                      onClick={() => updateVerificationStatus(detailKost, "REJECTED")}
                      className="px-3 py-1.5 rounded-lg bg-bad-bg hover:bg-bad-bg/80 text-bad-fg text-xs font-bold flex items-center gap-1.5 border border-bad-border transition active:scale-95 disabled:opacity-50"
                    >
                      <XCircle size={14} />
                      <span>Tolak (Reject)</span>
                    </button>
                  )}
                  {detailKost.verification_status === "APPROVED" && (
                    <button
                      type="button"
                      disabled={updatingId === detailKost.id}
                      onClick={() => updateVerificationStatus(detailKost, "PENDING")}
                      className="px-3 py-1.5 rounded-lg bg-track hover:bg-line text-ink text-xs font-semibold flex items-center gap-1.5 border border-line transition active:scale-95 disabled:opacity-50"
                    >
                      <RotateCcw size={13} />
                      <span>Kembalikan ke PENDING</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-track/40 p-3">
              <span className="text-xs text-muted">Alamat Lengkap</span>
              <p className="text-sm text-ink">{detailKost.address || "—"}</p>
              <p className="text-xs text-muted mt-1">
                {[detailKost.district, detailKost.city, detailKost.province].filter(Boolean).join(", ")}
              </p>
            </div>

            {detailKost.description && (
              <div className="rounded-lg bg-track/40 p-3">
                <span className="text-xs text-muted">Deskripsi</span>
                <p className="text-sm text-ink whitespace-pre-line mt-1">{detailKost.description}</p>
              </div>
            )}

            {detailKost.facilities && detailKost.facilities.length > 0 && (
              <div className="rounded-lg bg-track/40 p-3">
                <span className="text-xs text-muted">Fasilitas</span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(Array.isArray(detailKost.facilities) ? detailKost.facilities : [detailKost.facilities]).map((f, i) => (
                    <span key={i} className="rounded-md bg-white px-2 py-0.5 text-xs text-ink border border-line">
                      {typeof f === "string" ? f : f?.name || JSON.stringify(f)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-line">
              <button
                type="button"
                onClick={() => setDeleteDialog({ type: "single", kost: detailKost })}
                disabled={deleteLoading}
                className="px-3 py-2 rounded-lg bg-bad-bg text-bad-fg border border-bad-border hover:bg-bad-fg hover:text-white text-xs font-bold flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Trash2 size={14} />
                <span>Hapus Kost Ini</span>
              </button>
              <PrimaryButton onClick={() => setDetailKost(null)}>
                Tutup
              </PrimaryButton>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Konfirmasi Persetujuan Massal */}
      <ConfirmDialog
        open={Boolean(bulkAction)}
        title={
          bulkAction?.type === "all_pending"
            ? `Setujui Semua ${pendingCount} Kos Pending`
            : `Setujui ${selectedIds.size} Kos Terpilih`
        }
        message={
          bulkAction?.type === "all_pending"
            ? `Apakah Anda yakin ingin menyetujui seluruh ${pendingCount} kos yang berstatus PENDING sekaligus? Seluruh kos ini akan langsung berstatus APPROVED dan dapat dicari di katalog publik.`
            : `Apakah Anda yakin ingin ${
                bulkAction?.status === "APPROVED" ? "menyetujui" : "menolak"
              } ${selectedIds.size} kos yang dipilih sekaligus?`
        }
        confirmLabel={bulkAction?.status === "APPROVED" ? "Ya, Setujui Semua" : "Ya, Tolak"}
        tone={bulkAction?.status === "APPROVED" ? "primary" : "danger"}
        onConfirm={() => handleBulkVerify(bulkAction?.type, bulkAction?.status || "APPROVED")}
        onClose={() => setBulkAction(null)}
      />

      {/* Modal Konfirmasi Hapus Kost (Semua / Terpilih / Satuan) */}
      <ConfirmDialog
        open={Boolean(deleteDialog)}
        title={
          deleteDialog?.type === "all"
            ? "Hapus SEMUA Listing Kost"
            : deleteDialog?.type === "selected"
            ? `Hapus ${selectedIds.size} Listing Kost Terpilih`
            : `Hapus Kost: ${deleteDialog?.kost?.name || "Tanpa Nama"}`
        }
        message={
          deleteDialog?.type === "all"
            ? "PERINGATAN: Anda akan menghapus SELURUH listing kost dari database secara permanen beserta data kamar, favorit, dan ulasannya! Tindakan ini TIDAK DAPAT DIBATALKAN. Apakah Anda benar-benar yakin ingin melanjutkan?"
            : deleteDialog?.type === "selected"
            ? `Apakah Anda yakin ingin menghapus ${selectedIds.size} listing kost yang dipilih secara permanen? Data yang telah dihapus tidak dapat dipulihkan.`
            : `Apakah Anda yakin ingin menghapus listing kost "${deleteDialog?.kost?.name || ""}" (ID: ${deleteDialog?.kost?.id}) secara permanen?`
        }
        confirmLabel={
          deleteLoading
            ? "Menghapus..."
            : deleteDialog?.type === "all"
            ? "Ya, Hapus SEMUA Kost"
            : "Ya, Hapus Permanen"
        }
        tone="danger"
        onConfirm={handleDeleteKosts}
        onClose={() => !deleteLoading && setDeleteDialog(null)}
      />
    </div>
  );
}
