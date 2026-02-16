import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getCurrentPlayer } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const player = await getCurrentPlayer();
    if (!player) {
      return NextResponse.json({ error: 'Neautentificat' }, { status: 401 });
    }

    const matchweek = request.nextUrl.searchParams.get('matchweek');
    if (!matchweek) {
      return NextResponse.json(
        { error: 'Parametrul matchweek este obligatoriu' },
        { status: 400 }
      );
    }

    const { data: fixtures } = await supabaseAdmin
      .from('fixtures')
      .select('id')
      .eq('matchweek', parseInt(matchweek));

    if (!fixtures || fixtures.length === 0) {
      return NextResponse.json({ predictions: [] });
    }

    const fixtureIds = fixtures.map((f) => f.id);

    const { data: predictions } = await supabaseAdmin
      .from('predictions')
      .select('*')
      .eq('player_id', player.playerId)
      .in('fixture_id', fixtureIds);

    return NextResponse.json({ predictions: predictions || [] });
  } catch {
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const player = await getCurrentPlayer();
    if (!player) {
      return NextResponse.json({ error: 'Neautentificat' }, { status: 401 });
    }

    const { fixtures: predictionData } = await request.json();

    if (!Array.isArray(predictionData) || predictionData.length === 0) {
      return NextResponse.json(
        { error: 'Datele pronosticurilor sunt invalide' },
        { status: 400 }
      );
    }

    const now = new Date();
    const lockBuffer = 5 * 60 * 1000; // 5 minutes

    const fixtureIds = predictionData.map((p: { fixture_id: string }) => p.fixture_id);
    const { data: fixturesData } = await supabaseAdmin
      .from('fixtures')
      .select('id, kick_off, status')
      .in('id', fixtureIds);

    if (!fixturesData) {
      return NextResponse.json({ error: 'Meciuri negăsite' }, { status: 404 });
    }

    const fixtureMap = new Map(fixturesData.map((f) => [f.id, f]));
    const validPredictions: Array<{
      player_id: string;
      fixture_id: string;
      predicted_home: number;
      predicted_away: number;
      updated_at: string;
    }> = [];
    const lockedFixtures: string[] = [];

    for (const pred of predictionData) {
      const fixture = fixtureMap.get(pred.fixture_id);
      if (!fixture) continue;

      const kickOff = new Date(fixture.kick_off);
      const lockTime = new Date(kickOff.getTime() - lockBuffer);

      if (now >= lockTime || fixture.status !== 'scheduled') {
        lockedFixtures.push(pred.fixture_id);
        continue;
      }

      if (
        pred.predicted_home == null ||
        pred.predicted_away == null ||
        pred.predicted_home < 0 ||
        pred.predicted_away < 0 ||
        pred.predicted_home > 99 ||
        pred.predicted_away > 99
      ) {
        continue;
      }

      validPredictions.push({
        player_id: player.playerId,
        fixture_id: pred.fixture_id,
        predicted_home: Math.floor(pred.predicted_home),
        predicted_away: Math.floor(pred.predicted_away),
        updated_at: new Date().toISOString(),
      });
    }

    if (validPredictions.length === 0) {
      return NextResponse.json(
        {
          error: 'Niciun pronostic valid. Toate meciurile selectate sunt blocate.',
          lockedFixtures,
        },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('predictions')
      .upsert(validPredictions, { onConflict: 'player_id,fixture_id' });

    if (error) {
      console.error('Error saving predictions:', error);
      return NextResponse.json(
        { error: 'Eroare la salvarea pronosticurilor' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      saved: validPredictions.length,
      locked: lockedFixtures.length,
    });
  } catch {
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 });
  }
}
