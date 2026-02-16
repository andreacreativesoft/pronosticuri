// TheSportsDB integration for Romanian Liga 1
// Free API — no key required (uses public key "3")
// League ID: 4691 (Romanian Liga I / SuperLiga)

const BASE_URL = 'https://www.thesportsdb.com/api/v1/json/3';
const LEAGUE_ID = '4691';

export interface SportsDbEvent {
  idEvent: string;
  strEvent: string;
  strHomeTeam: string;
  strAwayTeam: string;
  strHomeTeamBadge: string | null;
  strAwayTeamBadge: string | null;
  intHomeScore: string | null;
  intAwayScore: string | null;
  intRound: string;
  dateEvent: string;
  strTime: string;
  strTimestamp: string;
  strStatus: string | null;
  strPostponed: string | null;
  strSeason: string;
}

interface EventsResponse {
  events: SportsDbEvent[] | null;
}

async function fetchApi(endpoint: string): Promise<EventsResponse> {
  const url = `${BASE_URL}/${endpoint}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`TheSportsDB request failed: ${response.status}`);
  }

  return response.json();
}

export async function getSeasonFixtures(season: string): Promise<SportsDbEvent[]> {
  // season format: "2025-2026"
  const data = await fetchApi(`eventsseason.php?id=${LEAGUE_ID}&s=${season}`);
  return data.events || [];
}

export async function getNextFixtures(): Promise<SportsDbEvent[]> {
  const data = await fetchApi(`eventsnextleague.php?id=${LEAGUE_ID}`);
  return data.events || [];
}

export async function getPastFixtures(): Promise<SportsDbEvent[]> {
  const data = await fetchApi(`eventspastleague.php?id=${LEAGUE_ID}`);
  return data.events || [];
}

export async function getEventById(eventId: string): Promise<SportsDbEvent | null> {
  const response = await fetch(`${BASE_URL}/lookupevent.php?id=${eventId}`);
  if (!response.ok) return null;
  const data = await response.json();
  return data.events?.[0] || null;
}

export async function getEventsByIds(eventIds: string[]): Promise<SportsDbEvent[]> {
  const results: SportsDbEvent[] = [];
  for (const id of eventIds) {
    const event = await getEventById(id);
    if (event) results.push(event);
  }
  return results;
}

export function parseRoundNumber(intRound: string): number {
  const num = parseInt(intRound, 10);
  return isNaN(num) ? 0 : num;
}

export function mapEventStatus(event: SportsDbEvent): 'scheduled' | 'live' | 'finished' {
  const status = event.strStatus?.toLowerCase() || '';

  // If there's a final score and the status indicates it's done
  if (
    status === 'match finished' ||
    status === 'ft' ||
    status === 'aet' ||
    status === 'pen' ||
    status.includes('finished')
  ) {
    return 'finished';
  }

  // If it has scores but no finished status, it might be live
  if (
    status.includes('live') ||
    status === '1h' ||
    status === '2h' ||
    status === 'ht' ||
    status === 'et' ||
    status.includes('progress')
  ) {
    return 'live';
  }

  // Also check: if intHomeScore and intAwayScore are set and event date is in the past
  if (event.intHomeScore !== null && event.intAwayScore !== null) {
    const eventDate = new Date(event.strTimestamp || `${event.dateEvent}T${event.strTime || '00:00:00'}`);
    const now = new Date();
    if (now.getTime() - eventDate.getTime() > 3 * 60 * 60 * 1000) {
      return 'finished';
    }
  }

  return 'scheduled';
}

export function buildKickOff(event: SportsDbEvent): string {
  // strTimestamp is UTC, e.g. "2025-08-15T18:00:00+00:00"
  if (event.strTimestamp) {
    return event.strTimestamp;
  }
  // Fallback to dateEvent + strTime
  const time = event.strTime || '00:00:00';
  return `${event.dateEvent}T${time}+00:00`;
}
