const API_KEY = process.env.API_FOOTBALL_KEY!;
const BASE_URL = 'https://v3.football.api-sports.io';
const LEAGUE_ID = 283; // Romanian Liga 1

interface ApiFixture {
  fixture: {
    id: number;
    date: string;
    status: {
      short: string;
      long: string;
    };
  };
  league: {
    round: string;
  };
  teams: {
    home: {
      id: number;
      name: string;
      logo: string;
    };
    away: {
      id: number;
      name: string;
      logo: string;
    };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
}

interface ApiResponse {
  response: ApiFixture[];
  errors: Record<string, string>;
}

async function fetchApi(endpoint: string, params: Record<string, string>): Promise<ApiResponse> {
  const url = new URL(`${BASE_URL}${endpoint}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  const response = await fetch(url.toString(), {
    headers: {
      'x-apisports-key': API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`API-Football request failed: ${response.status}`);
  }

  return response.json();
}

export async function getFixturesForSeason(season: number): Promise<ApiFixture[]> {
  const data = await fetchApi('/fixtures', {
    league: LEAGUE_ID.toString(),
    season: season.toString(),
  });
  return data.response;
}

export async function getFixturesForRound(season: number, round: number): Promise<ApiFixture[]> {
  const data = await fetchApi('/fixtures', {
    league: LEAGUE_ID.toString(),
    season: season.toString(),
    round: `Regular Season - ${round}`,
  });
  return data.response;
}

export async function getFixturesByIds(ids: number[]): Promise<ApiFixture[]> {
  // API-Football allows fetching one fixture at a time by ID
  const results: ApiFixture[] = [];
  for (const id of ids) {
    const data = await fetchApi('/fixtures', { id: id.toString() });
    if (data.response.length > 0) {
      results.push(data.response[0]);
    }
  }
  return results;
}

export function parseRoundNumber(round: string): number {
  // "Regular Season - 14" -> 14
  const match = round.match(/Regular Season - (\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

export function mapApiStatus(shortStatus: string): 'scheduled' | 'live' | 'finished' {
  const finishedStatuses = ['FT', 'AET', 'PEN'];
  const liveStatuses = ['1H', '2H', 'HT', 'ET', 'BT', 'P', 'LIVE'];

  if (finishedStatuses.includes(shortStatus)) return 'finished';
  if (liveStatuses.includes(shortStatus)) return 'live';
  return 'scheduled';
}

export type { ApiFixture };
