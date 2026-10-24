/**
 * neuralEngine.ts — on-device neural translation & speech recognition.
 *
 * Port of the local-AI philosophy of RTranslator (niedev/RTranslator) to the
 * web/Capacitor stack, using Transformers.js (ONNX Runtime Web, WebGPU/WASM):
 *
 *   • Meta NLLB-200 (distilled 600M) — 200+ language flagship model, the same
 *     family RTranslator v2 used fully offline.
 *   • Helsinki/NLP Marian (Opus-MT) pairs — the Mozilla Bergamot family used by
 *     RTranslator v3: small, fast, high-quality per-language-pair models.
 *   • OpenAI Whisper (tiny/base) — the same on-device ASR engine RTranslator
 *     uses for speech recognition.
 *
 * Everything runs inside the app (no server, no API key). Models are downloaded
 * once on demand and cached by the browser/Capacitor Cache API, then work
 * offline. The heavy library is dynamically imported only when a neural feature
 * is actually opened, keeping the main bundle fast.
 */

export type NeuralModelKind = 'nllb' | 'marian' | 'whisper';

export interface NeuralModelInfo {
  id: string;
  hfId: string;
  kind: NeuralModelKind;
  titleAr: string;
  titleEn: string;
  /** Approximate download size in MB for the default quantised weights. */
  sizeMB: number;
  /** ISO pair for marian models, e.g. ['en','ar']. */
  pair?: [string, string];
  /** Languages covered (ISO 639-1) for multilingual models. */
  languages?: string[];
  recommended?: boolean;
  descriptionAr: string;
}

export interface NeuralModelStatus extends NeuralModelInfo {
  downloaded: boolean;
  /** 0..100 while downloading. */
  progress: number;
  active: boolean;
  error?: string;
}

export type NeuralQuality = 'fast-int4' | 'balanced-int8' | 'fp16-precise';

export interface NeuralTranslateOptions {
  quality?: NeuralQuality;
  useGpu?: boolean;
  numBeams?: number;
  maxLength?: number;
}

export class NeuralEngineError extends Error {
  code: 'MODEL_MISSING' | 'UNSUPPORTED_PAIR' | 'RUNTIME' | 'ABORTED';
  suggestedModelId?: string;
  constructor(
    code: NeuralEngineError['code'],
    message: string,
    suggestedModelId?: string,
  ) {
    super(message);
    this.name = 'NeuralEngineError';
    this.code = code;
    this.suggestedModelId = suggestedModelId;
  }
}

/* ------------------------------------------------------------------ */
/* Model catalogue                                                     */
/* ------------------------------------------------------------------ */

const NLLB_HF = 'Xenova/nllb-200-distilled-600M';
const WHISPER_TINY = 'Xenova/whisper-tiny';
const WHISPER_BASE = 'Xenova/whisper-base';

const MARIAN_PAIRS: Array<[string, string]> = [
  ['ar', 'en'], ['en', 'ar'],
  ['fr', 'en'], ['en', 'fr'],
  ['es', 'en'], ['en', 'es'],
  ['de', 'en'], ['en', 'de'],
  ['ru', 'en'], ['en', 'ru'],
  ['zh', 'en'], ['en', 'zh'],
  ['tr', 'en'], ['en', 'tr'],
  ['ja', 'en'], ['en', 'ja'],
  ['it', 'en'], ['en', 'it'],
  ['nl', 'en'], ['en', 'nl'],
  ['pt', 'en'], ['en', 'pt'],
];

const PAIR_TITLE: Record<string, string> = {
  ar: 'العربية', en: 'الإنجليزية', fr: 'الفرنسية', es: 'الإسبانية',
  de: 'الألمانية', ru: 'الروسية', zh: 'الصينية', tr: 'التركية',
  ja: 'اليابانية', it: 'الإيطالية', nl: 'الهولندية', pt: 'البرتغالية',
};

export const NEURAL_MODELS: NeuralModelInfo[] = [
  {
    id: 'nllb-200-600m',
    hfId: NLLB_HF,
    kind: 'nllb',
    titleAr: 'نموذج NLLB-200 متعدد اللغات (600M)',
    titleEn: 'NLLB-200 multilingual (600M)',
    sizeMB: 390,
    recommended: true,
    languages: ['ar', 'en', 'fr', 'es', 'de', 'tr', 'ru', 'zh', 'ja', 'it', 'pt', 'ko', 'fa', 'ur', 'hi', 'id', 'nl', 'sv', 'el', 'pl'],
    descriptionAr: 'النموذج الرئيسي من ميتا — يترجم بين أكثر من 200 لغة بجودة عالية ويعمل بالكامل على جهازك بدون إنترنت (نفس عائلة نماذج RTranslator).',
  },
  ...MARIAN_PAIRS.map<NeuralModelInfo>(([src, tgt]) => ({
    id: `marian-${src}-${tgt}`,
    hfId: `Xenova/opus-mt-${src}-${tgt}`,
    kind: 'marian' as const,
    titleAr: `ترجمة ${PAIR_TITLE[src]} ↔ ${PAIR_TITLE[tgt]} (Bergamot/Marian)`,
    titleEn: `Opus-MT ${src}→${tgt}`,
    sizeMB: 75,
    pair: [src, tgt] as [string, string],
    descriptionAr: 'نموذج خفيف وسريع جداً لزوج لغوي محدد — نفس فلسفة نماذج موزيلا بيرغاموت في RTranslator 3.0.',
  })),
  {
    id: 'whisper-tiny',
    hfId: WHISPER_TINY,
    kind: 'whisper',
    titleAr: 'Whisper Tiny — تعرّف الكلام (خفيف)',
    titleEn: 'Whisper Tiny ASR',
    sizeMB: 45,
    recommended: true,
    languages: ['ar', 'en', 'fr', 'es', 'de', 'tr', 'ru', 'zh', 'ja', 'it', 'pt', 'ko', 'fa', 'ur', 'hi', 'id', 'nl', 'sv', 'el', 'pl'],
    descriptionAr: 'تعرّف كلام محلي بالكامل من OpenAI — نفس محرك Whisper في RTranslator، نسخة خفيفة سريعة.',
  },
  {
    id: 'whisper-base',
    hfId: WHISPER_BASE,
    kind: 'whisper',
    titleAr: 'Whisper Base — تعرّف الكلام (دقة أعلى)',
    titleEn: 'Whisper Base ASR',
    sizeMB: 85,
    descriptionAr: 'نسخة أدق من Whisper لمن يريد جودة تعرّف أعلى مقابل حجم أكبر.',
  },
];

export function getModelInfo(id: string): NeuralModelInfo | undefined {
  return NEURAL_MODELS.find((m) => m.id === id);
}

/* ISO 639-1 → NLLB FLORES-200 language codes. */
const NLLB_CODES: Record<string, string> = {
  ar: 'arb_Arab', en: 'eng_Latn', fr: 'fra_Latn', es: 'spa_Latn',
  de: 'deu_Latn', tr: 'tur_Latn', ru: 'rus_Cyrl', zh: 'zho_Hans',
  ja: 'jpn_Jpan', it: 'ita_Latn', pt: 'por_Latn', ko: 'kor_Hang',
  fa: 'fas_Arab', ur: 'urd_Arab', hi: 'hin_Deva', id: 'ind_Latn',
  nl: 'nld_Latn', sv: 'swe_Latn', el: 'ell_Grek', pl: 'pol_Latn',
};

/* ISO 639-1 → Whisper language names. */
const WHISPER_LANGS: Record<string, string> = {
  ar: 'arabic', en: 'english', fr: 'french', es: 'spanish',
  de: 'german', tr: 'turkish', ru: 'russian', zh: 'chinese',
  ja: 'japanese', it: 'italian', pt: 'portuguese', ko: 'korean',
  fa: 'persian', ur: 'urdu', hi: 'hindi', id: 'indonesian',
  nl: 'dutch', sv: 'swedish', el: 'greek', pl: 'polish',
};

/* ------------------------------------------------------------------ */
/* Runtime state                                                       */
/* ------------------------------------------------------------------ */

type TransformersModule = typeof import('@huggingface/transformers');
let transformers: TransformersModule | null = null;
let runtimeInit: Promise<TransformersModule> | null = null;

const pipelines = new Map<string, any>();
const downloadState = new Map<string, { progress: number; active: boolean; error?: string }>();
const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) {
    try { fn(); } catch { /* listener errors must not break engine */ }
  }
}

export function subscribeNeuralState(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function isWebGpuAvailable(): boolean {
  return typeof navigator !== 'undefined' && Boolean((navigator as any).gpu);
}

/** Lazily import Transformers.js and point the WASM runtime at local assets. */
async function getTransformers(): Promise<TransformersModule> {
  if (transformers) return transformers;
  if (runtimeInit) return runtimeInit;

  runtimeInit = (async () => {
    const mod = await import('@huggingface/transformers');
    const env = mod.env;
    env.allowLocalModels = false;
    env.useBrowserCache = true;

    // Optional Hugging Face mirror (e.g. https://hf-mirror.com) for regions
    // where huggingface.co is slow/blocked.
    try {
      const mirror = localStorage.getItem('mahdi_hf_mirror');
      if (mirror) env.remoteHost = mirror.replace(/\/$/, '');
    } catch { /* ignore */ }

    // Note: Vite emits the ONNX Runtime wasm binary as a bundled asset and
    // Transformers.js automatically points wasmPaths at it, so inference runs
    // fully offline inside the APK without any extra configuration.

    transformers = mod;
    return mod;
  })();

  return runtimeInit;
}

function qualityToDtype(quality?: NeuralQuality): 'q4' | 'q8' | 'fp32' {
  if (quality === 'fast-int4') return 'q4';
  if (quality === 'fp16-precise') return 'fp32';
  return 'q8';
}

function deviceFor(useGpu?: boolean): 'webgpu' | 'wasm' {
  return useGpu && isWebGpuAvailable() ? 'webgpu' : 'wasm';
}

/* ------------------------------------------------------------------ */
/* Cache inspection / management                                       */
/* ------------------------------------------------------------------ */

const CACHE_NAME = 'transformers-cache';

async function cachedUrlsForModel(hfId: string): Promise<string[]> {
  if (typeof caches === 'undefined') return [];
  try {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    const needle = `/${hfId}/`;
    return keys.filter((r) => r.url.includes(needle)).map((r) => r.url);
  } catch {
    return [];
  }
}

export async function isModelDownloaded(id: string): Promise<boolean> {
  const info = getModelInfo(id);
  if (!info) return false;
  const urls = await cachedUrlsForModel(info.hfId);
  // A usable model has at least encoder + decoder (or ASR encoder/decoder) weights.
  return urls.some((u) => u.includes('.onnx'));
}

export async function getNeuralModelStatuses(): Promise<NeuralModelStatus[]> {
  const result: NeuralModelStatus[] = [];
  for (const info of NEURAL_MODELS) {
    const state = downloadState.get(info.id);
    result.push({
      ...info,
      downloaded: await isModelDownloaded(info.id),
      progress: state?.progress ?? (await isModelDownloaded(info.id) ? 100 : 0),
      active: state?.active ?? false,
      error: state?.error,
    });
  }
  return result;
}

export async function getNeuralStorageMB(): Promise<number> {
  if (typeof caches === 'undefined') return 0;
  try {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    let bytes = 0;
    await Promise.all(keys.map(async (req) => {
      const res = await cache.match(req);
      const len = Number(res?.headers.get('content-length') || 0);
      if (len) bytes += len;
    }));
    return Math.round(bytes / (1024 * 1024));
  } catch {
    return 0;
  }
}

export async function deleteNeuralModel(id: string): Promise<void> {
  const info = getModelInfo(id);
  if (!info) return;
  const cache = await caches.open(CACHE_NAME);
  const urls = await cachedUrlsForModel(info.hfId);
  await Promise.all(urls.map((u) => cache.delete(u)));
  for (const key of [...pipelines.keys()]) {
    if (key.startsWith(info.hfId)) pipelines.delete(key);
  }
  downloadState.delete(id);
  emit();
}

/* ------------------------------------------------------------------ */
/* Pipelines                                                           */
/* ------------------------------------------------------------------ */

function makeProgressCallback(modelId: string) {
  return (cb: any) => {
    const state = downloadState.get(modelId) ?? { progress: 0, active: true };
    if (cb.status === 'progress' && typeof cb.progress === 'number') {
      state.progress = Math.round(cb.progress);
      state.active = true;
      downloadState.set(modelId, state);
      emit();
    } else if (cb.status === 'done' || cb.status === 'ready') {
      state.progress = 100;
      state.active = false;
      downloadState.set(modelId, state);
      emit();
    } else if (cb.status === 'error') {
      state.active = false;
      state.error = String(cb.message || 'download error');
      downloadState.set(modelId, state);
      emit();
    }
  };
}

async function getTranslationPipeline(info: NeuralModelInfo, opts: NeuralTranslateOptions) {
  const dtype = qualityToDtype(opts.quality);
  const device = deviceFor(opts.useGpu);
  const key = `${info.hfId}|${device}|${dtype}`;
  if (pipelines.has(key)) return pipelines.get(key);

  const mod = await getTransformers();
  const pipe = await mod.pipeline('translation', info.hfId, {
    device,
    dtype,
    progress_callback: makeProgressCallback(info.id),
  });
  pipelines.set(key, pipe);
  return pipe;
}

async function getAsrPipeline(info: NeuralModelInfo, quality?: NeuralQuality, useGpu?: boolean) {
  const dtype = qualityToDtype(quality);
  const device = deviceFor(useGpu);
  const key = `${info.hfId}|asr|${device}|${dtype}`;
  if (pipelines.has(key)) return pipelines.get(key);

  const mod = await getTransformers();
  const pipe = await mod.pipeline('automatic-speech-recognition', info.hfId, {
    device,
    dtype,
    progress_callback: makeProgressCallback(info.id),
  });
  pipelines.set(key, pipe);
  return pipe;
}

/** Resolve which model will serve a given language pair. */
export function resolveTranslationModel(from: string, to: string): NeuralModelInfo {
  const marian = NEURAL_MODELS.find(
    (m) => m.kind === 'marian' && m.pair?.[0] === from && m.pair?.[1] === to,
  );
  if (marian) return marian;
  if (NLLB_CODES[from] && NLLB_CODES[to]) return getModelInfo('nllb-200-600m')!;
  throw new NeuralEngineError('UNSUPPORTED_PAIR', `لا توجد نماذج محلية للزوج ${from}→${to}`);
}

/** Download (or warm-up) a model and resolve when it is ready. */
export async function downloadModel(id: string, quality?: NeuralQuality): Promise<void> {
  const info = getModelInfo(id);
  if (!info) throw new NeuralEngineError('MODEL_MISSING', `نموذج غير معروف: ${id}`);
  if ((await isModelDownloaded(id)) && !pipelines.has(info.hfId)) {
    // Already cached — just warm the pipeline so first use is instant.
  }
  downloadState.set(id, { progress: 0, active: true });
  emit();
  try {
    if (info.kind === 'whisper') {
      await getAsrPipeline(info, quality);
    } else {
      await getTranslationPipeline(info, { quality });
    }
    downloadState.set(id, { progress: 100, active: false });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      downloadState.set(id, { progress: 0, active: false, error: 'تم الإلغاء' });
    } else {
      downloadState.set(id, { progress: 0, active: false, error: String(err?.message || err) });
    }
    emit();
    throw err;
  }
  emit();
}

/**
 * Translate fully on device. Throws NeuralEngineError('MODEL_MISSING') when no
 * required model is cached yet, so callers can prompt the download manager.
 */
export async function translateNeural(
  text: string,
  from: string,
  to: string,
  opts: NeuralTranslateOptions = {},
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return '';

  const info = resolveTranslationModel(from, to);
  if (!(await isModelDownloaded(info.id))) {
    throw new NeuralEngineError(
      'MODEL_MISSING',
      `النموذج المحلي (${info.titleAr}) غير محمّل بعد.`,
      info.id,
    );
  }

  const pipe = await getTranslationPipeline(info, opts);

  if (info.kind === 'marian') {
    const out = await pipe(trimmed, {
      max_length: opts.maxLength ?? 512,
      num_beams: opts.numBeams ?? 1,
    });
    return String(out?.[0]?.translation_text ?? '').trim();
  }

  // NLLB multilingual.
  const src = NLLB_CODES[from];
  const tgt = NLLB_CODES[to];
  const out = await pipe(trimmed, {
    src_lang: src,
    tgt_lang: tgt,
    max_length: opts.maxLength ?? 512,
    num_beams: opts.numBeams ?? 1,
  });
  return String(out?.[0]?.translation_text ?? '').trim();
}

/** Decode an audio Blob into 16 kHz mono Float32 PCM for Whisper. */
export async function audioBlobToPCM16k(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer();
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  const tmp = new AudioCtx();
  const decoded = await tmp.decodeAudioData(arrayBuffer);
  tmp.close().catch(() => {});

  const targetRate = 16000;
  if (decoded.sampleRate === targetRate && decoded.numberOfChannels === 1) {
    return decoded.getChannelData(0).slice();
  }
  const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * targetRate), targetRate);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  const resampled = await offline.startRendering();
  return resampled.getChannelData(0);
}

/** On-device speech-to-text via Whisper. */
export async function transcribeNeural(
  audio: Blob | Float32Array,
  language: string,
  opts: { quality?: NeuralQuality; useGpu?: boolean; modelId?: string } = {},
): Promise<string> {
  const info = getModelInfo(opts.modelId ?? 'whisper-tiny')!;
  if (!(await isModelDownloaded(info.id))) {
    throw new NeuralEngineError('MODEL_MISSING', 'نموذج Whisper غير محمّل بعد.', info.id);
  }
  const pcm = audio instanceof Float32Array ? audio : await audioBlobToPCM16k(audio);
  const pipe = await getAsrPipeline(info, opts.quality, opts.useGpu);
  const out = await pipe(pcm, {
    language: WHISPER_LANGS[language] || language,
    task: 'transcribe',
    chunk_length_s: 30,
    stride_length_s: 5,
    return_timestamps: false,
  });
  return String(out?.text ?? '').trim();
}

export function supportsNeuralPair(from: string, to: string): boolean {
  try {
    resolveTranslationModel(from, to);
    return true;
  } catch {
    return false;
  }
}
