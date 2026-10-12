import { getStore } from "@netlify/blobs";
import { vatarApi, json } from "./_shared/vatarApi.mjs";

const PRODUCT_ID = "premium_pass";

/**
 * Called by the client right after Vatar.purchase() resolves. Verifies the
 * purchase with Vatar's own API (never trusts the client's say-so), then
 * records the entitlement in Blobs keyed by the player's Vatar id so it can
 * be restored on any device/session later (see entitlement.mjs) — Vatar's
 * own purchases() only surfaces *undelivered* purchases, so once we mark
 * this delivered we need our own record to remember who owns it.
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

  const { session, purchaseId } = body || {};
  if (!session || !purchaseId) return json(400, { error: "bad_request" });

  const me = await vatarApi("/session/verify", { session }, SECRET);
  if (me.http !== 200) return json(401, { error: "bad_session" });

  const purchase = await vatarApi(`/purchases/${encodeURIComponent(purchaseId)}`, null, SECRET);
  if (purchase.http !== 200) return json(404, { error: "not_found" });
  if (purchase.playerId !== me.playerId) return json(403, { error: "wrong_player" });
  if (purchase.productId !== PRODUCT_ID) return json(400, { error: "wrong_product" });
  if (purchase.status === "refunded") return json(409, { error: "refunded" });

  const store = getStore("entitlements");
  await store.setJSON(me.playerId, { premium: true, purchaseId: purchase.id, grantedAt: Date.now() });

  // Safe to repeat — Vatar's API returns the same answer either way.
  await vatarApi(`/purchases/${purchase.id}/deliver`, {}, SECRET);

  return json(200, { premium: true });
};

export const config = { path: "/claim" };
