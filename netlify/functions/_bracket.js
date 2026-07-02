// Knockout bracket model for WC2026.
//
// WC2026 sends 32 teams into a single-elimination bracket: Round of 32 → Round
// of 16 → Quarter-finals → Semi-finals → Final (plus a third-place play-off,
// which we ignore for sweepstake purposes). This module exposes, for the
// morning snippet, *which sudden-death ties are coming up* and *who a team
// could meet next round if it wins* — annotated with the sweepstake owner of
// each team so the report can tease the rivalries that might happen.
//
// The structure below is the OFFICIAL bracket (FIFA matches 73–103):
//   - R32 (matches 73–88): each slot is a group winner (1X), runner-up (2X) or
//     a third-placed team from one of a fixed set of candidate groups.
//   - The feed tree (which winners advance into which later match) is the
//     official, irregular pairing — NOT a naive sequential bracket.
// Group winners/runners-up resolve directly from local group standings. The
// eight third-placed slots are filled by matching the eight qualifying
// third-placed groups to the slots' candidate sets (FIFA publishes the exact
// 495-combination table; we reproduce it with a constrained matching, which is
// correct whenever the matching is unique — see assignThirds). Nothing here
// needs the football-data API: qualification is derivable from the scores the
// app already holds (same philosophy as data.js:groupNonQualifiers).
//
// SYNC NOTE: sweepstake/data.js mirrors this module (KO_R32/KO_FEEDS, bracket
// construction, championProbs) for the client's path-aware win odds — edit
// both together.

import { FIXTURES_INDEX } from "./_fixturesIndex.js";
import { TEAMS_CATALOG, teamName } from "./_teamsCatalog.js";
import { groupStageCompleteFrom } from "./_oddsEngine.js";

const GROUP_LETTERS = [...new Set(Object.values(TEAMS_CATALOG).map(t => t.group))].sort();

// ── Official Round of 32 (matches 73–88) ─────────────────────────────────────
// Internal ids 1..16 map to FIFA matches 73..88 (id = match − 72). Slot tokens:
//   "1X"/"2X" = winner / runner-up of group X
//   { t:[...] } = a third-placed team from one of the listed candidate groups
const R32 = [
  { home: "2A", away: "2B" },                         // 73
  { home: "1E", away: { t: ["A", "B", "C", "D", "F"] } }, // 74
  { home: "1F", away: "2C" },                         // 75
  { home: "1C", away: "2F" },                         // 76
  { home: "1I", away: { t: ["C", "D", "F", "G", "H"] } }, // 77
  { home: "2E", away: "2I" },                         // 78
  { home: "1A", away: { t: ["C", "E", "F", "H", "I"] } }, // 79
  { home: "1L", away: { t: ["E", "H", "I", "J", "K"] } }, // 80
  { home: "1D", away: { t: ["B", "E", "F", "I", "J"] } }, // 81
  { home: "1G", away: { t: ["A", "E", "H", "I", "J"] } }, // 82
  { home: "2K", away: "2L" },                         // 83
  { home: "1H", away: "2J" },                         // 84
  { home: "1B", away: { t: ["E", "F", "G", "I", "J"] } }, // 85
  { home: "1J", away: "2H" },                         // 86
  { home: "1K", away: { t: ["D", "E", "I", "J", "L"] } }, // 87
  { home: "2D", away: "2G" },                         // 88
];

// Official feed tree (which two earlier match winners meet). Keys/values are
// internal ids: R16 17..24 (matches 89..96), QF 25..28, SF 29..30, F 31.
const FEEDS = {
  17: [2, 5], 18: [1, 3], 19: [4, 6], 20: [7, 8],   // R16 (89–92)
  21: [11, 12], 22: [9, 10], 23: [14, 16], 24: [13, 15], // R16 (93–96)
  25: [17, 18], 26: [21, 22], 27: [19, 20], 28: [23, 24], // QF (97–100)
  29: [25, 26], 30: [27, 28],                        // SF (101–102)
  31: [29, 30],                                      // Final (103)
};

const ROUND_LABEL = {
  R32: "Round of 32", R16: "Round of 16", QF: "Quarter-final",
  SF: "Semi-final", F: "Final",
};
const ROUND_IDX = { R32: 0, R16: 1, QF: 2, SF: 3, F: 4 };
const roundOfId = (id) => id <= 16 ? "R32" : id <= 24 ? "R16" : id <= 28 ? "QF" : id <= 30 ? "SF" : "F";

// ── group standings ──────────────────────────────────────────────────────────
// Per-group order (best→worst) + the eight best third-placed codes (ranked).
// Mirrors the tiebreak in _oddsEngine.js:groupNonQualifiersFrom — points, goal
// difference, goals scored, then FIFA rank as a deterministic last resort.
export function groupStandingsFrom(state) {
  const scores = state?.scores || {};
  const rec = {};
  for (const [code, t] of Object.entries(TEAMS_CATALOG)) {
    rec[code] = { code, group: t.group, fifa: t.fifa, pts: 0, gd: 0, gf: 0 };
  }
  for (const fx of FIXTURES_INDEX) {
    if (fx.id.charAt(0) !== "g") continue;
    const sc = scores[fx.id]; if (!sc) continue;
    const H = rec[fx.home], A = rec[fx.away]; if (!H || !A) continue;
    H.gf += sc.hs; H.gd += sc.hs - sc.as; A.gf += sc.as; A.gd += sc.as - sc.hs;
    if (sc.hs > sc.as) H.pts += 3; else if (sc.hs < sc.as) A.pts += 3; else { H.pts += 1; A.pts += 1; }
  }
  const better = (a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || b.fifa - a.fifa;
  const byGroup = {};
  for (const g of GROUP_LETTERS) byGroup[g] = [];
  for (const r of Object.values(rec)) byGroup[r.group].push(r);
  const thirds = [];
  for (const g of GROUP_LETTERS) {
    byGroup[g].sort(better);
    if (byGroup[g][2]) thirds.push(byGroup[g][2]);
  }
  thirds.sort(better);
  return { byGroup, bestThirds: thirds.slice(0, 8).map(t => t.code) };
}

// Assign the qualifying third-placed groups to the eight third slots, each slot
// taking a group from its candidate set, one group per slot. Reproduces FIFA's
// allocation table via constrained backtracking (correct whenever the perfect
// matching is unique). Returns { slotId → group letter } or {} if no match.
function assignThirds(slots, qualGroups) {
  const avail = new Set(qualGroups);
  const out = {};
  const bt = (i) => {
    if (i >= slots.length) return true;
    const { id, cand } = slots[i];
    for (const g of cand) {
      if (!avail.has(g)) continue;
      avail.delete(g); out[id] = g;
      if (bt(i + 1)) return true;
      avail.add(g); delete out[id];
    }
    return false;
  };
  return bt(0) ? out : {};
}

// ── bracket construction + resolution ────────────────────────────────────────

function resolveGroupTok(tok, stand) {
  const m = /^([12])([A-Z])$/.exec(tok);
  if (!m) return null;
  const pos = m[1] === "1" ? 0 : 1;
  return stand.byGroup[m[2]]?.[pos]?.code || null;
}

// Did `code` survive past round `roundIdx`? Alive teams (or teams eliminated in
// a *later* round) advanced; a team eliminated at exactly this round is the
// loser. Unknown elimination labels count as "not yet decided" so we never
// over-claim a result.
function reachedBeyond(code, roundIdx, state) {
  const t = state?.teams?.[code];
  if (!t || t.status !== "out") return true;
  const er = ROUND_IDX[t.eliminatedRound];
  if (er == null) return true;
  return er > roundIdx;
}

// Build the full 31-match bracket for the current state, or null before the
// group stage is settled. Each match: { id, round, home, away, winner, loser,
// homeSrc, awaySrc, feedsId }. home/away are concrete team codes once
// resolvable, else null.
export function buildBracket(state) {
  if (!groupStageCompleteFrom(state)) return null;
  const stand = groupStandingsFrom(state);

  // Map each qualifying third's group → its (third-placed) team code, then slot
  // those groups into the eight third slots by their candidate sets.
  const thirdCodeOfGroup = {};
  for (const code of stand.bestThirds) thirdCodeOfGroup[TEAMS_CATALOG[code].group] = code;
  const thirdSlots = [];
  R32.forEach((m, i) => { if (typeof m.away === "object") thirdSlots.push({ id: i + 1, cand: m.away.t }); });
  const thirdGroupOfSlot = assignThirds(thirdSlots, Object.keys(thirdCodeOfGroup));

  const matches = [];
  R32.forEach((m, i) => matches.push({ id: i + 1, round: "R32", homeTok: m.home, awayTok: m.away }));
  for (const id of Object.keys(FEEDS).map(Number)) {
    matches.push({ id, round: roundOfId(id), homeSrc: FEEDS[id][0], awaySrc: FEEDS[id][1] });
  }
  matches.sort((a, b) => a.id - b.id);

  const byId = {};
  for (const m of matches) byId[m.id] = m;
  for (const m of matches) {
    if (m.homeSrc) byId[m.homeSrc].feedsId = m.id;
    if (m.awaySrc) byId[m.awaySrc].feedsId = m.id;
  }

  const winners = {};
  for (const m of matches) {
    if (m.round === "R32") {
      m.home = resolveGroupTok(m.homeTok, stand);
      if (typeof m.awayTok === "object") {
        const g = thirdGroupOfSlot[m.id];
        m.away = g ? thirdCodeOfGroup[g] : null;
      } else {
        m.away = resolveGroupTok(m.awayTok, stand);
      }
    } else {
      m.home = winners[m.homeSrc] || null;
      m.away = winners[m.awaySrc] || null;
    }
    let winner = null, loser = null;
    if (m.home && m.away) {
      const ridx = ROUND_IDX[m.round];
      const hb = reachedBeyond(m.home, ridx, state);
      const ab = reachedBeyond(m.away, ridx, state);
      if (hb && !ab) { winner = m.home; loser = m.away; }
      else if (ab && !hb) { winner = m.away; loser = m.home; }
    }
    m.winner = winner; m.loser = loser;
    winners[m.id] = winner;
  }

  return { matches, byId };
}

// ── path-aware champion odds ─────────────────────────────────────────────────
// Walk the bracket computing, for every match, the probability distribution of
// who wins it. A team's title chance is its probability of winning the final —
// which bakes in the difficulty of its specific route: reaching each round
// against the realistic distribution of opponents on its side of the draw.
//
// Pairwise model: P(A beats B) = 1 / (1 + exp((Rb − Ra) / SCALE)) with
// R = fifa + form — the Bradley–Terry form of the same exp(R/SCALE) softmax the
// pre-knockout odds use, so a two-team field gives identical numbers.

const SCALE = 95; // mirrors sweepstake/data.js:SCALE

// { code → probability(0..1) } of winning the tournament, or null before the
// bracket exists (group stage incomplete). Decided matches count as certain;
// undecided ties mix over each side's possible occupants. Sums to 1.
export function championProbsFrom(state, form) {
  const bracket = buildBracket(state);
  if (!bracket) return null;
  const rating = (c) => TEAMS_CATALOG[c].fifa + (form?.[c] || 0);
  const pBeat = (a, b) => 1 / (1 + Math.exp((rating(b) - rating(a)) / SCALE));

  const win = {}; // match id → { code → P(code wins this match) }
  for (const m of bracket.matches) {
    const homeDist = m.home ? { [m.home]: 1 } : (win[m.homeSrc] || {});
    const awayDist = m.away ? { [m.away]: 1 } : (win[m.awaySrc] || {});
    const w = {};
    if (m.winner) {
      w[m.winner] = 1;
    } else {
      for (const [h, ph] of Object.entries(homeDist)) {
        for (const [a, pa] of Object.entries(awayDist)) {
          const meet = ph * pa;
          w[h] = (w[h] || 0) + meet * pBeat(h, a);
          w[a] = (w[a] || 0) + meet * pBeat(a, h);
        }
      }
    }
    win[m.id] = w;
  }

  const out = {};
  for (const code of Object.keys(TEAMS_CATALOG)) out[code] = 0;
  for (const [code, p] of Object.entries(win[31] || {})) out[code] = p;

  // Safety net: a team the host marked out without an elimination round isn't
  // collapsed by the bracket walk — zero it and renormalise so eliminated
  // always reads exactly 0%.
  let sum = 0, dropped = 0;
  for (const code of Object.keys(out)) {
    if (out[code] > 0 && (state?.teams?.[code]?.status || "alive") !== "alive") {
      dropped += out[code]; out[code] = 0;
    }
    sum += out[code];
  }
  if (dropped > 0 && sum > 0) {
    for (const code of Object.keys(out)) out[code] /= sum;
  }
  return out;
}

// ── snippet-facing context ───────────────────────────────────────────────────

// Produce the knockout block for the morning snippet, or null before the group
// stage is complete. Shape:
//   {
//     nextRound: "Round of 32",
//     ties: [{
//       round, home:{team,code,owner}, away:{team,code,owner}, ownerVsOwner,
//       nextRound, couldMeetNext:[{team,owner}]   // who the winner could face
//     }],
//   }
// Only the current "frontier" round (the earliest round with undecided ties
// whose teams are already known) is included — that's the set of matches
// players actually face next.
export function knockoutContext(state) {
  const bracket = buildBracket(state);
  if (!bracket) return null;
  const { matches, byId } = bracket;

  const assignments = state?.draw?.assignments || {};
  const playerById = {};
  for (const p of state?.players || []) playerById[p.id] = p;
  const ownerName = (code) => {
    const pid = assignments[code];
    return pid && playerById[pid] ? playerById[pid].name : null;
  };
  const side = (code) => (code ? { team: teamName(code), code, owner: ownerName(code) } : null);

  // Candidate teams that could win a (possibly undecided) match — its concrete
  // participants if known, else recurse into the matches feeding it.
  const candidates = (matchId, depth = 0) => {
    const m = byId[matchId];
    if (!m || depth > 4) return [];
    if (m.winner) return [m.winner];
    const out = [];
    for (const [code, srcId] of [[m.home, m.homeSrc], [m.away, m.awaySrc]]) {
      if (code) out.push(code);
      else if (srcId) out.push(...candidates(srcId, depth + 1));
    }
    return out;
  };

  // The other match feeding the same next-round tie — its candidates are who
  // this tie's winner could meet next.
  const couldMeetNext = (m) => {
    if (!m.feedsId) return [];
    const feeds = byId[m.feedsId];
    const siblingId = feeds.homeSrc === m.id ? feeds.awaySrc : feeds.homeSrc;
    const seen = new Set();
    const out = [];
    for (const code of candidates(siblingId)) {
      if (seen.has(code)) continue;
      seen.add(code);
      out.push({ team: teamName(code), owner: ownerName(code) });
    }
    return out;
  };

  // Frontier = earliest round with an undecided tie whose teams are both known.
  const live = matches.filter(m => !m.winner && m.home && m.away);
  if (!live.length) return { nextRound: null, ties: [] };
  const frontierRound = live.reduce((r, m) =>
    ROUND_IDX[m.round] < ROUND_IDX[r] ? m.round : r, live[0].round);

  const ties = live
    .filter(m => m.round === frontierRound)
    .map(m => ({
      round: ROUND_LABEL[m.round],
      home: side(m.home),
      away: side(m.away),
      ownerVsOwner: !!(ownerName(m.home) && ownerName(m.away)),
      nextRound: m.feedsId ? ROUND_LABEL[byId[m.feedsId].round] : null,
      couldMeetNext: couldMeetNext(m),
    }))
    // Lead with ties that involve sweepstake players' teams.
    .sort((a, b) => tieOwnerWeight(b) - tieOwnerWeight(a));

  return { nextRound: ROUND_LABEL[frontierRound], ties };
}

function tieOwnerWeight(t) {
  return (t.ownerVsOwner ? 2 : 0) + (t.home?.owner ? 1 : 0) + (t.away?.owner ? 1 : 0);
}
