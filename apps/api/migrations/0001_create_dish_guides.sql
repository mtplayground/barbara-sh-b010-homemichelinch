CREATE TABLE IF NOT EXISTS dish_guides (
  normalized_dish_name TEXT PRIMARY KEY,
  english_name TEXT NOT NULL,
  guide_payload JSONB NOT NULL,
  media_urls JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT dish_guides_normalized_name_not_blank CHECK (btrim(normalized_dish_name) <> ''),
  CONSTRAINT dish_guides_english_name_not_blank CHECK (btrim(english_name) <> ''),
  CONSTRAINT dish_guides_payload_is_object CHECK (jsonb_typeof(guide_payload) = 'object'),
  CONSTRAINT dish_guides_media_urls_is_object CHECK (jsonb_typeof(media_urls) = 'object')
);

CREATE INDEX IF NOT EXISTS dish_guides_english_name_idx
  ON dish_guides (english_name);

CREATE OR REPLACE FUNCTION set_dish_guides_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS dish_guides_set_updated_at ON dish_guides;

CREATE TRIGGER dish_guides_set_updated_at
BEFORE UPDATE ON dish_guides
FOR EACH ROW
EXECUTE FUNCTION set_dish_guides_updated_at();

COMMENT ON TABLE dish_guides IS
  'Cache of generated dish guide payloads keyed by normalized dish name.';

COMMENT ON COLUMN dish_guides.media_urls IS
  'JSON object of media references. Private object storage media should store object keys and be signed at read time.';
