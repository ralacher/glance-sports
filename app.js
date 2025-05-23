const express = require('express')
const fs = require('fs');
const path = require('path');

const app = express()
const port = 3000

// Read and parse config.json once, make globally available
const configPath = path.join(__dirname, 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

global.config = config;

app.get('/sports', async (req, res) => {
  let response = { results: [] };

  // Loop over each league in config.json
  for (let league in config) {
    let leagueConfig = config[league];
    if (Array.isArray(leagueConfig.teams) && leagueConfig.teams.length > 0) {
      for (let teamId of leagueConfig.teams) {
        // Only call parseMlb for MLB, otherwise skip or implement other league logic
        let result = await parseTeam(leagueConfig.url, teamId);
        if (result) {
          response.results.push(result);
        }
      }
    }
  }
  res.json(response);
})

// Utility function to parse MLB standings for a given team ID
async function parseTeam(url, teamId) {
  try {
    console.debug("Parsing data for team ID: " + teamId);
    let response = await fetch(url + teamId);
    let json = await response.json();
    let data = {};
    data.displayName = json.team?.displayName || null;
    data.logo = json.team?.logos?.[0]?.href || null;
    // summary contains wins-ties?-losses
    // e.g. 10-2-0
    // split into wins, ties, losses attributes
    // ties may not exist, it could just be wins-losses
    let summary = json.team?.record?.items?.[0]?.summary || null;
    let parts = summary ? summary.split('-') : [];
    data.wins = parts[0] || null;
    data.losses = parts.length === 3 ? parts[2] : (parts[1] || null);
    data.ties = parts.length === 3 ? parts[1] : null;
    let dateStr = json.team?.nextEvent?.[0]?.date || null;
    data.date = dateStr ? new Date(dateStr).toLocaleString('en-US', {
      month: 'long',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }) : null;
    data.shortName = json.team?.nextEvent?.[0]?.shortName || null;
    return data.date ? data : null;
  } catch (e) {
    console.log("Error parsing data for team ID: " + teamId, e);
    return null;
  }
}

app.listen(port, () => {
  console.log(`App listening on port ${port}`)
})
