-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================================
-- USER SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark', 'light', 'sepia')),
  font_size INTEGER NOT NULL DEFAULT 18,
  font_family TEXT NOT NULL DEFAULT 'System',
  line_height NUMERIC NOT NULL DEFAULT 1.6,
  tts_engine TEXT NOT NULL DEFAULT 'native' CHECK (tts_engine IN ('native', 'elevenlabs')),
  tts_voice TEXT NOT NULL DEFAULT '',
  tts_speed NUMERIC NOT NULL DEFAULT 1.0,
  tts_pitch NUMERIC NOT NULL DEFAULT 1.0,
  elevenlabs_api_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own settings" ON public.user_settings
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- BOOKS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.books (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  author TEXT,
  cover_url TEXT,
  description TEXT,
  file_format TEXT NOT NULL CHECK (file_format IN ('epub', 'txt', 'pdf', 'html')),
  file_path TEXT,
  storage_key TEXT,
  total_chapters INTEGER NOT NULL DEFAULT 0,
  total_characters INTEGER NOT NULL DEFAULT 0,
  tags TEXT[] NOT NULL DEFAULT '{}',
  series TEXT,
  series_index INTEGER,
  is_downloaded BOOLEAN NOT NULL DEFAULT false,
  source_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_books_user_id ON public.books(user_id);
CREATE INDEX idx_books_updated_at ON public.books(updated_at DESC);

ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own books" ON public.books
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- CHAPTERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chapters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chapter_index INTEGER NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  character_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (book_id, chapter_index)
);

CREATE INDEX idx_chapters_book_id ON public.chapters(book_id);

ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own chapters" ON public.chapters
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- READING PROGRESS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reading_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  chapter_index INTEGER NOT NULL DEFAULT 0,
  scroll_position NUMERIC NOT NULL DEFAULT 0,
  character_position INTEGER NOT NULL DEFAULT 0,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, book_id)
);

CREATE INDEX idx_reading_progress_user ON public.reading_progress(user_id);

ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own progress" ON public.reading_progress
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- BOOKMARKS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  chapter_index INTEGER NOT NULL,
  character_position INTEGER NOT NULL DEFAULT 0,
  label TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bookmarks_user_book ON public.bookmarks(user_id, book_id);

ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own bookmarks" ON public.bookmarks
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- HIGHLIGHTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.highlights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  chapter_index INTEGER NOT NULL,
  start_position INTEGER NOT NULL,
  end_position INTEGER NOT NULL,
  selected_text TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#fbbf24',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_highlights_user_book ON public.highlights(user_id, book_id);

ALTER TABLE public.highlights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own highlights" ON public.highlights
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- SHELVES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.shelves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.shelves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own shelves" ON public.shelves
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- SHELF BOOKS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.shelf_books (
  shelf_id UUID NOT NULL REFERENCES public.shelves(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (shelf_id, book_id)
);

ALTER TABLE public.shelf_books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own shelf books" ON public.shelf_books
  USING (
    EXISTS (SELECT 1 FROM public.shelves s WHERE s.id = shelf_id AND s.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.shelves s WHERE s.id = shelf_id AND s.user_id = auth.uid())
  );

-- ============================================================
-- AUTO-UPDATE updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_books_updated_at BEFORE UPDATE ON public.books
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
