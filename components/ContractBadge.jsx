"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, FileCheck2, RefreshCw, ShieldCheck, TriangleAlert, X } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui";

/**
 * Versi kontrak API yang diharapkan oleh dashboard ini.
 *
 * Naikkan satu kali setiap kontrak publik berubah (endpoint baru/dihapus,
 * nama field berubah, status code berubah). Backend melaporkan versi yang
 * sedang terdeploy; dashboard membandingkan keduanya sehingga pergeseran
 * kontrak terlihat sebelum klien rusak.
 */
export const EXPECTED_CONTRACT_VERSION = 1;

export function ContractBadge() {
  const toast = useToast();
  const [info, setInfo] = useState(null);
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(
    async (silent = false) => {
      setChecking(true);
      setError("");
      try {
        const res = await api("contract");
        const data = res?.data || res || null;
        setInfo(data);
        if (!silent) {
          const version = Number(data?.version ?? 0);
          if (version === EXPECTED_CONTRACT_VERSION) {
            toast(`Kontrak API v${version} sesuai dengan dashboard ini.`);
          } else {
            toast(
              `Kontrak API berbeda: backend v${version}, dashboard mengharapkan v${EXPECTED_CONTRACT_VERSION}.`,
              "error"
            );
          }
        }
        return data;
      } catch (err) {
        setError(err.message || "Kontrak API tidak dapat dibaca.");
        if (!silent) toast(err.message || "Kontrak API tidak dapat dibaca.", "error");
        return null;
      } finally {
        setChecking(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    load(true);
  }, [load]);

  const version = Number(info?.version ?? 0);
  const aligned = version > 0 && version === EXPECTED_CONTRACT_VERSION;
  const drifted = version > 0 && version !== EXPECTED_CONTRACT_VERSION;

  const dotClass = aligned
    ? "bg-ok-fg"
    : drifted
    ? "bg-bad-fg"
    : "bg-muted";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Versi kontrak API publik yang sedang terdeploy"
        className="flex h-10 items-center gap-2 rounded-lg border border-line bg-paper px-3 text-xs font-bold text-ink transition hover:border-accent hover:shadow-xs"
      >
        <span className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`} aria-hidden="true" />
        <span className="hidden sm:inline">Kontrak</span>
        <span className="font-mono">v{version || "?"}</span>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-label="Informasi kontrak API"
            className="animate-fade-in absolute right-0 z-40 mt-2 w-80 rounded-xl border border-line bg-paper p-4 shadow-panel"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold uppercase text-accent">Kontrak API</p>
                <p className="mt-0.5 text-sm font-bold text-ink">
                  {info?.label || "Belum dapat dibaca"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Tutup informasi kontrak"
                className="rounded p-1 text-muted transition hover:bg-track hover:text-ink"
              >
                <X size={15} />
              </button>
            </div>

            <dl className="mt-3 space-y-1.5 text-xs text-muted">
              <div className="flex justify-between gap-3">
                <dt>Versi kontrak</dt>
                <dd className="font-mono font-bold text-ink">v{version || "?"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Harapan dashboard</dt>
                <dd className="font-mono font-bold text-ink">
                  v{EXPECTED_CONTRACT_VERSION}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Versi API</dt>
                <dd className="font-mono font-bold text-ink">{info?.api_version || "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Endpoint publik</dt>
                <dd className="font-mono font-bold text-ink">
                  {info?.public_endpoint_count ?? "—"}
                </dd>
              </div>
            </dl>

            {error && (
              <p className="mt-3 rounded-lg border border-bad-fg/30 bg-bad-bg px-3 py-2 text-xs text-bad-fg">
                {error}
              </p>
            )}

            <div className="mt-3 flex items-start gap-2 rounded-lg bg-track px-3 py-2 text-[11px] leading-relaxed text-muted">
              {aligned ? (
                <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-ok-fg" />
              ) : drifted ? (
                <TriangleAlert size={14} className="mt-0.5 shrink-0 text-bad-fg" />
              ) : (
                <ShieldCheck size={14} className="mt-0.5 shrink-0 text-muted" />
              )}
              <span>
                {aligned
                  ? "Kontrak backend sejalan dengan dashboard ini."
                  : drifted
                  ? "Kontrak backend berbeda dari dashboard. Perbarui salah satunya sebelum klien rusak."
                  : "Memeriksa versi kontrak yang terdeploy..."}
              </span>
            </div>

            <button
              type="button"
              onClick={() => load(false)}
              disabled={checking}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-line bg-paper px-3 py-2 text-xs font-bold text-ink transition hover:border-accent disabled:opacity-60"
            >
              <RefreshCw size={13} className={checking ? "animate-spin" : ""} />
              <span>Periksa Kontrak</span>
            </button>

            {Array.isArray(info?.public_endpoints) && info.public_endpoints.length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer text-[11px] font-bold text-muted hover:text-ink">
                  Lihat endpoint publik ({info.public_endpoint_count})
                </summary>
                <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-lg bg-track px-2 py-2 font-mono text-[10px] text-muted">
                  {info.public_endpoints.map((endpoint) => (
                    <li key={`${endpoint.method} ${endpoint.path}`}>
                      <span className="font-bold text-accent">{endpoint.method}</span>{" "}
                      {endpoint.path}
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {Array.isArray(info?.changelog) && info.changelog.length > 0 && (
              <div className="mt-3 border-t border-line pt-3">
                <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase text-muted">
                  <FileCheck2 size={12} /> Riwayat Kontrak
                </p>
                <ul className="mt-1.5 space-y-1 text-[11px] text-muted">
                  {info.changelog.map((entry) => (
                    <li key={entry.version}>
                      <span className="font-mono font-bold text-ink">v{entry.version}</span>{" "}
                      {entry.summary}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
