import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { hashPin, createToken, setAuthCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { name, phone, pin } = await request.json();

    if (!name || !phone || !pin) {
      return NextResponse.json(
        { error: 'Toate câmpurile sunt obligatorii' },
        { status: 400 }
      );
    }

    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { error: 'PIN-ul trebuie să aibă exact 4 cifre' },
        { status: 400 }
      );
    }

    // Check if name already exists
    const { data: existing } = await supabaseAdmin
      .from('players')
      .select('id')
      .eq('name', name)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Acest nume este deja folosit' },
        { status: 409 }
      );
    }

    const pinHash = await hashPin(pin);

    const { data: player, error } = await supabaseAdmin
      .from('players')
      .insert({ name, phone, pin_hash: pinHash })
      .select('id, name')
      .single();

    if (error) {
      console.error('Signup error:', error);
      return NextResponse.json(
        { error: 'Eroare la înregistrare' },
        { status: 500 }
      );
    }

    const token = createToken({ playerId: player.id, name: player.name });
    await setAuthCookie(token);

    return NextResponse.json({ player: { id: player.id, name: player.name } });
  } catch {
    return NextResponse.json(
      { error: 'Eroare la înregistrare' },
      { status: 500 }
    );
  }
}
