import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Modality } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '35mb' }));

// Helper to get GoogleGenAI client lazily
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not configured. Please add your key in Settings > Secrets.');
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Resilient model fallback list for text tasks (from SKILL.md)
const TEXT_MODELS = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];

/**
 * Executes a Gemini request with automatic retries and fallback across approved models
 * to handle temporary 503 (high demand / UNAVAILABLE) and 429 rate limit spikes.
 */
async function generateWithFallback(
  ai: GoogleGenAI,
  models: string[],
  requestFn: (model: string) => Promise<any>
): Promise<any> {
  let lastError: any = null;

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await requestFn(model);
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || err || '');
        const isTransient =
          err?.status === 503 ||
          err?.status === 429 ||
          msg.includes('503') ||
          msg.includes('high demand') ||
          msg.includes('UNAVAILABLE') ||
          msg.includes('RESOURCE_EXHAUSTED') ||
          msg.includes('overloaded');

        if (isTransient) {
          if (attempt === 0) {
            // Short backoff before 2nd attempt on same model
            await new Promise((resolve) => setTimeout(resolve, 500));
            continue;
          }
          // After retry, move cleanly to next fallback model in the list
          console.warn(`[Gemini] Model ${model} is experiencing high demand (503). Switching to fallback model...`);
          break;
        }

        // If it is an auth error or non-transient error, throw immediately
        throw err;
      }
    }
  }

  throw lastError;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Translation Endpoint with multi-model fallback, domain, tone, dialect and analysis support
app.post('/api/translate', async (req, res) => {
  try {
    const { text, from, to, domain, tone, dialect, includeAnalysis, accuracy, engine, preserveFormatting, translateNumbers } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required for translation.' });
    }
    if (typeof text === 'string' && text.length > 24000) {
      return res.status(413).json({ error: 'النص طويل جداً (الحد الأقصى 24000 حرف).' });
    }

    const ai = getGenAI();
    const isAuto = !from || from === 'auto';
    const sourceLangPrompt = isAuto ? 'the automatically detected source language' : from;
    const targetLang = to || 'Arabic';
    const domainContext = domain && domain !== 'general' ? `Specialized Domain: ${domain}` : '';
    const toneContext = tone && tone !== 'standard' ? `Tone: ${tone}` : '';
    const dialectContext = dialect && dialect !== 'standard' ? `Dialect target: ${dialect}` : '';

    // Precision rules driven by the user's settings panel.
    const accuracyContext =
      accuracy === 'fast'
        ? 'Accuracy mode: FAST — prefer the single most likely rendering, keep it brief.'
        : accuracy === 'balanced'
        ? 'Accuracy mode: BALANCED — natural fluency first, literal fidelity second.'
        : 'Accuracy mode: ULTRA-ACCURATE — verify terminology, idioms, negations, numbers and named entities before answering. Never drop or invent meaning.';
    const engineContext =
      engine === 'deepl-style'
        ? 'Engine style: DeepL-style — document-level fluency and idiomatic phrasing.'
        : engine === 'offline-local'
        ? 'Engine style: conservative literal translation.'
        : 'Engine style: Mahdi Neural — highest quality neural rendering.';
    const formatRules = [
      preserveFormatting === false ? 'Flatten line breaks into flowing prose.' : 'Preserve the original line breaks, lists, and paragraph structure exactly.',
      translateNumbers === false ? 'Keep digits, dates, currencies and measurements in their original form.' : 'Localise digits, dates, currencies and units to the target-language convention.',
      'Never translate code identifiers, URLs, file paths, or placeholders such as {name} and %s.',
      'Output ONLY the requested JSON — no markdown fences, no commentary.',
    ].join('\n');

    if (includeAnalysis) {
      const prompt = `You are Mahdi (مهدي), the world's most advanced multilingual neural translator and linguistic expert.
Translate the text from ${sourceLangPrompt} to ${targetLang}.
${domainContext ? `${domainContext}` : ''}
${toneContext ? `${toneContext}` : ''}
${dialectContext ? `${dialectContext}` : ''}
${accuracyContext}
${engineContext}

Formatting & precision rules:
${formatRules}

CRITICAL: Return a VALID JSON object (and nothing else) with this exact schema:
{
  "translation": "Primary best translation",
  "alternatives": ["Alternative phrasing 1", "Alternative phrasing 2"],
  "culturalNotes": "Brief cultural context, idioms, or situational tips in Arabic",
  "grammarExplanation": "Concise explanation of challenging vocabulary or grammatical nuances in Arabic",
  "sentiment": "Neutral/Positive/Formal etc.",
  "keyTerms": [
    {"term": "source term", "meaning": "translation & explanation in Arabic"}
  ],
  "detectedDialect": "Name of detected or targeted dialect"
}

Text to translate:
"""${text}"""`;

      const response = await generateWithFallback(ai, TEXT_MODELS, (model) =>
        ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        })
      );

      try {
        const parsed = JSON.parse(response.text || '{}');
        return res.json({
          translation: parsed.translation || '',
          analysis: parsed,
        });
      } catch {
        return res.json({
          translation: response.text ? response.text.trim() : '',
          analysis: null,
        });
      }
    }

    const richPrompt = `You are Mahdi Translator (مهدي), the world's most advanced multilingual AI translator and dictionary engine like Google Translate.
Translate the text from ${sourceLangPrompt} to ${targetLang}.
${domainContext ? `${domainContext}` : ''}
${toneContext ? `${toneContext}` : ''}
${dialectContext ? `${dialectContext}` : ''}
${accuracyContext}
${engineContext}

Formatting & precision rules:
${formatRules}

You MUST return a VALID JSON object (and nothing else) with this exact schema:
{
  "translation": "The primary translation string",
  "transliteration": "Phonetic romanization or pronunciation transcription (e.g. 'ahlaan' for أهلاً, or pinyin/romaji/latin script)",
  "detectedLanguageName": "Arabic name of detected source language followed by '، تم رصدها' (e.g. 'الإنجليزية، تم رصدها')",
  "moreTranslations": [
    {
      "phrase": "Alternative translation (e.g. 'مرحبا!')",
      "partOfSpeech": "Part of speech in Arabic (e.g. 'لفظ تعجب' or 'اسم' or 'فعل' or 'صفة')",
      "reverseTranslations": ["Welcome!", "Hello!", "Hi!", "Hallo!"]
    }
  ],
  "definitions": [
    {
      "partOfSpeech": "Part of speech in Arabic (e.g. 'صيغة تعجب' or 'اختصار' or 'اسم' or 'فعل')",
      "definition": "Definition explanation of the source word/phrase",
      "example": "Real-world usage example sentence wrapped in quotes",
      "number": 1,
      "synonyms": ["synonym1", "synonym2", "synonym3"]
    }
  ]
}

Note: For single words or short phrases, provide rich "moreTranslations", "definitions", and extensive "synonyms" like a comprehensive dictionary (as in Google Translate). For long multi-sentence paragraphs, you can provide an empty array for definitions.

Text to translate:
"""${text}"""`;

    const response = await generateWithFallback(ai, TEXT_MODELS, (model) =>
      ai.models.generateContent({
        model,
        contents: richPrompt,
        config: {
          responseMimeType: 'application/json',
        },
      })
    );

    const rawText = response.text ? response.text.trim() : '';
    try {
      const parsed = JSON.parse(rawText);
      return res.json({
        translation: parsed.translation || rawText,
        transliteration: parsed.transliteration || '',
        detectedLanguageName: parsed.detectedLanguageName || '',
        moreTranslations: Array.isArray(parsed.moreTranslations) ? parsed.moreTranslations : [],
        definitions: Array.isArray(parsed.definitions) ? parsed.definitions : [],
      });
    } catch {
      return res.json({ 
        translation: rawText.replace(/^\{.*"translation":\s*"([^"]+)".*\}$/s, '$1') || rawText,
        transliteration: '',
        detectedLanguageName: '',
        moreTranslations: [],
        definitions: []
      });
    }
  } catch (error: any) {
    const isBusy = error?.status === 503 || String(error?.message || '').includes('high demand') || String(error?.message || '').includes('UNAVAILABLE');
    console.warn('Translation request handled with status:', isBusy ? '503 (High Demand)' : (error?.message || 'Error'));
    
    const status = isBusy ? 503 : (error?.status || (error?.message?.includes('PERMISSION_DENIED') ? 403 : 500));
    return res.status(status).json({
      error: isBusy 
        ? 'الخادم يواجه ضغطاً مؤقتاً، يمكنك استخدام المحرك المحلي الفوري.' 
        : (error?.message || 'Failed to translate text'),
      status,
      isTransient: isBusy,
    });
  }
});

// Multi-engine comparison endpoint
app.post('/api/compare', async (req, res) => {
  try {
    const { text, from, to } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required for comparison.' });
    }

    const ai = getGenAI();
    const isAuto = !from || from === 'auto';
    const sourceLangPrompt = isAuto ? 'the automatically detected source language' : from;
    const targetLang = to || 'Arabic';

    const prompt = `Translate this text from ${sourceLangPrompt} to ${targetLang} in 3 distinct translation styles:
1. "mahdiNeural": Highly natural, culturally fluent, context-aware translation.
2. "deepLStyle": Formal, grammatically precise, literature/business focused.
3. "standardMt": Direct, literal machine translation.

Return ONLY a JSON object:
{
  "mahdiNeural": "...",
  "deepLStyle": "...",
  "standardMt": "..."
}

Text:
"""${text}"""`;

    const response = await generateWithFallback(ai, TEXT_MODELS, (model) =>
      ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      })
    );

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    return res.status(500).json({
      error: error?.message || 'Comparison failed',
      mahdiNeural: '',
      deepLStyle: '',
      standardMt: '',
    });
  }
});


// Image Translation Endpoint with multi-model fallback
app.post('/api/translate-image', async (req, res) => {
  try {
    const { base64Data, targetLang } = req.body;
    if (!base64Data) {
      return res.status(400).json({ error: 'Image data is required.' });
    }

    let mimeType = 'image/jpeg';
    let rawData = base64Data;
    if (base64Data.includes(',')) {
      const match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        rawData = match[2];
      } else {
        rawData = base64Data.split(',')[1];
      }
    }

    const ai = getGenAI();
    const response = await generateWithFallback(ai, TEXT_MODELS, (model) =>
      ai.models.generateContent({
        model,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: rawData,
              },
            },
            {
              text: `Extract all visible text from this image and translate it accurately into ${targetLang || 'Arabic'}.
CRITICAL: Return ONLY the translated text. Do not provide conversational commentary, notes, or introductions. If no legible text is found in the image, reply with: [No text detected in image]`,
            },
          ],
        },
      })
    );

    const translatedText = response.text ? response.text.trim() : '';
    return res.json({ translation: translatedText });
  } catch (error: any) {
    const isBusy = error?.status === 503 || String(error?.message || '').includes('high demand');
    console.warn('Image translation handled with status:', isBusy ? '503 (High Demand)' : (error?.message || 'Error'));
    
    const status = isBusy ? 503 : (error?.status || (error?.message?.includes('PERMISSION_DENIED') ? 403 : 500));
    return res.status(status).json({
      error: isBusy 
        ? 'الخادم يواجه ضغطاً مؤقتاً، يرجى إعادة المحاولة لاحقاً.' 
        : (error?.message || 'Failed to translate image'),
      status,
    });
  }
});

// In-memory cache & circuit breaker for TTS to stay comfortably within rate limits
const ttsServerCache = new Map<string, string>();
let ttsRateLimitedUntil = 0;

// Text-to-Speech Endpoint
app.post('/api/tts', async (req, res) => {
  try {
    const { text, lang, voiceName, rate, pitch } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required for speech synthesis.' });
    }

    const trimmed = text.trim().slice(0, 400);
    const cacheKey = `${trimmed}__${lang || 'en'}__${voiceName || 'Kore'}__${rate || 1}__${pitch || 1}`;

    // 1. Return cached audio immediately if available
    if (ttsServerCache.has(cacheKey)) {
      return res.json({ audio: ttsServerCache.get(cacheKey), cached: true });
    }

    // 2. If circuit breaker cooldown is active, return fallback directly without API attempt
    if (Date.now() < ttsRateLimitedUntil) {
      return res.json({ audio: null, fallback: 'browser', reason: 'quota_cooldown' });
    }

    const ai = getGenAI();
    const rateDesc = (rate && rate > 1.2) ? 'quickly' : (rate && rate < 0.8) ? 'slowly' : 'normally';
    const pitchDesc = (pitch && pitch > 1.2) ? 'high-pitched' : (pitch && pitch < 0.8) ? 'deep-toned' : '';
    const prompt = `Speak ${rateDesc} ${pitchDesc ? `and ${pitchDesc}` : ''} in ${lang || 'en'}: ${trimmed}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-tts-preview',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName || 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      return res.json({ audio: null, fallback: 'browser', reason: 'no_audio_candidate' });
    }

    // Cache the successful audio response (up to 100 entries)
    if (ttsServerCache.size > 100) {
      const firstKey = ttsServerCache.keys().next().value;
      if (firstKey) ttsServerCache.delete(firstKey);
    }
    ttsServerCache.set(cacheKey, base64Audio);

    return res.json({ audio: base64Audio });
  } catch (error: any) {
    const errMsg = String(error?.message || '');
    const isRateLimit = error?.status === 429 || errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED');
    
    if (isRateLimit) {
      // Activate a 30-second cooldown so subsequent requests don't repeatedly hit quota
      ttsRateLimitedUntil = Date.now() + 30000;
    }

    // Return status 200 with fallback signal to smoothly transfer to client browser speech synthesis
    return res.json({
      audio: null,
      fallback: 'browser',
      reason: isRateLimit ? 'rate_limit' : 'unavailable',
    });
  }
});

// Start Express and Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server startup failed:', err);
  process.exit(1);
});
