import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  getSeasonFixtures,
  parseRoundNumber,
  mapEventStatus,
  buildKickOff,
} from '@/lib/api-football';

const SEASON = '2025-2026';

export async function GET() {
  try {
    const events = await getSeasonFixtures(SEASON);

    if (!events || events.length === 0) {
      return NextResponse.json({ message: 'No fixtures found from TheSportsDB', synced: 0 });
    }

    let synced = 0;

    for (const event of events) {
      const matchweek = parseRoundNumber(event.intRound);
      if (matchweek === 0) continue;

      const homeScore = event.intHomeScore !== null ? parseInt(event.intHomeScore, 10) : null;
      const awayScore = event.intAwayScore !== null ? parseInt(event.intAwayScore, 10) : null;

      const fixtureData = {
        api_fixture_id: parseInt(event.idEvent, 10),
        matchweek,
        home_team: event.strHomeTeam,
        away_team: event.strAwayTeam,
        home_logo: event.strHomeTeamBadge,
        away_logo: event.strAwayTeamBadge,
        kick_off: buildKickOff(event),
        home_score: isNaN(homeScore as number) ? null : homeScore,
        away_score: isNaN(awayScore as number) ? null : awayScore,
        status: mapEventStatus(event),
        season: 2025,
      };

      const { error } = await supabaseAdmin
        .from('fixtures')
        .upsert(fixtureData, { onConflict: 'api_fixture_id' });

      if (error) {
        console.error(`Error syncing event ${event.idEvent}:`, error);
      } else {
        synced++;
      }
    }

    // Update last sync time
    await supabaseAdmin
      .from('settings')
      .upsert({ key: 'last_sync_time', value: new Date().toISOString() }, { onConflict: 'key' });

    return NextResponse.json({ message: 'Sync complete', synced, total: events.length });
  } catch (error) {
    console.error('Fixture sync error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
