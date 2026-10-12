"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, Eye, MapPin, RefreshCw, Search, ToggleLeft, ToggleRight } from "lucide-react";
import { api } from "@/lib/api";
import { Badge, DataTable, EmptyState, ErrorState, GhostButton, IconButton, Modal, Panel, PanelTitle, PrimaryButton, SelectField, SkeletonTable, Td, useToast } from "../ui";
import { formatCurrency } from "@/lib/format";

const PAGE_SIZE = 25;
const STATUSES = [
  ["", "Semua status verifikasi"],
  ["PENDING", "Menunggu verifikasi"],
  ["APPROVED", "Disetujui"],
  ["REVISION_REQUIRED", "Perlu revisi"],
  ["REJECTED", "Ditolak"],
];
const dateLabel = (value) =>
  value ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(value)) : "—";

export function FastApiKostsView() {
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

  return (
    <div className="grid gap-5">
      <Panel>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <PanelTitle eyebrow="Properti" title="Manajemen Kost" />
            <p className="max-w-3xl text-sm leading-6 text-muted">
              Kelola direktori listing kost, status ketersediaan, dan pantau status verifikasi secara real-time.
            </p>
          </div>
          <PrimaryButton onClick={load} disabled={loading}>
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Perbarui
          </PrimaryButton>
        </div>
        <form onSubmit={search} className="mt-4 grid gap-3 sm:grid-cols-[minmax(220px,1fr)_240px_auto]">
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
          <PrimaryButton type="submit">
            <Search size={16} /> Cari
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
          </div>
          <DataTable headers={["Nama kost", "Lokasi", "Pemilik", "Ketersediaan", "Verifikasi", "Dibuat", "Aksi"]} minWidth={900}>
            {rows.map((kost) => (
              <tr key={kost.id} className="hover:bg-track/60">
                <Td>
                  <div className="flex min-w-48 items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-maroon/10 text-maroon">
                      <Building2 size={17} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-bold text-ink">{kost.name || "Tanpa nama"}</p>
                      <p className="truncate text-xs text-muted">ID {kost.id} · {kost.gender ? `Kost ${kost.gender}` : ""}</p>
                    </div>
                  </div>
                </Td>
                <Td>
                  <div className="flex min-w-36 items-start gap-1.5 text-sm text-muted">
                    <MapPin size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <span>{[kost.district, kost.city, kost.province].filter(Boolean).join(", ") || kost.address || "Lokasi belum tersedia"}</span>
                  </div>
                </Td>
                <Td>
                  <span className="text-sm text-ink">{kost.owner_id ? `Owner #${kost.owner_id}` : "—"}</span>
                </Td>
                <Td>
                  <button
                    type="button"
                    onClick={() => toggleAvailability(kost)}
                    disabled={updatingId === kost.id}
                    title="Klik untuk ubah ketersediaan"
                    className="inline-flex items-center gap-1.5 cursor-pointer rounded-lg px-2 py-1 text-xs font-semibold border border-line hover:border-ink transition-colors disabled:opacity-50"
                  >
                    <Badge status={kost.status || "—"} tone={kost.status === "TERSEDIA" ? "ok" : "warn"} />
                    {updatingId === kost.id ? (
                      <RefreshCw size={12} className="animate-spin text-muted" />
                    ) : (
                      <span className="text-[10px] text-muted underline">Ubah</span>
                    )}
                  </button>
                </Td>
                <Td>
                  <Badge
                    status={kost.verification_status || "—"}
                    tone={kost.verification_status === "APPROVED" ? "ok" : kost.verification_status === "REJECTED" ? "bad" : "warn"}
                  />
                </Td>
                <Td>
                  <span className="whitespace-nowrap text-sm text-muted">{dateLabel(kost.created_at)}</span>
                </Td>
                <Td>
                  <IconButton
                    icon={Eye}
                    label="Lihat Detail"
                    onClick={() => setDetailKost(kost)}
                  />
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
                  {detailKost.price_min ? `${formatCurrency(detailKost.price_min)} - ${formatCurrency(detailKost.price_max)}` : "—"}
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

            <div className="flex justify-end pt-3 border-t border-line">
              <PrimaryButton onClick={() => setDetailKost(null)}>
                Tutup
              </PrimaryButton>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
