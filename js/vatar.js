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

/**
 * Checks whether this Vatar player already owns the Premium Pass,
 * independent of this device's local save. `available: false` means we
 * couldn't get a definitive answer (no session, or the request failed) —
 * callers must treat that as "unknown", never as "confirmed not premium",
 * so a transient network/server hiccup can never downgrade a player who
 * already owns the pass.
 */
export async function checkPremiumEntitlement() {
  const session = await freshSession();
  if (!session) return { available: false, premium: false };
  const result = await callFunction("/entitlement", { session });
  // callFunction swallows JSON parse failures into {} (see its own
  // .catch), so a malformed/truncated 200 response is otherwise
  // indistinguishable from a legitimate { premium: false } — checking
  // the field's actual type, not just truthiness, keeps that case in
  // the "unknown" bucket too instead of reading as a confirmed non-owner.
  if (!result.ok || typeof result.data?.premium !== "boolean") {
    return { available: false, premium: false };
  }
  return { available: true, premium: result.data.premium };
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

/**
 * Restores interrupted purchases and brings state.premium in line with
 * what Vatar says this player owns. Mutates state.premium directly;
 * callers own saving/logging/redrawing, since those are app concerns
 * this module otherwise stays free of. Returns whether it changed.
 */
export async function syncPremiumFromVatar(state) {
  await restoreInterruptedPurchases();
  const { available, premium } = await checkPremiumEntitlement();
  if (!available || premium === state.premium) return false;
  state.premium = premium;
  return true;
}

let retryAttempted = false;

/**
 * If the one startup initVatar() attempt (see main.js's start()) failed,
 * allows exactly one retry for the rest of the session — initVatar()
 * itself only caches on success, so a transient handshake hiccup is
 * safely retryable. Session-wide, not per-screen-instance: a host that
 * can never embed (e.g. the standalone GitHub Pages link, which still
 * loads the SDK script and so passes isVatarAvailable()) only ever pays
 * for one extra failed attempt total, not one on every Bank screen visit.
 * Returns null when there was nothing to do (already known, already
 * retried, or no SDK script present) — callers should only redraw when
 * they get a real result back.
 */
export async function retryInitIfNeeded(state) {
  if (isEmbeddedInLagosLife() || retryAttempted || !isVatarAvailable()) return null;
  retryAttempted = true;
  const info = await initVatar();
  if (!info) return null;
  const premiumChanged = await syncPremiumFromVatar(state);
  return { premiumChanged };
}
