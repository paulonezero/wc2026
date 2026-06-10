# PROGRESS — WC2026 SS

## Current goal
Ship the v1 sweepstake app in time for draw day on **2026-06-11**. The app is already deployed; ongoing work is incremental polish.

## Most recent change
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
2. Host login → Admin → Teams → "By group" shows the **official** A–L groups (e.g. group J = ARG/AUT/ALG/JOR; group L = ENG/CRO/PAN/GHA).
3. Admin → Players panel: "Seed 12 demo players" → "Open the draw". Idle screen shows the **tier preview** with the top tier highlighted in gold at the top, weakest at the bottom; subtitle reads "4 tiers by FIFA rank, bottom-up". Try also with a non-divisor count (e.g. seed 12 then remove 2 to get 10 players — preview should show 5 tiers, top tier short with 8 teams).
4. Hit "Run the draw". Verify the new flow: tier-intro splash announces "BOTTOM TIER · Weakest by FIFA ranking" with its 12 flag set → drum shows only that tier's remaining flags ("12 left in this tier") → flag pops → name reel → land. Across the tier, the **players-this-tier strip** dims each avatar with a ✓ tick once they've received, gold pulse on the current pick. Between tiers, the banner shifts to "TIER 2 of 4" and a fresh intro splash plays.
5. Relaxed/Normal/Quick segment changes pace (tier-intro respects speed); Pause/Next manual step still works mid-tier and across tier boundaries; "Skip all" jumps to done with all piles filled.
6. After the draw, each player's pile shows their teams in pull order (bottom-tier acquired first, top-tier last). Currency still €, sign-up hero pot label still uses `state.currency`/`state.pot`, `POOL_NAME` env still drives pool identity.

## Open / future work (from ARCHITECTURE.md §9 + survey)
- **Reset/clear polish.** ~~Existing "Reset pool" button works (full wipe via debounced `save`). Gaps: no per-player remove UI (helper `Store.removePlayer` at `store.js:54` is unused); no partial reset that keeps pool config;~~ Per-player remove + seed + partial-clear shipped this session. Still missing: no dedicated server `reset` action (the local clearPlayers + debounced save will push the cleared state to the backend).
- **Knockout-stage fixtures auto-generation.** Currently manual via the "Who's still in" toggle grid (`screens2.jsx:270–286`).
- **Real results feed.** Disabled placeholder button at `screens2.jsx:328`; integration would just write `state.scores[fixtureId] = {hs, as}` and toggle `teams[code].status`.
- **Optimistic concurrency on save** (`pool.js:82–87` is last-write-wins).
- **Vite migration** if in-browser Babel becomes a constraint.
- **Self-host flag images** if offline robustness matters.

## Next step
User runs `npx netlify dev` and verifies the 6 checks above. Once happy, commit (`sweepstake/data.js`, `sweepstake/store.js`, `sweepstake/screens1.jsx`, `sweepstake/styles.css`, `PROGRESS.md`) and optionally `git clean -fd merge_to_repo/`.
