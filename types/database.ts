export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      user_settings: {
        Row: {
          id: string;
          user_id: string;
          theme: "dark" | "light" | "sepia";
          font_size: number;
          font_family: string;
          line_height: number;
          tts_engine: "native" | "elevenlabs";
          tts_voice: string;
          tts_speed: number;
          tts_pitch: number;
          elevenlabs_api_key: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          theme?: "dark" | "light" | "sepia";
          font_size?: number;
          font_family?: string;
          line_height?: number;
          tts_engine?: "native" | "elevenlabs";
          tts_voice?: string;
          tts_speed?: number;
          tts_pitch?: number;
          elevenlabs_api_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          theme?: "dark" | "light" | "sepia";
          font_size?: number;
          font_family?: string;
          line_height?: number;
          tts_engine?: "native" | "elevenlabs";
          tts_voice?: string;
          tts_speed?: number;
          tts_pitch?: number;
          elevenlabs_api_key?: string | null;
          updated_at?: string;
        };
      };
      books: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          author: string | null;
          cover_url: string | null;
          description: string | null;
          file_format: "epub" | "txt" | "pdf" | "html";
          file_path: string | null;
          storage_key: string | null;
          total_chapters: number;
          total_characters: number;
          tags: string[];
          series: string | null;
          series_index: number | null;
          is_downloaded: boolean;
          source_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          author?: string | null;
          cover_url?: string | null;
          description?: string | null;
          file_format: "epub" | "txt" | "pdf" | "html";
          file_path?: string | null;
          storage_key?: string | null;
          total_chapters?: number;
          total_characters?: number;
          tags?: string[];
          series?: string | null;
          series_index?: number | null;
          is_downloaded?: boolean;
          source_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          author?: string | null;
          cover_url?: string | null;
          description?: string | null;
          total_chapters?: number;
          total_characters?: number;
          tags?: string[];
          series?: string | null;
          series_index?: number | null;
          is_downloaded?: boolean;
          updated_at?: string;
        };
      };
      chapters: {
        Row: {
          id: string;
          book_id: string;
          user_id: string;
          chapter_index: number;
          title: string | null;
          content: string;
          character_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          book_id: string;
          user_id: string;
          chapter_index: number;
          title?: string | null;
          content: string;
          character_count?: number;
          created_at?: string;
        };
        Update: {
          title?: string | null;
          content?: string;
          character_count?: number;
        };
      };
      reading_progress: {
        Row: {
          id: string;
          user_id: string;
          book_id: string;
          chapter_index: number;
          scroll_position: number;
          character_position: number;
          last_read_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          book_id: string;
          chapter_index?: number;
          scroll_position?: number;
          character_position?: number;
          last_read_at?: string;
          created_at?: string;
        };
        Update: {
          chapter_index?: number;
          scroll_position?: number;
          character_position?: number;
          last_read_at?: string;
        };
      };
      bookmarks: {
        Row: {
          id: string;
          user_id: string;
          book_id: string;
          chapter_index: number;
          character_position: number;
          label: string | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          book_id: string;
          chapter_index: number;
          character_position: number;
          label?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          label?: string | null;
          note?: string | null;
        };
      };
      highlights: {
        Row: {
          id: string;
          user_id: string;
          book_id: string;
          chapter_index: number;
          start_position: number;
          end_position: number;
          selected_text: string;
          color: string;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          book_id: string;
          chapter_index: number;
          start_position: number;
          end_position: number;
          selected_text: string;
          color?: string;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          color?: string;
          note?: string | null;
        };
      };
      shelves: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string;
          icon: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          color?: string;
          icon?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          color?: string;
          icon?: string | null;
        };
      };
      shelf_books: {
        Row: {
          shelf_id: string;
          book_id: string;
          added_at: string;
        };
        Insert: {
          shelf_id: string;
          book_id: string;
          added_at?: string;
        };
        Update: Record<string, never>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
