import crypto from "node:crypto";

/** sha256= + hex HMAC-SHA256 of the raw body, keyed with the webhook signing secret. */
export function verifySignature(raw, header, secret) {
  if (!header) return false;
  const want = "sha256=" + crypto.createHmac("sha256", secret).update(raw).digest("hex");
  const wantBuf = Buffer.from(want);
  const gotBuf = Buffer.from(String(header));
  if (wantBuf.length !== gotBuf.length) return false;
  return crypto.timingSafeEqual(wantBuf, gotBuf);
}
