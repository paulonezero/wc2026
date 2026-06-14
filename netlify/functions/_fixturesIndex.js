// Server-side index of the 72 group-stage fixtures, keyed by the ET-local
// kickoff date. Mirrors the FIXTURES array in /sweepstake/data.js — that file
// is a browser IIFE on `window.SS` and can't be imported from a Netlify
// function, so we keep a slim copy here.
//
// IMPORTANT: when you edit FIXTURES in sweepstake/data.js, update this file too.
//
// Date rule (matches data.js koSortKey / fmtKo conventions):
//   - ko 00:00–05:59 ET → late-night fixture grouped with previous matchday,
//     date = TOURNAMENT_START + day        (calendar day after the matchday)
//   - else             → date = TOURNAMENT_START + (day - 1)
//
// `ko` is the ET-local 24h kickoff time. With EDT = UTC-4 throughout the
// tournament window, kickoffUTC = Date.parse(`${date}T${ko}:00-04:00`).
// `_ingest.js` uses this to decide whether a fixture's likely finish time
// (kickoff + ~2.5h) has elapsed and we should bother calling football-data.

export const FIXTURES_INDEX = [
  // Day 1 · Thu 11 Jun
  { id: "gAr0m0", date: "2026-06-11", ko: "15:00", home: "MEX", away: "RSA" },
  { id: "gAr0m1", date: "2026-06-11", ko: "22:00", home: "KOR", away: "CZE" },
  // Day 2 · Fri 12 Jun
  { id: "gBr0m0", date: "2026-06-12", ko: "15:00", home: "CAN", away: "BIH" },
  { id: "gDr0m0", date: "2026-06-12", ko: "21:00", home: "USA", away: "PAR" },
  // Day 3 · Sat 13 Jun
  { id: "gBr0m1", date: "2026-06-13", ko: "15:00", home: "QAT", away: "SUI" },
  { id: "gCr0m0", date: "2026-06-13", ko: "18:00", home: "BRA", away: "MAR" },
  { id: "gCr0m1", date: "2026-06-13", ko: "21:00", home: "HAI", away: "SCO" },
  { id: "gDr0m1", date: "2026-06-14", ko: "00:00", home: "AUS", away: "TUR" }, // ko 00:00 → next ET day
  // Day 4 · Sun 14 Jun
  { id: "gEr0m0", date: "2026-06-14", ko: "13:00", home: "GER", away: "CUW" },
  { id: "gFr0m0", date: "2026-06-14", ko: "16:00", home: "NED", away: "JPN" },
  { id: "gEr0m1", date: "2026-06-14", ko: "19:00", home: "CIV", away: "ECU" },
  { id: "gFr0m1", date: "2026-06-14", ko: "22:00", home: "SWE", away: "TUN" },
  // Day 5 · Mon 15 Jun
  { id: "gHr0m0", date: "2026-06-15", ko: "13:00", home: "ESP", away: "CPV" },
  { id: "gGr0m0", date: "2026-06-15", ko: "18:00", home: "BEL", away: "EGY" },
  { id: "gHr0m1", date: "2026-06-15", ko: "18:00", home: "KSA", away: "URU" },
  { id: "gGr0m1", date: "2026-06-16", ko: "00:00", home: "IRN", away: "NZL" }, // ko 00:00
  // Day 6 · Tue 16 Jun
  { id: "gIr0m0", date: "2026-06-16", ko: "15:00", home: "FRA", away: "SEN" },
  { id: "gIr0m1", date: "2026-06-16", ko: "18:00", home: "IRQ", away: "NOR" },
  { id: "gJr0m0", date: "2026-06-16", ko: "21:00", home: "ARG", away: "ALG" },
  { id: "gJr0m1", date: "2026-06-17", ko: "00:00", home: "AUT", away: "JOR" }, // ko 00:00
  // Day 7 · Wed 17 Jun
  { id: "gKr0m0", date: "2026-06-17", ko: "13:00", home: "POR", away: "COD" },
  { id: "gLr0m0", date: "2026-06-17", ko: "16:00", home: "ENG", away: "CRO" },
  { id: "gLr0m1", date: "2026-06-17", ko: "19:00", home: "GHA", away: "PAN" },
  { id: "gKr0m1", date: "2026-06-17", ko: "22:00", home: "UZB", away: "COL" },
  // Day 8 · Thu 18 Jun
  { id: "gAr1m0", date: "2026-06-18", ko: "12:00", home: "CZE", away: "RSA" },
  { id: "gBr1m0", date: "2026-06-18", ko: "15:00", home: "SUI", away: "BIH" },
  { id: "gBr1m1", date: "2026-06-18", ko: "18:00", home: "CAN", away: "QAT" },
  { id: "gAr1m1", date: "2026-06-18", ko: "23:00", home: "MEX", away: "KOR" },
  // Day 9 · Fri 19 Jun
  { id: "gDr1m0", date: "2026-06-19", ko: "15:00", home: "USA", away: "AUS" },
  { id: "gCr1m0", date: "2026-06-19", ko: "18:00", home: "SCO", away: "MAR" },
  { id: "gCr1m1", date: "2026-06-19", ko: "21:00", home: "BRA", away: "HAI" },
  { id: "gDr1m1", date: "2026-06-20", ko: "00:00", home: "TUR", away: "PAR" }, // ko 00:00
  // Day 10 · Sat 20 Jun
  { id: "gFr1m0", date: "2026-06-20", ko: "13:00", home: "NED", away: "SWE" },
  { id: "gEr1m0", date: "2026-06-20", ko: "16:00", home: "GER", away: "CIV" },
  { id: "gEr1m1", date: "2026-06-20", ko: "20:00", home: "ECU", away: "CUW" },
  { id: "gFr1m1", date: "2026-06-21", ko: "00:00", home: "TUN", away: "JPN" }, // ko 00:00
  // Day 11 · Sun 21 Jun
  { id: "gHr1m0", date: "2026-06-21", ko: "12:00", home: "ESP", away: "KSA" },
  { id: "gGr1m0", date: "2026-06-21", ko: "15:00", home: "BEL", away: "IRN" },
  { id: "gHr1m1", date: "2026-06-21", ko: "18:00", home: "URU", away: "CPV" },
  { id: "gGr1m1", date: "2026-06-21", ko: "21:00", home: "NZL", away: "EGY" },
  // Day 12 · Mon 22 Jun
  { id: "gJr1m0", date: "2026-06-22", ko: "13:00", home: "ARG", away: "AUT" },
  { id: "gIr1m0", date: "2026-06-22", ko: "17:00", home: "FRA", away: "IRQ" },
  { id: "gIr1m1", date: "2026-06-22", ko: "20:00", home: "NOR", away: "SEN" },
  { id: "gJr1m1", date: "2026-06-22", ko: "23:00", home: "JOR", away: "ALG" },
  // Day 13 · Tue 23 Jun
  { id: "gKr1m0", date: "2026-06-23", ko: "13:00", home: "POR", away: "UZB" },
  { id: "gLr1m0", date: "2026-06-23", ko: "16:00", home: "ENG", away: "GHA" },
  { id: "gLr1m1", date: "2026-06-23", ko: "19:00", home: "PAN", away: "CRO" },
  { id: "gKr1m1", date: "2026-06-23", ko: "22:00", home: "COL", away: "COD" },
  // Day 14 · Wed 24 Jun
  { id: "gBr2m0", date: "2026-06-24", ko: "15:00", home: "SUI", away: "CAN" },
  { id: "gBr2m1", date: "2026-06-24", ko: "15:00", home: "BIH", away: "QAT" },
  { id: "gCr2m0", date: "2026-06-24", ko: "18:00", home: "SCO", away: "BRA" },
  { id: "gCr2m1", date: "2026-06-24", ko: "18:00", home: "MAR", away: "HAI" },
  { id: "gAr2m0", date: "2026-06-24", ko: "21:00", home: "CZE", away: "MEX" },
  { id: "gAr2m1", date: "2026-06-24", ko: "21:00", home: "RSA", away: "KOR" },
  // Day 15 · Thu 25 Jun
  { id: "gEr2m0", date: "2026-06-25", ko: "16:00", home: "ECU", away: "GER" },
  { id: "gEr2m1", date: "2026-06-25", ko: "16:00", home: "CUW", away: "CIV" },
  { id: "gFr2m0", date: "2026-06-25", ko: "19:00", home: "JPN", away: "SWE" },
  { id: "gFr2m1", date: "2026-06-25", ko: "19:00", home: "TUN", away: "NED" },
  { id: "gDr2m0", date: "2026-06-25", ko: "22:00", home: "TUR", away: "USA" },
  { id: "gDr2m1", date: "2026-06-25", ko: "22:00", home: "PAR", away: "AUS" },
  // Day 16 · Fri 26 Jun
  { id: "gIr2m0", date: "2026-06-26", ko: "15:00", home: "NOR", away: "FRA" },
  { id: "gIr2m1", date: "2026-06-26", ko: "15:00", home: "SEN", away: "IRQ" },
  { id: "gHr2m0", date: "2026-06-26", ko: "20:00", home: "URU", away: "ESP" },
  { id: "gHr2m1", date: "2026-06-26", ko: "20:00", home: "CPV", away: "KSA" },
  { id: "gGr2m0", date: "2026-06-26", ko: "23:00", home: "EGY", away: "IRN" },
  { id: "gGr2m1", date: "2026-06-26", ko: "23:00", home: "NZL", away: "BEL" },
  // Day 17 · Sat 27 Jun
  { id: "gLr2m0", date: "2026-06-27", ko: "17:00", home: "PAN", away: "ENG" },
  { id: "gLr2m1", date: "2026-06-27", ko: "17:00", home: "CRO", away: "GHA" },
  { id: "gKr2m0", date: "2026-06-27", ko: "19:30", home: "COL", away: "POR" },
  { id: "gKr2m1", date: "2026-06-27", ko: "19:30", home: "COD", away: "UZB" },
  { id: "gJr2m0", date: "2026-06-27", ko: "22:00", home: "ALG", away: "AUT" },
  { id: "gJr2m1", date: "2026-06-27", ko: "22:00", home: "JOR", away: "ARG" },
];

// Lookup map: "YYYY-MM-DD|HOME|AWAY" → fixture id. Built once at module load.
export const FIXTURE_KEY_TO_ID = (() => {
  const map = {};
  for (const fx of FIXTURES_INDEX) map[`${fx.date}|${fx.home}|${fx.away}`] = fx.id;
  return map;
})();

// Look up by ET calendar date and team pair. Falls back to ±1 day if the
// upstream UTC→ET conversion drifts at the boundary.
export function findFixtureId(etDate, home, away) {
  const direct = FIXTURE_KEY_TO_ID[`${etDate}|${home}|${away}`];
  if (direct) return direct;
  const d = new Date(etDate + "T00:00:00Z");
  for (const delta of [-1, 1]) {
    const t = new Date(d.getTime() + delta * 86400000);
    const ds = t.toISOString().slice(0, 10);
    const hit = FIXTURE_KEY_TO_ID[`${ds}|${home}|${away}`];
    if (hit) return hit;
  }
  return null;
}

// UTC ms timestamp for a fixture's ET-local kickoff. EDT = UTC-4 throughout
// the WC 2026 window (11–27 Jun + KO into July, all still in DST).
export function kickoffUtcMs(fx) {
  return Date.parse(`${fx.date}T${fx.ko}:00-04:00`);
}

// A fixture is "ready to be fetched" when its likely finish time has passed
// (kickoff + ~2.5h covers 90 mins + ET + a stoppage/lateness buffer). The
// ingest pipeline uses this to skip API calls when nothing has happened.
const FINISH_BUFFER_MS = 2.5 * 3600 * 1000;
export function fixtureLikelyFinishedAt(fx, nowMs) {
  return nowMs >= kickoffUtcMs(fx) + FINISH_BUFFER_MS;
}

// Tournament window — used to decide whether to always-fetch during the KO
// phase (KO fixtures aren't in this index since the bracket builds dynamically).
// Group stage final whistle ≈ last group fixture finish; KO begins shortly after.
export const GROUP_STAGE_END_ISO = "2026-06-28T00:00:00Z"; // a few hours after last group ko
export const TOURNAMENT_END_ISO = "2026-07-20T00:00:00Z";  // generous KO+final buffer
