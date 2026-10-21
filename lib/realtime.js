import { createClient } from "@supabase/supabase-js";

/**
 * Real-time invalidation publisher for the Admin dashboard.
 *
 * Flow: admin edits landing content -> PATCH via FastAPI (this is the ONLY
 * mutation path; the database commit is confirmed by the PATCH response) ->
 * ONLY THEN publish a lightweight Broadcast event `{ revision, updated_at,
 * changed_keys }` on the public `landing-settings` channel so open Landing
 * Pages re-fetch the confirmed state instantly.
 *
 * Credentials: the public `anon` Supabase key is preferred from the build
 * time environment (`NEXT_PUBLIC_SUPABASE_*`). When those variables are not
 * configured - which is what kept the realtime path dormant - the key is
 * fetched at runtime from the backend's public Realtime endpoint. The backend
 * only publishes a key whose JWT role is exactly `anon`, so a service-role
 * key can never be exposed here.
 *
 * Security: the payload carries no content and no secrets - just pointers.
 * Publishing never throws and never blocks the save confirmation toast.
 */

const DEFAULT_CHANNEL = "landing-settings";
const DEFAULT_EVENT = "settings_updated";

let cached = undefined;
let runtimeConfigPromise = null;

const envCredentials = () => ({
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
});

const buildClient = (url, anonKey) => {
  if (!url || !anonKey) return null;
  try {
    return createClient(url, anonKey);
  } catch (err) {
    console.warn("[realtime] Failed to create Supabase client:", err);
    return null;
  }
};

/** Synchronous accessor: only returns a client when the build-time env is set. */
export function getPublicSupabase() {
  if (cached !== undefined) return cached;
  const { url, anonKey } = envCredentials();
  cached = buildClient(url, anonKey);
  if (!cached) {
    console.info(
      "[realtime] NEXT_PUBLIC_SUPABASE_* is not set; the realtime key will be fetched at runtime."
    );
  }
  return cached;
}

/** Fetch the browser-safe Realtime wiring from the backend (cached). */
export function fetchRealtimeConfig() {
  if (!runtimeConfigPromise) {
    runtimeConfigPromise = fetch("/api/public/realtime-config", {
      cache: "no-store",
      headers: { Accept: "application/json" },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const cfg = json?.config || json?.data || null;
        if (!cfg) return null;
        return {
          url: cfg.supabase_url || "",
          anonKey: cfg.supabase_anon_key || "",
          channel: cfg.channel || DEFAULT_CHANNEL,
          event: cfg.event || DEFAULT_EVENT,
        };
      })
      .catch(() => null);
  }
  return runtimeConfigPromise;
}

/**
 * Resolve a usable Supabase client: build-time env first, runtime config
 * second. Returns `{ client, channel, event }` or null when neither source
 * provides browser-safe credentials.
 */
export async function ensureRealtimeClient() {
  const envClient = getPublicSupabase();
  const config = await fetchRealtimeConfig();
  if (envClient) {
    return {
      client: envClient,
      channel: config?.channel || DEFAULT_CHANNEL,
      event: config?.event || DEFAULT_EVENT,
    };
  }
  if (!config || !config.url || !config.anonKey) return null;
  const client = buildClient(config.url, config.anonKey);
  if (!client) return null;
  return { client, channel: config.channel, event: config.event };
}

/** True when a broadcast can be delivered right now (build-time env only). */
export function isRealtimePublishConfigured() {
  return getPublicSupabase() !== null;
}

/**
 * Publish a settings_updated broadcast. Resolves true when delivered,
 * false when Realtime is unconfigured or delivery failed. Never rejects.
 */
export async function broadcastSettingsUpdated({ revision, updated_at, changedKeys } = {}) {
  const resolved = await ensureRealtimeClient();
  if (!resolved) {
    console.warn(
      "[realtime] Broadcast skipped: Supabase Realtime credentials are unavailable."
    );
    return false;
  }
  const { client: supabase, channel: CHANNEL, event: EVENT } = resolved;

  return new Promise((resolve) => {
    let done = false;
    let channel = null;
    const finish = (ok) => {
      if (done) return;
      done = true;
      try {
        clearTimeout(timer);
      } catch {}
      resolve(ok);
    };
    const timer = setTimeout(() => {
      try {
        if (channel) channel.unsubscribe();
      } catch {}
      finish(false);
    }, 6000);

    try {
      const payload = {
        revision: Number(revision ?? 0) || 0,
        updated_at: updated_at || new Date().toISOString(),
        changed_keys: Array.isArray(changedKeys) ? changedKeys.slice(0, 100) : [],
      };
      channel = supabase.channel(CHANNEL, {
        config: { broadcast: { self: false, ack: false } },
      });
      channel.subscribe(async (status) => {
        if (status !== "SUBSCRIBED") return;
        try {
          const sent = await channel.send({
            type: "broadcast",
            event: EVENT,
            payload,
          });
          console.info("[realtime] settings_updated broadcast:", sent, payload);
          setTimeout(() => {
            try {
              channel.unsubscribe();
            } catch {}
          }, 800);
          finish(sent !== false);
        } catch (err) {
          console.warn("[realtime] broadcast send failed:", err);
          finish(false);
        }
      });
    } catch (err) {
      console.warn("[realtime] broadcast setup failed:", err);
      finish(false);
    }
  });
}
