/* ============================================================================
   SWEEPSTAKE · WORLD CUP 2026 — data + fixtures + odds engine
   Plain JS, attaches globals to window. No build step.
   ========================================================================== */
(function () {
  "use strict";

  /* ---- 48-team field (plausible 2026 World Cup) -------------------------- */
  const T = (name, code, confed, fifa, c1, c2, ink) =>
    ({ name, code, confed, fifa, colors: [c1, c2], ink: !!ink });

  const TEAMS = [
    T("Argentina","ARG","CONMEBOL",1885,"#6CB7E8","#ffffff",true),
    T("Brazil","BRA","CONMEBOL",1790,"#FFDC00","#009C3B",true),
    T("Uruguay","URU","CONMEBOL",1680,"#5BB0E8","#ffffff",true),
    T("Colombia","COL","CONMEBOL",1690,"#FCD116","#0033A0",true),
    T("Ecuador","ECU","CONMEBOL",1585,"#FFD100","#0033A0",true),
    T("Paraguay","PAR","CONMEBOL",1500,"#DA121A","#0038A8"),
    T("Venezuela","VEN","CONMEBOL",1480,"#CE1126","#FFCC00"),
    T("France","FRA","UEFA",1860,"#1F3A93","#ED2939"),
    T("Spain","ESP","UEFA",1855,"#C60B1E","#FFC400"),
    T("England","ENG","UEFA",1820,"#ffffff","#CF142B",true),
    T("Portugal","POR","UEFA",1775,"#006600","#FF0000"),
    T("Netherlands","NED","UEFA",1750,"#FF6A13","#21468B"),
    T("Belgium","BEL","UEFA",1740,"#E30613","#FDDA24"),
    T("Italy","ITA","UEFA",1715,"#0066CC","#ffffff"),
    T("Germany","GER","UEFA",1710,"#111111","#DD0000"),
    T("Croatia","CRO","UEFA",1700,"#C8102E","#ffffff"),
    T("Switzerland","SUI","UEFA",1650,"#DA291C","#ffffff"),
    T("Denmark","DEN","UEFA",1630,"#C8102E","#ffffff"),
    T("Austria","AUT","UEFA",1600,"#ED2939","#ffffff"),
    T("Ukraine","UKR","UEFA",1595,"#0057B7","#FFD700"),
    T("Serbia","SRB","UEFA",1580,"#C6363C","#0C4076"),
    T("Turkey","TUR","UEFA",1575,"#E30A17","#ffffff"),
    T("Norway","NOR","UEFA",1570,"#BA0C2F","#00205B"),
    T("USA","USA","CONCACAF",1660,"#0A3161","#B31942"),
    T("Mexico","MEX","CONCACAF",1645,"#006847","#CE1126"),
    T("Canada","CAN","CONCACAF",1560,"#C8102E","#ffffff"),
    T("Costa Rica","CRC","CONCACAF",1490,"#002B7F","#CE1126"),
    T("Panama","PAN","CONCACAF",1470,"#DA121A","#005293"),
    T("Jamaica","JAM","CONCACAF",1450,"#009B3A","#FED100",true),
    T("Morocco","MAR","CAF",1695,"#C1272D","#006233"),
    T("Senegal","SEN","CAF",1640,"#00853F","#FDEF42",true),
    T("Egypt","EGY","CAF",1565,"#CE1126","#000000"),
    T("Nigeria","NGA","CAF",1555,"#008751","#ffffff"),
    T("Algeria","ALG","CAF",1545,"#006233","#ffffff"),
    T("Ivory Coast","CIV","CAF",1535,"#FF8200","#009A44"),
    T("Cameroon","CMR","CAF",1505,"#007A5E","#CE1126"),
    T("Tunisia","TUN","CAF",1495,"#E70013","#ffffff"),
    T("Ghana","GHA","CAF",1485,"#006B3F","#FCD116"),
    T("Japan","JPN","AFC",1635,"#1560BD","#ffffff"),
    T("Iran","IRN","AFC",1620,"#239F40","#DA0000"),
    T("Korea Republic","KOR","AFC",1610,"#CD2E3A","#0047A0"),
    T("Australia","AUS","AFC",1590,"#FFCD00","#00843D",true),
    T("Saudi Arabia","KSA","AFC",1530,"#006C35","#ffffff"),
    T("Qatar","QAT","AFC",1520,"#8A1538","#ffffff"),
    T("Iraq","IRQ","AFC",1500,"#007A3D","#CE1126"),
    T("Uzbekistan","UZB","AFC",1490,"#1EB53A","#0099B5"),
    T("Jordan","JOR","AFC",1465,"#007A3D","#CE1126"),
    T("New Zealand","NZL","OFC",1440,"#000000","#ffffff"),
  ];

  /* ---- group assignment: snake-seed by ranking into 12 groups A–L ------- */
  const GROUP_LETTERS = "ABCDEFGHIJKL".split("");
  (function assignGroups() {
    const sorted = [...TEAMS].sort((a, b) => b.fifa - a.fifa);
    sorted.forEach((t, i) => {
      const band = Math.floor(i / 12);
      const idx = i % 12;
      const g = band % 2 === 0 ? idx : 11 - idx;
      t.group = GROUP_LETTERS[g];
      t.seed = band + 1;
    });
  })();

  const CONFED_LABEL = {
    UEFA: "UEFA", CONMEBOL: "CONMEBOL", CONCACAF: "CONCACAF",
    CAF: "CAF", AFC: "AFC", OFC: "OFC",
  };
  const byCode = {}; TEAMS.forEach(t => byCode[t.code] = t);
  function teamByCode(code) { return byCode[code]; }

  /* ---- ISO codes for real flags (flagcdn.com) --------------------------- */
  const ISO = {
    ARG:"ar", BRA:"br", URU:"uy", COL:"co", ECU:"ec", PAR:"py", VEN:"ve",
    FRA:"fr", ESP:"es", ENG:"gb-eng", POR:"pt", NED:"nl", BEL:"be", ITA:"it",
    GER:"de", CRO:"hr", SUI:"ch", DEN:"dk", AUT:"at", UKR:"ua", SRB:"rs",
    TUR:"tr", NOR:"no", USA:"us", MEX:"mx", CAN:"ca", CRC:"cr", PAN:"pa",
    JAM:"jm", MAR:"ma", SEN:"sn", EGY:"eg", NGA:"ng", ALG:"dz", CIV:"ci",
    CMR:"cm", TUN:"tn", GHA:"gh", JPN:"jp", IRN:"ir", KOR:"kr", AUS:"au",
    KSA:"sa", QAT:"qa", IRQ:"iq", UZB:"uz", JOR:"jo", NZL:"nz",
  };
  TEAMS.forEach(t => t.iso = ISO[t.code]);
  function flagURL(team, w = 160) {
    const iso = typeof team === "string" ? ISO[team] : team.iso;
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
  function splitCounts(n) {
    if (!n) return [];
    const base = Math.floor(TEAMS.length / n), extra = TEAMS.length % n;
    return Array.from({ length: n }, (_, i) => base + (i < extra ? 1 : 0));
  }

  window.SS = {
    TEAMS, GROUP_LETTERS, CONFED_LABEL, SCALE,
    FIXTURES, KICKS, TOURNAMENT_START, TOTAL_DAYS,
    dateForDay, fmtDate, fixturesOnDay, mockScore,
    formMap, formDelta, isAlive, teamWinProbs, playerWinProbs,
    teamsOfPlayer, ownerOf, aliveCount, teamByCode, fmtPct, splitCounts, flagURL,
  };
})();
