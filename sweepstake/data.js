/* ============================================================================
   SWEEPSTAKE · WORLD CUP 2026 — data + fixtures + odds engine
   Plain JS, attaches globals to window. No build step.
   ========================================================================== */
(function () {
  "use strict";

  /* ---- 48-team field (plausible 2026 World Cup) -------------------------- */
  // T(name, code, confed, fifaPoints, group, c1, c2, iso)
  const T = (name, code, confed, fifa, group, c1, c2, iso) =>
    ({ name, code, confed, fifa, group, colors: [c1, c2], iso });

  // Official 2026 FIFA World Cup field — final draw, Dec 5 2025 (groups A–L).
  // fifa = FIFA points from the 10 Jun 2026 live ranking (football-ranking.com,
  // confirmed against inside.fifa.com last-official-update 1 Apr 2026 + recent
  // friendlies); drives the tiered-draw split and the odds model.
  // NOTE: when editing TEAMS, also update /netlify/functions/_teamsCatalog.js
  // (server-side {code → {name, fifa}} mirror used by the morning-snippet generator).
  const TEAMS = [
    // ---- CONMEBOL (6) ----
    T("Argentina","ARG","CONMEBOL",1876,"J","#6CB7E8","#ffffff","ar"),
    T("Brazil","BRA","CONMEBOL",1766,"C","#FFDC00","#009C3B","br"),
    T("Uruguay","URU","CONMEBOL",1673,"H","#5BB0E8","#ffffff","uy"),
    T("Colombia","COL","CONMEBOL",1698,"K","#FCD116","#0033A0","co"),
    T("Ecuador","ECU","CONMEBOL",1599,"E","#FFD100","#0033A0","ec"),
    T("Paraguay","PAR","CONMEBOL",1505,"D","#DA121A","#0038A8","py"),
    // ---- UEFA (16) ----
    T("Spain","ESP","UEFA",1874,"H","#C60B1E","#FFC400","es"),
    T("France","FRA","UEFA",1871,"I","#1F3A93","#ED2939","fr"),
    T("England","ENG","UEFA",1827,"L","#ffffff","#CF142B","gb-eng"),
    T("Portugal","POR","UEFA",1766,"K","#006600","#FF0000","pt"),
    T("Netherlands","NED","UEFA",1754,"F","#FF6A13","#21468B","nl"),
    T("Belgium","BEL","UEFA",1742,"G","#E30613","#FDDA24","be"),
    T("Germany","GER","UEFA",1736,"E","#111111","#DD0000","de"),
    T("Croatia","CRO","UEFA",1715,"L","#C8102E","#ffffff","hr"),
    T("Switzerland","SUI","UEFA",1650,"B","#DA291C","#ffffff","ch"),
    T("Austria","AUT","UEFA",1597,"J","#ED2939","#ffffff","at"),
    T("Turkey","TUR","UEFA",1606,"D","#E30A17","#ffffff","tr"),
    T("Sweden","SWE","UEFA",1510,"F","#006AA7","#FECC02","se"),
    T("Norway","NOR","UEFA",1557,"I","#BA0C2F","#00205B","no"),
    T("Scotland","SCO","UEFA",1503,"C","#0A2A66","#ffffff","gb-sct"),
    T("Czechia","CZE","UEFA",1506,"A","#11457E","#D7141A","cz"),
    T("Bosnia & Herzegovina","BIH","UEFA",1385,"B","#002395","#FECB00","ba"),
    // ---- CONCACAF (6) ----
    T("USA","USA","CONCACAF",1671,"D","#0A3161","#B31942","us"),
    T("Mexico","MEX","CONCACAF",1687,"A","#006847","#CE1126","mx"),
    T("Canada","CAN","CONCACAF",1559,"B","#C8102E","#ffffff","ca"),
    T("Panama","PAN","CONCACAF",1539,"L","#DA121A","#005293","pa"),
    T("Curaçao","CUW","CONCACAF",1294,"E","#002B7F","#F9D90F","cw"),
    T("Haiti","HAI","CONCACAF",1291,"C","#00209F","#D21034","ht"),
    // ---- CAF (10) ----
    T("Morocco","MAR","CAF",1755,"C","#C1272D","#006233","ma"),
    T("Senegal","SEN","CAF",1685,"I","#00853F","#FDEF42","sn"),
    T("Egypt","EGY","CAF",1562,"G","#CE1126","#000000","eg"),
    T("Algeria","ALG","CAF",1571,"J","#006233","#ffffff","dz"),
    T("Ivory Coast","CIV","CAF",1541,"E","#FF8200","#009A44","ci"),
    T("Tunisia","TUN","CAF",1476,"F","#E70013","#ffffff","tn"),
    T("DR Congo","COD","CAF",1477,"K","#007FFF","#F7D618","cd"),
    T("South Africa","RSA","CAF",1429,"A","#007A4D","#FFB915","za"),
    T("Ghana","GHA","CAF",1346,"L","#006B3F","#FCD116","gh"),
    T("Cape Verde","CPV","CAF",1366,"H","#003893","#CF2027","cv"),
    // ---- AFC (9) ----
    T("Japan","JPN","AFC",1662,"F","#1560BD","#ffffff","jp"),
    T("Iran","IRN","AFC",1620,"G","#239F40","#DA0000","ir"),
    T("South Korea","KOR","AFC",1592,"A","#CD2E3A","#0047A0","kr"),
    T("Australia","AUS","AFC",1579,"D","#FFCD00","#00843D","au"),
    T("Qatar","QAT","AFC",1454,"B","#8A1538","#ffffff","qa"),
    T("Uzbekistan","UZB","AFC",1459,"K","#1EB53A","#0099B5","uz"),
    T("Saudi Arabia","KSA","AFC",1421,"H","#006C35","#ffffff","sa"),
    T("Iraq","IRQ","AFC",1447,"I","#007A3D","#CE1126","iq"),
    T("Jordan","JOR","AFC",1391,"J","#007A3D","#CE1126","jo"),
    // ---- OFC (1) ----
    T("New Zealand","NZL","OFC",1281,"G","#000000","#ffffff","nz"),
  ];

  // FIFA/Coca-Cola men's WORLD-RANKING position (not points) for each team —
  // 11 Jun 2026 ranking, the same snapshot the points above come from. Shown
  // under the team name in the UI. Order is fully consistent with the points:
  // a team on more points always sits at a better (lower) world rank; the gaps
  // are the non-qualified nations (Italy 12, Denmark 21, Nigeria 26, …) sitting
  // in between. NOTE: keep in sync with TEAMS / _teamsCatalog.js when editing.
  const WORLD_RANK = {
    ARG:1,  ESP:2,  FRA:3,  ENG:4,  POR:5,  BRA:6,  MAR:7,  NED:8,  BEL:9,  GER:10,
    CRO:11, COL:13, MEX:14, SEN:15, URU:16, USA:17, JPN:18, SUI:19, IRN:20, TUR:22,
    ECU:23, AUT:24, KOR:25, AUS:27, ALG:28, EGY:29, CAN:30, NOR:31, CIV:33, PAN:34,
    SWE:38, CZE:40, PAR:41, SCO:42, TUN:45, COD:46, UZB:50, QAT:56, IRQ:57, RSA:60,
    KSA:61, JOR:63, BIH:64, CPV:67, GHA:73, CUW:82, HAI:83, NZL:85,
  };
  TEAMS.forEach(t => { t.worldRank = WORLD_RANK[t.code] || null; });

  /* ---- 12 groups A–L (official 2026 draw; set per team above) ----------- */
  const GROUP_LETTERS = "ABCDEFGHIJKL".split("");

  const CONFED_LABEL = {
    UEFA: "UEFA", CONMEBOL: "CONMEBOL", CONCACAF: "CONCACAF",
    CAF: "CAF", AFC: "AFC", OFC: "OFC",
  };
  const byCode = {}; TEAMS.forEach(t => byCode[t.code] = t);
  function teamByCode(code) { return byCode[code]; }

  /* ---- real flags via flagcdn.com (ISO set per team above) -------------- */
  function flagURL(team, w = 160) {
    const iso = typeof team === "string" ? byCode[team].iso : team.iso;
    return `https://flagcdn.com/w${w}/${iso}.png`;
  }

  /* ---- fixtures: official 2026 group-stage schedule -------------------- */
  /* 72 matches, 17 matchdays (Thu 11 Jun → Sat 27 Jun). Times stored as ET 24h
     (source: ESPN/FIFA). Displayed in UK local time (BST, UTC+1 throughout the
     tournament window) via `fmtKo()`. The schedule groups late-night kickoffs
     (00:00–05:00 ET) with the PREVIOUS matchday, so e.g. day 3 (Sat 13 Jun)
     includes AUS-TUR at 00:00 ET (= 05:00 BST Sun morning, shown with `(+1)`).
     `koSortKey()` rolls AM hours past midnight so the day's matches sort in
     chronological play order.
     NOTE: when editing FIXTURES, also update /netlify/functions/_fixturesIndex.js
     (server-side copy used by the auto-results ingestor).                  */
  const TOURNAMENT_START = "2026-06-11";
  const TOTAL_DAYS = 17;
  // legacy export — no longer drives fixture generation, kept for compat
  const KICKS = ["13:00", "16:00", "19:00", "22:00"];

  function dateForDay(day) {
    const base = new Date(TOURNAMENT_START + "T00:00:00");
    base.setDate(base.getDate() + (day - 1));
    return base;
  }
  function fmtDate(day) {
    const d = dateForDay(day);
    return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  }
  // Matchday derived from the user's UK wall-clock date — used by Today so
  // the page tracks real time without depending on the admin currentDay pointer.
  // Clamped to [1, TOTAL_DAYS] so it stays valid before / after the tournament.
  function liveDay() {
    const now = new Date();
    const ukYmd = now.toLocaleDateString("en-CA", { timeZone: "Europe/London" });
    const today = new Date(ukYmd + "T00:00:00Z");
    const start = new Date(TOURNAMENT_START + "T00:00:00Z");
    const diff = Math.round((today - start) / 86400000);
    return Math.max(1, Math.min(TOTAL_DAYS, diff + 1));
  }
  // matches at 00:00–05:59 ET are *next* ET day but belong to the previous
  // matchday; bump them past 24h so sort puts them last in their matchday.
  function koSortKey(ko) {
    const [h, m] = ko.split(":").map(Number);
    return (h < 6 ? h + 24 : h) * 60 + m;
  }
  // display-formatted kickoff in UK time. Source values are ET 24h; convert to
  // BST (UTC+1, the UK offset throughout Jun 11–27 2026 daylight saving) by
  // adding 5 hours to ET (which is EDT/UTC−4 in June). Mark `(+1)` when the
  // BST datetime falls on the UK day AFTER the matchday's nominal date — that
  // covers both evening ET kickoffs (19:00+ ET wraps past UK midnight) and the
  // late-night ET ones (00:00–05:59 ET, which are next-ET-day morning anyway).
  function fmtKo(fx) {
    const [h, m] = fx.ko.split(":").map(Number);
    const etDayOffset = h < 6 ? 1 : 0;          // ET 00–05 belongs to next ET day
    const bstAbs = h + 5;                        // ET → BST = +5h in June
    const bstHour = bstAbs % 24;
    const ukDayOffset = etDayOffset + Math.floor(bstAbs / 24);
    const hh = String(bstHour).padStart(2, "0");
    const mm = String(m).padStart(2, "0");
    return `${hh}:${mm} BST` + (ukDayOffset > 0 ? " (+1)" : "");
  }

  // helper to keep entries compact
  const F = (id, day, group, home, away, ko, venue) =>
    ({ id, day, round: "group", group, home, away, ko, venue });

  const FIXTURES = [
    // Day 1 · Thu 11 Jun
    F("gAr0m0", 1, "A", "MEX", "RSA", "15:00", "Mexico City"),
    F("gAr0m1", 1, "A", "KOR", "CZE", "22:00", "Zapopan"),
    // Day 2 · Fri 12 Jun
    F("gBr0m0", 2, "B", "CAN", "BIH", "15:00", "Toronto"),
    F("gDr0m0", 2, "D", "USA", "PAR", "21:00", "Inglewood"),
    // Day 3 · Sat 13 Jun
    F("gBr0m1", 3, "B", "QAT", "SUI", "15:00", "Santa Clara"),
    F("gCr0m0", 3, "C", "BRA", "MAR", "18:00", "East Rutherford"),
    F("gCr0m1", 3, "C", "HAI", "SCO", "21:00", "Foxborough"),
    F("gDr0m1", 3, "D", "AUS", "TUR", "00:00", "Vancouver"),
    // Day 4 · Sun 14 Jun
    F("gEr0m0", 4, "E", "GER", "CUW", "13:00", "Houston"),
    F("gFr0m0", 4, "F", "NED", "JPN", "16:00", "Arlington"),
    F("gEr0m1", 4, "E", "CIV", "ECU", "19:00", "Philadelphia"),
    F("gFr0m1", 4, "F", "SWE", "TUN", "22:00", "Guadalupe"),
    // Day 5 · Mon 15 Jun
    F("gHr0m0", 5, "H", "ESP", "CPV", "13:00", "Atlanta"),
    F("gGr0m0", 5, "G", "BEL", "EGY", "18:00", "Seattle"),
    F("gHr0m1", 5, "H", "KSA", "URU", "18:00", "Miami Gardens"),
    F("gGr0m1", 5, "G", "IRN", "NZL", "00:00", "Inglewood"),
    // Day 6 · Tue 16 Jun
    F("gIr0m0", 6, "I", "FRA", "SEN", "15:00", "East Rutherford"),
    F("gIr0m1", 6, "I", "IRQ", "NOR", "18:00", "Foxborough"),
    F("gJr0m0", 6, "J", "ARG", "ALG", "21:00", "Kansas City"),
    F("gJr0m1", 6, "J", "AUT", "JOR", "00:00", "Santa Clara"),
    // Day 7 · Wed 17 Jun
    F("gKr0m0", 7, "K", "POR", "COD", "13:00", "Houston"),
    F("gLr0m0", 7, "L", "ENG", "CRO", "16:00", "Arlington"),
    F("gLr0m1", 7, "L", "GHA", "PAN", "19:00", "Toronto"),
    F("gKr0m1", 7, "K", "UZB", "COL", "22:00", "Mexico City"),
    // Day 8 · Thu 18 Jun
    F("gAr1m0", 8, "A", "CZE", "RSA", "12:00", "Atlanta"),
    F("gBr1m0", 8, "B", "SUI", "BIH", "15:00", "Inglewood"),
    F("gBr1m1", 8, "B", "CAN", "QAT", "18:00", "Vancouver"),
    F("gAr1m1", 8, "A", "MEX", "KOR", "23:00", "Zapopan"),
    // Day 9 · Fri 19 Jun
    F("gDr1m0", 9, "D", "USA", "AUS", "15:00", "Seattle"),
    F("gCr1m0", 9, "C", "SCO", "MAR", "18:00", "Foxborough"),
    F("gCr1m1", 9, "C", "BRA", "HAI", "21:00", "Philadelphia"),
    F("gDr1m1", 9, "D", "TUR", "PAR", "00:00", "Santa Clara"),
    // Day 10 · Sat 20 Jun
    F("gFr1m0", 10, "F", "NED", "SWE", "13:00", "Houston"),
    F("gEr1m0", 10, "E", "GER", "CIV", "16:00", "Toronto"),
    F("gEr1m1", 10, "E", "ECU", "CUW", "20:00", "Kansas City"),
    F("gFr1m1", 10, "F", "TUN", "JPN", "00:00", "Guadalupe"),
    // Day 11 · Sun 21 Jun
    F("gHr1m0", 11, "H", "ESP", "KSA", "12:00", "Atlanta"),
    F("gGr1m0", 11, "G", "BEL", "IRN", "15:00", "Inglewood"),
    F("gHr1m1", 11, "H", "URU", "CPV", "18:00", "Miami Gardens"),
    F("gGr1m1", 11, "G", "NZL", "EGY", "21:00", "Vancouver"),
    // Day 12 · Mon 22 Jun
    F("gJr1m0", 12, "J", "ARG", "AUT", "13:00", "Arlington"),
    F("gIr1m0", 12, "I", "FRA", "IRQ", "17:00", "Philadelphia"),
    F("gIr1m1", 12, "I", "NOR", "SEN", "20:00", "East Rutherford"),
    F("gJr1m1", 12, "J", "JOR", "ALG", "23:00", "Santa Clara"),
    // Day 13 · Tue 23 Jun
    F("gKr1m0", 13, "K", "POR", "UZB", "13:00", "Houston"),
    F("gLr1m0", 13, "L", "ENG", "GHA", "16:00", "Foxborough"),
    F("gLr1m1", 13, "L", "PAN", "CRO", "19:00", "Toronto"),
    F("gKr1m1", 13, "K", "COL", "COD", "22:00", "Zapopan"),
    // Day 14 · Wed 24 Jun (groups A, B, C close)
    F("gBr2m0", 14, "B", "SUI", "CAN", "15:00", "Vancouver"),
    F("gBr2m1", 14, "B", "BIH", "QAT", "15:00", "Seattle"),
    F("gCr2m0", 14, "C", "SCO", "BRA", "18:00", "Miami Gardens"),
    F("gCr2m1", 14, "C", "MAR", "HAI", "18:00", "Atlanta"),
    F("gAr2m0", 14, "A", "CZE", "MEX", "21:00", "Mexico City"),
    F("gAr2m1", 14, "A", "RSA", "KOR", "21:00", "Guadalupe"),
    // Day 15 · Thu 25 Jun (groups D, E, F close)
    F("gEr2m0", 15, "E", "ECU", "GER", "16:00", "East Rutherford"),
    F("gEr2m1", 15, "E", "CUW", "CIV", "16:00", "Philadelphia"),
    F("gFr2m0", 15, "F", "JPN", "SWE", "19:00", "Arlington"),
    F("gFr2m1", 15, "F", "TUN", "NED", "19:00", "Kansas City"),
    F("gDr2m0", 15, "D", "TUR", "USA", "22:00", "Inglewood"),
    F("gDr2m1", 15, "D", "PAR", "AUS", "22:00", "Santa Clara"),
    // Day 16 · Fri 26 Jun (groups G, H, I close)
    F("gIr2m0", 16, "I", "NOR", "FRA", "15:00", "Foxborough"),
    F("gIr2m1", 16, "I", "SEN", "IRQ", "15:00", "Toronto"),
    F("gHr2m0", 16, "H", "URU", "ESP", "20:00", "Zapopan"),
    F("gHr2m1", 16, "H", "CPV", "KSA", "20:00", "Houston"),
    F("gGr2m0", 16, "G", "EGY", "IRN", "23:00", "Seattle"),
    F("gGr2m1", 16, "G", "NZL", "BEL", "23:00", "Vancouver"),
    // Day 17 · Sat 27 Jun (groups J, K, L close)
    F("gLr2m0", 17, "L", "PAN", "ENG", "17:00", "East Rutherford"),
    F("gLr2m1", 17, "L", "CRO", "GHA", "17:00", "Philadelphia"),
    F("gKr2m0", 17, "K", "COL", "POR", "19:30", "Miami Gardens"),
    F("gKr2m1", 17, "K", "COD", "UZB", "19:30", "Atlanta"),
    F("gJr2m0", 17, "J", "ALG", "AUT", "22:00", "Kansas City"),
    F("gJr2m1", 17, "J", "JOR", "ARG", "22:00", "Arlington"),
  ].sort((a, b) => a.day - b.day || koSortKey(a.ko) - koSortKey(b.ko));

  function fixturesOnDay(day) { return FIXTURES.filter(f => f.day === day); }

  /* ---- deterministic mock scores (for demo seeding) --------------------- */
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
    return h >>> 0;
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function pois(lambda, rng) {
    const Lp = Math.exp(-lambda); let k = 0, p = 1;
    do { k++; p *= rng(); } while (p > Lp);
    return k - 1;
  }
  function mockScore(fx) {
    const h = teamByCode(fx.home), a = teamByCode(fx.away);
    const rng = mulberry32(hash(fx.id));
    const diff = (h.fifa - a.fifa) / 130;
    const lamH = Math.max(0.25, Math.min(3.6, 1.35 + diff * 0.5));
    const lamA = Math.max(0.25, Math.min(3.6, 1.35 - diff * 0.5));
    return { hs: Math.min(pois(lamH, rng), 6), as: Math.min(pois(lamA, rng), 6) };
  }

  /* ---- odds engine ------------------------------------------------------ */
  const SCALE = 95;
  const _EMPTY_SET = new Set();   // shared no-eliminations result (group not yet over)

  function formDelta(goalsFor, goalsAgainst) {
    const m = goalsFor - goalsAgainst;
    if (m > 0) return 8 + Math.min(m - 1, 4) * 3;
    if (m === 0) return 2;
    return -7 + Math.max(m + 1, -4) * 3;
  }

  // derive momentum from all played fixtures (never double-counts on edits)
  function formMap(state) {
    const f = {}; TEAMS.forEach(t => f[t.code] = 0);
    const scores = state.scores || {};
    FIXTURES.forEach(fx => {
      const sc = scores[fx.id];
      if (!sc) return;
      f[fx.home] += formDelta(sc.hs, sc.as);
      f[fx.away] += formDelta(sc.as, sc.hs);
    });
    return f;
  }

  // A team is "alive" if the host hasn't knocked it out AND, once the group
  // stage is complete, it reached the Round of 32 (top-2 of its group or one of
  // the 8 best third-placed teams). See groupNonQualifiers below.
  function isAlive(state, code) {
    if ((state.teams?.[code]?.status || "alive") !== "alive") return false;
    return !groupNonQualifiers(state).has(code);
  }

  // { code: probability(0..1) } across alive teams. Once the knockout bracket
  // exists this is a path-aware bracket walk (see championProbs below) — a
  // team's % reflects who it would actually have to beat, round by round, to
  // lift the trophy. Before that it's a strength softmax over alive teams.
  function teamWinProbs(state) {
    const form = formMap(state);
    const champ = championProbs(state, form);
    if (champ) return champ;
    const alive = TEAMS.filter(t => isAlive(state, t.code));
    const exps = alive.map(t => Math.exp((t.fifa + form[t.code]) / SCALE));
    const sum = exps.reduce((a, b) => a + b, 0) || 1;
    const out = {}; TEAMS.forEach(t => out[t.code] = 0);
    alive.forEach((t, i) => out[t.code] = exps[i] / sum);
    return out;
  }

  function teamsOfPlayer(state, playerId) {
    const a = state.draw.assignments || {};
    return Object.keys(a).filter(code => a[code] === playerId);
  }
  function ownerOf(state, code) {
    const pid = state.draw.assignments?.[code];
    return pid ? state.players.find(p => p.id === pid) : null;
  }
  function playerWinProbs(state) {
    const tp = teamWinProbs(state);
    const out = {};
    state.players.forEach(p => {
      out[p.id] = teamsOfPlayer(state, p.id).reduce((a, c) => a + (tp[c] || 0), 0);
    });
    return out;
  }
  function aliveCount(state, playerId) {
    return teamsOfPlayer(state, playerId).filter(c => isAlive(state, c)).length;
  }

  /* ---- knockout schedule -------------------------------------------------
     The knockout bracket's matchups + kickoff times come from the live feed
     (football-data), stored on state.koMatches by _ingest.js keyed by the feed
     match id. We surface them here as a date-sorted fixture list for the Today
     screen. The bracket *structure* (who meets whom, round by round) is
     mirrored from netlify/functions/_bracket.js below for the path-aware win
     odds. */

  const KO_ROUND_LABEL = { R32: "Round of 32", R16: "Round of 16", QF: "Quarter-final", SF: "Semi-final", F: "Final", "3rd": "Third-place play-off" };
  function koRoundLabel(round) { return KO_ROUND_LABEL[round] || round; }

  // Knockout fixtures from the live feed, oldest→newest. Each: { id, round,
  // home, away (codes, may be null=TBD), utcDate, utcMs, status, finished,
  // hs, as, pens, winner, loser }. Empty until KO matches appear in the feed.
  function koFixtures(state) {
    const km = state.koMatches || {};
    return Object.keys(km).map(k => {
      const r = km[k];
      return { id: k, round: r.round, home: r.home || null, away: r.away || null,
        utcDate: r.utcDate || null, utcMs: r.utcDate ? Date.parse(r.utcDate) : null,
        status: r.status || null, finished: typeof r.hs === "number",
        hs: r.hs, as: r.as, pens: r.pens || null, winner: r.winner || null, loser: r.loser || null };
    }).filter(r => r.utcMs != null).sort((a, b) => a.utcMs - b.utcMs);
  }

  /* ---- knockout bracket + path-aware champion odds -----------------------
     Mirror of netlify/functions/_bracket.js (KO_R32 slot map, KO_FEEDS tree,
     standings resolution, third-slot matching, bracket walk). The two files
     MUST stay identical — edit both together if FIFA revise anything. */

  // Official Round of 32 (FIFA matches 73–88; internal id = match − 72).
  // "1X"/"2X" = winner / runner-up of group X; { t:[...] } = a third-placed
  // team from one of the listed candidate groups.
  const KO_R32 = [
    { home: "2A", away: "2B" },                             // 73
    { home: "1E", away: { t: ["A", "B", "C", "D", "F"] } }, // 74
    { home: "1F", away: "2C" },                             // 75
    { home: "1C", away: "2F" },                             // 76
    { home: "1I", away: { t: ["C", "D", "F", "G", "H"] } }, // 77
    { home: "2E", away: "2I" },                             // 78
    { home: "1A", away: { t: ["C", "E", "F", "H", "I"] } }, // 79
    { home: "1L", away: { t: ["E", "H", "I", "J", "K"] } }, // 80
    { home: "1D", away: { t: ["B", "E", "F", "I", "J"] } }, // 81
    { home: "1G", away: { t: ["A", "E", "H", "I", "J"] } }, // 82
    { home: "2K", away: "2L" },                             // 83
    { home: "1H", away: "2J" },                             // 84
    { home: "1B", away: { t: ["E", "F", "G", "I", "J"] } }, // 85
    { home: "1J", away: "2H" },                             // 86
    { home: "1K", away: { t: ["D", "E", "I", "J", "L"] } }, // 87
    { home: "2D", away: "2G" },                             // 88
  ];
  // Official feed tree: R16 17..24, QF 25..28, SF 29..30, F 31.
  const KO_FEEDS = {
    17: [2, 5], 18: [1, 3], 19: [4, 6], 20: [7, 8],
    21: [11, 12], 22: [9, 10], 23: [14, 16], 24: [13, 15],
    25: [17, 18], 26: [21, 22], 27: [19, 20], 28: [23, 24],
    29: [25, 26], 30: [27, 28],
    31: [29, 30],
  };
  const KO_ROUND_IDX = { R32: 0, R16: 1, QF: 2, SF: 3, F: 4 };
  const koRoundOfId = (id) => id <= 16 ? "R32" : id <= 24 ? "R16" : id <= 28 ? "QF" : id <= 30 ? "SF" : "F";

  // Per-group order (best→worst) + the eight best third-placed codes. Same
  // tiebreak as groupNonQualifiers: pts, GD, GF, FIFA rank.
  function koGroupStandings(state) {
    const scores = state.scores || {};
    const rec = {};
    TEAMS.forEach(t => { rec[t.code] = { code: t.code, group: t.group, fifa: t.fifa, pts: 0, gd: 0, gf: 0 }; });
    FIXTURES.forEach(fx => {
      if (fx.round && fx.round !== "group") return;
      const sc = scores[fx.id]; if (!sc) return;
      const H = rec[fx.home], A = rec[fx.away]; if (!H || !A) return;
      H.gf += sc.hs; H.gd += sc.hs - sc.as; A.gf += sc.as; A.gd += sc.as - sc.hs;
      if (sc.hs > sc.as) H.pts += 3; else if (sc.hs < sc.as) A.pts += 3; else { H.pts += 1; A.pts += 1; }
    });
    const better = (a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || b.fifa - a.fifa;
    const byGroup = {}, thirds = [];
    GROUP_LETTERS.forEach(g => {
      byGroup[g] = TEAMS.filter(t => t.group === g).map(t => rec[t.code]).sort(better);
      if (byGroup[g][2]) thirds.push(byGroup[g][2]);
    });
    thirds.sort(better);
    return { byGroup, bestThirds: thirds.slice(0, 8).map(t => t.code) };
  }

  // Slot the qualifying third-placed groups into the eight third slots by
  // candidate set (constrained backtracking; unique matching = FIFA's table).
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

  // Did `code` survive past round `roundIdx`? Unknown elimination labels count
  // as "not yet decided" so the bracket never over-claims a result.
  function koReachedBeyond(code, roundIdx, state) {
    const t = state.teams?.[code];
    if (!t || t.status !== "out") return true;
    const er = KO_ROUND_IDX[t.eliminatedRound];
    if (er == null) return true;
    return er > roundIdx;
  }

  // Full 31-match bracket, or null before the group stage is settled. Each
  // match: { id, round, home, away, winner, loser, homeSrc, awaySrc, feedsId }.
  function buildBracket(state) {
    if (!groupStageComplete(state)) return null;
    const stand = koGroupStandings(state);

    const thirdCodeOfGroup = {};
    stand.bestThirds.forEach(code => { thirdCodeOfGroup[teamByCode(code).group] = code; });
    const thirdSlots = [];
    KO_R32.forEach((m, i) => { if (typeof m.away === "object") thirdSlots.push({ id: i + 1, cand: m.away.t }); });
    const thirdGroupOfSlot = assignThirds(thirdSlots, Object.keys(thirdCodeOfGroup));

    const resolveGroupTok = (tok) => {
      const m = /^([12])([A-Z])$/.exec(tok);
      if (!m) return null;
      return stand.byGroup[m[2]]?.[m[1] === "1" ? 0 : 1]?.code || null;
    };

    const matches = [];
    KO_R32.forEach((m, i) => matches.push({ id: i + 1, round: "R32", homeTok: m.home, awayTok: m.away }));
    Object.keys(KO_FEEDS).map(Number).forEach(id => {
      matches.push({ id, round: koRoundOfId(id), homeSrc: KO_FEEDS[id][0], awaySrc: KO_FEEDS[id][1] });
    });
    matches.sort((a, b) => a.id - b.id);

    const byId = {};
    matches.forEach(m => { byId[m.id] = m; });
    matches.forEach(m => {
      if (m.homeSrc) byId[m.homeSrc].feedsId = m.id;
      if (m.awaySrc) byId[m.awaySrc].feedsId = m.id;
    });

    const winners = {};
    matches.forEach(m => {
      if (m.round === "R32") {
        m.home = resolveGroupTok(m.homeTok);
        if (typeof m.awayTok === "object") {
          const g = thirdGroupOfSlot[m.id];
          m.away = g ? thirdCodeOfGroup[g] : null;
        } else {
          m.away = resolveGroupTok(m.awayTok);
        }
      } else {
        m.home = winners[m.homeSrc] || null;
        m.away = winners[m.awaySrc] || null;
      }
      let winner = null, loser = null;
      if (m.home && m.away) {
        const ridx = KO_ROUND_IDX[m.round];
        const hb = koReachedBeyond(m.home, ridx, state);
        const ab = koReachedBeyond(m.away, ridx, state);
        if (hb && !ab) { winner = m.home; loser = m.away; }
        else if (ab && !hb) { winner = m.away; loser = m.home; }
      }
      m.winner = winner; m.loser = loser;
      winners[m.id] = winner;
    });

    return { matches, byId };
  }

  // { code → probability(0..1) } of winning the tournament, or null before the
  // bracket exists. Walks the bracket: each match's win distribution mixes
  // over the possible occupants of each side; decided matches are certain.
  // Pairwise model P(A beats B) = 1/(1+exp((Rb−Ra)/SCALE)), R = fifa + form —
  // the two-team case of the same softmax the group-stage odds use. A team's
  // title chance therefore reflects the difficulty of its actual route.
  function championProbs(state, form) {
    const bracket = buildBracket(state);
    if (!bracket) return null;
    const rating = (c) => teamByCode(c).fifa + (form?.[c] || 0);
    const pBeat = (a, b) => 1 / (1 + Math.exp((rating(b) - rating(a)) / SCALE));

    const win = {}; // match id → { code → P(code wins this match) }
    bracket.matches.forEach(m => {
      const homeDist = m.home ? { [m.home]: 1 } : (win[m.homeSrc] || {});
      const awayDist = m.away ? { [m.away]: 1 } : (win[m.awaySrc] || {});
      const w = {};
      if (m.winner) {
        w[m.winner] = 1;
      } else {
        Object.keys(homeDist).forEach(h => {
          Object.keys(awayDist).forEach(a => {
            const meet = homeDist[h] * awayDist[a];
            w[h] = (w[h] || 0) + meet * pBeat(h, a);
            w[a] = (w[a] || 0) + meet * pBeat(a, h);
          });
        });
      }
      win[m.id] = w;
    });

    const out = {};
    TEAMS.forEach(t => { out[t.code] = 0; });
    Object.keys(win[31] || {}).forEach(c => { out[c] = win[31][c]; });

    // Safety net: a team the host marked out without an elimination round
    // isn't collapsed by the bracket walk — zero it and renormalise so
    // eliminated always reads exactly 0%.
    let sum = 0, dropped = 0;
    Object.keys(out).forEach(c => {
      if (out[c] > 0 && (state.teams?.[c]?.status || "alive") !== "alive") {
        dropped += out[c]; out[c] = 0;
      }
      sum += out[c];
    });
    if (dropped > 0 && sum > 0) Object.keys(out).forEach(c => { out[c] /= sum; });
    return out;
  }

  /* ---- wooden spoon: projected group-table ranking ---------------------
     A single deterministic table that ranks all 48 teams worst → best.
     For every team we project a full 3-game group record:
       · games already played contribute their real points + goals;
       · games not yet played are projected from team strength
         (FIFA points + recent form, the same number the win-odds use),
         giving expected points and expected goals for that fixture.
     Because every team is projected to the same 3 games, teams that have
     played more (or zero) games are directly comparable — actual results
     simply carry more weight the more a team has played. The table is then
     sorted by overall strength (projected points, GD-weighted) ascending,
     so rank 1 = the weakest team in the tournament. Spoon probability is a
     softmax over that weakness, so the worst-ranked teams carry the most
     wooden-spoon risk. Probabilities sum to 1.0 across all 48 teams. */
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

  // Worst → best ranking of all 48 teams (rank 1 = weakest). Each row:
  // { code, group, fifa, played, pts, gf, ga, gd (actual so far),
  //   projPts, projGf, projGd (projected over a full 3 games), score, rank }.
  function teamPerformanceTable(state) {
    const form = formMap(state);
    const scores = state.scores || {};
    const strengthOf = (code) => {
      const t = teamByCode(code);
      return ((t && t.fifa) || 0) + (form[code] || 0);
    };
    const rec = {};
    TEAMS.forEach(t => {
      rec[t.code] = { played: 0, pts: 0, gf: 0, ga: 0,
        projPtsAdd: 0, projGfAdd: 0, projGaAdd: 0 };
    });
    FIXTURES.forEach(fx => {
      if (fx.round && fx.round !== "group") return;
      const H = rec[fx.home], A = rec[fx.away];
      if (!H || !A) return;
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
    });
    const rows = TEAMS.map(t => {
      const r = rec[t.code];
      const gd = r.gf - r.ga;
      const projPts = r.pts + r.projPtsAdd;
      const projGf = r.gf + r.projGfAdd;
      const projGa = r.ga + r.projGaAdd;
      const projGd = projGf - projGa;
      const score = projPts + SPOON_GD_W * projGd;
      return { code: t.code, group: t.group, fifa: t.fifa, played: r.played,
        pts: r.pts, gf: r.gf, ga: r.ga, gd, projPts, projGf, projGd, score };
    });
    // Once every group game is played the table is final: rank on real
    // standings (points, then goal difference, then goals scored). Before then,
    // rank on the GD-weighted projected strength.
    rows.sort(groupStageComplete(state)
      ? (a, b) => a.pts - b.pts || a.gd - b.gd || a.gf - b.gf || a.fifa - b.fifa
      : (a, b) => a.score - b.score || a.projGd - b.projGd || a.projGf - b.projGf || a.fifa - b.fifa);
    rows.forEach((r, i) => { r.rank = i + 1; });
    return rows;
  }

  // True once every group fixture has a score — the group stage is complete and
  // the standings / wooden spoon are settled rather than projected.
  function groupStageComplete(state) {
    const sc = state.scores || {};
    return FIXTURES.filter(fx => !fx.round || fx.round === "group")
                   .every(fx => sc[fx.id]);
  }

  // Teams eliminated at the group stage — a Set of codes, empty until every
  // group game is in. WC2026 sends 32 teams to the Round of 32: the top two of
  // each of the 12 groups plus the 8 best third-placed teams. The other 16 (the
  // 12 group-bottom teams + the 4 worst third-placed teams) are out. Ranking is
  // points, then goal difference, then goals scored, then FIFA rank as a
  // deterministic last resort (head-to-head tiebreaks are not modelled).
  function groupNonQualifiers(state) {
    if (!groupStageComplete(state)) return _EMPTY_SET;
    const scores = state.scores || {};
    const rec = {};
    TEAMS.forEach(t => { rec[t.code] = { code: t.code, group: t.group, fifa: t.fifa, pts: 0, gd: 0, gf: 0 }; });
    FIXTURES.forEach(fx => {
      if (fx.round && fx.round !== "group") return;
      const sc = scores[fx.id]; if (!sc) return;
      const H = rec[fx.home], A = rec[fx.away]; if (!H || !A) return;
      H.gf += sc.hs; H.gd += sc.hs - sc.as; A.gf += sc.as; A.gd += sc.as - sc.hs;
      if (sc.hs > sc.as) H.pts += 3; else if (sc.hs < sc.as) A.pts += 3; else { H.pts += 1; A.pts += 1; }
    });
    // Lower is worse: sort descending so [0],[1] qualify, [2] is third, [3] is out.
    const better = (a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || b.fifa - a.fifa;
    const out = new Set();
    const thirds = [];
    GROUP_LETTERS.forEach(g => {
      const teams = TEAMS.filter(t => t.group === g).map(t => rec[t.code]).sort(better);
      if (teams[3]) out.add(teams[3].code);   // group bottom → out
      if (teams[2]) thirds.push(teams[2]);     // third place → best-thirds pool
    });
    thirds.sort(better).slice(8).forEach(t => out.add(t.code)); // 9th-best third onward → out
    return out;
  }

  // { code: probability(0..1) } of taking the wooden spoon, derived from the
  // worst→best ranking via a softmax over each team's weakness. Sums to 1.0.
  function woodenSpoonProbs(state) {
    const rows = teamPerformanceTable(state);
    const out = {}; TEAMS.forEach(t => out[t.code] = 0);
    // Group stage over → the spoon is settled: the bottom team takes it for sure.
    if (groupStageComplete(state)) {
      if (rows.length) out[rows[0].code] = 1;
      return out;
    }
    const ws = rows.map(r => Math.exp(-r.score / SPOON_TEMP));
    const sum = ws.reduce((a, b) => a + b, 0) || 1;
    rows.forEach((r, i) => { out[r.code] = ws[i] / sum; });
    return out;
  }

  // The settled wooden-spoon award once the group stage is complete:
  // { row, owner } for the bottom (rank-1) team, or null while still projected.
  function woodenSpoonResult(state) {
    if (!groupStageComplete(state)) return null;
    const row = teamPerformanceTable(state)[0];
    if (!row) return null;
    return { row, owner: ownerOf(state, row.code) };
  }

  // Sum spoon probs by owner → { playerId: probability(0..1) }
  function playerSpoonProbs(state) {
    const tp = woodenSpoonProbs(state);
    const out = {};
    state.players.forEach(p => {
      out[p.id] = teamsOfPlayer(state, p.id).reduce((a, c) => a + (tp[c] || 0), 0);
    });
    return out;
  }

  /* ---- helpers ---------------------------------------------------------- */
  function fmtPct(x) { return (x * 100).toFixed(x < 0.0095 ? 1 : x < 0.1 ? 1 : 0) + "%"; }
  // readable text color over a solid hex background
  function textOn(hex) {
    const h = (hex || "#000").replace("#", "");
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.62 ? "#11181C" : "#ffffff";
  }
  function splitCounts(n) {
    if (!n) return [];
    const base = Math.floor(TEAMS.length / n), extra = TEAMS.length % n;
    return Array.from({ length: n }, (_, i) => base + (i < extra ? 1 : 0));
  }

  /* ---- tier naming for the draw ----------------------------------------- */
  function tierLabel(tier, total) {
    if (!total || total <= 1) return "All teams";
    if (tier === 1) return "Bottom tier";
    if (tier === total) return "Top tier";
    if (total === 3 && tier === 2) return "Middle tier";
    return `Tier ${tier}`;
  }
  function tierSubtitle(tier, total) {
    if (!total) return null;
    if (tier === 1) return "Weakest by FIFA ranking";
    if (tier === total) return "Strongest by FIFA ranking";
    return null;
  }

  /* ---- tournament stats (Stats screen) ---------------------------------- */

  // True once any fixture carries goal-event detail. Goal data is tier-dependent
  // on football-data.org, so the Stats screen gates the scorer/timing sections
  // on this and shows score-only stats regardless.
  function hasGoalData(state) {
    const g = state.goals || {};
    return Object.keys(g).some(k => Array.isArray(g[k]) && g[k].length);
  }

  // Flatten state.goals into one list, joining each goal to its fixture's day.
  // Sorted by day then minute. Returns [] when no goal data exists.
  function allGoals(state) {
    const g = state.goals || {};
    const dayOf = {}; FIXTURES.forEach(fx => { dayOf[fx.id] = fx.day; });
    const out = [];
    Object.keys(g).forEach(fxId => {
      (g[fxId] || []).forEach(ev => {
        out.push({ fixtureId: fxId, day: dayOf[fxId] ?? 99,
          team: ev.team, scorer: ev.scorer, min: ev.min, injury: ev.injury, type: ev.type });
      });
    });
    out.sort((a, b) => a.day - b.day || (a.min || 0) - (b.min || 0));
    return out;
  }

  // Golden Boot: [{ scorer, team, goals, pens }] sorted by goals desc, then
  // fewer penalties. Own goals are excluded from a scorer's tally. Returns [].
  function topScorers(state, limit = 15) {
    const by = {};
    allGoals(state).forEach(ev => {
      if (ev.type === "own") return;
      const key = ev.scorer + "|" + ev.team;
      const rec = by[key] || (by[key] = { scorer: ev.scorer, team: ev.team, goals: 0, pens: 0 });
      rec.goals++;
      if (ev.type === "penalty") rec.pens++;
    });
    return Object.values(by)
      .sort((a, b) => b.goals - a.goals || a.pens - b.pens || a.scorer.localeCompare(b.scorer))
      .slice(0, limit);
  }

  // Goal distribution across 15-minute bands (injury time folds into its band).
  // [{ label, count }] over six buckets. Empty array when no goal data.
  function goalTimingBuckets(state) {
    const goals = allGoals(state);
    if (!goals.length) return [];
    const bands = [
      { label: "1–15", lo: 0, hi: 15 },
      { label: "16–30", lo: 16, hi: 30 },
      { label: "31–45+", lo: 31, hi: 45 },
      { label: "46–60", lo: 46, hi: 60 },
      { label: "61–75", lo: 61, hi: 75 },
      { label: "76–90+", lo: 76, hi: Infinity },
    ].map(b => ({ ...b, count: 0 }));
    goals.forEach(ev => {
      const m = ev.min || 0;
      // first-half stoppage time counts as 45, second-half as 90
      const eff = ev.injury ? (m <= 45 ? 45 : 90) : m;
      const band = bands.find(b => eff >= b.lo && eff <= b.hi) || bands[bands.length - 1];
      band.count++;
    });
    return bands.map(b => ({ label: b.label, count: b.count }));
  }

  // Best attacks: team rows sorted by goals scored desc. Reuses the per-team
  // record already built by teamPerformanceTable.
  function teamScoringTable(state, limit = 10) {
    return teamPerformanceTable(state)
      .filter(r => r.played > 0)
      .sort((a, b) => b.gf - a.gf || b.gd - a.gd || a.ga - b.ga)
      .slice(0, limit);
  }

  // Best defences: team rows sorted by goals conceded asc (must have played).
  function teamDefensiveTable(state, limit = 10) {
    return teamPerformanceTable(state)
      .filter(r => r.played > 0)
      .sort((a, b) => a.ga - b.ga || b.gd - a.gd || b.gf - a.gf)
      .slice(0, limit);
  }

  // Scored fixtures with the largest winning margin → [{ fx, hs, as, margin }].
  function biggestWins(state, limit = 5) {
    const scores = state.scores || {};
    return FIXTURES
      .filter(fx => (!fx.round || fx.round === "group") && scores[fx.id])
      .map(fx => { const s = scores[fx.id]; return { fx, hs: s.hs, as: s.as, margin: Math.abs(s.hs - s.as) }; })
      .filter(r => r.margin > 0)
      .sort((a, b) => b.margin - a.margin || (b.hs + b.as) - (a.hs + a.as))
      .slice(0, limit);
  }

  // Scored fixtures with the most goals → [{ fx, hs, as, total }].
  function highestScoringMatches(state, limit = 5) {
    const scores = state.scores || {};
    return FIXTURES
      .filter(fx => (!fx.round || fx.round === "group") && scores[fx.id])
      .map(fx => { const s = scores[fx.id]; return { fx, hs: s.hs, as: s.as, total: s.hs + s.as }; })
      .sort((a, b) => b.total - a.total || Math.abs(b.hs - b.as) - Math.abs(a.hs - a.as))
      .slice(0, limit);
  }

  // Headliner numbers for the top of the Stats screen. topScorer is present only
  // when goal data exists.
  function tournamentHeadlines(state) {
    const rows = teamPerformanceTable(state);
    const matchesPlayed = rows.reduce((a, r) => a + r.played, 0) / 2;
    const totalGoals = rows.reduce((a, r) => a + r.gf, 0);
    const cleanSheets = (() => {
      const scores = state.scores || {};
      let cs = 0;
      FIXTURES.forEach(fx => {
        const s = scores[fx.id]; if (!s) return;
        if (s.as === 0) cs++;
        if (s.hs === 0) cs++;
      });
      return cs;
    })();
    const bw = biggestWins(state, 1)[0] || null;
    const hs = highestScoringMatches(state, 1)[0] || null;
    const ts = hasGoalData(state) ? (topScorers(state, 1)[0] || null) : null;
    return {
      matchesPlayed,
      totalGoals,
      goalsPerMatch: matchesPlayed ? totalGoals / matchesPlayed : 0,
      biggestWin: bw,
      highestScoring: hs,
      cleanSheets,
      topScorer: ts,
    };
  }

  // Sweepstake blend: per-player aggregate over the teams they own.
  // { [playerId]: { goalsFor, goalsAgainst, gd, played, topScorerName? } }.
  function perPlayerStats(state) {
    const rows = teamPerformanceTable(state);
    const byCode = {}; rows.forEach(r => { byCode[r.code] = r; });
    const scorers = hasGoalData(state) ? topScorers(state, 9999) : [];
    const out = {};
    (state.players || []).forEach(p => {
      const codes = teamsOfPlayer(state, p.id);
      let gf = 0, ga = 0, played = 0;
      codes.forEach(c => { const r = byCode[c]; if (r) { gf += r.gf; ga += r.ga; played += r.played; } });
      const owned = new Set(codes);
      const best = scorers.find(s => owned.has(s.team));
      out[p.id] = { goalsFor: gf, goalsAgainst: ga, gd: gf - ga, played,
        topScorerName: best ? best.scorer : null };
    });
    return out;
  }

  // Players ranked by goals their teams have scored → [{ player, ...stats }].
  function goalOwnershipLeaders(state) {
    const stats = perPlayerStats(state);
    return (state.players || [])
      .map(p => ({ player: p, ...stats[p.id] }))
      .sort((a, b) => b.goalsFor - a.goalsFor || b.gd - a.gd);
  }

  window.SS = {
    TEAMS, GROUP_LETTERS, CONFED_LABEL, SCALE,
    FIXTURES, KICKS, TOURNAMENT_START, TOTAL_DAYS,
    dateForDay, fmtDate, fmtKo, liveDay, fixturesOnDay, mockScore,
    formMap, formDelta, isAlive, teamWinProbs, playerWinProbs,
    woodenSpoonProbs, playerSpoonProbs, teamPerformanceTable,
    groupStageComplete, woodenSpoonResult, groupNonQualifiers,
    koFixtures, koRoundLabel, buildBracket, championProbs,
    teamsOfPlayer, ownerOf, aliveCount, teamByCode, fmtPct, splitCounts, flagURL, textOn,
    tierLabel, tierSubtitle,
    hasGoalData, allGoals, topScorers, goalTimingBuckets,
    teamScoringTable, teamDefensiveTable, biggestWins, highestScoringMatches,
    tournamentHeadlines, perPlayerStats, goalOwnershipLeaders,
  };
})();
