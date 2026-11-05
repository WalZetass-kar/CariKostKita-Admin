import { handle, ok, readBody } from "@/lib/http";
import { HttpError, login, setSessionCookie } from "@/lib/auth";
import { verifyCaptchaToken } from "../captcha/route";

// Rate limiting in-memory sliding window: IP -> { attempts: number, lockUntil: number }
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 10 * 60 * 1000; // 10 menit

function getClientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown-ip";
}

export const POST = handle(async (request) => {
  const ip = getClientIp(request);
  const now = Date.now();

  // 1. Cek status lockout brute-force IP
  const record = loginAttempts.get(ip);
  if (record && record.lockUntil > now) {
    const remainingSec = Math.ceil((record.lockUntil - now) / 1000);
    throw new HttpError(
      429,
      `Terlalu banyak percobaan login gagal. Demi keamanan, silakan tunggu ${remainingSec} detik sebelum mencoba lagi.`
    );
  }

  const body = await readBody(request);

  // 2. Honeypot check (anti-bot trap)
  if (body.website || body.company_fax) {
    throw new HttpError(400, "Permintaan tidak sah (bot detected).");
  }

  const identifier = String(body.identifier || "").trim();
  const password = String(body.password || "");
  const captchaAnswer = String(body.captchaAnswer || "").trim();
  const captchaToken = String(body.captchaToken || "").trim();

  const fields = {};
  if (!identifier) fields.identifier = "Email atau username wajib diisi.";
  if (!password) fields.password = "Password wajib diisi.";
  if (!captchaAnswer) fields.captcha = "Kode keamanan (Captcha) wajib dijawab.";

  if (Object.keys(fields).length) {
    throw new HttpError(422, "Lengkapi data login.", fields);
  }

  // 3. Verifikasi Captcha
  const isCaptchaValid = verifyCaptchaToken(captchaToken, captchaAnswer);
  if (!isCaptchaValid) {
    // Catat percobaan gagal
    const prev = loginAttempts.get(ip) || { attempts: 0, lockUntil: 0 };
    const newAttempts = prev.attempts + 1;
    loginAttempts.set(ip, {
      attempts: newAttempts,
      lockUntil: newAttempts >= MAX_ATTEMPTS ? now + LOCKOUT_MS : 0,
    });
    throw new HttpError(400, "Jawaban keamanan (Captcha) salah atau telah kedaluwarsa. Silakan coba lagi.", {
      captcha: "Jawaban Captcha tidak tepat.",
    });
  }

  // 4. Proses Login Autentikasi
  try {
    const { token, admin, maxAge } = await login(identifier, password);
    // Berhasil login: reset rekor percobaan untuk IP ini
    loginAttempts.delete(ip);
    await setSessionCookie(token, maxAge);
    return ok({ admin });
  } catch (error) {
    // Gagal login: tingkatkan hitungan percobaan
    const prev = loginAttempts.get(ip) || { attempts: 0, lockUntil: 0 };
    const newAttempts = prev.attempts + 1;
    const isLocked = newAttempts >= MAX_ATTEMPTS;
    loginAttempts.set(ip, {
      attempts: newAttempts,
      lockUntil: isLocked ? now + LOCKOUT_MS : 0,
    });

    if (isLocked) {
      throw new HttpError(
        429,
        "Terlalu banyak percobaan login gagal. Akun/IP dikunci sementara selama 10 menit demi keamanan."
      );
    }
    throw error;
  }
});
