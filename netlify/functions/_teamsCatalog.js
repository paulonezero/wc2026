// Server-side mirror of the TEAMS field in /sweepstake/data.js — just the
// {code → {name, fifa, group}} subset needed by _snippetGenerator.js and
// _oddsEngine.js. data.js is a browser IIFE on `window.SS` so we can't import
// it from a Netlify function (same constraint as _fixturesIndex.js).
//
// IMPORTANT: when you edit TEAMS in sweepstake/data.js, update this file too.

export const TEAMS_CATALOG = {
  // CONMEBOL
  ARG: { name: "Argentina", fifa: 1876, group: "J" },
  BRA: { name: "Brazil", fifa: 1766, group: "C" },
  URU: { name: "Uruguay", fifa: 1673, group: "H" },
  COL: { name: "Colombia", fifa: 1698, group: "K" },
  ECU: { name: "Ecuador", fifa: 1599, group: "E" },
  PAR: { name: "Paraguay", fifa: 1505, group: "D" },
  // UEFA
  ESP: { name: "Spain", fifa: 1874, group: "H" },
  FRA: { name: "France", fifa: 1871, group: "I" },
  ENG: { name: "England", fifa: 1827, group: "L" },
  POR: { name: "Portugal", fifa: 1766, group: "K" },
  NED: { name: "Netherlands", fifa: 1754, group: "F" },
  BEL: { name: "Belgium", fifa: 1742, group: "G" },
  GER: { name: "Germany", fifa: 1736, group: "E" },
  CRO: { name: "Croatia", fifa: 1715, group: "L" },
  SUI: { name: "Switzerland", fifa: 1650, group: "B" },
  AUT: { name: "Austria", fifa: 1597, group: "J" },
  TUR: { name: "Turkey", fifa: 1606, group: "D" },
  SWE: { name: "Sweden", fifa: 1510, group: "F" },
  NOR: { name: "Norway", fifa: 1557, group: "I" },
  SCO: { name: "Scotland", fifa: 1503, group: "C" },
  CZE: { name: "Czechia", fifa: 1506, group: "A" },
  BIH: { name: "Bosnia & Herzegovina", fifa: 1385, group: "B" },
  // CONCACAF
  USA: { name: "USA", fifa: 1671, group: "D" },
  MEX: { name: "Mexico", fifa: 1687, group: "A" },
  CAN: { name: "Canada", fifa: 1559, group: "B" },
  PAN: { name: "Panama", fifa: 1539, group: "L" },
  CUW: { name: "Curaçao", fifa: 1294, group: "E" },
  HAI: { name: "Haiti", fifa: 1291, group: "C" },
  // CAF
  MAR: { name: "Morocco", fifa: 1755, group: "C" },
  SEN: { name: "Senegal", fifa: 1685, group: "I" },
  EGY: { name: "Egypt", fifa: 1562, group: "G" },
  ALG: { name: "Algeria", fifa: 1571, group: "J" },
  CIV: { name: "Ivory Coast", fifa: 1541, group: "E" },
  TUN: { name: "Tunisia", fifa: 1476, group: "F" },
  COD: { name: "DR Congo", fifa: 1477, group: "K" },
  RSA: { name: "South Africa", fifa: 1429, group: "A" },
  GHA: { name: "Ghana", fifa: 1346, group: "L" },
  CPV: { name: "Cape Verde", fifa: 1366, group: "H" },
  // AFC
  JPN: { name: "Japan", fifa: 1662, group: "F" },
  IRN: { name: "Iran", fifa: 1620, group: "G" },
  KOR: { name: "South Korea", fifa: 1592, group: "A" },
  AUS: { name: "Australia", fifa: 1579, group: "D" },
  QAT: { name: "Qatar", fifa: 1454, group: "B" },
  UZB: { name: "Uzbekistan", fifa: 1459, group: "K" },
  KSA: { name: "Saudi Arabia", fifa: 1421, group: "H" },
  IRQ: { name: "Iraq", fifa: 1447, group: "I" },
  JOR: { name: "Jordan", fifa: 1391, group: "J" },
  // OFC
  NZL: { name: "New Zealand", fifa: 1281, group: "G" },
};

export function teamName(code) {
  return TEAMS_CATALOG[code]?.name || code;
}

export function teamFifa(code) {
  return TEAMS_CATALOG[code]?.fifa ?? 0;
}
