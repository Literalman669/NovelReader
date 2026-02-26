import { create } from "zustand";
import { supabase } from "@/lib/supabase";

export type Theme = "dark" | "light" | "sepia";
export type TtsEngine = "native" | "elevenlabs";

export interface UserSettings {
  theme: Theme;
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  ttsEngine: TtsEngine;
  ttsVoice: string;
  ttsSpeed: number;
  ttsPitch: number;
  elevenLabsApiKey: string;
}

const DEFAULT_SETTINGS: UserSettings = {
  theme: "dark",
  fontSize: 18,
  fontFamily: "System",
  lineHeight: 1.6,
  ttsEngine: "native",
  ttsVoice: "",
  ttsSpeed: 1.0,
  ttsPitch: 1.0,
  elevenLabsApiKey: "",
};

interface SettingsState {
  settings: UserSettings;
  loaded: boolean;
  updateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
  loadSettings: (userId: string) => Promise<void>;
  saveSettings: (userId: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,

  updateSetting: (key, value) => {
    set((state) => ({
      settings: { ...state.settings, [key]: value },
    }));
  },

  loadSettings: async (userId: string) => {
    const { data } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (data) {
      set({
        settings: {
          theme: data.theme,
          fontSize: data.font_size,
          fontFamily: data.font_family,
          lineHeight: data.line_height,
          ttsEngine: data.tts_engine,
          ttsVoice: data.tts_voice,
          ttsSpeed: data.tts_speed,
          ttsPitch: data.tts_pitch,
          elevenLabsApiKey: data.elevenlabs_api_key ?? "",
        },
        loaded: true,
      });
    } else {
      set({ loaded: true });
    }
  },

  saveSettings: async (userId: string) => {
    const { settings } = get();
    await supabase.from("user_settings").upsert(
      {
        user_id: userId,
        theme: settings.theme,
        font_size: settings.fontSize,
        font_family: settings.fontFamily,
        line_height: settings.lineHeight,
        tts_engine: settings.ttsEngine,
        tts_voice: settings.ttsVoice,
        tts_speed: settings.ttsSpeed,
        tts_pitch: settings.ttsPitch,
        elevenlabs_api_key: settings.elevenLabsApiKey || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
  },
}));
