import { OfflinePack, OfflinePackType } from './types.ts';

const STORAGE_KEY = 'mahdi_offline_packs_v1';

// Initial pre-configured catalog of packs
export const INITIAL_PACKS_CATALOG: OfflinePack[] = [
  // Arabic Packs
  {
    id: 'ar-text',
    langCode: 'ar',
    langName: 'Arabic',
    langNative: 'العربية',
    type: 'text',
    typeNameAr: 'حزمة الترجمة النصية الفورية',
    sizeMB: 78,
    version: '3.4.1',
    status: 'downloaded',
    progress: 100,
    checksum: 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    lastUpdated: '2026-03-10',
    isEssential: true,
  },
  {
    id: 'ar-dialects',
    langCode: 'ar',
    langName: 'Arabic',
    langNative: 'العربية',
    type: 'dialects',
    typeNameAr: 'حزمة اللهجات (عراقي، مصري، شامي، خليجي، مغربي)',
    sizeMB: 54,
    version: '2.8.0',
    status: 'downloaded',
    progress: 100,
    checksum: 'sha256:8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4',
    lastUpdated: '2026-03-12',
    isEssential: true,
  },
  {
    id: 'ar-voice',
    langCode: 'ar',
    langName: 'Arabic',
    langNative: 'العربية',
    type: 'voice',
    typeNameAr: 'حزمة الصوت والنطق (Whisper + Piper TTS)',
    sizeMB: 245,
    version: '3.1.0',
    status: 'available',
    progress: 0,
    checksum: 'sha256:ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
    lastUpdated: '2026-02-28',
  },
  {
    id: 'ar-ocr',
    langCode: 'ar',
    langName: 'Arabic',
    langNative: 'العربية',
    type: 'ocr',
    typeNameAr: 'حزمة الكاميرا البصرية والخطوط العربية (OCR)',
    sizeMB: 138,
    version: '2.2.4',
    status: 'available',
    progress: 0,
    checksum: 'sha256:4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
    lastUpdated: '2026-03-01',
  },
  {
    id: 'ar-llm',
    langCode: 'ar',
    langName: 'Arabic',
    langNative: 'العربية',
    type: 'llm',
    typeNameAr: 'نموذج محلي ذكي (Phi-3 Mini Mahdi Quantized INT8)',
    sizeMB: 590,
    version: '4.0.0',
    status: 'available',
    progress: 0,
    checksum: 'sha256:ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d',
    lastUpdated: '2026-03-05',
  },
  {
    id: 'ar-glossary',
    langCode: 'ar',
    langName: 'Arabic',
    langNative: 'العربية',
    type: 'glossary',
    typeNameAr: 'حزمة المعاجم الطبية والقانونية والتراثية',
    sizeMB: 42,
    version: '1.9.0',
    status: 'available',
    progress: 0,
    checksum: 'sha256:d82c4299f3d4feb7673eee97c6ac94726b286f700dac92b93402300b61a9e8e0',
    lastUpdated: '2026-03-08',
  },

  // English Packs
  {
    id: 'en-text',
    langCode: 'en',
    langName: 'English',
    langNative: 'English',
    type: 'text',
    typeNameAr: 'حزمة الترجمة النصية الفورية (MarianMT)',
    sizeMB: 82,
    version: '3.5.0',
    status: 'downloaded',
    progress: 100,
    checksum: 'sha256:01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca546b',
    lastUpdated: '2026-03-11',
    isEssential: true,
  },
  {
    id: 'en-voice',
    langCode: 'en',
    langName: 'English',
    langNative: 'English',
    type: 'voice',
    typeNameAr: 'حزمة الصوت والتعرف على الكلام (Whisper Small)',
    sizeMB: 260,
    version: '3.2.0',
    status: 'available',
    progress: 0,
    checksum: 'sha256:2c6ee81c3e3906a5b28a8d11c750e640b7952a2221b6d05f31c81729b46e3368',
    lastUpdated: '2026-03-02',
  },
  {
    id: 'en-dialects',
    langCode: 'en',
    langName: 'English',
    langNative: 'English',
    type: 'dialects',
    typeNameAr: 'لهجات الإنجليزية (أمريكي، بريطاني، أسترالي)',
    sizeMB: 38,
    version: '1.8.0',
    status: 'available',
    progress: 0,
    checksum: 'sha256:4e07408562bedb8b60ce05c1decfe3ad16b72230967de01f640b7e4729b49fce',
    lastUpdated: '2026-02-25',
  },
  {
    id: 'en-llm',
    langCode: 'en',
    langName: 'English',
    langNative: 'English',
    type: 'llm',
    typeNameAr: 'نموذج محلي فائق الدقة (Gemma 2B INT4)',
    sizeMB: 512,
    version: '2.4.0',
    status: 'available',
    progress: 0,
    checksum: 'sha256:4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
    lastUpdated: '2026-03-01',
  },

  // French Packs
  {
    id: 'fr-text',
    langCode: 'fr',
    langName: 'French',
    langNative: 'Français',
    type: 'text',
    typeNameAr: 'حزمة الترجمة النصية الفرنسية',
    sizeMB: 76,
    version: '2.9.0',
    status: 'available',
    progress: 0,
    checksum: 'sha256:7b52009b64fd0a2a49e6d8a939753077792b0554aca5edd06e65b5814dcf5f3f',
    lastUpdated: '2026-02-20',
    isEssential: true,
  },
  {
    id: 'fr-voice',
    langCode: 'fr',
    langName: 'French',
    langNative: 'Français',
    type: 'voice',
    typeNameAr: 'حزمة النطق والكلام الفرنسي',
    sizeMB: 230,
    version: '2.1.0',
    status: 'available',
    progress: 0,
    checksum: 'sha256:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    lastUpdated: '2026-02-18',
  },

  // Spanish Packs
  {
    id: 'es-text',
    langCode: 'es',
    langName: 'Spanish',
    langNative: 'Español',
    type: 'text',
    typeNameAr: 'حزمة الترجمة النصية الإسبانية',
    sizeMB: 79,
    version: '3.0.0',
    status: 'available',
    progress: 0,
    checksum: 'sha256:49960de5880e8c687434170f6476605b8fe4aeb9a28632c7995cf3ba831d9763',
    lastUpdated: '2026-03-04',
    isEssential: true,
  },

  // German Packs
  {
    id: 'de-text',
    langCode: 'de',
    langName: 'German',
    langNative: 'Deutsch',
    type: 'text',
    typeNameAr: 'حزمة الترجمة الألمانية التخصصية',
    sizeMB: 84,
    version: '2.7.0',
    status: 'available',
    progress: 0,
    checksum: 'sha256:6e340b9cffb37a989ca544e6bb780a2c78901d3fb33738768511a30617afa01d',
    lastUpdated: '2026-02-27',
  },

  // Turkish Packs
  {
    id: 'tr-text',
    langCode: 'tr',
    langName: 'Turkish',
    langNative: 'Türkçe',
    type: 'text',
    typeNameAr: 'حزمة الترجمة التركية الفورية',
    sizeMB: 72,
    version: '2.5.0',
    status: 'available',
    progress: 0,
    checksum: 'sha256:5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    lastUpdated: '2026-03-06',
  },

  // Chinese & Japanese
  {
    id: 'zh-text',
    langCode: 'zh',
    langName: 'Chinese',
    langNative: '中文',
    type: 'text',
    typeNameAr: 'حزمة الترجمة الصينية (مبسطة وكانتونية)',
    sizeMB: 110,
    version: '3.1.0',
    status: 'available',
    progress: 0,
    checksum: 'sha256:3b97b0a701fa1689255018617d5c95e1e124806a6b5a3fa8d5781a8b94541743',
    lastUpdated: '2026-03-03',
  },
  {
    id: 'ja-text',
    langCode: 'ja',
    langName: 'Japanese',
    langNative: '日本語',
    type: 'text',
    typeNameAr: 'حزمة الترجمة اليابانية وكانجي',
    sizeMB: 105,
    version: '3.0.0',
    status: 'available',
    progress: 0,
    checksum: 'sha256:2d711642b726b04401627ca9fbac32f5c8b9001d6d106a736c7fa7a5345b3032',
    lastUpdated: '2026-03-07',
  },
];

let packsState: OfflinePack[] = (() => {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load packs from storage:', e);
    }
  }
  return INITIAL_PACKS_CATALOG;
})();

const listeners: Set<() => void> = new Set();
const activeDownloadIntervals: Map<string, number> = new Map();

function notify() {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(packsState));
    } catch (e) {
      console.warn('Failed to save packs state:', e);
    }
  }
  listeners.forEach(cb => cb());
}

export function subscribeToPacks(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function getOfflinePacks(): OfflinePack[] {
  return [...packsState];
}

export function getTotalDownloadedSizeMB(): number {
  return packsState
    .filter(p => p.status === 'downloaded')
    .reduce((sum, p) => sum + p.sizeMB, 0);
}

export function isLanguageDownloaded(langCode: string, type: OfflinePackType = 'text'): boolean {
  return packsState.some(
    p => p.langCode === langCode && p.type === type && p.status === 'downloaded'
  );
}

/**
 * Simulates real high-speed background downloading of language packs
 */
export function startDownloadPack(packId: string) {
  const packIndex = packsState.findIndex(p => p.id === packId);
  if (packIndex === -1) return;

  const pack = packsState[packIndex];
  if (pack.status === 'downloaded') return;

  // Clear any existing timer
  if (activeDownloadIntervals.has(packId)) {
    window.clearInterval(activeDownloadIntervals.get(packId));
    activeDownloadIntervals.delete(packId);
  }

  packsState[packIndex] = {
    ...pack,
    status: 'downloading',
    progress: Math.max(pack.progress, 5),
    downloadSpeedMBs: parseFloat((18.5 + Math.random() * 8).toFixed(1)),
  };
  notify();

  const interval = window.setInterval(() => {
    const idx = packsState.findIndex(p => p.id === packId);
    if (idx === -1) {
      window.clearInterval(interval);
      return;
    }

    const current = packsState[idx];
    if (current.status !== 'downloading') {
      window.clearInterval(interval);
      return;
    }

    const step = Math.min(100, current.progress + (8 + Math.random() * 12));
    const speed = parseFloat((16 + Math.random() * 12).toFixed(1));
    const remainingMB = ((100 - step) / 100) * current.sizeMB;
    const remainingSec = Math.max(1, Math.round(remainingMB / speed));

    if (step >= 100) {
      packsState[idx] = {
        ...current,
        status: 'downloaded',
        progress: 100,
        downloadSpeedMBs: undefined,
        remainingSeconds: undefined,
        lastUpdated: new Date().toISOString().split('T')[0],
      };
      window.clearInterval(interval);
      activeDownloadIntervals.delete(packId);
      notify();
    } else {
      packsState[idx] = {
        ...current,
        progress: Math.round(step),
        downloadSpeedMBs: speed,
        remainingSeconds: remainingSec,
      };
      notify();
    }
  }, 450);

  activeDownloadIntervals.set(packId, interval);
}

export function pauseDownloadPack(packId: string) {
  if (activeDownloadIntervals.has(packId)) {
    window.clearInterval(activeDownloadIntervals.get(packId));
    activeDownloadIntervals.delete(packId);
  }

  const packIndex = packsState.findIndex(p => p.id === packId);
  if (packIndex !== -1) {
    packsState[packIndex] = {
      ...packsState[packIndex],
      status: 'paused',
      downloadSpeedMBs: undefined,
      remainingSeconds: undefined,
    };
    notify();
  }
}

export function deletePack(packId: string) {
  if (activeDownloadIntervals.has(packId)) {
    window.clearInterval(activeDownloadIntervals.get(packId));
    activeDownloadIntervals.delete(packId);
  }

  const packIndex = packsState.findIndex(p => p.id === packId);
  if (packIndex !== -1) {
    packsState[packIndex] = {
      ...packsState[packIndex],
      status: 'available',
      progress: 0,
      downloadSpeedMBs: undefined,
      remainingSeconds: undefined,
    };
    notify();
  }
}

export function downloadAllEssentialPacks() {
  packsState.forEach(pack => {
    if (pack.isEssential && pack.status !== 'downloaded') {
      startDownloadPack(pack.id);
    }
  });
}

export function updateAllDownloadedPacks() {
  packsState.forEach(pack => {
    if (pack.status === 'downloaded') {
      startDownloadPack(pack.id);
    }
  });
}

/**
 * Triggers downloading the offline pack for a given language code
 */
export function downloadPackForLanguage(langCode: string): boolean {
  const pack = packsState.find(p => p.langCode === langCode && p.type === 'text') ||
               packsState.find(p => p.langCode === langCode);
  if (pack) {
    startDownloadPack(pack.id);
    return true;
  }
  return false;
}

