// Server-side mirror of the TEAMS field in /sweepstake/data.js — just the
// {code → {name, fifa}} subset needed by _snippetGenerator.js. data.js is a
// browser IIFE on `window.SS` so we can't import it from a Netlify function
// (same constraint as _fixturesIndex.js).
//
// IMPORTANT: when you edit TEAMS in sweepstake/data.js, update this file too.

export const TEAMS_CATALOG = {
  // CONMEBOL
  ARG: { name: "Argentina", fifa: 1876 },
  BRA: { name: "Brazil", fifa: 1766 },
  URU: { name: "Uruguay", fifa: 1673 },
  COL: { name: "Colombia", fifa: 1698 },
  ECU: { name: "Ecuador", fifa: 1599 },
  PAR: { name: "Paraguay", fifa: 1505 },
  // UEFA
  ESP: { name: "Spain", fifa: 1874 },
  FRA: { name: "France", fifa: 1871 },
  ENG: { name: "England", fifa: 1827 },
  POR: { name: "Portugal", fifa: 1766 },
  NED: { name: "Netherlands", fifa: 1754 },
  BEL: { name: "Belgium", fifa: 1742 },
  GER: { name: "Germany", fifa: 1736 },
  CRO: { name: "Croatia", fifa: 1715 },
  SUI: { name: "Switzerland", fifa: 1650 },
  AUT: { name: "Austria", fifa: 1597 },
  TUR: { name: "Turkey", fifa: 1606 },
  SWE: { name: "Sweden", fifa: 1510 },
  NOR: { name: "Norway", fifa: 1557 },
  SCO: { name: "Scotland", fifa: 1503 },
  CZE: { name: "Czechia", fifa: 1506 },
  BIH: { name: "Bosnia & Herzegovina", fifa: 1385 },
  // CONCACAF
  USA: { name: "USA", fifa: 1671 },
  MEX: { name: "Mexico", fifa: 1687 },
  CAN: { name: "Canada", fifa: 1559 },
  PAN: { name: "Panama", fifa: 1539 },
  CUW: { name: "Curaçao", fifa: 1294 },
  HAI: { name: "Haiti", fifa: 1291 },
  // CAF
  MAR: { name: "Morocco", fifa: 1755 },
  SEN: { name: "Senegal", fifa: 1685 },
  EGY: { name: "Egypt", fifa: 1562 },
  ALG: { name: "Algeria", fifa: 1571 },
  CIV: { name: "Ivory Coast", fifa: 1541 },
  TUN: { name: "Tunisia", fifa: 1476 },
  COD: { name: "DR Congo", fifa: 1477 },
  RSA: { name: "South Africa", fifa: 1429 },
  GHA: { name: "Ghana", fifa: 1346 },
  CPV: { name: "Cape Verde", fifa: 1366 },
  // AFC
  JPN: { name: "Japan", fifa: 1662 },
  IRN: { name: "Iran", fifa: 1620 },
  KOR: { name: "South Korea", fifa: 1592 },
  AUS: { name: "Australia", fifa: 1579 },
  QAT: { name: "Qatar", fifa: 1454 },
  UZB: { name: "Uzbekistan", fifa: 1459 },
  KSA: { name: "Saudi Arabia", fifa: 1421 },
  IRQ: { name: "Iraq", fifa: 1447 },
  JOR: { name: "Jordan", fifa: 1391 },
  // OFC
  NZL: { name: "New Zealand", fifa: 1281 },
};

export function teamName(code) {
  return TEAMS_CATALOG[code]?.name || code;
}

export function teamFifa(code) {
  return TEAMS_CATALOG[code]?.fifa ?? 0;
}
