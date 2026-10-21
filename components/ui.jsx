"use client";

import { createContext, isValidElement, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, CheckCheck, CheckCircle2, ChevronLeft, ChevronRight, Clock, Clock3, Download, ExternalLink, FileSpreadsheet, FileText, Inbox, Loader2, RefreshCw, RotateCcw, Search, SlidersHorizontal, X, XCircle, Image as ImageIcon, Upload, Building2, BriefcaseBusiness, Users, Flag, Megaphone, Bell, MapPin } from "lucide-react";
import { exportRows } from "@/lib/exporter";
import { api, readImage } from "@/lib/api";
import { formatDateTime, initials, timeAgo } from "@/lib/format";

/* ---------- Badge ---------- */
const toneMap = {
  ok: "bg-ok-bg text-ok-fg",
  warn: "bg-warn-bg text-warn-fg",
  warning: "bg-warn-bg text-warn-fg",
  bad: "bg-bad-bg text-bad-fg",
  danger: "bg-bad-bg text-bad-fg",
  info: "bg-info-bg text-info-fg",
  brand: "bg-maroon/15 text-maroon dark:bg-maroon/30 dark:text-[#e8a99f]",
  neutral: "bg-track text-ink",
};
const statusTone = {
  Aktif: "ok", Selesai: "ok", Sukses: "ok", Verified: "ok", Terverifikasi: "ok",
  "Menunggu Verifikasi": "warn", Baru: "warn", Diproses: "info", Pending: "warn", Terjadwal: "info",
  Disetujui: "info", Draft: "warn", "Menunggu Review": "warn",
  Ditolak: "bad", Nonaktif: "bad", Rejected: "bad", Gagal: "bad", Diarsipkan: "bad",
};

export function Badge({ status, label, tone, size = "md" }) {
  const t = tone || statusTone[status] || "ok";
  const sizeClasses = size === "sm"
    ? "min-h-5 px-2 text-[10px] leading-none"
    : "min-h-6 sm:min-h-6.5 px-2.5 sm:px-3 text-[11px] sm:text-xs leading-none";
  return <span className={`inline-flex items-center justify-center whitespace-nowrap rounded-full font-extrabold ${sizeClasses} ${toneMap[t]}`}>{label || status}</span>;
}

/* ---------- Tombol ---------- */
const btnBase = "inline-flex items-center justify-center gap-2 rounded-lg font-bold transition hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 disabled:hover:translate-y-0 disabled:hover:shadow-none";

export function Spinner({ size = 16 }) {
  return <Loader2 size={size} className="animate-spin-slow" aria-hidden="true" />;
}

export function IconButton({ children, icon: Icon, label, onClick, disabled, className = "", type = "button", tone = "neutral", size = 16 }) {
  const toneClasses = {
    neutral: "border-line bg-paper text-muted hover:text-ink hover:border-muted",
    info: "border-info-bg bg-paper text-blue hover:bg-info-bg hover:text-blue dark:text-info-fg",
    success: "border-ok-bg bg-paper text-sage hover:bg-ok-bg hover:text-ok-fg dark:text-ok-fg",
    warning: "border-warn-bg bg-paper text-gold hover:bg-warn-bg hover:text-warn-fg dark:text-warn-fg",
    danger: "border-bad-bg bg-paper text-clay hover:bg-bad-bg hover:text-bad-fg dark:text-bad-fg",
    primary: "border-maroon bg-maroon text-[#EEEAD7] hover:bg-maroon/90",
  }[tone] || "border-line bg-paper text-muted hover:text-ink";

  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`${btnBase} h-9 w-9 shrink-0 border ${toneClasses} ${className}`}
    >
      {Icon ? <Icon size={size} aria-hidden="true" /> : children}
    </button>
  );
}

export function PrimaryButton({ children, onClick, type = "button", loading, disabled, className = "" }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled || loading} className={`${btnBase} min-h-10 border border-maroon bg-maroon px-4 font-extrabold text-[#EEEAD7] ${className}`}>
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function GhostButton({ children, onClick, type = "button", loading, disabled, className = "", title }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled || loading} title={title} className={`${btnBase} min-h-10 border border-line bg-paper px-3 text-accent ${className}`}>
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function DangerButton({ children, onClick, type = "button", loading, disabled, className = "" }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled || loading} className={`${btnBase} min-h-10 border border-bad-fg bg-bad-bg px-4 font-extrabold text-bad-fg ${className}`}>
      {loading && <Spinner />}
      {children}
    </button>
  );
}

/* ---------- Layout ---------- */
export function Panel({ children, className = "" }) {
  return <section className={`animate-fade-in rounded-lg border border-line bg-paper p-5 shadow-panel ${className}`}>{children}</section>;
}

export function PanelTitle({ eyebrow, title }) {
  return (
    <div className="mb-3">
      <p className="mb-1 text-xs font-extrabold uppercase text-accent">{eyebrow}</p>
      <h2 className="text-xl font-extrabold leading-tight">{title}</h2>
    </div>
  );
}

export function DataTable({ headers, children, minWidth, className = "" }) {
  return (
    <div className={`w-full overflow-x-auto touch-pan-x [-webkit-overflow-scrolling:touch] ${className}`}>
      <table className="w-full border-collapse" style={minWidth ? { minWidth } : undefined}>
        <thead>
          <tr className="bg-field/40">
            {headers.map((h, idx) => {
              const isConfigObj = typeof h === "object" && h !== null && !isValidElement(h);
              const title = isConfigObj ? h.title : h;
              const align = isConfigObj && h.align ? h.align : "text-left";
              const cls = isConfigObj && h.className ? h.className : "";
              return (
                <th
                  key={idx}
                  className={`border-b border-line px-3.5 py-3 text-xs font-extrabold uppercase tracking-wider text-muted ${align} ${cls}`}
                >
                  {title}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-line/70">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, colSpan, className = "", align }) {
  const alignClass = align ? `text-${align}` : "";
  return <td colSpan={colSpan} className={`border-b border-line px-3.5 py-3 align-middle text-sm ${alignClass} ${className}`}>{children}</td>;
}

export function Avatar({ name, src, size = 44, className = "" }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={name} style={{ width: size, height: size }} className={`shrink-0 rounded-lg object-cover ${className}`} />
  ) : (
    <div style={{ width: size, height: size }} className={`grid shrink-0 place-items-center rounded-lg bg-maroon font-extrabold text-[#EEEAD7] ${className}`}>{initials(name)}</div>
  );
}

/* ---------- Skeleton & Loading States ---------- */
export function Skeleton({ className = "", style }) {
  return <div className={`skeleton ${className}`} style={style} aria-hidden="true" />;
}

export function SkeletonCard({ count = 1 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-fade-in rounded-xl border border-line bg-paper p-3.5 sm:p-4 shadow-panel">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="mt-2.5 h-7 w-20" />
          <Skeleton className="mt-2 h-3 w-32" />
        </div>
      ))}
    </>
  );
}

export function SkeletonTable({ rows = 6, cols = 6 }) {
  return (
    <Panel className="p-0 overflow-hidden">
      <div className="overflow-x-auto p-4">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i} className="border-b border-line px-3 py-3 text-left">
                  <Skeleton className="h-3.5 w-20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r}>
                {Array.from({ length: cols }).map((_, c) => (
                  <td key={c} className="border-b border-line px-3 py-3.5">
                    <Skeleton className="h-4 w-full max-w-[120px]" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between items-center p-4 border-t border-line">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-8 w-44" />
      </div>
    </Panel>
  );
}

export function SkeletonProfile() {
  return (
    <div className="grid gap-5">
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 !rounded-lg shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 rounded-lg border border-line p-4 bg-field">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-36" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonChart({ height = 240 }) {
  return (
    <div className="rounded-lg border border-line bg-paper p-5 space-y-3">
      <Skeleton className="h-3.5 w-24" />
      <Skeleton className="h-5 w-40" />
      <Skeleton className="w-full" style={{ height }} />
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-28" />
      </div>
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        <SkeletonCard count={9} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.85fr)]">
        <div className="rounded-lg border border-line bg-paper p-5 h-64"><Skeleton className="h-full w-full" /></div>
        <div className="rounded-lg border border-line bg-paper p-5 h-64"><Skeleton className="h-full w-full" /></div>
      </div>
      <SkeletonTable rows={5} cols={5} />
    </div>
  );
}

export function LoadingState({ rows = 5, label = "Memuat data..." }) {
  return (
    <div role="status" aria-live="polite" className="grid gap-3 py-2">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="h-11" style={{ opacity: 1 - i * 0.12 }} />)}
    </div>
  );
}

export function EmptyState({ title = "Tidak ada data", message = "Belum ada data yang cocok dengan filter saat ini.", action, onReset }) {
  return (
    <div className="grid place-items-center gap-2 px-4 py-12 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-track text-muted"><Inbox size={26} /></div>
      <strong className="text-lg">{title}</strong>
      <p className="max-w-sm text-sm text-muted">{message}</p>
      {action || (onReset && (
        <GhostButton onClick={onReset} className="mt-2 !border-maroon !text-maroon">
          <RotateCcw size={15} />
          <span>Reset Filter</span>
        </GhostButton>
      ))}
    </div>
  );
}

export function ErrorState({ message = "Terjadi kesalahan saat memuat data.", onRetry }) {
  return (
    <div role="alert" className="grid place-items-center gap-3 px-4 py-12 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-bad-bg text-bad-fg"><AlertTriangle size={26} /></div>
      <strong className="text-lg">Gagal memuat data</strong>
      <p className="max-w-sm text-sm text-muted">{message}</p>
      {onRetry && <GhostButton onClick={onRetry}><RefreshCw size={16} /><span>Coba lagi</span></GhostButton>}
    </div>
  );
}

/* ---------- Toast ---------- */
const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((message, type = "success") => {
    const id = Date.now() + Math.random();
    setItems((list) => [...list.slice(-3), { id, message, type }]);
    setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), type === "error" ? 5000 : 3000);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-5 right-5 z-[80] grid max-w-[calc(100vw-40px)] gap-2">
        {items.map((t) => (
          <div key={t.id} role="status" className={`pointer-events-auto animate-fade-in flex items-start gap-2 rounded-lg border px-4 py-3 font-bold shadow-xl ${t.type === "error" ? "border-bad-fg bg-bad-bg text-bad-fg" : "border-line bg-maroon text-[#EEEAD7]"}`}>
            {t.type === "error" ? <XCircle size={18} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={18} className="mt-0.5 shrink-0" />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/* ---------- Modal ---------- */
export function Modal({ open, onClose, title, children, maxWidth = "max-w-2xl", footer }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-overlay p-3 sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`animate-fade-in relative my-auto flex max-h-[94vh] w-full ${maxWidth} flex-col rounded-lg bg-paper shadow-2xl`}>
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
          <h2 className="text-xl font-extrabold sm:text-2xl">{title}</h2>
          <IconButton label="Tutup" onClick={onClose}><X size={18} /></IconButton>
        </div>
        <div className="overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-4 sm:px-6">{footer}</div>}
      </div>
    </div>
  );
}

/** Dialog konfirmasi. Jika `reasonLabel` diisi, alasan wajib diisi sebelum konfirmasi. */
export function ConfirmDialog({ open, title, message, confirmLabel = "Ya, Lanjutkan", tone = "primary", reasonLabel, reasonMin = 5, summary, confirmDisabled = false, onConfirm, onClose, children }) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setReason("");
      setError("");
      setLoading(false);
    }
  }, [open]);

  const submit = async () => {
    if (confirmDisabled) return;
    if (reasonLabel && reason.trim().length < reasonMin) return setError(`${reasonLabel} wajib diisi (minimal ${reasonMin} karakter).`);
    setLoading(true);
    setError("");
    try {
      await onConfirm(reason.trim());
    } catch (e) {
      setError(e.fields?.reason || e.fields?.note || e.message);
      setLoading(false);
    }
  };

  const Btn = tone === "danger" ? DangerButton : PrimaryButton;
  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onClose}
      title={title}
      maxWidth="max-w-md"
      footer={<><GhostButton onClick={onClose} disabled={loading}>Batal</GhostButton><Btn onClick={submit} loading={loading} disabled={confirmDisabled}>{confirmLabel}</Btn></>}
    >
      <p className="text-muted">{message}</p>
      {summary && (
        <div className="mt-3.5 rounded-lg border border-line bg-field p-3.5 text-sm">
          {summary}
        </div>
      )}
      {children}
      {reasonLabel && (
        <label className="mt-4 grid gap-2 text-sm font-extrabold text-muted">
          {reasonLabel}
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="rounded-lg border border-line bg-field p-3 font-normal text-ink" />
        </label>
      )}
      {error && <p role="alert" className="mt-3 text-sm font-bold text-bad-fg">{error}</p>}
    </Modal>
  );
}

/* ---------- Form ---------- */
export function useForm(initial) {
  const [values, setValues] = useState(initial);
  const set = (name, value) => setValues((v) => ({ ...v, [name]: value }));
  const bind = (name) => ({ name, value: values[name] ?? "", onChange: (e) => set(name, e.target.value) });
  return { values, set, bind, reset: (v) => setValues(v ?? initial), setValues };
}

const inputCls = "h-10 w-full rounded-lg border bg-field px-3 font-normal text-ink";
const borderFor = (error) => (error ? "border-bad-fg" : "border-line");

export function FieldWrap({ label, error, hint, children, className = "" }) {
  return (
    <label className={`grid content-start gap-2 text-sm font-extrabold text-muted ${className}`}>
      <span>{label}</span>
      {children}
      {hint && !error && <span className="text-xs font-normal">{hint}</span>}
      {error && <span role="alert" className="text-xs font-bold text-bad-fg">{error}</span>}
    </label>
  );
}

export function Field({ label, error, hint, className, ...props }) {
  return (
    <FieldWrap label={label} error={error} hint={hint} className={className}>
      <input {...props} aria-invalid={Boolean(error)} className={`${inputCls} ${borderFor(error)}`} />
    </FieldWrap>
  );
}

export function TextArea({ label, error, hint, className, rows = 3, ...props }) {
  return (
    <FieldWrap label={label} error={error} hint={hint} className={className}>
      <textarea rows={rows} {...props} aria-invalid={Boolean(error)} className={`w-full rounded-lg border bg-field p-3 font-normal text-ink ${borderFor(error)}`} />
    </FieldWrap>
  );
}

export function SelectField({ label, error, hint, className, options, placeholder, ...props }) {
  return (
    <FieldWrap label={label} error={error} hint={hint} className={className}>
      <select {...props} aria-invalid={Boolean(error)} className={`${inputCls} ${borderFor(error)}`}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o} value={o}>{o}</option>))}
      </select>
    </FieldWrap>
  );
}

export function ImageField({ label, value, onChange, error, hint, className, round }) {
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState("");
  const input = useRef(null);
  const pick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setLocalError("");
    try {
      onChange(await readImage(file));
    } catch (err) {
      setLocalError(err.message);
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };
  return (
    <div className={`grid content-start gap-2 text-sm font-extrabold text-muted ${className || ""}`}>
      <span>{label}</span>
      <div className={`flex items-center gap-3 rounded-lg border bg-field p-3 ${borderFor(error || localError)}`}>
        <div className={`grid h-16 w-24 shrink-0 place-items-center overflow-hidden border border-line bg-track text-muted ${round ? "!w-16 rounded-full" : "rounded-lg"}`}>
          {value ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={value} alt="Pratinjau" className="h-full w-full object-cover" /> : <ImageIcon size={22} />}
        </div>
        <div className="flex flex-wrap gap-2">
          <GhostButton onClick={() => input.current?.click()} loading={busy}><Upload size={16} /><span>{value ? "Ganti" : "Unggah"}</span></GhostButton>
          {value && <GhostButton onClick={() => onChange("")}><X size={16} /><span>Hapus</span></GhostButton>}
        </div>
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={pick} className="hidden" />
      </div>
      {hint && !error && !localError && <span className="text-xs font-normal">{hint}</span>}
      {(error || localError) && <span role="alert" className="text-xs font-bold text-bad-fg">{error || localError}</span>}
    </div>
  );
}

export function Toggle({ checked, onChange, label, description, disabled }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line py-3 last:border-b-0">
      <div>
        <strong className="block">{label}</strong>
        {description && <span className="text-sm text-muted">{description}</span>}
      </div>
      <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)} className={`relative h-7 w-12 shrink-0 rounded-full border transition ${checked ? "border-maroon bg-maroon" : "border-line bg-track"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-[#EEEAD7] shadow transition-all ${checked ? "left-6" : "left-0.5"}`} />
      </button>
    </div>
  );
}

/* ---------- Search, filter, pagination ---------- */
export function SearchBox({ value, onChange, placeholder = "Cari...", className = "" }) {
  return (
    <label className={`flex h-10 items-center gap-2 rounded-lg border border-line bg-paper px-3 text-muted ${className}`}>
      <Search size={17} />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="w-full bg-transparent text-ink outline-none" />
      {value && <button type="button" aria-label="Hapus pencarian" onClick={() => onChange("")}><X size={15} /></button>}
    </label>
  );
}

export function FilterTabs({ options, value, onChange, counts }) {
  return (
    <div className="flex overflow-x-auto rounded-lg border border-line bg-paper touch-pan-x [-webkit-overflow-scrolling:touch] max-w-full scrollbar-none">
      {options.map((o) => (
        <button key={o} type="button" onClick={() => onChange(o)} className={`min-h-10 whitespace-nowrap border-r border-line px-3.5 sm:px-4 text-xs sm:text-sm font-extrabold last:border-r-0 shrink-0 transition ${value === o ? "bg-maroon text-[#EEEAD7]" : "text-muted hover:bg-track"}`}>
          {o}{counts && counts[o] !== undefined ? ` (${counts[o]})` : ""}
        </button>
      ))}
    </div>
  );
}

export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = "Cari data...",
  children,
  extraFilters,
  extraCount = 0,
  hasActiveFilters = false,
  onReset,
  actions,
  className = "",
}) {
  const [extraOpen, setExtraOpen] = useState(false);

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {onSearchChange && (
            <SearchBox
              value={search ?? ""}
              onChange={onSearchChange}
              placeholder={searchPlaceholder}
              className="w-full sm:w-64"
            />
          )}

          {children}

          {extraFilters && (
            <button
              type="button"
              onClick={() => setExtraOpen((o) => !o)}
              title="Filter tambahan (rentang tanggal & kriteria)"
              className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-bold transition hover:shadow ${
                extraOpen || extraCount > 0
                  ? "border-maroon bg-maroon/10 text-maroon font-extrabold"
                  : "border-line bg-paper text-accent"
              }`}
            >
              <SlidersHorizontal size={15} />
              <span>Filter</span>
              {extraCount > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-maroon px-1 text-[11px] font-extrabold text-[#EEEAD7]">
                  {extraCount}
                </span>
              )}
            </button>
          )}

          {hasActiveFilters && onReset && (
            <button
              type="button"
              onClick={onReset}
              title="Kembalikan semua filter ke semula"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-dashed border-bad-fg/50 bg-bad-bg/40 px-3 text-xs font-extrabold text-bad-fg transition hover:bg-bad-bg"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          )}
        </div>

        {actions && (
          <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>

      {extraFilters && extraOpen && (
        <div className="animate-fade-in flex flex-wrap items-center gap-3 rounded-lg border border-line bg-field p-3.5 shadow-inner">
          <span className="text-xs font-extrabold uppercase text-muted">Filter Lanjutan:</span>
          {extraFilters}
          <button
            type="button"
            onClick={() => setExtraOpen(false)}
            className="ml-auto text-xs font-bold text-muted hover:text-ink underline"
          >
            Tutup
          </button>
        </div>
      )}
    </div>
  );
}

export const selectCls = "h-10 rounded-lg border border-line bg-paper px-3 text-ink";

export function usePagination(items = [], initialPageSize = 10) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  useEffect(() => { if (page > pages) setPage(pages); }, [page, pages]);
  const slice = useMemo(() => items.slice((page - 1) * pageSize, page * pageSize), [items, page, pageSize]);
  const start = items.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, items.length);
  return {
    page,
    pages,
    pageSize,
    setPage,
    setPageSize: (size) => { setPageSize(Number(size)); setPage(1); },
    slice,
    total: items.length,
    start,
    end,
    reset: () => setPage(1),
  };
}

export function Pagination({ pager }) {
  if (!pager || pager.total === 0) return null;
  const getPageNumbers = () => {
    const total = pager.pages;
    const current = pager.page;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 4) return [1, 2, 3, 4, 5, "...", total];
    if (current >= total - 3) return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
    return [1, "...", current - 1, current, current + 1, "...", total];
  };

  return (
    <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-muted border-t border-line pt-3">
      <div className="flex items-center gap-3">
        <span>Menampilkan <strong className="text-ink">{pager.start}–{pager.end}</strong> dari <strong className="text-ink">{pager.total}</strong> data</span>
        <select
          value={pager.pageSize}
          onChange={(e) => pager.setPageSize(e.target.value)}
          aria-label="Jumlah per halaman"
          className="h-8 rounded-lg border border-line bg-paper px-2 text-xs font-bold text-ink"
        >
          {[10, 25, 50, 100].map((sz) => (
            <option key={sz} value={sz}>{sz} / halaman</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-1">
        <GhostButton onClick={() => pager.setPage(pager.page - 1)} disabled={pager.page <= 1} title="Halaman sebelumnya" className="!h-8 !px-2 text-xs">
          <ChevronLeft size={15} />
        </GhostButton>

        {getPageNumbers().map((num, i) => (
          num === "..." ? (
            <span key={`dots-${i}`} className="px-2 text-xs text-muted select-none">...</span>
          ) : (
            <button
              key={num}
              type="button"
              onClick={() => pager.setPage(num)}
              className={`min-w-8 h-8 rounded-lg px-2 text-xs font-bold transition ${
                pager.page === num
                  ? "border border-maroon bg-maroon text-[#EEEAD7]"
                  : "text-ink hover:bg-track"
              }`}
            >
              {num}
            </button>
          )
        ))}

        <GhostButton onClick={() => pager.setPage(pager.page + 1)} disabled={pager.page >= pager.pages} title="Halaman berikutnya" className="!h-8 !px-2 text-xs">
          <ChevronRight size={15} />
        </GhostButton>
      </div>
    </div>
  );
}

/* ---------- Export ---------- */
export function ExportMenu({ name, title, columns, rows = [], allRows, pageRows, filters }) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState("filter"); // "filter" | "all" | "page"
  const [busy, setBusy] = useState("");
  const toast = useToast();
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const targetRows = useMemo(() => {
    if (scope === "all" && allRows) return allRows;
    if (scope === "page" && pageRows) return pageRows;
    return rows;
  }, [scope, rows, allRows, pageRows]);

  const activeFilters = useMemo(() => {
    if (scope === "all") return ["Cakupan: Semua Data"];
    if (scope === "page") return [...(filters || []), "Cakupan: Data Halaman Ini"];
    return filters;
  }, [scope, filters]);

  const run = async (format) => {
    setBusy(format);
    try {
      const file = await exportRows({ format, name, title, columns, rows: targetRows, filters: activeFilters });
      toast(`Export berhasil: ${file}`);
      setOpen(false);
    } catch (e) {
      toast(e.message || "Export gagal.", "error");
    } finally {
      setBusy("");
    }
  };

  return (
    <div ref={ref} className="relative">
      <GhostButton onClick={() => setOpen(!open)}><Download size={16} /><span>Export</span></GhostButton>
      {open && (
        <div className="animate-fade-in absolute right-0 z-30 mt-2 grid w-64 gap-2 rounded-lg border border-line bg-paper p-3 shadow-panel">
          <p className="text-xs font-extrabold uppercase text-accent">Pilih Cakupan Export</p>
          <div className="grid gap-1.5 text-xs font-semibold text-ink">
            <label className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-track">
              <input type="radio" name="export-scope" checked={scope === "filter"} onChange={() => setScope("filter")} className="accent-maroon" />
              <span>Data Sesuai Filter ({rows?.length || 0})</span>
            </label>
            {allRows && (
              <label className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-track">
                <input type="radio" name="export-scope" checked={scope === "all"} onChange={() => setScope("all")} className="accent-maroon" />
                <span>Semua Data ({allRows.length})</span>
              </label>
            )}
            {pageRows && (
              <label className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-track">
                <input type="radio" name="export-scope" checked={scope === "page"} onChange={() => setScope("page")} className="accent-maroon" />
                <span>Data Halaman Ini ({pageRows.length})</span>
              </label>
            )}
          </div>

          <div className="rounded border border-line bg-field px-2.5 py-1.5 text-[11px] font-bold text-muted">
            <span className="text-maroon font-extrabold">{targetRows.length} data</span> akan diekspor.
          </div>

          <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-line">
            <button
              type="button"
              disabled={Boolean(busy) || targetRows.length === 0}
              onClick={() => run("xlsx")}
              className="flex items-center justify-center gap-1 rounded-lg border border-line bg-paper py-2 text-xs font-bold text-ink hover:bg-track disabled:opacity-50"
            >
              {busy === "xlsx" ? <Spinner size={14} /> : <FileSpreadsheet size={14} className="text-sage" />}Excel
            </button>
            <button
              type="button"
              disabled={Boolean(busy) || targetRows.length === 0}
              onClick={() => run("csv")}
              className="flex items-center justify-center gap-1 rounded-lg border border-line bg-paper py-2 text-xs font-bold text-ink hover:bg-track disabled:opacity-50"
            >
              {busy === "csv" ? <Spinner size={14} /> : <FileText size={14} className="text-blue" />}CSV
            </button>
            <button
              type="button"
              disabled={Boolean(busy) || targetRows.length === 0}
              onClick={() => run("pdf")}
              className="flex items-center justify-center gap-1 rounded-lg border border-line bg-paper py-2 text-xs font-bold text-ink hover:bg-track disabled:opacity-50"
            >
              {busy === "pdf" ? <Spinner size={14} /> : <FileText size={14} className="text-clay" />}PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function DetailGrid({ items }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map(([label, value, wide]) => (
        <div key={label} className={wide ? "sm:col-span-2" : ""}>
          <dt className="text-xs font-extrabold uppercase text-muted">{label}</dt>
          <dd className="mt-0.5 break-words text-sm font-semibold text-ink">{value || "-"}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ---------- Activity Timeline ---------- */
export function ActivityTimeline({ events = [] }) {
  if (!events || !events.length) {
    return (
      <div className="rounded-lg border border-line bg-field p-4 text-center text-xs text-muted">
        Belum ada riwayat aktivitas yang tercatat.
      </div>
    );
  }

  return (
    <div className="relative border-l-2 border-line/80 ml-3 pl-4 space-y-4 my-2">
      {events.map((e, idx) => (
        <div key={e.id || idx} className="relative">
          <div className="absolute -left-[23px] top-1 grid h-4 w-4 place-items-center rounded-full bg-paper border-2 border-maroon">
            <div className="h-1.5 w-1.5 rounded-full bg-maroon" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-extrabold text-ink">{e.action}</span>
              {e.status && <Badge status={e.status} label={e.status} tone={e.status === "Sukses" ? "ok" : "bad"} />}
            </div>
            <p className="mt-0.5 text-[11px] text-muted">
              {formatDateTime(e.time)} {e.actor ? `oleh ${e.actor}` : ""}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Bulk Action Bar ---------- */
export function BulkActionBar({ selectedCount, onClear, children }) {
  if (!selectedCount) return null;
  return (
    <div className="animate-fade-in flex flex-wrap items-center justify-between gap-3 rounded-lg border border-maroon/30 bg-maroon/5 p-3 shadow-panel">
      <div className="flex items-center gap-2">
        <span className="grid h-6 min-w-6 place-items-center rounded-full bg-maroon px-1.5 text-xs font-extrabold text-[#EEEAD7]">
          {selectedCount}
        </span>
        <span className="text-xs font-bold text-ink">data terpilih</span>
        <button
          type="button"
          onClick={onClear}
          className="text-xs font-bold text-muted hover:text-ink underline ml-1"
        >
          Batalkan pilihan
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {children}
      </div>
    </div>
  );
}

/* ---------- Global Search Modal ---------- */
export function GlobalSearchModal({ open, onClose, onSelect, data }) {
  const [query, setQuery] = useState("");
  const [remoteResults, setRemoteResults] = useState(null);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteError, setRemoteError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    const keyword = query.trim();
    let cancelled = false;
    if (!open || !keyword) {
      setRemoteResults(null);
      setRemoteLoading(false);
      setRemoteError("");
      return () => { cancelled = true; };
    }
    setRemoteResults(null);
    setRemoteLoading(true);
    setRemoteError("");
    const timer = setTimeout(async () => {
      try {
        const result = await api(`global-search?q=${encodeURIComponent(keyword.slice(0, 100))}`);
        if (!cancelled) setRemoteResults(result.results || []);
      } catch (error) {
        if (!cancelled) {
          const fallback = data
            ? "Hasil lokal legacy ditampilkan."
            : "Data legacy belum dimuat; buka halaman Dashboard lama untuk memuatnya.";
          setRemoteError(`${error.message || "Pencarian FastAPI tidak tersedia."} ${fallback}`);
        }
      } finally {
        if (!cancelled) setRemoteLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, query, data]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    if (remoteResults !== null) {
      const icons = { Kost: Building2, Pemilik: BriefcaseBusiness, Pengguna: Users, Laporan: Flag };
      return remoteResults.map((result) => ({ ...result, icon: icons[result.category] || Search }));
    }
    if (!data) return [];
    const list = [];
    (data.kosts || []).forEach((k) => {
      if (k.name.toLowerCase().includes(q) || k.area.toLowerCase().includes(q) || k.address.toLowerCase().includes(q)) {
        list.push({ id: k.id, category: "Kost", icon: Building2, title: k.name, subtitle: `${k.area} · Status: ${k.status}`, targetView: "kost", item: k });
      }
    });
    (data.owners || []).forEach((o) => {
      if (o.name.toLowerCase().includes(q) || o.email.toLowerCase().includes(q) || o.phone.toLowerCase().includes(q)) {
        list.push({ id: o.id, category: "Pemilik", icon: BriefcaseBusiness, title: o.name, subtitle: `${o.email} · Status: ${o.verificationStatus}`, targetView: "owners", item: o });
      }
    });
    (data.users || []).forEach((u) => {
      if (u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.phone && u.phone.includes(q))) {
        list.push({ id: u.id, category: "Pengguna", icon: Users, title: u.name, subtitle: `${u.email} · Status: ${u.status}`, targetView: "users", item: u });
      }
    });
    (data.reports || []).forEach((r) => {
      if (r.id.toLowerCase().includes(q) || r.kostName.toLowerCase().includes(q) || r.type.toLowerCase().includes(q)) {
        list.push({ id: r.id, category: "Laporan", icon: Flag, title: `${r.id} - ${r.type}`, subtitle: `Kost: ${r.kostName} · Status: ${r.status}`, targetView: "reports", item: r });
      }
    });
    return list.slice(0, 15);
  }, [query, data, remoteResults]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-start sm:place-items-center bg-overlay p-4 pt-16 sm:pt-4" onClick={onClose} role="dialog" aria-modal="true">
      <div className="w-full max-w-xl rounded-xl border border-line bg-paper shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <Search size={18} className="text-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ketik untuk mencari kost, pemilik, pengguna, laporan..."
            className="w-full bg-transparent text-sm font-semibold text-ink placeholder:text-muted outline-none"
          />
          <button type="button" onClick={onClose} aria-label="Tutup pencarian" className="rounded p-1 text-muted hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {query.trim() === "" ? (
            <div className="p-6 text-center text-xs text-muted">
              Ketik kata kunci untuk mencari di seluruh platform CariKostKita.
            </div>
          ) : remoteLoading ? (
            <div className="p-6 text-center text-xs text-muted">Mencari pada data yang terlihat oleh akun Anda…</div>
          ) : results.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted">
              Tidak ditemukan data yang cocok dengan "{query}".
            </div>
          ) : (
            <div className="grid gap-1">
              {results.map((r) => {
                const Icon = r.icon;
                return (
                  <button
                    key={`${r.category}-${r.id}`}
                    type="button"
                    onClick={() => { onSelect(r); onClose(); }}
                    className="flex w-full items-center gap-3 rounded-lg p-2.5 text-left transition hover:bg-track"
                  >
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-maroon/10 text-maroon">
                      <Icon size={17} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <strong className="truncate text-sm text-ink">{r.title}</strong>
                        <span className="rounded bg-field px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-muted">
                          {r.category}
                        </span>
                      </div>
                      <p className="truncate text-xs text-muted mt-0.5">{r.subtitle}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          {remoteError && <p role="status" className="border-t border-line px-3 py-2 text-xs text-warn-fg">{remoteError}</p>}
        </div>
      </div>
    </div>
  );
}

/* ---------- Notification Center Dropdown ---------- */
export function NotificationCenterDropdown({ notifications = [], onSelect, onMarkRead, onMarkAllRead, onClose }) {
  const [filter, setFilter] = useState("all"); // "all" | "unread"
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => !ref.current?.contains(e.target) && onClose();
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [onClose]);

  const filtered = useMemo(() => {
    if (filter === "unread") return notifications.filter((n) => !n.read);
    return notifications;
  }, [notifications, filter]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div ref={ref} className="animate-fade-in absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-32px)] rounded-xl border border-line bg-paper shadow-panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
        <div>
          <strong className="text-xs font-extrabold uppercase text-accent">Pusat Notifikasi</strong>
          {unreadCount > 0 && <span className="ml-1.5 text-xs text-muted">({unreadCount} baru)</span>}
        </div>
        {unreadCount > 0 && onMarkAllRead && (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="flex items-center gap-1 text-[11px] font-bold text-accent hover:underline"
          >
            <CheckCheck size={13} />
            <span>Tandai Dibaca</span>
          </button>
        )}
      </div>

      <div className="flex border-b border-line bg-field/50 p-1">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`flex-1 rounded py-1 text-center text-xs font-bold transition ${filter === "all" ? "bg-paper text-ink shadow-sm" : "text-muted hover:text-ink"}`}
        >
          Semua ({notifications.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter("unread")}
          className={`flex-1 rounded py-1 text-center text-xs font-bold transition ${filter === "unread" ? "bg-paper text-ink shadow-sm" : "text-muted hover:text-ink"}`}
        >
          Belum Dibaca ({unreadCount})
        </button>
      </div>

      <div className="max-h-80 overflow-y-auto divide-y divide-line/60">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted">
            <Clock3 size={20} className="mx-auto mb-1.5 opacity-50" />
            Tidak ada notifikasi {filter === "unread" ? "yang belum dibaca" : ""}.
          </div>
        ) : (
          filtered.map((n) => {
            const Icon = n.type === "owner" ? BriefcaseBusiness : n.type === "kost" ? Building2 : n.type === "report" ? Flag : Megaphone;
            return (
              <div
                key={n.id}
                className={`flex items-start gap-2.5 p-3 text-left transition hover:bg-track ${!n.read ? "bg-maroon/[0.03]" : ""}`}
              >
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-maroon/10 text-maroon mt-0.5">
                  <Icon size={16} />
                </div>
                <div className="min-w-0 flex-1 cursor-pointer" onClick={() => onSelect(n)}>
                  <div className="flex items-center justify-between gap-1">
                    <strong className="truncate text-xs font-bold text-ink">{n.title}</strong>
                    {!n.read && <span className="h-2 w-2 rounded-full bg-maroon shrink-0" />}
                  </div>
                  <p className="mt-0.5 text-xs text-muted line-clamp-2">{n.message}</p>
                  <span className="mt-1 block text-[10px] text-muted">{timeAgo(n.time)}</span>
                </div>
                {!n.read && onMarkRead && (
                  <button
                    type="button"
                    title="Tandai sudah dibaca"
                    onClick={(e) => { e.stopPropagation(); onMarkRead(n.id); }}
                    className="p-1 rounded text-muted hover:text-ink"
                  >
                    <Check size={14} />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export function SkeletonDetail() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-44 w-full rounded-lg bg-track" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="h-10 rounded-lg bg-track" />
        <div className="h-10 rounded-lg bg-track" />
        <div className="h-10 rounded-lg bg-track" />
        <div className="h-10 rounded-lg bg-track" />
      </div>
    </div>
  );
}
