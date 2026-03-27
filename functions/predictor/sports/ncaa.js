'use strict'

const SPORT_KEY = 'basketball_ncaab'
const SPORT_LABEL = 'NCAAB'

// Common top-program abbreviations. Falls back to dynamic generation.
const TEAM_ABBR = {
  'Alabama Crimson Tide': 'ALA', 'Arizona Wildcats': 'ARIZ', 'Arizona State Sun Devils': 'ASU',
  'Arkansas Razorbacks': 'ARK', 'Auburn Tigers': 'AUB', 'Baylor Bears': 'BAY',
  'BYU Cougars': 'BYU', 'Cincinnati Bearcats': 'CIN', 'Clemson Tigers': 'CLEM',
  'Colorado Buffaloes': 'COL', 'Connecticut Huskies': 'CONN', 'Creighton Bluejays': 'CRE',
  'Duke Blue Devils': 'DUKE', 'Florida Gators': 'FLA', 'Florida State Seminoles': 'FSU',
  'Georgetown Hoyas': 'GTWN', 'Georgia Bulldogs': 'UGA', 'Georgia Tech Yellow Jackets': 'GT',
  'Gonzaga Bulldogs': 'GONZ', 'Houston Cougars': 'HOU', 'Illinois Fighting Illini': 'ILL',
  'Indiana Hoosiers': 'IND', 'Iowa Hawkeyes': 'IOWA', 'Iowa State Cyclones': 'ISU',
  'Kansas Jayhawks': 'KU', 'Kansas State Wildcats': 'KSU', 'Kentucky Wildcats': 'UK',
  'Louisville Cardinals': 'LOU', 'LSU Tigers': 'LSU', 'Marquette Golden Eagles': 'MU',
  'Maryland Terrapins': 'UMD', 'Memphis Tigers': 'MEM', 'Miami Hurricanes': 'MIA',
  'Michigan Wolverines': 'MICH', 'Michigan State Spartans': 'MSU', 'Minnesota Golden Gophers': 'MINN',
  'Mississippi State Bulldogs': 'MSST', 'Missouri Tigers': 'MIZ', 'Nebraska Cornhuskers': 'NEB',
  'North Carolina Tar Heels': 'UNC', 'North Carolina State Wolfpack': 'NCST',
  'Notre Dame Fighting Irish': 'ND', 'Ohio State Buckeyes': 'OSU', 'Oklahoma Sooners': 'OU',
  'Oklahoma State Cowboys': 'OKST', 'Ole Miss Rebels': 'MISS', 'Oregon Ducks': 'ORE',
  'Penn State Nittany Lions': 'PSU', 'Pittsburgh Panthers': 'PITT', 'Purdue Boilermakers': 'PUR',
  'Rutgers Scarlet Knights': 'RUT', 'Saint Mary\'s Gaels': 'SMC', 'San Diego State Aztecs': 'SDSU',
  'South Carolina Gamecocks': 'SC', 'Syracuse Orange': 'SYR', 'TCU Horned Frogs': 'TCU',
  'Tennessee Volunteers': 'TENN', 'Texas Longhorns': 'TEX', 'Texas A&M Aggies': 'TAMU',
  'Texas Tech Red Raiders': 'TTU', 'UCLA Bruins': 'UCLA', 'USC Trojans': 'USC',
  'Utah Utes': 'UTAH', 'Vanderbilt Commodores': 'VAN', 'Villanova Wildcats': 'NOVA',
  'Virginia Cavaliers': 'UVA', 'Virginia Tech Hokies': 'VT', 'Wake Forest Demon Deacons': 'WF',
  'Washington Huskies': 'WASH', 'West Virginia Mountaineers': 'WVU', 'Wisconsin Badgers': 'WIS',
  'Xavier Musketeers': 'XAV',
}

/**
 * Generates an abbreviation for any NCAA team not in the lookup table.
 * Takes the first letter of each significant word, max 4 chars.
 */
function getAbbr(teamName) {
  if (TEAM_ABBR[teamName]) return TEAM_ABBR[teamName]
  const stopWords = new Set(['of', 'the', 'at', 'and', '&'])
  const words = teamName.split(' ').filter((w) => !stopWords.has(w.toLowerCase()))
  if (words.length === 1) return words[0].slice(0, 4).toUpperCase()
  return words.map((w) => w[0]).join('').toUpperCase().slice(0, 4)
}

module.exports = { SPORT_KEY, SPORT_LABEL, TEAM_ABBR, getAbbr }
