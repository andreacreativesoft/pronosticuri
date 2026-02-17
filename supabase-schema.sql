-- PronoLiga Database Schema
-- Run this SQL in Supabase SQL Editor to create all tables

CREATE TABLE players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  phone VARCHAR(20) NOT NULL,
  pin_hash VARCHAR(255) NOT NULL,
  total_points INTEGER DEFAULT 0,
  exact_scores INTEGER DEFAULT 0,
  correct_signs INTEGER DEFAULT 0,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE fixtures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  api_fixture_id INTEGER UNIQUE NOT NULL,
  matchweek INTEGER NOT NULL,
  home_team VARCHAR(100) NOT NULL,
  away_team VARCHAR(100) NOT NULL,
  home_logo VARCHAR(500),
  away_logo VARCHAR(500),
  kick_off TIMESTAMPTZ NOT NULL,
  home_score INTEGER,
  away_score INTEGER,
  status VARCHAR(20) DEFAULT 'scheduled',
  season INTEGER DEFAULT 2025,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE predictions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  fixture_id UUID REFERENCES fixtures(id) ON DELETE CASCADE,
  predicted_home INTEGER NOT NULL,
  predicted_away INTEGER NOT NULL,
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, fixture_id)
);

CREATE TABLE settings (
  key VARCHAR(50) PRIMARY KEY,
  value TEXT NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_fixtures_matchweek ON fixtures(matchweek);
CREATE INDEX idx_fixtures_status ON fixtures(status);
CREATE INDEX idx_fixtures_kick_off ON fixtures(kick_off);
CREATE INDEX idx_predictions_player ON predictions(player_id);
CREATE INDEX idx_predictions_fixture ON predictions(fixture_id);

-- Insert initial settings
INSERT INTO settings (key, value) VALUES ('current_season', '2025');
