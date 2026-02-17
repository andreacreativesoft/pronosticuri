import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { calculatePoints } from '@/lib/points';

// POST: set results for fixtures and recalculate points
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { results } = body as {
      results: {
        fixture_id: string;
        home_score: number;
        away_score: number;
      }[];
    };

    if (!results || results.length === 0) {
      return NextResponse.json({ error: 'No results provided' }, { status: 400 });
    }

    let updated = 0;

    for (const result of results) {
      // Update fixture score and status
      const { error: updateError } = await supabaseAdmin
        .from('fixtures')
        .update({
          home_score: result.home_score,
          away_score: result.away_score,
          status: 'finished',
        })
        .eq('id', result.fixture_id);

      if (updateError) {
        console.error('Error updating fixture:', updateError);
        continue;
      }

      // Recalculate points for all predictions on this fixture
      const { data: predictions } = await supabaseAdmin
        .from('predictions')
        .select('id, predicted_home, predicted_away')
        .eq('fixture_id', result.fixture_id);

      if (predictions) {
        for (const pred of predictions) {
          const { points } = calculatePoints(
            pred.predicted_home,
            pred.predicted_away,
            result.home_score,
            result.away_score
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

    return NextResponse.json({ updated });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
