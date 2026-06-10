# WC2026 SS — deploying to Netlify

This is a **static site** (no build step). To deploy:

## Option A — drag & drop (fastest)
1. Download the project folder.
2. Go to Netlify → **Add new site → Deploy manually**.
3. Drag the whole folder onto the drop zone.
4. Done — Netlify serves `index.html` at your site root.

## Option B — Git
1. Push this folder to a GitHub repo.
2. Netlify → **Add new site → Import from Git** → pick the repo.
3. Build command: *(leave blank)* · Publish directory: `.`

`netlify.toml` already sets the publish dir and caching.

## Files
- `index.html` — the app entry (served at `/`)
- `sweepstake/*` — data, store, styles, screens
- Team flags load from `flagcdn.com` (needs internet)

## Host access
Click **Host** in the top-right and enter the access code (default **2026**,
changeable in Admin → Pool settings). NOTE: this is a *friendly gate*, not real
security — the code lives in client-side data and is visible to anyone who digs
into the page source. Fine for an office pool; don't rely on it to protect money.

## ⚠️ Important: data is per-browser
As deployed, the app stores everything in the visitor's **own browser**
(localStorage). It does **not** sync between devices — if 12 people open the
Netlify URL on their phones, each sees their *own* empty pool.

That's fine for the intended model (**host runs it on one device / shared
screen**). For true self-serve multi-device sign-ups you need a shared backend —
see the chat; Netlify Blobs + a serverless function is the clean path.
