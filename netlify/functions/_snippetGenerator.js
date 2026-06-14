// Builds the daily "morning snippet" — a playful editorial paragraph or two
// summarising matches finished in the last UK-morning-to-now window, name-
// checking the sweepstake players who own the teams involved, and flagging
// any prior-tournament rivalries.
//
// Single export: generateSnippet({ state, nowMs }) → { ok, snippet?, error? }
//
// Why this lives in its own file: shared by the scheduled cron handler
// (generate-snippet.js) and the manual admin trigger (generate-snippet-now.js).
// Same pattern as _ingest.js for the football-data pipeline.

import {
  FIXTURES_INDEX,
  kickoffUtcMs,
} from "./_fixturesIndex.js";
import { TEAMS_CATALOG, teamName } from "./_teamsCatalog.js";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-6";
const SCALE = 95; // mirrors sweepstake/data.js:SCALE for the odds engine

// ---- UK wall-clock helpers --------------------------------------------------

// "YYYY-MM-DD" of the current UK calendar date. Same trick as liveDay() in
// sweepstake/data.js — `en-CA` formats as ISO yyyy-mm-dd, Europe/London zone
// handles BST/GMT automatically.
function ukDateOf(nowMs) {
  return new Date(nowMs).toLocaleDateString("en-CA", { timeZone: "Europe/London" });
}

// "YYYY-MM-DD" minus N days, treating the input as a calendar date.
function shiftYmd(ymd, deltaDays) {
  const t = Date.parse(`${ymd}T00:00:00Z`) + deltaDays * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}

// UTC epoch ms for "UK wall-clock <ymd> <hour>:00". Robust to BST/GMT — tries
// both offsets (0 and +1 hour) and picks whichever round-trips to the target
// UK calendar date + hour via Intl.DateTimeFormat.
function ukWallClockToUtc(ymd, hour) {
  const hh = String(hour).padStart(2, "0");
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", hour12: false,
  });
  for (const offsetHours of [0, 1]) {
    const candidate = Date.parse(`${ymd}T${hh}:00:00Z`) - offsetHours * 3600 * 1000;
    const parts = fmt.formatToParts(new Date(candidate));
    const get = (t) => parts.find(p => p.type === t)?.value;
    const ukYmd = `${get("year")}-${get("month")}-${get("day")}`;
    const ukH = parseInt(get("hour"), 10);
    if (ukYmd === ymd && ukH === hour) return candidate;
  }
  // Fallback: treat as GMT
  return Date.parse(`${ymd}T${hh}:00:00Z`);
}

// ---- odds engine port (mirrors sweepstake/data.js:teamWinProbs) -------------

function formDelta(goalsFor, goalsAgainst) {
  const m = goalsFor - goalsAgainst;
  if (m > 0) return 8 + Math.min(m - 1, 4) * 3;
  if (m === 0) return 2;
  return -7 + Math.max(m + 1, -4) * 3;
}

// Accumulate form points from a subset of scored fixtures.
function formMap(scoredFixtures) {
  const f = {};
  for (const code of Object.keys(TEAMS_CATALOG)) f[code] = 0;
  for (const { fx, sc } of scoredFixtures) {
    f[fx.home] += formDelta(sc.hs, sc.as);
    f[fx.away] += formDelta(sc.as, sc.hs);
  }
  return f;
}

function isAlive(state, code) {
  return (state.teams?.[code]?.status || "alive") === "alive";
}

// { code → probability(0..1) } across alive teams, using the given form map.
function teamWinProbsFrom(state, form) {
  const alive = Object.keys(TEAMS_CATALOG).filter(c => isAlive(state, c));
  const exps = alive.map(c => Math.exp((TEAMS_CATALOG[c].fifa + form[c]) / SCALE));
  const sum = exps.reduce((a, b) => a + b, 0) || 1;
  const out = {};
  for (const code of Object.keys(TEAMS_CATALOG)) out[code] = 0;
  alive.forEach((c, i) => { out[c] = exps[i] / sum; });
  return out;
}

// Per-player win prob = sum of their owned teams' team probs.
function playerWinProbsFrom(state, teamProbs) {
  const assignments = state.draw?.assignments || {};
  const playerToTeams = {};
  for (const p of state.players || []) playerToTeams[p.id] = [];
  for (const [code, pid] of Object.entries(assignments)) {
    if (playerToTeams[pid]) playerToTeams[pid].push(code);
  }
  const out = {};
  for (const p of state.players || []) {
    out[p.id] = playerToTeams[p.id].reduce((a, c) => a + (teamProbs[c] || 0), 0);
  }
  return out;
}

// ---- main -------------------------------------------------------------------

export async function generateSnippet({ state, nowMs }) {
  if (!state || !state.players?.length || !state.draw?.done) {
    return {
      ok: true,
      snippet: emptySnippet({
        nowMs,
        windowStartMs: nowMs - 86400000,
        windowEndMs: nowMs,
        reason: "no-draw",
        body: "Draw hasn't happened yet — no teams assigned to talk about.",
      }),
    };
  }

  // Window: from 08:00 UK on (today UK date - 1) up to now.
  const todayUk = ukDateOf(nowMs);
  const yesterdayUk = shiftYmd(todayUk, -1);
  const windowStartMs = ukWallClockToUtc(yesterdayUk, 8);
  const windowEndMs = nowMs;

  // Fixtures finished in window AND with a recorded score.
  const matchesInWindow = [];
  for (const fx of FIXTURES_INDEX) {
    const sc = state.scores?.[fx.id];
    if (!sc) continue;
    const ko = kickoffUtcMs(fx);
    if (ko >= windowStartMs && ko < windowEndMs) {
      matchesInWindow.push({ fx, sc });
    }
  }
  matchesInWindow.sort((a, b) => kickoffUtcMs(a.fx) - kickoffUtcMs(b.fx));

  if (matchesInWindow.length === 0) {
    return {
      ok: true,
      snippet: emptySnippet({
        nowMs, windowStartMs, windowEndMs,
        reason: "no-matches",
        body: "Quiet night — no matches between 08:00 yesterday and now. Pour the kettle, the next round's coming.",
      }),
    };
  }

  // "Before" snapshot: only scores for fixtures that finished before windowStart.
  const scoredBefore = [];
  for (const fx of FIXTURES_INDEX) {
    const sc = state.scores?.[fx.id];
    if (!sc) continue;
    if (kickoffUtcMs(fx) < windowStartMs) scoredBefore.push({ fx, sc });
  }
  // "After" snapshot: all current scores (= before + window).
  const scoredAfter = scoredBefore.concat(matchesInWindow);

  const teamProbsBefore = teamWinProbsFrom(state, formMap(scoredBefore));
  const teamProbsAfter = teamWinProbsFrom(state, formMap(scoredAfter));
  const playerProbsBefore = playerWinProbsFrom(state, teamProbsBefore);
  const playerProbsAfter = playerWinProbsFrom(state, teamProbsAfter);

  // Helper closures over state
  const playerById = {};
  for (const p of state.players) playerById[p.id] = p;
  const assignments = state.draw.assignments || {};
  const ownerOfCode = (code) => {
    const pid = assignments[code];
    return pid ? playerById[pid] : null;
  };
  const teamsOfPlayer = (pid) => Object.keys(assignments).filter(c => assignments[c] === pid);

  // Build per-match context.
  const matches = matchesInWindow.map(({ fx, sc }) => {
    const homeOwner = ownerOfCode(fx.home);
    const awayOwner = ownerOfCode(fx.away);
    return {
      home: teamName(fx.home),
      homeCode: fx.home,
      away: teamName(fx.away),
      awayCode: fx.away,
      homeScore: sc.hs,
      awayScore: sc.as,
      homeOwner: homeOwner?.name || null,
      awayOwner: awayOwner?.name || null,
      homeFifa: TEAMS_CATALOG[fx.home]?.fifa || null,
      awayFifa: TEAMS_CATALOG[fx.away]?.fifa || null,
      result: sc.hs > sc.as ? "home" : sc.hs < sc.as ? "away" : "draw",
      upset:
        (sc.hs > sc.as && (TEAMS_CATALOG[fx.home]?.fifa || 0) + 40 < (TEAMS_CATALOG[fx.away]?.fifa || 0)) ||
        (sc.hs < sc.as && (TEAMS_CATALOG[fx.away]?.fifa || 0) + 40 < (TEAMS_CATALOG[fx.home]?.fifa || 0)),
    };
  });

  // Players touched by today's window, with probability delta.
  const playerIdsTouched = new Set();
  for (const { fx } of matchesInWindow) {
    const h = ownerOfCode(fx.home); if (h) playerIdsTouched.add(h.id);
    const a = ownerOfCode(fx.away); if (a) playerIdsTouched.add(a.id);
  }
  const playersTouched = [...playerIdsTouched].map(pid => {
    const p = playerById[pid];
    const before = playerProbsBefore[pid] ?? 0;
    const after = playerProbsAfter[pid] ?? 0;
    return {
      name: p.name,
      beforeProb: round3(before),
      afterProb: round3(after),
      deltaPct: round1((after - before) * 100),
      teamsOwned: teamsOfPlayer(pid).map(teamName),
      teamsAlive: teamsOfPlayer(pid).filter(c => isAlive(state, c)).length,
    };
  }).sort((a, b) => b.afterProb - a.afterProb);

  // Prior tournament history per touched player — every scored match before
  // the window that involves a team they own. Compact, with the opponent
  // owner if any (this is what fuels rivalry callouts).
  const priorHistory = {};
  for (const pid of playerIdsTouched) {
    const p = playerById[pid];
    const owned = new Set(teamsOfPlayer(pid));
    const hist = [];
    for (const { fx, sc } of scoredBefore) {
      const myCode = owned.has(fx.home) ? fx.home : owned.has(fx.away) ? fx.away : null;
      if (!myCode) continue;
      const oppCode = myCode === fx.home ? fx.away : fx.home;
      const myScore = myCode === fx.home ? sc.hs : sc.as;
      const oppScore = myCode === fx.home ? sc.as : sc.hs;
      const oppOwner = ownerOfCode(oppCode);
      hist.push({
        myTeam: teamName(myCode),
        opp: teamName(oppCode),
        oppOwner: oppOwner?.name || null,
        score: `${myScore}-${oppScore}`,
        result: myScore > oppScore ? "win" : myScore < oppScore ? "loss" : "draw",
      });
    }
    if (hist.length) priorHistory[p.name] = hist;
  }

  const ctx = {
    poolName: state.poolName || "The Office Pool",
    windowStartIso: new Date(windowStartMs).toISOString(),
    windowEndIso: new Date(windowEndMs).toISOString(),
    windowLabel: "08:00 UK yesterday → now",
    matches,
    playersTouched,
    priorHistory,
  };

  // Bail with a deterministic fallback if no API key is configured (local dev,
  // env var not set yet, etc.) — surfaces clearly without erroring.
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      ok: true,
      snippet: {
        generatedAt: new Date(nowMs).toISOString(),
        windowStart: ctx.windowStartIso,
        windowEnd: ctx.windowEndIso,
        body: fallbackBody(ctx),
        model: "fallback-template",
        matchIds: matchesInWindow.map(m => m.fx.id),
        playersMentioned: playersTouched.map(p => p.name),
        source: null,
        warning: "ANTHROPIC_API_KEY not set — used template fallback.",
      },
    };
  }

  // ---- LLM call ----
  const systemPrompt = [
    "You are the cheeky in-house pundit for a small office World Cup sweepstake.",
    "Write a SHORT morning snippet (130–180 words, plain paragraphs, no markdown headers) summarising the matches in the input JSON.",
    "Tone: playful, opinionated, lightly sarcastic — like a group-chat message from a friend who knows football.",
    "Hard rules:",
    "• Name-check EVERY player in `playersTouched` at least once. Use their name in possessive form when talking about their team(s) — e.g. \"Lisa's Argentina\".",
    "• When two players' teams played each other, lean into the head-to-head: name both players, e.g. \"Cian vs Karen, and Cian's Brazil ran the show.\"",
    "• If `priorHistory` contains earlier results that connect to today's storyline (e.g. a player's team is on a streak; the same two players' teams met before), weave in ONE callback. Don't force more than one.",
    "• Mention probability swings using `playersTouched[].deltaPct` when it's notable (|delta| ≥ 1 percentage point). e.g. \"Karen's sweepstake odds nudged up 2pp.\" Don't over-quote numbers.",
    "• If a match is flagged `upset: true`, call it out by name.",
    "• Mention every match, even briefly. Lead with the most newsworthy result.",
    "• Pure prose, no bullets, no headings, no emoji. Two short paragraphs is ideal.",
    "• Don't invent facts. Only use what's in the JSON.",
  ].join("\n");

  const userMessage = JSON.stringify(ctx);

  let body;
  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 700,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return { ok: false, error: `anthropic ${res.status}: ${errText.slice(0, 300)}` };
    }
    const data = await res.json();
    body = (data.content || []).filter(c => c.type === "text").map(c => c.text).join("\n\n").trim();
    if (!body) return { ok: false, error: "anthropic returned empty text" };
  } catch (e) {
    return { ok: false, error: `anthropic fetch failed: ${e.message || e}` };
  }

  return {
    ok: true,
    snippet: {
      generatedAt: new Date(nowMs).toISOString(),
      windowStart: ctx.windowStartIso,
      windowEnd: ctx.windowEndIso,
      body,
      model: MODEL,
      matchIds: matchesInWindow.map(m => m.fx.id),
      playersMentioned: playersTouched.map(p => p.name),
      source: null,
    },
  };
}

// ---- helpers ---------------------------------------------------------------

function round1(x) { return Math.round(x * 10) / 10; }
function round3(x) { return Math.round(x * 1000) / 1000; }

function emptySnippet({ nowMs, windowStartMs, windowEndMs, reason, body }) {
  return {
    generatedAt: new Date(nowMs).toISOString(),
    windowStart: new Date(windowStartMs).toISOString(),
    windowEnd: new Date(windowEndMs).toISOString(),
    body,
    model: "skip",
    matchIds: [],
    playersMentioned: [],
    source: null,
    skipReason: reason,
  };
}

// Deterministic fallback so the UI shows something useful even without an
// Anthropic key configured. One sentence per match.
function fallbackBody(ctx) {
  const lines = ctx.matches.map(m => {
    const score = `${m.homeScore}-${m.awayScore}`;
    const h = m.homeOwner ? `${m.homeOwner}'s ${m.home}` : m.home;
    const a = m.awayOwner ? `${m.awayOwner}'s ${m.away}` : m.away;
    const verb = m.result === "draw" ? "drew with" : m.result === "home" ? "beat" : "lost to";
    return `${h} ${verb} ${a} ${score}.${m.upset ? " Upset!" : ""}`;
  });
  return `${lines.join(" ")} (Auto-generated fallback — set ANTHROPIC_API_KEY for the proper write-up.)`;
}
