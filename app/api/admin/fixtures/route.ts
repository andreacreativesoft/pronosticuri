import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET: list fixtures for a matchweek
export async function GET(request: NextRequest) {
  const matchweek = request.nextUrl.searchParams.get('matchweek');

  const query = supabaseAdmin
    .from('fixtures')
    .select('*')
    .order('kick_off', { ascending: true });

  if (matchweek) {
    query.eq('matchweek', parseInt(matchweek));
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ fixtures: data || [] });
}

// POST: create fixtures
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fixtures } = body as {
      fixtures: {
        matchweek: number;
        home_team: string;
        away_team: string;
        kick_off: string;
        home_logo?: string;
        away_logo?: string;
      }[];
    };

    if (!fixtures || fixtures.length === 0) {
      return NextResponse.json({ error: 'No fixtures provided' }, { status: 400 });
    }

    let created = 0;
    const baseId = Math.floor(Date.now() / 1000);

    for (let i = 0; i < fixtures.length; i++) {
      const f = fixtures[i];
      const { error } = await supabaseAdmin.from('fixtures').insert({
        api_fixture_id: baseId + i,
        matchweek: f.matchweek,
        home_team: f.home_team,
        away_team: f.away_team,
        home_logo: f.home_logo || null,
        away_logo: f.away_logo || null,
        kick_off: f.kick_off,
        status: 'scheduled',
        season: 2025,
      });

      if (error) {
        console.error('Error creating fixture:', error);
      } else {
        created++;
      }
    }

    return NextResponse.json({ created });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

// PUT: update a fixture
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Fixture ID required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('fixtures')
      .update(updates)
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

// DELETE: delete a fixture
export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Fixture ID required' }, { status: 400 });
  }

  // Delete associated predictions first
  await supabaseAdmin.from('predictions').delete().eq('fixture_id', id);

  const { error } = await supabaseAdmin.from('fixtures').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
