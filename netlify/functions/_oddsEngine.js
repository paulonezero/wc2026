// Server-side odds engine: form map + wooden-spoon Monte Carlo.
// Mirrors sweepstake/data.js (formMap, formDelta, woodenSpoonProbs,
// playerSpoonProbs). Win-odds helpers (teamWinProbsFrom, playerWinProbsFrom,
// isAlive) live in _snippetGenerator.js — import from there.
//
// IMPORTANT: when you edit woodenSpoonProbs / formMap / formDelta in
// sweepstake/data.js, update this file too.

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

function _poisSample(lambda) {
  const Lp = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > Lp);
  return Math.min(k - 1, 6);
}

// { code → probability(0..1) } that this team finishes bottom of its group
// AND has the worst overall record across all 12 group-bottom teams (lowest
// points, then worst GD, then fewest GF). Conditions on state.scores: played
// fixtures use the real score; unplayed ones are simulated. Probabilities sum
// to 1.0 across all 48 teams.
export function woodenSpoonProbsFrom(state, runs = 2000) {
  const form = formMap(state);
  const scores = state?.scores || {};

  // group → [team codes]
  const groups = {};
  for (const [code, t] of Object.entries(TEAMS_CATALOG)) {
    (groups[t.group] = groups[t.group] || []).push(code);
  }

  // group → [group-stage fixtures] (gate on id prefix in case KO fixtures
  // are added later)
  const groupFx = {};
  for (const fx of FIXTURES_INDEX) {
    if (fx.id.charAt(0) !== "g") continue;
    const g = fx.id.charAt(1);
    (groupFx[g] = groupFx[g] || []).push(fx);
  }

  const strengthOf = (code) =>
    (TEAMS_CATALOG[code]?.fifa || 0) + (form[code] || 0);

  const tally = {};
  for (const code of Object.keys(TEAMS_CATALOG)) tally[code] = 0;
  let totalIncr = 0;

  for (let r = 0; r < runs; r++) {
    const bottoms = [];
    for (const g of Object.keys(groups)) {
      const stats = {};
      for (const c of groups[g]) stats[c] = { pts: 0, gf: 0, ga: 0, gd: 0 };
      const fxs = groupFx[g] || [];
      for (const fx of fxs) {
        let hs, as;
        const real = scores[fx.id];
        if (real) { hs = real.hs; as = real.as; }
        else {
          const diff = (strengthOf(fx.home) - strengthOf(fx.away)) / 130;
          hs = _poisSample(Math.max(0.25, Math.min(3.6, 1.35 + diff * 0.5)));
          as = _poisSample(Math.max(0.25, Math.min(3.6, 1.35 - diff * 0.5)));
        }
        stats[fx.home].gf += hs; stats[fx.home].ga += as;
        stats[fx.away].gf += as; stats[fx.away].ga += hs;
        if (hs > as) stats[fx.home].pts += 3;
        else if (hs < as) stats[fx.away].pts += 3;
        else { stats[fx.home].pts += 1; stats[fx.away].pts += 1; }
      }
      for (const c of groups[g]) stats[c].gd = stats[c].gf - stats[c].ga;
      const order = groups[g].slice().sort((a, b) =>
        stats[a].pts - stats[b].pts ||
        stats[a].gd - stats[b].gd ||
        stats[a].gf - stats[b].gf);
      const bot = order[0];
      bottoms.push({ code: bot, pts: stats[bot].pts, gd: stats[bot].gd, gf: stats[bot].gf });
    }
    bottoms.sort((a, b) => a.pts - b.pts || a.gd - b.gd || a.gf - b.gf);
    const worst = bottoms[0];
    const tied = bottoms.filter(b =>
      b.pts === worst.pts && b.gd === worst.gd && b.gf === worst.gf);
    const incr = 1 / tied.length;
    for (const t of tied) tally[t.code] += incr;
    totalIncr += 1;
  }

  const out = {};
  for (const code of Object.keys(TEAMS_CATALOG)) {
    out[code] = totalIncr ? tally[code] / totalIncr : 0;
  }
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
