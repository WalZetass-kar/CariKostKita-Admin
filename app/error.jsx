"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, LogIn } from "lucide-react";

export default function ErrorBoundary({ error, reset }) {
  useEffect(() => {
    console.error("Admin Runtime Error:", error);
    // Jika galat disebabkan oleh versi chunk lama dari deployment sebelumnya, auto reload sekali
    if (
      error?.name === "ChunkLoadError" ||
      error?.message?.includes("Loading chunk") ||
      error?.message?.includes("is not defined")
    ) {
      const reloaded = sessionStorage.getItem("ckk_err_auto_reload");
      if (!reloaded) {
        sessionStorage.setItem("ckk_err_auto_reload", "true");
        window.location.reload();
      }
    }
  }, [error]);

  const handleHardRefresh = () => {
    sessionStorage.removeItem("ckk_err_auto_reload");
    window.location.href = window.location.pathname;
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream p-4 text-center">
      <div className="w-full max-w-md rounded-2xl border border-line bg-paper p-6 sm:p-8 shadow-panel animate-fade-in">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-500/10 text-amber-600 mb-4">
          <AlertTriangle size={30} />
        </div>
        <h2 className="text-xl font-extrabold text-ink sm:text-2xl">Pembaruan Kode Selesai</h2>
        <p className="mt-2 text-xs sm:text-sm text-muted leading-relaxed">
          Versi terbaru aplikasi telah terpasang. Klik tombol di bawah untuk memuat aset paling baru.
        </p>

        {error?.message && (
          <div className="mt-4 rounded-lg bg-bad-bg/40 p-2.5 text-left text-xs font-mono text-bad-fg break-words max-h-24 overflow-y-auto">
            {error.message}
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row gap-2.5 justify-center">
          <button
            type="button"
            onClick={handleHardRefresh}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-maroon px-5 text-sm font-bold text-[#EEEAD7] shadow-sm hover:opacity-95 active:scale-95 transition"
          >
            <RefreshCw size={16} />
            <span>Muat Ulang Sekarang</span>
          </button>
          <a
            href="/login"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-line bg-paper px-4 text-sm font-bold text-ink hover:bg-track active:scale-95 transition"
          >
            <LogIn size={16} />
            <span>Ke Login</span>
          </a>
        </div>
      </div>
    </div>
  );
}
