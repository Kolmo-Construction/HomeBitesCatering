-- Tier 4: Soft delete + Audit trail

-- Add deletedAt to core tables
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS deleted_at timestamp;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS deleted_at timestamp;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS deleted_at timestamp;
ALTER TABLE events ADD COLUMN IF NOT EXISTS deleted_at timestamp;

-- Audit log
DO $$ BEGIN CREATE TYPE audit_log_action AS ENUM ('created', 'updated', 'deleted', 'restored', 'merged'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS audit_log (
  id serial PRIMARY KEY,
  entity_type text NOT NULL,
  entity_id integer NOT NULL,
  action audit_log_action NOT NULL,
  user_id integer REFERENCES users(id),
  changes jsonb,
  metadata jsonb,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
