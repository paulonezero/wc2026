// Maps football-data.org team names → our 3-letter codes from sweepstake/data.js.
// Includes defensive aliases for variants football-data has used historically.
// Unknown names surface as `warnings` on the next ingest — add them here.

export const TEAM_NAME_TO_CODE = {
  // CONMEBOL
  "Argentina": "ARG",
  "Brazil": "BRA",
  "Uruguay": "URU",
  "Colombia": "COL",
  "Ecuador": "ECU",
  "Paraguay": "PAR",

  // UEFA
  "Spain": "ESP",
  "France": "FRA",
  "England": "ENG",
  "Portugal": "POR",
  "Netherlands": "NED",
  "Belgium": "BEL",
  "Germany": "GER",
  "Croatia": "CRO",
  "Switzerland": "SUI",
  "Austria": "AUT",
  "Turkey": "TUR",
  "Türkiye": "TUR",
  "Sweden": "SWE",
  "Norway": "NOR",
  "Scotland": "SCO",
  "Czechia": "CZE",
  "Czech Republic": "CZE",
  "Bosnia & Herzegovina": "BIH",
  "Bosnia and Herzegovina": "BIH",
  "Bosnia-Herzegovina": "BIH",

  // CONCACAF
  "USA": "USA",
  "United States": "USA",
  "Mexico": "MEX",
  "Canada": "CAN",
  "Panama": "PAN",
  "Curaçao": "CUW",
  "Curacao": "CUW",
  "Haiti": "HAI",

  // CAF
  "Morocco": "MAR",
  "Senegal": "SEN",
  "Egypt": "EGY",
  "Algeria": "ALG",
  "Ivory Coast": "CIV",
  "Côte d'Ivoire": "CIV",
  "Cote d'Ivoire": "CIV",
  "Tunisia": "TUN",
  "DR Congo": "COD",
  "Congo DR": "COD",
  "Democratic Republic of the Congo": "COD",
  "South Africa": "RSA",
  "Ghana": "GHA",
  "Cape Verde": "CPV",
  "Cabo Verde": "CPV",

  // AFC
  "Japan": "JPN",
  "Iran": "IRN",
  "IR Iran": "IRN",
  "South Korea": "KOR",
  "Korea Republic": "KOR",
  "Australia": "AUS",
  "Qatar": "QAT",
  "Uzbekistan": "UZB",
  "Saudi Arabia": "KSA",
  "Iraq": "IRQ",
  "Jordan": "JOR",

  // OFC
  "New Zealand": "NZL",
};

export function codeFromName(name) {
  if (!name) return null;
  return TEAM_NAME_TO_CODE[name] || TEAM_NAME_TO_CODE[name.trim()] || null;
}
