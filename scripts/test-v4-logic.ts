/**
 * Smoke test for the v4 on-device logic modules (no DOM/network needed).
 * Run: npx tsx scripts/test-v4-logic.ts
 */
import { identifyLanguage } from '../langId.ts';
import { parseDocument, translateDocument, buildTranslatedFileName } from '../documentTranslator.ts';
import {
  BUILTIN_PHRASES, PHRASE_CATEGORIES, addFlashcard, getDueFlashcards,
  rateFlashcard, getFlashcards, phraseInLanguage,
} from '../phrasebook.ts';
import { recordTranslation, summarizeStats, resetUsageStats } from '../usageStats.ts';
import { NEURAL_MODELS, supportsNeuralPair, getModelInfo } from '../neuralEngine.ts';

// Minimal localStorage shim for Node.
const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};

let failures = 0;
const assert = (cond: boolean, msg: string) => {
  if (cond) console.log(`  ✓ ${msg}`);
  else { failures += 1; console.error(`  ✗ ${msg}`); }
};

console.log('▸ language identification');
assert(identifyLanguage('السلام عليكم كيف حالك اليوم', 1)[0]?.lang === 'ar', 'Arabic detected');
assert(identifyLanguage('hello where is the airport please', 1)[0]?.lang === 'en', 'English detected');
assert(identifyLanguage('bonjour où est la gare merci beaucoup', 1)[0]?.lang === 'fr', 'French detected');
assert(identifyLanguage('guten morgen wo ist der bahnhof', 1)[0]?.lang === 'de', 'German detected');
assert(identifyLanguage('доброе утро где находится станция', 1)[0]?.lang === 'ru', 'Russian detected');
assert(identifyLanguage('günaydın istasyon nerede çok teşekkürler', 1)[0]?.lang === 'tr', 'Turkish detected');

console.log('▸ neural model catalogue');
assert(NEURAL_MODELS.length >= 20, `catalogue has ${NEURAL_MODELS.length} models`);
assert(supportsNeuralPair('ar', 'en'), 'ar→en pair supported');
assert(supportsNeuralPair('ar', 'ja'), 'ar→ja falls back to NLLB');
assert(!supportsNeuralPair('xx', 'yy'), 'unknown pair rejected');
assert(Boolean(getModelInfo('nllb-200-600m')?.recommended), 'NLLB flagship marked recommended');

console.log('▸ document translation (SRT timestamps preserved)');
const srt = '1\n00:00:01,000 --> 00:00:03,000\nHello my friend\n\n2\n00:00:04,000 --> 00:00:06,000\nHow are you\n';
const doc = parseDocument('sample.srt', srt);
assert(doc.kind === 'srt', 'SRT kind detected');
const blocks = doc.blocks.filter((b) => b.lines.length);
assert(blocks.length === 2, `2 translatable cues parsed (got ${blocks.length})`);
const translated = await translateDocument(doc, async (t) => `[ترجمة] ${t}`);
assert(translated.includes('00:00:01,000 --> 00:00:03,000'), 'timestamp preserved');
assert(translated.includes('[ترجمة] Hello my friend'), 'text translated');
assert(buildTranslatedFileName('movie.srt', 'ar') === 'movie.ar.srt', 'output filename built');

const txt = parseDocument('notes.txt', 'First paragraph.\n\nSecond paragraph.');
assert(txt.blocks.filter((b) => b.lines.length).length === 2, 'TXT paragraphs split');

console.log('▸ phrasebook & flashcards (Leitner)');
assert(BUILTIN_PHRASES.length >= 40, `${BUILTIN_PHRASES.length} built-in phrases`);
assert(PHRASE_CATEGORIES.length === 8, '8 phrase categories');
assert(phraseInLanguage(BUILTIN_PHRASES[0], 'ar').length > 0, 'Arabic phrase resolves');
addFlashcard({ front: 'hello', back: 'مرحبا', frontLang: 'en', backLang: 'ar' });
assert(getDueFlashcards().length === 1, 'new card is due immediately');
const card = getFlashcards()[0];
rateFlashcard(card.id, true);
assert(getFlashcards()[0].box === 2, 'correct answer moves card to box 2');
assert(getDueFlashcards().length === 0, 'card no longer due after promotion');
rateFlashcard(card.id, false);
assert(getFlashcards()[0].box === 1, 'wrong answer resets to box 1');

console.log('▸ usage statistics');
resetUsageStats();
recordTranslation({ chars: 10, from: 'ar', to: 'en', engine: 'neural', kind: 'neural' });
recordTranslation({ chars: 20, from: 'ar', to: 'en', engine: 'online', kind: 'text' });
recordTranslation({ chars: 5, from: 'en', to: 'ar', engine: 'offline', kind: 'voice' });
const summary = summarizeStats();
assert(summary.total === 3, `3 translations counted (got ${summary.total})`);
assert(summary.neural === 1, 'neural translation counted');
assert(summary.voice === 1, 'voice translation counted');
assert(summary.streak === 1, 'streak starts at 1');
assert(summary.last14Days.length === 14, '14-day series built');
assert(summary.topPairs[0].pair === 'ar→en', 'top pair ranked');

console.log(failures === 0 ? '\n✅ ALL v4 LOGIC TESTS PASSED' : `\n❌ ${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
