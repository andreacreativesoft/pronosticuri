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

    const { data: fixtures, error } = await supabaseAdmin
      .from('fixtures')
      .select('*')
      .eq('matchweek', parseInt(matchweek))
      .order('kick_off', { ascending: true });

    if (error) {
      console.error('Error fetching fixtures:', error);
      return NextResponse.json({ error: 'Eroare la încărcare' }, { status: 500 });
    }

    return NextResponse.json({ fixtures: fixtures || [] });
  } catch {
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 });
  }
}
