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
  // fifa = approx FIFA points (Nov 2025 ranking order); drives the odds model.
  const TEAMS = [
    // ---- CONMEBOL (6) ----
    T("Argentina","ARG","CONMEBOL",1870,"J","#6CB7E8","#ffffff","ar"),
    T("Brazil","BRA","CONMEBOL",1758,"C","#FFDC00","#009C3B","br"),
    T("Uruguay","URU","CONMEBOL",1652,"H","#5BB0E8","#ffffff","uy"),
    T("Colombia","COL","CONMEBOL",1692,"K","#FCD116","#0033A0","co"),
    T("Ecuador","ECU","CONMEBOL",1600,"E","#FFD100","#0033A0","ec"),
    T("Paraguay","PAR","CONMEBOL",1485,"D","#DA121A","#0038A8","py"),
    // ---- UEFA (16) ----
    T("Spain","ESP","UEFA",1875,"H","#C60B1E","#FFC400","es"),
    T("France","FRA","UEFA",1860,"I","#1F3A93","#ED2939","fr"),
    T("England","ENG","UEFA",1820,"L","#ffffff","#CF142B","gb-eng"),
    T("Portugal","POR","UEFA",1778,"K","#006600","#FF0000","pt"),
    T("Netherlands","NED","UEFA",1760,"F","#FF6A13","#21468B","nl"),
    T("Belgium","BEL","UEFA",1740,"G","#E30613","#FDDA24","be"),
    T("Germany","GER","UEFA",1725,"E","#111111","#DD0000","de"),
    T("Croatia","CRO","UEFA",1708,"L","#C8102E","#ffffff","hr"),
    T("Switzerland","SUI","UEFA",1648,"B","#DA291C","#ffffff","ch"),
    T("Austria","AUT","UEFA",1592,"J","#ED2939","#ffffff","at"),
    T("Turkey","TUR","UEFA",1585,"D","#E30A17","#ffffff","tr"),
    T("Sweden","SWE","UEFA",1552,"F","#006AA7","#FECC02","se"),
    T("Norway","NOR","UEFA",1535,"I","#BA0C2F","#00205B","no"),
    T("Scotland","SCO","UEFA",1500,"C","#0A2A66","#ffffff","gb-sct"),
    T("Czechia","CZE","UEFA",1478,"A","#11457E","#D7141A","cz"),
    T("Bosnia & Herzegovina","BIH","UEFA",1468,"B","#002395","#FECB00","ba"),
    // ---- CONCACAF (6) ----
    T("USA","USA","CONCACAF",1665,"D","#0A3161","#B31942","us"),
    T("Mexico","MEX","CONCACAF",1658,"A","#006847","#CE1126","mx"),
    T("Canada","CAN","CONCACAF",1545,"B","#C8102E","#ffffff","ca"),
    T("Panama","PAN","CONCACAF",1522,"L","#DA121A","#005293","pa"),
    T("Curaçao","CUW","CONCACAF",1360,"E","#002B7F","#F9D90F","cw"),
    T("Haiti","HAI","CONCACAF",1350,"C","#00209F","#D21034","ht"),
    // ---- CAF (10) ----
    T("Morocco","MAR","CAF",1700,"C","#C1272D","#006233","ma"),
    T("Senegal","SEN","CAF",1632,"I","#00853F","#FDEF42","sn"),
    T("Egypt","EGY","CAF",1512,"G","#CE1126","#000000","eg"),
    T("Algeria","ALG","CAF",1505,"J","#006233","#ffffff","dz"),
    T("Ivory Coast","CIV","CAF",1498,"E","#FF8200","#009A44","ci"),
    T("Tunisia","TUN","CAF",1482,"F","#E70013","#ffffff","tn"),
    T("DR Congo","COD","CAF",1452,"K","#007FFF","#F7D618","cd"),
    T("South Africa","RSA","CAF",1445,"A","#007A4D","#FFB915","za"),
    T("Ghana","GHA","CAF",1438,"L","#006B3F","#FCD116","gh"),
    T("Cape Verde","CPV","CAF",1400,"H","#003893","#CF2027","cv"),
    // ---- AFC (9) ----
    T("Japan","JPN","AFC",1640,"F","#1560BD","#ffffff","jp"),
    T("Iran","IRN","AFC",1620,"G","#239F40","#DA0000","ir"),
    T("South Korea","KOR","AFC",1610,"A","#CD2E3A","#0047A0","kr"),
    T("Australia","AUS","AFC",1578,"D","#FFCD00","#00843D","au"),
    T("Qatar","QAT","AFC",1492,"B","#8A1538","#ffffff","qa"),
    T("Uzbekistan","UZB","AFC",1488,"K","#1EB53A","#0099B5","uz"),
    T("Saudi Arabia","KSA","AFC",1472,"H","#006C35","#ffffff","sa"),
    T("Iraq","IRQ","AFC",1460,"I","#007A3D","#CE1126","iq"),
    T("Jordan","JOR","AFC",1410,"J","#007A3D","#CE1126","jo"),
    // ---- OFC (1) ----
    T("New Zealand","NZL","OFC",1420,"G","#000000","#ffffff","nz"),
  ];

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
  /* 72 matches, 17 matchdays (Thu 11 Jun → Sat 27 Jun). Times are ET 24h.
     ESPN/FIFA schedule grouped late-night kickoffs (00:00–05:00 ET) with the
     PREVIOUS matchday, so e.g. day 3 (Sat 13 Jun) includes AUS-TUR at 00:00.
     `koSortKey()` rolls AM hours past midnight so the day's matches sort in
     chronological play order.                                              */
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
  // matches at 00:00–05:59 ET are *next* ET day but belong to the previous
  // matchday; bump them past 24h so sort puts them last in their matchday.
  function koSortKey(ko) {
    const [h, m] = ko.split(":").map(Number);
    return (h < 6 ? h + 24 : h) * 60 + m;
  }
  // display-formatted kickoff (HH:MM ET, with +1 hint for late-night wraps)
  function fmtKo(fx) {
    const h = parseInt(fx.ko.slice(0, 2), 10);
    return fx.ko + " ET" + (h < 6 ? " (+1)" : "");
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

  function isAlive(state, code) { return (state.teams?.[code]?.status || "alive") === "alive"; }

  // { code: probability(0..1) } across alive teams
  function teamWinProbs(state) {
    const form = formMap(state);
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

  window.SS = {
    TEAMS, GROUP_LETTERS, CONFED_LABEL, SCALE,
    FIXTURES, KICKS, TOURNAMENT_START, TOTAL_DAYS,
    dateForDay, fmtDate, fmtKo, fixturesOnDay, mockScore,
    formMap, formDelta, isAlive, teamWinProbs, playerWinProbs,
    teamsOfPlayer, ownerOf, aliveCount, teamByCode, fmtPct, splitCounts, flagURL, textOn,
    tierLabel, tierSubtitle,
  };
})();
