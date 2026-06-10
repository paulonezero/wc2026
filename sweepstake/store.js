/* ============================================================================
   SWEEPSTAKE · WORLD CUP 2026 — store: state, persistence, draw, demo seed
   ========================================================================== */
(function () {
  "use strict";
  const { TEAMS, FIXTURES, mockScore } = window.SS;
  const KEY = "ss_wc26_v2";
  const MAX_PLAYERS = 16;        // sign-ups close once the pool is full

  const AVA = ["#FF2E63","#2347FF","#16A34A","#FFB22E","#9333EA","#06B6D4",
               "#EC4899","#0EA5E9","#F97316","#65A30D","#DC2626","#0D9488"];

  function freshTeams() {
    const t = {};
    TEAMS.forEach(x => { t[x.code] = { status: "alive", eliminatedRound: null }; });
    return t;
  }

  function defaultState() {
    return {
      v: 2,
      poolName: "The Office Pool",
      pot: 0,
      currency: "€",
      adminPin: "2026",        // host unlock code
      phase: "lobby",          // lobby -> drawn
      drawDate: "2026-06-11",
      players: [],
      me: null,                // playerId of whoever signed up on THIS device
      draw: { done: false, assignments: {}, order: [] },
      teams: freshTeams(),
      scores: {},              // fixtureId -> {hs, as}
      currentDay: 1,           // tournament matchday pointer (admin-controlled)
    };
  }

  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw); } catch (e) {}
    return null;
  }
  function save(state) { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  /* ---- players & sign-up ------------------------------------------------ */
  function addPlayer(state, name) {
    if (state.players.length >= MAX_PLAYERS) return null;
    const id = "p" + Date.now() + Math.floor(Math.random() * 999);
    const color = AVA[state.players.length % AVA.length];
    state.players.push({ id, name: name.trim(), color, joinedAt: Date.now() });
    return id;
  }
  function signUp(state, name) {
    const id = addPlayer(state, name);
    if (!id) throw new Error("Sign-ups are closed.");
    state.me = id;             // remember this device's player
    return id;
  }
  function removePlayer(state, id) {
    state.players = state.players.filter(p => p.id !== id);
    if (state.me === id) state.me = null;
    Object.keys(state.draw.assignments).forEach(c => {
      if (state.draw.assignments[c] === id) delete state.draw.assignments[c];
    });
    return state;
  }

  /* ---- the draw --------------------------------------------------------- */
  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  // Build tiers by FIFA ranking. Bottom tier (index 0) = weakest n teams,
  // top tier (last index) = strongest. If 48 doesn't divide cleanly, the
  // top tier is the short one — a few players miss out on a top-tier team.
  function computeTiers(state) {
    const n = state.players.length;
    if (n === 0) return { tiers: [], numTiers: 0, teamsPerPlayer: 0 };
    const numTiers = Math.ceil(TEAMS.length / n);
    const sorted = [...TEAMS].sort((a, b) => a.fifa - b.fifa); // weakest first
    const tiers = [];
    let i = 0;
    for (let t = 0; t < numTiers; t++) {
      const take = (t < numTiers - 1) ? n : (TEAMS.length - i);
      tiers.push(sorted.slice(i, i + take).map(team => team.code));
      i += take;
    }
    return { tiers, numTiers, teamsPerPlayer: numTiers };
  }
  function computeDraw(state) {
    const players = state.players;
    const { tiers } = computeTiers(state);
    const assignments = {}, order = [];
    tiers.forEach((tierTeams, tIdx) => {
      const tier = tIdx + 1;                              // 1-based, bottom-up
      const tierTotal = tiers.length;
      const shuffledTeams = shuffle(tierTeams);
      const shuffledPlayers = shuffle(players);
      shuffledTeams.forEach((code, k) => {
        const p = shuffledPlayers[k];                     // top tier may be short — extra players sit out
        assignments[code] = p.id;
        order.push({ code, playerId: p.id, tier, tierTotal });
      });
    });
    return { assignments, order };
  }
  function commitDraw(state) {
    const { assignments, order } = computeDraw(state);
    state.draw = { done: true, assignments, order };
    state.phase = "drawn";
    return state;
  }
  // Write a manually-entered draw result. `picks` is { teamCode: playerId }.
  // Unassigned teams and picks for missing players are skipped silently.
  function commitManualDraw(state, picks) {
    const playerIds = new Set(state.players.map(p => p.id));
    const assignments = {};
    const order = [];
    TEAMS.forEach(t => {
      const pid = picks[t.code];
      if (pid && playerIds.has(pid)) {
        assignments[t.code] = pid;
        order.push({ code: t.code, playerId: pid, tier: 1, tierTotal: 1 });
      }
    });
    state.draw = { done: true, assignments, order };
    state.phase = "drawn";
    return state;
  }

  /* ---- results & matchday ----------------------------------------------- */
  function recordFixtureScore(state, fixtureId, hs, as) {
    if (hs === "" || as === "" || hs == null || as == null) { delete state.scores[fixtureId]; return; }
    state.scores[fixtureId] = { hs: +hs, as: +as };
  }
  function advanceDay(state, delta) {
    state.currentDay = Math.max(1, Math.min(window.SS.TOTAL_DAYS + 8, state.currentDay + delta));
  }
  function setTeamStatus(state, code, status, round) {
    state.teams[code].status = status;
    state.teams[code].eliminatedRound = status === "out" ? (round || "group") : null;
  }

  /* ---- demo seed: 12 players, draw done, mid-tournament (day 8) ---------- */
  const DEMO_NAMES = ["Big Phil","Sam","Priya","Marco","Yuki","Dani",
                      "Tomás","Aisha","Leo","Nina","Omar","Grace"];

  function demoState() {
    const s = defaultState();
    s.pot = 240;               // give the demo a real pot so the share breakdown displays
    DEMO_NAMES.forEach(n => addPlayer(s, n));
    commitDraw(s);
    s.currentDay = 8;          // round 2 wrapping up; yesterday (7) + today (8) populated
    FIXTURES.forEach(fx => { if (fx.day < s.currentDay) s.scores[fx.id] = mockScore(fx); });
    s.me = null;               // demo = host view
    return s;
  }

  function reset() { try { localStorage.removeItem(KEY); } catch (e) {} }

  /* ---- admin tools: seed fake players, clear back to lobby -------------- */
  // adds up to `n` demo names that aren't already in the pool. idempotent.
  function seedPlayers(state, n) {
    const want = Math.max(1, Math.min(DEMO_NAMES.length, n || 12));
    const taken = new Set(state.players.map(p => p.name.toLowerCase()));
    let added = 0;
    for (const name of DEMO_NAMES) {
      if (added >= want) break;
      if (taken.has(name.toLowerCase())) continue;
      addPlayer(state, name);
      added++;
    }
    return added;
  }
  // wipe players + draw + teams + scores back to lobby; preserve pool config.
  function clearPlayers(state) {
    state.players = [];
    state.me = null;
    state.draw = { done: false, assignments: {}, order: [] };
    state.phase = "lobby";
    state.teams = freshTeams();
    state.scores = {};
    state.currentDay = 1;
    return state;
  }

  window.Store = {
    KEY, AVA, MAX_PLAYERS, defaultState, load, save, freshTeams,
    addPlayer, signUp, removePlayer, computeDraw, computeTiers, commitDraw, commitManualDraw,
    recordFixtureScore, advanceDay, setTeamStatus, demoState, reset, shuffle,
    seedPlayers, clearPlayers,
  };
})();
