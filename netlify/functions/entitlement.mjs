import { getStore } from "@netlify/blobs";
import { vatarApi, json } from "./_shared/vatarApi.mjs";

/**
 * Called on every game load (when running inside Lagos Life) to restore
 * Premium Pass status for this Vatar player, independent of this device's
 * localStorage — a player who switches phones or clears site data should
 * still see their purchase.
 */
export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const SECRET = process.env.VATAR_SECRET;
  if (!SECRET) return json(500, { error: "server_misconfigured" });

  let body;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "bad_request" });
  }

  const { session } = body || {};
  if (!session) return json(400, { error: "bad_request" });

  const me = await vatarApi("/session/verify", { session }, SECRET);
  if (me.http !== 200) return json(401, { error: "bad_session" });

  const store = getStore("entitlements");
  const entry = await store.get(me.playerId, { type: "json" });

  return json(200, { premium: Boolean(entry && entry.premium) });
};

export const config = { path: "/entitlement" };
