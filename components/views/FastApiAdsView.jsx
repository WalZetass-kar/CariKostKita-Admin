"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Image as ImageIcon, Pencil, Plus, Power, RefreshCw, Search, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useApp } from "../AppContext";
import {
  Badge,
  ConfirmDialog,
  DataTable,
  EmptyState,
  ErrorState,
  GhostButton,
  Panel,
  PanelTitle,
  PrimaryButton,
  SelectField,
  SkeletonTable,
  Td,
  useToast,
} from "../ui";

const PAGE_SIZE = 25;
const dateLabel = (value) =>
  value ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(value)) : "—";

export function FastApiAdsView() {
  const { openAdForm } = useApp();
  const toast = useToast();
  const [ads, setAds] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [active, setActive] = useState("");
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
    if (query) params.set("q", query);
    if (active) params.set("is_active", active);
    try {
      const result = await api(`fastapi-ads?${params}`);
      setAds(result.data || []);
      setHasMore(Boolean(result.pagination?.has_more));
    } catch (err) {
      setError(err.message || "Inventaris iklan FastAPI tidak dapat dimuat.");
      setAds([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [active, page, query]);

  useEffect(() => {
    load();
  }, [load]);

  const search = (event) => {
    event.preventDefault();
    setPage(1);
    setQuery(queryInput.trim().slice(0, 100));
  };

  const handleToggleActive = async (ad) => {
    setTogglingId(ad.id);
    try {
      await api(`ads/${ad.id}/toggle`, {
        method: "POST",
        body: { active: !ad.is_active },
      });
      toast(`Iklan "${ad.title}" ${!ad.is_active ? "diaktifkan" : "dinonaktifkan"}.`);
      await load();
    } catch (err) {
      toast(err.message || "Gagal mengubah status iklan.", "error");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteAd = async () => {
    if (!confirmDelete) return;
    try {
      await api(`ads/${confirmDelete.id}`, { method: "DELETE" });
      toast(`Iklan "${confirmDelete.title}" berhasil dihapus.`);
      setConfirmDelete(null);
      await load();
    } catch (err) {
      toast(err.message || "Gagal menghapus iklan.", "error");
    }
  };

  return (
    <div className="grid gap-4 sm:gap-5">
      <Panel className="p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <PanelTitle eyebrow="Pemasaran" title="Manajemen Iklan" />
            <p className="mt-1 max-w-3xl text-xs sm:text-sm leading-relaxed text-muted">
              Kelola dan pantau seluruh inventaris kampanye iklan yang tayang di aplikasi dan website CariKostKita.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PrimaryButton onClick={() => openAdForm?.({ onSaved: load })} className="!h-9 sm:!h-10 text-xs sm:text-sm w-auto shrink-0">
              <Plus size={15} />
              <span>Tambah Iklan</span>
            </PrimaryButton>
            <GhostButton onClick={load} disabled={loading} className="!h-9 sm:!h-10 text-xs sm:text-sm w-auto shrink-0">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              <span>Perbarui</span>
            </GhostButton>
          </div>
        </div>
        <form onSubmit={search} className="mt-4 grid gap-2.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_210px_auto] items-end">
          <label className="relative block">
            <span className="sr-only">Cari judul iklan</span>
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              aria-hidden="true"
            />
            <input
              value={queryInput}
              maxLength={100}
              onChange={(event) => setQueryInput(event.target.value)}
              placeholder="Cari judul iklan…"
              className="h-10 w-full rounded-lg border border-line bg-field pl-9 pr-3 text-sm text-ink"
            />
          </label>
          <SelectField
            label="Status aktif"
            className="sm:gap-1"
            value={active}
            onChange={(event) => {
              setActive(event.target.value);
              setPage(1);
            }}
            options={[
              ["", "Semua iklan"],
              ["true", "Aktif"],
              ["false", "Nonaktif"],
            ]}
          />
          <PrimaryButton type="submit" className="h-10 px-4 w-auto self-end shrink-0">
            <Search size={15} /> <span>Cari</span>
          </PrimaryButton>
        </form>
      </Panel>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <SkeletonTable rows={6} cols={6} />
      ) : ads.length === 0 ? (
        <EmptyState
          title="Iklan tidak ditemukan"
          message="Tidak ada iklan pada filter ini. Klik tombol Tambah Iklan untuk membuat promosi baru."
        />
      ) : (
        <Panel className="p-0 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5 sm:py-4">
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-ink">Daftar Kampanye Iklan</h3>
              <p className="mt-0.5 text-xs text-muted">
                Halaman {page} · {PAGE_SIZE} item per permintaan
              </p>
            </div>
            <PrimaryButton onClick={() => openAdForm?.({ onSaved: load })} className="!h-8 text-xs">
              <Plus size={14} /> Tambah Iklan
            </PrimaryButton>
          </div>
          {/* Desktop Table View */}
          <div className="hidden lg:block">
            <DataTable headers={["Iklan", "Periode", "Status", "Performa", "Target", { title: "Aksi", align: "text-center", className: "w-36" }]}>
              {ads.map((ad) => (
                <tr key={ad.id} className="hover:bg-track/60 transition-colors">
                  <Td>
                    <div className="flex min-w-48 items-center gap-3">
                      {ad.image_url ? (
                        <img
                          src={ad.image_url}
                          alt=""
                          className="h-10 w-14 shrink-0 rounded-md border border-line object-cover"
                        />
                      ) : (
                        <span className="grid h-10 w-14 shrink-0 place-items-center rounded-md border border-line bg-track text-muted">
                          <ImageIcon size={17} aria-hidden="true" />
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-bold text-ink">{ad.title || "Tanpa judul"}</p>
                        <p className="truncate text-xs text-muted">ID #{ad.id}</p>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <span className="whitespace-nowrap text-xs sm:text-sm text-muted">
                      {dateLabel(ad.start_date)} – {dateLabel(ad.end_date)}
                    </span>
                  </Td>
                  <Td>
                    <Badge status={ad.is_active ? "Aktif" : "Nonaktif"} />
                  </Td>
                  <Td>
                    <div className="text-xs space-y-0.5">
                      <div className="font-semibold text-ink tabular-nums">
                        {Number(ad.impressions || 0).toLocaleString("id-ID")}{" "}
                        <span className="font-normal text-[11px] text-muted">tayang</span>
                      </div>
                      <div className="tabular-nums text-muted text-[11px]">
                        {Number(ad.clicks || 0).toLocaleString("id-ID")} klik
                      </div>
                    </div>
                  </Td>
                  <Td>
                    {ad.target_url ? (
                      <a
                        href={ad.target_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-8 max-w-40 items-center gap-1.5 truncate text-xs font-bold text-accent underline-offset-2 hover:underline"
                      >
                        <span className="truncate">Buka target</span>
                        <ExternalLink size={13} aria-hidden="true" />
                      </a>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </Td>
                  <Td className="w-36 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {/* Quick Toggle Status */}
                      <button
                        type="button"
                        title={ad.is_active ? "Nonaktifkan Iklan" : "Aktifkan Iklan"}
                        disabled={togglingId === ad.id}
                        onClick={() => handleToggleActive(ad)}
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                          ad.is_active
                            ? "border-amber-500/40 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"
                            : "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                        }`}
                      >
                        <Power size={14} className={togglingId === ad.id ? "animate-spin" : ""} />
                      </button>

                      {/* Edit Form */}
                      <button
                        type="button"
                        title="Edit Iklan"
                        onClick={() =>
                          openAdForm?.({
                            id: ad.id,
                            title: ad.title,
                            description: ad.description,
                            image: ad.image_url,
                            link: ad.target_url,
                            status: ad.is_active ? "Aktif" : "Nonaktif",
                            onSaved: load,
                          })
                        }
                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-line px-2 text-xs font-bold text-ink hover:bg-track active:scale-95 transition"
                      >
                        <Pencil size={13} />
                        <span className="hidden sm:inline">Edit</span>
                      </button>

                      {/* Hapus Iklan */}
                      <button
                        type="button"
                        title="Hapus Iklan"
                        onClick={() => setConfirmDelete(ad)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-500/30 text-red-600 hover:bg-red-500/10 active:scale-95 transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
            </DataTable>
          </div>

          {/* Mobile Card View */}
          <div className="block lg:hidden divide-y divide-line/70">
            {ads.map((ad) => (
              <div key={ad.id} className="p-4 space-y-3 hover:bg-track/30 transition">
                <div className="flex items-start gap-3">
                  {ad.image_url ? (
                    <img
                      src={ad.image_url}
                      alt=""
                      className="h-14 w-20 shrink-0 rounded-lg border border-line object-cover"
                    />
                  ) : (
                    <span className="grid h-14 w-20 shrink-0 place-items-center rounded-lg border border-line bg-track text-muted">
                      <ImageIcon size={20} aria-hidden="true" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-extrabold text-sm text-ink truncate">{ad.title || "Tanpa judul"}</h4>
                      <Badge status={ad.is_active ? "Aktif" : "Nonaktif"} size="sm" />
                    </div>
                    <p className="text-xs text-muted mt-0.5">ID #{ad.id}</p>
                    <p className="text-[11px] text-muted font-medium mt-1">
                      {dateLabel(ad.start_date)} – {dateLabel(ad.end_date)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 rounded-lg border border-line/60 bg-track/40 px-3 py-2 text-xs">
                  <div>
                    <span className="text-muted text-[11px] block">Tayang / Impresi</span>
                    <strong className="text-ink font-bold tabular-nums">
                      {Number(ad.impressions || 0).toLocaleString("id-ID")}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted text-[11px] block">Klik</span>
                    <strong className="text-ink font-bold tabular-nums">
                      {Number(ad.clicks || 0).toLocaleString("id-ID")}
                    </strong>
                  </div>
                  {ad.target_url && (
                    <a
                      href={ad.target_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-accent hover:underline shrink-0"
                    >
                      <span>Link Target</span>
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>

                {/* Mobile Action Buttons */}
                <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-line/40">
                  <button
                    type="button"
                    disabled={togglingId === ad.id}
                    onClick={() => handleToggleActive(ad)}
                    className={`inline-flex h-8 sm:h-9 items-center gap-1.5 rounded-lg border px-2.5 sm:px-3 text-xs font-bold transition active:scale-95 shrink-0 ${
                      ad.is_active
                        ? "border-amber-500/40 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20"
                        : "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20"
                    }`}
                  >
                    <Power size={13} className={togglingId === ad.id ? "animate-spin" : ""} />
                    <span>{ad.is_active ? "Nonaktifkan" : "Aktifkan"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      openAdForm?.({
                        id: ad.id,
                        title: ad.title,
                        description: ad.description,
                        image: ad.image_url,
                        link: ad.target_url,
                        status: ad.is_active ? "Aktif" : "Nonaktif",
                        onSaved: load,
                      })
                    }
                    className="inline-flex h-8 sm:h-9 items-center gap-1.5 rounded-lg border border-line bg-paper px-2.5 sm:px-3 text-xs font-bold text-ink hover:bg-track active:scale-95 transition shrink-0"
                  >
                    <Pencil size={13} />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfirmDelete(ad)}
                    className="inline-flex h-8 sm:h-9 items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/5 px-2.5 sm:px-3 text-xs font-bold text-red-600 hover:bg-red-500/15 active:scale-95 transition shrink-0"
                  >
                    <Trash2 size={13} />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-line px-4 py-3 sm:px-5 sm:py-4">
            <span aria-live="polite" aria-atomic="true" className="text-xs text-muted">
              Menampilkan {ads.length} iklan pada halaman {page}
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

      {/* Modal Konfirmasi Hapus Iklan */}
      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Hapus Iklan"
        tone="danger"
        message={`Apakah Anda yakin ingin menghapus iklan "${confirmDelete?.title || ""}"? Data tayang dan impresi kampanye ini akan dihapus dari server.`}
        confirmLabel="Ya, Hapus Iklan"
        onConfirm={handleDeleteAd}
        onClose={() => setConfirmDelete(null)}
      />
    </div>
  );
}
