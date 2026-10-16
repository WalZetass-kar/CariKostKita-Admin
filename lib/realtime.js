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
 * Security: uses ONLY the public anon key (NEXT_PUBLIC_SUPABASE_*). The
 * service-role key is never referenced. The payload carries no content and
 * no secrets — just pointers. Publishing never throws and never blocks the
 * save confirmation toast.
 */

const CHANNEL = "landing-settings";
const EVENT = "settings_updated";

let cached = undefined;

export function getPublicSupabase() {
  if (cached !== undefined) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!url || !anonKey) {
    cached = null;
    return cached;
  }
  try {
    cached = createClient(url, anonKey);
  } catch (err) {
    console.warn("[realtime] Failed to create Supabase client:", err);
    cached = null;
  }
  return cached;
}

export function isRealtimePublishConfigured() {
  return getPublicSupabase() !== null;
}

/**
 * Publish a settings_updated broadcast. Resolves true when delivered,
 * false when Realtime is unconfigured or delivery failed. Never rejects.
 */
export function broadcastSettingsUpdated({ revision, updated_at, changedKeys } = {}) {
  return new Promise((resolve) => {
    let done = false;
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

    let channel = null;
    try {
      const supabase = getPublicSupabase();
      if (!supabase) {
        finish(false);
        return;
      }
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
