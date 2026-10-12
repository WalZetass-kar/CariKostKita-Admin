"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, MapPin, RefreshCw, Search } from "lucide-react";
import { api } from "@/lib/api";
import { Badge, DataTable, EmptyState, ErrorState, Panel, PanelTitle, PrimaryButton, SelectField, SkeletonTable, Td } from "../ui";

const PAGE_SIZE = 25;
const STATUSES = [["", "Semua status verifikasi"], ["PENDING", "Menunggu verifikasi"], ["APPROVED", "Disetujui"], ["REVISION_REQUIRED", "Perlu revisi"], ["REJECTED", "Ditolak"]];
const dateLabel = (value) => value ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(value)) : "—";

export function FastApiKostsView() {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [status, setStatus] = useState("");
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
      setError(err.message || "Direktori kost FastAPI tidak dapat dimuat.");
      setRows([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [page, query, status]);

  useEffect(() => { load(); }, [load]);
  const search = (event) => { event.preventDefault(); setPage(1); setQuery(queryInput.trim().slice(0, 100)); };

  return (
    <div className="grid gap-5">
      <Panel>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div><PanelTitle eyebrow="FastAPI · Supabase · Read-only" title="Direktori kost" /><p className="max-w-3xl text-sm leading-6 text-muted">Data menggunakan proyeksi schema kosts yang sudah diverifikasi dan role admin dari token. Ini adalah halaman baca saja; moderasi kost legacy tetap tersedia terpisah sampai mutasi FastAPI siap.</p></div>
          <PrimaryButton onClick={load} disabled={loading}><RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Perbarui</PrimaryButton>
        </div>
        <form onSubmit={search} className="mt-4 grid gap-3 sm:grid-cols-[minmax(220px,1fr)_240px_auto]">
          <label className="relative block"><span className="sr-only">Cari nama kost</span><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" /><input value={queryInput} maxLength={100} onChange={(event) => setQueryInput(event.target.value)} placeholder="Cari nama kost…" className="h-10 w-full rounded-lg border border-line bg-field pl-9 pr-3 text-sm text-ink" /></label>
          <SelectField label="Status verifikasi" className="sm:gap-1" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} options={STATUSES} />
          <PrimaryButton type="submit"><Search size={16} /> Cari</PrimaryButton>
        </form>
      </Panel>

      {error ? <ErrorState message={error} onRetry={load} /> : loading ? <SkeletonTable rows={6} cols={5} /> : rows.length === 0 ? (
        <EmptyState title="Kost tidak ditemukan" message="Tidak ada listing pada filter ini yang terlihat oleh token admin saat ini." />
      ) : (
        <Panel className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4"><div><h3 className="font-extrabold text-ink">Listing yang terlihat</h3><p className="mt-1 text-xs text-muted">Halaman {page} · {PAGE_SIZE} item per permintaan</p></div><Badge status="JWT + RLS" tone="brand" /></div>
          <DataTable headers={["Nama kost", "Lokasi", "Pemilik ID", "Status listing", "Verifikasi", "Dibuat"]} minWidth={850}>
            {rows.map((kost) => <tr key={kost.id} className="hover:bg-track/60">
              <Td><div className="flex min-w-48 items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-maroon/10 text-maroon"><Building2 size={17} aria-hidden="true" /></span><div className="min-w-0"><p className="truncate font-bold text-ink">{kost.name || "Tanpa nama"}</p><p className="truncate text-xs text-muted">ID {kost.id}</p></div></div></Td>
              <Td><div className="flex min-w-36 items-start gap-1.5 text-sm text-muted"><MapPin size={14} className="mt-0.5 shrink-0" aria-hidden="true" /><span>{[kost.district, kost.city, kost.province].filter(Boolean).join(", ") || kost.address || "Lokasi belum tersedia"}</span></div></Td>
              <Td><span className="text-sm text-ink">{kost.owner_id ?? "—"}</span></Td>
              <Td><Badge status={kost.status || "—"} /></Td>
              <Td><Badge status={kost.verification_status || "—"} tone={kost.verification_status === "APPROVED" ? "ok" : kost.verification_status === "REJECTED" ? "bad" : "warn"} /></Td>
              <Td><span className="whitespace-nowrap text-sm text-muted">{dateLabel(kost.created_at)}</span></Td>
            </tr>)}
          </DataTable>
          <div className="flex items-center justify-between border-t border-line px-5 py-4"><span aria-live="polite" aria-atomic="true" className="text-xs text-muted">Menampilkan {rows.length} listing pada halaman {page}</span><div className="flex gap-2"><button type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="min-h-10 rounded-lg border border-line px-3 text-sm font-bold disabled:opacity-40">Sebelumnya</button><button type="button" disabled={!hasMore || loading} onClick={() => setPage((value) => value + 1)} className="min-h-10 rounded-lg border border-line px-3 text-sm font-bold disabled:opacity-40">Berikutnya</button></div></div>
        </Panel>
      )}
    </div>
  );
}
