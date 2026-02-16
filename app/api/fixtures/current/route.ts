import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    // Find the current matchweek: earliest matchweek that has fixtures not all finished
    const { data: matchweeks, error } = await supabaseAdmin
      .from('fixtures')
      .select('matchweek')
      .neq('status', 'finished')
      .order('matchweek', { ascending: true })
      .limit(1);

    if (error) {
      console.error('Error finding current matchweek:', error);
      return NextResponse.json({ error: 'Eroare server' }, { status: 500 });
    }

    let currentMatchweek: number;

    if (matchweeks && matchweeks.length > 0) {
      currentMatchweek = matchweeks[0].matchweek;
    } else {
      // All fixtures finished — show the last matchweek
      const { data: lastWeek } = await supabaseAdmin
        .from('fixtures')
        .select('matchweek')
        .order('matchweek', { ascending: false })
        .limit(1);

      if (!lastWeek || lastWeek.length === 0) {
        return NextResponse.json({ matchweek: null, fixtures: [] });
      }
      currentMatchweek = lastWeek[0].matchweek;
    }

    const { data: fixtures } = await supabaseAdmin
      .from('fixtures')
      .select('*')
      .eq('matchweek', currentMatchweek)
      .order('kick_off', { ascending: true });

    return NextResponse.json({
      matchweek: currentMatchweek,
      fixtures: fixtures || [],
    });
  } catch {
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 });
  }
}
