-- Tables étude biblique
-- À exécuter dans Supabase → SQL Editor

CREATE TABLE IF NOT EXISTS bible_notes (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  verse_ref   text NOT NULL,  -- ex: "JHN.3.16"
  verse_text  text,
  note        text NOT NULL,
  color       text DEFAULT 'yellow',
  bible_id    text,
  created_at  timestamptz DEFAULT now() NOT NULL,
  updated_at  timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, verse_ref)
);

ALTER TABLE bible_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_manage_own_notes" ON bible_notes
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS bible_bookmarks (
  id        uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id   uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  verse_ref text NOT NULL,
  label     text,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, verse_ref)
);

ALTER TABLE bible_bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_manage_own_bookmarks" ON bible_bookmarks
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Lecture progress (last chapter read)
CREATE TABLE IF NOT EXISTS bible_progress (
  user_id    uuid REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  bible_id   text NOT NULL,
  chapter_id text NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE bible_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_manage_own_progress" ON bible_progress
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
