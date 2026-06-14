# PROGRESS — WC2026 SS

## Current goal
Ship the v1 sweepstake app in time for draw day on **2026-06-11**. The app is already deployed; ongoing work is incremental polish.

## Most recent change
**Today page now derives "Today" from real UK wall-clock date, not the admin-controlled `state.currentDay` pointer.**

### Why
With the tournament underway (today = Sun 14 Jun 2026), the Today page was still showing Matchday 1 (Thu 11 Jun) because nobody had clicked the Admin "Advance day" button. Users open Today expecting to see the actual current day's fixtures; making it self-update from wall-clock removes a manual step the host kept forgetting.

### Files touched
- `sweepstake/data.js` — added `liveDay()` helper: computes UK calendar date via `toLocaleDateString("en-CA", { timeZone: "Europe/London" })`, diffs against `TOURNAMENT_START` in whole days, clamps to `[1, TOTAL_DAYS]`. Exported on `window.SS`.
- `sweepstake/screens1.jsx` — `Today` component now grabs `today = liveDay()` once per render and uses it for the initial `viewDay`, the `isLive` check, and the "Jump to today" button — instead of `state.currentDay`. `liveDay` added to the top-of-file `window.SS` destructure.

### Files unchanged
`screens2.jsx` (Admin "Matchday control" still uses `state.currentDay` — kept as a manual pointer for any features that still want admin-driven day stepping), `store.js`, `pool.js`, `netlify/functions/*`. Nothing else reads `currentDay` so behaviour elsewhere is preserved.

### Earlier this session
**Auto-results: Netlify Scheduled Function pulls finished matches from football-data.org every 2 hours and merges them into the pool blob.**

### Why
Match scores currently require the host to log in to Admin and type each one into "Enter results". User wants results to land automatically so players see them in near-real-time (existing 20s client poll picks up the new blob). Chose football-data.org free tier (API key, 10 req/min cap — we use 12 req/day). Conflict policy is **always overwrite** existing `state.scores[id]` — manual entries get replaced on the next 2h tick. Knockout-round losses also auto-mark losing team as eliminated (`state.teams[code] = {status:"out", eliminatedRound}`); group losses don't eliminate.

### Files touched
- `netlify/functions/fetch-results.js` (new) — scheduled + manual HTTP handler. `export const config = { schedule: "0 */2 * * *", path: "/api/fetch-results" }`. Reuses the same `getStore("wc26ss") / "pool"` blob `pool.js` uses. POST invocations require admin password; scheduled invocations skip auth. Skips matches unless `status === "FINISHED"` to avoid mid-match flicker (form calc replays scores deterministically). KO stages (`ROUND_OF_16` … `THIRD_PLACE`) drive eliminations only — no KO scores written until KO fixtures are added to FIXTURES. Returns `{ ok, scoresWritten, eliminations, warnings, details, at }` and `console.log`s a summary.
- `netlify/functions/_teamMap.js` (new) — football-data English name → 3-letter code. Includes defensive aliases (Turkey/Türkiye, USA/United States, South Korea/Korea Republic, Iran/IR Iran, Côte d'Ivoire/Ivory Coast, Cape Verde/Cabo Verde, Curaçao/Curacao, Czechia/Czech Republic, DR Congo/Democratic Republic of the Congo, Bosnia & Herzegovina/Bosnia and Herzegovina).
- `netlify/functions/_fixturesIndex.js` (new) — 72 `{id, date, home, away}` entries mirroring `data.js:FIXTURES`. Date is the ET-local calendar date of kickoff (late-night 00:00–05:59 ET kickoffs use `day+1` per the koSortKey rule in data.js). Exports `findFixtureId(etDate, home, away)` with a ±1 day fallback for UTC→ET edge cases. Needed because `sweepstake/data.js` is a browser IIFE on `window.SS` and can't be imported from a Netlify function.
- `sweepstake/data.js` — added one-line note above `FIXTURES` reminding future edits to keep `_fixturesIndex.js` in sync. No code changes.
- `sweepstake/net.js` — added `fetchResultsNow(password)` helper that POSTs to `/api/fetch-results` and returns the function's summary payload. Throws in local/offline mode (no API key client-side). Exported on `window.Net`.
- `sweepstake/app.jsx` — passes `token` down to `<Admin />` so the manual-fetch button can authenticate.
- `sweepstake/screens2.jsx` — replaced the disabled "Connect API feed — coming soon" placeholder in the Admin "Results source" panel with a working **Fetch results now** button (lime). New `fetchBusy`/`fetchResult` local state. On success, renders an inline mono summary box ("OK · N scores written · M eliminations · K warnings") with up to 6 warning details. Button is disabled in local/offline mode. Panel copy updated to describe the auto-fetch cadence + overwrite behaviour.

### How the manual trigger works (host side)
Admin → "Results source" panel → click **Fetch results now**. Pulls the latest from football-data.org and merges into the pool blob in the same tick. The blob change propagates to all other players' clients within their next 20s poll.

### Verification done
Node smoke test (`node --input-type=module`) confirmed: `codeFromName("Ivory Coast") === "CIV"`, `codeFromName("Korea Republic") === "KOR"`, `codeFromName("Wakanda") === null`; `FIXTURES_INDEX.length === 72`; `findFixtureId("2026-06-11", "MEX", "RSA") === "gAr0m0"`; late-night `findFixtureId("2026-06-14", "AUS", "TUR") === "gDr0m1"`; ±1 day fallback works (`findFixtureId("2026-06-15", "AUS", "TUR") === "gDr0m1"`); unknown returns `null`. `node --check fetch-results.js` passes.

### Still to do (operator side)
1. Register at football-data.org and grab a free API key.
2. In Netlify dashboard → Site settings → Environment variables, set `FOOTBALL_DATA_API_KEY=<key>`. Optionally set `WC_COMPETITION_ID` (defaults to `2000`; check `curl -H "X-Auth-Token: <key>" https://api.football-data.org/v4/competitions | jq '.competitions[] | select(.code=="WC")'` once 2026 is listed).
3. Deploy. Confirm in Netlify → Functions that `fetch-results` is registered as a scheduled function.
4. Manual smoke: `curl -X POST https://<site>/api/fetch-results -H 'content-type: application/json' -d '{"password":"<ADMIN_PASSWORD>"}'`. Expect `{ok:true, scoresWritten, eliminations, warnings, details, at}`. Patch `_teamMap.js` for any unknown-team warnings.
5. Pre-tournament dry run option: locally set `WC_COMPETITION_ID=2021` (Premier League) and run `netlify dev`. Fixture matching will fail (different teams) but every match in `warnings` confirms the fetch path works end-to-end.

### Files unchanged
`pool.js` (still the only mutation endpoint for human Admin actions — auto-results writes to the same blob alongside it), all `sweepstake/*` files, `netlify.toml` (the function's `export const config.path` makes a redirect unnecessary).

### Earlier this session
**Sign-ups close at 16 players. Cap surfaced in public SignUp + Admin Players panel; server hard-cap lowered to match.**

### Why
Server already had a silent `MAX_PLAYERS = 24` ceiling that surfaced only as a generic "Sign-ups are closed." alert on the join attempt. Host wants the front door to actually close at 16 (a clean 48 ÷ 16 = 3 teams each), with users seeing they're locked out before they type a name.

### Files touched
- `netlify/functions/pool.js` — `MAX_PLAYERS` 24 → 16; comment updated to "cap matches the client". The 409 path at `pool.js:66` unchanged — still the authoritative server check.
- `sweepstake/store.js` — added `const MAX_PLAYERS = 16` at the top of the IIFE and exported on `window.Store`. `addPlayer` now returns `null` when at the cap (was unconditional). `signUp` throws `"Sign-ups are closed."` if `addPlayer` returns null, so offline mode (`net.js:66-69` local fallback) also fails cleanly instead of nulling `state.me`. `seedPlayers` is unaffected — `DEMO_NAMES.length === 12`, so seeding always fits.
- `sweepstake/screens1.jsx` — `SignUp` reads `cap = window.Store.MAX_PLAYERS` and `full = state.players.length >= cap`. When `full` and the user isn't already in (`me` branch still hits first), the hero's input+donate block is replaced with a "Sign-ups closed · Pool is full at 16/16 · draw kicks off on <date>" pill. The `Draw day · ... · N signed up so far` mono line now reads `N/16 signed up so far` always (cap visible even pre-fill).
- `sweepstake/screens2.jsx` — Admin "Players" panel header now reads `Players · N/16`; subtitle flips to "pool full — sign-ups closed" when at cap. Add-by-name input is disabled and placeholder becomes "Pool is full" when at cap; Add button disabled in the same condition.

### Verification done
None — code-only pass. User should `npx netlify dev` and (a) sign up 16 fake players via Admin and confirm the public SignUp hero swaps to the closed-pill, (b) confirm the Admin Add button greys out at 16/16, (c) clear one player and confirm the form returns.

### Files unchanged
`net.js` (server error surfaces through existing alert), `app.jsx`, `ui.jsx`, `data.js`, `pool.js` (`sweepstake/`), `styles.css`, `index.html`. Existing signed-up users still see the "You're in the pool" confirmation when the pool fills (the `me` branch in SignUp runs before the `full` check).

### Earlier this session
**Kickoff display switched from ET to UK local time (BST, UTC+1).**

### Why
Host and players are UK-based; "HH:MM ET" forced everyone to do mental arithmetic. The user asked to display GMT-including-daylight-saving — i.e. UK wall-clock time, which during the tournament window (Thu 11 Jun → Sat 27 Jun 2026) is firmly BST/UTC+1.

### Files touched
- `sweepstake/data.js` — `fmtKo(fx)` rewritten: parses the stored ET time, adds 5h (ET=EDT=UTC−4 → BST=UTC+1 in June), formats `HH:MM BST`, and emits a `(+1)` suffix whenever the BST datetime falls on the UK calendar day AFTER the matchday's nominal date. That covers both 19:00+ ET kickoffs (wrap past UK midnight) and the 00:00–05:59 ET late-night ones (already next-ET-day morning by ESPN convention). Comment block above the fixtures array updated to document the ET-stored / BST-displayed split. Stored ET values + `koSortKey` unchanged (a constant +5h offset preserves chronological order).

### Verification done
Off-app node sanity-script ran over all 72 fixtures: 13 distinct ET kickoffs map cleanly to BST. Day 3 (Sat 13 Jun) ordering still QAT-SUI 20:00 BST → BRA-MAR 23:00 BST → HAI-SCO 02:00 BST (+1) → AUS-TUR 05:00 BST (+1).

### Files unchanged
`screens1.jsx` (`Today.FixtureRow` already calls `fmtKo(f)` — picks up the new format automatically), everything else.

### Earlier this session
**FIFA points refreshed to the 10 Jun 2026 live ranking.**

### Why
The `fifa` field in `data.js:TEAMS` was sourced from the Nov 2025 snapshot used for the Dec 5 2025 final draw. With several friendlies and qualifying play-offs since, the ranking moved (Morocco +55, Senegal +53, Algeria +66 went up; Bosnia −83, NZL −139, Ghana −92, Haiti −59 went down — among others). Refreshed all 48 entries to current points (football-ranking.com live as of 10 Jun 2026).

### Files touched
- `sweepstake/data.js` — `TEAMS` array: every `fifa` integer updated to current points; header comment now points at the 10 Jun 2026 source instead of Nov 2025. No structural changes (codes, groups, colors, ISO flags untouched).

### Impact
- Tiered draw split (`Store.computeTiers`): tier boundaries shift since they're computed from current FIFA points. Pools that haven't run the draw yet (incl. host's pre-prepared 8-player one if it re-runs) get the refreshed split. Pools already drawn keep their committed `state.draw.order` (tier annotations are persisted, not recomputed).
- Odds engine (`teamWinProbs`): probabilities in Standings now reflect current form/ranking, not the December snapshot.

### Earlier this session
**Real 2026 World Cup group-stage fixtures — replaced procedurally-generated 72-match schedule with the official ESPN/FIFA fixture list (17 matchdays, 11–27 Jun).**

### Why
The old `FIXTURES` builder in `data.js` derived matchups from a synthetic FIFA-rank rotation across 12 matchdays. With the real draw locked in, the fixtures, dates, kickoff times, and venues didn't reflect the published schedule. The host noticed the fixtures looked wrong on Today; this swaps in the canonical data.

### Files touched
- `sweepstake/data.js` —
  - `TOTAL_DAYS` bumped 12 → 17 (real group stage runs Thu 11 Jun → Sat 27 Jun).
  - Replaced the procedural `FIXTURES` builder with a hard-coded array of 72 entries via a compact `F(id, day, group, home, away, ko, venue)` helper. IDs kept in `g{L}r{R}m{M}` shape so any future server-side score keys remain stable.
  - Times stored as 24h ET. Late-night kickoffs (00:00 ET, technically *next* ET day but grouped with previous matchday per ESPN/FIFA convention) tagged via the existing `day` field.
  - Added `koSortKey(ko)` that rolls 00:00–05:59 ET past 24h so each day's matches sort chronologically (the late ones land at the end of their matchday).
  - Added `fmtKo(fx)` display helper exported on `window.SS` — renders `"HH:MM ET"` with a `(+1)` suffix when the kickoff is past ET midnight.
  - `KICKS` const kept for export compat (no longer used).
- `sweepstake/screens1.jsx` — `Today.FixtureRow` now renders `fmtKo(f)` instead of `f.ko`, so kickoffs display as `"15:00 ET"` / `"00:00 ET (+1)"`. `fmtKo` added to the `window.SS` destructure at the top.

### Verification done
Sanity-script confirmed: 72 total fixtures, 12 groups × 6 matches each, per-day counts 2/2/4/4/4/4/4/4/4/4/4/4/4/6/6/6/6 = 72, every team plays exactly its 3 group opponents (no cross-group / no self-matches), and the sort puts the late-night 00:00 ET match at the end of its matchday (e.g. day 3 → QAT-SUI 15:00 → BRA-MAR 18:00 → HAI-SCO 21:00 → AUS-TUR 00:00 (+1)).

### Files unchanged
`net.js`, `app.jsx`, `ui.jsx`, `screens2.jsx`, `store.js`, `pool.js`, `styles.css`, `index.html`. Admin "Matchday control" / "Enter results" dropdowns automatically get all 17 days because they iterate `TOTAL_DAYS`. The demo seed (`store.js:152` sets `currentDay = 8` and fills `fx.day < 8`) still works — just shows mid-R1/start-of-R2 standings instead of the old mid-R2 state. No fixture-id changes that affect existing pools (tournament hasn't started, so no real scores yet).

### Earlier this session
**`apply-prefilled-draw.mjs` — one-shot Node script to push a pre-arranged 8-player draw to a deployed pool.**

### Why
Host already has the offline draw result for one specific pool (8 players: Cian/Vera/Lisa/Jack/Paul/Karen/Ken/Leon, 6 teams each). Faster to push via API than to log in + click 48 dropdowns in the Admin "Enter draw manually" panel.

### Files touched
- `apply-prefilled-draw.mjs` (new, project root) — takes `<site-url> <admin-password>` as CLI args. GETs `/api/pool` to preserve `poolName`/`pot`/`currency`/`drawDate`, then POSTs `action:"save"` with a fresh state: 8 players with deterministic ids (`p_<name>_<ts>`), `draw.assignments` for all 48 codes, `phase:"drawn"`, fresh `teams` (all alive), empty `scores`. Hard-coded picks block + sanity checks (count=48, no dupes, full coverage). No project deps; uses built-in `fetch`.

### Earlier this session
**Admin "Enter draw manually" panel — record an offline/pre-drawn result without re-running the animation.**

### Why
A live pool already ran the physical draw offline. The host needs to enter the agreed player names and the team each got into the deployed app, without the animated draw re-rolling them. Existing flow only supported the animated draw or a full reset.

### Files touched
- `sweepstake/store.js` — added `commitManualDraw(state, picks)` where `picks` is `{teamCode: playerId}`. Iterates `TEAMS`, skips entries with no/invalid player or unknown team code, builds `{assignments, order}` with `tier:1, tierTotal:1` per entry, writes `state.draw = { done:true, ... }` and `state.phase = "drawn"`. Exported on `window.Store`.
- `sweepstake/screens2.jsx` — `Admin` component now declares `manualOpen`, `picks` (initial value = current `state.draw.assignments`), `pickCounts` (useMemo), `pickedTotal`, plus `setPick` and `commitManual` handlers. New "Enter draw manually" panel inserted in the LEFT column between **Players** and **Matchday control**. Hidden by default behind a Show/Hide toggle. When open and `state.players.length > 0`: per-player chips with live team-count, team-by-group grid (Groups A–L, sorted by FIFA desc within group) where each row shows flag + code + a player-name `<select>`, and footer with Commit/Save + Clear picks + "N/48 assigned" counter. Commit prompts a confirm (overwrite vs first commit).

### Files unchanged
`net.js`, `app.jsx`, `ui.jsx`, `index.html`, `data.js`, `styles.css`, `pool.js`, `screens1.jsx`. After-draw piles render the same since `state.draw.order` still contains `{code, playerId}` entries (tier info isn't consulted post-draw).

### Earlier this session
**Tiered draw by FIFA ranking — bottom-up, one team per player per tier, with live UI for current tier + remaining teams/players.**

### Why
Previous draw randomly dealt 48 teams into N piles, so a player could land 4 weak teams or 4 strong teams — pure luck-of-the-shuffle without any structural fairness. New scheme: split the 48-team pot into `ceil(48/players)` tiers by FIFA rank, deal bottom-tier first (each player gets one), then next tier up, top tier last. Every player ends up with one team from each tier (top tier is the short one when 48 doesn't divide cleanly). UI now also shows what's still in the pot and who hasn't drawn yet in the current tier.

### Files touched
- `sweepstake/data.js` — added two presentation helpers on `window.SS`: `tierLabel(tier, total)` ("Bottom tier" / "Tier 2" / "Top tier") and `tierSubtitle(tier, total)` ("Weakest by FIFA ranking" / null / "Strongest by FIFA ranking").
- `sweepstake/store.js` — added `computeTiers(state)` returning `{tiers, numTiers, teamsPerPlayer}` (tier 0 = lowest FIFA, last tier = highest; uneven splits put the shortfall in the top tier). Rewrote `computeDraw(state)` to walk tiers bottom-up, shuffle teams + players inside each tier, pair them, and tag each `order` entry with `{tier, tierTotal}`. Both exported on `window.Store`.
- `sweepstake/screens1.jsx` — Draw component overhaul:
  - Added 5th sub-stage `tier-intro` to the per-pick state machine; fires once before the first pick of each tier and shows a splash with the tier's flag set.
  - Added `useMemo` tier `preview` so the idle screen can render a tier-by-tier breakdown (top row at top, gold-highlighted; bottom row at bottom).
  - Header subtitle now shows tier count ("48 teams · 12 players · 4 tiers by FIFA rank, bottom-up").
  - During running: persistent tier banner ("BOTTOM TIER · Tier 1 of 4"); the drum/pot now shows only the *current* tier's remaining flags (counter says "N left in this tier"); below the reveal there's a "players still to draw this tier" row with each player's avatar — dimmed + ✓ tick once they've received, gold pulse on the current pick.
  - `STAGE_MS` gained `"tier-intro": 1900`; `advance()` jumps idx by 1 and re-enters `tier-intro` instead of `pull` when crossing a tier boundary.
- `sweepstake/styles.css` — appended ~50 lines: `.tier-banner` (+ `.top`/`.bottom` variants), `.tier-tag`/`.tier-num`, `.tier-intro` splash (title/sub/flags/meta), `.tier-players` strip with `.tier-player.got` (dim + corner tick) and `.tier-player.on` (pulse), `.tier-preview` cards for the idle screen with `.top` (gold) and `.bottom` (muted) variants, plus a `@media(max-width:640px)` stack rule.

### Files unchanged
`net.js`, `app.jsx`, `ui.jsx`, `index.html`, `screens2.jsx`, `pool.js`. Pile-grid below the stage still renders chips in pull order (so bottom-tier first, top-tier last per player — natural acquisition order). `splitCounts(n)` still returns the same teams-per-player distribution, so SignUp's "X teams each" copy is correct without changes.

### Earlier this session
**Admin "Players" panel: seed test users, add by name, per-player remove, clear all (preserving pool config).**

The pre-existing "Load demo pool" button jumped the app to a mid-tournament drawn state (day 8, mock scores) — useful for showing standings, but the host can't use it to rehearse the *draw* itself. "Reset pool" then nuked everything including pool name/pot/currency/PIN. Needed a middle ground: populate fake signups so the host can run the real draw flow, then clear those signups (preserving pool config) for the next rehearsal cycle.

Files touched in that pass:
- `sweepstake/store.js` — added `seedPlayers(state, n=12)` (idempotent: uses `DEMO_NAMES` but skips names already in the pool) and `clearPlayers(state)` (wipes players + draw + teams + scores back to lobby, preserves `poolName`/`pot`/`currency`/`adminPin`/`drawDate`). Both exported on `window.Store`.
- `sweepstake/screens2.jsx` — new "Players · N" panel in the Admin LEFT column between the draw panel and matchday control. Contains: avatar chips with × per-player remove (with confirm), name input + Add button, "Seed 12 demo players" (gold), "Clear all players" (ghost, with confirm). Shows a hint if the draw is already done, since adding/removing won't re-deal.

### Files unchanged
`net.js`, `app.jsx`, `ui.jsx`, `index.html`, `styles.css`, `pool.js`, `data.js`, `screens1.jsx`. Donate/€/`pot:0`/`POOL_NAME`/donate-button counter all untouched.

### Earlier this session
Applied `merge_to_repo/MERGE.md` — replaced `sweepstake/data.js` with the real 2026 WC field + official groups A–L, swapped the Draw component in `screens1.jsx` for the two-beat raffle (pot drum → flag pop → name reel → land) plus `DRAW_SPEEDS`/`STAGE_MS` consts and Relaxed/Normal/Quick + Pause/Next/Skip controls, updated `screens2.jsx:281` text-contrast to use the new `window.SS.textOn(t.colors[0])` helper, and appended the new draw CSS block to `styles.css`. `merge_to_repo/` is still untracked.

### Why
The design-tool branch had diverged: the repo had donate-button + € currency + `pot: 0` + `POOL_NAME` work the design tool didn't, while the design tool had real 2026 final-draw data (groups A–L, 5 Dec 2025) and a polished pot-pull → name-reel Draw animation. MERGE.md isolated four surgical steps so the donate/currency/pool features were preserved.

### Files touched
- `sweepstake/data.js` — wholesale replaced (no repo-side edits previously). Real qualified teams + official groups A–L, per-team `iso` flag codes, new `textOn(hex)` contrast helper added to `window.SS`. Removed: ITA, VEN, DEN, UKR, SRB, NGA, CMR, CRC, JAM. Added: SCO, SWE, BIH, CZE, CUW (Curaçao), HAI, CPV, RSA, COD. Snake-seeded group assignment loop deleted; groups now baked in.
- `sweepstake/screens1.jsx` — `Draw` function (lines 301–430 of old file) replaced with new version + two new top-level consts (`DRAW_SPEEDS`, `STAGE_MS`). New Draw has 4 sub-stages per pick (pull → team → spin → land), a flag-pot drum that shakes, a slot-machine name reel, Relaxed/Normal/Quick speed segment, Pause/Next manual stepping, "Skip all" jump. `SignUp` (incl. donate Easter-egg + CheatModal + `state.currency`/`state.pot`) and `Today` left exactly as-is.
- `sweepstake/screens2.jsx` — line 281 toggle-grid color: `t.ink ? "#1A1611" : "#fff"` → `window.SS.textOn(t.colors[0])` (the new data drops the per-team `ink` flag).
- `sweepstake/styles.css` — appended ~45 lines of new selectors (`.drawstage`, `.drum`, `.drum-flag`, `.drum-count`, `.beat-label`, `.pot-emoji`, `.draw-team`, `.namebox`, `.name-reel.spin/.land`, `.draw-progress`, `.seg`, `.seg-b`, `.pile-hit`) — all new, no conflicts.

Untouched (donate/currency/pool infrastructure): `sweepstake/net.js` (`bumpDonate`), `sweepstake/store.js`, `sweepstake/app.jsx`, `sweepstake/ui.jsx`, `netlify/functions/pool.js` (`bump`/`stats`, `POOL_NAME` env, `pot: 0`), `index.html`.

`merge_to_repo/` is still untracked in git — left in place so MERGE.md remains visible if needed; delete with `git clean -fd merge_to_repo/` when comfortable.

## Verification (still to do by user)
1. `npx netlify dev`. Sign-up page loads and donate button still POSTs `/api/pool` with `action:"bump"` (Network tab) — pot counter increments.
2. Host login → Admin → **Players** panel: add the offline draw's names (or seed demos). Then open the new **Enter draw manually** panel: per-player chips show 0; pick a player for each team in each Group A–L block. Counter ticks up to N/48; selected rows go cream.
3. Hit **Commit draw** → confirm. Draw status flips to "Complete ✓". Open Standings — table renders with each player's teams + odds. Open Teams → owners show against each team.
4. Re-open Admin → Enter draw manually. Picks should be pre-loaded from the just-committed draw. Change one team's owner, hit **Save changes**, confirm overwrite. Standings reflects the change.
5. Sanity-check the legacy animated draw still works: Clear all players → seed 12 → Open the draw → run it. (Manual entry just provides an alternate path; the tiered draw is unchanged.)
6. Currency still €, sign-up hero pot label still uses `state.currency`/`state.pot`, `POOL_NAME` env still drives pool identity.

## Open / future work (from ARCHITECTURE.md §9 + survey)
- **Reset/clear polish.** ~~Existing "Reset pool" button works (full wipe via debounced `save`). Gaps: no per-player remove UI (helper `Store.removePlayer` at `store.js:54` is unused); no partial reset that keeps pool config;~~ Per-player remove + seed + partial-clear shipped this session. Still missing: no dedicated server `reset` action (the local clearPlayers + debounced save will push the cleared state to the backend).
- **Knockout-stage fixtures auto-generation.** Currently manual via the "Who's still in" toggle grid (`screens2.jsx:270–286`).
- ~~**Real results feed.** Disabled placeholder button at `screens2.jsx:328`; integration would just write `state.scores[fixtureId] = {hs, as}` and toggle `teams[code].status`.~~ Shipped this session via `netlify/functions/fetch-results.js` (football-data.org, 2h cron). Placeholder button in screens2.jsx still present — could be wired up to POST `/api/fetch-results` for a manual refresh trigger in the Admin UI.
- **Optimistic concurrency on save** (`pool.js:82–87` is last-write-wins).
- **Vite migration** if in-browser Babel becomes a constraint.
- **Self-host flag images** if offline robustness matters.

## Next step
Operator: register at football-data.org, set `FOOTBALL_DATA_API_KEY` (and optionally `WC_COMPETITION_ID`) in Netlify env, deploy, then trigger `POST /api/fetch-results` with the admin password and inspect `warnings`. Patch `_teamMap.js` for any unknown team names that show up. Once verified, commit `netlify/functions/fetch-results.js`, `netlify/functions/_teamMap.js`, `netlify/functions/_fixturesIndex.js`, `sweepstake/data.js`, `PROGRESS.md`.
