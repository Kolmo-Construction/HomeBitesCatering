-- Kitchen chat agent v2: persistent threads + long-term chef memory.
-- Apply via `npm run db:push` (preferred — it diffs from shared/schema.ts)
-- or run this file directly against the database.

DO $$ BEGIN
  CREATE TYPE chat_message_role AS ENUM ('user', 'assistant', 'tool', 'system');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role chat_message_role NOT NULL,
  content TEXT NOT NULL,
  tool_payload JSONB,
  page_path TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chat_messages_user_idx
  ON chat_messages (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS chef_memory (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  fact TEXT NOT NULL,
  ref JSONB,
  last_used_at TIMESTAMP NOT NULL DEFAULT NOW(),
  use_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chef_memory_user_topic_idx
  ON chef_memory (user_id, topic);

CREATE INDEX IF NOT EXISTS chef_memory_user_recent_idx
  ON chef_memory (user_id, last_used_at DESC);
