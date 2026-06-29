// Knockout bracket model for WC2026.
//
// WC2026 sends 32 teams into a single-elimination bracket: Round of 32 → Round
// of 16 → Quarter-finals → Semi-finals → Final (plus a third-place play-off,
// which we ignore for sweepstake purposes). This module exposes, for the
// morning snippet, *which sudden-death ties are coming up* and *who a team
// could meet next round if it wins* — annotated with the sweepstake owner of
// each team so the report can tease the rivalries that might happen.
//
// The 16 Round-of-32 pairings are hardcoded below as an editable arrangement of
// "slot tokens" (group winners / runners-up / best thirds). The rest of the
// tree (R16, QF, SF, Final) is derived positionally from the ORDER of that
// list. Slot tokens resolve to concrete teams from the local group standings;
// later-round participants resolve as winners are decided. Nothing here needs
// the football-data API — group qualification is fully derivable from the
// scores the app already holds (same philosophy as data.js:groupNonQualifiers).

import { FIXTURES_INDEX } from "./_fixturesIndex.js";
import { TEAMS_CATALOG, teamName } from "./_teamsCatalog.js";
import { groupStageCompleteFrom } from "./_oddsEngine.js";

const GROUP_LETTERS = [...new Set(Object.values(TEAMS_CATALOG).map(t => t.group))].sort();

// ── Round-of-32 arrangement ──────────────────────────────────────────────────
// EDIT THIS to match the official R32 draw. Tokens:
//   "1X" / "2X" = winner / runner-up of group X
//   "T1".."T8"  = the eight best third-placed teams, T1 = best third
// The ORDER of this list defines the knockout tree: the winners of R32[0] and
// R32[1] meet in the first R16 tie, R32[2]/R32[3] in the second, and so on up
// through the Final. Each of the 32 slot tokens must appear exactly once.
const R32 = [
  { home: "1A", away: "T1" },
  { home: "1B", away: "T2" },
  { home: "1C", away: "T3" },
  { home: "1D", away: "T4" },
  { home: "1E", away: "T5" },
  { home: "1F", away: "T6" },
  { home: "1G", away: "T7" },
  { home: "1H", away: "T8" },
  { home: "1I", away: "2A" },
  { home: "1J", away: "2B" },
  { home: "1K", away: "2C" },
  { home: "1L", away: "2D" },
  { home: "2E", away: "2I" },
  { home: "2F", away: "2J" },
  { home: "2G", away: "2K" },
  { home: "2H", away: "2L" },
];

const ROUND_LABEL = {
  R32: "Round of 32",
  R16: "Round of 16",
  QF: "Quarter-final",
  SF: "Semi-final",
  F: "Final",
};
const ROUND_IDX = { R32: 0, R16: 1, QF: 2, SF: 3, F: 4 };

// ── group standings (per-group order + ranked best thirds) ───────────────────
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

// ── bracket construction + resolution ────────────────────────────────────────

// Resolve one R32 slot token to a concrete team code, or null if unknown.
function resolveToken(tok, stand) {
  let m;
  if ((m = /^([12])([A-Z])$/.exec(tok))) {
    const pos = m[1] === "1" ? 0 : 1;
    return stand.byGroup[m[2]]?.[pos]?.code || null;
  }
  if ((m = /^T([1-8])$/.exec(tok))) {
    return stand.bestThirds[Number(m[1]) - 1] || null;
  }
  return null;
}

// Did `code` survive past round `roundIdx`? Alive teams (or teams whose recorded
// elimination round is *later* than this one) advanced; a team eliminated at
// exactly this round is the loser. Unknown elimination labels are treated as
// "not yet decided" so we never over-claim a result.
function reachedBeyond(code, roundIdx, state) {
  const t = state?.teams?.[code];
  if (!t || t.status !== "out") return true;
  const er = ROUND_IDX[t.eliminatedRound];
  if (er == null) return true;
  return er > roundIdx;
}

// Build the full 31-match bracket for the current state, or null before the
// group stage is settled. Each match: { id, round, home, away, winner, loser,
// homeSrc, awaySrc, feedsId }. R32 ids 1..16, R16 17..24, QF 25..28, SF 29..30,
// F 31. home/away are concrete team codes once resolvable, else null.
export function buildBracket(state) {
  if (!groupStageCompleteFrom(state)) return null;
  const stand = groupStandingsFrom(state);

  const matches = [];
  R32.forEach((m, i) => matches.push({ id: i + 1, round: "R32", homeTok: m.home, awayTok: m.away }));
  // Later rounds: each match is fed by two earlier matches, in list order.
  const addRound = (round, count, startId, srcStart) => {
    for (let i = 0; i < count; i++) {
      matches.push({ id: startId + i, round, homeSrc: srcStart + 2 * i, awaySrc: srcStart + 2 * i + 1 });
    }
  };
  addRound("R16", 8, 17, 1);
  addRound("QF", 4, 25, 17);
  addRound("SF", 2, 29, 25);
  addRound("F", 1, 31, 29);

  const byId = {};
  for (const m of matches) byId[m.id] = m;
  // Wire feedsId (which match a winner advances into).
  for (const m of matches) {
    if (m.homeSrc) byId[m.homeSrc].feedsId = m.id;
    if (m.awaySrc) byId[m.awaySrc].feedsId = m.id;
  }

  const winners = {};
  for (const m of matches) {
    if (m.round === "R32") {
      m.home = resolveToken(m.homeTok, stand);
      m.away = resolveToken(m.awayTok, stand);
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
