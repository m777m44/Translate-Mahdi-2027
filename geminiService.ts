
import { decode, decodeAudioData } from "./utils/audio.ts";
import { TtsSettings, AIAnalysisResult, MultiEngineComparison, MoreTranslation, WordDefinition } from "./types.ts";
import { LANG_BCP47_MAP } from "./constants.ts";

export interface TranslateOptions {
  domain?: string;
  tone?: string;
  dialect?: string;
  includeAnalysis?: boolean;
  /** 'fast' | 'balanced' | 'ultra-accurate' — controls how much reasoning the model does. */
  accuracy?: string;
  /** Preferred engine style. */
  engine?: string;
  preserveFormatting?: boolean;
  translateNumbers?: boolean;
}

export interface TranslateResult {
  translation: string;
  transliteration?: string;
  detectedLanguageName?: string;
  moreTranslations?: MoreTranslation[];
  definitions?: WordDefinition[];
  analysis?: AIAnalysisResult | null;
}

/**
 * Translates text via the secure server-side Gemini API with domain, tone, and analysis support
 */
export const translateText = async (
  text: string, 
  from: string, 
  to: string,
  options: TranslateOptions = {}
): Promise<TranslateResult> => {
  if (!text || !text.trim()) return { translation: "" };

  const response = await fetch("/api/translate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: text.trim(),
      from,
      to,
      domain: options.domain,
      tone: options.tone,
      dialect: options.dialect,
      includeAnalysis: options.includeAnalysis,
      accuracy: options.accuracy,
      engine: options.engine,
      preserveFormatting: options.preserveFormatting,
      translateNumbers: options.translateNumbers,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Translation request failed with status ${response.status}`);
  }

  const data = await response.json();
  return {
    translation: data.translation || "",
    transliteration: data.transliteration || "",
    detectedLanguageName: data.detectedLanguageName || "",
    moreTranslations: Array.isArray(data.moreTranslations) ? data.moreTranslations : [],
    definitions: Array.isArray(data.definitions) ? data.definitions : [],
    analysis: data.analysis || null,
  };
};

/**
 * Compares translations across multiple engines (Mahdi Neural, DeepL Style, Standard MT)
 */
export const compareEngines = async (
  text: string,
  from: string,
  to: string
): Promise<MultiEngineComparison> => {
  if (!text || !text.trim()) {
    return { mahdiNeural: "", deepLStyle: "", standardMt: "" };
  }

  const response = await fetch("/api/compare", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: text.trim(),
      from,
      to,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to compare translation engines");
  }

  return await response.json();
};


/**
 * Translates text extracted from an image via the secure server-side Gemini API
 */
export const translateImage = async (base64Data: string, targetLang: string): Promise<string> => {
  if (!base64Data) return "";

  const response = await fetch("/api/translate-image", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      base64Data,
      targetLang,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Image translation request failed with status ${response.status}`);
  }

  const data = await response.json();
  return data.translation || "";
};

// Client-side in-memory audio cache for zero-latency audio replay
const clientAudioCache = new Map<string, string>();

/**
 * Speaks text using server-side Gemini TTS, with seamless fallback to browser SpeechSynthesis
 */
export const speakText = async (text: string, lang: string, settings: TtsSettings): Promise<void> => {
  if (!text || !text.trim()) return;

  const trimmed = text.trim().slice(0, 400);
  const cacheKey = `${trimmed}__${lang}__${settings.voiceName || 'Kore'}__${settings.rate || 1}__${settings.pitch || 1}`;

  // Helper to play decoded audio buffer via Web Audio API
  const playBase64Audio = async (base64Audio: string): Promise<boolean> => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const outputAudioContext = new AudioCtx({ sampleRate: 24000 });
      if (outputAudioContext.state === 'suspended') {
        await outputAudioContext.resume();
      }
      const audioBuffer = await decodeAudioData(
        decode(base64Audio),
        outputAudioContext,
        24000,
        1,
      );
      const source = outputAudioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(outputAudioContext.destination);
      source.start();
      return true;
    } catch {
      return false;
    }
  };

  // 1. If audio is cached on client, play it immediately
  if (clientAudioCache.has(cacheKey)) {
    const played = await playBase64Audio(clientAudioCache.get(cacheKey)!);
    if (played) return;
  }

  // 2. Try fetching synthesized neural audio from server
  try {
    const response = await fetch("/api/tts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: trimmed,
        lang,
        voiceName: settings.voiceName,
        rate: settings.rate,
        pitch: settings.pitch,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.audio) {
        clientAudioCache.set(cacheKey, data.audio);
        const played = await playBase64Audio(data.audio);
        if (played) return;
      }
    }
  } catch {
    // Network or server unreachable, fallback smoothly below
  }

  // 3. Fallback to native browser SpeechSynthesis (works 100% offline and without quota restrictions)
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const bcp47 = LANG_BCP47_MAP[lang] || lang;
      utterance.lang = bcp47;
      utterance.rate = settings.rate || 1.0;
      utterance.pitch = settings.pitch || 1.0;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Gracefully silent if user has disabled speech
    }
  }
};

