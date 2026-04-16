-- Tier 4: Convert text status columns to proper pgEnum types

DO $$ BEGIN CREATE TYPE opportunity_status AS ENUM ('new', 'contacted', 'qualified', 'proposal', 'booked', 'archived'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE estimate_status AS ENUM ('draft', 'sent', 'viewed', 'accepted', 'declined'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE event_status AS ENUM ('confirmed', 'in_progress', 'completed', 'cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Fix invalid opportunity statuses
UPDATE opportunities SET status = 'proposal' WHERE status = 'negotiation';
UPDATE opportunities SET status = 'booked' WHERE status = 'won';
UPDATE opportunities SET status = 'archived' WHERE status = 'lost';
UPDATE opportunities SET status = 'new' WHERE status NOT IN ('new', 'contacted', 'qualified', 'proposal', 'booked', 'archived');

-- Fix event statuses (hyphen → underscore)
UPDATE events SET status = 'in_progress' WHERE status = 'in-progress';
UPDATE events SET status = 'confirmed' WHERE status NOT IN ('confirmed', 'in_progress', 'completed', 'cancelled');

-- Fix estimate statuses
UPDATE estimates SET status = 'draft' WHERE status NOT IN ('draft', 'sent', 'viewed', 'accepted', 'declined');

-- Convert opportunities.status
ALTER TABLE opportunities ALTER COLUMN status DROP DEFAULT;
ALTER TABLE opportunities ALTER COLUMN status TYPE opportunity_status USING status::opportunity_status;
ALTER TABLE opportunities ALTER COLUMN status SET DEFAULT 'new';

-- Convert estimates.status
ALTER TABLE estimates ALTER COLUMN status DROP DEFAULT;
ALTER TABLE estimates ALTER COLUMN status TYPE estimate_status USING status::estimate_status;
ALTER TABLE estimates ALTER COLUMN status SET DEFAULT 'draft';

-- Convert events.status
ALTER TABLE events ALTER COLUMN status DROP DEFAULT;
ALTER TABLE events ALTER COLUMN status TYPE event_status USING status::event_status;
ALTER TABLE events ALTER COLUMN status SET DEFAULT 'confirmed';
