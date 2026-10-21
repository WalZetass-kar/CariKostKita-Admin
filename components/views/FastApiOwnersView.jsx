"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import { api } from "@/lib/api";
import { Avatar, Badge, DataTable, EmptyState, ErrorState, Panel, PanelTitle, PrimaryButton, SelectField, SkeletonTable, Td } from "../ui";

const PAGE_SIZE = 25;
const VERIFICATION = [["", "Semua status verifikasi"], ["PENDING", "Menunggu verifikasi"], ["APPROVED", "Disetujui"], ["REVISION_REQUIRED", "Perlu revisi"], ["REJECTED", "Ditolak"]];
const dateLabel = (value) => value ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(value)) : "—";

export function FastApiOwnersView() {
  const [owners, setOwners] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [verification, setVerification] = useState("");
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

  useEffect(() => { load(); }, [load]);
  const search = (event) => { event.preventDefault(); setPage(1); setQuery(queryInput.trim().slice(0, 100)); };

  return (
    <div className="grid gap-5">
      <Panel>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div><PanelTitle eyebrow="Mitra" title="Direktori Pemilik Kost" /><p className="max-w-3xl text-sm leading-6 text-muted">Kelola dan pantau seluruh akun pemilik kost yang terdaftar di platform CariKostKita.</p></div>
          <PrimaryButton onClick={load} disabled={loading} className="w-full md:w-auto justify-center"><RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Perbarui</PrimaryButton>
        </div>
        <form onSubmit={search} className="mt-4 grid gap-2.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(210px,1fr)_220px_170px_auto] items-end">
          <label className="relative block"><span className="sr-only">Cari nama pemilik</span><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" /><input value={queryInput} maxLength={100} onChange={(event) => setQueryInput(event.target.value)} placeholder="Cari nama pemilik…" className="h-10 w-full rounded-lg border border-line bg-field pl-9 pr-3 text-sm text-ink" /></label>
          <SelectField label="Verifikasi" className="sm:gap-1" value={verification} onChange={(event) => { setVerification(event.target.value); setPage(1); }} options={VERIFICATION} />
          <SelectField label="Status akun" className="sm:gap-1" value={active} onChange={(event) => { setActive(event.target.value); setPage(1); }} options={[["", "Semua akun"], ["true", "Aktif"], ["false", "Nonaktif"]]} />
          <PrimaryButton type="submit" className="h-10 sm:w-auto w-full justify-center"><Search size={16} /> <span>Cari</span></PrimaryButton>
        </form>
      </Panel>

      {error ? <ErrorState message={error} onRetry={load} /> : loading ? <SkeletonTable rows={6} cols={5} /> : owners.length === 0 ? (
        <EmptyState title="Pemilik tidak ditemukan" message="Tidak ada profil pemilik pada filter ini yang terlihat oleh token admin saat ini." />
      ) : (
        <Panel className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4"><div><h3 className="font-extrabold text-ink">Profil Pemilik</h3><p className="mt-1 text-xs text-muted">Halaman {page} · {PAGE_SIZE} akun per permintaan</p></div></div>
          <DataTable headers={["Pemilik & Kontak", "Verifikasi", "Status akun", "Terdaftar"]}>
            {owners.map((owner) => <tr key={owner.id} className="hover:bg-track/60">
              <Td>
                <div className="flex items-center gap-3">
                  <Avatar name={owner.name || owner.email} src={owner.avatar_url} size={36} />
                  <div className="min-w-0">
                    <p className="truncate font-bold text-ink">{owner.name || "Tanpa nama"}</p>
                    <p className="truncate text-xs text-muted">{owner.email || "—"}{owner.no_hp ? ` · ${owner.no_hp}` : ""}</p>
                    <p className="truncate text-[11px] text-muted font-mono">ID {owner.id}</p>
                  </div>
                </div>
              </Td>
              <Td><Badge status={owner.verification_status || "—"} tone={owner.verification_status === "APPROVED" ? "ok" : owner.verification_status === "REJECTED" ? "bad" : "warn"} size="sm" />{owner.catatan_revisi && <p className="mt-1 max-w-44 truncate text-xs text-muted" title={owner.catatan_revisi}>{owner.catatan_revisi}</p>}</Td>
              <Td><Badge status={owner.is_active === true ? "Aktif" : "Nonaktif"} size="sm" /></Td>
              <Td><span className="whitespace-nowrap text-xs text-muted">{dateLabel(owner.created_at)}</span></Td>
            </tr>)}
          </DataTable>
          <div className="flex items-center justify-between border-t border-line px-5 py-4"><span aria-live="polite" aria-atomic="true" className="text-xs text-muted">Menampilkan {owners.length} pemilik pada halaman {page}</span><div className="flex gap-2"><button type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="min-h-10 rounded-lg border border-line px-3 text-sm font-bold disabled:opacity-40">Sebelumnya</button><button type="button" disabled={!hasMore || loading} onClick={() => setPage((value) => value + 1)} className="min-h-10 rounded-lg border border-line px-3 text-sm font-bold disabled:opacity-40">Berikutnya</button></div></div>
        </Panel>
      )}
    </div>
  );
}
