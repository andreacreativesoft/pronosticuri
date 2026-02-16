import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyPin, createToken, setAuthCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { name, pin } = await request.json();

    if (!name || !pin) {
      return NextResponse.json(
        { error: 'Numele și PIN-ul sunt obligatorii' },
        { status: 400 }
      );
    }

    const { data: player } = await supabaseAdmin
      .from('players')
      .select('id, name, pin_hash')
      .eq('name', name)
      .single();

    if (!player) {
      return NextResponse.json(
        { error: 'Nume sau PIN incorect' },
        { status: 401 }
      );
    }

    const isValid = await verifyPin(pin, player.pin_hash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Nume sau PIN incorect' },
        { status: 401 }
      );
    }

    const token = createToken({ playerId: player.id, name: player.name });
    await setAuthCookie(token);

    return NextResponse.json({ player: { id: player.id, name: player.name } });
  } catch {
    return NextResponse.json(
      { error: 'Eroare la autentificare' },
      { status: 500 }
    );
  }
}
