import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

export async function GET() {
  try {
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    const ninetyMinFromNow = new Date(now.getTime() + 90 * 60 * 1000);

    // Find matchweeks where the first game starts within 60-90 minutes
    const { data: upcomingFixtures } = await supabaseAdmin
      .from('fixtures')
      .select('matchweek, kick_off')
      .eq('status', 'scheduled')
      .gte('kick_off', oneHourFromNow.toISOString())
      .lte('kick_off', ninetyMinFromNow.toISOString())
      .order('kick_off', { ascending: true });

    if (!upcomingFixtures || upcomingFixtures.length === 0) {
      return NextResponse.json({ message: 'No reminders needed', sent: 0 });
    }

    // Get unique matchweeks
    const matchweeks = [...new Set(upcomingFixtures.map((f) => f.matchweek))];

    let totalSent = 0;

    for (const matchweek of matchweeks) {
      // Check if reminder already sent for this matchweek
      const reminderKey = `reminder_sent_${matchweek}`;
      const { data: setting } = await supabaseAdmin
        .from('settings')
        .select('value')
        .eq('key', reminderKey)
        .single();

      if (setting) continue; // Already sent

      // Get all fixture IDs for this matchweek
      const { data: mwFixtures } = await supabaseAdmin
        .from('fixtures')
        .select('id')
        .eq('matchweek', matchweek);

      if (!mwFixtures) continue;

      const fixtureIds = mwFixtures.map((f) => f.id);

      // Find players who have NOT submitted any predictions
      const { data: playersWithPredictions } = await supabaseAdmin
        .from('predictions')
        .select('player_id')
        .in('fixture_id', fixtureIds);

      const playerIdsWithPredictions = new Set(
        (playersWithPredictions || []).map((p) => p.player_id)
      );

      const { data: allPlayers } = await supabaseAdmin
        .from('players')
        .select('id, name, phone');

      if (!allPlayers) continue;

      const playersToRemind = allPlayers.filter(
        (p) => !playerIdsWithPredictions.has(p.id)
      );

      for (const player of playersToRemind) {
        const message = `⚽ Etapa ${matchweek} începe în curând! Nu uita să îți setezi pronosticurile pe PronoLiga.`;
        const sent = await sendWhatsAppMessage(player.phone, message);
        if (sent) totalSent++;
      }

      // Mark reminder as sent
      await supabaseAdmin
        .from('settings')
        .upsert({ key: reminderKey, value: new Date().toISOString() }, { onConflict: 'key' });
    }

    return NextResponse.json({ message: 'Reminders processed', sent: totalSent });
  } catch (error) {
    console.error('Send reminders error:', error);
    return NextResponse.json({ error: 'Reminder sending failed' }, { status: 500 });
  }
}
