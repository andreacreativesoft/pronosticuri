import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: players, error } = await supabaseAdmin
      .from('players')
      .select('id, name, avatar_url, total_points, exact_scores, correct_signs')
      .order('total_points', { ascending: false })
      .order('exact_scores', { ascending: false })
      .order('name', { ascending: true });

    if (error) {
      console.error('Leaderboard error:', error);
      return NextResponse.json({ error: 'Eroare server' }, { status: 500 });
    }

    return NextResponse.json({ players: players || [] });
  } catch {
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 });
  }
}
