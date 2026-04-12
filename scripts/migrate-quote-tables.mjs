import pg from 'pg';
const { Client } = pg;

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const sql = `
-- Create enums
DO $$ BEGIN
  CREATE TYPE quote_request_status AS ENUM ('draft', 'submitted', 'reviewing', 'quoted', 'converted', 'expired', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE service_type AS ENUM ('buffet', 'plated', 'family_style', 'cocktail_party', 'breakfast_brunch', 'sandwich', 'food_truck', 'kids_party');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE service_style AS ENUM ('drop_off', 'standard', 'full_service_no_setup', 'full_service');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Venues table
CREATE TABLE IF NOT EXISTS venues (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  has_kitchen BOOLEAN,
  has_electricity BOOLEAN DEFAULT TRUE,
  has_water BOOLEAN DEFAULT TRUE,
  capacity INTEGER,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Promo codes table
CREATE TABLE IF NOT EXISTS promo_codes (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_percent NUMERIC(5, 2) NOT NULL,
  description TEXT,
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0,
  valid_from TIMESTAMP,
  valid_until TIMESTAMP,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Quote requests table
CREATE TABLE IF NOT EXISTS quote_requests (
  id SERIAL PRIMARY KEY,

  -- Status & Workflow
  status quote_request_status NOT NULL DEFAULT 'draft',

  -- Source & Attribution
  source TEXT,
  referral_detail TEXT,
  promo_code_id INTEGER REFERENCES promo_codes(id),
  discount_percent NUMERIC(5, 2),
  decision_timeline TEXT,

  -- Contact Info
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  partner_first_name TEXT,
  partner_last_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  company_name TEXT,
  billing_address JSONB,

  -- Event Details
  event_type TEXT NOT NULL,
  event_date TIMESTAMP,
  event_start_time TEXT,
  event_end_time TEXT,
  guest_count INTEGER NOT NULL,

  -- Venue
  venue_id INTEGER REFERENCES venues(id),
  venue_name TEXT,
  venue_address JSONB,
  venue_has_kitchen BOOLEAN,
  venue_contact_name TEXT,
  venue_contact_phone TEXT,

  -- Ceremony (weddings)
  has_ceremony BOOLEAN DEFAULT FALSE,
  ceremony_same_space BOOLEAN,
  ceremony_start_time TEXT,
  ceremony_end_time TEXT,

  -- Service Configuration
  service_type service_type,
  service_style service_style,

  -- Meal Timing
  has_cocktail_hour BOOLEAN DEFAULT FALSE,
  cocktail_start_time TEXT,
  cocktail_end_time TEXT,
  has_main_meal BOOLEAN DEFAULT TRUE,
  main_meal_start_time TEXT,
  main_meal_end_time TEXT,

  -- Menu Selections
  menu_theme TEXT,
  menu_tier TEXT,
  menu_selections JSONB DEFAULT '[]',

  -- Complex selections
  appetizers JSONB,
  desserts JSONB,
  beverages JSONB,
  equipment JSONB,
  dietary JSONB,

  -- Pricing (cents)
  estimated_per_person_cents INTEGER,
  estimated_subtotal_cents INTEGER,
  estimated_service_fee_cents INTEGER,
  estimated_tax_cents INTEGER,
  estimated_total_cents INTEGER,

  -- Referral needs
  referral_needs JSONB,

  -- Notes
  special_requests TEXT,
  internal_notes TEXT,

  -- AI Analysis
  ai_analysis JSONB,

  -- Links
  opportunity_id INTEGER REFERENCES opportunities(id),
  estimate_id INTEGER REFERENCES estimates(id),

  -- Timestamps
  submitted_at TIMESTAMP,
  converted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_quote_requests_status ON quote_requests(status);
CREATE INDEX IF NOT EXISTS idx_quote_requests_email ON quote_requests(email);
CREATE INDEX IF NOT EXISTS idx_quote_requests_event_date ON quote_requests(event_date);
CREATE INDEX IF NOT EXISTS idx_quote_requests_event_type ON quote_requests(event_type);
CREATE INDEX IF NOT EXISTS idx_quote_requests_created_at ON quote_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_venues_is_active ON venues(is_active);
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
`;

try {
  await client.query(sql);
  console.log('✓ All tables and indexes created successfully');

  // Verify
  const { rows } = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name IN ('venues', 'promo_codes', 'quote_requests')
    ORDER BY table_name
  `);
  console.log('✓ Verified tables:', rows.map(r => r.table_name).join(', '));
} catch (err) {
  console.error('Migration failed:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
