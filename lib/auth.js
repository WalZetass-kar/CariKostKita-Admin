import { cookies, headers } from "next/headers";
import { SESSION_COOKIE, SESSION_HOURS } from "./constants.js";

export class HttpError extends Error {
  constructor(status, message, fields) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

export const publicAdmin = (a) => {
  const { passwordHash, ...rest } = a;
  return rest;
};

const apiBaseUrl = () => (process.env.CARIKOSTKITA_API_URL || "https://carikostkitafastapi.vercel.app").replace(/\/api\/v1\/?$/, "").replace(/\/$/, "");

export async function login(identifier, password) {
  const apiUrl = apiBaseUrl();
  const trimmed = String(identifier || "").trim();
  const email = trimmed.includes("@") ? trimmed : `${trimmed}@carikostkita.id`;
  try {
    const res = await fetch(`${apiUrl}/api/v1/admin/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const detail = typeof data.detail === "string" ? data.detail : data.detail?.detail;
      throw new HttpError(res.status, detail || data.message || "Email/password salah atau akun tidak memiliki akses admin.", data.errors || {});
    }

    const data = await res.json();
    const token = data.access_token || data.token;
    const admin = data.user;
    
    // Validate role
    if (!admin || !['admin', 'super_admin', 'moderator', 'marketing', 'developer'].includes(admin.role)) {
        throw new HttpError(403, "Anda tidak memiliki akses ke halaman admin.");
    }
    
    return { token, admin, maxAge: SESSION_HOURS * 3600 };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(500, "Terjadi kesalahan sistem saat menghubungi backend.");
  }
}

export async function setSessionCookie(token, maxAge) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge });
}

const sessionCache = new Map();
const SESSION_CACHE_TTL = 30 * 1000; // 30 detik

export async function clearSessionCookie() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) sessionCache.delete(token);
  jar.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
}

export async function getSession({ touch = false } = {}) {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  
  const cached = sessionCache.get(token);
  if (cached && Date.now() - cached.timestamp < SESSION_CACHE_TTL) {
    return cached.data;
  }

  // Validate the session through FastAPI; the server derives the admin role.
  const apiUrl = apiBaseUrl();
  try {
      const res = await fetch(`${apiUrl}/api/v1/admin/auth/user`, {
          headers: {
              "Authorization": `Bearer ${token}`,
              "Accept": "application/json"
          },
          cache: "no-store"
      });
      if (!res.ok) {
          sessionCache.delete(token);
          return null;
      }
      const data = await res.json();
      const sessionData = { admin: data.data || data, session: { token } };
      sessionCache.set(token, { timestamp: Date.now(), data: sessionData });
      return sessionData;
  } catch (err) {
      return null;
  }
}

export async function requireAdmin(roles) {
  const found = await getSession({ touch: true });
  if (!found) throw new HttpError(401, "Sesi berakhir. Silakan login kembali.");
  const userRole = found.admin?.role === "developer" ? "super_admin" : found.admin?.role;
  if (roles && !roles.includes(userRole) && !roles.includes(found.admin?.role)) {
    throw new HttpError(403, "Anda tidak memiliki izin untuk melakukan aksi ini.");
  }
  return found;
}

export async function logout() {
  const found = await getSession();
  if (found) {
      const apiUrl = apiBaseUrl();
      await fetch(`${apiUrl}/api/v1/admin/auth/logout`, {
          method: "POST",
          headers: {
              "Authorization": `Bearer ${found.session.token}`,
              "Accept": "application/json"
          }
      }).catch(() => {});
  }
  await clearSessionCookie();
}
