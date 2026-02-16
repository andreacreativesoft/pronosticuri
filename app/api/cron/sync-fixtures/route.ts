import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  getSeasonId,
  getAllSeasonFixtures,
  getTeamLogo,
  mapEventStatus,
  buildKickOff,
} from '@/lib/api-football';

export async function GET() {
  try {
    const seasonId = await getSeasonId();
    if (!seasonId) {
      return NextResponse.json({ error: 'Could not find current season' }, { status: 500 });
    }

    const events = await getAllSeasonFixtures(seasonId);

    if (!events || events.length === 0) {
      return NextResponse.json({ message: 'No fixtures found', synced: 0 });
    }

    let synced = 0;

    for (const event of events) {
      const matchweek = event.roundInfo?.round || 0;
      if (matchweek === 0) continue;

      const fixtureData = {
        api_fixture_id: event.id,
        matchweek,
        home_team: event.homeTeam.name,
        away_team: event.awayTeam.name,
        home_logo: getTeamLogo(event.homeTeam.id),
        away_logo: getTeamLogo(event.awayTeam.id),
        kick_off: buildKickOff(event),
        home_score: event.homeScore?.current ?? null,
        away_score: event.awayScore?.current ?? null,
        status: mapEventStatus(event),
        season: 2025,
      };

      const { error } = await supabaseAdmin
        .from('fixtures')
        .upsert(fixtureData, { onConflict: 'api_fixture_id' });

      if (error) {
        console.error(`Error syncing event ${event.id}:`, error);
      } else {
        synced++;
      }
    }

    await supabaseAdmin
      .from('settings')
      .upsert({ key: 'last_sync_time', value: new Date().toISOString() }, { onConflict: 'key' });

    return NextResponse.json({ message: 'Sync complete', synced, total: events.length });
  } catch (error) {
    console.error('Fixture sync error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
