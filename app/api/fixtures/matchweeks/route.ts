import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('fixtures')
      .select('matchweek')
      .order('matchweek', { ascending: true });

    if (error) {
      console.error('Matchweeks error:', error);
      return NextResponse.json({ error: 'Eroare server' }, { status: 500 });
    }

    const matchweeks = [...new Set((data || []).map((f) => f.matchweek))];

    return NextResponse.json({ matchweeks });
  } catch {
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 });
  }
}
