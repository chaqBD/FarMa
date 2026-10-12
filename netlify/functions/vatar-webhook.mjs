import { getStore } from "@netlify/blobs";
import { vatarApi, json } from "./_shared/vatarApi.mjs";
import { verifySignature } from "./_shared/signature.mjs";

const PRODUCT_ID = "premium_pass";

/**
 * A nudge, not proof (per the docs): if a player paid but closed the game
 * before purchase() resolved and claim() ran, this re-verifies the purchase
 * with Vatar's API and grants the entitlement anyway, so a flaky connection
 * at the wrong moment doesn't cost someone a purchase they already paid for.
 */
export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const WHSEC = process.env.VATAR_WEBHOOK_SECRET;
  const SECRET = process.env.VATAR_SECRET;
  if (!WHSEC || !SECRET) return json(500, { error: "server_misconfigured" });

  const raw = await req.text();
  const signature = req.headers.get("x-vatar-signature");
  if (!verifySignature(raw, signature, WHSEC)) return json(401, { error: "bad_signature" });

  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return json(400, { error: "bad_request" });
  }

  if (event.type === "purchase.paid" && event.data?.productId === PRODUCT_ID) {
    const purchase = await vatarApi(`/purchases/${encodeURIComponent(event.data.purchaseId)}`, null, SECRET);
    if (purchase.http === 200 && purchase.status !== "refunded") {
      const store = getStore("entitlements");
      await store.setJSON(purchase.playerId, { premium: true, purchaseId: purchase.id, grantedAt: Date.now() });
      // Keep Vatar's own delivery bookkeeping in sync with ours — otherwise
      // this purchase stays "undelivered" on their side forever, and
      // restoreInterruptedPurchases() keeps re-claiming it on every load.
      await vatarApi(`/purchases/${purchase.id}/deliver`, {}, SECRET);
    }
  }

  return json(200, { ok: true });
};

export const config = { path: "/vatar-webhook" };
