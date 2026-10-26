
import { apiUrl } from './apiBase.ts';
import { TtsSettings, AIAnalysisResult, MultiEngineComparison, MoreTranslation, WordDefinition } from "./types.ts";

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

  const response = await fetch(apiUrl("/api/translate"), {
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

  const response = await fetch(apiUrl("/api/compare"), {
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

  const response = await fetch(apiUrl("/api/translate-image"), {
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
/**
 * Text-to-speech.
 *
 * v5.1: delegates to the robust local TTS engine (tts.ts) instead of the old
 * server-audio-first flow. The local engine waits for the device voice list,
 * cancels previous utterances, matches the language, and works fully offline —
 * this fixes output-speech being dead inside the Android WebView.
 */
export const speakText = async (text: string, lang: string, settings: TtsSettings): Promise<void> => {
  if (!text || !text.trim()) return;
  const { tts } = await import('./tts.ts');
  await tts.speak(text.trim().slice(0, 600), lang, settings.rate || 1, settings.pitch || 1);
};
