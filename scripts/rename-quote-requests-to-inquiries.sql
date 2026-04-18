-- Rename quote_requests -> inquiries across the whole schema.
-- Runs in a single transaction so failure leaves the DB untouched.
BEGIN;

-- Table
ALTER TABLE quote_requests RENAME TO inquiries;

-- Enum
ALTER TYPE quote_request_status RENAME TO inquiry_status;

-- Sequence
ALTER SEQUENCE quote_requests_id_seq RENAME TO inquiries_id_seq;

-- Primary key
ALTER INDEX quote_requests_pkey RENAME TO inquiries_pkey;

-- Secondary indexes
ALTER INDEX idx_quote_requests_status     RENAME TO idx_inquiries_status;
ALTER INDEX idx_quote_requests_email      RENAME TO idx_inquiries_email;
ALTER INDEX idx_quote_requests_event_date RENAME TO idx_inquiries_event_date;
ALTER INDEX idx_quote_requests_event_type RENAME TO idx_inquiries_event_type;
ALTER INDEX idx_quote_requests_created_at RENAME TO idx_inquiries_created_at;

-- FK constraints on inquiries (formerly quote_requests)
ALTER TABLE inquiries RENAME CONSTRAINT quote_requests_opportunity_id_fkey         TO inquiries_opportunity_id_fkey;
ALTER TABLE inquiries RENAME CONSTRAINT quote_requests_promo_code_id_fkey          TO inquiries_promo_code_id_fkey;
ALTER TABLE inquiries RENAME CONSTRAINT quote_requests_quote_id_fkey               TO inquiries_quote_id_fkey;
ALTER TABLE inquiries RENAME CONSTRAINT quote_requests_raw_lead_id_raw_leads_id_fk TO inquiries_raw_lead_id_raw_leads_id_fk;
ALTER TABLE inquiries RENAME CONSTRAINT quote_requests_venue_id_fkey               TO inquiries_venue_id_fkey;

COMMIT;
