import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { Database } from "@/types/database";

type Bookmark = Database["public"]["Tables"]["bookmarks"]["Row"];
type Highlight = Database["public"]["Tables"]["highlights"]["Row"];
type Chapter = Database["public"]["Tables"]["chapters"]["Row"];

interface ReaderState {
  currentBookId: string | null;
  currentChapterIndex: number;
  chapters: Chapter[];
  bookmarks: Bookmark[];
  highlights: Highlight[];
  isTtsPlaying: boolean;
  ttsPosition: number;
  sleepTimerMinutes: number;
  sleepTimerActive: boolean;
  setCurrentBook: (bookId: string, chapterIndex?: number) => void;
  setChapterIndex: (index: number) => void;
  setChapters: (chapters: Chapter[]) => void;
  setTtsPlaying: (playing: boolean) => void;
  setTtsPosition: (pos: number) => void;
  setSleepTimer: (minutes: number) => void;
  fetchBookmarks: (userId: string, bookId: string) => Promise<void>;
  fetchHighlights: (userId: string, bookId: string) => Promise<void>;
  addBookmark: (bookmark: Database["public"]["Tables"]["bookmarks"]["Insert"]) => Promise<void>;
  removeBookmark: (id: string) => Promise<void>;
  addHighlight: (highlight: Database["public"]["Tables"]["highlights"]["Insert"]) => Promise<void>;
  removeHighlight: (id: string) => Promise<void>;
}

export const useReaderStore = create<ReaderState>((set) => ({
  currentBookId: null,
  currentChapterIndex: 0,
  chapters: [],
  bookmarks: [],
  highlights: [],
  isTtsPlaying: false,
  ttsPosition: 0,
  sleepTimerMinutes: 0,
  sleepTimerActive: false,

  setCurrentBook: (bookId, chapterIndex = 0) =>
    set({ currentBookId: bookId, currentChapterIndex: chapterIndex }),

  setChapterIndex: (index) => set({ currentChapterIndex: index }),

  setChapters: (chapters) => set({ chapters }),

  setTtsPlaying: (playing) => set({ isTtsPlaying: playing }),

  setTtsPosition: (pos) => set({ ttsPosition: pos }),

  setSleepTimer: (minutes) =>
    set({ sleepTimerMinutes: minutes, sleepTimerActive: minutes > 0 }),

  fetchBookmarks: async (userId: string, bookId: string) => {
    const { data } = await supabase
      .from("bookmarks")
      .select("*")
      .eq("user_id", userId)
      .eq("book_id", bookId)
      .order("created_at", { ascending: false });
    set({ bookmarks: data ?? [] });
  },

  fetchHighlights: async (userId: string, bookId: string) => {
    const { data } = await supabase
      .from("highlights")
      .select("*")
      .eq("user_id", userId)
      .eq("book_id", bookId);
    set({ highlights: data ?? [] });
  },

  addBookmark: async (bookmark) => {
    const { data } = await supabase
      .from("bookmarks")
      .insert(bookmark)
      .select()
      .single();
    if (data) set((state) => ({ bookmarks: [data, ...state.bookmarks] }));
  },

  removeBookmark: async (id: string) => {
    await supabase.from("bookmarks").delete().eq("id", id);
    set((state) => ({ bookmarks: state.bookmarks.filter((b) => b.id !== id) }));
  },

  addHighlight: async (highlight) => {
    const { data } = await supabase
      .from("highlights")
      .insert(highlight)
      .select()
      .single();
    if (data) set((state) => ({ highlights: [data, ...state.highlights] }));
  },

  removeHighlight: async (id: string) => {
    await supabase.from("highlights").delete().eq("id", id);
    set((state) => ({
      highlights: state.highlights.filter((h) => h.id !== id),
    }));
  },
}));
