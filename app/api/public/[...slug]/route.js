import { NextResponse } from "next/server";
import { handle, ok, readBody } from "@/lib/http";
import { HttpError } from "@/lib/auth";
import { getDb, mutate } from "@/lib/db";
import * as svc from "@/lib/service";

/**
 * API publik untuk Website & aplikasi Android CariKostKita (tanpa login admin).
 *  GET  /api/public/ads?platform=website|android      iklan yang sedang tayang
 *  POST /api/public/ads/:id/event                     {type:"impression"|"click", platform}
 *  GET  /api/public/settings                          info website/kontak
 *  GET  /api/public/kosts                             kost berstatus Aktif
 *  POST /api/public/owners/register                   pendaftaran pemilik (status Pending)
 *  GET  /api/public/owners/:id/eligibility            apakah pemilik boleh menambah kost
 *  POST /api/public/owners/:id/kosts                  pemilik menambah kost (hanya jika Verified)
 *  POST /api/public/reports                           pengguna melapor kost
 */
const CORS = {
  "Access-Control-Allow-Origin": process.env.PUBLIC_API_ORIGIN || "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const pub = (data, status = 200) => ok(data, status, CORS);

async function dispatch(request, context) {
  const { slug } = await context.params;
  const url = new URL(request.url);
  const key = `${request.method} ${slug.map((s, i) => (slug.length === 3 && i === 1 ? ":id" : s)).join("/")}`;
  const id = slug[1];

  switch (key) {
    case "GET ads":
      return pub({ ads: svc.publicAds(getDb(), url.searchParams.get("platform")) });
    case "POST ads/:id/event": {
      const body = await readBody(request);
      mutate((db) => svc.recordAdEvent(db, id, body.type, body.platform));
      return pub({ success: true });
    }
    case "GET landing":
    case "GET settings": {
      const localSystem = getDb().system || {};
      const apiUrl = (process.env.CARIKOSTKITA_API_URL || "https://carikostkitafastapi.vercel.app").replace(/\/$/, "");
      let remoteSettings = {};
      try {
        const res = await fetch(`${apiUrl}/api/v1/public/settings`, { cache: "no-store" });
        if (res.ok) {
          const payload = await res.json();
          remoteSettings = payload.data || payload || {};
        }
      } catch {}
      // The durable store wins for every field it defines. The local db.json
      // is a mirror only: letting it override the store is what made an admin
      // edit disappear from the landing page on the next save.
      const merged = { ...localSystem, ...remoteSettings };
      return pub({ settings: merged });
    }
    case "GET realtime-config": {
      // Browser-safe Realtime wiring (channel, event, and the public anon
      // Supabase credentials when the backend can prove they are anon-only).
      const apiUrl = (process.env.CARIKOSTKITA_API_URL || "https://carikostkitafastapi.vercel.app").replace(/\/$/, "");
      let config = {};
      try {
        const res = await fetch(`${apiUrl}/api/v1/public/settings/realtime`, { cache: "no-store" });
        if (res.ok) {
          const payload = await res.json();
          config = payload.data || payload || {};
        }
      } catch {}
      return pub({ config });
    }
    case "GET kosts": {
      const db = getDb();
      const kosts = db.kosts.filter((k) => k.status === "Aktif").map((k) => ({ ...k, ownerName: db.owners.find((o) => o.id === k.ownerId)?.name || "" }));
      return pub({ kosts });
    }
    case "POST owners/register": {
      const body = await readBody(request);
      const owner = mutate((db) => svc.registerOwner(db, body));
      return pub({ owner: { id: owner.id, verificationStatus: owner.verificationStatus } }, 201);
    }
    case "GET owners/:id/eligibility": {
      const owner = getDb().owners.find((o) => o.id === id);
      if (!owner) throw new HttpError(404, "Pemilik tidak ditemukan.");
      let canAddKost = true;
      let message = "";
      try { svc.assertOwnerCanAddKost(owner); } catch (e) { canAddKost = false; message = e.message; }
      return pub({ canAddKost, verificationStatus: owner.verificationStatus, rejectReason: owner.rejectReason, message });
    }
    case "POST owners/:id/kosts": {
      const body = await readBody(request);
      const kost = mutate((db) => svc.createKost(db, null, body, id));
      return pub({ kost: { id: kost.id, status: kost.status } }, 201);
    }
    case "POST reports": {
      const body = await readBody(request);
      const report = mutate((db) => svc.createReport(db, body));
      return pub({ report: { id: report.id, status: report.status } }, 201);
    }
    default:
      throw new HttpError(404, "Endpoint tidak ditemukan.");
  }
}

const wrapped = handle(dispatch, CORS);

export const GET = wrapped;
export const POST = wrapped;
export const OPTIONS = () => new NextResponse(null, { status: 204, headers: CORS });
