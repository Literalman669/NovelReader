import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { Database } from "@/types/database";

type Book = Database["public"]["Tables"]["books"]["Row"];
type ReadingProgress = Database["public"]["Tables"]["reading_progress"]["Row"];

interface LibraryState {
  books: Book[];
  progress: Record<string, ReadingProgress>;
  loading: boolean;
  fetchBooks: (userId: string) => Promise<void>;
  fetchProgress: (userId: string) => Promise<void>;
  fetchBook: (bookId: string) => Promise<Book | null>;
  addBook: (book: Database["public"]["Tables"]["books"]["Insert"]) => Promise<Book | null>;
  removeBook: (bookId: string) => Promise<void>;
  updateProgress: (
    userId: string,
    bookId: string,
    chapterIndexOrUpdates:
      | number
      | Partial<{ chapter_index: number; scroll_position: number; character_position: number }>,
    scrollPosition?: number,
    charPosition?: number
  ) => Promise<void>;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  books: [],
  progress: {},
  loading: false,

  fetchBooks: async (userId: string) => {
    set({ loading: true });
    const { data } = await supabase
      .from("books")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    set({ books: data ?? [], loading: false });
  },

  fetchProgress: async (userId: string) => {
    const { data } = await supabase
      .from("reading_progress")
      .select("*")
      .eq("user_id", userId);
    const progressMap: Record<string, ReadingProgress> = {};
    (data ?? []).forEach((p) => {
      progressMap[p.book_id] = p;
    });
    set({ progress: progressMap });
  },

  fetchBook: async (bookId: string) => {
    const existing = get().books.find((b) => b.id === bookId);
    if (existing) return existing;
    const { data } = await supabase.from("books").select("*").eq("id", bookId).maybeSingle();
    if (data) {
      set((state) => {
        if (state.books.some((b) => b.id === bookId)) return state;
        return { books: [data, ...state.books] };
      });
      return data;
    }
    return null;
  },

  addBook: async (book) => {
    const { data, error } = await supabase
      .from("books")
      .insert(book)
      .select()
      .single();
    if (error || !data) return null;
    set((state) => ({ books: [data, ...state.books] }));
    return data;
  },

  removeBook: async (bookId: string) => {
    await supabase.from("books").delete().eq("id", bookId);
    set((state) => ({
      books: state.books.filter((b) => b.id !== bookId),
    }));
  },

  updateProgress: async (userId, bookId, chapterIndexOrUpdates, scrollPosition?, charPosition?) => {
    const now = new Date().toISOString();
    const existing = get().progress[bookId];
    let chapter_index: number;
    let scroll_position: number;
    let character_position: number;

    if (typeof chapterIndexOrUpdates === "object") {
      const updates = chapterIndexOrUpdates;
      chapter_index = updates.chapter_index ?? existing?.chapter_index ?? 0;
      scroll_position = updates.scroll_position ?? existing?.scroll_position ?? 0;
      character_position = updates.character_position ?? existing?.character_position ?? 0;
    } else {
      chapter_index = chapterIndexOrUpdates;
      scroll_position = scrollPosition ?? 0;
      character_position = charPosition ?? 0;
    }

    await supabase.from("reading_progress").upsert(
      {
        user_id: userId,
        book_id: bookId,
        chapter_index,
        scroll_position,
        character_position,
        last_read_at: now,
      },
      { onConflict: "user_id,book_id" }
    );
    set((state) => ({
      progress: {
        ...state.progress,
        [bookId]: {
          ...state.progress[bookId],
          chapter_index,
          scroll_position,
          character_position,
          last_read_at: now,
        } as ReadingProgress,
      },
    }));
  },
}));
