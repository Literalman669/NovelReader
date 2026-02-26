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
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const utt = new SpeechSynthesisUtterance(text);
      utt.rate = options.rate ?? 1.0;
      utt.pitch = options.pitch ?? 1.0;
      utt.onend = () => options.onDone?.();
      utt.onerror = (e) => options.onError?.(e.error);
      window.speechSynthesis.speak(utt);
    } else {
      options.onDone?.();
    }
  },
  stop: () => { if (typeof window !== "undefined") window.speechSynthesis?.cancel(); },
  pause: () => { if (typeof window !== "undefined") window.speechSynthesis?.pause(); },
  resume: () => { if (typeof window !== "undefined") window.speechSynthesis?.resume(); },
  isSpeaking: async () => typeof window !== "undefined" ? window.speechSynthesis?.speaking ?? false : false,
  getVoices: async () => {
    if (typeof window === "undefined") return [];
    return window.speechSynthesis.getVoices().map((v) => ({
      identifier: v.voiceURI,
      name: v.name,
      language: v.lang,
    }));
  },
};

export const ElevenLabsTts = {
  speak: async (text: string, apiKey: string, voiceId = "21m00Tcm4TlvDq8ikWAM", options: TtsOptions = {}) => {
    if (!apiKey) return null;
    try {
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
        method: "POST",
        headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ text, model_id: "eleven_monolingual_v1", voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
      });
      if (!res.ok) { options.onError?.(`ElevenLabs error: ${res.status}`); return null; }
      return await res.arrayBuffer();
    } catch (e) { options.onError?.(String(e)); return null; }
  },
  getVoices: async (apiKey: string) => {
    if (!apiKey) return [];
    const res = await fetch("https://api.elevenlabs.io/v1/voices", { headers: { "xi-api-key": apiKey } });
    const data = await res.json();
    return data.voices ?? [];
  },
};
