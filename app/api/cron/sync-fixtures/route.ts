import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getFixturesForSeason, parseRoundNumber, mapApiStatus } from '@/lib/api-football';

const SEASON = 2025; // 2025-2026 season

export async function GET() {
  try {
    const apiFixtures = await getFixturesForSeason(SEASON);

    if (!apiFixtures || apiFixtures.length === 0) {
      return NextResponse.json({ message: 'No fixtures found from API', synced: 0 });
    }

    let synced = 0;

    for (const f of apiFixtures) {
      const matchweek = parseRoundNumber(f.league.round);
      if (matchweek === 0) continue;

      const fixtureData = {
        api_fixture_id: f.fixture.id,
        matchweek,
        home_team: f.teams.home.name,
        away_team: f.teams.away.name,
        home_logo: f.teams.home.logo,
        away_logo: f.teams.away.logo,
        kick_off: f.fixture.date,
        home_score: f.goals.home,
        away_score: f.goals.away,
        status: mapApiStatus(f.fixture.status.short),
        season: SEASON,
      };

      const { error } = await supabaseAdmin
        .from('fixtures')
        .upsert(fixtureData, { onConflict: 'api_fixture_id' });

      if (error) {
        console.error(`Error syncing fixture ${f.fixture.id}:`, error);
      } else {
        synced++;
      }
    }

    // Update last sync time
    await supabaseAdmin
      .from('settings')
      .upsert({ key: 'last_sync_time', value: new Date().toISOString() }, { onConflict: 'key' });

    return NextResponse.json({ message: 'Sync complete', synced });
  } catch (error) {
    console.error('Fixture sync error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
