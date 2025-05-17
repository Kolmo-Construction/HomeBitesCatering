-- Migration script for flexible questionnaire architecture

-- Create enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_type') THEN
    CREATE TYPE event_type AS ENUM (
      'corporate', 
      'wedding', 
      'engagement', 
      'birthday', 
      'private_party',
      'food_truck'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'condition_type') THEN
    CREATE TYPE condition_type AS ENUM (
      'equals', 
      'not_equals', 
      'contains', 
      'greater_than',
      'less_than',
      'in_list',
      'not_in_list',
      'is_empty',
      'is_not_empty',
      'custom'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'action_type') THEN
    CREATE TYPE action_type AS ENUM (
      'show', 
      'hide', 
      'require', 
      'skip_to',
      'set_value',
      'custom'
    );
  END IF;
END
$$;

-- Create tables
CREATE TABLE IF NOT EXISTS questionnaire_component_types (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  validation_schema JSONB,
  ui_schema JSONB,
  data_schema JSONB,
  is_custom BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS questionnaire_definitions (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  version_name TEXT NOT NULL,
  event_type event_type NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  is_published BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS questionnaire_pages (
  id SERIAL PRIMARY KEY,
  definition_id INTEGER NOT NULL REFERENCES questionnaire_definitions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  "order" INTEGER NOT NULL,
  is_conditional BOOLEAN DEFAULT FALSE,
  condition_logic JSONB,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS questionnaire_sections (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  template_key TEXT NOT NULL UNIQUE,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS questionnaire_page_sections (
  id SERIAL PRIMARY KEY,
  page_id INTEGER NOT NULL REFERENCES questionnaire_pages(id) ON DELETE CASCADE,
  section_id INTEGER NOT NULL REFERENCES questionnaire_sections(id) ON DELETE CASCADE,
  section_order INTEGER NOT NULL,
  is_conditional BOOLEAN DEFAULT FALSE,
  condition_logic JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(page_id, section_id)
);

CREATE TABLE IF NOT EXISTS questionnaire_questions (
  id SERIAL PRIMARY KEY,
  component_type_id INTEGER REFERENCES questionnaire_component_types(id),
  question_text TEXT NOT NULL,
  help_text TEXT,
  placeholder_text TEXT,
  is_required BOOLEAN DEFAULT FALSE,
  validation_rules JSONB,
  default_value JSONB,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS questionnaire_question_options (
  id SERIAL PRIMARY KEY,
  question_id INTEGER NOT NULL REFERENCES questionnaire_questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  option_value TEXT,
  "order" INTEGER NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS questionnaire_section_questions (
  id SERIAL PRIMARY KEY,
  section_id INTEGER NOT NULL REFERENCES questionnaire_sections(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES questionnaire_questions(id) ON DELETE CASCADE,
  question_order INTEGER NOT NULL,
  is_conditional BOOLEAN DEFAULT FALSE,
  condition_logic JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(section_id, question_id)
);

CREATE TABLE IF NOT EXISTS questionnaire_conditional_logic (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  target_type TEXT NOT NULL,
  target_id INTEGER NOT NULL,
  condition_type condition_type NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT,
  condition_value JSONB,
  action_type action_type NOT NULL,
  action_value JSONB,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS questionnaire_responses (
  id SERIAL PRIMARY KEY,
  definition_id INTEGER NOT NULL REFERENCES questionnaire_definitions(id) ON DELETE CASCADE,
  user_id INTEGER,
  response_data JSONB NOT NULL,
  metadata JSONB,
  submitted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Insert default component types
INSERT INTO questionnaire_component_types (name, description, is_custom)
VALUES 
  ('text', 'Single line text input', FALSE),
  ('textarea', 'Multiline text input', FALSE),
  ('number', 'Numeric input', FALSE),
  ('email', 'Email address input', FALSE),
  ('phone', 'Phone number input', FALSE),
  ('date', 'Date picker', FALSE),
  ('time', 'Time picker', FALSE),
  ('select', 'Dropdown select', FALSE),
  ('multiselect', 'Multiple selection dropdown', FALSE),
  ('checkbox', 'Single checkbox', FALSE),
  ('checkbox_group', 'Group of checkboxes', FALSE),
  ('radio_group', 'Radio button group', FALSE),
  ('file_upload', 'File upload field', FALSE),
  ('signature_pad', 'Digital signature input', TRUE),
  ('address', 'Address input with components', FALSE)
ON CONFLICT (name) DO NOTHING;