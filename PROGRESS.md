# PROGRESS — WC2026 SS

## Current goal
Ship the v1 sweepstake app in time for draw day on **2026-06-11**. The app is already deployed; ongoing work is incremental polish and the occasional fun touch.

## Most recent change
**Easter-egg "Donate to Paul's Revolut" button on the sign-up page.**

- New `CheatModal` component at the top of `sweepstake/screens1.jsx` — fixed overlay, panel-styled card, "Busted / Nice try. / Cheating attempt logged :)" copy, `Fair enough →` dismiss button. Backdrop click and Escape both dismiss.
- New `gotcha` local state and a gold `Btn` (size sm) in the dark hero card of the SignUp fresh-form branch, label: "Donate to Paul's Revolut for a better set of teams". Disabled when no name is typed, matching the existing "I'm in →" guard.
- On modal dismiss, the existing `join()` runs — so the user is signed up exactly as if they'd clicked "I'm in →" and lands on the "You're in the pool" confirmation screen.

### Why this design
- **Purely client-side.** No `pool.js` / `net.js` / `store.js` changes — the server still sees a normal `signup` POST. The joke is presentation only.
- **No new modal infra.** The codebase has no dialog system and didn't need one — `CheatModal` is local to `screens1.jsx` and composes existing `.panel`, `.kept`, `.display`, `.muted`, `Btn` styles.
- **No CSS file changes** — every visual is inline style or existing tokens.
- **Disabled when name empty** mirrors `I'm in →` — simpler than branching the modal copy for the no-name case.

### Files touched
- `sweepstake/screens1.jsx` — added `CheatModal`, `gotcha` state, donate button below the input row, modal render in fresh-form branch.

### Plan file
`/Users/paulmcevoy/.claude/plans/consider-the-plan-in-rustling-whisper.md`

## Verification (still to do by user)
Run `npx netlify dev`, open the sign-up page. Steps in plan §Verification:
1. Type name → both CTAs enable.
2. Click donate → modal appears.
3. Click "Fair enough →" → modal closes, user signed up, lands on "You're in the pool" screen.
4. Backdrop click and Escape both dismiss with the same effect.
5. Two-browser sync: new player appears in second browser within ~20s.
6. After draw runs, the joke button no longer renders (the fresh branch is gated by `me` and `draw.done`).

## Open / future work (from ARCHITECTURE.md §9 + survey)
- **Reset/clear polish.** Existing "Reset pool" button works (full wipe via debounced `save`). Gaps: no per-player remove UI (helper `Store.removePlayer` at `store.js:54` is unused); no partial reset that keeps pool config; no dedicated server `reset` action.
- **Knockout-stage fixtures auto-generation.** Currently manual via the "Who's still in" toggle grid (`screens2.jsx:270–286`).
- **Real results feed.** Disabled placeholder button at `screens2.jsx:328`; integration would just write `state.scores[fixtureId] = {hs, as}` and toggle `teams[code].status`.
- **Optimistic concurrency on save** (`pool.js:82–87` is last-write-wins).
- **Vite migration** if in-browser Babel becomes a constraint.
- **Self-host flag images** if offline robustness matters.

## Next step
Wait for user to verify the new button locally. If approved, no follow-up; if not, iterate on copy / placement / visual treatment.
