// TheSportsDB API for Romanian Liga I (SuperLiga)
// Free API — no key needed (key "3" is the free test key)
// League ID: 4691

const API_KEY = process.env.THESPORTSDB_API_KEY || '3';
const BASE_URL = `https://www.thesportsdb.com/api/v1/json/${API_KEY}`;
const LEAGUE_ID = 4691;
const SEASON = '2025-2026';

export interface TSDBEvent {
  idEvent: string;
  strEvent: string;
  strHomeTeam: string;
  strAwayTeam: string;
  intHomeScore: string | null;
  intAwayScore: string | null;
  intRound: string;
  dateEvent: string; // "2025-07-12"
  strTime: string; // "18:00:00"
  strStatus: string | null;
  strHomeTeamBadge: string | null;
  strAwayTeamBadge: string | null;
  idHomeTeam: string;
  idAwayTeam: string;
  strTimestamp: string | null; // unix timestamp as string
}

interface EventsResponse {
  events: TSDBEvent[] | null;
}

async function fetchApi<T>(endpoint: string): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`TheSportsDB request failed: ${response.status} for ${endpoint}`);
  }

  return response.json();
}

// Get all events for a specific round
export async function getFixturesForRound(round: number): Promise<TSDBEvent[]> {
  const data = await fetchApi<EventsResponse>(
    `/eventsround.php?id=${LEAGUE_ID}&r=${round}&s=${SEASON}`
  );
  return data.events || [];
}

// Get all season fixtures by iterating rounds
export async function getAllSeasonFixtures(): Promise<TSDBEvent[]> {
  const allEvents: TSDBEvent[] = [];

  for (let round = 1; round <= 40; round++) {
    try {
      const events = await getFixturesForRound(round);
      if (!events || events.length === 0) break;
      allEvents.push(...events);
    } catch {
      break;
    }
  }

  return allEvents;
}

// Get a single event by ID
export async function getEventById(eventId: string): Promise<TSDBEvent | null> {
  try {
    const data = await fetchApi<{ events: TSDBEvent[] | null }>(
      `/lookupevent.php?id=${eventId}`
    );
    return data.events?.[0] || null;
  } catch {
    return null;
  }
}

// Get multiple events by IDs
export async function getEventsByIds(eventIds: number[]): Promise<TSDBEvent[]> {
  const results: TSDBEvent[] = [];
  for (const id of eventIds) {
    const event = await getEventById(String(id));
    if (event) results.push(event);
  }
  return results;
}

// Team badge URL
export function getTeamLogo(teamId: string): string {
  return `https://www.thesportsdb.com/images/media/team/badge/${teamId}.png`;
}

export function mapEventStatus(event: TSDBEvent): 'scheduled' | 'live' | 'finished' {
  const status = (event.strStatus || '').toLowerCase();

  if (
    status === 'match finished' ||
    status === 'ft' ||
    status === 'aet' ||
    status === 'pen'
  ) {
    return 'finished';
  }

  if (
    status.includes('half') ||
    status === 'live' ||
    status === 'in progress' ||
    /^\d+\'?$/.test(status) // "45'" or "90"
  ) {
    return 'live';
  }

  return 'scheduled';
}

export function buildKickOff(event: TSDBEvent): string {
  // Use timestamp if available
  if (event.strTimestamp) {
    const ts = parseInt(event.strTimestamp);
    if (!isNaN(ts)) {
      return new Date(ts * 1000).toISOString();
    }
  }

  // Fallback: combine date and time
  const time = event.strTime || '00:00:00';
  return new Date(`${event.dateEvent}T${time}+02:00`).toISOString();
}
