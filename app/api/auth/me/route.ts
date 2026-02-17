import { NextResponse } from 'next/server';
import { getCurrentPlayer } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const payload = await getCurrentPlayer();
    if (!payload) {
      return NextResponse.json({ error: 'Neautentificat' }, { status: 401 });
    }

    const { data: player } = await supabaseAdmin
      .from('players')
      .select('id, name, phone, avatar_url, total_points, exact_scores, correct_signs')
      .eq('id', payload.playerId)
      .single();

    if (!player) {
      return NextResponse.json({ error: 'Jucător negăsit' }, { status: 404 });
    }

    return NextResponse.json({ player });
  } catch {
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 });
  }
}
