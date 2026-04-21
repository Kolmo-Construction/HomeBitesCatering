-- Leftover-food-release & multi-doc acceptance support.
--
-- Adds:
--   acceptance_audit_log.accepted_docs        — JSON array of { docId, version, snapshot? }
--   acceptance_audit_log.leftover_release_signed_at — redundant with events, kept on
--                                                   the audit row for forensic clarity
--   events.leftover_release_signed_at          — day-of operational flag for the kitchen

ALTER TABLE acceptance_audit_log
  ADD COLUMN IF NOT EXISTS accepted_docs jsonb,
  ADD COLUMN IF NOT EXISTS leftover_release_signed_at timestamp;

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS leftover_release_signed_at timestamp;
