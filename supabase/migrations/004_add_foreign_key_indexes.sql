-- Add indexes on foreign key columns for better JOIN and CASCADE delete performance
-- See: https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys

-- bookmarks: book_id (idx_bookmarks_user_book covers user_id+book_id, but book_id alone needs its own index for CASCADE/fk lookups)
CREATE INDEX IF NOT EXISTS idx_bookmarks_book_id ON public.bookmarks(book_id);

-- chapters: user_id (idx_chapters_book_id exists; user_id needs index for RLS and FK lookups)
CREATE INDEX IF NOT EXISTS idx_chapters_user_id ON public.chapters(user_id);

-- highlights: book_id
CREATE INDEX IF NOT EXISTS idx_highlights_book_id ON public.highlights(book_id);

-- reading_progress: book_id (idx_reading_progress_user exists; book_id needs index for CASCADE)
CREATE INDEX IF NOT EXISTS idx_reading_progress_book_id ON public.reading_progress(book_id);

-- shelf_books: book_id (PK covers shelf_id; book_id needs index for CASCADE when deleting books)
CREATE INDEX IF NOT EXISTS idx_shelf_books_book_id ON public.shelf_books(book_id);

-- shelves: user_id
CREATE INDEX IF NOT EXISTS idx_shelves_user_id ON public.shelves(user_id);
