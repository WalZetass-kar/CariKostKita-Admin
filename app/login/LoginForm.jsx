"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Lock, LogIn, RefreshCw, ShieldCheck, User } from "lucide-react";
import { Spinner } from "@/components/ui";

export default function LoginForm() {
  return <Inner />;
}

function Inner() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captchaImg, setCaptchaImg] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  const loadCaptcha = useCallback(async () => {
    setCaptchaLoading(true);
    try {
      const res = await fetch("/api/auth/captcha?t=" + Date.now());
      if (res.ok) {
        const data = await res.json();
        setCaptchaImg(data.captchaImage);
        setCaptchaToken(data.captchaToken);
        setCaptchaAnswer("");
      }
    } catch {
      // Captcha load failure
    } finally {
      setCaptchaLoading(false);
    }
  }, []);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("expired")) setNotice("Sesi Anda berakhir. Silakan login kembali.");
    if (p.get("loggedout")) setNotice("Anda telah keluar dari Admin Panel.");
    const t = localStorage.getItem("ckk.theme");
    if (t === "dark") document.documentElement.classList.add("dark");

    loadCaptcha();
  }, [loadCaptcha]);

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!identifier.trim()) next.identifier = "Email atau username wajib diisi.";
    if (!password) next.password = "Password wajib diisi.";
    else if (password.length < 6) next.password = "Password minimal 6 karakter.";
    if (!captchaAnswer.trim()) next.captcha = "Jawab soal keamanan di bawah.";
    setErrors(next);
    setMessage("");
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier,
          password,
          captchaAnswer,
          captchaToken,
          website: honeypot, // Anti-bot honeypot
        }),
        credentials: "same-origin",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrors(json.fields || {});
        setMessage(json.error || json.message || json.detail?.detail || json.detail || "Email atau kata sandi salah. Pastikan akun memiliki akses admin.");
        setLoading(false);
        // Otomatis refresh captcha jika percobaan login gagal
        loadCaptcha();
        return;
      }
      window.location.replace("/"); // replace: halaman login tidak tersisa di history
    } catch {
      setMessage("Tidak dapat terhubung ke server. Periksa koneksi Anda.");
      setLoading(false);
      loadCaptcha();
    }
  };

  const input = (err) =>
    `h-11 w-full rounded-lg border bg-field pl-10 pr-3 text-base sm:text-sm text-ink transition-colors focus:outline-none focus:ring-2 focus:ring-brand/30 ${
      err ? "border-bad-fg" : "border-line"
    }`;

  return (
    <main className="flex min-h-[100dvh] w-full flex-col justify-center items-center bg-cream px-3 py-6 sm:p-6 md:p-8">
      <div className="w-full max-w-md md:max-w-4xl overflow-hidden rounded-2xl border border-line bg-paper shadow-panel grid md:grid-cols-[1fr_1.2fr]">
        <aside className="hidden flex-col justify-between bg-sidebar p-8 text-[#EEEAD7] md:flex">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl border border-[#EEEAD766] bg-[#EEEAD71F] font-extrabold text-lg">
              CK
            </div>
            <div>
              <strong className="text-lg">CariKostKita</strong>
              <span className="block text-xs text-[#EEEAD7B8]">Admin Panel</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
              <ShieldCheck size={14} />
              <span>Multi-Role Access Control</span>
            </div>
            <h2 className="text-3xl font-extrabold leading-tight">
              Kelola platform kost dengan percaya diri & presisi.
            </h2>
            <p className="text-sm text-[#EEEAD7B8] leading-relaxed">
              Verifikasi pemilik, tinjau pendaftaran kost, tindak lanjuti laporan, atur iklan promosi, dan monitor analitik dalam satu dashboard terpadu.
            </p>
          </div>
          <div className="border-t border-[#EEEAD726] pt-4">
            <p className="text-xs text-[#EEEAD799]">
              Dilindungi oleh enkripsi modern, proteksi bot Captcha, dan audit logging otomatis.
            </p>
          </div>
        </aside>

        <form onSubmit={submit} noValidate className="grid content-center gap-4 sm:gap-5 p-4 sm:p-8 md:p-10">
          {/* Mobile-only Brand Header */}
          <div className="flex items-center gap-3 md:hidden pb-2 border-b border-line/60">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-maroon text-[#EEEAD7] font-extrabold text-base shadow-sm shrink-0">
              CK
            </div>
            <div className="min-w-0">
              <strong className="block text-base font-extrabold text-ink leading-tight truncate">CariKostKita</strong>
              <span className="block text-xs text-muted font-medium">Admin Panel</span>
            </div>
          </div>

          {/* Honeypot field for bot trapping */}
          <div style={{ display: "none" }} aria-hidden="true">
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-maroon">Admin Portal</span>
              <span className="text-[11px] font-mono text-muted">v2.0</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-ink mt-1">Masuk ke Akun</h1>
            <p className="mt-1 text-xs sm:text-sm text-muted">Gunakan kredensial akun staf Admin CariKostKita.</p>
          </div>

          {notice && !message && (
            <p role="status" className="flex items-center gap-2 rounded-xl bg-ok-bg p-3 text-xs sm:text-sm font-bold text-ok-fg border border-ok-fg/20">
              <CheckCircle2 size={17} className="shrink-0" />
              <span>{notice}</span>
            </p>
          )}
          {message && (
            <p role="alert" className="flex items-center gap-2 rounded-xl bg-bad-bg p-3 text-xs sm:text-sm font-bold text-bad-fg border border-bad-fg/20">
              <AlertCircle size={17} className="shrink-0" />
              <span>{message}</span>
            </p>
          )}

          <label className="grid gap-1.5 text-xs font-extrabold uppercase tracking-wider text-muted">
            Email / Username
            <span className="relative block">
              <User size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                id="identifier"
                name="identifier"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className={input(errors.identifier)}
                aria-invalid={Boolean(errors.identifier)}
                placeholder="admin@carikostkita.id"
              />
            </span>
            {errors.identifier && <span role="alert" className="text-xs font-bold text-bad-fg">{errors.identifier}</span>}
          </label>

          <label className="grid gap-1.5 text-xs font-extrabold uppercase tracking-wider text-muted">
            Password
            <span className="relative block">
              <Lock size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                id="password"
                name="password"
                type={show ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${input(errors.password)} !pr-11`}
                aria-invalid={Boolean(errors.password)}
                placeholder="Masukkan password"
              />
              <button
                type="button"
                aria-label={show ? "Sembunyikan password" : "Tampilkan password"}
                onClick={() => setShow(!show)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors p-1"
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
            {errors.password && <span role="alert" className="text-xs font-bold text-bad-fg">{errors.password}</span>}
          </label>

          {/* Captcha Security Challenge */}
          <div className="rounded-xl border border-line bg-track/40 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-muted">
                Verifikasi Keamanan
              </span>
              <button
                type="button"
                onClick={loadCaptcha}
                disabled={captchaLoading}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-accent hover:underline disabled:opacity-50"
              >
                <RefreshCw size={12} className={captchaLoading ? "animate-spin" : ""} />
                <span>Ganti Soal</span>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="h-11 w-full sm:w-40 rounded-lg border border-line overflow-hidden bg-white flex items-center justify-center shrink-0">
                {captchaImg ? (
                  <img src={captchaImg} alt="Captcha" className="h-full w-full object-contain p-1" />
                ) : (
                  <span className="text-xs text-muted animate-pulse">Memuat...</span>
                )}
              </div>
              <input
                id="captchaAnswer"
                name="captchaAnswer"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={6}
                value={captchaAnswer}
                onChange={(e) => setCaptchaAnswer(e.target.value)}
                placeholder="Jawaban ="
                className={`h-11 flex-1 min-w-0 rounded-lg border bg-field px-3 text-base sm:text-sm font-bold text-center text-ink transition-colors focus:outline-none focus:ring-2 focus:ring-brand/30 ${
                  errors.captcha ? "border-bad-fg" : "border-line"
                }`}
              />
            </div>
            {errors.captcha && (
              <span role="alert" className="block text-xs font-bold text-bad-fg">
                {errors.captcha}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-maroon bg-maroon px-4 font-extrabold text-[#EEEAD7] transition-all hover:bg-maroon/90 hover:shadow-lg disabled:opacity-60 active:scale-[0.99] text-sm sm:text-base"
          >
            {loading ? <Spinner /> : <LogIn size={18} />}
            <span>{loading ? "Memverifikasi..." : "Masuk ke Dashboard"}</span>
          </button>
        </form>
      </div>
    </main>
  );
}
