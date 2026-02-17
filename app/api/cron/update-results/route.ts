import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getEventsByIds, mapEventStatus } from '@/lib/api-football';
import { calculatePoints } from '@/lib/points';

async function recalculatePlayerTotals() {
  const { data: allPlayers } = await supabaseAdmin
    .from('players')
    .select('id');

  if (!allPlayers) return;

  for (const player of allPlayers) {
    const { data: playerPredictions } = await supabaseAdmin
      .from('predictions')
      .select('points_earned')
      .eq('player_id', player.id);

    if (playerPredictions) {
      const totalPoints = playerPredictions.reduce((sum, p) => sum + (p.points_earned || 0), 0);
      const exactScores = playerPredictions.filter((p) => p.points_earned === 3).length;
      const correctSigns = playerPredictions.filter((p) => p.points_earned === 1).length;

      await supabaseAdmin
        .from('players')
        .update({ total_points: totalPoints, exact_scores: exactScores, correct_signs: correctSigns })
        .eq('id', player.id);
    }
  }
}

export async function GET() {
  try {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();

    const { data: pendingFixtures } = await supabaseAdmin
      .from('fixtures')
      .select('id, api_fixture_id')
      .neq('status', 'finished')
      .lt('kick_off', threeHoursAgo);

    if (!pendingFixtures || pendingFixtures.length === 0) {
      return NextResponse.json({ message: 'No fixtures to update', updated: 0 });
    }

    const apiIds = pendingFixtures.map((f) => f.api_fixture_id);
    const apiEvents = await getEventsByIds(apiIds);

    let updated = 0;

    for (const event of apiEvents) {
      const status = mapEventStatus(event);
      if (status !== 'finished') continue;

      const homeScore = event.intHomeScore != null ? parseInt(event.intHomeScore) : null;
      const awayScore = event.intAwayScore != null ? parseInt(event.intAwayScore) : null;
      if (homeScore == null || awayScore == null) continue;

      const apiId = parseInt(event.idEvent);
      const { error: updateError } = await supabaseAdmin
        .from('fixtures')
        .update({
          home_score: homeScore,
          away_score: awayScore,
          status: 'finished',
        })
        .eq('api_fixture_id', apiId);

      if (updateError) {
        console.error(`Error updating fixture ${event.idEvent}:`, updateError);
        continue;
      }

      const dbFixture = pendingFixtures.find((f) => f.api_fixture_id === apiId);
      if (!dbFixture) continue;

      const { data: predictions } = await supabaseAdmin
        .from('predictions')
        .select('id, player_id, predicted_home, predicted_away')
        .eq('fixture_id', dbFixture.id);

      if (predictions && predictions.length > 0) {
        for (const pred of predictions) {
          const { points } = calculatePoints(
            pred.predicted_home,
            pred.predicted_away,
            homeScore,
            awayScore
          );

          await supabaseAdmin
            .from('predictions')
            .update({ points_earned: points })
            .eq('id', pred.id);
        }
      }

      updated++;
    }

    await recalculatePlayerTotals();

    return NextResponse.json({ message: 'Results updated', updated });
  } catch (error) {
    console.error('Update results error:', error);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}
