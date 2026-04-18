-- Rename estimates -> quotes across the whole schema.
-- Runs in a single transaction so failure leaves the DB untouched.
BEGIN;

-- Tables
ALTER TABLE estimates RENAME TO quotes;
ALTER TABLE estimate_versions RENAME TO quote_versions;

-- Enum
ALTER TYPE estimate_status RENAME TO quote_status;

-- Sequences
ALTER SEQUENCE estimates_id_seq RENAME TO quotes_id_seq;
ALTER SEQUENCE estimate_versions_id_seq RENAME TO quote_versions_id_seq;

-- Primary keys
ALTER INDEX estimates_pkey RENAME TO quotes_pkey;
ALTER INDEX estimate_versions_pkey RENAME TO quote_versions_pkey;

-- Unique indexes on quotes (formerly estimates)
ALTER INDEX estimates_view_token_unique RENAME TO quotes_view_token_unique;
ALTER INDEX estimates_decline_feedback_token_unique RENAME TO quotes_decline_feedback_token_unique;

-- FK columns: estimate_id -> quote_id on every referencing table
ALTER TABLE quote_versions RENAME COLUMN estimate_id TO quote_id;
ALTER TABLE contracts       RENAME COLUMN estimate_id TO quote_id;
ALTER TABLE events          RENAME COLUMN estimate_id TO quote_id;
ALTER TABLE follow_up_drafts RENAME COLUMN estimate_id TO quote_id;
ALTER TABLE quote_requests  RENAME COLUMN estimate_id TO quote_id;
ALTER TABLE tastings        RENAME COLUMN estimate_id TO quote_id;

-- FK constraint names (Postgres does not rename these with the column)
-- FK constraints (unique constraints were renamed alongside their indexes above)
ALTER TABLE quotes RENAME CONSTRAINT estimates_client_id_clients_id_fk TO quotes_client_id_clients_id_fk;
ALTER TABLE quotes RENAME CONSTRAINT estimates_created_by_users_id_fk  TO quotes_created_by_users_id_fk;
ALTER TABLE quotes RENAME CONSTRAINT estimates_menu_id_menus_id_fk     TO quotes_menu_id_menus_id_fk;
ALTER TABLE quotes RENAME CONSTRAINT estimates_opportunity_id_fkey     TO quotes_opportunity_id_fkey;

ALTER TABLE quote_versions RENAME CONSTRAINT estimate_versions_changed_by_fkey TO quote_versions_changed_by_fkey;
ALTER TABLE quote_versions RENAME CONSTRAINT estimate_versions_estimate_id_fkey TO quote_versions_quote_id_fkey;

ALTER TABLE contracts       RENAME CONSTRAINT contracts_estimate_id_fkey        TO contracts_quote_id_fkey;
ALTER TABLE events          RENAME CONSTRAINT events_estimate_id_estimates_id_fk TO events_quote_id_quotes_id_fk;
ALTER TABLE follow_up_drafts RENAME CONSTRAINT follow_up_drafts_estimate_id_fkey TO follow_up_drafts_quote_id_fkey;
ALTER TABLE quote_requests  RENAME CONSTRAINT quote_requests_estimate_id_fkey   TO quote_requests_quote_id_fkey;
ALTER TABLE tastings        RENAME CONSTRAINT tastings_estimate_id_fkey         TO tastings_quote_id_fkey;

-- Non-unique indexes
ALTER INDEX contracts_estimate_id_idx RENAME TO contracts_quote_id_idx;

COMMIT;
