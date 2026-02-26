-- Fix: Auth RLS InitPlan (Performance Advisor 0003)
-- Wrap auth.uid() in (select auth.uid()) so it's evaluated once per query, not per row
-- See: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- profiles
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING ((select auth.uid()) = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((select auth.uid()) = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK ((select auth.uid()) = id);

-- user_settings
DROP POLICY IF EXISTS "Users can manage own settings" ON public.user_settings;
CREATE POLICY "Users can manage own settings" ON public.user_settings
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

-- books
DROP POLICY IF EXISTS "Users can manage own books" ON public.books;
CREATE POLICY "Users can manage own books" ON public.books
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

-- chapters
DROP POLICY IF EXISTS "Users can manage own chapters" ON public.chapters;
CREATE POLICY "Users can manage own chapters" ON public.chapters
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

-- reading_progress
DROP POLICY IF EXISTS "Users can manage own progress" ON public.reading_progress;
CREATE POLICY "Users can manage own progress" ON public.reading_progress
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

-- bookmarks
DROP POLICY IF EXISTS "Users can manage own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can manage own bookmarks" ON public.bookmarks
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

-- highlights
DROP POLICY IF EXISTS "Users can manage own highlights" ON public.highlights;
CREATE POLICY "Users can manage own highlights" ON public.highlights
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

-- shelves
DROP POLICY IF EXISTS "Users can manage own shelves" ON public.shelves;
CREATE POLICY "Users can manage own shelves" ON public.shelves
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

-- shelf_books
DROP POLICY IF EXISTS "Users can manage own shelf books" ON public.shelf_books;
CREATE POLICY "Users can manage own shelf books" ON public.shelf_books
  USING (
    EXISTS (SELECT 1 FROM public.shelves s WHERE s.id = shelf_id AND s.user_id = (select auth.uid()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.shelves s WHERE s.id = shelf_id AND s.user_id = (select auth.uid()))
  );
