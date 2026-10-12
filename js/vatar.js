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

let initPromise = null; // in-flight dedup, separate from initResult (the settled cache)

/**
 * Calls Vatar.init(), exactly once no matter how many places call this
 * concurrently — concurrent callers share the same in-flight promise
 * instead of each starting a real Vatar.init() call (which would also
 * each register their own onPurchase listener, double-handling the next
 * purchase confirmation). Resets after a failure so a later legitimate
 * retry can start a fresh attempt.
 */
export function initVatar() {
  if (initResult !== null) return Promise.resolve(initResult);
  if (!isVatarAvailable()) return Promise.resolve(null);
  if (initPromise) return initPromise;

  initPromise = (async () => {
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
    } finally {
      initPromise = null;
    }
  })();
  return initPromise;
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
async function syncPremiumFromVatar(state) {
  await restoreInterruptedPurchases();
  const { available, premium } = await checkPremiumEntitlement();
  if (!available || premium === state.premium) return false;
  state.premium = premium;
  return true;
}

let syncPromise = null; // dedups the whole init-then-sync flow, same reasoning as initPromise above

/**
 * The one entry point for "make sure Vatar is initialized and, if
 * embedded, that state.premium reflects reality" — safe to call from
 * multiple places (main.js at startup, the Bank screen on every render)
 * without duplicating work or racing: every caller *during the same
 * attempt* shares the same in-flight promise, so the entitlement sync
 * that follows a successful init happens exactly once regardless of how
 * many places call this concurrently. Returns { embedded, premiumChanged }.
 *
 * A failed attempt is deliberately *not* cached permanently — each call
 * after a failure starts a fresh attempt (initVatar() itself only
 * resets its own in-flight guard on failure too, so this stays
 * consistent with it), rather than remembering a stale "never embedded"
 * answer that a later, legitimately-embedded sync could get stuck
 * behind. The cost is one extra harmless attempt per Bank screen visit
 * on a host that can never embed (e.g. the standalone GitHub Pages
 * link) — bounded by the player's own navigation, not a loop, and
 * worth it to never leave a real purchase unsynced for the rest of a
 * session over one slow handshake.
 */
export function ensureVatarSynced(state) {
  if (!syncPromise) {
    syncPromise = (async () => {
      const info = await initVatar();
      if (!info) {
        syncPromise = null;
        return { embedded: false, premiumChanged: false };
      }
      const premiumChanged = await syncPremiumFromVatar(state);
      return { embedded: true, premiumChanged };
    })();
  }
  return syncPromise;
}
