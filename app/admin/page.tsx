'use client';

import { useState, useEffect, useCallback } from 'react';

interface Fixture {
  id: string;
  matchweek: number;
  home_team: string;
  away_team: string;
  home_logo: string | null;
  away_logo: string | null;
  kick_off: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
}

const TEAMS = [
  'FCSB',
  'CFR Cluj',
  'Universitatea Craiova',
  'Rapid Bucuresti',
  'Dinamo Bucuresti',
  'Universitatea Cluj',
  'FC Botosani',
  'Farul Constanta',
  'Petrolul Ploiesti',
  'FC Hermannstadt',
  'Otelul Galati',
  'UTA Arad',
  'Unirea Slobozia',
  'Sepsi OSK',
  'FC Arges',
  'Gloria Buzau',
  'Csikszereda M. Ciuc',
  'Metaloglobus Bucuresti',
];

export default function AdminPage() {
  const [pin, setPin] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [tab, setTab] = useState<'sync' | 'add' | 'results' | 'players'>('sync');

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState('');
  const [syncElapsed, setSyncElapsed] = useState(0);
  const [syncStatus, setSyncStatus] = useState('');

  // Add fixtures state
  const [matchweek, setMatchweek] = useState(1);
  const [newFixtures, setNewFixtures] = useState<
    { home_team: string; away_team: string; date: string; time: string }[]
  >([{ home_team: '', away_team: '', date: '', time: '20:00' }]);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState('');

  // Results state
  const [resultsMatchweek, setResultsMatchweek] = useState(1);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [scores, setScores] = useState<Map<string, { home: string; away: string }>>(new Map());
  const [loadingFixtures, setLoadingFixtures] = useState(false);
  const [savingResults, setSavingResults] = useState(false);
  const [resultsMessage, setResultsMessage] = useState('');

  // Players state
  const [playersList, setPlayersList] = useState<{ id: string; name: string; avatar_url: string | null }[]>([]);
  const [editingPlayer, setEditingPlayer] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [playersLoading, setPlayersLoading] = useState(false);
  const [playersMessage, setPlayersMessage] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState<string | null>(null);

  const adminHeaders = useCallback(
    () => ({
      'Content-Type': 'application/json',
      'x-admin-pin': pin,
    }),
    [pin]
  );

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    if (pin.length < 4) {
      setAuthError('PIN-ul trebuie sa aiba minim 4 cifre');
      return;
    }

    // Verify PIN against server
    try {
      const res = await fetch('/api/admin/verify', {
        headers: { 'x-admin-pin': pin },
      });
      if (!res.ok) {
        setAuthError('PIN incorect');
        return;
      }
      setAuthenticated(true);
      setAuthError('');
    } catch {
      setAuthError('Eroare de conexiune');
    }
  }

  // Sync from TheSportsDB
  async function handleSync() {
    setSyncing(true);
    setSyncResult('');
    setSyncElapsed(0);
    setSyncStatus('Se conecteaza la TheSportsDB...');

    const startTime = Date.now();
    const timer = setInterval(() => {
      setSyncElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    try {
      setSyncStatus('Se descarca meciurile...');
      const res = await fetch('/api/admin/sync', {
        method: 'POST',
        headers: adminHeaders(),
      });
      setSyncStatus('Se proceseaza raspunsul...');
      const data = await res.json();
      if (!res.ok) {
        setSyncResult(`Eroare: ${data.error}`);
      } else {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        setSyncResult(`Sincronizare completa: ${data.synced} meciuri din ${data.total} (${elapsed}s)`);
      }
    } catch {
      setSyncResult('Eroare de conexiune');
    } finally {
      clearInterval(timer);
      setSyncing(false);
      setSyncStatus('');
    }
  }

  // Add fixture row
  function addFixtureRow() {
    setNewFixtures((prev) => [...prev, { home_team: '', away_team: '', date: '', time: '20:00' }]);
  }

  function removeFixtureRow(index: number) {
    setNewFixtures((prev) => prev.filter((_, i) => i !== index));
  }

  function updateFixtureRow(index: number, field: string, value: string) {
    setNewFixtures((prev) => prev.map((f, i) => (i === index ? { ...f, [field]: value } : f)));
  }

  // Save new fixtures
  async function handleSaveFixtures(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveResult('');

    const payload = newFixtures
      .filter((f) => f.home_team && f.away_team && f.date)
      .map((f) => ({
        matchweek,
        home_team: f.home_team,
        away_team: f.away_team,
        kick_off: new Date(`${f.date}T${f.time}:00+02:00`).toISOString(),
      }));

    if (payload.length === 0) {
      setSaveResult('Completati cel putin un meci');
      setSaving(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/fixtures', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({ fixtures: payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveResult(`Eroare: ${data.error}`);
      } else {
        setSaveResult(`${data.created} meciuri create`);
        setNewFixtures([{ home_team: '', away_team: '', date: '', time: '20:00' }]);
      }
    } catch {
      setSaveResult('Eroare de conexiune');
    } finally {
      setSaving(false);
    }
  }

  // Load fixtures for results tab
  const loadFixtures = useCallback(async () => {
    setLoadingFixtures(true);
    try {
      const res = await fetch(`/api/admin/fixtures?matchweek=${resultsMatchweek}`, {
        headers: adminHeaders(),
      });
      const data = await res.json();
      if (res.ok) {
        setFixtures(data.fixtures || []);
        const scoreMap = new Map<string, { home: string; away: string }>();
        for (const f of data.fixtures || []) {
          scoreMap.set(f.id, {
            home: f.home_score != null ? String(f.home_score) : '',
            away: f.away_score != null ? String(f.away_score) : '',
          });
        }
        setScores(scoreMap);
      }
    } catch {
      // ignore
    } finally {
      setLoadingFixtures(false);
    }
  }, [resultsMatchweek, adminHeaders]);

  useEffect(() => {
    if (authenticated && tab === 'results') {
      loadFixtures();
    }
  }, [authenticated, tab, resultsMatchweek, loadFixtures]);

  // Load players when players tab is active
  useEffect(() => {
    if (authenticated && tab === 'players') {
      setPlayersLoading(true);
      fetch('/api/admin/players', { headers: adminHeaders() })
        .then((res) => res.json())
        .then((data) => setPlayersList(data.players || []))
        .catch(() => setPlayersMessage('Eroare la incarcare'))
        .finally(() => setPlayersLoading(false));
    }
  }, [authenticated, tab, adminHeaders]);

  function updateScore(fixtureId: string, side: 'home' | 'away', value: string) {
    setScores((prev) => {
      const next = new Map(prev);
      const current = next.get(fixtureId) || { home: '', away: '' };
      next.set(fixtureId, { ...current, [side]: value });
      return next;
    });
  }

  async function handleSaveResults() {
    setSavingResults(true);
    setResultsMessage('');

    const results = Array.from(scores.entries())
      .filter(([, s]) => s.home !== '' && s.away !== '')
      .map(([fixture_id, s]) => ({
        fixture_id,
        home_score: parseInt(s.home),
        away_score: parseInt(s.away),
      }))
      .filter((r) => !isNaN(r.home_score) && !isNaN(r.away_score));

    if (results.length === 0) {
      setResultsMessage('Completati cel putin un scor');
      setSavingResults(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/results', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({ results }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResultsMessage(`Eroare: ${data.error}`);
      } else {
        setResultsMessage(`${data.updated} rezultate actualizate, puncte recalculate`);
        await loadFixtures();
      }
    } catch {
      setResultsMessage('Eroare de conexiune');
    } finally {
      setSavingResults(false);
    }
  }

  // Delete fixture
  async function handleDeleteFixture(id: string) {
    if (!confirm('Stergi acest meci?')) return;
    try {
      await fetch(`/api/admin/fixtures?id=${id}`, {
        method: 'DELETE',
        headers: adminHeaders(),
      });
      await loadFixtures();
    } catch {
      // ignore
    }
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-[#1B5E20]">PronoLiga</h1>
            <p className="text-gray-500 mt-1 text-sm">Admin Panel</p>
          </div>
          <form
            onSubmit={handleAuth}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Admin PIN</h2>
            {authError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {authError}
              </div>
            )}
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              required
              autoFocus
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B5E20] text-sm tracking-[0.5em] text-center mb-4"
              placeholder="Admin PIN"
            />
            <button
              type="submit"
              className="w-full bg-[#1B5E20] text-white py-2.5 rounded-lg font-medium hover:bg-[#145218] transition"
            >
              Intra
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <header className="bg-[#1B5E20] text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold">PronoLiga Admin</h1>
          <button
            onClick={() => setAuthenticated(false)}
            className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-md transition"
          >
            Iesire
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 flex gap-1">
          {[
            { key: 'sync' as const, label: 'Sincronizare API' },
            { key: 'add' as const, label: 'Adauga meciuri' },
            { key: 'results' as const, label: 'Rezultate' },
            { key: 'players' as const, label: 'Jucatori' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
                tab === t.key
                  ? 'border-[#1B5E20] text-[#1B5E20]'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Sync Tab */}
        {tab === 'sync' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold mb-4">
              Sincronizare din TheSportsDB
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Importa toate meciurile din sezonul curent al Superligii din TheSportsDB.
              Aceasta va adauga meciuri noi si va actualiza cele existente.
            </p>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="bg-[#1B5E20] text-white px-6 py-2.5 rounded-lg font-medium hover:bg-[#145218] transition disabled:opacity-50"
            >
              {syncing ? 'Se sincronizeaza...' : 'Sincronizeaza acum'}
            </button>
            {syncing && (
              <div className="mt-3 flex items-center gap-3">
                <div className="animate-spin h-5 w-5 border-2 border-[#1B5E20] border-t-transparent rounded-full" />
                <div className="text-sm text-gray-700">
                  <span className="font-medium">{syncStatus}</span>
                  <span className="ml-2 text-gray-500">{syncElapsed}s</span>
                </div>
              </div>
            )}
            {syncResult && (
              <div
                className={`mt-4 p-3 rounded-lg text-sm ${
                  syncResult.startsWith('Eroare')
                    ? 'bg-red-50 border border-red-200 text-red-700'
                    : 'bg-green-50 border border-green-200 text-green-700'
                }`}
              >
                {syncResult}
              </div>
            )}
          </div>
        )}

        {/* Add Fixtures Tab */}
        {tab === 'add' && (
          <form onSubmit={handleSaveFixtures} className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold mb-4">Adauga meciuri manual</h2>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Etapa
                </label>
                <input
                  type="number"
                  min={1}
                  max={40}
                  value={matchweek}
                  onChange={(e) => setMatchweek(parseInt(e.target.value) || 1)}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B5E20]"
                />
              </div>

              {newFixtures.map((fixture, i) => (
                <div
                  key={i}
                  className="flex flex-wrap gap-2 items-end mb-3 pb-3 border-b border-gray-100 last:border-0"
                >
                  <div className="flex-1 min-w-[140px]">
                    <label className="block text-xs text-gray-500 mb-1">Gazda</label>
                    <select
                      value={fixture.home_team}
                      onChange={(e) => updateFixtureRow(i, 'home_team', e.target.value)}
                      className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B5E20]"
                    >
                      <option value="">Selecteaza...</option>
                      {TEAMS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 min-w-[140px]">
                    <label className="block text-xs text-gray-500 mb-1">Oaspete</label>
                    <select
                      value={fixture.away_team}
                      onChange={(e) => updateFixtureRow(i, 'away_team', e.target.value)}
                      className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B5E20]"
                    >
                      <option value="">Selecteaza...</option>
                      {TEAMS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="min-w-[130px]">
                    <label className="block text-xs text-gray-500 mb-1">Data</label>
                    <input
                      type="date"
                      value={fixture.date}
                      onChange={(e) => updateFixtureRow(i, 'date', e.target.value)}
                      className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B5E20]"
                    />
                  </div>
                  <div className="w-20">
                    <label className="block text-xs text-gray-500 mb-1">Ora</label>
                    <input
                      type="time"
                      value={fixture.time}
                      onChange={(e) => updateFixtureRow(i, 'time', e.target.value)}
                      className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B5E20]"
                    />
                  </div>
                  {newFixtures.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeFixtureRow(i)}
                      className="px-2 py-2 text-red-500 hover:text-red-700 text-sm"
                    >
                      Sterge
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={addFixtureRow}
                className="text-sm text-[#1B5E20] font-medium hover:underline mt-2"
              >
                + Adauga meci
              </button>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-[#1B5E20] text-white py-3 rounded-xl font-medium hover:bg-[#145218] transition disabled:opacity-50"
            >
              {saving ? 'Se salveaza...' : 'Salveaza meciurile'}
            </button>

            {saveResult && (
              <div
                className={`p-3 rounded-lg text-sm ${
                  saveResult.startsWith('Eroare') || saveResult.startsWith('Completati')
                    ? 'bg-red-50 border border-red-200 text-red-700'
                    : 'bg-green-50 border border-green-200 text-green-700'
                }`}
              >
                {saveResult}
              </div>
            )}
          </form>
        )}

        {/* Results Tab */}
        {tab === 'results' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-4 mb-4">
                <h2 className="text-lg font-semibold">Rezultate</h2>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Etapa:</label>
                  <input
                    type="number"
                    min={1}
                    max={40}
                    value={resultsMatchweek}
                    onChange={(e) => setResultsMatchweek(parseInt(e.target.value) || 1)}
                    className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B5E20]"
                  />
                </div>
              </div>

              {loadingFixtures ? (
                <p className="text-sm text-gray-500">Se incarca...</p>
              ) : fixtures.length === 0 ? (
                <p className="text-sm text-gray-500">Nu exista meciuri pentru aceasta etapa</p>
              ) : (
                <div className="space-y-3">
                  {fixtures.map((f) => {
                    const score = scores.get(f.id) || { home: '', away: '' };
                    return (
                      <div
                        key={f.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border ${
                          f.status === 'finished'
                            ? 'bg-green-50 border-green-200'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex-1 text-right text-sm font-medium">
                          {f.home_team}
                        </div>
                        <input
                          type="number"
                          min={0}
                          max={99}
                          value={score.home}
                          onChange={(e) => updateScore(f.id, 'home', e.target.value)}
                          className="w-12 h-9 text-center border border-gray-300 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#1B5E20]"
                        />
                        <span className="text-gray-400 text-sm">-</span>
                        <input
                          type="number"
                          min={0}
                          max={99}
                          value={score.away}
                          onChange={(e) => updateScore(f.id, 'away', e.target.value)}
                          className="w-12 h-9 text-center border border-gray-300 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#1B5E20]"
                        />
                        <div className="flex-1 text-sm font-medium">{f.away_team}</div>
                        <button
                          onClick={() => handleDeleteFixture(f.id)}
                          className="text-red-400 hover:text-red-600 text-xs px-1"
                          title="Sterge meci"
                        >
                          X
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {fixtures.length > 0 && (
              <button
                onClick={handleSaveResults}
                disabled={savingResults}
                className="w-full bg-[#1B5E20] text-white py-3 rounded-xl font-medium hover:bg-[#145218] transition disabled:opacity-50"
              >
                {savingResults ? 'Se salveaza...' : 'Salveaza rezultatele'}
              </button>
            )}

            {resultsMessage && (
              <div
                className={`p-3 rounded-lg text-sm ${
                  resultsMessage.startsWith('Eroare') || resultsMessage.startsWith('Completati')
                    ? 'bg-red-50 border border-red-200 text-red-700'
                    : 'bg-green-50 border border-green-200 text-green-700'
                }`}
              >
                {resultsMessage}
              </div>
            )}
          </div>
        )}

        {/* Players Tab */}
        {tab === 'players' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold mb-4">Jucatori</h2>
            {playersLoading ? (
              <p className="text-sm text-gray-500">Se incarca...</p>
            ) : playersList.length === 0 ? (
              <p className="text-sm text-gray-500">Nu exista jucatori</p>
            ) : (
              <div className="space-y-3">
                {playersList.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50"
                  >
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      {p.avatar_url ? (
                        <img
                          src={p.avatar_url}
                          alt={p.name}
                          className="w-10 h-10 rounded-full object-cover border-2 border-[#1B5E20]/20"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#1B5E20]/10 flex items-center justify-center text-[#1B5E20] font-bold text-sm">
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <label
                        className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#1B5E20] text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-[#145218] transition"
                        title="Schimba poza"
                      >
                        <span className="text-[10px] leading-none">+</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingAvatar === p.id}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.size > 500 * 1024) {
                              setPlayersMessage('Eroare: Imaginea trebuie sa fie max 500KB');
                              return;
                            }
                            setUploadingAvatar(p.id);
                            setPlayersMessage('');
                            try {
                              const reader = new FileReader();
                              const dataUrl = await new Promise<string>((resolve, reject) => {
                                reader.onload = () => resolve(reader.result as string);
                                reader.onerror = reject;
                                reader.readAsDataURL(file);
                              });

                              // Resize image to 150x150 max
                              const resized = await new Promise<string>((resolve) => {
                                const img = new Image();
                                img.onload = () => {
                                  const canvas = document.createElement('canvas');
                                  const size = 150;
                                  canvas.width = size;
                                  canvas.height = size;
                                  const ctx = canvas.getContext('2d')!;
                                  const min = Math.min(img.width, img.height);
                                  const sx = (img.width - min) / 2;
                                  const sy = (img.height - min) / 2;
                                  ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
                                  resolve(canvas.toDataURL('image/jpeg', 0.8));
                                };
                                img.src = dataUrl;
                              });

                              const res = await fetch('/api/admin/players', {
                                method: 'PATCH',
                                headers: adminHeaders(),
                                body: JSON.stringify({ id: p.id, avatar_url: resized }),
                              });
                              if (res.ok) {
                                setPlayersList((prev) =>
                                  prev.map((pl) =>
                                    pl.id === p.id ? { ...pl, avatar_url: resized } : pl
                                  )
                                );
                                setPlayersMessage('Poza actualizata');
                              } else {
                                setPlayersMessage('Eroare la salvare poza');
                              }
                            } catch {
                              setPlayersMessage('Eroare la procesare imagine');
                            } finally {
                              setUploadingAvatar(null);
                              e.target.value = '';
                            }
                          }}
                        />
                      </label>
                      {uploadingAvatar === p.id && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-full">
                          <div className="animate-spin h-4 w-4 border-2 border-[#1B5E20] border-t-transparent rounded-full" />
                        </div>
                      )}
                    </div>

                    {editingPlayer === p.id ? (
                      <>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B5E20]"
                          autoFocus
                        />
                        <button
                          onClick={async () => {
                            if (!editName.trim()) return;
                            const res = await fetch('/api/admin/players', {
                              method: 'PATCH',
                              headers: adminHeaders(),
                              body: JSON.stringify({ id: p.id, name: editName.trim() }),
                            });
                            if (res.ok) {
                              setPlayersList((prev) =>
                                prev.map((pl) =>
                                  pl.id === p.id ? { ...pl, name: editName.trim() } : pl
                                )
                              );
                              setEditingPlayer(null);
                              setPlayersMessage('Nume actualizat');
                            } else {
                              setPlayersMessage('Eroare la salvare');
                            }
                          }}
                          className="px-3 py-1.5 bg-[#1B5E20] text-white text-sm rounded-lg hover:bg-[#145218]"
                        >
                          Salveaza
                        </button>
                        <button
                          onClick={() => setEditingPlayer(null)}
                          className="px-3 py-1.5 text-gray-600 text-sm hover:text-gray-900"
                        >
                          Anuleaza
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm font-medium">{p.name}</span>
                        <button
                          onClick={() => {
                            setEditingPlayer(p.id);
                            setEditName(p.name);
                          }}
                          className="px-3 py-1.5 text-sm text-[#1B5E20] hover:bg-[#1B5E20]/10 rounded-lg"
                        >
                          Redenumeste
                        </button>
                        {p.avatar_url && (
                          <button
                            onClick={async () => {
                              if (!confirm('Stergi poza de profil?')) return;
                              const res = await fetch('/api/admin/players', {
                                method: 'PATCH',
                                headers: adminHeaders(),
                                body: JSON.stringify({ id: p.id, avatar_url: null }),
                              });
                              if (res.ok) {
                                setPlayersList((prev) =>
                                  prev.map((pl) =>
                                    pl.id === p.id ? { ...pl, avatar_url: null } : pl
                                  )
                                );
                                setPlayersMessage('Poza stearsa');
                              }
                            }}
                            className="px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 rounded-lg"
                          >
                            Sterge poza
                          </button>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
            {playersMessage && (
              <div
                className={`mt-3 p-3 rounded-lg text-sm ${
                  playersMessage.startsWith('Eroare')
                    ? 'bg-red-50 border border-red-200 text-red-700'
                    : 'bg-green-50 border border-green-200 text-green-700'
                }`}
              >
                {playersMessage}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
