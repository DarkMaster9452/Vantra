-- Základná schéma Vantry na Neon Postgres (stav pred migráciami v db/migrations).
-- Slúži ako referencia pre nové prostredie; na existujúcej databáze ju nespúšťaj.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  pin_hash text,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tmdb_id integer NOT NULL,
  media_type text NOT NULL,
  title text NOT NULL,
  poster_path text,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tmdb_id, media_type)
);

CREATE TABLE watch_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tmdb_id integer NOT NULL,
  media_type text NOT NULL,
  title text NOT NULL,
  poster_path text,
  season integer,
  episode integer,
  last_watched timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tmdb_id, media_type)
);
