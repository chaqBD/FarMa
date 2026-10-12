// Shared helper for calling the Vatar Games API from server functions.
// Lives in a subfolder (not directly in netlify/functions/) so Netlify
// doesn't treat it as its own deployable function.

const API_BASE = "https://lagoslife.app/api/games/v1";

export async function vatarApi(path, body, secret) {
  const res = await fetch(API_BASE + path, {
    method: body ? "POST" : "GET",
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
  });
  const json = await res.json().catch(() => ({}));
  return { http: res.status, ...json };
}

export function json(status, data) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };
}
