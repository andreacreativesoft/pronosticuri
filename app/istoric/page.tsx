'use client';

import { useEffect, useState, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import MatchweekSelector from '@/components/MatchweekSelector';

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

interface PlayerInfo {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface PredictionRow {
  id: string;
  player_id: string;
  fixture_id: string;
  predicted_home: number;
  predicted_away: number;
  points_earned: number;
  players: { name: string };
}

function ImgWithFallback({ src, alt }: { src: string | null; alt: string }) {
  const [err, setErr] = useState(false);
  if (!src || err) return <span className="text-sm">⚽</span>;
  return <img src={src} alt={alt} className="w-6 h-6 object-contain" onError={() => setErr(true)} />;
}

function pointsBg(pts: number): string {
  if (pts === 3) return 'bg-green-100 text-green-800';
  if (pts === 1) return 'bg-yellow-100 text-yellow-800';
  return 'bg-gray-100 text-gray-500';
}

export default function HistoryPage() {
  const [matchweeks, setMatchweeks] = useState<number[]>([]);
  const [selectedMw, setSelectedMw] = useState<number>(0);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [predictions, setPredictions] = useState<PredictionRow[]>([]);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [playerName, setPlayerName] = useState<string | undefined>();
  const [playerAvatar, setPlayerAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const [meRes, mwRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/fixtures/matchweeks'),
        ]);

        if (meRes.ok) {
          const meData = await meRes.json();
          setPlayerName(meData.player.name);
          setPlayerAvatar(meData.player.avatar_url || null);
        }

        if (mwRes.ok) {
          const mwData = await mwRes.json();
          const mws = mwData.matchweeks || [];
          setMatchweeks(mws);
          if (mws.length > 0) {
            setSelectedMw(mws[mws.length - 1]);
          }
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }

    init();
  }, []);

  const fetchMatchweekData = useCallback(async (mw: number) => {
    if (!mw) return;
    try {
      const [fixRes, predRes] = await Promise.all([
        fetch(`/api/fixtures?matchweek=${mw}`),
        fetch(`/api/predictions/all?matchweek=${mw}`),
      ]);

      if (fixRes.ok) {
        const fixData = await fixRes.json();
        setFixtures(fixData.fixtures || []);
      }

      if (predRes.ok) {
        const predData = await predRes.json();
        setPredictions(predData.predictions || []);
        setPlayers(predData.players || []);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    if (selectedMw > 0) {
      fetchMatchweekData(selectedMw);
    }
  }, [selectedMw, fetchMatchweekData]);

  function getPlayerPrediction(playerId: string, fixtureId: string): PredictionRow | undefined {
    return predictions.find((p) => p.player_id === playerId && p.fixture_id === fixtureId);
  }

  function getPlayerTotal(playerId: string): number {
    return predictions
      .filter((p) => p.player_id === playerId)
      .reduce((sum, p) => sum + (p.points_earned || 0), 0);
  }

  return (
    <div className="min-h-screen pb-20 sm:pb-4">
      <Navbar playerName={playerName} avatarUrl={playerAvatar} />

      <main className="max-w-4xl mx-auto px-4 py-4">
        <h1 className="text-xl font-bold text-gray-800 mb-4">Istoric</h1>

        {loading ? (
          <div className="animate-pulse">
            <div className="h-10 bg-gray-200 rounded w-48 mb-4" />
            <div className="h-64 bg-gray-200 rounded" />
          </div>
        ) : matchweeks.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-4xl mb-3">📋</p>
            <p>Nu sunt etape disponibile.</p>
          </div>
        ) : (
          <>
            <MatchweekSelector
              matchweeks={matchweeks}
              selected={selectedMw}
              onChange={setSelectedMw}
            />

            {fixtures.length === 0 ? (
              <p className="text-gray-500 text-sm">Nu sunt meciuri pentru această etapă.</p>
            ) : (
              <div className="overflow-x-auto -mx-4 px-4">
                <table className="w-full text-sm bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-3 py-2.5 font-semibold text-gray-600 sticky left-0 bg-gray-50 z-10">
                        Meci
                      </th>
                      <th className="text-center px-3 py-2.5 font-semibold text-gray-600 w-[60px]">
                        Scor
                      </th>
                      {players.map((p) => (
                        <th
                          key={p.id}
                          className="text-center px-2 py-2.5 font-semibold text-gray-600 min-w-[70px]"
                        >
                          <div className="flex flex-col items-center gap-1">
                            {p.avatar_url ? (
                              <img src={p.avatar_url} alt={p.name} className="w-6 h-6 rounded-full object-cover" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-[#1B5E20]/10 flex items-center justify-center text-[#1B5E20] text-[10px] font-bold">
                                {p.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className="text-xs">{p.name}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {fixtures.map((fixture) => (
                      <tr key={fixture.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                        <td className="px-3 py-2 sticky left-0 bg-white z-10">
                          <div className="flex flex-col gap-0.5 min-w-[180px]">
                            <div className="flex items-center gap-2">
                              <ImgWithFallback src={fixture.home_logo} alt={fixture.home_team} />
                              <span className="font-medium whitespace-nowrap">{fixture.home_team}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <ImgWithFallback src={fixture.away_logo} alt={fixture.away_team} />
                              <span className="font-medium whitespace-nowrap">{fixture.away_team}</span>
                            </div>
                          </div>
                        </td>
                        <td className="text-center px-3 py-2 font-bold text-[#1B5E20]">
                          {fixture.status === 'finished' ? (
                            <div className="flex flex-col items-center">
                              <span>{fixture.home_score}</span>
                              <span>{fixture.away_score}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        {players.map((p) => {
                          const pred = getPlayerPrediction(p.id, fixture.id);
                          if (!pred) {
                            return (
                              <td key={p.id} className="text-center px-2 py-2 text-gray-300">
                                —
                              </td>
                            );
                          }
                          return (
                            <td key={p.id} className="text-center px-2 py-2">
                              <div
                                className={`inline-flex flex-col items-center px-2 py-0.5 rounded-md text-sm font-medium ${pointsBg(pred.points_earned)}`}
                              >
                                <span>{pred.predicted_home}</span>
                                <span>{pred.predicted_away}</span>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    <tr className="bg-gray-50 font-bold">
                      <td className="px-3 py-2.5 sticky left-0 bg-gray-50 z-10 text-gray-600">
                        Total etapă
                      </td>
                      <td />
                      {players.map((p) => (
                        <td key={p.id} className="text-center px-2 py-2.5 text-[#1B5E20] text-base">
                          {getPlayerTotal(p.id)}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
