# PROGRESS — WC2026 SS

## Current goal
Ship the v1 sweepstake app in time for draw day on **2026-06-11**. The app is already deployed; ongoing work is incremental polish.

## Most recent change
**Morning snippet pivots to the knockout stage — survival roll-call + conditional matchup teasers.**

### Why
Group stage is over; the report should now reflect sudden death. User wants it to (a) lead with
the knockout framing, (b) call out which players are down to a handful of teams (or wiped out),
and (c) tease the upcoming sudden-death ties **including who a team *could* meet next round** now
that the bracket is known. The blocker was that no knockout bracket existed in code (group fixtures
only; KO was handled via Admin toggles / ingest eliminations).

### Decisions
- **Hardcode the real KO fixtures** (user choice) rather than derive R32 pairings from standings —
  avoids encoding FIFA's ~495-combination best-thirds allocation table. The 16 R32 pairings live as
  an **editable slot-token arrangement** (`R32` in `_bracket.js`); the rest of the tree (R16→Final)
  is derived **positionally** from that list's order.
- **Full roll-call** of every player's surviving-team count (fewest-first), not just players whose
  teams played in the window.

### How it works
- `netlify/functions/_bracket.js` (new):
  - `groupStandingsFrom(state)` → per-group order + 8 best thirds (same tiebreak as
    `_oddsEngine.groupNonQualifiersFrom`).
  - `R32` = 16 hardcoded pairings using tokens `1X`/`2X` (group winner/runner-up) and `T1..T8`
    (ranked best thirds). **EDIT this to match the official draw**; its order defines the tree.
  - `buildBracket(state)` → full 31-match tree (R32 1–16, R16 17–24, QF 25–28, SF 29–30, F 31);
    resolves tokens from standings, propagates winners using `state.teams[code].status/eliminatedRound`.
  - `knockoutContext(state)` → frontier round's ties with `{home,away}` owners, `ownerVsOwner`,
    and `couldMeetNext` (who the winner could face next round, with owners). Null pre-knockout.
- `netlify/functions/_snippetGenerator.js`:
  - Computes `playerStandings` (roll-call, fewest-remaining first) and `knockout` up front.
  - Empty overnight window now still files a **forward-looking** KO report (was a "quiet night" skip).
  - `ctx` gains `stage`/`mode`/`playerStandings`/`knockout`; LLM call + fallback factored into shared
    `finishSnippet`; `buildSystemPrompt(ctx)` swaps in knockout rules (roll-call, tie preview,
    conditional `couldMeetNext` teasers) vs the group-stage prompt. `fallbackBody` updated to match.
- `netlify/functions/_ingest.js`: added `ROUND_OF_32`/`LAST_32` → `R32` to `KO_ROUNDS` so the FIRST
  knockout round's losers are actually eliminated (previously unmapped → "teams left" wouldn't update
  after R32). `_bracket.js`'s `reachedBeyond` already understands `R32`. ALSO now **persists KO results**:
  KO matches write `{round,home,away,hs,as,utcDate,winner,loser,pens?}` to a new `state.koMatches`
  map (keyed `R32:HOME-AWAY`), in addition to marking the loser out. `defaultState` gains `koMatches:{}`.

### KO scoreline recap (follow-up, now done)
- `_snippetGenerator.js`: in the knockout stage, `state.koMatches` whose `utcDate` falls in the morning
  window become recap `matches` (real kickoff from the feed, so they slot into the same window machinery —
  no hardcoded KO schedule). Each carries `advanced`/`knockedOut` (team+owner) and `pens`. The prompt has
  a dedicated KO-recap branch ("make the elimination the headline"); the look-ahead still follows. Order:
  KO recap → (else) look-ahead → (else) quiet.

### UI surfacing (follow-up, now done)
- `sweepstake/data.js`: browser **mirror** of `_bracket.js` — `groupStandings`, `buildBracket`,
  `knockoutContext` (+ the `KO_R32` arrangement, which must stay in sync with `_bracket.js`). Exposed on
  `window.SS`.
- `sweepstake/screens2.jsx`: new `Knockouts` screen — survival roll-call (teams remaining per player,
  "last team"/"out" tags) + frontier ties as cards (owner-vs-owner highlighted, "winner could meet next"
  chips with owners). Reuses `Crest`/`Avatar`/`TeamChip`/`SectLabel`/`Empty`.
- `sweepstake/app.jsx`: a **Knockouts** tab appears (between Standings and Stats) only once
  `groupStageComplete(state)` is true.

### Verified
- Synthetic complete-group state: bracket resolves all 32 R32 participants uniquely, 0 unresolved
  slots; `couldMeetNext` populated with owners; marking R32 away-teams out advances the frontier to
  R16 with correct winner propagation; lookahead fallback renders roll-call + next-round ties.
- KO recap path: synthesised overnight `koMatches` (incl. a penalties tie) → fallback recap names who
  beat whom + who's out, then the remaining-round look-ahead. `matchIds` populated.
- Browser `data.js` mirror produces **identical** R32 pairings/frontier to the server `_bracket.js`
  (parity harness). All 5 `.jsx` files transform cleanly under esbuild; all changed `.js` pass `node --check`.
- Group-stage (incomplete) path unchanged: `knockout` null, normal recap, no roll-call, no Knockouts tab.

### Limitations / follow-ups
- **Verify the `R32` arrangement** (in BOTH `_bracket.js` and `data.js`'s `KO_R32` — keep them in sync)
  against the official bracket before relying on exact "could meet next" chains; the seeded default is
  plausible but not authoritative.
- Confirm football-data's real stage label for the 48-team R32 (`ROUND_OF_32` vs `LAST_32`) — both are
  mapped now, but worth checking live.
- KO goal-event detail isn't captured (the ESPN goals feed maps by `FIXTURES_INDEX` id; KO ids aren't
  in it) — recaps have scorelines + pens but no scorers.

---

## Previous change
**Goalscorer feed via ESPN's public API (no key) — layered on top of football-data.org.**

### Why / source choice
football-data.org's free tier returns final scores but no goal events. We evaluated:
API-Football free tier — has full 2026 WC events BUT the free plan is **locked out of the
current season** ("try from 2022 to 2024"), so unusable; openfootball/worldcup.json — free
but hand-updated ~once a day. **ESPN's public soccer API** (league slug `fifa.world`) gives
per-match goal events — scorer, minute, type, assist — for **free, no key, no quota, live**.
Picked ESPN. Primary feed (football-data.org) unchanged: still owns scores/standings/elims.

### How it works (frugal, defensive)
- `netlify/functions/_goalsFeed.js` → `ingestGoals(state, nowMs)`:
  - Needs-goals logic from data we already have: a fixture is "finished" iff football-data
    wrote its score; expected goals = hs+as; fetch only when stored < expected (and `tries < 5`).
    0-0 finished matches are skipped (no goals to get).
  - Caches local-fixture → ESPN-event-id in `state.goalsFeed.fxMap` by fetching ESPN
    `scoreboard?dates=YYYYMMDD` (±1 day) and matching via `codeFromName` + `findFixtureId`,
    so scoreboards aren't re-fetched once known.
  - Then `summary?event=<id>` per missing fixture → maps `keyEvents[]` scoring plays to
    `{team, scorer, min, injury, type}`. ESPN credits the benefiting team on every scoring
    play (incl. own goals) so **no flip**; types: `Own Goal`→own, `Penalty - Scored`→penalty,
    `Goal`/`Goal - Header`/`Goal - Volley`→regular; minute parsed from `clock.displayValue`
    ("45'+2'" → min 45, injury 2).
  - Caps: 6 scoreboards + 8 summaries per run. Steady state (all goals stored) = **0 calls**.
- `_ingest.js` calls `ingestGoals` on both main + skip paths, in try/catch so a feed failure
  never affects scores. Counts added to summary/log.
- **No env var / key required** — works on deploy. (The football-data `mapGoals` path is left
  in as a harmless no-op fallback should that feed ever return goals.)

### Verified LIVE against real 2026 data (this change)
- All 48 ESPN team display names map cleanly to existing codes (zero gaps).
- End-to-end run through the real module: built scores for all 72 group fixtures from ESPN,
  backfilled **215 goal events across 65 fixtures** (7 genuine 0-0s skipped) in 87 ESPN calls
  total; idempotent (final run needed 0 / 0 calls). Sample gAr0m0 = Quiñones 9', Jiménez 67'.
  Live Golden Boot via `data.js`: Messi 6, Haaland/Mbappé/Vinícius 4 — all correct.
- `node --check` clean on `_goalsFeed.js` + `_ingest.js`.

### Notes
- Backfill of the ~65 existing scored fixtures runs at 8/run via the 30-min cron (~4–5h) or
  click "Fetch results now" in Admin a few times. New matches fill within a cron cycle.
- ESPN's API is unofficial (no SLA/ToS guarantee) — acceptable for a hobby pool; feed is
  fully isolated so any ESPN outage only pauses goal detail, nothing else.

---

### Prior change
**New Stats page — tournament numbers + sweepstake blend, plus goal-event capture.**

### Why
There was nowhere celebrating the *interesting numbers* of the tournament. Added a
dedicated **Stats** tab (always visible) that blends tournament-wide stats with
player-ownership ones. User asked for goalscorers/goal-times; that detail wasn't being
stored (ingest discarded everything but the final score), so the ingest now captures
goal events **defensively** — football-data's `m.goals` is tier-dependent and may be
absent, so the UI degrades to "Not available yet" for scorer/timing sections while every
score-derived stat works regardless.

### Files touched (this change)
- `netlify/functions/_ingest.js` — added `mapGoals(m)` + `normGoalType`; writes
  `state.goals[fxId]` (overwrite = idempotent) only when `m.goals` is present; drops
  goals whose team name doesn't map; `goalsWritten` counter; `goals:{}` default.
- `netlify/functions/pool.js`, `sweepstake/store.js`, `sweepstake/net.js` — `goals:{}`
  default + normalize guard so the field survives the round-trip. `store.js demoState()`
  now synthesises plausible goal events (so the Golden Boot/timing UI is testable locally).
- `sweepstake/data.js` — new pure stat fns on `window.SS`: `hasGoalData`, `allGoals`,
  `topScorers` (Golden Boot, own-goals excluded, pens tracked), `goalTimingBuckets`
  (15-min bands, stoppage folds into its half), `teamScoringTable`/`teamDefensiveTable`
  (re-sort `teamPerformanceTable`), `biggestWins`, `highestScoringMatches`,
  `tournamentHeadlines`, `perPlayerStats`, `goalOwnershipLeaders`.
- `sweepstake/screens3.jsx` — **new** `Stats` component (headliner tiles → Golden Boot →
  goal timing → best attacks/defences → biggest wins → goal fests → ownership leaders),
  reuses ui.jsx components + `.odds-row`/`.matchrow` patterns. Goal sections gate on
  `hasGoalData`; ownership section gates on `draw.done`.
- `index.html` — load `screens3.jsx`. `app.jsx` — register `stats` screen + add "Stats"
  tab to all three TABS branches (always visible).

### Verification done (this change)
- `node --check` clean on all plain-JS files; `@babel/parser` (jsx) parses all `.jsx`.
- Node harness over real fixtures/teams: every stat fn correct (timing buckets sum to
  total goals; degrade path returns empty/null). `codeFromName` maps sample names.
- **Real browser render via Playwright** (chromium): demo pool → Stats tab renders all 7
  sections, Golden Boot with crests+owners, 47 rows, no JS page errors. Degrade run
  (goals wiped) shows exactly 2 "Not available yet" cards, hides the Golden Boot
  headliner tile, keeps all score-derived sections.

### Not yet done / notes
- Goal capture is **unproven against the live football-data tier** — if `m.goals` is
  absent on the production key, scorer/timing sections stay in graceful-degrade
  (everything else still works). Confirm via *Fetch results now* once matches are live.

---

### Prior change
**Auto-eliminate group-stage non-qualifiers once the group stage is complete.**

### Why
After the group stage the win-odds leaderboard still counted all 48 teams as alive. WC2026 sends 32 to the Round of 32 (top 2 of each of 12 groups + 8 best third-placed teams); the other 16 are out. Rather than persist this via ingest (like knockout losers, which the app can't derive locally), group qualification is *fully derivable* from the group scores the app already has — so it's computed live inside `isAlive`. Every existing consumer (win odds, alive counts, Field strikethrough, /api/top3 winners, snippet) reflects it automatically, immediately, and self-corrects if a score is fixed. No ingest/persistence/normalize changes; the wooden-spoon table doesn't use `isAlive`, so it's unaffected.

Ranking for qualification: points → goal difference → goals scored → FIFA rank (deterministic last resort). Head-to-head tiebreaks are **not** modelled (consistent with the app's other simplifications); host can hand-adjust via Admin → "Who's still in" for any head-to-head edge case.

### Files touched (this change)
- `sweepstake/data.js` — added `groupNonQualifiers(state)` → Set of eliminated codes (empty until `groupStageComplete`): per-group sort, group-bottom out, 9th-best-third onward out. `isAlive` now also excludes that set. Added `_EMPTY_SET` const; exported `groupNonQualifiers` on `window.SS`.
- `netlify/functions/_oddsEngine.js` — mirrored `groupNonQualifiersFrom(state)` (reuses `groupStageCompleteFrom`).
- `netlify/functions/_snippetGenerator.js` — imports `groupNonQualifiersFrom`; its `isAlive` folds it in, so `/api/top3` winners + the snippet exclude non-qualifiers.

### Verification done (this change)
- `node --check` clean on all three; `_snippetGenerator` imports resolve (no circular dep with `_oddsEngine`).
- Node parity test (server import + client via window shim) on a fully-scored pool: both detect complete; both eliminate the **same 16** codes; both leave **32** alive; eliminations break down as 12 group-bottoms + 4 worst thirds (4 groups lose 2, rest lose 1 — totals 16); client win-prob sums to 1.0000 with the 16 eliminated teams at exactly 0.
- Not run in a real browser (no local headless browser); behaviour validated via the node harness only.

---

### Prior change
**Group stage complete: standings + wooden spoon now finalize (settled award) instead of staying projected.**

### Why
All 72 group games are in, so the spoon should be *declared*, not shown as ~14% odds. Detection is results-based: "complete" = every group fixture has a score (self-finalizing, no date flag). When complete the worst→best table ranks on **real standings** — points, then GD, then goals scored (rank 1 = wooden spoon) — instead of the GD-weighted projected `score`; the spoon becomes deterministic (bottom team → 1.0, owner reads 100%); and the Standings screen swaps the per-player odds bars for an **award card** (bottom team + crest + group tag + owner) with the final worst→best table below (real Pts/GD columns, no "Proj"/projection language). Before completion everything falls back to the old projected/odds presentation.

### Files touched (this change)
- `sweepstake/data.js` — added `groupStageComplete(state)` (every group fixture scored) and `woodenSpoonResult(state)` (`{row, owner}` for rank-1 team, or null until complete). `teamPerformanceTable` now picks its sort by completion (real-standings vs projected). `woodenSpoonProbs` returns bottom-team→1.0 when complete, else the existing softmax. Exported both new helpers on `window.SS`.
- `netlify/functions/_oddsEngine.js` — mirrored: `groupStageCompleteFrom(state)`, completion-based sort in `teamPerformanceTableFrom`, deterministic `woodenSpoonProbsFrom`. `/api/top3` + `/api/top3.txt` + `snippet.js` consume these unchanged, so the public spoon finalizes automatically.
- `sweepstake/screens2.jsx` — `Standings`: pulls `groupStageComplete`/`woodenSpoonResult`; renders the award card when complete (label "Wooden Spoon", brown banner, team + owner + "X pts · GD ±Y · Z GF · bottom of all 48"); worst→best table relabels Proj pts/GD → Pts/GD, shows real per-row record, and a final-table footer. Win-odds leaderboard left untouched (still a live last-team-standing projection into the knockouts).

### Verification done (this change)
- `node --check` clean on `data.js`; esbuild JSX transform clean on `screens2.jsx`.
- Node parity test (server `_oddsEngine.js` AND client `data.js` via window shim): fully-scored pool with ARG bottom → `groupStageComplete=true`, `woodenSpoonResult` = ARG (0 pts, −15 GD, rank 1, owner Dave), spoon probs `{ARG:1}`, player probs `{owner:1, other:0}`. Clear one game → complete=false, result null, projected spoon probs sum back to 1.0. Client/server agree.
- Not run in a real browser (in-browser Babel/React via CDN, no local headless browser); JSX validated via esbuild only.

---

### Prior change
**Wooden spoon: replaced the Monte Carlo with a deterministic worst→best projected league table of all 48 teams.**

### Why
Host wanted the spoon odds driven by a single, legible ranking of every team rather than an opaque 2000-run simulation. New model: build one table that projects each team to a full three-group-game record — games already played contribute real points/goals, games still to come are projected from team strength (FIFA + form, the same number the win odds use). This puts teams that have played a different number of games (or none) on the same footing, and lets real results outweigh the projection the more a team plays. Rank everyone weakest→strongest; spoon probability is a softmax over that weakness.

### Files touched
- `sweepstake/data.js` — removed the `_poisSample` Monte Carlo `woodenSpoonProbs`. Added `_expPoints(lamFor, lamAg)` (expected points from two independent Poissons, scorelines 0..8), `teamPerformanceTable(state)` (all 48 teams sorted worst→best with `{code, group, fifa, played, pts, gf, ga, gd, projPts, projGf, projGd, score, rank}`; rank 1 = weakest), and a new deterministic `woodenSpoonProbs(state)` = softmax over `-score/SPOON_TEMP`, where `score = projPts + SPOON_GD_W·projGd`. Constants `SPOON_TEMP=1.6`, `SPOON_GD_W=0.12` (tunable). `playerSpoonProbs` unchanged (still sums `woodenSpoonProbs` by owner). Exported `teamPerformanceTable` on `window.SS`. The `runs` arg is gone — `woodenSpoonProbs(state)` is now deterministic.
- `netlify/functions/_oddsEngine.js` — mirrored line-for-line: dropped `_poisSample`, added `_expPoints`, `teamPerformanceTableFrom(state)`, and the softmax `woodenSpoonProbsFrom(state)`. Same constants. `playerSpoonProbsFrom` unchanged. top3 endpoints already call `woodenSpoonProbsFrom(state)` without a runs arg, so no caller change needed.
- `sweepstake/screens2.jsx` — added `teamPerformanceTable` to the destructure; `perfTable` computed alongside the spoon probs. Rewrote the spoon "How this is calculated" footer to describe the projected-table method + a worked example. Added a new collapsible **Team ranking · worst → best** card below the spoon odds (`showRank` state, default hidden): one row per team — rank, crest, name + group tag (+ "you" tag if owned by the viewer), played count, projected points (1dp), projected GD, subtitle of real record so far or "projected from FIFA + form". Top 3 ranks tinted brown. Reuses the existing `Crest` component + `.odds-*` classes — no CSS change.

### Verification done
- `node --check` clean on `data.js` + `_oddsEngine.js`; `@babel/parser` (jsx) clean on `screens2.jsx`.
- Node smoke (server engine + client `data.js` via vm stub — exact parity):
  - Pre-tournament (no scores): spoon probs sum to 1.000000; all 48 `played==0`; worst 5 = NZL/HAI/CUW/GHA/JOR (lowest FIFA) at ~11→7%; best 3 = FRA/ESP/ARG at ~0.03%. Projected points span 0.47 (weakest) → 8.20 (strongest) over 3 games.
  - With 2 results (MEX 0-4 RSA, ESP 0-1 CPV): sum still 1.0. Cape Verde's shock win lifts them from a bottom team to rank 24 (proj 4.31, spoon 0.7%); Spain's single loss barely moves them (rank 33, proj 5.15). Played-count distribution mixed (44×0, 4×1) — confirms uneven games-played handling and pure-FIFA projection for teams yet to play.

### Earlier this session
**Public top-3 endpoints: `GET /api/top3` (JSON) and `GET /api/top3.txt` (plain text) — top 3 players by win odds + top 3 by wooden-spoon odds.**

### Why
Host wants to curl the two ranked tables from Standings (winner + wooden spoon) into external consumers (Teams, dashboards, bots) — same shape as the existing `/api/snippet` + `/api/snippet.txt` pair. Both are per-player rollups: `playerWinProbs` was already ported server-side in `_snippetGenerator.js`; the wooden-spoon Monte Carlo wasn't.

### Files touched
- `netlify/functions/_teamsCatalog.js` — added `group` field to each of the 48 entries (was just `{name, fifa}`). Needed so the server-side Monte Carlo can bucket teams into groups. Mirrors the `group` column in `sweepstake/data.js:TEAMS`.
- `netlify/functions/_snippetGenerator.js` — added `export` to `formDelta`, `formMap`, `isAlive`, `teamWinProbsFrom`, `playerWinProbsFrom` (no logic change). The new top3 endpoints reuse them.
- `netlify/functions/_oddsEngine.js` (new) — server-side spoon Monte Carlo. Exports `formMap(state)` (state-based; walks FIXTURES_INDEX), `woodenSpoonProbsFrom(state, runs=2000)` mirroring `sweepstake/data.js:woodenSpoonProbs` line-for-line, and `playerSpoonProbsFrom(state, teamProbs)` for the per-player rollup. Groups bucketed via `TEAMS_CATALOG[code].group`; per-group fixtures bucketed via `fx.id.charAt(1)` (id pattern `g<A-L>r<0-2>m<N>`). The `formMap` in here is state-based to match the client signature — `_snippetGenerator.js` keeps its window-filtered variant. Two formMap helpers on the server is deliberate: the snippet generator needs to compute "before/after" form for a time window, the odds endpoint needs all-time form. Same `formDelta` math.
- `netlify/functions/top3.js` (new) — GET-only handler at `path: "/api/top3"`. Reads pool blob; on pre-draw (no players or `draw.done === false`) returns `{generatedAt, winners: [], spoons: []}` with 200 (no 404). Otherwise computes `formMap → teamWinProbs → playerWinProbs` and `woodenSpoonProbsFrom → playerSpoonProbsFrom`, returns top 3 of each as `[{playerId, name, probability}, …3]`. CORS open, `cache-control: no-store` — same posture as `snippet.js`.
- `netlify/functions/top3-text.js` (new) — plain-text twin at `path: "/api/top3.txt"`. Same logic, body shape:
  ```
  Winner odds (top 3):
  1. Alice — 28%
  ...
  Wooden spoon odds (top 3):
  1. Dave — 23%
  ...
  ```
  Pre-draw returns `"no-draw\n"` with 200, matching `snippet-text.js`'s `"no-snippet\n"` style. Uses the same `fp2` formatter as the UI (1dp under 10%, whole % otherwise).

### Verification done
- `node --check` clean on all 5 files.
- Smoke harness with fabricated state (8 players, 48 teams round-robin, 2 played fixtures): formMap correctly accumulates form (MEX -13, RSA +11, ARG +17, ALG -16); team-win probs sum to 1.0; player-win probs sum to 1.0; spoon team probs (500 runs for speed) sum to 1.0 with HAI/NZL/CUW/GHA at the top as expected (lowest FIFA); player spoon probs sum to 1.0. Final top3 JSON shape matches the spec.
- Pre-draw safety: `formMap` on empty state returns all-zero map; `playerSpoonProbsFrom` returns `{}`. Handlers early-return before the expensive Monte Carlo.
- No `netlify.toml` edit — path config auto-routes (same as snippet endpoints).

### Files unchanged
`sweepstake/*`, `pool.js`, `snippet.js`, `snippet-text.js`, `_fixturesIndex.js`, `_ingest.js`, `fetch-results*.js`, `generate-snippet*.js`, `index.html`, `netlify.toml`.

### Earlier this session
**Standings: clearer "How this is calculated" footer on both odds tables, with a worked example.**

### Why
The previous footers were one-liners ("Softmax over FIFA + recent form…" / "2000-run Monte Carlo…"). Useful for a maths-y reader, opaque to the rest of the pool. Host asked for plain-English explanations with a concrete example so any player can read the table and instantly understand where their number came from.

### Files touched
- `sweepstake/screens2.jsx` — replaced both footer one-liners with a two-paragraph block: a bold "How this is calculated" heading + the rule, then a "Example." paragraph with real-feeling numbers. Border-top dashed separator + slightly larger line-height to differentiate the explainer from the rows above. No new CSS — uses inline styles on the existing `.mono muted` container.
  - Team win odds: walks through Spain (FIFA 1874, form +12) vs Argentina (1876, +0) to show how the form bump compounds exponentially.
  - Wooden Spoon: walks through "Curaçao spoons in 240 of 2000 runs → 12%; if the same owner also holds Haiti (8%) + Cape Verde (3%), total risk ≈ 23%".

### Verification done
`@babel/parser` (jsx plugin) clean. No CSS changes; reuses existing `.mono muted`, `.odds-row` styling.

### Files unchanged
`data.js`, `styles.css`, `screens1.jsx`, `app.jsx`, `store.js`, `net.js`, `ui.jsx`, `index.html`, `netlify/functions/*`.

### Earlier this session
**Standings: per-row breakdown subtitle on both odds tables — show *how* each % was computed.**

### Why
Both odds tables (Team win odds, Wooden Spoon odds) showed a percentage but not the inputs. Adding a tiny mono subtitle under each row's name makes the calculation legible at a glance — FIFA + form for team-win, top contributing teams for player-spoon.

### Files touched
- `sweepstake/styles.css` — `.odds-name` flipped from a single-line ellipsised text cell to a `display:flex; flex-direction:column; gap:2px` container 170px wide. Added two child rules: `.odds-name .odds-title` (the existing bold uppercase title styling, now scoped) and `.odds-name .odds-sub` (10.5px DM Mono, muted, single-line ellipsised). Both odds tables share these classes — no per-section bespoke styling.
- `sweepstake/screens2.jsx` —
  - Top-of-file destructure: dropped unused `playerSpoonProbs`, added `woodenSpoonProbs` + `formMap: getForm`. Added local `signed(n)` helper for `"+12"` / `"-7"` form rendering.
  - `Standings`: replaced the previous `playerSpoonProbs(state)` call with a single `woodenSpoonProbs(state)` Monte Carlo pass + local roll-up to players (was running the sim twice — once in `playerSpoonProbs`, once internally — now once). `form = getForm(state)` for the team-row subtitle. Added `spoonBreakdown(pid)` helper: sorts the player's teams by spoon prob desc, returns up to 3 entries above 0.05% as `"CUW 12% · HAI 8% · CPV 3%"`, falls back to `"all teams ~0%"` for players whose teams are all top-tier.
  - Team win odds rows: name cell now `<div className="odds-name"><div className="odds-title">{name}</div><div className="odds-sub">FIFA {fifa} · form {signed(form)}</div></div>`. Footer copy updated: "Softmax over FIFA + recent form. Each row's % = exp((FIFA + form) / 95) ÷ sum across alive teams."
  - Wooden Spoon odds rows: same name-cell shape, subtitle = `spoonBreakdown(p.id)`. Footer copy: "2000-run Monte Carlo over the rest of the group stage. Each player's % is the sum of their teams' spoon probs (shown beneath the name)."

### Verification done
- `@babel/parser` (jsx plugin) clean on both touched files.
- Node smoke (fabricated 8-player drawn state, 2 played fixtures): rendered subtitles read e.g. `ARG → 14.4% | FIFA 1876 · form +0` and `P3 → 23.7% | HAI 20% · UZB 2.3% · RSA 1.0%`. Top 3 by spoon prob match the expected weakest-team owners.

### Files unchanged
`data.js` (no API change — `playerSpoonProbs` still exported for any external caller but Standings now computes the rollup locally), `screens1.jsx`, `app.jsx`, `store.js`, `net.js`, `ui.jsx`, `index.html`, `netlify/functions/*`.

### Earlier this session
**Standings: new "Wooden Spoon odds" section — per-player probability of owning the worst overall group-stage team.**

### Why
The pool's wooden spoon prize goes to whichever player owns the team that finishes bottom of its group AND has the worst overall record (lowest points → worst GD → fewest GF) across all 12 group-bottom teams. Standings only had positive odds — players had no visible read on who's most at risk. This adds a player-ranked table below "Team win odds" computed via Monte Carlo simulation that conditions on actual results so far.

### Files touched
- `sweepstake/data.js` — added `woodenSpoonProbs(state, runs=2000)`: builds per-group fixture lists from the `FIXTURES` index, then for each sim run either reads `state.scores[id]` (played) or generates Poisson goals (`lambda = clamp(1.35 ± strengthDiff*0.5, 0.25, 3.6)`) where `strengthDiff = (home.fifa+form[home] - away.fifa-form[away]) / 130`. Form-adjusted strength reuses the existing `formMap()` so the spoon odds shift with live results the same way the win odds do. Within each sim: sort group by `pts asc / gd asc / gf asc` → 4th-place team. Across 12 group bottoms: same comparator. Cross-group ties split the sim's increment equally (1/N) for zero bias. Also added `playerSpoonProbs(state)` summing team probs by owner. Both exported on `window.SS`. No new RNG — uses `Math.random()` (jitter <1pp at 2000 runs; Standings re-renders only on state change so no smoothness issue).
- `sweepstake/screens2.jsx` — added `playerSpoonProbs` to the top-of-file destructure. In `Standings`: added `showSpoon` `useState(true)`, computed `psp` + `spoonRanked` + `maxSpoon`. New section inserted after the "Team win odds" card: Show/Hide toggle matching the existing one, then a `.card` of `.odds-row`s — one per player, sorted by descending spoon probability. Reuses the existing `.odds-row`/`.odds-rk`/`.odds-crest`/`.odds-name`/`.odds-bar`/`.odds-pct` CSS — no `styles.css` change. Bar colour is brown (`#B5651D`) for #1 + muted paper for the rest (gold would falsely read as "winning"). The current user's row gets the existing "you" tag.

### Verification done
- `node --check` clean on `data.js`; `@babel/parser` (jsx plugin) clean on both touched files.
- Node smoke: fabricated drawn state (8 players, 48 teams shuffled across them, no scores). `woodenSpoonProbs` returns probabilities that sum to exactly 1.0 across teams; `playerSpoonProbs` likewise sums to 1.0 across players. Top spoon candidates were NZL/CUW/GHA/HAI — the lowest-FIFA group-stage teams — confirming the sim weights match intuition.

### Still to do (operator side)
None — pure client compute. Refresh Standings in a deployed environment after the next pool poll (≤20s) and the new section appears below the Team win odds toggle.

### Files unchanged
`netlify/functions/*`, `sweepstake/screens1.jsx`, `app.jsx`, `store.js`, `net.js`, `ui.jsx`, `styles.css`, `index.html`, `pool.js`.

### Earlier this session
**Public snippet endpoints: `GET /api/snippet` (JSON) and `GET /api/snippet.txt` (plain text) for external consumers.**

### Why
Host wants to curl the morning snippet from outside the app (e.g. to pipe into a Teams post, a personal dashboard, or another bot). The body was already reachable via `GET /api/pool`, but that returns the whole pool blob — dedicated narrow endpoints are friendlier to scripts and easier to cache/rate-limit later if needed. Two flavours: JSON for programmatic consumers, plain text for shell pipelines.

### Files touched
- `netlify/functions/snippet.js` (new) — GET-only handler at `path: "/api/snippet"`. Reads `state.snippet` from the `wc26ss` blob store. Returns `{body, generatedAt, windowStart, windowEnd, model, matchIds, playersMentioned, source, warning}` — drops the inner Anthropic raw context but preserves the user-facing fields the existing client renders. 404 with `{error:"no-snippet"}` if the blob has no snippet yet. Public; same security posture as `pool.js` GET. CORS open (`access-control-allow-origin: *`), `cache-control: no-store` so consumers always see the freshest snippet.
- `netlify/functions/snippet-text.js` (new) — GET-only handler at `path: "/api/snippet.txt"`. Same blob read, returns just `state.snippet.body` as `text/plain; charset=utf-8` with a trailing newline (handy for `curl | mail`, `curl | wc`, etc.). 404 returns `no-snippet\n`. Same CORS / cache-control posture as the JSON endpoint.

### Verification done
- `node --check` clean on both new files.
- Smoke: `curl https://<site>/api/snippet` → JSON; `curl https://<site>/api/snippet.txt` → plain prose. Before the first 08:00 UK cron tick or admin trigger, expect `404` from both.

### Next step
Deploy. Once Netlify picks up the new functions, share whichever URL fits the downstream — JSON for programmatic consumers, `.txt` for shell pipelines.

---

### Earlier this session
**Morning snippet: AI-written daily write-up of overnight results, on the Today page from 08:00 UK.**

### Why
Host wants a fun, opinionated paragraph at the top of Today each morning summarising every match that finished since 08:00 the previous day — name-checking the sweepstake players who own those teams, calling out probability swings, and pulling in earlier-tournament results to fuel rivalry banter. Generated by a Netlify scheduled function at 08:00 UK and on demand from an Admin button. Notification dispatch (Teams + email via SendGrid) is wired as opt-in env vars so future delivery is one envvar away.

### Files touched
- `netlify/functions/_teamsCatalog.js` (new) — server-side `{code → {name, fifa}}` mirror of the 48-team field in `sweepstake/data.js:TEAMS`. Needed because data.js is a browser IIFE on `window.SS`; same constraint already documented for `_fixturesIndex.js`. Edit when TEAMS changes — sync note added above the TEAMS array in `data.js`.
- `netlify/functions/_snippetGenerator.js` (new) — single export `generateSnippet({state, nowMs})`. Computes the window as "08:00 UK on (today UK − 1 day) → now" via an `Intl.DateTimeFormat` BST/GMT-robust helper (`ukWallClockToUtc`). Filters `FIXTURES_INDEX` to matches with `state.scores[id]` AND `kickoffUtcMs(fx) ∈ [windowStart, windowEnd)`. Ports the `teamWinProbs`/`playerWinProbs` math from `data.js:277-328` (SCALE=95, same formDelta/exp-softmax) so it can compute before/after probability snapshots — "before" only counts scores with kickoff < windowStart. Builds a compact context JSON (per-match owners, players touched with Δprob, priorHistory of every owned-team match before window). Calls Anthropic Messages API (`claude-sonnet-4-6`, max_tokens 700) with a punchy editorial system prompt. Falls back to a deterministic one-line-per-match template if `ANTHROPIC_API_KEY` is unset (with a `warning` field), so the feature is visible in local/dev without the key. Empty-window path skips the LLM and emits "Quiet night" copy.
- `netlify/functions/_notify.js` (new) — `dispatchSnippet(snippet, state)`. Microsoft Teams webhook + SendGrid email, both opt-in via env vars. Swallows errors and returns `{delivered, skipped, errors}` so the snippet write is never blocked by a flaky webhook.
- `netlify/functions/_snippetRunner.js` (new) — shared orchestration: load `pool` blob, call `generateSnippet`, persist as `state.snippet`, fire notifications. Cron-source idempotency: short-circuits if `state.snippet.generatedAt` already falls inside today's UK calendar day (manual force=true bypasses). Manual path always regenerates.
- `netlify/functions/generate-snippet.js` (new) — scheduled handler: `export const config = { schedule: "0 7 * * *" }` = 07:00 UTC = 08:00 BST throughout the tournament window. Calls `runSnippet({source:"cron"})`.
- `netlify/functions/generate-snippet-now.js` (new) — HTTP handler at `path: "/api/generate-snippet"`, admin-password gated (`process.env.ADMIN_PASSWORD || "2026"`), calls `runSnippet({source:"manual", force:true})`. Mirrors `fetch-results-now.js`.
- `sweepstake/net.js` — added `generateSnippetNow(password)` mirroring `fetchResultsNow` shape. Throws in local/offline mode. Exported on `window.Net`.
- `sweepstake/screens1.jsx` — added `DailySnippet` component + `timeAgo()` helper above `Today`. Renders a `.card` with a gold `borderLeft`, "Morning snippet · N hours ago" header, body split on `\n\n` into paragraphs. Inserted inside `Today` between the day header and the "Your teams out today" gold card; gated on `isLive` so it only shows on the actual current matchday (not when paging back to historical days). Reads `state.snippet` — no new endpoint, the existing 20s pool poll hydrates it.
- `sweepstake/screens2.jsx` — added `snippetBusy`/`snippetResult` state + `generateSnippet()` handler (mirrors `fetchResultsNow` flow, swaps state via `replaceState` on success). New **Morning snippet** panel inserted in the right column between "Results source" and "Pool settings": Last-generated timestamp, copy explaining the schedule + window, **Generate snippet now** button (gold), inline result mono box, and a preview card showing the current `state.snippet.body`.
- `sweepstake/data.js` — added one-line note above `TEAMS` to keep `_teamsCatalog.js` in sync. No code changes.

### Env vars to add (Netlify dashboard)
| Name | Required? | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | yes | Auth for `https://api.anthropic.com/v1/messages`. Without it, the UI shows a deterministic template fallback (still useful for dev). |
| `NOTIFY_TEAMS_WEBHOOK` | no | MS Teams incoming-webhook URL. Snippet body POSTed as `{text: "**...** \n\n body"}`. |
| `SENDGRID_API_KEY` + `NOTIFY_EMAIL_TO` + `NOTIFY_EMAIL_FROM` | no | All three required for email; missing any = email skipped. `NOTIFY_EMAIL_TO` is comma-separated. |

### Verification done
- `node --check` clean on all six new function files + modified `net.js` + `data.js`.
- Smoke test (`node --input-type=module`) of `generateSnippet` with fabricated state:
  - Owner-attached fallback body: "Cian's Germany beat Cian's Curaçao 2-0. Lisa's Netherlands drew with Paul's Japan 1-1…" — players correctly mentioned, owner-aware.
  - Window calc across four times: 06:00 BST early-morning click, 08:00 BST cron tick, 15:00 BST afternoon click → all windowStart = `2026-06-14T07:00Z` (= 08:00 BST). Winter test (09:00 GMT in Dec) → windowStart = `2026-12-09T08:00Z` (= 08:00 GMT). BST/GMT switch correct in both directions.
  - No-draw path: skipReason="no-draw", body explains the draw hasn't happened.
  - Empty-window path: skips the LLM, emits "Quiet night" copy.

### Still to do (operator side)
1. In Netlify → Site settings → Environment variables, set `ANTHROPIC_API_KEY=sk-ant-…`. Optionally set `NOTIFY_TEAMS_WEBHOOK` and/or the SendGrid trio.
2. Deploy. Confirm in Netlify → Functions that `generate-snippet` is registered as a scheduled function with cron `0 7 * * *`.
3. Smoke test: `curl -X POST https://<site>/api/generate-snippet -H 'content-type: application/json' -d '{"password":"<ADMIN_PASSWORD>"}'`. Expect `{ok:true, snippet:{...meta, model:"claude-sonnet-4-6"}, dispatch:{delivered:[...]}, state:{...}}`. Refresh Today → the snippet card appears at the top.
4. Day-after sanity: at 08:00 UK confirm the snippet body has changed (or the skip-reason is "already-generated-today" if scheduled fired before manual).

### Files unchanged
`pool.js` (passes state through verbatim — `state.snippet` rides the existing 20s GET poll), `_ingest.js`, `_fixturesIndex.js`, `_teamMap.js`, `app.jsx`, `store.js`, `ui.jsx`, `styles.css`, `index.html`. Snippet card uses existing `.card`/`.kept`/`.mono` selectors and the `--gold` accent — no new CSS.

### Earlier this session
**Results ingest: bump cron to every 30 min, but skip the football-data call when no fixture has likely finished since last fetch.**

### Why
Cron was running every 2h regardless of whether anything could have changed — most ticks were no-ops that still burned an API call. Bumping to 30-min ticks gives near-real-time results during match windows; pairing that with a skip check keeps the actual call count *lower* than the old 2h cadence (e.g. overnight UK hours = zero calls).

### Files touched
- `netlify/functions/_fixturesIndex.js` — added `ko` (ET 24h kickoff) to all 72 entries. New exports: `kickoffUtcMs(fx)` (ET kickoff → UTC ms, with EDT = UTC-4 baked in), `fixtureLikelyFinishedAt(fx, nowMs)` (kickoff + 2.5h buffer covers 90 min + ET + lateness), `GROUP_STAGE_END_ISO` ("2026-06-28T00:00:00Z"), `TOURNAMENT_END_ISO` ("2026-07-20T00:00:00Z").
- `netlify/functions/_ingest.js` — `runIngest()` accepts `{ force = false }`. Before calling football-data it scans `FIXTURES_INDEX` for pending fixtures (`!state.scores[id] && fixtureLikelyFinishedAt`). If `pending === 0` AND we're not in the KO window (between `GROUP_STAGE_END_ISO` and `TOURNAMENT_END_ISO` — KO bracket isn't in the local index so we keep polling there), the function records a `lastSkippedAt`/`lastSkipReason`/`nextKickoffAt` cursor on `state.ingest` and returns `{ ok:true, skipped:true, reason, nextKickoffAt }` without hitting the API. Successful fetches also stamp `state.ingest.lastSuccessAt` / `lastScoresWritten`.
- `netlify/functions/fetch-results.js` — `schedule` changed `0 */2 * * *` → `*/30 * * * *`. Header comment updated.
- `netlify/functions/fetch-results-now.js` — manual admin trigger now calls `runIngest({ force: true })` so the host's "Fetch results now" button always pulls, even if the skip check would say no.

### Skip reasons surfaced
- `tournament-over` — past `TOURNAMENT_END_ISO`.
- `all-scored` — every fixture in the index has a score (nothing left to fetch).
- `no-fixture-finished-since-last-fetch` — there are unscored fixtures, but none have hit kickoff+2.5h yet.

### Verification done
Node smoke test against `FIXTURES_INDEX`:
- Pre-tournament (`2026-06-10T12:00Z`, empty scores): `pending=0`, next ko = MEX-RSA `2026-06-11T19:00Z` ✓
- 30 min into MEX-RSA: `pending=0` (kickoff+2.5h not yet elapsed) ✓
- 22:00Z on 11 Jun: `pending=1` ✓
- 14 Jun 14:00Z with days 1-3 scored: `pending=1` (gDr0m1 AUS-TUR late-night, 00:00 ET on 06-14) ✓
- Same but with gDr0m1 also scored: `pending=0`, next ko = `2026-06-14T17:00Z` (GER-CUW 13:00 ET) ✓
`node --check` clean on all four touched files.

### Cost shape (rough)
Old cadence: 12 calls/day = 84/week, every day regardless of fixtures.
New cadence: still 48 ticks/day, but most skip. During a typical group-stage day with 4 matches at 13/16/19/22 ET (17/20/23 UTC + next-day 02 UTC), real calls fire ≈ from each kickoff+2.5h onward — ≈ 5–8 actual calls per match day. Off-days (10–11 Jun pre-tournament, post-group-stage gap, post-final) = 0 calls.

### Files unchanged
`pool.js`, `_teamMap.js`, `sweepstake/*` (the client doesn't care how the blob got updated — its 20s poll still picks up changes).

### Earlier this session
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
Edit the `R32` arrangement to the official WC2026 Round-of-32 draw in BOTH `netlify/functions/_bracket.js`
and `sweepstake/data.js` (`KO_R32`) — keep them identical. Then deploy and (a) open the **Knockouts** tab
to eyeball the roll-call + tie cards, and (b) trigger the morning snippet via Admin
(`POST /api/generate-snippet`, force) during the knockouts to confirm the recap + conditional matchup
teasers read well with the real `ANTHROPIC_API_KEY`. Files touched this session:
`netlify/functions/_bracket.js` (new), `_snippetGenerator.js`, `_ingest.js`, `sweepstake/data.js`,
`sweepstake/screens2.jsx`, `sweepstake/app.jsx`, `PROGRESS.md`.
