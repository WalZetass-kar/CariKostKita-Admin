"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Image as ImageIcon, Pencil, Plus, RefreshCw, Search } from "lucide-react";
import { api } from "@/lib/api";
import { useApp } from "../AppContext";
import {
  Badge,
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
} from "../ui";

const PAGE_SIZE = 25;
const dateLabel = (value) =>
  value ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(value)) : "—";

export function FastApiAdsView() {
  const { openAdForm } = useApp();
  const [ads, setAds] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [active, setActive] = useState("");
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <PrimaryButton onClick={() => openAdForm?.({})} className="!h-9 sm:!h-10 text-xs sm:text-sm flex-1 sm:flex-initial justify-center">
              <Plus size={16} />
              <span>Tambah Iklan</span>
            </PrimaryButton>
            <GhostButton onClick={load} disabled={loading} className="!h-9 sm:!h-10 text-xs sm:text-sm flex-1 sm:flex-initial justify-center">
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
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
          <PrimaryButton type="submit" className="h-10 sm:w-auto w-full justify-center">
            <Search size={16} /> <span>Cari</span>
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
            <PrimaryButton onClick={() => openAdForm?.({})} className="!h-8 text-xs">
              <Plus size={14} /> Tambah Iklan
            </PrimaryButton>
          </div>
          <DataTable headers={["Iklan", "Periode", "Status", "Performa", "Target", { title: "Aksi", align: "text-center", className: "w-20" }]}>
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
                      <p className="truncate text-xs text-muted">ID {ad.id}</p>
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
                <Td className="w-20 text-center">
                  <div className="flex items-center justify-center">
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
                        })
                      }
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 text-xs font-bold text-ink hover:bg-track active:scale-95 transition"
                    >
                      <Pencil size={13} />
                      <span>Edit</span>
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </DataTable>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-line px-4 py-3 sm:px-5 sm:py-4">
            <span aria-live="polite" aria-atomic="true" className="text-xs text-muted">
              Menampilkan {ads.length} iklan pada halaman {page}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((value) => value - 1)}
                className="min-h-9 rounded-lg border border-line px-3 text-xs sm:text-sm font-bold disabled:opacity-40"
              >
                Sebelumnya
              </button>
              <button
                type="button"
                disabled={!hasMore || loading}
                onClick={() => setPage((value) => value + 1)}
                className="min-h-9 rounded-lg border border-line px-3 text-xs sm:text-sm font-bold disabled:opacity-40"
              >
                Berikutnya
              </button>
            </div>
          </div>
        </Panel>
      )}
    </div>
  );
}
