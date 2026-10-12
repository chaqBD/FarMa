// A safe wrapper around the global Vatar SDK (window.Vatar), which is only
// defined and functional when FaRma is actually running inside the Lagos
// Life app's frame. Every function here degrades to a clear "not
// available" result instead of throwing when that isn't the case, so
// FaRma keeps working perfectly as a standalone game outside Lagos Life.

const PRODUCT_ID = "premium_pass";

let initResult = null; // { player, mode } | null, cached after the first successful init

export function isVatarAvailable() {
  return typeof window !== "undefined" && typeof window.Vatar === "object" && window.Vatar !== null;
}

/**
 * Whether FaRma is actually embedded in Lagos Life right now — unlike
 * isVatarAvailable(), which only checks that the SDK script loaded.
 * Standalone hosts (e.g. the public GitHub Pages link) still load the
 * script fine but Vatar.init() rejects with "not_framed" there, so
 * isVatarAvailable() alone isn't a safe check for whether to show
 * purchase UI. Only meaningful after initVatar() has resolved.
 */
export function isEmbeddedInLagosLife() {
  return initResult !== null;
}

export async function initVatar() {
  if (initResult !== null) return initResult;
  if (!isVatarAvailable()) return null;
  try {
    const { player, mode } = await window.Vatar.init();
    initResult = { player, mode };
    // Catches a purchase that was confirmed while the player was away
    // (e.g. they left to pay on the provider's page and the game reloaded).
    window.Vatar.onPurchase((p) => {
      if (p.productId !== PRODUCT_ID) return;
      claimPurchase(p.purchaseId).catch((err) => console.warn("claimPurchase (onPurchase) failed:", err));
    });
    return initResult;
  } catch (err) {
    console.warn("Vatar.init() unavailable:", err?.code || err);
    return null;
  }
}

export function getPlayer() {
  return initResult?.player ?? null;
}

async function freshSession() {
  if (!isVatarAvailable()) return null;
  try {
    const { session } = await window.Vatar.session();
    return session;
  } catch (err) {
    console.warn("Vatar.session() failed:", err?.code || err);
    return null;
  }
}

async function callFunction(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

async function claimPurchase(purchaseId) {
  const session = await freshSession();
  if (!session) return { ok: false };
  return callFunction("/claim", { session, purchaseId });
}

/** Checks whether this Vatar player already owns the Premium Pass, independent of this device's local save. */
export async function checkPremiumEntitlement() {
  const session = await freshSession();
  if (!session) return { available: false, premium: false };
  const result = await callFunction("/entitlement", { session });
  if (!result.ok) return { available: true, premium: false };
  return { available: true, premium: Boolean(result.data.premium) };
}

const PURCHASE_ERROR_MESSAGES = {
  cancelled: "Purchase cancelled.",
  payment_failed: "Payment didn't go through — try again.",
  owned: "You already own the Premium Pass!",
  busy: "A payment window is already open.",
  not_for_sale: "The Premium Pass isn't available for purchase right now.",
  not_framed: "Open FaRma inside Lagos Life to buy the Premium Pass.",
};

/** Opens Vatar's pay sheet for the Premium Pass and, on success, claims it with our server. */
export async function purchasePremium() {
  if (!isVatarAvailable()) {
    return { ok: false, code: "not_framed", message: PURCHASE_ERROR_MESSAGES.not_framed };
  }

  let purchase;
  try {
    purchase = await window.Vatar.purchase(PRODUCT_ID);
  } catch (err) {
    const code = err?.code || "error";
    return { ok: false, code, message: PURCHASE_ERROR_MESSAGES[code] || "Something went wrong with the purchase." };
  }

  let claimed;
  try {
    claimed = await claimPurchase(purchase.purchaseId);
  } catch (err) {
    console.warn("claimPurchase (purchasePremium) failed:", err);
    claimed = { ok: false };
  }
  if (!claimed.ok) {
    return { ok: false, code: "error", message: "Payment went through, but we couldn't confirm it. Reopen FaRma to retry." };
  }
  return { ok: true, premium: Boolean(claimed.data.premium) };
}

/** Restores a purchase that was paid but never got delivered (e.g. the game crashed right after paying). */
export async function restoreInterruptedPurchases() {
  if (!isVatarAvailable()) return;
  try {
    const list = await window.Vatar.purchases();
    const pending = list.find((p) => p.productId === PRODUCT_ID);
    if (pending) await claimPurchase(pending.purchaseId);
  } catch (err) {
    console.warn("restoreInterruptedPurchases failed:", err?.code || err);
  }
}
