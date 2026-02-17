import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET: list all players
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('players')
    .select('id, name, created_at')
    .order('name');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ players: data });
}

// PATCH: rename a player
export async function PATCH(req: NextRequest) {
  const { id, name } = await req.json();

  if (!id || !name) {
    return NextResponse.json({ error: 'id and name required' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('players')
    .update({ name: name.trim() })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
