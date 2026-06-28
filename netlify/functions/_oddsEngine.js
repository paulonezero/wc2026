// Server-side odds engine: form map + wooden-spoon projected-table ranking.
// Mirrors sweepstake/data.js (formMap, formDelta, teamPerformanceTable,
// woodenSpoonProbs, playerSpoonProbs). Win-odds helpers (teamWinProbsFrom,
// playerWinProbsFrom, isAlive) live in _snippetGenerator.js — import there.
//
// IMPORTANT: when you edit teamPerformanceTable / woodenSpoonProbs / formMap /
// formDelta in sweepstake/data.js, update this file too.

import { FIXTURES_INDEX } from "./_fixturesIndex.js";
import { TEAMS_CATALOG } from "./_teamsCatalog.js";

function formDelta(goalsFor, goalsAgainst) {
  const m = goalsFor - goalsAgainst;
  if (m > 0) return 8 + Math.min(m - 1, 4) * 3;
  if (m === 0) return 2;
  return -7 + Math.max(m + 1, -4) * 3;
}

// { code → form delta } over all played fixtures in state.scores.
export function formMap(state) {
  const f = {};
  for (const code of Object.keys(TEAMS_CATALOG)) f[code] = 0;
  const scores = state?.scores || {};
  for (const fx of FIXTURES_INDEX) {
    const sc = scores[fx.id];
    if (!sc) continue;
    f[fx.home] += formDelta(sc.hs, sc.as);
    f[fx.away] += formDelta(sc.as, sc.hs);
  }
  return f;
}

const _EMPTY_SET = new Set();

// Teams eliminated at the group stage — a Set of codes, empty until every group
// game is in. WC2026 sends 32 teams to the Round of 32: the top two of each of
// the 12 groups plus the 8 best third-placed teams; the other 16 are out.
// Ranking: points, GD, goals scored, then FIFA rank (no head-to-head). Mirrors
// sweepstake/data.js:groupNonQualifiers.
export function groupNonQualifiersFrom(state) {
  if (!groupStageCompleteFrom(state)) return _EMPTY_SET;
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
  for (const r of Object.values(rec)) (byGroup[r.group] ||= []).push(r);
  const out = new Set();
  const thirds = [];
  for (const g of Object.keys(byGroup)) {
    const teams = byGroup[g].sort(better);
    if (teams[3]) out.add(teams[3].code);
    if (teams[2]) thirds.push(teams[2]);
  }
  thirds.sort(better).slice(8).forEach(t => out.add(t.code));
  return out;
}

const SPOON_TEMP = 1.6;    // softmax temperature over team weakness
const SPOON_GD_W = 0.12;   // weight of goal difference in the strength score

// True once every group fixture has a score — group stage complete, standings
// and wooden spoon are settled rather than projected. Mirrors data.js.
export function groupStageCompleteFrom(state) {
  const scores = state?.scores || {};
  for (const fx of FIXTURES_INDEX) {
    if (fx.id.charAt(0) !== "g") continue;
    if (!scores[fx.id]) return false;
  }
  return true;
}

// Expected points (3·P(win) + P(draw)) from two independent Poisson goal
// counts, summed over plausible scorelines 0..8.
function _expPoints(lamFor, lamAg) {
  const MAXG = 8;
  const pf = [], pa = [];
  let cf = Math.exp(-lamFor), ca = Math.exp(-lamAg);
  for (let k = 0; k <= MAXG; k++) {
    pf[k] = cf; pa[k] = ca;
    cf *= lamFor / (k + 1); ca *= lamAg / (k + 1);
  }
  let pw = 0, pd = 0;
  for (let h = 0; h <= MAXG; h++) {
    for (let a = 0; a <= MAXG; a++) {
      const p = pf[h] * pa[a];
      if (h > a) pw += p; else if (h === a) pd += p;
    }
  }
  return 3 * pw + pd;
}

// Worst → best ranking of all 48 teams (rank 1 = weakest). Each team is
// projected to a full 3-game group record: played games contribute real
// points/goals, unplayed games are projected from strength (FIFA + form).
// Sorted by overall strength ascending. See sweepstake/data.js for the canon.
export function teamPerformanceTableFrom(state) {
  const form = formMap(state);
  const scores = state?.scores || {};
  const strengthOf = (code) =>
    (TEAMS_CATALOG[code]?.fifa || 0) + (form[code] || 0);

  const rec = {};
  for (const code of Object.keys(TEAMS_CATALOG)) {
    rec[code] = { played: 0, pts: 0, gf: 0, ga: 0,
      projPtsAdd: 0, projGfAdd: 0, projGaAdd: 0 };
  }
  for (const fx of FIXTURES_INDEX) {
    if (fx.id.charAt(0) !== "g") continue;
    const H = rec[fx.home], A = rec[fx.away];
    if (!H || !A) continue;
    const sc = scores[fx.id];
    if (sc) {
      H.played++; A.played++;
      H.gf += sc.hs; H.ga += sc.as; A.gf += sc.as; A.ga += sc.hs;
      if (sc.hs > sc.as) H.pts += 3;
      else if (sc.hs < sc.as) A.pts += 3;
      else { H.pts += 1; A.pts += 1; }
    } else {
      const diff = (strengthOf(fx.home) - strengthOf(fx.away)) / 130;
      const lamH = Math.max(0.25, Math.min(3.6, 1.35 + diff * 0.5));
      const lamA = Math.max(0.25, Math.min(3.6, 1.35 - diff * 0.5));
      H.projPtsAdd += _expPoints(lamH, lamA); A.projPtsAdd += _expPoints(lamA, lamH);
      H.projGfAdd += lamH; H.projGaAdd += lamA;
      A.projGfAdd += lamA; A.projGaAdd += lamH;
    }
  }
  const rows = Object.keys(TEAMS_CATALOG).map(code => {
    const r = rec[code];
    const t = TEAMS_CATALOG[code];
    const gd = r.gf - r.ga;
    const projPts = r.pts + r.projPtsAdd;
    const projGf = r.gf + r.projGfAdd;
    const projGa = r.ga + r.projGaAdd;
    const projGd = projGf - projGa;
    const score = projPts + SPOON_GD_W * projGd;
    return { code, group: t.group, fifa: t.fifa, played: r.played,
      pts: r.pts, gf: r.gf, ga: r.ga, gd, projPts, projGf, projGd, score };
  });
  // Once the group stage is complete, rank on real standings (points, then goal
  // difference, then goals scored); before then on the projected strength score.
  rows.sort(groupStageCompleteFrom(state)
    ? (a, b) => a.pts - b.pts || a.gd - b.gd || a.gf - b.gf || a.fifa - b.fifa
    : (a, b) => a.score - b.score || a.projGd - b.projGd || a.projGf - b.projGf || a.fifa - b.fifa);
  rows.forEach((r, i) => { r.rank = i + 1; });
  return rows;
}

// { code → probability(0..1) } of taking the wooden spoon, a softmax over the
// worst→best ranking's weakness. Sums to 1.0 across all 48 teams.
export function woodenSpoonProbsFrom(state) {
  const rows = teamPerformanceTableFrom(state);
  const out = {};
  for (const code of Object.keys(TEAMS_CATALOG)) out[code] = 0;
  // Group stage over → the spoon is settled: the bottom team takes it for sure.
  if (groupStageCompleteFrom(state)) {
    if (rows.length) out[rows[0].code] = 1;
    return out;
  }
  const ws = rows.map(r => Math.exp(-r.score / SPOON_TEMP));
  const sum = ws.reduce((a, b) => a + b, 0) || 1;
  rows.forEach((r, i) => { out[r.code] = ws[i] / sum; });
  return out;
}

// Sum spoon probs by owner → { playerId → probability(0..1) }
export function playerSpoonProbsFrom(state, teamProbs) {
  const assignments = state?.draw?.assignments || {};
  const players = state?.players || [];
  const playerToTeams = {};
  for (const p of players) playerToTeams[p.id] = [];
  for (const [code, pid] of Object.entries(assignments)) {
    if (playerToTeams[pid]) playerToTeams[pid].push(code);
  }
  const out = {};
  for (const p of players) {
    out[p.id] = playerToTeams[p.id].reduce((a, c) => a + (teamProbs[c] || 0), 0);
  }
  return out;
}
