// Shared results-ingest pipeline. Called by fetch-results.js (scheduled) and
// fetch-results-now.js (HTTP, admin-gated). Single source of truth so the
// scheduled and manual paths can never diverge.
import { getStore } from "@netlify/blobs";
import { codeFromName } from "./_teamMap.js";
import {
  findFixtureId,
  FIXTURES_INDEX,
  fixtureLikelyFinishedAt,
  GROUP_STAGE_END_ISO,
  TOURNAMENT_END_ISO,
} from "./_fixturesIndex.js";

const API_BASE = "https://api.football-data.org/v4";
const COMP_ID = () => process.env.WC_COMPETITION_ID || "2000"; // FIFA WC 2026
const FETCH_TIMEOUT_MS = 15000;

// Node fetch on serverless cold starts occasionally throws low-level socket
// errors before the request reaches the wire. One quick retry papers over
// those without adding meaningful latency to the happy path.
async function fetchWithRetry(url, headers) {
  try {
    return await fetch(url, { headers, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  } catch (e) {
    await new Promise(r => setTimeout(r, 400));
    return await fetch(url, { headers, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  }
}

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

// Decide whether there is any group fixture worth fetching right now.
// Returns { pending, total, nextKickoffMs }. "pending" is the count of
// fixtures whose kickoff+2.5h has elapsed but state.scores[id] is missing.
function pendingGroupFixtures(state, nowMs) {
  let pending = 0;
  let nextKickoffMs = Infinity;
  for (const fx of FIXTURES_INDEX) {
    if (state.scores[fx.id]) continue;
    if (fixtureLikelyFinishedAt(fx, nowMs)) {
      pending++;
    } else {
      const ko = Date.parse(`${fx.date}T${fx.ko}:00-04:00`);
      if (ko < nextKickoffMs) nextKickoffMs = ko;
    }
  }
  return { pending, total: FIXTURES_INDEX.length, nextKickoffMs };
}

// `force=true` (manual admin trigger) bypasses the skip check so the host can
// always pull on demand.
export async function runIngest({ force = false } = {}) {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "FOOTBALL_DATA_API_KEY not set", at: new Date().toISOString() };
  }

  const store = getStore("wc26ss");
  const state = (await store.get("pool", { type: "json" })) || defaultState();
  state.scores ||= {};
  state.teams ||= {};
  state.ingest ||= {};

  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();

  // Skip-when-nothing-finished: bail before hitting football-data if no group
  // fixture is likely to have just finished AND we're outside the KO window
  // (during KO we don't have local fixture data, so we keep polling).
  if (!force) {
    const { pending, nextKickoffMs } = pendingGroupFixtures(state, nowMs);
    const groupOver = nowMs >= Date.parse(GROUP_STAGE_END_ISO);
    const tournamentOver = nowMs >= Date.parse(TOURNAMENT_END_ISO);
    const inKoWindow = groupOver && !tournamentOver;
    if (pending === 0 && !inKoWindow) {
      const reason = tournamentOver
        ? "tournament-over"
        : nextKickoffMs === Infinity
          ? "all-scored"
          : "no-fixture-finished-since-last-fetch";
      state.ingest = {
        ...state.ingest,
        lastSkippedAt: nowIso,
        lastSkipReason: reason,
        nextKickoffAt: nextKickoffMs === Infinity ? null : new Date(nextKickoffMs).toISOString(),
      };
      await store.setJSON("pool", state);
      const summary = { ok: true, skipped: true, reason, nextKickoffAt: state.ingest.nextKickoffAt, at: nowIso };
      console.log("[ingest] skip", JSON.stringify(summary));
      return summary;
    }
  }

  const url = `${API_BASE}/competitions/${COMP_ID()}/matches`;
  let res;
  try {
    res = await fetchWithRetry(url, { "X-Auth-Token": apiKey });
  } catch (e) {
    const cause = e.cause?.code || e.cause?.message || "";
    return {
      ok: false,
      error: `fetch ${url} failed: ${e.name || "Error"} · ${e.message}${cause ? " · cause: " + cause : ""}`,
      at: new Date().toISOString(),
    };
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

  state.ingest = {
    ...state.ingest,
    lastFetchAt: nowIso,
    lastSuccessAt: nowIso,
    lastScoresWritten: scoresWritten.length,
    lastSkippedAt: state.ingest.lastSkippedAt || null,
    lastSkipReason: null,
  };

  await store.setJSON("pool", state);

  const summary = {
    ok: true,
    scoresWritten: scoresWritten.length,
    eliminations: eliminated.length,
    warnings: warnings.length,
    at: nowIso,
    details: { scoresWritten, eliminated, warnings },
    state, // returned so the calling client can refresh its local cache
  };
  console.log("[ingest]", JSON.stringify({
    scoresWritten: summary.scoresWritten,
    eliminations: summary.eliminations,
    warnings: summary.warnings,
    at: summary.at,
  }));
  return summary;
}
