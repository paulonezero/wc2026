# WC2026 SS — Architecture & Handoff Brief

> For a developer (or Claude Code) picking up this codebase. Unlike a typical
> design handoff, **these files are the real, deployable application** — not a
> mock to recreate. Build on them directly. Git is the source of truth; this
> repo auto-deploys to Netlify.

---

## 1. What this is

A **World Cup 2026 sweepstake** web app for an office pool (up to 24 players,
the 48-team tournament).

- Players **sign up with just a name** (no auth). Before the draw they see only
  a sign-up page.
- The **host** (admin) runs an animated random **draw** that deals the 48 teams
  out evenly among whoever signed up.
- After the draw, everyone sees a shared, auto-updating view:
  **Today** (yesterday's results + today's fixtures, with the player who owns
  each team), **Standings** (player leaderboard + win odds), and **Teams**.
- Scoring model: **last team standing** — your odds = the combined chance that
  one of your drawn teams wins the tournament.
- Only the host can run the draw / edit scores, gated by a server-side password.

---

## 2. Tech stack

- **Frontend:** single static `index.html` + React 18 (UMD) transpiled in-browser
  by Babel Standalone. No bundler, no build step. Component files are plain
  `.jsx`/`.js` loaded via `<script>` tags and share scope through `window.*`
  globals (each Babel `<script>` is its own scope — see how each file ends with
  `Object.assign(window, {...})`).
- **Backend:** one **Netlify Function** (`netlify/functions/pool.js`) storing a
  single shared JSON blob in **Netlify Blobs**. No external DB.
- **Hosting:** Netlify. `netlify.toml` sets publish dir `.`, functions dir
  `netlify/functions`, and maps `/api/pool` → the function.

### Why in-browser Babel (and how to evolve it)
It was built this way so the same file runs in a zero-tooling preview. For a
production codebase you may want to migrate to a real Vite + React build. That's
a legitimate refactor — if you do it, preserve the `window.SS` / `window.Store`
/ `window.Net` module boundaries described below; they're clean seams.

---

## 3. File map

```
index.html                  # entry; loads fonts, React UMD, Babel, then app scripts (order matters)
netlify.toml                # publish/functions config + /api/pool redirect
package.json                # type:module; dep: @netlify/blobs (function needs it)
netlify/functions/pool.js   # the serverless backend (GET state / POST signup|verify|save)
sweepstake/
  data.js     # window.SS — 48 teams (FIFA pts, colors, ISO flag codes), groups,
              #   fixtures schedule, odds engine, flag URL helper. PURE DATA/LOGIC.
  store.js    # window.Store — state shape, localStorage, draw computation, demo seed
  net.js      # window.Net — network layer; talks to /api/pool, falls back to
              #   localStorage when there's no backend (preview/offline)
  ui.jsx      # shared components: Crest, Sticker, Avatar, Btn, TeamChip, Bar,
              #   Owner, MatchTeam, fireConfetti, Empty
  screens1.jsx# SignUp, Today, Draw
  screens2.jsx# Standings, Teams, Admin
  app.jsx     # App root: load/poll, admin gating, tab visibility, persistence
  styles.css  # all styling + design tokens (CSS custom props)
```

Script load order in `index.html` (do not reorder):
`data.js → store.js → net.js → ui.jsx → screens1.jsx → screens2.jsx → app.jsx`.

---

## 4. Data model (the shared pool state)

One JSON object, stored server-side under blob key `pool` (store name `wc26ss`):

```js
{
  v: 2,
  poolName: "The Office Pool",
  pot: 240,
  currency: "£",
  phase: "lobby",            // "lobby" -> "drawn" (cosmetic)
  drawDate: "2026-06-11",
  players: [                 // sign-up order
    { id: "p…", name: "Sam", color: "#…", joinedAt: 0 }
  ],
  draw: {
    done: false,
    assignments: { ARG: "p…", BRA: "p…", … },  // teamCode -> playerId
    order: [ { code: "ARG", playerId: "p…" }, … ]  // reveal order for the animation
  },
  teams: { ARG: { status: "alive"|"out", eliminatedRound: null }, … },  // 48 entries
  scores: { "gAr0m0": { hs: 2, as: 1 }, … },  // fixtureId -> score
  currentDay: 1              // matchday pointer the host advances
}
```

Notes:
- **`me`** (which player you are) and the **host token** are **device-local**
  (localStorage keys `ss_wc26_me`, `ss_wc26_token`) — never stored server-side.
- Team **form/momentum is derived** from `scores` on every read (see
  `SS.formMap`), so editing or correcting a score never double-counts.
- The server's `defaultState()` leaves `teams: {}`; the client fills the 48 slots
  via `Net.normalize()` using `Store.freshTeams()`. Keep these two in sync if you
  change the team list.

---

## 5. The odds engine (`data.js`)

- `teamWinProbs(state)` → `{ code: prob }` via softmax over **alive** teams of
  `(FIFA points + derived form) / SCALE` (SCALE=95). Eliminated teams = 0 and
  drop out of the normaliser, so their share redistributes automatically.
- `playerWinProbs(state)` → sums each player's teams' probs (last-team-standing).
- `formDelta(gf, ga)` → momentum points from one result (win/draw/loss, scaled by
  margin). `formMap` replays all played fixtures to compute current form.

If you wire a **real results feed**, the only requirement is to populate
`state.scores[fixtureId] = {hs, as}` and toggle `state.teams[code].status` on
knockouts. Everything downstream recomputes.

---

## 6. Network layer & sync (`net.js` + `app.jsx`)

- On load, `Net.init()` probes `GET /api/pool` (2.5s timeout). JSON response →
  **remote mode**; anything else → **local mode** (localStorage). The same UI
  works in both.
- **Players (non-host) poll** `GET /api/pool` every 20s and on tab focus →
  near-live updates with no action.
- **Host writes** are debounced (500ms) and `POST /api/pool {action:"save",
  password, state}`. A 401 drops the host token and prompts re-login.
- Sign-up is `POST {action:"signup", name}` (public; server assigns id+color,
  rejects after draw / dupes / over cap).
- Host login is `POST {action:"verify", password}`.

**Concurrency is last-write-wins.** Fine for ~24 players. If you need stronger
guarantees, add optimistic-concurrency (version check) in the function's `save`.

---

## 7. Admin / security model

- Password lives **only** in the Netlify env var **`ADMIN_PASSWORD`** (defaults
  to `2026` if unset). Checked server-side on every `verify` and `save`.
- Players' screens contain **no write controls**; the server also rejects any
  write without the password, so the gate is real (not just UI hiding).
- The player cap is **24**, enforced silently in the function (`MAX_PLAYERS`) and
  never shown in the UI. Host runs the draw with whoever has signed up.

---

## 8. Run, test, deploy

**Local with real backend:**
```bash
npm install
npx netlify dev      # serves the site + function at localhost; Blobs works locally
```
Set a local password: `ADMIN_PASSWORD=… npx netlify dev` (or a `.env`).

**Deploy:** push to the connected GitHub repo → Netlify auto-builds
(build command blank, publish `.`). Set **`ADMIN_PASSWORD`** in Site config →
Environment variables, then redeploy.

**Smoke test shared state:** open the URL in two browsers; sign up in one, refresh
the other — the name should appear in both. Then Host-login (your password) and
run the draw.

---

## 9. Known gaps / good next tickets

- **Reset/clear-players control** for a clean start on draw day (currently you'd
  delete names individually or reset state).
- **Knockout-stage fixtures** aren't auto-generated — the schedule covers the
  group stage; knockouts are handled via the Admin "who's still in" toggles.
- **Optimistic concurrency** on save (see §6).
- **Real results feed** instead of manual entry (see §5 — clean integration point).
- **Build pipeline** migration (Vite) if the in-browser Babel approach becomes a
  constraint (see §2).
- Flags load from `flagcdn.com` (needs internet); self-host if you want offline.

---

## 10. Design tokens (in `sweepstake/styles.css`, `:root`)

Editorial-sport theme. Key custom properties:
- Surfaces: `--paper #ECF0EE`, `--paper-2`, `--paper-3`, `--card #FFFFFF`, `--navy #0E1B23`
- Ink/text: `--ink #0E1B23`, `--ink-soft #5C6B71`, `--ink-faint #9AA6AA`, `--line rgba(15,28,36,.12)`
- Accents: `--pop #0E9E55` (pitch green, primary), `--green`, `--lime #27C06E`,
  `--blue #1D6FB8`, `--gold #C99A3F` (pot/champion), `--red #D7372B` (live/danger)
- Elevation: `--shadow`, `--shadow-sm`; radius `--r 14px`
- Type: **Archivo** (display, weights 500–900), **Hanken Grotesque** (body),
  **DM Mono** (labels/figures). Loaded from Google Fonts in `index.html`.
```
```
