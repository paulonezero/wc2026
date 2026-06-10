# PROGRESS — WC2026 SS

## Current goal
Ship the v1 sweepstake app in time for draw day on **2026-06-11**. The app is already deployed; ongoing work is incremental polish.

## Most recent change
**Mobile-view polish: new 520px breakpoint + a few inline-style → CSS-class swaps.**

### Why
On desktop / tablet the app looked good, but at phone widths (~360–414px) several layouts broke: horizontal scroll on Standings (team-odds row had a fixed 150px team-name cell, pushing the row to ~376px min width), podium names overflowed (whiteSpace:nowrap in narrow columns), the topbar squeezed the pot/host buttons, and panels kept desktop-sized padding eating the viewport.

The previous responsive layer was a single `@media(max-width:820px)` block in `index.html` that flipped multi-column grids to single-column. It didn't address true phone width. Added a second tighter `@media(max-width:520px)` block plus a small set of named classes so the media query can hit them.

### Plan file
`/Users/paulmcevoy/.claude/plans/the-app-looks-good-clever-feather.md`

### Files touched
- `index.html` — added `@media(max-width:520px)` block (shell padding, topbar, tabs, panel, matchrow, podium, sticker-grid, pile-grid, score-in, steps, confed-row, odds-row/odds-name/odds-bar, pool-grid, hero, search-row).
- `sweepstake/styles.css` — added new classes: `.podium-name`, `.odds-row` (+ `.odds-rk`, `.odds-crest`, `.odds-name`, `.odds-bar`, `.odds-pct`, `.odds-owner`), `.pool-grid`, `.confed-row`, `.hero`, `.search-row`. Desktop versions; mobile overrides live in index.html.
- `sweepstake/screens2.jsx` — podium name uses `.podium-name`; team-odds rows use `.odds-row` etc.; Standings row's name display now has `whiteSpace:nowrap + overflow:hidden + textOverflow:ellipsis`; Teams search row uses `.search-row`; confederation filter row uses `.confed-row`; Pool settings grid uses `.pool-grid`; all `fontSize:34` section headlines swapped to `clamp(26px,5.5vw,34px)`.
- `sweepstake/screens1.jsx` — hero title clamp lowered min from 40px → 32px; hero card uses `.hero` class for padding (so it can drop on mobile); both `fontSize:34` headlines (Today, Draw) → clamp; donate Easter-egg button uses inline `whiteSpace:"normal"` + `lineHeight` so the long text wraps instead of being clipped.

No changes to `data.js`, `store.js`, `net.js`, `ui.jsx`, `app.jsx`, `netlify/`, `package.json`.

## Verification (still to do by user)
1. `npx netlify dev`. Open Chrome DevTools device mode at iPhone SE (375), iPhone 12 Pro (390), Galaxy S20 (360).
2. Walk every tab signed-out and signed-in, before and after draw (Admin → "Load demo pool" flips to drawn state).
3. Check: no horizontal scroll on Standings; podium names ellipsis cleanly; topbar (brand mark + WC2026 SS + pot + Host) fits one row at 360px; tabs fit one row (horizontal-scrollable if needed); Teams search input goes full-width; sticker grid is 2 cols; admin pool-settings inputs have usable widths.
4. Confirm 820px (tablet) and 1180px (desktop) didn't regress — the new rules only fire at ≤520px.

## Open / future work (from ARCHITECTURE.md §9 + survey)
- **Reset/clear polish.** Existing "Reset pool" button works (full wipe via debounced `save`). Gaps: no per-player remove UI (helper `Store.removePlayer` at `store.js:54` is unused); no partial reset that keeps pool config; no dedicated server `reset` action.
- **Knockout-stage fixtures auto-generation.** Currently manual via the "Who's still in" toggle grid (`screens2.jsx:270–286`).
- **Real results feed.** Disabled placeholder button at `screens2.jsx:328`; integration would just write `state.scores[fixtureId] = {hs, as}` and toggle `teams[code].status`.
- **Optimistic concurrency on save** (`pool.js:82–87` is last-write-wins).
- **Vite migration** if in-browser Babel becomes a constraint.
- **Self-host flag images** if offline robustness matters.

## Next step
User verifies mobile layout end-to-end in DevTools. If anything still cramped, iterate (likely candidates: standings row gap at 16px is generous on phone; matchrow's `mt-mid` could shrink crests).
