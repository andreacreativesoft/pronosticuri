// Sofascore API for Romanian SuperLiga
// Free, no API key needed
// Tournament ID: 152 (Romanian SuperLiga)

const BASE_URL = 'https://www.sofascore.com/api/v1';
const TOURNAMENT_ID = 152;
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  Accept: 'application/json',
};

export interface SofascoreEvent {
  id: number;
  slug: string;
  status: {
    code: number;
    description: string;
    type: string; // "finished", "notstarted", "inprogress"
  };
  homeTeam: {
    id: number;
    name: string;
    slug: string;
  };
  awayTeam: {
    id: number;
    name: string;
    slug: string;
  };
  homeScore: {
    current?: number;
    display?: number;
  };
  awayScore: {
    current?: number;
    display?: number;
  };
  roundInfo?: {
    round: number;
  };
  startTimestamp: number; // Unix timestamp
}

interface SeasonsResponse {
  seasons: { id: number; name: string; year: string }[];
}

interface EventsResponse {
  events: SofascoreEvent[];
}

async function fetchApi<T>(endpoint: string): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, { headers: HEADERS });

  if (!response.ok) {
    throw new Error(`Sofascore request failed: ${response.status} for ${endpoint}`);
  }

  return response.json();
}

// Get the season ID for a given year (e.g. "25/26")
export async function getSeasonId(): Promise<number | null> {
  const data = await fetchApi<SeasonsResponse>(
    `/unique-tournament/${TOURNAMENT_ID}/seasons`
  );
  if (!data.seasons || data.seasons.length === 0) return null;
  // Most recent season is first
  return data.seasons[0].id;
}

// Get all fixtures for a round
export async function getFixturesForRound(seasonId: number, round: number): Promise<SofascoreEvent[]> {
  const data = await fetchApi<EventsResponse>(
    `/unique-tournament/${TOURNAMENT_ID}/season/${seasonId}/events/round/${round}`
  );
  return data.events || [];
}

// Get all rounds for the season by fetching rounds until empty
export async function getAllSeasonFixtures(seasonId: number): Promise<SofascoreEvent[]> {
  const allEvents: SofascoreEvent[] = [];

  for (let round = 1; round <= 40; round++) {
    try {
      const events = await getFixturesForRound(seasonId, round);
      if (!events || events.length === 0) break;
      allEvents.push(...events);
    } catch {
      // No more rounds
      break;
    }
  }

  return allEvents;
}

// Get a single event by ID
export async function getEventById(eventId: number): Promise<SofascoreEvent | null> {
  try {
    const data = await fetchApi<{ event: SofascoreEvent }>(`/event/${eventId}`);
    return data.event || null;
  } catch {
    return null;
  }
}

// Get multiple events by IDs
export async function getEventsByIds(eventIds: number[]): Promise<SofascoreEvent[]> {
  const results: SofascoreEvent[] = [];
  for (const id of eventIds) {
    const event = await getEventById(id);
    if (event) results.push(event);
  }
  return results;
}

// Team logo URL from Sofascore
export function getTeamLogo(teamId: number): string {
  return `https://api.sofascore.app/api/v1/team/${teamId}/image`;
}

export function mapEventStatus(event: SofascoreEvent): 'scheduled' | 'live' | 'finished' {
  const type = event.status?.type?.toLowerCase() || '';

  if (type === 'finished') return 'finished';
  if (type === 'inprogress') return 'live';
  return 'scheduled';
}

export function buildKickOff(event: SofascoreEvent): string {
  return new Date(event.startTimestamp * 1000).toISOString();
}
