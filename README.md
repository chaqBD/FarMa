# FaRma

A text-driven Nigerian farming life-sim. Start with a little cash and a big dream, lease or buy land, and build a farm business from one plot of cassava to an agro-empire that supplies Lagos supermarkets and exports.

> "From one plot to the whole market — can you feed Lagos and still make profit?"

**Play it:** https://chaqBD.github.io/FarMa/

Full design concept: [docs/FaRma - Game Design Concept.pdf](docs/FaRma%20-%20Game%20Design%20Concept.pdf)

## Status

Early development. See open pull requests and issues for progress toward the MVP described in the design doc.

## Running locally

FaRma is a static web app (HTML/CSS/vanilla JS). Serve the repo root with any static file server and open it in a browser, e.g.:

```
npx serve .
```

## Lagos Life / Vatar integration

FaRma can run inside the [Lagos Life](https://lagoslife.app) Games app and sell a one-time **Premium Pass** through the Vatar Games SDK (70% revenue share to the developer). The game code already handles this gracefully both ways — it works identically whether or not it's embedded in Lagos Life, and the Premium UI just stays hidden/disabled outside it.

What's already built:
- `js/vatar.js` — a safe wrapper around the Vatar SDK that no-ops cleanly when FaRma isn't running inside Lagos Life
- `netlify/functions/claim.mjs`, `entitlement.mjs`, `vatar-webhook.mjs` — serverless functions that hold the secret key and verify every purchase server-side, per the Vatar docs' security requirements (a purchase is never trusted just because the client says so)
- `netlify.toml` — sends the `Content-Security-Policy: frame-ancestors …` header Vatar requires to embed the game (GitHub Pages can't send custom headers, which is why this needs Netlify)
- A Premium Pass card on the Bank screen, and a cosmetic "Premium Farmer ✨" badge once purchased

### What only you can do (steps that need your own accounts/credentials)

1. **Connect Netlify.** Go to [app.netlify.com](https://app.netlify.com), "Add new site" → "Import an existing project" → pick this GitHub repo. Netlify will read `netlify.toml` automatically; no build command needed. This gives you an HTTPS URL (e.g. `https://your-site.netlify.app`).
2. **Get your Vatar developer keys.** Sign in at the Lagos Life developer dashboard and create a draft, using your new Netlify URL as the game's HTTPS address. You'll get a **test secret** (`vtr_test_…`) and **test webhook signing secret** (`vtr_whsec_test_…`), each shown once.
3. **Set environment variables in Netlify** (Site settings → Environment variables): `VATAR_SECRET` and `VATAR_WEBHOOK_SECRET` with the values from step 2. Never commit these to the repo.
4. **Create the Product** in the Vatar dashboard with id `premium_pass` (must match exactly — it's hardcoded in `js/vatar.js` and the functions), a price (₦100–₦50,000), and a name/description.
5. **(Optional) Register the webhook address** `https://your-site.netlify.app/vatar-webhook` with your keys or in the dashboard, for extra reliability if a purchase is interrupted mid-game.
6. **Test in the sandbox** at `/developers/sandbox/<draft>`: init, a test purchase (Pay (test)), and confirm the integration checklist ticks itself off.
7. **Submit for review** once the checklist is green — needs an icon (512px square), 3–5 screenshots, and short/long descriptions.

Once Netlify is confirmed live and working, the GitHub Pages deployment can be retired (one canonical host instead of two) — flag it and that cleanup is quick.

## License

MIT — see [LICENSE](LICENSE).
