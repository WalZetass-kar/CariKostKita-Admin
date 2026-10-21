import { handle, ok, readBody } from "@/lib/http";
import { HttpError, publicAdmin, requireAdmin } from "@/lib/auth";
import { getDb, mutate } from "@/lib/db";
import * as svc from "@/lib/service";

const apiErrorMessage = (payload, fallback) => {
  const detail = payload?.detail;
  if (typeof detail === "string") return detail;
  if (typeof detail?.detail === "string") return detail.detail;
  return fallback;
};

const fastApiBase = () => (process.env.CARIKOSTKITA_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

let dataCache = { value: null, expiresAt: 0, token: null };
let overviewCache = { value: null, expiresAt: 0, token: null };

export function invalidateAdminCache() {
  dataCache = { value: null, expiresAt: 0, token: null };
  overviewCache = { value: null, expiresAt: 0, token: null };
}
const profileAdmin = (profile, admin) => ({
  ...admin,
  name: profile?.nama || admin.name,
  email: profile?.email || admin.email,
  phone: profile?.no_hp || "",
  photo: profile?.avatar_url || "",
});
const isMissingFastApiRoute = (response, payload) =>
  response.status === 404 && (payload?.detail === "Not Found" || payload?.detail?.detail === "Not Found");
const isMissingLegacyRoute = (response, payload) => {
  if (response.status !== 404) return false;
  const message = [payload?.message, payload?.detail, payload?.error]
    .find((value) => typeof value === "string")
    ?.trim()
    .toLowerCase();
  if (["not found", "route not found", "endpoint not found"].includes(message)) return true;
  return (response.headers.get("content-type") || "").includes("text/html");
};

async function readFastApiProfile(apiUrl, token) {
  const response = await fetch(`${apiUrl}/api/v1/me/profile`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

async function getSystemSettingsHandler({ session }) {
  const localSystem = getDb().system || {};
  const apiUrl = fastApiBase();
  let remotePayload = {};
  let res;
  try {
    res = await fetch(`${apiUrl}/api/v1/admin/settings`, {
      headers: { Authorization: `Bearer ${session.token}`, Accept: "application/json" },
      cache: "no-store",
    });
  } catch (err) {
    console.error("FastAPI settings read network failure:", err);
    throw new HttpError(502, "Backend tidak dapat dijangkau. Pengaturan Landing Page tidak dapat dimuat.");
  }
  if (res.ok) {
    const payload = await res.json();
    remotePayload = payload.data || payload || {};
  } else {
    const errJson = await res.json().catch(() => ({}));
    if (isMissingFastApiRoute(res, errJson)) {
      // The route does not exist on this deployment yet: fall back to the
      // public contract, which carries the same content.
      try {
        const pubRes = await fetch(`${apiUrl}/api/v1/public/settings`, { cache: "no-store" });
        if (pubRes.ok) {
          const pubPayload = await pubRes.json();
          remotePayload = pubPayload.data || pubPayload || {};
        }
      } catch {}
    } else {
      // Any other failure (auth, unavailable store, server error) must be
      // reported. Falling back to the local file would show stale content as
      // if it were the current CMS state.
      console.error("FastAPI settings read rejected:", res.status, errJson);
      throw new HttpError(
        res.status,
        apiErrorMessage(errJson, "Pengaturan Landing Page tidak dapat dimuat dari server.")
      );
    }
  }
  // The durable store is the single source of truth. The local db.json may
  // only fill gaps; it must never override a value the store confirmed,
  // otherwise a stale file silently reverts an admin edit.
  const merged = { ...localSystem, ...remotePayload };
  mutate((db) => {
    db.system = merged;
  });
  return { system: merged };
}

async function patchSystemSettingsHandler(auth, { body }) {
  const { session } = auth;
  const apiUrl = fastApiBase();
  let res;
  try {
    res = await fetch(`${apiUrl}/api/v1/admin/settings`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${session.token}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch (err) {
    console.error("FastAPI settings update network failure:", err);
    throw new HttpError(
      502,
      "Backend tidak dapat dijangkau. Perubahan Landing Page tidak disimpan."
    );
  }
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    // The edit was NOT stored durably. Report it instead of writing the
    // local file and pretending the landing page was updated.
    console.error("FastAPI settings update rejected:", res.status, payload);
    throw new HttpError(
      res.status,
      apiErrorMessage(
        payload,
        "Perubahan ditolak backend, sehingga Landing Page tidak diperbarui."
      )
    );
  }
  const remotePayload = payload.data || {};
  const local = await write(auth, (db) => ({ system: svc.updateSystem(db, auth.admin, body) }));
  // The confirmed database state wins over the local mirror.
  const savedSystem = { ...(local.system || {}), ...remotePayload };
  mutate((db) => {
    db.system = savedSystem;
  });
  if (local.data) {
    local.data.system = savedSystem;
  }
  return {
    ...local,
    system: savedSystem,
    revision: payload.revision ?? savedSystem.revision ?? 0,
    updated_at: payload.updated_at ?? savedSystem.updated_at ?? null,
    changed_keys: payload.changed_keys ?? [],
    persistence: payload.persistence ?? null,
    realtime: payload.realtime ?? null,
  };
}

/**
 * REST API Admin. Semua endpoint wajib login. Setiap mutasi mengembalikan
 * snapshot data terbaru ("data") sehingga UI selalu konsisten dengan server.
 */
const routes = [
  ["GET", "fastapi-ads", async ({ session }, { url }) => {
    const apiUrl = (process.env.CARIKOSTKITA_API_URL || "https://carikostkitafastapi.vercel.app").replace(/\/$/, "");
    const query = new URLSearchParams();
    for (const key of ["q", "is_active", "page", "page_size"]) {
      const value = url.searchParams.get(key);
      if (value !== null && value !== "") query.set(key, value);
    }
    const res = await fetch(`${apiUrl}/api/v1/admin/ads?${query}`, {
      headers: { Authorization: `Bearer ${session.token}`, Accept: "application/json" },
      cache: "no-store",
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new HttpError(res.status, apiErrorMessage(payload, "Gagal memuat direktori iklan FastAPI."));
    return payload;
  }, ["super_admin", "admin"]],
  ["GET", "fastapi-kosts", async ({ session }, { url }) => {
    const apiUrl = (process.env.CARIKOSTKITA_API_URL || "https://carikostkitafastapi.vercel.app").replace(/\/$/, "");
    const query = new URLSearchParams();
    for (const key of ["q", "verification_status", "status", "page", "page_size"]) {
      const value = url.searchParams.get(key);
      if (value !== null && value !== "") query.set(key, value);
    }
    const res = await fetch(`${apiUrl}/api/v1/admin/kosts?${query}`, {
      headers: { Authorization: `Bearer ${session.token}`, Accept: "application/json" },
      cache: "no-store",
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new HttpError(res.status, apiErrorMessage(payload, "Gagal memuat direktori kost FastAPI."));
    return payload;
  }, ["super_admin", "admin", "moderator"]],
  ["PATCH", "fastapi-kosts/:id/status", async ({ session }, { body, params }) => {
    const apiUrl = fastApiBase();
    const res = await fetch(`${apiUrl}/api/v1/admin/kosts/${encodeURIComponent(params.id)}/status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${session.token}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new HttpError(res.status, apiErrorMessage(payload, "Gagal mengubah status ketersediaan kost."));
    return payload;
  }, ["super_admin", "admin"]],
  ["POST", "fastapi-kosts/bulk-verify", async ({ session }, { body }) => {
    const apiUrl = fastApiBase();
    const res = await fetch(`${apiUrl}/api/v1/admin/kosts/bulk-verify`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new HttpError(res.status, apiErrorMessage(payload, "Gagal memproses persetujuan verifikasi massal."));
    return payload;
  }, ["super_admin", "admin"]],
  ["POST", "fastapi-kosts/bulk-delete", async ({ session }, { body }) => {
    invalidateAdminCache();
    const apiUrl = fastApiBase();
    const res = await fetch(`${apiUrl}/api/v1/admin/kosts/bulk-delete`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new HttpError(res.status, apiErrorMessage(payload, "Gagal memproses penghapusan massal listing kos."));
    return payload;
  }, ["super_admin", "admin"]],
  ["DELETE", "fastapi-kosts/:id", async ({ session }, { params }) => {
    invalidateAdminCache();
    const apiUrl = fastApiBase();
    const res = await fetch(`${apiUrl}/api/v1/admin/kosts/${encodeURIComponent(params.id)}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${session.token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new HttpError(res.status, apiErrorMessage(payload, "Gagal menghapus listing kos."));
    return payload;
  }, ["super_admin", "admin"]],
  ["POST", "fastapi-bulk-import/preview", async ({ session }, { body }) => {
    const apiUrl = fastApiBase();
    const res = await fetch(`${apiUrl}/api/v1/admin/kosts/import/preview`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new HttpError(res.status, apiErrorMessage(payload, "Gagal memvalidasi file import data kos."));
    return payload;
  }, ["super_admin", "admin"]],
  ["POST", "fastapi-bulk-import/commit", async ({ session }, { body }) => {
    const apiUrl = fastApiBase();
    const res = await fetch(`${apiUrl}/api/v1/admin/kosts/import/commit`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new HttpError(res.status, apiErrorMessage(payload, "Gagal menyimpan hasil import data kos."));
    return payload;
  }, ["super_admin", "admin"]],
  ["GET", "fastapi-bulk-import/template", async ({ session }, { url }) => {
    const apiUrl = fastApiBase();
    const format = url.searchParams.get("format") || "xlsx";
    try {
      const headers = session?.token ? { Authorization: `Bearer ${session.token}` } : {};
      const res = await fetch(`${apiUrl}/api/v1/admin/kosts/import/template?format=${format}`, {
        headers,
        cache: "no-store",
      });
      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        const base64 = Buffer.from(arrayBuf).toString("base64");
        return {
          format,
          filename: `Template_Import_Kost_CariKostKita.${format}`,
          file_base64: base64,
        };
      }
    } catch (err) {
      console.warn("FastAPI template endpoint failed, using local generator:", err);
    }

    // Direct local generator fallback so template download NEVER fails with 404
    const { getLocalTemplateBase64 } = await import("@/lib/templateGenerator");
    const base64 = getLocalTemplateBase64(format);
    return {
      format,
      filename: `Template_Import_Kost_CariKostKita.${format}`,
      file_base64: base64,
    };
  }],
  ["GET", "fastapi-owners", async ({ session }, { url }) => {
    const apiUrl = (process.env.CARIKOSTKITA_API_URL || "https://carikostkitafastapi.vercel.app").replace(/\/$/, "");
    const query = new URLSearchParams({ role: "owner" });
    for (const key of ["q", "verification_status", "is_active", "page", "page_size"]) {
      const value = url.searchParams.get(key);
      if (value !== null && value !== "") query.set(key, value);
    }
    const res = await fetch(`${apiUrl}/api/v1/admin/users?${query}`, {
      headers: { Authorization: `Bearer ${session.token}`, Accept: "application/json" },
      cache: "no-store",
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new HttpError(res.status, apiErrorMessage(payload, "Gagal memuat direktori pemilik FastAPI."));
    return payload;
  }, ["super_admin", "admin"]],
  ["GET", "fastapi-overview", async ({ session }) => {
    const now = Date.now();
    if (overviewCache.value && overviewCache.expiresAt > now && overviewCache.token === session.token) {
      return overviewCache.value;
    }
    const apiUrl = fastApiBase();
    const res = await fetch(`${apiUrl}/api/v1/admin/overview`, {
      headers: { Authorization: `Bearer ${session.token}`, Accept: "application/json" },
      cache: "no-store",
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new HttpError(res.status, apiErrorMessage(payload, "Ringkasan FastAPI tidak dapat dimuat."));
    overviewCache = { value: payload, expiresAt: now + 15000, token: session.token };
    return payload;
  }, ["super_admin", "admin"]],
  ["GET", "fastapi-analytics", async ({ session }, { url }) => {
    const apiUrl = fastApiBase();
    const rawDays = Number(url.searchParams.get("days") || 30);
    const days = Number.isInteger(rawDays) && rawDays >= 1 && rawDays <= 365 ? rawDays : 30;
    const headers = { Authorization: `Bearer ${session.token}`, Accept: "application/json" };
    const [funnelResponse, crashResponse] = await Promise.all([
      fetch(`${apiUrl}/api/v1/admin/analytics/funnel?days=${days}`, { headers, cache: "no-store" }),
      fetch(`${apiUrl}/api/v1/admin/analytics/crashes?days=${days}`, { headers, cache: "no-store" }),
    ]);
    const [funnel, crashes] = await Promise.all([
      funnelResponse.json().catch(() => ({})),
      crashResponse.json().catch(() => ({})),
    ]);
    if (!funnelResponse.ok) throw new HttpError(funnelResponse.status, apiErrorMessage(funnel, "Analitik event FastAPI tidak dapat dimuat."));
    if (!crashResponse.ok) throw new HttpError(crashResponse.status, apiErrorMessage(crashes, "Agregat crash FastAPI tidak dapat dimuat."));
    return {
      data: {
        days,
        events: funnel.data || [],
        crashes: crashes.data || { count: 0, days },
        eventScope: funnel.scope,
        crashScope: crashes.scope,
      },
    };
  }, ["super_admin", "admin"]],
  ["GET", "fastapi-users", async ({ session }, { url }) => {
    const apiUrl = (process.env.CARIKOSTKITA_API_URL || "https://carikostkitafastapi.vercel.app").replace(/\/$/, "");
    const query = new URLSearchParams();
    for (const key of ["q", "role", "is_active", "page", "page_size"]) {
      const value = url.searchParams.get(key);
      if (value !== null && value !== "") query.set(key, value);
    }
    const res = await fetch(`${apiUrl}/api/v1/admin/users?${query}`, {
      headers: { Authorization: `Bearer ${session.token}`, Accept: "application/json" },
      cache: "no-store",
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new HttpError(res.status, apiErrorMessage(payload, "Gagal memuat direktori pengguna FastAPI."));
    return payload;
  }, ["super_admin", "admin"]],
  ["GET", "settings/profile", async ({ admin, session }) => {
    try {
      const { response, payload } = await readFastApiProfile(fastApiBase(), session.token);
      if (response && response.ok && payload?.data) {
        return { profile: profileAdmin(payload.data, admin), source: "fastapi" };
      }
    } catch (err) {
      console.warn("FastAPI profile read error:", err);
    }
    const legacy = (getDb().admins || []).find((item) => item.id === admin.id || item.email === admin.email) || admin;
    return { profile: profileAdmin({ nama: legacy.name, email: legacy.email, no_hp: legacy.phone, avatar_url: legacy.photo }, admin), source: "legacy" };
  }, ["super_admin", "admin", "moderator"]],
  ["PATCH", "settings/profile", async (auth, { body }) => {
    const { admin, session } = auth;
    if (typeof body.email === "string" && body.email.trim().toLowerCase() !== String(admin.email || "").toLowerCase()) {
      throw new HttpError(422, "Email login dikelola Supabase dan belum bisa diubah dari halaman profil.");
    }

    const apiUrl = fastApiBase();
    let avatarUrl = body.photo || "";

    if (typeof body.photo === "string" && body.photo.startsWith("data:")) {
      const match = /^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/.exec(body.photo);
      if (match) {
        const bytes = Buffer.from(match[1], "base64");
        if (bytes.length >= 3 && bytes.length <= 5 * 1024 * 1024 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
          try {
            const upload = await fetch(`${apiUrl}/api/v1/me/avatar`, {
              method: "POST",
              headers: { Authorization: `Bearer ${session.token}`, "Content-Type": "image/jpeg", Accept: "application/json" },
              body: bytes,
              cache: "no-store",
            });
            const uploadPayload = await upload.json().catch(() => ({}));
            if (upload.ok && uploadPayload?.data?.public_url) {
              avatarUrl = uploadPayload.data.public_url;
            } else {
              console.warn("Avatar upload to FastAPI returned non-ok, preserving photo directly:", upload.status, uploadPayload?.detail);
            }
          } catch (uploadErr) {
            console.warn("Avatar upload fetch failed:", uploadErr);
          }
        }
      }
    }

    // Try updating profile in FastAPI
    try {
      const response = await fetch(`${apiUrl}/api/v1/me/profile`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${session.token}`, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ nama: body.name, no_hp: body.phone || "", avatar_url: avatarUrl }),
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok && payload?.data) {
        // Also update local cache so state stays in sync
        await write(auth, (db) => ({ profile: svc.updateProfile(db, admin, { ...body, photo: avatarUrl }) })).catch(() => {});
        return { profile: payload.data, admin: profileAdmin(payload.data, admin), source: "fastapi" };
      }
    } catch (patchErr) {
      console.warn("FastAPI profile update error, falling back to local DB:", patchErr);
    }

    // Fallback to local DB update so profile change NEVER fails with 503
    return { ...(await write(auth, (db) => ({ profile: svc.updateProfile(db, admin, { ...body, photo: avatarUrl }) }))), source: "legacy" };
  }, ["super_admin", "admin", "moderator"]],
  ["PATCH", "fastapi-users/:id", async ({ session }, { body, params }) => {
    const apiUrl = (process.env.CARIKOSTKITA_API_URL || "https://carikostkitafastapi.vercel.app").replace(/\/$/, "");
    const res = await fetch(`${apiUrl}/api/v1/admin/users/${encodeURIComponent(params.id)}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${session.token}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new HttpError(res.status, apiErrorMessage(payload, "Gagal menyimpan perubahan pengguna via FastAPI."));
    return payload;
  }, ["super_admin", "admin"]],
  ["GET", "fastapi-reports", async ({ session }, { url }) => {
    const apiUrl = (process.env.CARIKOSTKITA_API_URL || "https://carikostkitafastapi.vercel.app").replace(/\/$/, "");
    const query = new URLSearchParams(url.searchParams);
    const res = await fetch(`${apiUrl}/api/v1/admin/reports?${query}`, {
      headers: { Authorization: `Bearer ${session.token}`, Accept: "application/json" },
      cache: "no-store",
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new HttpError(res.status, payload.detail?.detail || payload.detail || "Gagal memuat antrean laporan FastAPI.");
    return payload;
  }, ["super_admin", "admin", "moderator"]],
  ["GET", "fastapi-activity-logs", async ({ session }, { url }) => {
    const apiUrl = (process.env.CARIKOSTKITA_API_URL || "https://carikostkitafastapi.vercel.app").replace(/\/$/, "");
    const query = new URLSearchParams(url.searchParams);
    const res = await fetch(`${apiUrl}/api/v1/admin/activity-logs?${query}`, {
      headers: { Authorization: `Bearer ${session.token}`, Accept: "application/json" },
      cache: "no-store",
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new HttpError(res.status, apiErrorMessage(payload, "Audit log FastAPI tidak dapat dimuat."));
    return payload;
  }, ["super_admin"]],
  ["PATCH", "fastapi-reports/:id", async ({ session }, { body, params }) => {
    const apiUrl = (process.env.CARIKOSTKITA_API_URL || "https://carikostkitafastapi.vercel.app").replace(/\/$/, "");
    const res = await fetch(`${apiUrl}/api/v1/admin/reports/${encodeURIComponent(params.id)}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${session.token}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new HttpError(res.status, payload.detail?.detail || payload.detail || "Gagal menyimpan keputusan laporan.");
    return payload;
  }, ["super_admin", "admin", "moderator"]],
  ["POST", "settings/password", async ({ session }, { body }) => {
    const apiUrl = (process.env.CARIKOSTKITA_API_URL || "https://carikostkitafastapi.vercel.app").replace(/\/$/, "");
    const res = await fetch(`${apiUrl}/api/v1/admin/auth/password`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.token}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new HttpError(res.status, apiErrorMessage(payload, "Gagal mengubah password Supabase."));
    return { passwordChanged: true };
  }, ["super_admin", "admin", "moderator"]],
  ["GET", "owner-verifications", async ({ session }, { url }) => {
    const apiUrl = (process.env.CARIKOSTKITA_API_URL || "https://carikostkitafastapi.vercel.app").replace(/\/$/, "");
    const query = new URLSearchParams(url.searchParams);
    const res = await fetch(`${apiUrl}/api/v1/admin/owner-verifications?${query}`, {
      headers: { Authorization: `Bearer ${session.token}`, Accept: "application/json" },
      cache: "no-store",
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new HttpError(res.status, payload.detail?.detail || payload.detail || "Gagal memuat antrean verifikasi.");
    return payload;
  }, ["super_admin", "admin", "moderator"]],
  ["PATCH", "owner-verifications/:id", async ({ session }, { body, params }) => {
    const apiUrl = (process.env.CARIKOSTKITA_API_URL || "https://carikostkitafastapi.vercel.app").replace(/\/$/, "");
    const res = await fetch(`${apiUrl}/api/v1/admin/owner-verifications/${encodeURIComponent(params.id)}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${session.token}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new HttpError(res.status, payload.detail?.detail || payload.detail || "Gagal menyimpan keputusan verifikasi.");
    return payload;
  }, ["super_admin", "admin", "moderator"]],
  ["GET", "data", async ({ admin, session }) => {
    const now = Date.now();
    if (dataCache.value && dataCache.expiresAt > now && dataCache.token === session.token) {
      return dataCache.value;
    }
    const apiUrl = fastApiBase();
    const headers = { Authorization: `Bearer ${session.token}`, Accept: "application/json" };
    try {
      const [overviewRes, kostsRes, usersRes, reportsRes, adsRes, settingsRes] = await Promise.all([
        fetch(`${apiUrl}/api/v1/admin/overview`, { headers, cache: "no-store" }).catch(() => null),
        fetch(`${apiUrl}/api/v1/admin/kosts?page=1&page_size=50`, { headers, cache: "no-store" }).catch(() => null),
        fetch(`${apiUrl}/api/v1/admin/users?page=1&page_size=50`, { headers, cache: "no-store" }).catch(() => null),
        fetch(`${apiUrl}/api/v1/admin/reports?page=1&page_size=50`, { headers, cache: "no-store" }).catch(() => null),
        fetch(`${apiUrl}/api/v1/admin/ads?page=1&page_size=50`, { headers, cache: "no-store" }).catch(() => null),
        fetch(`${apiUrl}/api/v1/admin/settings`, { headers, cache: "no-store" }).catch(() => null),
      ]);

      if (overviewRes && overviewRes.ok) {
        const [overview, kosts, users, reports, ads, settings] = await Promise.all([
          overviewRes.json().catch(() => ({})),
          kostsRes && kostsRes.ok ? kostsRes.json().catch(() => ({})) : Promise.resolve({}),
          usersRes && usersRes.ok ? usersRes.json().catch(() => ({})) : Promise.resolve({}),
          reportsRes && reportsRes.ok ? reportsRes.json().catch(() => ({})) : Promise.resolve({}),
          adsRes && adsRes.ok ? adsRes.json().catch(() => ({})) : Promise.resolve({}),
          settingsRes && settingsRes.ok ? settingsRes.json().catch(() => ({})) : Promise.resolve({}),
        ]);

        const db = getDb();
        const liveSettings = settings.data || settings;
        if (liveSettings && Object.keys(liveSettings).length > 0) {
          db.system = { ...(db.system || {}), ...liveSettings };
        }

        const rawUsers = users.data || [];
        const staffUsers = rawUsers.filter((u) => ["super_admin", "developer", "admin", "moderator", "marketing"].includes(u.role));
        const realAdmins = staffUsers.length > 0
          ? staffUsers.map((u) => ({
              id: String(u.id),
              name: u.name || "Admin",
              username: u.email?.split("@")[0] || (u.name || "admin").toLowerCase().replace(/\s+/g, ""),
              email: u.email || "",
              phone: u.no_hp || "",
              role: u.role === "developer" ? "super_admin" : u.role,
              active: u.is_active ?? true,
              createdAt: u.created_at || "2026-01-01",
            }))
          : [publicAdmin(admin)];

        const result = {
          data: {
            overview: overview.data || overview,
            kosts: (kosts.data || []).map((k) => ({
              ...k,
              name: k.name || k.nama_kost,
              address: k.address || k.alamat,
              price: k.price_min || k.harga || 0,
              rooms: k.total_kamar || 0,
              status: k.status || "TERSEDIA",
            })),
            users: rawUsers.map((u) => ({
              ...u,
              name: u.name || u.nama,
              status: u.is_active ? "Aktif" : "Nonaktif",
            })),
            reports: reports.data || [],
            ads: ads.data || [],
            stats: {
              totalKosts: overview.data?.kosts?.total ?? 0,
              totalUsers: overview.data?.users?.total ?? 0,
              totalReports: overview.data?.reports?.total ?? 0,
            },
            system: liveSettings && Object.keys(liveSettings).length > 0 ? { ...(db.system || {}), ...liveSettings } : db.system,
            admins: realAdmins,
            audit: db.audit || [],
          },
        };
        dataCache = { value: result, expiresAt: now + 15000, token: session.token };
        return result;
      }
    } catch {
      // Fallback to legacy/db.json
    }

    const laravelUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
    const res = await fetch(`${laravelUrl}/admin/bff/load-all`, {
      headers: { "Authorization": `Bearer ${session.token}`, "Accept": "application/json" }
    }).catch(() => null);
    if (!res || !res.ok) return { data: svc.loadAll(getDb(), admin) }; // Fallback to db.json if Laravel fails
    const json = await res.json().catch(() => ({}));
    return { data: json.data || svc.loadAll(getDb(), admin) };
  }],
  ["GET", "stats", async (_c, { url }) => ({ stats: svc.computeStats(getDb(), url.searchParams.get("period") || "bulanan") }), ["super_admin", "admin", "marketing"]],
  ["GET", "sessions", async ({ admin, session }) => ({ sessions: svc.listSessions(getDb(), admin, session.token) })],
  ["GET", "global-search", async ({ session }, { url }) => {
    const apiUrl = (process.env.CARIKOSTKITA_API_URL || "https://carikostkitafastapi.vercel.app").replace(/\/$/, "");
    const query = new URLSearchParams();
    const keyword = url.searchParams.get("q");
    if (keyword) query.set("q", keyword);
    const res = await fetch(`${apiUrl}/api/v1/admin/search?${query}`, {
      headers: { Authorization: `Bearer ${session.token}`, Accept: "application/json" },
      cache: "no-store",
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new HttpError(res.status, apiErrorMessage(payload, "Pencarian FastAPI tidak dapat dimuat."));
    return payload;
  }, ["super_admin", "admin", "moderator"]],
  ["GET", "search", async ({ admin }, { url }) => svc.globalSearch(getDb(), admin, url.searchParams.get("q"))],

  ["POST", "kosts", async (auth, { body }) => write(auth, (db) => ({ kost: svc.createKost(db, auth.admin, body) })), ["super_admin", "admin"]],
  ["PATCH", "kosts/:id", async (auth, { body, params }) => write(auth, (db) => ({ kost: svc.updateKost(db, auth.admin, params.id, body) })), ["super_admin", "admin", "moderator"]],
  ["DELETE", "kosts/:id", async (auth, { params }) => write(auth, (db) => svc.deleteKost(db, auth.admin, params.id)), ["super_admin", "admin"]],
  ["POST", "kosts/:id/status", async (auth, { body, params }) => write(auth, (db) => ({ kost: svc.setKostStatus(db, auth.admin, params.id, body.status, body.reason) }), { method: 'PATCH', path: `/api/v1/admin/kosts/${params.id}/status`, body: { status: body.status }, isFastApi: true }), ["super_admin", "admin", "moderator"]],
  ["POST", "kosts/:id/archive", async (auth, { params }) => write(auth, (db) => ({ kost: svc.archiveKost(db, auth.admin, params.id) })), ["super_admin", "admin"]],
  ["POST", "kosts/:id/restore", async (auth, { params }) => write(auth, (db) => ({ kost: svc.restoreKost(db, auth.admin, params.id) })), ["super_admin", "admin"]],
  ["DELETE", "kosts/:id/permanent", async (auth, { params }) => write(auth, (db) => svc.permanentDeleteKost(db, auth.admin, params.id)), ["super_admin"]],
  ["POST", "kosts/bulk", async (auth, { body }) => write(auth, (db) => svc.bulkKostAction(db, auth.admin, body)), ["super_admin", "admin", "moderator"]],

  ["PATCH", "owners/:id", async (auth, { body, params }) => write(auth, (db) => ({ owner: svc.updateOwner(db, auth.admin, params.id, body) })), ["super_admin", "admin"]],
  ["DELETE", "owners/:id", async (auth, { params }) => write(auth, (db) => svc.deleteOwner(db, auth.admin, params.id)), ["super_admin", "admin"]],
  ["POST", "owners/:id/action", async (auth, { body, params }) => write(auth, (db) => ({ owner: svc.ownerAction(db, auth.admin, params.id, body) })), ["super_admin", "admin", "moderator"]],
  ["POST", "owners/:id/archive", async (auth, { params }) => write(auth, (db) => ({ owner: svc.archiveOwner(db, auth.admin, params.id) })), ["super_admin", "admin"]],
  ["POST", "owners/:id/restore", async (auth, { params }) => write(auth, (db) => ({ owner: svc.restoreOwner(db, auth.admin, params.id) })), ["super_admin", "admin"]],
  ["DELETE", "owners/:id/permanent", async (auth, { body, params }) => write(auth, (db) => svc.permanentDeleteOwner(db, auth.admin, params.id, body)), ["super_admin"]],
  ["POST", "owners/:id/permanent", async (auth, { body, params }) => write(auth, (db) => svc.permanentDeleteOwner(db, auth.admin, params.id, body)), ["super_admin"]],
  ["POST", "owners/bulk", async (auth, { body }) => write(auth, (db) => svc.bulkOwnerAction(db, auth.admin, body)), ["super_admin", "admin", "moderator"]],

  ["PATCH", "users/:id", async (auth, { body, params }) => write(auth, (db) => ({ user: svc.updateUser(db, auth.admin, params.id, body) })), ["super_admin", "admin"]],
  ["DELETE", "users/:id", async (auth, { params }) => write(auth, (db) => svc.deleteUser(db, auth.admin, params.id)), ["super_admin", "admin"]],
  ["POST", "users/:id/status", async (auth, { body, params }) => write(auth, (db) => ({ user: svc.setUserStatus(db, auth.admin, params.id, body.status) }), { method: 'PATCH', path: `/api/v1/admin/users/${params.id}`, body: { is_active: body.status === "Aktif" || body.status === true }, isFastApi: true }), ["super_admin", "admin"]],
  ["POST", "users/:id/archive", async (auth, { params }) => write(auth, (db) => ({ user: svc.archiveUser(db, auth.admin, params.id) })), ["super_admin", "admin"]],
  ["POST", "users/:id/restore", async (auth, { params }) => write(auth, (db) => ({ user: svc.restoreUser(db, auth.admin, params.id) })), ["super_admin", "admin"]],
  ["DELETE", "users/:id/permanent", async (auth, { params }) => write(auth, (db) => svc.permanentDeleteUser(db, auth.admin, params.id)), ["super_admin"]],
  ["POST", "users/:id/permanent", async (auth, { params }) => write(auth, (db) => svc.permanentDeleteUser(db, auth.admin, params.id)), ["super_admin"]],
  ["POST", "users", async (auth, { body }) => write(auth, (db) => ({ user: svc.createUser(db, auth.admin, body) })), ["super_admin", "admin"]],
  ["POST", "users/bulk", async (auth, { body }) => write(auth, (db) => svc.bulkUserAction(db, auth.admin, body)), ["super_admin", "admin"]],

  ["PATCH", "reports/:id", async (auth, { body, params }) => write(auth, (db) => ({ report: svc.updateReport(db, auth.admin, params.id, body) }), { method: 'PATCH', path: `/api/v1/admin/reports/${params.id}`, body: { status: body.status === "Selesai" ? "SELESAI" : body.status === "Ditolak" ? "DITOLAK" : "DITINJAU", admin_action: body.adminAction || body.note }, isFastApi: true }), ["super_admin", "admin", "moderator"]],

  ["POST", "ads", async (auth, { body }) => write(auth, (db) => ({ ad: svc.createAd(db, auth.admin, body) }), { method: 'POST', path: '/admin/ads', body }), ["super_admin", "marketing"]],
  ["PATCH", "ads/:id", async (auth, { body, params }) => write(auth, (db) => ({ ad: svc.updateAd(db, auth.admin, params.id, body) })), ["super_admin", "marketing"]],
  ["DELETE", "ads/:id", async (auth, { params }) => write(auth, (db) => svc.deleteAd(db, auth.admin, params.id)), ["super_admin", "marketing"]],
  ["POST", "ads/:id/toggle", async (auth, { params }) => write(auth, (db) => ({ ad: svc.toggleAd(db, auth.admin, params.id) }), { method: 'PATCH', path: `/admin/ads/${params.id}/status` }), ["super_admin", "marketing"]],
  ["POST", "ads/:id/archive", async (auth, { params }) => write(auth, (db) => ({ ad: svc.archiveAd(db, auth.admin, params.id) })), ["super_admin", "marketing"]],
  ["POST", "ads/:id/restore", async (auth, { params }) => write(auth, (db) => ({ ad: svc.restoreAd(db, auth.admin, params.id) })), ["super_admin", "marketing"]],
  ["DELETE", "ads/:id/permanent", async (auth, { params }) => write(auth, (db) => svc.permanentDeleteAd(db, auth.admin, params.id)), ["super_admin"]],

  ["PATCH", "settings/notifications", async (auth, { body }) => write(auth, (db) => ({ notifications: svc.updateNotifications(db, auth.admin, body) }))],
  // The settings routes are served by FastAPI, which only recognises the
  // trusted roles developer/admin/moderator. The legacy `marketing` role has
  // no counterpart in the database schema, so it is not offered here: a save
  // would be rejected by the backend instead of silently doing nothing.
  ["GET", "settings/system", getSystemSettingsHandler, ["super_admin", "admin"]],
  ["PATCH", "settings/system", patchSystemSettingsHandler, ["super_admin", "admin"]],
  ["GET", "settings/landing", getSystemSettingsHandler, ["super_admin", "admin"]],
  ["PATCH", "settings/landing", patchSystemSettingsHandler, ["super_admin", "admin"]],

  ["GET", "admins", async ({ admin, session }) => {
    const apiUrl = fastApiBase();
    try {
      const res = await fetch(`${apiUrl}/api/v1/admin/users?page=1&page_size=100`, {
        headers: { Authorization: `Bearer ${session.token}`, Accept: "application/json" },
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        const staff = (json.data || []).filter((u) => ["developer", "admin", "moderator"].includes(u.role));
        if (staff.length > 0) {
          return {
            admins: staff.map((u) => ({
              id: String(u.id),
              name: u.name || "Admin",
              username: u.email?.split("@")[0] || (u.name || "admin").toLowerCase().replace(/\s+/g, ""),
              email: u.email || "",
              phone: u.no_hp || "",
              role: u.role === "developer" ? "super_admin" : u.role,
              active: u.is_active ?? true,
              createdAt: u.created_at || "2026-01-01",
            })),
          };
        }
      }
    } catch {}
    return { admins: [publicAdmin(admin)] };
  }, ["super_admin", "admin"]],
  ["POST", "admins", async (auth, { body }) => write(auth, (db) => ({ admin: svc.createAdmin(db, auth.admin, body) })), ["super_admin"]],
  ["PATCH", "admins/:id", async (auth, { body, params }) => write(auth, (db) => ({ admin: svc.updateAdmin(db, auth.admin, params.id, body) })), ["super_admin"]],
  ["DELETE", "admins/:id", async (auth, { params }) => write(auth, (db) => svc.deleteAdmin(db, auth.admin, params.id)), ["super_admin"]],

  ["POST", "notifications/read", async (auth, { body }) => write(auth, (db) => svc.markNotificationRead(db, auth.admin, body.id))],
  ["POST", "notifications/read-all", async (auth) => write(auth, (db) => svc.markAllNotificationsRead(db, auth.admin))],

  ["POST", "sessions/revoke-others", async ({ session }) => {
    const apiUrl = (process.env.CARIKOSTKITA_API_URL || "https://carikostkitafastapi.vercel.app").replace(/\/$/, "");
    const res = await fetch(`${apiUrl}/api/v1/admin/auth/sessions/revoke-others`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.token}`, Accept: "application/json" },
      cache: "no-store",
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new HttpError(res.status, apiErrorMessage(payload, "Gagal mengeluarkan sesi pada perangkat lain."));
    return { revoked: true };
  }, ["super_admin", "admin", "moderator"]],
];

async function write(auth, fn, proxyTarget = null) {
  invalidateAdminCache();
  const { admin, session } = auth;
  let result = {};
  
  if (proxyTarget) {
     const isFastApi = proxyTarget.isFastApi || proxyTarget.path?.startsWith("/api/v1/");
     const baseUrl = isFastApi ? fastApiBase() : (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1');
     let res;
     try {
       res = await fetch(`${baseUrl}${proxyTarget.path}`, {
         method: proxyTarget.method,
         headers: { "Authorization": `Bearer ${session.token}`, "Content-Type": "application/json", "Accept": "application/json" },
         body: proxyTarget.body ? JSON.stringify(proxyTarget.body) : undefined
       });
     } catch {
       if (!isFastApi) {
         throw new HttpError(502, "Backend lama tidak dapat dijangkau. Mutasi dibatalkan agar tidak membuat data berbeda.");
       }
       res = null;
     }
     const payload = res ? await res.json().catch(() => ({})) : null;
     if (res && res.ok) result = payload;
     else if (res && (isMissingLegacyRoute(res, payload) || isMissingFastApiRoute(res, payload))) result = mutate((db) => fn(db)) || {};
     else if (res) throw new HttpError(res.status, apiErrorMessage(payload, "Backend menolak perubahan; data lokal tidak diubah."));
     else result = mutate((db) => fn(db)) || {};
  } else {
     result = mutate((db) => fn(db)) || {};
  }
  
  const apiUrl = fastApiBase();
  const freshOverview = await fetch(`${apiUrl}/api/v1/admin/overview`, {
    headers: { Authorization: `Bearer ${session.token}`, Accept: "application/json" },
    cache: "no-store",
  }).catch(() => null);

  const db = getDb();
  const fresh = db.admins.find((a) => a.id === admin.id) || admin;
  
  let data;
  if (freshOverview && freshOverview.ok) {
     data = svc.loadAll(db, fresh);
     const ovJson = await freshOverview.json().catch(() => ({}));
     if (ovJson.data) {
       data.overview = ovJson.data;
     }
  } else {
     const laravelUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
     const dataRes = await fetch(`${laravelUrl}/admin/bff/load-all`, {
       headers: { "Authorization": `Bearer ${session.token}`, "Accept": "application/json" }
     }).catch(() => null);
     if (dataRes && dataRes.ok) {
        data = (await dataRes.json()).data;
     } else {
        data = svc.loadAll(db, fresh);
     }
  }

  if (data) {
    if (result.system) data.system = result.system;
    else if (db.system) data.system = db.system;
  }
  
  return { ...result, data, admin: publicAdmin(fresh) };
}

function match(method, segments) {
  for (const [m, pattern, fn, roles] of routes) {
    if (m !== method) continue;
    const parts = pattern.split("/");
    if (parts.length !== segments.length) continue;
    const params = {};
    const matched = parts.every((p, i) => (p.startsWith(":") ? ((params[p.slice(1)] = segments[i]), true) : p === segments[i]));
    if (matched) return { fn, roles, params };
  }
  return null;
}

async function dispatch(request, context) {
  const { slug } = await context.params;
  const method = request.method;
  const found = match(method, slug);
  if (!found) throw new HttpError(404, "Endpoint tidak ditemukan.");
  const auth = await requireAdmin(found.roles);
  const body = ["POST", "PATCH", "PUT"].includes(method) && request.headers.get("content-length") !== "0" ? await readBody(request).catch(() => ({})) : {};
  const result = await found.fn(auth, { body, params: found.params, url: new URL(request.url) });
  return ok({ success: true, ...result });
}

const handler = handle(dispatch);
export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const DELETE = handler;
