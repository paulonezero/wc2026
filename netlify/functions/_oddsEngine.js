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

const SPOON_TEMP = 1.6;    // softmax temperature over team weakness
const SPOON_GD_W = 0.12;   // weight of goal difference in the strength score

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
  rows.sort((a, b) =>
    a.score - b.score || a.projGd - b.projGd || a.projGf - b.projGf || a.fifa - b.fifa);
  rows.forEach((r, i) => { r.rank = i + 1; });
  return rows;
}

// { code → probability(0..1) } of taking the wooden spoon, a softmax over the
// worst→best ranking's weakness. Sums to 1.0 across all 48 teams.
export function woodenSpoonProbsFrom(state) {
  const rows = teamPerformanceTableFrom(state);
  const ws = rows.map(r => Math.exp(-r.score / SPOON_TEMP));
  const sum = ws.reduce((a, b) => a + b, 0) || 1;
  const out = {};
  for (const code of Object.keys(TEAMS_CATALOG)) out[code] = 0;
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
