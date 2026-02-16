import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getFixturesByIds, mapApiStatus } from '@/lib/api-football';
import { calculatePoints } from '@/lib/points';

export async function GET() {
  try {
    // Find fixtures that are not finished but should be (kick_off + 3 hours ago)
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
    const apiFixtures = await getFixturesByIds(apiIds);

    let updated = 0;

    for (const apiFixture of apiFixtures) {
      const status = mapApiStatus(apiFixture.fixture.status.short);

      if (status !== 'finished') continue;
      if (apiFixture.goals.home == null || apiFixture.goals.away == null) continue;

      // Update fixture score and status
      const { error: updateError } = await supabaseAdmin
        .from('fixtures')
        .update({
          home_score: apiFixture.goals.home,
          away_score: apiFixture.goals.away,
          status: 'finished',
        })
        .eq('api_fixture_id', apiFixture.fixture.id);

      if (updateError) {
        console.error(`Error updating fixture ${apiFixture.fixture.id}:`, updateError);
        continue;
      }

      // Get the internal fixture ID
      const dbFixture = pendingFixtures.find(
        (f) => f.api_fixture_id === apiFixture.fixture.id
      );
      if (!dbFixture) continue;

      // Calculate points for all predictions on this fixture
      const { data: predictions } = await supabaseAdmin
        .from('predictions')
        .select('id, player_id, predicted_home, predicted_away')
        .eq('fixture_id', dbFixture.id);

      if (predictions && predictions.length > 0) {
        for (const pred of predictions) {
          const { points } = calculatePoints(
            pred.predicted_home,
            pred.predicted_away,
            apiFixture.goals.home!,
            apiFixture.goals.away!
          );

          await supabaseAdmin
            .from('predictions')
            .update({ points_earned: points })
            .eq('id', pred.id);
        }
      }

      updated++;
    }

    // Recalculate all player totals
    const { data: allPlayers } = await supabaseAdmin
      .from('players')
      .select('id');

    if (allPlayers) {
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

    return NextResponse.json({ message: 'Results updated', updated });
  } catch (error) {
    console.error('Update results error:', error);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}
