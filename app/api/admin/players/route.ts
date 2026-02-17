import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET: list all players
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('players')
    .select('id, name, avatar_url, created_at')
    .order('name');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ players: data });
}

// PATCH: update player (name and/or avatar)
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, name, avatar_url } = body;

  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  const updates: Record<string, string> = {};
  if (name !== undefined) updates.name = name.trim();
  if (avatar_url !== undefined) updates.avatar_url = avatar_url;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('players')
    .update(updates)
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
