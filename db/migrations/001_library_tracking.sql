-- Knižnica: stav sledovania, súkromné hodnotenie a poznámka, vlastné kolekcie
-- a ručne označené pozreté epizódy. Len pridáva – existujúce dáta zostávajú.
-- Vlastníctvo riadkov kontrolujú API routes (WHERE user_id = prihlásený používateľ).
BEGIN;

ALTER TABLE watchlist
  ADD COLUMN IF NOT EXISTS watch_status text NOT NULL DEFAULT 'planned'
    CHECK (watch_status IN ('planned', 'watching', 'completed', 'paused', 'dropped')),
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS personal_rating smallint CHECK (personal_rating BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS personal_note text NOT NULL DEFAULT ''
    CHECK (char_length(personal_note) <= 2000);

-- completed_at sa nastaví pri prvom prechode na Completed a zmaže pri odchode z neho;
-- klient ho nemôže nastaviť ani spätne posunúť
CREATE OR REPLACE FUNCTION set_watch_completion() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.watch_status = 'completed' THEN
    IF TG_OP = 'INSERT' OR OLD.watch_status IS DISTINCT FROM 'completed' THEN
      NEW.completed_at := pg_catalog.clock_timestamp();
    ELSE
      NEW.completed_at := OLD.completed_at;
    END IF;
  ELSE
    NEW.completed_at := NULL;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS set_watch_completion ON watchlist;
CREATE TRIGGER set_watch_completion BEFORE INSERT OR UPDATE ON watchlist
  FOR EACH ROW EXECUTE FUNCTION set_watch_completion();

CREATE TABLE IF NOT EXISTS library_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (name = btrim(name) AND char_length(name) BETWEEN 1 AND 50),
  cover_watchlist_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS library_collections_owner_name ON library_collections (user_id, lower(name));

CREATE TABLE IF NOT EXISTS collection_items (
  collection_id uuid NOT NULL REFERENCES library_collections(id) ON DELETE CASCADE,
  watchlist_id uuid NOT NULL REFERENCES watchlist(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 1000000 CHECK (position BETWEEN 0 AND 1000000),
  PRIMARY KEY (watchlist_id, collection_id)
);
CREATE INDEX IF NOT EXISTS collection_items_position ON collection_items (collection_id, position, watchlist_id);
CREATE INDEX IF NOT EXISTS collection_items_owner ON collection_items (user_id);

-- Obálka kolekcie musí byť jej člen; odobratím člena sa obálka sama vynuluje
ALTER TABLE library_collections DROP CONSTRAINT IF EXISTS collection_cover_member;
ALTER TABLE library_collections ADD CONSTRAINT collection_cover_member
  FOREIGN KEY (cover_watchlist_id, id) REFERENCES collection_items (watchlist_id, collection_id)
  ON DELETE SET NULL (cover_watchlist_id);
CREATE INDEX IF NOT EXISTS library_collections_cover_member ON library_collections (cover_watchlist_id, id);

-- TV: skutočná séria (0 = špeciály), anime: séria 0 + číslo epizódy z AniListu
CREATE TABLE IF NOT EXISTS watched_episodes (
  watchlist_id uuid NOT NULL REFERENCES watchlist(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  season integer NOT NULL CHECK (season BETWEEN 0 AND 1000),
  episode integer NOT NULL CHECK (episode BETWEEN 1 AND 100000),
  watched_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (watchlist_id, season, episode)
);
CREATE INDEX IF NOT EXISTS watched_episodes_owner ON watched_episodes (user_id);

COMMIT;
