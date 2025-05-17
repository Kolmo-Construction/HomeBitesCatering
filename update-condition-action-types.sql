-- First, let's update the enum types to match our schema validation
ALTER TYPE action_type RENAME TO action_type_old;
CREATE TYPE action_type AS ENUM ('show_question', 'hide_question', 'require_question', 'unrequire_question', 'skip_to_page', 'enable_option', 'disable_option');

-- Then update the schema validation to match
-- (We'll need to update the code for this as well)