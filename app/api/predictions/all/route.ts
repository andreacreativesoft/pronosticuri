import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const matchweek = request.nextUrl.searchParams.get('matchweek');
    if (!matchweek) {
      return NextResponse.json(
        { error: 'Parametrul matchweek este obligatoriu' },
        { status: 400 }
      );
    }

    const { data: fixtures } = await supabaseAdmin
      .from('fixtures')
      .select('id, kick_off, status')
      .eq('matchweek', parseInt(matchweek));

    if (!fixtures || fixtures.length === 0) {
      return NextResponse.json({ predictions: [], players: [] });
    }

    // Only show predictions for locked fixtures (kick_off - 5min <= now)
    const now = new Date();
    const lockedFixtureIds = fixtures
      .filter((f) => {
        const lockTime = new Date(new Date(f.kick_off).getTime() - 5 * 60 * 1000);
        return now >= lockTime || f.status !== 'scheduled';
      })
      .map((f) => f.id);

    if (lockedFixtureIds.length === 0) {
      return NextResponse.json({ predictions: [], players: [] });
    }

    const { data: predictions } = await supabaseAdmin
      .from('predictions')
      .select('*, players(name)')
      .in('fixture_id', lockedFixtureIds);

    const { data: players } = await supabaseAdmin
      .from('players')
      .select('id, name, avatar_url')
      .order('name');

    return NextResponse.json({
      predictions: predictions || [],
      players: players || [],
    });
  } catch {
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 });
  }
}
