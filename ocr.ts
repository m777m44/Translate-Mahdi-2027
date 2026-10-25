/**
 * ocr.ts — on-device optical character recognition.
 *
 * Tesseract.js is imported lazily so its ~1MB worker never lands in the main
 * bundle; it is downloaded (and cached by the browser/Service Worker) only the
 * first time a user translates an image without a server-side AI response.
 *
 * The server Gemini vision endpoint remains the primary path; this module is
 * the guaranteed offline / no-API-key fallback so camera translation never
 * silently fails again.
 */

export interface OcrProgress {
  status: string;
  progress: number; // 0..1
}

/** Map app language codes to the closest Tesseract traineddata languages. */
const TESS_LANG_MAP: Record<string, string> = {
  ar: 'ara',
  en: 'eng',
  fr: 'fra',
  es: 'spa',
  de: 'deu',
  it: 'ita',
  ru: 'rus',
  tr: 'tur',
  fa: 'fas',
  ur: 'urd',
  hi: 'hin',
  zh: 'chi_sim',
  ja: 'jpn',
  ko: 'kor',
  pt: 'por',
  nl: 'nld',
  id: 'ind',
  he: 'heb',
};

export function tesseractLangFor(...codes: string[]): string {
  const picked = new Set<string>(['eng']); // English baseline helps mixed signs.
  for (const code of codes) {
    const t = TESS_LANG_MAP[code];
    if (t) picked.add(t);
  }
  return Array.from(picked).join('+');
}

/**
 * Extract visible text from an image data URL.
 * Throws with an Arabic-friendly message on failure.
 */
export async function recognizeImageText(
  imageDataUrl: string,
  targetLang: string,
  sourceLang = 'auto',
  onProgress?: (p: OcrProgress) => void,
): Promise<string> {
  let worker: any = null;
  try {
    const { createWorker } = await import('tesseract.js');
    const langs = tesseractLangFor(
      sourceLang && sourceLang !== 'auto' ? sourceLang : '',
      targetLang,
    );
    worker = await createWorker(langs, 1, {
      logger: (m: any) => {
        if (onProgress && typeof m.progress === 'number') {
          onProgress({ status: String(m.status || ''), progress: m.progress });
        }
      },
    });
    const { data } = await worker.recognize(imageDataUrl);
    const text = String(data?.text || '').replace(/\n{3,}/g, '\n\n').trim();
    return text;
  } catch (err: any) {
    console.warn('OCR failed:', err);
    throw new Error('تعذّر استخراج النص من الصورة. تأكد من وضوح النص وحاول مجدداً.');
  } finally {
    if (worker) {
      try { await worker.terminate(); } catch { /* noop */ }
    }
  }
}
