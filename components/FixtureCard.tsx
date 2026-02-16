'use client';

import { useState } from 'react';

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

interface FixtureCardProps {
  fixture: Fixture;
  prediction?: Prediction;
  onPredictionChange: (fixtureId: string, home: number | null, away: number | null) => void;
  isLocked: boolean;
}

function TeamLogo({ src, alt }: { src: string | null; alt: string }) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-lg">
        ⚽
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className="w-12 h-12 object-contain"
      onError={() => setError(true)}
    />
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ro-RO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'Europe/Bucharest',
  });
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('ro-RO', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Bucharest',
  });
}

function getPointsBadge(points: number) {
  if (points === 3) {
    return (
      <span className="inline-block px-2 py-0.5 text-xs font-bold rounded bg-green-500 text-white">
        +3 Exact
      </span>
    );
  }
  if (points === 1) {
    return (
      <span className="inline-block px-2 py-0.5 text-xs font-bold rounded bg-yellow-500 text-white">
        +1 Semn
      </span>
    );
  }
  return (
    <span className="inline-block px-2 py-0.5 text-xs font-bold rounded bg-gray-400 text-white">
      0
    </span>
  );
}

export default function FixtureCard({
  fixture,
  prediction,
  onPredictionChange,
  isLocked,
}: FixtureCardProps) {
  const isFinished = fixture.status === 'finished';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-3">
      {/* Date and time */}
      <div className="text-center text-xs text-gray-500 mb-3">
        {formatDate(fixture.kick_off)} &middot; {formatTime(fixture.kick_off)}
        {isLocked && !isFinished && (
          <span className="ml-2 text-amber-600">🔒 Blocat</span>
        )}
        {isFinished && (
          <span className="ml-2 text-green-700">✓ Terminat</span>
        )}
      </div>

      {/* Teams row */}
      <div className="flex items-center justify-between gap-2">
        {/* Home team */}
        <div className="flex-1 flex flex-col items-center text-center min-w-0">
          <TeamLogo src={fixture.home_logo} alt={fixture.home_team} />
          <span className="text-xs font-medium mt-1 leading-tight truncate w-full">
            {fixture.home_team}
          </span>
        </div>

        {/* Center score area */}
        <div className="flex flex-col items-center gap-1.5 px-2">
          {isFinished ? (
            <>
              <div className="text-2xl font-bold text-[#1B5E20]">
                {fixture.home_score} - {fixture.away_score}
              </div>
              {prediction && (
                <div className="text-xs text-gray-500">
                  Pronostic: {prediction.predicted_home} - {prediction.predicted_away}
                </div>
              )}
              {prediction && getPointsBadge(prediction.points_earned)}
            </>
          ) : (
            <>
              <span className="text-sm font-bold text-[#1B5E20]">VS</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={0}
                  max={99}
                  value={prediction?.predicted_home ?? ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? null : parseInt(e.target.value);
                    onPredictionChange(fixture.id, val, prediction?.predicted_away ?? null);
                  }}
                  disabled={isLocked}
                  placeholder="-"
                  className={`w-11 h-10 text-center text-lg font-bold border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B5E20] ${
                    isLocked
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'bg-white border-gray-300'
                  }`}
                />
                <span className="text-gray-400 font-bold">-</span>
                <input
                  type="number"
                  min={0}
                  max={99}
                  value={prediction?.predicted_away ?? ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? null : parseInt(e.target.value);
                    onPredictionChange(fixture.id, prediction?.predicted_home ?? null, val);
                  }}
                  disabled={isLocked}
                  placeholder="-"
                  className={`w-11 h-10 text-center text-lg font-bold border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B5E20] ${
                    isLocked
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'bg-white border-gray-300'
                  }`}
                />
              </div>
            </>
          )}
        </div>

        {/* Away team */}
        <div className="flex-1 flex flex-col items-center text-center min-w-0">
          <TeamLogo src={fixture.away_logo} alt={fixture.away_team} />
          <span className="text-xs font-medium mt-1 leading-tight truncate w-full">
            {fixture.away_team}
          </span>
        </div>
      </div>
    </div>
  );
}
