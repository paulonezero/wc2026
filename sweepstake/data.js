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

  /* ---- fixtures: full group-stage schedule, 72 matches over 12 days ------ */
  const KICKS = ["13:00", "16:00", "19:00", "22:00"];
  const TOURNAMENT_START = "2026-06-11";
  const TOTAL_DAYS = 12;

  function dateForDay(day) {
    const base = new Date(TOURNAMENT_START + "T00:00:00");
    base.setDate(base.getDate() + (day - 1));
    return base;
  }
  function fmtDate(day) {
    const d = dateForDay(day);
    return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  }

  const FIXTURES = (function build() {
    const fx = [];
    GROUP_LETTERS.forEach((L, g) => {
      const grp = TEAMS.filter(t => t.group === L).sort((a, b) => b.fifa - a.fifa);
      const [t0, t1, t2, t3] = grp;
      const rounds = [
        [[t0, t1], [t2, t3]],
        [[t0, t2], [t3, t1]],
        [[t0, t3], [t1, t2]],
      ];
      rounds.forEach((pairs, r) => {
        pairs.forEach((m, mi) => {
          const day = r * 4 + Math.floor(g / 3) + 1;
          fx.push({
            id: `g${L}r${r}m${mi}`, day, round: "group", group: L,
            home: m[0].code, away: m[1].code,
            ko: KICKS[(g * 2 + mi) % 4],
          });
        });
      });
    });
    return fx.sort((a, b) => a.day - b.day || a.ko.localeCompare(b.ko));
  })();

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
    dateForDay, fmtDate, fixturesOnDay, mockScore,
    formMap, formDelta, isAlive, teamWinProbs, playerWinProbs,
    teamsOfPlayer, ownerOf, aliveCount, teamByCode, fmtPct, splitCounts, flagURL, textOn,
    tierLabel, tierSubtitle,
  };
})();
