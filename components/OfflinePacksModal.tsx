import React, { useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  CheckCircle, 
  Pause, 
  Play, 
  Trash2, 
  RefreshCw, 
  HardDrive, 
  Wifi, 
  ShieldCheck, 
  Search, 
  Sparkles,
  Layers,
  BookOpen,
  Volume2,
  Camera,
  Cpu,
  Bookmark,
  Database
} from 'lucide-react';
import { OfflinePack, OfflinePackType, ThemeConfig } from '../types.ts';
import { 
  getOfflinePacks, 
  subscribeToPacks, 
  startDownloadPack, 
  pauseDownloadPack, 
  deletePack, 
  downloadAllEssentialPacks, 
  updateAllDownloadedPacks,
  getTotalDownloadedSizeMB
} from '../offlinePacksManager.ts';

interface OfflinePacksModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeConfig;
  targetLangCode?: string;
  storageLimitGB?: number;
  onStorageLimitChange?: (limit: number) => void;
}

export const OfflinePacksModal: React.FC<OfflinePacksModalProps> = ({
  isOpen,
  onClose,
  theme,
  targetLangCode,
  storageLimitGB = 32,
  onStorageLimitChange,
}) => {
  const [packs, setPacks] = useState<OfflinePack[]>(getOfflinePacks());
  const [activeNavCategory, setActiveNavCategory] = useState<
    'all' | 'essential' | 'downloaded' | 'downloading' | 'text' | 'voice' | 'ocr' | 'llm' | 'storage'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [totalStorageMB, setTotalStorageMB] = useState<number>(getTotalDownloadedSizeMB());

  useEffect(() => {
    const unsub = subscribeToPacks(() => {
      setPacks(getOfflinePacks());
      setTotalStorageMB(getTotalDownloadedSizeMB());
    });
    return unsub;
  }, []);

  if (!isOpen) return null;

  const usedGB = (totalStorageMB / 1024).toFixed(2);
  const usedPercent = Math.min(100, Math.round((totalStorageMB / (storageLimitGB * 1024)) * 100));
  const downloadedCount = packs.filter(p => p.status === 'downloaded').length;
  const downloadingCount = packs.filter(p => p.status === 'downloading').length;

  const filteredPacks = packs.filter(p => {
    if (activeNavCategory === 'downloaded' && p.status !== 'downloaded') return false;
    if (activeNavCategory === 'downloading' && p.status !== 'downloading') return false;
    if (activeNavCategory === 'essential' && !p.isEssential) return false;
    if (activeNavCategory === 'text' && p.type !== 'text') return false;
    if (activeNavCategory === 'voice' && p.type !== 'voice') return false;
    if (activeNavCategory === 'ocr' && p.type !== 'ocr') return false;
    if (activeNavCategory === 'llm' && p.type !== 'llm') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.langNative.toLowerCase().includes(q) ||
        p.langName.toLowerCase().includes(q) ||
        p.typeNameAr.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const sidebarCategories = [
    { id: 'all', label: 'جميع الحزم', icon: Layers, count: packs.length },
    { id: 'essential', label: 'الحزم الأساسية', icon: Sparkles, count: packs.filter(p => p.isEssential).length },
    { id: 'downloaded', label: 'المحمّلة على الهاتف', icon: CheckCircle, count: downloadedCount },
    { id: 'downloading', label: 'قيد التنزيل', icon: RefreshCw, count: downloadingCount },
    { id: 'text', label: 'قواميس النصوص', icon: BookOpen, count: packs.filter(p => p.type === 'text').length },
    { id: 'voice', label: 'حزم الأصوات والنطق', icon: Volume2, count: packs.filter(p => p.type === 'voice').length },
    { id: 'ocr', label: 'كاميرا وصور OCR', icon: Camera, count: packs.filter(p => p.type === 'ocr').length },
    { id: 'llm', label: 'ذكاء اصطناعي محلي', icon: Cpu, count: packs.filter(p => p.type === 'llm').length },
    { id: 'storage', label: 'السعة والتخزين', icon: HardDrive, count: null },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col w-full h-full bg-zinc-950/98 text-white backdrop-blur-2xl animate-in slide-in-from-bottom-4 duration-300 overflow-hidden">
      <div 
        className={`w-full h-full flex flex-col ${theme.card} ${theme.text} overflow-hidden`}
        dir="rtl"
      >
        {/* Top Header - Full Width Sticky */}
        <div className="flex items-center justify-between px-4 sm:px-8 py-3.5 border-b border-white/10 bg-black/30 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 sm:p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight">حزم اللغات بدون إنترنت (Offline Packs)</h2>
                <span className="px-2 py-0.5 text-[10px] sm:text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {downloadedCount} لغة جاهزة
                </span>
              </div>
              <p className="text-[11px] opacity-65 hidden sm:block">
                ترجمة فورية ونطق ذكي وكاميرا بدون استهلاك رصيد أو اتصال بالإنترنت بشاشة كاملة وسلسة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadAllEssentialPacks()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-all active:scale-95"
              title="تحميل جميع الحزم الموصى بها تلقائياً"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">تحميل الأساسيات</span>
            </button>

            <button
              onClick={() => updateAllDownloadedPacks()}
              title="تحديث الحزم المحملة"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 transition-all active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button 
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-200 hover:text-white transition-all text-xs font-bold flex items-center gap-1.5 active:scale-95"
              title="إغلاق والعودة"
            >
              <X className="w-4 h-4" />
              <span>إغلاق</span>
            </button>
          </div>
        </div>

        {/* Modal Structure: Sidebar (Right) + Main Content (Left) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* THE LATERAL SIDEBAR (الشريط الجانبي الأنيق لأزرار الحزم) */}
          <aside className="w-full md:w-64 border-b md:border-b-0 md:border-l border-white/10 bg-black/15 flex md:flex-col overflow-x-auto md:overflow-y-auto p-2 sm:p-3 gap-1 shrink-0 no-scrollbar">
            <div className="hidden md:flex items-center justify-between px-2 py-1 mb-1">
              <span className="text-[11px] font-bold opacity-50 uppercase tracking-wider">الأقسام والفئات</span>
              <Database className="w-3.5 h-3.5 opacity-40" />
            </div>

            {sidebarCategories.map(cat => {
              const Icon = cat.icon;
              const isActive = activeNavCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveNavCategory(cat.id as any)}
                  className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all shrink-0 md:w-full text-right ${
                    isActive
                      ? 'bg-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-500/20'
                      : 'bg-white/[0.02] md:bg-transparent hover:bg-white/10 text-zinc-300 opacity-80 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-zinc-950' : 'text-amber-400/80'}`} />
                    <span className="whitespace-nowrap">{cat.label}</span>
                  </div>
                  {cat.count !== null && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                      isActive ? 'bg-zinc-900/20 text-zinc-950' : 'bg-white/10 text-zinc-400'
                    }`}>
                      {cat.count}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Storage quick status in sidebar footer on desktop */}
            <div className="hidden md:block mt-auto pt-3 border-t border-white/10 p-2 text-[11px] space-y-1.5 opacity-80">
              <div className="flex justify-between font-medium">
                <span>المساحة:</span>
                <span className="text-amber-400 font-bold">{usedGB} GB</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full"
                  style={{ width: `${Math.max(3, usedPercent)}%` }}
                />
              </div>
              <div className="flex items-center gap-1 text-[10px] text-emerald-400">
                <Wifi className="w-3 h-3" />
                <span>جاهز للعمل التلقائي أوفلاين</span>
              </div>
            </div>
          </aside>

          {/* MAIN CONTENT AREA */}
          <main className="flex-1 flex flex-col overflow-hidden">
            
            {/* Search and Global Quick Bar */}
            <div className="p-3 sm:p-4 border-b border-white/5 bg-black/5 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="relative flex-1 min-w-[180px] max-w-md">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 opacity-50" />
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث عن لغة، لهجة، أو نوع الحزمة..."
                  className="w-full pl-3 pr-9 py-1.5 text-xs rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="flex items-center gap-3 text-xs opacity-75">
                <span className="flex items-center gap-1 text-amber-300 text-[11px] font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>تخزين مشفر محلياً على جهازك</span>
                </span>
              </div>
            </div>

            {/* STORAGE & SETTINGS VIEW (If user selected storage in sidebar) */}
            {activeNavCategory === 'storage' ? (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                  <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                    <HardDrive className="w-4 h-4" />
                    <span>إدارة مساحة الذاكرة التخزينية للحزم</span>
                  </h3>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span>إجمالي المساحة المستخدمة حالياً:</span>
                      <strong className="text-amber-400 text-sm">{usedGB} GB ({totalStorageMB} MB)</strong>
                    </div>
                    <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all"
                        style={{ width: `${Math.max(2, usedPercent)}%` }}
                      />
                    </div>
                    <span className="opacity-60 text-[11px] block">
                      المساحة المحددة للحزم: {storageLimitGB} جيجابايت
                    </span>
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (window.confirm('هل تريد حذف جميع الحزم المحملة لتفريغ المساحة؟')) {
                          packs.filter(p => p.status === 'downloaded').forEach(p => deletePack(p.id));
                        }
                      }}
                      className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-bold flex items-center gap-1.5 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>تفريغ مساحة جميع الحزم المحملة</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* PACKS LIST VIEW */
              <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-2.5">
                {filteredPacks.length === 0 ? (
                  <div className="py-16 text-center opacity-60 flex flex-col items-center gap-2">
                    <Layers className="w-10 h-10 opacity-30" />
                    <p className="text-xs">لم يتم العثور على حزم مطابقة لهذا القسم أو البحث</p>
                  </div>
                ) : (
                  filteredPacks.map(pack => {
                    const isDownloaded = pack.status === 'downloaded';
                    const isDownloading = pack.status === 'downloading';
                    const isPaused = pack.status === 'paused';

                    return (
                      <div 
                        key={pack.id}
                        className="p-3 sm:p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={`p-2.5 rounded-2xl shrink-0 mt-0.5 ${
                            isDownloaded 
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                              : isDownloading
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                              : 'bg-white/5 text-zinc-400 border border-white/10'
                          }`}>
                            {isDownloaded ? <CheckCircle className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-xs sm:text-sm">{pack.langNative}</h4>
                              <span className="text-xs opacity-60">({pack.langName})</span>
                              {pack.isEssential && (
                                <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                  موصى به
                                </span>
                              )}
                              <span className="px-1.5 py-0.5 text-[9px] rounded-md bg-white/5 font-mono text-zinc-400">
                                {pack.sizeMB} MB
                              </span>
                            </div>

                            <p className="text-[11px] opacity-70 mt-0.5 truncate">
                              {pack.typeNameAr} • {pack.descriptionAr}
                            </p>

                            {/* Download Progress Bar */}
                            {isDownloading && (
                              <div className="mt-2 space-y-1">
                                <div className="flex justify-between text-[10px]">
                                  <span className="text-amber-400 font-bold">جاري التنزيل والتثبيت...</span>
                                  <span className="font-mono">{pack.progress}%</span>
                                </div>
                                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                                  <div 
                                    className="h-full bg-amber-500 rounded-full transition-all duration-200"
                                    style={{ width: `${pack.progress}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                          {isDownloaded ? (
                            <>
                              <span className="text-emerald-400 text-xs font-bold flex items-center gap-1 pl-2">
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>مثبت محلياً</span>
                              </span>
                              <button
                                onClick={() => deletePack(pack.id)}
                                className="p-1.5 rounded-xl hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition-colors"
                                title="حذف الحزمة لتفريغ المساحة"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : isDownloading ? (
                            <button
                              onClick={() => pauseDownloadPack(pack.id)}
                              className="px-2.5 py-1 text-xs font-bold rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 flex items-center gap-1"
                            >
                              <Pause className="w-3 h-3" />
                              <span>إيقاف مؤقت</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => startDownloadPack(pack.id)}
                              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 flex items-center gap-1 transition-all active:scale-95 shadow-sm"
                            >
                              <Download className="w-3 h-3" />
                              <span>تنزيل</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};
