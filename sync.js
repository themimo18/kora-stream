const API_KEY = process.env.API_FOOTBALL_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// الدوريات الكبار + البرتغالي + الهولندي + السعودي
const ALLOWED_LEAGUES = [2, 3, 848, 39, 140, 135, 78, 61, 88, 94, 307];

async function fetchDay(dateStr) {
  const res = await fetch(`https://v3.football.api-sports.io/fixtures?date=${dateStr}`, {
    headers: { 'x-apisports-key': API_KEY }
  });
  if (!res.ok) throw new Error(`API-Football Error: ${res.status}`);
  const data = await res.json();

  return (data.response || [])
    .filter(m => ALLOWED_LEAGUES.includes(m.league.id))
    .map(m => ({
      id: m.fixture.id,
      league_id: m.league.id,
      league_name: m.league.name,
      league_logo: m.league.logo,
      home_team: m.teams.home.name,
      home_logo: m.teams.home.logo,
      away_team: m.teams.away.name,
      away_logo: m.teams.away.logo,
      home_score: m.goals.home ?? 0,
      away_score: m.goals.away ?? 0,
      status: m.fixture.status.short,
      elapsed: m.fixture.status.elapsed ?? 0,
      match_time: m.fixture.date,
      updated_at: new Date().toISOString()
    }));
}

async function syncMatches() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const d1 = today.toISOString().split('T')[0];
  const d2 = tomorrow.toISOString().split('T')[0];

  const [m1, m2] = await Promise.all([fetchDay(d1), fetchDay(d2)]);
  const matches = [...m1, ...m2];

  if (matches.length === 0) return console.log('No matches found.');

  const headers = {
    'apikey': SUPABASE_SERVICE_KEY,
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates'
  };
  if (SUPABASE_SERVICE_KEY.startsWith('eyJ')) {
    headers['Authorization'] = `Bearer ${SUPABASE_SERVICE_KEY}`;
  }

  const sbRes = await fetch(`${SUPABASE_URL}/rest/v1/matches?on_conflict=id`, {
    method: 'POST',
    headers,
    body: JSON.stringify(matches)
  });

  if (!sbRes.ok) throw new Error(`Supabase Error: ${await sbRes.text()}`);
  console.log(`✅ Synced ${matches.length} matches (${d1} & ${d2})`);
}

syncMatches().catch(err => {
  console.error(err);
  process.exit(1);
});
