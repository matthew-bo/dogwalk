#!/usr/bin/env node

// Script to generate SQL for Supabase from our Prisma schema
// This creates the base tables needed for the gambling platform

const fs = require('fs');
const path = require('path');

const sql = `
-- Dog Walk Gamble Database Schema for Supabase
-- Run this in Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create ENUM types
CREATE TYPE "TransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'BET', 'PAYOUT');
CREATE TYPE "CryptoType" AS ENUM ('BTC', 'ETH');
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED');
CREATE TYPE "GameOutcome" AS ENUM ('WIN', 'LOSS', 'INCOMPLETE');
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ABANDONED');
CREATE TYPE "CosmeticType" AS ENUM ('DOG_BREED', 'BACKGROUND', 'ACCESSORY');
CREATE TYPE "DisputeType" AS ENUM ('GAME_FAIRNESS', 'PAYMENT_ISSUE', 'ACCOUNT_ACCESS');
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED');
CREATE TYPE "LogLevel" AS ENUM ('INFO', 'WARN', 'ERROR');

-- Users table
CREATE TABLE IF NOT EXISTS "users" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "username" VARCHAR(50) UNIQUE NOT NULL,
  "email" VARCHAR(255) UNIQUE NOT NULL,
  "password_hash" VARCHAR(255) NOT NULL,
  "usd_balance_cents" INTEGER DEFAULT 0,
  "is_age_verified" BOOLEAN DEFAULT FALSE,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW()
);

-- Transactions table
CREATE TABLE IF NOT EXISTS "transactions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" "TransactionType" NOT NULL,
  "usd_amount" INTEGER NOT NULL, -- amount in cents
  "crypto_amount" BIGINT,
  "crypto_type" "CryptoType",
  "crypto_tx_hash" VARCHAR(255),
  "exchange_rate" DECIMAL(12,2),
  "status" "TransactionStatus" DEFAULT 'PENDING',
  "created_at" TIMESTAMP DEFAULT NOW()
);

-- Game sessions table
CREATE TABLE IF NOT EXISTS "game_sessions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "bet_amount_cents" INTEGER NOT NULL,
  "duration_seconds" INTEGER,
  "payout_amount_cents" INTEGER DEFAULT 0,
  "outcome" "GameOutcome" DEFAULT 'INCOMPLETE',
  "squirrel_event_time" INTEGER,
  "rng_seed" VARCHAR(255) NOT NULL,
  "server_seed" VARCHAR(255),
  "server_seed_hash" VARCHAR(255) NOT NULL,
  "client_seed" VARCHAR(255) NOT NULL,
  "nonce" BIGINT NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "completed_at" TIMESTAMP,
  "last_heartbeat" TIMESTAMP DEFAULT NOW(),
  "status" "SessionStatus" DEFAULT 'ACTIVE'
);

-- Game event logs table
CREATE TABLE IF NOT EXISTS "game_event_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "session_id" UUID NOT NULL REFERENCES "game_sessions"("id") ON DELETE CASCADE,
  "event" VARCHAR(100) NOT NULL,
  "data" JSONB,
  "server_time" BIGINT NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW()
);

-- User cosmetics table
CREATE TABLE IF NOT EXISTS "user_cosmetics" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "cosmetic_type" "CosmeticType" NOT NULL,
  "cosmetic_id" VARCHAR(50) NOT NULL,
  "unlocked_at" TIMESTAMP DEFAULT NOW(),
  UNIQUE("user_id", "cosmetic_type", "cosmetic_id")
);

-- Crypto holdings table
CREATE TABLE IF NOT EXISTS "crypto_holdings" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "crypto_type" "CryptoType" NOT NULL,
  "amount" BIGINT NOT NULL, -- Amount in smallest unit
  "usd_value_at_deposit" INTEGER NOT NULL,
  "exchange_rate" DECIMAL(12,2) NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW()
);

-- Disputes table
CREATE TABLE IF NOT EXISTS "disputes" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" "DisputeType" NOT NULL,
  "description" TEXT NOT NULL,
  "evidence" JSONB,
  "status" "DisputeStatus" DEFAULT 'OPEN',
  "resolution" TEXT,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW()
);

-- Payment attempts table
CREATE TABLE IF NOT EXISTS "payment_attempts" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "transaction_id" UUID REFERENCES "transactions"("id") ON DELETE SET NULL,
  "provider" VARCHAR(50) NOT NULL,
  "provider_charge_id" VARCHAR(255),
  "amount_cents" INTEGER NOT NULL,
  "currency" VARCHAR(10) DEFAULT 'USD',
  "status" "TransactionStatus" DEFAULT 'PENDING',
  "provider_response" JSONB,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW()
);

-- Balance changes table (for auditing)
CREATE TABLE IF NOT EXISTS "balance_changes" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "transaction_id" UUID REFERENCES "transactions"("id") ON DELETE SET NULL,
  "previous_balance_cents" INTEGER NOT NULL,
  "new_balance_cents" INTEGER NOT NULL,
  "change_amount_cents" INTEGER NOT NULL,
  "change_reason" VARCHAR(100) NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
  "action" VARCHAR(100) NOT NULL,
  "entity_type" VARCHAR(50) NOT NULL,
  "entity_id" VARCHAR(100),
  "old_values" JSONB,
  "new_values" JSONB,
  "ip_address" INET,
  "user_agent" TEXT,
  "level" "LogLevel" DEFAULT 'INFO',
  "created_at" TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_transactions_user_id" ON "transactions"("user_id");
CREATE INDEX IF NOT EXISTS "idx_transactions_created_at" ON "transactions"("created_at");
CREATE INDEX IF NOT EXISTS "idx_transactions_status" ON "transactions"("status");

CREATE INDEX IF NOT EXISTS "idx_game_sessions_user_id" ON "game_sessions"("user_id");
CREATE INDEX IF NOT EXISTS "idx_game_sessions_status" ON "game_sessions"("status");
CREATE INDEX IF NOT EXISTS "idx_game_sessions_created_at" ON "game_sessions"("created_at");
CREATE INDEX IF NOT EXISTS "idx_game_sessions_outcome" ON "game_sessions"("outcome");

CREATE INDEX IF NOT EXISTS "idx_game_event_logs_session_id" ON "game_event_logs"("session_id");
CREATE INDEX IF NOT EXISTS "idx_game_event_logs_created_at" ON "game_event_logs"("created_at");

CREATE INDEX IF NOT EXISTS "idx_user_cosmetics_user_id" ON "user_cosmetics"("user_id");

CREATE INDEX IF NOT EXISTS "idx_crypto_holdings_user_id" ON "crypto_holdings"("user_id");
CREATE INDEX IF NOT EXISTS "idx_crypto_holdings_crypto_type" ON "crypto_holdings"("crypto_type");

CREATE INDEX IF NOT EXISTS "idx_balance_changes_user_id" ON "balance_changes"("user_id");
CREATE INDEX IF NOT EXISTS "idx_balance_changes_created_at" ON "balance_changes"("created_at");

CREATE INDEX IF NOT EXISTS "idx_audit_logs_user_id" ON "audit_logs"("user_id");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_created_at" ON "audit_logs"("created_at");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_action" ON "audit_logs"("action");

-- Add updated_at trigger for users table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some initial data for testing
INSERT INTO "users" ("username", "email", "password_hash", "usd_balance_cents", "is_age_verified") 
VALUES ('testuser', 'test@example.com', '$2b$10$dummy.hash.for.testing', 100000, true)
ON CONFLICT ("username") DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Dog Walk Gamble base schema created successfully!';
    RAISE NOTICE 'Next step: Run the enhanced-schema-additions.sql for multi-event features.';
END $$;
`;

// Write to file
const outputPath = path.join(__dirname, '..', 'supabase-base-schema.sql');
fs.writeFileSync(outputPath, sql);

console.log('✅ Generated Supabase SQL schema at:', outputPath);
console.log('📝 Copy this file content into Supabase SQL Editor');
console.log('🎯 Then run enhanced-schema-additions.sql for multi-event features'); 