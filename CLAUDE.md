# PronoLiga - Soccer Prediction Game

## Project Overview

PronoLiga is a Next.js prediction game for Romanian SuperLiga (Liga I). Players register with a 4-digit PIN, predict match scores weekly, and earn points (3 for exact score, 1 for correct outcome).

**Live site:** https://pronosticuri-tau.vercel.app/
**Branch:** `claude/pronoliga-soccer-game-yFte9`

## Tech Stack

- **Framework:** Next.js 16.1.6, React 19.2.3, TypeScript 5
- **Database:** Supabase (PostgreSQL)
- **Styling:** Tailwind CSS 4
- **Hosting:** Vercel (with cron jobs)
- **Data source:** TheSportsDB API (free, key "3")
- **WhatsApp:** Twilio (optional, for reminders)

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
JWT_SECRET=
CRON_SECRET=
ADMIN_PIN=              # 4+ digit PIN for /admin access
THESPORTSDB_API_KEY=    # defaults to '3' (free)
TWILIO_ACCOUNT_SID=     # optional
TWILIO_AUTH_TOKEN=       # optional
TWILIO_WHATSAPP_FROM=   # optional
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Database Schema (Supabase)

**players** — id (UUID), name, phone, pin_hash, total_points, exact_scores, correct_signs, created_at
**fixtures** — id (UUID), api_fixture_id (unique), matchweek, home_team, away_team, home_logo, away_logo, kick_off (TIMESTAMPTZ), home_score, away_score, status, season, created_at
**predictions** — id (UUID), player_id (FK), fixture_id (FK), predicted_home, predicted_away, points_earned, created_at, updated_at. UNIQUE(player_id, fixture_id)
**settings** — key (PK), value

## Directory Structure

```
app/
  page.tsx                    # Home — current matchweek predictions
  login/page.tsx              # PIN login
  signup/page.tsx             # Registration
  clasament/page.tsx          # Leaderboard
  istoric/page.tsx            # History — all predictions per matchweek
  admin/page.tsx              # Admin panel (sync, add fixtures, results, players)
  api/
    auth/login|logout|me|signup/   # Auth endpoints
    admin/verify|sync|fixtures|results|players/  # Admin endpoints (x-admin-pin header)
    cron/sync-fixtures|update-results|send-reminders/  # Cron jobs
    fixtures/current|matchweeks|route.ts   # Fixture data
    predictions/route.ts|all/   # Player predictions
    leaderboard/route.ts        # Leaderboard data
components/
  FixtureCard.tsx             # Match card with prediction inputs
  MatchweekSelector.tsx       # Matchweek dropdown
  Navbar.tsx                  # Top/bottom navigation
  SkeletonCard.tsx            # Loading placeholder
  Toast.tsx                   # Notification toast
lib/
  api-football.ts             # TheSportsDB API (league 4691, season 2025-2026)
  auth.ts                     # JWT + bcrypt PIN auth
  points.ts                   # Scoring: 3 (exact), 1 (sign), 0 (miss)
  supabase.ts                 # Supabase client init
  whatsapp.ts                 # Twilio WhatsApp messaging
middleware.ts                 # Route protection (auth, admin, cron)
```

## Key Business Logic

- **Predictions lock** 5 minutes before kick-off
- **Points:** 3 = exact score, 1 = correct outcome (home win/draw/away win), 0 = miss
- **Leaderboard sort:** total_points DESC → exact_scores DESC → name ASC
- **History** only shows predictions for locked fixtures (no spoilers)
- **Admin PIN** checked in middleware via `x-admin-pin` header
- **Cron jobs:** sync (Monday 6AM), results (daily 10PM), reminders (daily 10AM)

## Admin Panel (/admin)

Tabs: **Sincronizare API** | **Adauga meciuri** | **Rezultate** | **Jucatori**

- Sync: fetches all season fixtures from TheSportsDB
- Add: manual fixture creation with team dropdowns
- Results: enter scores, recalculates all player points
- Players: list and rename players

## Teams in System

FCSB, CFR Cluj, Universitatea Craiova, Rapid Bucuresti, Dinamo Bucuresti, Universitatea Cluj, FC Botosani, Farul Constanta, Petrolul Ploiesti, FC Hermannstadt, Otelul Galati, UTA Arad, Unirea Slobozia, Sepsi OSK, FC Arges, Gloria Buzau, Csikszereda M. Ciuc, Metaloglobus Bucuresti

---

## Session History & Changes Made

### Session 1 — Initial Build
- Built full PronoLiga app from scratch
- Tried API-Football → Sofascore → settled on TheSportsDB (free)
- PIN-only auth (no username/password, just 4-digit PIN)
- Admin panel with sync, fixture management, results

### Session 2 (Current) — Bug Fixes & Improvements

**1. Admin PIN verification (server-side)**
- Added `/api/admin/verify` endpoint
- Admin login now verifies PIN against server before showing panel
- Shows "PIN incorect" immediately instead of failing on first API call

**2. Sync progress indicator**
- Added spinner, step-by-step status text, live elapsed timer
- Shows total time in final result message

**3. CRITICAL FIX — Wrong fixture dates**
- **Bug:** `buildKickOff()` was doing `parseInt()` on TheSportsDB's `strTimestamp`
- `strTimestamp` is an ISO 8601 string (e.g., `"2025-02-20T15:00:00+00:00"`), NOT unix seconds
- `parseInt("2025-02-20T...")` → `2025` → `new Date(2025000)` → **January 1, 1970 02:33**
- **Fix:** Parse with `new Date(event.strTimestamp)` directly

**4. /istoric layout overhaul**
- Teams stacked vertically (home on top, away below) with full names
- Removed `truncate max-w-[60px]` that was cutting names to "Petrolul...", "Universit..."
- Scores and predictions also stacked vertically to align with teams
- Bigger text, better padding

**5. Missing teams added**
- Added Csikszereda M. Ciuc and Metaloglobus Bucuresti to TEAMS dropdown

**6. Player management tab**
- New "Jucatori" tab in admin
- List all players, rename button
- Created `/api/admin/players` (GET list, PATCH rename)

### Known Issues / TODO
- After deploying the date fix, user needs to **re-sync** to update existing wrong dates in database
- User wants to rename "Ifrim Dorin Bogdan" to "Bogdan" via the new Jucatori tab
- TheSportsDB free API is rate-limited — sync iterates 40 rounds sequentially
