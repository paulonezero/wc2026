// Shared results-ingest pipeline. Called by fetch-results.js (scheduled) and
// fetch-results-now.js (HTTP, admin-gated). Single source of truth so the
// scheduled and manual paths can never diverge.
import { getStore } from "@netlify/blobs";
import { codeFromName } from "./_teamMap.js";
import { findFixtureId } from "./_fixturesIndex.js";

const API_BASE = "https://api.football-data.org/v4";
const COMP_ID = () => process.env.WC_COMPETITION_ID || "2000"; // FIFA WC 2026
const FETCH_TIMEOUT_MS = 15000;

const KO_ROUNDS = {
  ROUND_OF_16: "R16",
  QUARTER_FINALS: "QF",
  SEMI_FINALS: "SF",
  FINAL: "F",
  THIRD_PLACE: "3rd",
};

function defaultState() {
  return {
    v: 2,
    poolName: process.env.POOL_NAME || "The Office Pool",
    pot: 0,
    currency: "€",
    phase: "lobby",
    drawDate: "2026-06-11",
    players: [],
    draw: { done: false, assignments: {}, order: [] },
    teams: {},
    scores: {},
    currentDay: 1,
  };
}

// UTC ISO → ET local calendar date (YYYY-MM-DD). EDT = UTC−4 throughout the
// tournament window. Matches the date convention in _fixturesIndex.js.
function etDateFromUtc(utcIso) {
  const t = new Date(utcIso).getTime() - 4 * 3600 * 1000;
  return new Date(t).toISOString().slice(0, 10);
}

// Returns "HOME" | "AWAY" | "DRAW" — extends m.score.winner with penalties.
function decideWinner(score) {
  if (!score) return null;
  if (score.winner === "HOME_TEAM") return "HOME";
  if (score.winner === "AWAY_TEAM") return "AWAY";
  const p = score.penalties;
  if (p && typeof p.home === "number" && typeof p.away === "number" && p.home !== p.away) {
    return p.home > p.away ? "HOME" : "AWAY";
  }
  return "DRAW";
}

export async function runIngest() {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "FOOTBALL_DATA_API_KEY not set", at: new Date().toISOString() };
  }

  const store = getStore("wc26ss");
  const state = (await store.get("pool", { type: "json" })) || defaultState();
  state.scores ||= {};
  state.teams ||= {};

  let res;
  try {
    res = await fetch(`${API_BASE}/competitions/${COMP_ID()}/matches`, {
      headers: { "X-Auth-Token": apiKey },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (e) {
    return { ok: false, error: `fetch failed: ${e.message}`, at: new Date().toISOString() };
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, error: `football-data ${res.status}`, body: body.slice(0, 500), at: new Date().toISOString() };
  }

  const { matches = [] } = await res.json();

  const scoresWritten = [];
  const eliminated = [];
  const warnings = [];

  for (const m of matches) {
    if (m.status !== "FINISHED") continue;

    const home = codeFromName(m.homeTeam?.name);
    const away = codeFromName(m.awayTeam?.name);
    if (!home || !away) {
      warnings.push(`unknown team: home="${m.homeTeam?.name}" away="${m.awayTeam?.name}"`);
      continue;
    }

    const hs = m.score?.fullTime?.home;
    const as = m.score?.fullTime?.away;
    if (typeof hs !== "number" || typeof as !== "number") {
      warnings.push(`no fullTime score: ${home} vs ${away}`);
      continue;
    }

    const stage = m.stage;
    const koRound = KO_ROUNDS[stage];

    if (koRound) {
      // Knockout: drive eliminations. Group stage never eliminates.
      const winner = decideWinner(m.score);
      if (winner === "HOME" || winner === "AWAY") {
        const loser = winner === "HOME" ? away : home;
        state.teams[loser] = { ...(state.teams[loser] || {}), status: "out", eliminatedRound: koRound };
        eliminated.push(`${loser} out at ${koRound}`);
      }
      // Don't write KO scores to state.scores — those fixture ids aren't in FIXTURES yet.
      warnings.push(`KO match seen (${koRound}): ${home}-${away} ${hs}-${as} — score not written; add KO fixtures when bracket finalises`);
      continue;
    }

    // Group stage
    const etDate = etDateFromUtc(m.utcDate);
    const fxId = findFixtureId(etDate, home, away);
    if (!fxId) {
      warnings.push(`no fixture match for ${etDate} ${home}-${away}`);
      continue;
    }
    state.scores[fxId] = { hs, as };
    scoresWritten.push(`${fxId} ${home} ${hs}-${as} ${away}`);
  }

  await store.setJSON("pool", state);

  const summary = {
    ok: true,
    scoresWritten: scoresWritten.length,
    eliminations: eliminated.length,
    warnings: warnings.length,
    at: new Date().toISOString(),
    details: { scoresWritten, eliminated, warnings },
  };
  console.log("[ingest]", JSON.stringify({
    scoresWritten: summary.scoresWritten,
    eliminations: summary.eliminations,
    warnings: summary.warnings,
    at: summary.at,
  }));
  return summary;
}
