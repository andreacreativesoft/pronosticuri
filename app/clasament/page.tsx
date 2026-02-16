'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';

interface LeaderboardPlayer {
  id: string;
  name: string;
  total_points: number;
  exact_scores: number;
  correct_signs: number;
}

export default function LeaderboardPage() {
  const [players, setPlayers] = useState<LeaderboardPlayer[]>([]);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [lbRes, meRes] = await Promise.all([
          fetch('/api/leaderboard'),
          fetch('/api/auth/me'),
        ]);

        if (lbRes.ok) {
          const lbData = await lbRes.json();
          setPlayers(lbData.players || []);
        }

        if (meRes.ok) {
          const meData = await meRes.json();
          setCurrentPlayerId(meData.player.id);
          setPlayerName(meData.player.name);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <div className="min-h-screen pb-20 sm:pb-4">
      <Navbar playerName={playerName} />

      <main className="max-w-xl mx-auto px-4 py-4">
        <h1 className="text-xl font-bold text-gray-800 mb-4">Clasament</h1>

        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 py-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full" />
                <div className="flex-1 h-4 bg-gray-200 rounded" />
                <div className="w-12 h-4 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ) : players.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-4xl mb-3">🏆</p>
            <p>Nu sunt jucători înregistrați încă.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="grid grid-cols-[3rem_1fr_4rem_3.5rem_3.5rem] gap-1 px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <span>#</span>
              <span>Jucător</span>
              <span className="text-center">Puncte</span>
              <span className="text-center" title="Scor exact (3 puncte)">3p</span>
              <span className="text-center" title="Semn corect (1 punct)">1p</span>
            </div>

            {players.map((p, index) => {
              const isMe = p.id === currentPlayerId;
              const rank = index + 1;

              return (
                <div
                  key={p.id}
                  className={`grid grid-cols-[3rem_1fr_4rem_3.5rem_3.5rem] gap-1 px-4 py-3 border-b border-gray-50 items-center ${
                    isMe ? 'bg-green-50' : ''
                  }`}
                >
                  <span className={`text-sm font-bold ${rank <= 3 ? 'text-[#1B5E20]' : 'text-gray-400'}`}>
                    {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                  </span>
                  <span className={`text-sm truncate ${isMe ? 'font-bold text-[#1B5E20]' : 'text-gray-800'}`}>
                    {p.name}
                  </span>
                  <span className="text-sm font-bold text-center text-gray-800">
                    {p.total_points}
                  </span>
                  <span className="text-xs text-center text-green-700 font-medium">
                    {p.exact_scores}
                  </span>
                  <span className="text-xs text-center text-amber-600 font-medium">
                    {p.correct_signs}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
