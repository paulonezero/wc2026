// Supplementary goal-scorer feed via ESPN's public soccer API (no key required).
//
// football-data.org (our primary feed in _ingest.js) gives final scores but not
// goal events on the free tier, and API-Football's free tier is locked out of the
// current (2026) season. ESPN's public endpoints expose per-match goal events —
// scorer, minute, type — for free with no key and no daily quota, so we layer
// that detail on top, writing into the same state.goals[fixtureId] shape the
// Stats page reads. This module never touches scores/standings/eliminations — if
// ESPN is unreachable, the rest of the app is unaffected and the Stats goal
// sections simply stay in their "not available yet" state.
//
// Endpoints (league slug "fifa.world"):
//   scoreboard?dates=YYYYMMDD        → that day's matches + ESPN event ids
//   summary?event=<id>               → keyEvents[] incl. goals (scorer/min/type)
//
// Frugal by design: a local-fixture → ESPN-event-id map is cached in
// state.goalsFeed.fxMap so scoreboards aren't re-fetched once known; we only pull
// a match summary for FINISHED fixtures (football-data wrote a score) still
// missing goals (stored count < the known goal total). Per-run caps bound bursty
// backfills; steady state (all goals stored) makes ZERO calls.

import { codeFromName } from "./_teamMap.js";
import { findFixtureId, FIXTURES_INDEX } from "./_fixturesIndex.js";

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world";

const PER_RUN_SCOREBOARDS = 6;  // distinct days mapped per run
const PER_RUN_SUMMARIES = 8;    // match summaries fetched per run
const MAX_TRIES = 5;            // give up re-fetching a fixture after this many attempts
const TIMEOUT_MS = 12000;

// UTC ISO → ET local calendar date (YYYY-MM-DD). EDT = UTC−4 through the
// tournament window — same convention as _ingest.js / _fixturesIndex.js.
function etDateFromUtc(utcIso) {
  const t = new Date(utcIso).getTime() - 4 * 3600 * 1000;
  return new Date(t).toISOString().slice(0, 10);
}

// "YYYY-MM-DD" → the ESPN scoreboard date param plus its ±1 day neighbours, so a
// fixture lands even if ESPN files it under an adjacent calendar day.
function scoreboardDates(isoDate) {
  const base = new Date(isoDate + "T00:00:00Z");
  return [-1, 0, 1].map(k =>
    new Date(base.getTime() + k * 86400000).toISOString().slice(0, 10).replace(/-/g, ""));
}

// ESPN clock displayValue ("29'", "45'+2'", "90'+4'") → { min, injury }.
function parseMinute(dv) {
  if (!dv) return { min: null, injury: null };
  const m = String(dv).match(/(\d+)(?:'?\+(\d+))?/);
  if (!m) return { min: null, injury: null };
  return { min: +m[1], injury: m[2] ? +m[2] : null };
}

// ESPN keyEvent type text → our compact goal type.
function goalType(typeText) {
  const t = (typeText || "").toLowerCase();
  if (t.includes("own")) return "own";
  if (t.includes("penalt")) return "penalty";
  return "regular";
}

async function espnGet(path) {
  const res = await fetch(`${ESPN_BASE}${path}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`espn ${res.status}`);
  return res.json();
}

// Pull a single match's goals from its summary. ESPN credits the benefiting team
// on every scoring play (own goals included), so the team is taken as-is.
function goalsFromSummary(summary, fx, warnings) {
  const out = [];
  for (const k of summary.keyEvents || []) {
    if (!k.scoringPlay) continue;
    const code = codeFromName(k.team?.displayName);
    if (code !== fx.home && code !== fx.away) {
      warnings.push(`event team ${k.team?.displayName} not in ${fx.id}`);
      continue;
    }
    const type = goalType(k.type?.text);
    const scorer = k.participants?.[0]?.athlete?.displayName
      || (k.shortText || "").replace(/\s+(Goal|Own Goal|Penalty - Scored).*$/i, "").trim()
      || "Unknown";
    const { min, injury } = parseMinute(k.clock?.displayValue);
    out.push({ team: code, scorer, min, injury, type });
  }
  out.sort((a, b) => ((a.min || 0) + (a.injury || 0)) - ((b.min || 0) + (b.injury || 0)));
  return out;
}

// Mutates state.goals / state.goalsFeed in place. Caller persists state.
export async function ingestGoals(state, nowMs = Date.now()) {
  state.goals ||= {};
  state.goalsFeed ||= {};
  const gf = state.goalsFeed;
  gf.fxMap ||= {};   // { localFixtureId: espnEventId }
  gf.tries ||= {};   // { localFixtureId: attemptCount }

  const scores = state.scores || {};

  // A fixture needs goals when it has a score (so it finished), that score
  // implies at least one goal, we haven't stored them all yet, and we haven't
  // exhausted our retry budget for it.
  const needed = FIXTURES_INDEX.filter(fx => {
    const sc = scores[fx.id];
    if (!sc) return false;
    const exp = (sc.hs || 0) + (sc.as || 0);
    if (exp <= 0) return false;
    const have = Array.isArray(state.goals[fx.id]) ? state.goals[fx.id].length : 0;
    if (have >= exp) return false;
    return (gf.tries[fx.id] || 0) < MAX_TRIES;
  });

  if (!needed.length) return { ok: true, needed: 0, goalsFetched: 0, calls: 0 };

  const warnings = [];
  let calls = 0;

  // Map fixtures still lacking an ESPN event id by fetching the relevant
  // scoreboards (one per distinct day, capped per run).
  const unmappedDates = new Set();
  needed.forEach(fx => { if (!gf.fxMap[fx.id]) scoreboardDates(fx.date).forEach(d => unmappedDates.add(d)); });
  let sbDone = 0;
  for (const date of unmappedDates) {
    if (sbDone >= PER_RUN_SCOREBOARDS) { warnings.push("scoreboard cap reached"); break; }
    try {
      const sb = await espnGet(`/scoreboard?dates=${date}`);
      calls++; sbDone++;
      for (const e of sb.events || []) {
        const comp = e.competitions?.[0];
        const cs = comp?.competitors || [];
        const home = codeFromName(cs.find(c => c.homeAway === "home")?.team?.displayName);
        const away = codeFromName(cs.find(c => c.homeAway === "away")?.team?.displayName);
        if (!home || !away) continue;
        const fxId = findFixtureId(etDateFromUtc(e.date), home, away);
        if (fxId && e.id != null) gf.fxMap[fxId] = e.id;
      }
    } catch (err) {
      warnings.push(`scoreboard ${date}: ${err.message}`);
    }
  }

  // Fetch summaries for the fixtures still missing goals, bounded per run.
  let goalsFetched = 0;
  let summaries = 0;
  for (const fx of needed) {
    if (summaries >= PER_RUN_SUMMARIES) { warnings.push("summary cap reached"); break; }
    const eid = gf.fxMap[fx.id];
    if (eid == null) { warnings.push(`no espn id for ${fx.id}`); continue; }

    gf.tries[fx.id] = (gf.tries[fx.id] || 0) + 1;
    let summary;
    try {
      summary = await espnGet(`/summary?event=${eid}`);
      calls++; summaries++;
    } catch (err) {
      warnings.push(`summary ${fx.id}: ${err.message}`);
      continue;
    }

    const goals = goalsFromSummary(summary, fx, warnings);
    if (goals.length) {
      state.goals[fx.id] = goals;
      goalsFetched += goals.length;
    }
  }

  return {
    ok: true,
    needed: needed.length,
    goalsFetched,
    calls,
    warnings: warnings.length ? warnings : undefined,
  };
}
