"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Clock3, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { EmptyState, ErrorState, Panel, PanelTitle, PrimaryButton, SkeletonTable } from "../ui";

const PAGE_SIZE = 100;

export function FastApiActivityLogsView() {
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [visibleCount, setVisibleCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const activeRequest = ++requestId.current;
    setLoading(true);
    setError("");
    try {
      const result = await api(`fastapi-activity-logs?page=${page}&page_size=${PAGE_SIZE}`);
      if (!Array.isArray(result.data) || typeof result.pagination?.has_more !== "boolean") {
        throw new Error("Respons paginasi audit log tidak valid.");
      }
      if (result.pagination.has_more && result.data.length === 0) {
        throw new Error("API menandai audit log berlanjut tetapi halaman ini kosong.");
      }
      if (activeRequest === requestId.current) {
        setLogs(result.data);
        setHasMore(result.pagination.has_more);
        setVisibleCount(Number.isInteger(result.pagination.count) ? result.pagination.count : null);
      }
    } catch (err) {
      if (activeRequest === requestId.current) setError(err.message || "Audit log FastAPI tidak dapat dimuat.");
    } finally {
      if (activeRequest === requestId.current) setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
    return () => { requestId.current += 1; };
  }, [load]);

  return (
    <div className="grid gap-4">
      <Panel>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <PanelTitle eyebrow="Keamanan · FastAPI · RLS" title="Audit log aktivitas" />
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Identitas aktor memakai ID profil terverifikasi. Log ditampilkan sesuai akses RLS akun ini; data legacy tetap terpisah.
            </p>
          </div>
          <PrimaryButton onClick={load} disabled={loading}>
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Perbarui
          </PrimaryButton>
        </div>
      </Panel>

      {error ? <ErrorState message={error} onRetry={load} /> : loading ? <SkeletonTable rows={5} cols={3} /> : logs.length === 0 ? (
        <>
          <EmptyState title="Belum ada log FastAPI" message="Tidak ada catatan aktivitas yang terlihat melalui RLS untuk akun ini." />
          {page > 1 && <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="min-h-10 justify-self-start rounded-lg border border-line px-3 text-sm text-ink">
            Kembali ke halaman sebelumnya
          </button>}
        </>
      ) : (
        <Panel>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <PanelTitle eyebrow="Catatan terbaru" title="Aktivitas server" />
              {visibleCount !== null && <p className="mt-1 text-xs text-muted">{visibleCount} log terlihat melalui akses akun ini.</p>}
            </div>
          </div>
          <div className="grid gap-3">
            {logs.map((log) => (
              <article key={log.id} className="grid grid-cols-[40px_minmax(0,1fr)] gap-3 border-b border-line pb-3 last:border-b-0">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-maroon text-[#EEEAD7]" aria-hidden="true">
                  <Clock3 size={17} />
                </div>
                <div className="min-w-0">
                  <strong className="break-words">{log.action_type}</strong>
                  <p className="mt-1 break-words text-sm text-ink">{log.description}</p>
                  <p className="mt-1 break-words text-xs text-muted">
                    Akun #{log.user_id}
                    {log.target_type ? ` · ${log.target_type}` : ""}
                    {log.target_id ? ` #${log.target_id}` : ""}
                    {log.created_at ? ` · ${formatDateTime(log.created_at)}` : ""}
                  </p>
                </div>
              </article>
            ))}
          </div>
          <nav className="mt-4 flex items-center justify-between gap-3" aria-label="Halaman audit log">
            <span className="text-sm text-muted" aria-live="polite">Halaman {page} · {logs.length} log</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={loading || page === 1}
                className="min-h-10 rounded-lg border border-line px-3 text-sm text-ink disabled:cursor-not-allowed disabled:opacity-50">
                Sebelumnya
              </button>
              <button type="button" onClick={() => setPage((current) => current + 1)} disabled={loading || !hasMore}
                className="min-h-10 rounded-lg border border-line px-3 text-sm text-ink disabled:cursor-not-allowed disabled:opacity-50">
                Berikutnya
              </button>
            </div>
          </nav>
        </Panel>
      )}
    </div>
  );
}
