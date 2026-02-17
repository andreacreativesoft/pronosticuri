'use client';

import { useEffect, useState, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import FixtureCard from '@/components/FixtureCard';
import SkeletonCard from '@/components/SkeletonCard';
import Toast from '@/components/Toast';

interface Fixture {
  id: string;
  home_team: string;
  away_team: string;
  home_logo: string | null;
  away_logo: string | null;
  kick_off: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
}

interface Prediction {
  fixture_id: string;
  predicted_home: number;
  predicted_away: number;
  points_earned: number;
}

interface Player {
  id: string;
  name: string;
  avatar_url: string | null;
}

export default function DashboardPage() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [predictions, setPredictions] = useState<Map<string, Prediction>>(new Map());
  const [matchweek, setMatchweek] = useState<number | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [localPredictions, setLocalPredictions] = useState<
    Map<string, { home: number | null; away: number | null }>
  >(new Map());

  const fetchData = useCallback(async () => {
    try {
      const [meRes, currentRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/fixtures/current'),
      ]);

      if (meRes.ok) {
        const meData = await meRes.json();
        setPlayer(meData.player);
      }

      if (currentRes.ok) {
        const currentData = await currentRes.json();
        setMatchweek(currentData.matchweek);
        setFixtures(currentData.fixtures || []);

        if (currentData.matchweek) {
          const predRes = await fetch(
            `/api/predictions?matchweek=${currentData.matchweek}`
          );
          if (predRes.ok) {
            const predData = await predRes.json();
            const predMap = new Map<string, Prediction>();
            const localMap = new Map<string, { home: number | null; away: number | null }>();

            for (const p of predData.predictions || []) {
              predMap.set(p.fixture_id, p);
              localMap.set(p.fixture_id, {
                home: p.predicted_home,
                away: p.predicted_away,
              });
            }
            setPredictions(predMap);
            setLocalPredictions(localMap);
          }
        }
      }
    } catch {
      setToast({ message: 'Eroare la încărcarea datelor', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function isFixtureLocked(fixture: Fixture): boolean {
    if (fixture.status !== 'scheduled') return true;
    const kickOff = new Date(fixture.kick_off);
    const lockTime = new Date(kickOff.getTime() - 5 * 60 * 1000);
    return new Date() >= lockTime;
  }

  function allLocked(): boolean {
    return fixtures.length > 0 && fixtures.every(isFixtureLocked);
  }

  function handlePredictionChange(
    fixtureId: string,
    home: number | null,
    away: number | null
  ) {
    setLocalPredictions((prev) => {
      const next = new Map(prev);
      next.set(fixtureId, { home, away });
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const fixturesPayload = Array.from(localPredictions.entries())
        .filter(([fixtureId, pred]) => {
          const fixture = fixtures.find((f) => f.id === fixtureId);
          if (!fixture || isFixtureLocked(fixture)) return false;
          return pred.home != null && pred.away != null;
        })
        .map(([fixtureId, pred]) => ({
          fixture_id: fixtureId,
          predicted_home: pred.home,
          predicted_away: pred.away,
        }));

      if (fixturesPayload.length === 0) {
        setToast({ message: 'Nu sunt pronosticuri de salvat', type: 'error' });
        return;
      }

      const res = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fixtures: fixturesPayload }),
      });

      const data = await res.json();

      if (!res.ok) {
        setToast({ message: data.error || 'Eroare la salvare', type: 'error' });
        return;
      }

      setToast({
        message: `Pronosticuri salvate (${data.saved})${data.locked > 0 ? ` · ${data.locked} blocate` : ''}`,
        type: 'success',
      });

      await fetchData();
    } catch {
      setToast({ message: 'Eroare la salvare', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  function getPredictionForCard(fixtureId: string): Prediction | undefined {
    const local = localPredictions.get(fixtureId);
    const saved = predictions.get(fixtureId);

    if (local) {
      return {
        fixture_id: fixtureId,
        predicted_home: local.home ?? 0,
        predicted_away: local.away ?? 0,
        points_earned: saved?.points_earned ?? 0,
      };
    }

    return saved;
  }

  const hasOpenGames = fixtures.some((f) => !isFixtureLocked(f));

  return (
    <div className="min-h-screen pb-20 sm:pb-4">
      <Navbar playerName={player?.name} avatarUrl={player?.avatar_url} />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <main className="max-w-xl mx-auto px-4 py-4">
        {loading ? (
          <>
            <div className="h-7 bg-gray-200 rounded w-40 mb-4 animate-pulse" />
            {[1, 2, 3, 4].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </>
        ) : matchweek === null ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-4xl mb-3">⚽</p>
            <p>Nu sunt meciuri programate momentan.</p>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-bold text-gray-800 mb-4">
              Etapa {matchweek}
            </h1>

            {fixtures.map((fixture) => (
              <FixtureCard
                key={fixture.id}
                fixture={fixture}
                prediction={getPredictionForCard(fixture.id)}
                onPredictionChange={handlePredictionChange}
                isLocked={isFixtureLocked(fixture)}
              />
            ))}

            {allLocked() && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-center text-sm text-amber-800">
                🔒 Pronosticurile sunt închise pentru această etapă
              </div>
            )}

            {hasOpenGames && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="mt-4 w-full bg-[#1B5E20] text-white py-3 rounded-xl font-medium text-sm hover:bg-[#145218] transition disabled:opacity-50 shadow-sm"
              >
                {saving ? 'Se salvează...' : 'Salvează pronosticurile'}
              </button>
            )}
          </>
        )}
      </main>
    </div>
  );
}
