import { Platform } from "react-native";

export interface TtsOptions {
  rate?: number;
  pitch?: number;
  voice?: string;
  onDone?: () => void;
  onStopped?: () => void;
  onError?: (error: string) => void;
  onBoundary?: (event: { charIndex: number }) => void;
}

export const NativeTts = {
  speak: (text: string, options: TtsOptions = {}) => {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        const utt = new SpeechSynthesisUtterance(text);
        utt.rate = options.rate ?? 1.0;
        utt.pitch = options.pitch ?? 1.0;
        utt.onend = () => options.onDone?.();
        utt.onerror = (e) => options.onError?.(e.error);
        utt.onboundary = (e: SpeechSynthesisEvent) => {
          if (e.name === "word" && e.charIndex != null) {
            options.onBoundary?.({ charIndex: e.charIndex });
          }
        };
        window.speechSynthesis.speak(utt);
      } else {
        options.onDone?.();
      }
      return;
    }
    const Speech = require("expo-speech");
    Speech.speak(text, {
      rate: options.rate ?? 1.0,
      pitch: options.pitch ?? 1.0,
      voice: options.voice,
      onDone: options.onDone,
      onStopped: options.onStopped,
      onError: (err: any) => options.onError?.(err.message),
      onBoundary: options.onBoundary,
    });
  },

  stop: () => {
    if (Platform.OS === "web") { window.speechSynthesis?.cancel(); return; }
    require("expo-speech").stop();
  },

  pause: () => {
    if (Platform.OS === "web") { window.speechSynthesis?.pause(); return; }
    require("expo-speech").pause();
  },

  resume: () => {
    if (Platform.OS === "web") { window.speechSynthesis?.resume(); return; }
    require("expo-speech").resume();
  },

  isSpeaking: async () => {
    if (Platform.OS === "web") return window.speechSynthesis?.speaking ?? false;
    return require("expo-speech").isSpeakingAsync();
  },

  getVoices: async () => {
    if (Platform.OS === "web") {
      return (window.speechSynthesis?.getVoices() ?? []).map((v) => ({
        identifier: v.voiceURI, name: v.name, language: v.lang,
      }));
    }
    return require("expo-speech").getAvailableVoicesAsync();
  },
};

export const ElevenLabsTts = {
  speak: async (
    text: string,
    apiKey: string,
    voiceId = "21m00Tcm4TlvDq8ikWAM",
    options: TtsOptions = {}
  ): Promise<ArrayBuffer | null> => {
    if (!apiKey) return null;
    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
        {
          method: "POST",
          headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text,
            model_id: "eleven_monolingual_v1",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        }
      );
      if (!response.ok) {
        options.onError?.(`ElevenLabs error: ${response.status}`);
        return null;
      }
      return await response.arrayBuffer();
    } catch (e: unknown) {
      options.onError?.(String(e));
      return null;
    }
  },

  getVoices: async (apiKey: string) => {
    if (!apiKey) return [];
    const res = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: { "xi-api-key": apiKey },
    });
    const data = await res.json();
    return data.voices ?? [];
  },
};
