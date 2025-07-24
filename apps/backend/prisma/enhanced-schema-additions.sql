-- Enhanced Game Session Tables
-- Add these columns to existing game_sessions table
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS events_data JSONB;
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS player_choices JSONB;
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS bonus_multiplier DECIMAL(5,2) DEFAULT 1.00;
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS risk_multiplier DECIMAL(5,2) DEFAULT 1.00;
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS leash_slack_used BOOLEAN DEFAULT FALSE;

-- Progressive Jackpot Table
CREATE TABLE IF NOT EXISTS progressive_jackpots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jackpot_type VARCHAR(50) NOT NULL,
  current_amount_cents INT NOT NULL DEFAULT 0,
  trigger_probability DECIMAL(5,4) NOT NULL,
  minimum_walk_time INT NOT NULL,
  last_winner_id UUID REFERENCES users(id),
  last_win_amount_cents INT,
  last_win_timestamp TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Game Events Log (for detailed tracking)
CREATE TABLE IF NOT EXISTS game_events_enhanced (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  event_second INT NOT NULL,
  event_parameters JSONB,
  player_choice VARCHAR(20), -- 'accept', 'decline', 'use_powerup', null
  choice_timestamp TIMESTAMP,
  outcome VARCHAR(50), -- 'bonus_gained', 'penalty_applied', 'no_change'
  created_at TIMESTAMP DEFAULT NOW()
);

-- Mini-Game Templates
CREATE TABLE IF NOT EXISTS mini_game_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_type VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  risk_description TEXT NOT NULL,
  reward_description TEXT NOT NULL,
  success_probability DECIMAL(4,3) NOT NULL,
  success_reward_type VARCHAR(50) NOT NULL,
  success_reward_value DECIMAL(5,2) NOT NULL,
  failure_penalty_type VARCHAR(50) NOT NULL,
  failure_penalty_value DECIMAL(5,2) NOT NULL,
  time_limit_seconds INT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default mini-game templates
INSERT INTO mini_game_templates (
  game_type, title, description, risk_description, reward_description,
  success_probability, success_reward_type, success_reward_value,
  failure_penalty_type, failure_penalty_value, time_limit_seconds
) VALUES 
(
  'bonus_treat',
  '🦴 Found a Treat!',
  'Your dog spotted a delicious treat on the path!',
  'Stopping to eat might attract attention...',
  '+20% payout multiplier if successful',
  0.70, 'multiplier_bonus', 1.20,
  'risk_increase', 1.30, 8
),
(
  'butterfly_chase',
  '🦋 Butterfly Spotted!',
  'A beautiful butterfly catches your dog''s attention!',
  'Chasing might lead to unexpected areas...',
  'Tap quickly to catch it for bonus multiplier!',
  0.60, 'multiplier_bonus', 1.50,
  'risk_increase', 1.40, 5
),
(
  'fetch_game',
  '🎾 Tennis Ball Appears!',
  'Someone dropped a tennis ball nearby!',
  'Fetch mode doubles squirrel risk but increases rewards',
  '+50% payout rate for 5 seconds',
  1.00, 'multiplier_bonus', 1.50,
  'risk_increase', 2.00, 10
)
ON CONFLICT (game_type) DO NOTHING;

-- Initialize progressive jackpot
INSERT INTO progressive_jackpots (
  jackpot_type, current_amount_cents, trigger_probability, minimum_walk_time
) VALUES (
  'main_jackpot', 15000, 0.05, 15
) ON CONFLICT DO NOTHING;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_game_events_enhanced_session_id ON game_events_enhanced(session_id);
CREATE INDEX IF NOT EXISTS idx_game_events_enhanced_event_type ON game_events_enhanced(event_type);
CREATE INDEX IF NOT EXISTS idx_progressive_jackpots_type ON progressive_jackpots(jackpot_type);

-- Add indexes to game_sessions for enhanced queries
CREATE INDEX IF NOT EXISTS idx_game_sessions_events_data ON game_sessions USING GIN(events_data);
CREATE INDEX IF NOT EXISTS idx_game_sessions_player_choices ON game_sessions USING GIN(player_choices); 