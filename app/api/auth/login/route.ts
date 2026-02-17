import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyPin, createToken, setAuthCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { pin } = await request.json();

    if (!pin) {
      return NextResponse.json(
        { error: 'PIN-ul este obligatoriu' },
        { status: 400 }
      );
    }

    // Get all players and check PIN against each
    const { data: players } = await supabaseAdmin
      .from('players')
      .select('id, name, pin_hash');

    if (!players || players.length === 0) {
      return NextResponse.json(
        { error: 'PIN incorect' },
        { status: 401 }
      );
    }

    for (const player of players) {
      const isValid = await verifyPin(pin, player.pin_hash);
      if (isValid) {
        const token = createToken({ playerId: player.id, name: player.name });
        await setAuthCookie(token);
        return NextResponse.json({ player: { id: player.id, name: player.name } });
      }
    }

    return NextResponse.json(
      { error: 'PIN incorect' },
      { status: 401 }
    );
  } catch {
    return NextResponse.json(
      { error: 'Eroare la autentificare' },
      { status: 500 }
    );
  }
}
