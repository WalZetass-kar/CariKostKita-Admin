"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Image as ImageIcon, RefreshCw, Search } from "lucide-react";
import { api } from "@/lib/api";
import { Badge, DataTable, EmptyState, ErrorState, Panel, PanelTitle, PrimaryButton, SelectField, SkeletonTable, Td } from "../ui";

const PAGE_SIZE = 25;
const dateLabel = (value) => value ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(value)) : "—";

export function FastApiAdsView() {
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

  useEffect(() => { load(); }, [load]);
  const search = (event) => { event.preventDefault(); setPage(1); setQuery(queryInput.trim().slice(0, 100)); };

  return (
    <div className="grid gap-5">
      <Panel>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div><PanelTitle eyebrow="Pemasaran" title="Manajemen Iklan" /><p className="max-w-3xl text-sm leading-6 text-muted">Kelola dan pantau seluruh inventaris kampanye iklan yang tayang di aplikasi dan website CariKostKita.</p></div>
          <PrimaryButton onClick={load} disabled={loading}><RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Perbarui</PrimaryButton>
        </div>
        <form onSubmit={search} className="mt-4 grid gap-3 sm:grid-cols-[minmax(220px,1fr)_210px_auto]">
          <label className="relative block"><span className="sr-only">Cari judul iklan</span><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" /><input value={queryInput} maxLength={100} onChange={(event) => setQueryInput(event.target.value)} placeholder="Cari judul iklan…" className="h-10 w-full rounded-lg border border-line bg-field pl-9 pr-3 text-sm text-ink" /></label>
          <SelectField label="Status aktif" className="sm:gap-1" value={active} onChange={(event) => { setActive(event.target.value); setPage(1); }} options={[["", "Semua iklan"], ["true", "Aktif"], ["false", "Nonaktif"]]} />
          <PrimaryButton type="submit"><Search size={16} /> Cari</PrimaryButton>
        </form>
      </Panel>

      {error ? <ErrorState message={error} onRetry={load} /> : loading ? <SkeletonTable rows={6} cols={5} /> : ads.length === 0 ? (
        <EmptyState title="Iklan tidak ditemukan" message="Tidak ada iklan pada filter ini yang terlihat oleh token admin saat ini." />
      ) : (
        <Panel className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4"><div><h3 className="font-extrabold text-ink">Daftar Kampanye Iklan</h3><p className="mt-1 text-xs text-muted">Halaman {page} · {PAGE_SIZE} item per permintaan</p></div></div>
          <DataTable headers={["Iklan", "Periode", "Status", "Impresi", "Klik", "Target"]} minWidth={820}>
            {ads.map((ad) => <tr key={ad.id} className="hover:bg-track/60">
              <Td><div className="flex min-w-52 items-center gap-3">{ad.image_url ? <img src={ad.image_url} alt="" className="h-10 w-14 shrink-0 rounded-md border border-line object-cover" /> : <span className="grid h-10 w-14 shrink-0 place-items-center rounded-md border border-line bg-track text-muted"><ImageIcon size={17} aria-hidden="true" /></span>}<div className="min-w-0"><p className="truncate font-bold text-ink">{ad.title || "Tanpa judul"}</p><p className="truncate text-xs text-muted">ID {ad.id}</p></div></div></Td>
              <Td><span className="whitespace-nowrap text-sm text-muted">{dateLabel(ad.start_date)} – {dateLabel(ad.end_date)}</span></Td>
              <Td><Badge status={ad.is_active ? "Aktif" : "Nonaktif"} /></Td>
              <Td><span className="tabular-nums text-sm text-ink">{Number(ad.impressions || 0).toLocaleString("id-ID")}</span></Td>
              <Td><span className="tabular-nums text-sm text-ink">{Number(ad.clicks || 0).toLocaleString("id-ID")}</span></Td>
              <Td>{ad.target_url ? <a href={ad.target_url} target="_blank" rel="noreferrer" className="inline-flex min-h-10 max-w-48 items-center gap-1.5 truncate text-sm font-bold text-accent underline-offset-2 hover:underline"><span className="truncate">Buka target</span><ExternalLink size={14} aria-hidden="true" /></a> : <span className="text-sm text-muted">—</span>}</Td>
            </tr>)}
          </DataTable>
          <div className="flex items-center justify-between border-t border-line px-5 py-4"><span aria-live="polite" aria-atomic="true" className="text-xs text-muted">Menampilkan {ads.length} iklan pada halaman {page}</span><div className="flex gap-2"><button type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="min-h-10 rounded-lg border border-line px-3 text-sm font-bold disabled:opacity-40">Sebelumnya</button><button type="button" disabled={!hasMore || loading} onClick={() => setPage((value) => value + 1)} className="min-h-10 rounded-lg border border-line px-3 text-sm font-bold disabled:opacity-40">Berikutnya</button></div></div>
        </Panel>
      )}
    </div>
  );
}
