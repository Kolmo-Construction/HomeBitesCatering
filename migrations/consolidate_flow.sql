-- Consolidate Sales Flow: Add 'lost' status, lostReason, and opportunityId on estimates
-- Run BEFORE db:push so Drizzle sees the enum already updated.

-- 1. Add 'lost' to opportunity_status enum
ALTER TYPE opportunity_status ADD VALUE IF NOT EXISTS 'lost' BEFORE 'archived';

-- 2. Add lost_reason column to opportunities
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS lost_reason text;

-- 3. Add opportunity_id column to estimates
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS opportunity_id integer REFERENCES opportunities(id);

-- 4. Backfill opportunity_id from clients.opportunity_id
UPDATE estimates e
SET opportunity_id = c.opportunity_id
FROM clients c
WHERE e.client_id = c.id
  AND c.opportunity_id IS NOT NULL
  AND e.opportunity_id IS NULL;
