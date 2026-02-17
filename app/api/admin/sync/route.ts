import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  getAllSeasonFixtures,
  mapEventStatus,
  buildKickOff,
} from '@/lib/api-football';

// POST: trigger manual sync from TheSportsDB
export async function POST() {
  try {
    const events = await getAllSeasonFixtures();

    if (!events || events.length === 0) {
      return NextResponse.json({ message: 'No fixtures found', synced: 0 });
    }

    let synced = 0;

    for (const event of events) {
      const matchweek = parseInt(event.intRound) || 0;
      if (matchweek === 0) continue;

      const fixtureData = {
        api_fixture_id: parseInt(event.idEvent),
        matchweek,
        home_team: event.strHomeTeam,
        away_team: event.strAwayTeam,
        home_logo: event.strHomeTeamBadge || null,
        away_logo: event.strAwayTeamBadge || null,
        kick_off: buildKickOff(event),
        home_score: event.intHomeScore != null ? parseInt(event.intHomeScore) : null,
        away_score: event.intAwayScore != null ? parseInt(event.intAwayScore) : null,
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

    await supabaseAdmin
      .from('settings')
      .upsert({ key: 'last_sync_time', value: new Date().toISOString() }, { onConflict: 'key' });

    return NextResponse.json({ message: 'Sync complete', synced, total: events.length });
  } catch (error) {
    console.error('Manual sync error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
