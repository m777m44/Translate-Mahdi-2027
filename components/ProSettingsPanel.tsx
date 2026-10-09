import React, { useState, useEffect } from 'react';
import { 
  X, 
  Settings, 
  Languages, 
  Download, 
  Volume2, 
  Palette, 
  Shield, 
  User, 
  Cloud, 
  Sliders, 
  Info,
  Search,
  Check,
  RotateCcw,
  Upload,
  HardDrive,
  Wifi,
  Sparkles,
  Lock,
  Sun,
  Moon,
  Trash2,
  Save,
  CheckCircle,
  ExternalLink,
  Play,
  ArrowUp,
  ArrowDown,
  LayoutGrid,
  Layers,
  FileSpreadsheet,
  Globe,
  SlidersHorizontal,
  LogOut,
  RefreshCw,
  Users,
  Scale,
  History,
  ArrowRightLeft,
  Camera,
  Image as ImageIcon
} from 'lucide-react';
import { 
  AppSettings, 
  ThemeConfig, 
  TtsSettings, 
  ZoomLevel, 
  TranslationHistoryItem,
  DomainCode,
  ToneCode,
  DialectCode,
  CustomThemeSettings
} from '../types.ts';
import { ThemeGallery } from './ThemeGallery.tsx';
import { DOMAINS, TONES, DIALECTS } from '../constants.ts';
import { 
  getOfflinePacks, 
  subscribeToPacks, 
  startDownloadPack, 
  deletePack,
  getTotalDownloadedSizeMB,
  downloadAllEssentialPacks
} from '../offlinePacksManager.ts';
import { 
  getStoredGoogleUser, 
  signInWithGoogle, 
  signOutGoogle, 
  setCloudSyncEnabled, 
  syncWithGoogleCloud,
  GoogleUserProfile 
} from '../googleAuthService.ts';
import { speakText } from '../geminiService.ts';

interface ProSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  appSettings: AppSettings;
  onUpdateAppSettings: (newSettings: AppSettings) => void;
  currentTheme: ThemeConfig;
  onSelectTheme: (theme: ThemeConfig) => void;
  history: TranslationHistoryItem[];
  onClearHistory: () => void;
  onRestoreLastTranslation: () => void;
  lastItem: TranslationHistoryItem | null;
  forceOffline: boolean;
  onToggleForceOffline: (val: boolean) => void;
  zoom: ZoomLevel;
  onChangeZoom: (zoom: ZoomLevel) => void;
  ttsSettings: TtsSettings;
  onChangeTtsSettings: (settings: TtsSettings) => void;
  availableVoices: string[];
  // Selected precision filters
  selectedDomain?: DomainCode;
  onChangeDomain?: (d: DomainCode) => void;
  selectedTone?: ToneCode;
  onChangeTone?: (t: ToneCode) => void;
  selectedDialect?: DialectCode;
  onChangeDialect?: (dl: DialectCode) => void;
  // Toolbar layout
  toolbarOrientation?: 'horizontal' | 'vertical';
  onChangeToolbarOrientation?: (orient: 'horizontal' | 'vertical') => void;
  toolbarButtonsOrder?: string[];
  onChangeToolbarButtonsOrder?: (order: string[]) => void;
  // Direct Tools Handlers & State
  onOpenConversation?: () => void;
  onOpenImage?: () => void;
  isFloatingOpen?: boolean;
  onToggleFloating?: () => void;
  onOpenOfflinePacks?: () => void;
  downloadedPacksCount?: number;
  onOpenComparison?: () => void;
  onOpenAnalysis?: () => void;
  onOpenHistory?: () => void;
  inputText?: string;
  defaultCategory?: 'tools' | 'general' | 'linguistics' | 'translation' | 'offline' | 'voice' | 'account' | 'buttons' | 'appearance' | 'privacy' | 'about';
}

export const ProSettingsPanel: React.FC<ProSettingsPanelProps> = ({
  isOpen,
  onClose,
  appSettings,
  onUpdateAppSettings,
  currentTheme,
  onSelectTheme,
  history,
  onClearHistory,
  forceOffline,
  onToggleForceOffline,
  zoom,
  onChangeZoom,
  ttsSettings,
  onChangeTtsSettings,
  availableVoices,
  selectedDomain = 'general',
  onChangeDomain,
  selectedTone = 'standard',
  onChangeTone,
  selectedDialect = 'msa',
  onChangeDialect,
  toolbarOrientation = 'horizontal',
  onChangeToolbarOrientation,
  toolbarButtonsOrder = ['floating', 'image', 'conversation', 'packs', 'analysis', 'compare', 'history'],
  onChangeToolbarButtonsOrder,
  onOpenConversation,
  onOpenImage,
  isFloatingOpen = false,
  onToggleFloating,
  onOpenOfflinePacks,
  downloadedPacksCount = 0,
  onOpenComparison,
  onOpenAnalysis,
  onOpenHistory,
  inputText = '',
  defaultCategory = 'tools',
}) => {
  // Sidebar Navigation Categories
  const [activeCategory, setActiveCategory] = useState<
    'tools' | 'general' | 'linguistics' | 'translation' | 'offline' | 'voice' | 'account' | 
    'buttons' | 'appearance' | 'privacy' | 'about'
  >(defaultCategory);

  useEffect(() => {
    if (isOpen && defaultCategory) {
      setActiveCategory(defaultCategory);
    }
  }, [isOpen, defaultCategory]);

  const [searchQuery, setSearchQuery] = useState('');
  const [showSavedNotification, setShowSavedNotification] = useState(false);
  const [offlinePacks, setOfflinePacks] = useState(getOfflinePacks());
  const [themeSearch, setThemeSearch] = useState<string>('');
  const [googleUser, setGoogleUser] = useState<GoogleUserProfile | null>(getStoredGoogleUser());
  const [isSyncing, setIsSyncing] = useState(false);
  const [previewVoicePlaying, setPreviewVoicePlaying] = useState(false);

  useEffect(() => {
    const unsub = subscribeToPacks(() => {
      setOfflinePacks(getOfflinePacks());
    });
    return unsub;
  }, []);

  if (!isOpen) return null;

  const handleUpdate = (partial: Partial<AppSettings>) => {
    const updated = { ...appSettings, ...partial };
    onUpdateAppSettings(updated);
    setShowSavedNotification(true);
    setTimeout(() => setShowSavedNotification(false), 1200);
  };

  // Voice Preview Handler
  const handlePreviewVoice = async (sampleLang: 'ar' | 'en' = 'ar') => {
    setPreviewVoicePlaying(true);
    const text = sampleLang === 'ar' 
      ? 'أهلاً بك! هذه معاينة فورية لنقاء ونبرة صوت محرك مهدي الذكي.' 
      : 'Hello! This is an instant voice preview for Mahdi Translator.';
    try {
      await speakText(text, sampleLang, ttsSettings);
    } finally {
      setPreviewVoicePlaying(false);
    }
  };

  // Google Sign-In Handler
  const handleGoogleSignIn = async () => {
    const profile = await signInWithGoogle();
    setGoogleUser(profile);
    setShowSavedNotification(true);
    setTimeout(() => setShowSavedNotification(false), 1500);
  };

  const handleGoogleSignOut = () => {
    signOutGoogle();
    setGoogleUser(null);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const res = await syncWithGoogleCloud({
        historyCount: history.length,
        favoritesCount: history.filter(h => h.isFavorite).length,
        themeId: currentTheme.id,
      });
      if (res.success && googleUser) {
        setGoogleUser({ ...googleUser, lastSyncedAt: res.syncedAt });
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Reorder toolbar buttons handler
  const moveToolbarButton = (index: number, direction: 'up' | 'down') => {
    if (!onChangeToolbarButtonsOrder) return;
    const newOrder = [...toolbarButtonsOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;
    onChangeToolbarButtonsOrder(newOrder);
  };

  const buttonLabels: Record<string, string> = {
    floating: 'النافذة العائمة على الشاشة',
    image: 'ترجمة الصور والكاميرا OCR',
    conversation: 'المحادثة الصوتية الثنائية',
    packs: 'حزم اللغات بدون إنترنت',
    analysis: 'التحليل اللغوي الذكي ✨',
    compare: 'مقارنة المحركات الثلاثية ⚖️',
    history: 'سجل الترجمات والمفضلة',
  };

  // Sidebar Tabs Config
  const sidebarTabs = [
    { id: 'tools', label: 'الأدوات والميزات الذكية', icon: Sparkles, badge: 'رئيسي', count: 8 },
    { id: 'linguistics', label: 'المجال والنبرة واللهجة', icon: SlidersHorizontal, badge: 'V3' },
    { id: 'general', label: 'عام وتفضيلات', icon: Settings },
    { id: 'offline', label: 'حزم بدون إنترنت', icon: Download, count: downloadedPacksCount || offlinePacks.filter(p => p.status === 'downloaded').length },
    { id: 'translation', label: 'محركات الترجمة', icon: Languages },
    { id: 'voice', label: 'الصوت ومعاينة النطق', icon: Volume2 },
    { id: 'buttons', label: 'ترتيب وأبعاد الأزرار', icon: LayoutGrid },
    { id: 'account', label: 'حساب Google والسحابة', icon: Cloud, badge: googleUser ? 'متصل' : undefined },
    { id: 'appearance', label: 'الثيمات والواجهة (1500+)', icon: Palette },
    { id: 'privacy', label: 'الأمان والخصوصية', icon: Shield },
    { id: 'about', label: 'حول مهدي V3', icon: Info },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col w-full h-full mt-sheet overflow-hidden">
      <div 
        className={`w-full h-full flex flex-col ${currentTheme.card} ${currentTheme.text} overflow-hidden`}
        dir="rtl"
      >
        {/* Top Header - Full Width Sticky */}
        <div className="flex items-center justify-between px-4 sm:px-8 py-3.5 border-b mt-hairline mt-sheet-header shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 rounded-2xl mt-accent-soft mt-accent-text border mt-hairline">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight">إعدادات مهدي الاحترافية (Mahdi Settings)</h2>
                <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-md mt-accent-soft mt-accent-text border mt-hairline">
                  PRO V3
                </span>
                {showSavedNotification && (
                  <span className="text-[11px] mt-accent-text font-bold flex items-center gap-1 animate-in fade-in">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>تم الحفظ</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] opacity-65 hidden sm:block">
                شاشة ممتلئة وسلسة للتحكم في كافة الأدوات والميزات والترجمة بدون تقطيع
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl mt-surface-soft hover:bg-[var(--mt-surface)] hover:text-[var(--mt-text)] transition-all text-xs font-bold flex items-center gap-1.5 active:scale-95"
              title="إغلاق والعودة لشاشة الترجمة"
            >
              <X className="w-4 h-4" />
              <span>إغلاق</span>
            </button>
          </div>
        </div>

        {/* Body with LATERAL SIDEBAR on Right and Content on Left */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* THE LATERAL SIDEBAR (الشريط الجانبي الأنيق للأزرار) */}
          <aside className="w-full md:w-64 border-b md:border-b-0 md:border-l mt-hairline bg-black/15 flex md:flex-col overflow-x-auto md:overflow-y-auto p-2 sm:p-3 gap-1 shrink-0 no-scrollbar">
            <div className="hidden md:flex items-center justify-between px-2 py-1 mb-1">
              <span className="text-[11px] font-bold opacity-50 uppercase tracking-wider">لوحة التحكم</span>
              <Settings className="w-3.5 h-3.5 opacity-40" />
            </div>

            {sidebarTabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeCategory === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveCategory(tab.id as any)}
                  className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all shrink-0 md:w-full text-right ${
                    isActive
                      ? 'mt-btn-primary font-bold shadow-md shadow-amber-500/20'
                      : 'mt-surface-soft md:bg-transparent hover:bg-[var(--mt-surface)] mt-subtext opacity-80 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${isActive ? '' : 'mt-accent-text/80'}`} />
                    <span className="whitespace-nowrap">{tab.label}</span>
                  </div>
                  {tab.badge && (
                    <span className={`text-[9px] px-1.5 py-0.2 rounded-md font-bold ${
                      isActive ? 'mt-surface-soft mt-accent-text' : 'mt-accent-soft mt-accent-text'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                  {tab.count !== undefined && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                      isActive ? 'bg-zinc-900/20 ' : 'mt-surface-soft mt-subtext'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </aside>

          {/* MAIN DYNAMIC CONTENT AREA */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 max-w-6xl mx-auto w-full">
            
            {/* 0. SMART TOOLS & FEATURES HUB TAB */}
            {activeCategory === 'tools' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Hero Card */}
                <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-amber-500/15 via-white/[0.03] to-transparent border border-amber-500/25 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 sm:p-3 rounded-2xl mt-accent-soft mt-accent-text border mt-hairline">
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg font-bold mt-accent-text">أدوات وميزات مهدي الاحترافية (Tools & Features Hub)</h3>
                        <p className="text-xs mt-subtext/80">
                          جميع ميزات التطبيق المتقدمة منظمة بأناقة وسهولة، مع وصول فوري وتشغيل مباشر
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1 text-xs font-bold rounded-xl mt-accent-soft mt-accent-text border mt-hairline">
                      8 ميزات وأدوات احترافية
                    </span>
                  </div>
                </div>

                {/* The 8 Requested Buttons Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 1. عمودي ↕ / أفقي ↔ (تبديل اتجاه الواجهة والأزرار) */}
                  <div className="p-5 rounded-2xl mt-surface-soft hover:bg-[var(--mt-surface)] border mt-hairline hover:border-[var(--mt-border-strong)] transition-all flex flex-col justify-between gap-4 shadow-lg">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl mt-accent-soft mt-accent-text border mt-hairline">
                            <ArrowRightLeft className={`w-5 h-5 ${toolbarOrientation === 'vertical' ? 'rotate-90' : ''}`} />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm sm:text-base text-amber-200">
                              {toolbarOrientation === 'vertical' ? 'عمودي ↕' : 'أفقي ↔'}
                            </h4>
                            <span className="text-[11px] opacity-60">توجيه الأزرار وشريط الأدوات</span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-lg mt-accent-soft mt-accent-text border mt-hairline">
                          {toolbarOrientation === 'vertical' ? 'نمط عمودي ↕' : 'نمط أفقي ↔'}
                        </span>
                      </div>
                      <p className="text-xs mt-subtext/75 leading-relaxed">
                        التبديل الفوري بين التخطيط العمودي المتراص أو التخطيط الأفقي المتسع لشريط الأدوات والتحكم.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const next = toolbarOrientation === 'horizontal' ? 'vertical' : 'horizontal';
                        if (onChangeToolbarOrientation) onChangeToolbarOrientation(next);
                      }}
                      className="w-full py-2.5 px-4 rounded-xl mt-btn-primary font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-98"
                    >
                      <ArrowRightLeft className={`w-4 h-4 ${toolbarOrientation === 'vertical' ? 'rotate-90' : ''}`} />
                      <span>التحويل إلى: {toolbarOrientation === 'horizontal' ? 'عمودي ↕' : 'أفقي ↔'}</span>
                    </button>
                  </div>

                  {/* 2. محادثة صوتية 🎙️ */}
                  <div className="p-5 rounded-2xl mt-surface-soft hover:bg-[var(--mt-surface)] border mt-hairline hover:border-sky-500/40 transition-all flex flex-col justify-between gap-4 shadow-lg">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-sky-500/20 mt-accent-text border border-sky-500/30">
                            <Users className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm sm:text-base text-sky-200">محادثة صوتية 🎙️</h4>
                            <span className="text-[11px] opacity-60">صوت-إلى-صوت ثنائي مباشر</span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-sky-500/20 mt-accent-text border border-sky-500/30">
                          محادثة حية
                        </span>
                      </div>
                      <p className="text-xs mt-subtext/75 leading-relaxed">
                        حوار شفهي متزامن وجهاً لوجه بين شخصين بلغتين مختلفتين، مع استماع فوري وترجمة ناطقة تلقائياً.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        onClose();
                        if (onOpenConversation) onOpenConversation();
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-98"
                    >
                      <Users className="w-4 h-4" />
                      <span>تشغيل محادثة صوتية 🎙️</span>
                    </button>
                  </div>

                  {/* 3. نافذة عائمة 🪟 */}
                  <div className="p-5 rounded-2xl mt-surface-soft hover:bg-[var(--mt-surface)] border mt-hairline hover:border-[var(--mt-border-strong)] transition-all flex flex-col justify-between gap-4 shadow-lg">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl mt-accent-soft mt-accent-text border mt-hairline">
                            <Sparkles className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm sm:text-base text-amber-200">نافذة عائمة 🪟</h4>
                            <span className="text-[11px] opacity-60">تطفو فوق المتصفح والشاشات</span>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-lg border ${
                          isFloatingOpen 
                            ? 'mt-accent-soft mt-success-text border-emerald-500/30' 
                            : 'mt-surface-soft mt-subtext mt-hairline'
                        }`}>
                          {isFloatingOpen ? 'نشطة الآن ✓' : 'متوقفة'}
                        </span>
                      </div>
                      <p className="text-xs mt-subtext/75 leading-relaxed">
                        نافذة ترجمة سريعة وصغيرة قابلة للسحب تظل فوق كل النوافذ لترجمة النصوص والمقالات دون تبديل الشاشات.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        if (onToggleFloating) onToggleFloating();
                      }}
                      className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 ${
                        isFloatingOpen
                          ? 'mt-btn-primary hover:bg-amber-400 shadow-amber-500/20'
                          : 'mt-surface-soft hover:bg-[var(--mt-surface)]  border mt-hairline'
                      }`}
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>{isFloatingOpen ? 'إغلاق النافذة العائمة 🪟' : 'تفعيل النافذة العائمة 🪟'}</span>
                    </button>
                  </div>

                  {/* 4. ترجمة الصور والكاميرا 📷 */}
                  <div className="p-5 rounded-2xl mt-surface-soft hover:bg-[var(--mt-surface)] border mt-hairline hover:border-[var(--mt-border-strong)] transition-all flex flex-col justify-between gap-4 shadow-lg">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl mt-accent-soft mt-accent-text border mt-hairline">
                            <Camera className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm sm:text-base text-amber-200">ترجمة الصور والكاميرا 📷</h4>
                            <span className="text-[11px] opacity-60">استخراج وترجمة بصرية OCR</span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-lg mt-accent-soft mt-accent-text border mt-hairline">
                          كاميرا وصور
                        </span>
                      </div>
                      <p className="text-xs mt-subtext/75 leading-relaxed">
                        التقاط صور بالكاميرا أو رفع مستندات ولوحات وإشارات لاستخراج النصوص وترجمتها بدقة فورية.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        onClose();
                        if (onOpenImage) onOpenImage();
                      }}
                      className="w-full py-2.5 px-4 rounded-xl mt-btn-primary font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-98"
                    >
                      <Camera className="w-4 h-4" />
                      <span>فتح ترجمة الصور والكاميرا 📷</span>
                    </button>
                  </div>

                  {/* 5. حزم اللغات (8) */}
                  <div className="p-5 rounded-2xl mt-surface-soft hover:bg-[var(--mt-surface)] border mt-hairline hover:border-emerald-500/40 transition-all flex flex-col justify-between gap-4 shadow-lg">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl mt-accent-soft mt-accent-text border border-emerald-500/30">
                            <Download className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm sm:text-base text-emerald-200">
                              حزم اللغات ({downloadedPacksCount || offlinePacks.filter(p => p.status === 'downloaded').length || 8})
                            </h4>
                            <span className="text-[11px] opacity-60">الترجمة بدون اتصال بالإنترنت</span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-lg mt-accent-soft mt-success-text border border-emerald-500/30">
                          {downloadedPacksCount || offlinePacks.filter(p => p.status === 'downloaded').length || 8} جاهزة
                        </span>
                      </div>
                      <p className="text-xs mt-subtext/75 leading-relaxed">
                        إدارة وتحميل قواميس وحزم اللغات والنماذج المدمجة لترجمة فائقة السرعة بدون أي رصيد أو شبكة إنترنت.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        onClose();
                        if (onOpenOfflinePacks) onOpenOfflinePacks();
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-98"
                    >
                      <Download className="w-4 h-4" />
                      <span>فتح مدير حزم اللغات ({downloadedPacksCount || offlinePacks.filter(p => p.status === 'downloaded').length || 8})</span>
                    </button>
                  </div>

                  {/* 6. مقارنة المحركات ⚖️ */}
                  <div className="p-5 rounded-2xl mt-surface-soft hover:bg-[var(--mt-surface)] border mt-hairline hover:border-indigo-500/40 transition-all flex flex-col justify-between gap-4 shadow-lg">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl mt-accent-soft mt-accent-text border border-indigo-500/30">
                            <Scale className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm sm:text-base text-indigo-200">مقارنة المحركات ⚖️</h4>
                            <span className="text-[11px] opacity-60">مقارنة ثلاثية متزامنة</span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-lg mt-accent-soft text-indigo-300 border border-indigo-500/30">
                          3 محركات
                        </span>
                      </div>
                      <p className="text-xs mt-subtext/75 leading-relaxed">
                        مقارنة دقيقة وفورية لنصك المترجم بين: نموذج مهدي العصبي، نموذج صياغة DeepL، والمحرك القائم على القواعد.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        onClose();
                        if (onOpenComparison) onOpenComparison();
                      }}
                      disabled={!inputText || !inputText.trim()}
                      className="w-full py-2.5 px-4 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 disabled:pointer-events-none font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-98"
                    >
                      <Scale className="w-4 h-4" />
                      <span>{inputText && inputText.trim() ? 'بدء مقارنة المحركات ⚖️' : 'أدخل نصاً في الترجمة أولاً للمقارنة'}</span>
                    </button>
                  </div>

                  {/* 7. التحليل الذكي ✨ */}
                  <div className="p-5 rounded-2xl mt-surface-soft hover:bg-[var(--mt-surface)] border mt-hairline hover:border-[var(--mt-border-strong)] transition-all flex flex-col justify-between gap-4 shadow-lg">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl mt-accent-soft mt-accent-text border mt-hairline">
                            <Sparkles className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm sm:text-base text-amber-200">التحليل الذكي ✨</h4>
                            <span className="text-[11px] opacity-60">تحليل لغوي وبدائل دقيقة</span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-lg mt-accent-soft mt-accent-text border mt-hairline">
                          ذكاء فائق
                        </span>
                      </div>
                      <p className="text-xs mt-subtext/75 leading-relaxed">
                        فحص بلاغي وسياقي للنص مع توضيح الفروق الدقيقة، بدائل مرادفة، والسياق الثقافي لكل مصطلح.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        onClose();
                        if (onOpenAnalysis) onOpenAnalysis();
                      }}
                      disabled={!inputText || !inputText.trim()}
                      className="w-full py-2.5 px-4 rounded-xl mt-btn-primary disabled:opacity-40 disabled:pointer-events-none font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-98"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>{inputText && inputText.trim() ? 'عرض التحليل اللغوي الذكي ✨' : 'أدخل نصاً في الترجمة أولاً للتحليل'}</span>
                    </button>
                  </div>

                  {/* 8. سجل الترجمات (0) */}
                  <div className="p-5 rounded-2xl mt-surface-soft hover:bg-[var(--mt-surface)] border mt-hairline hover:border-purple-500/40 transition-all flex flex-col justify-between gap-4 shadow-lg">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl mt-accent-soft mt-accent-text border border-purple-500/30">
                            <History className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm sm:text-base text-purple-200">سجل الترجمات ({history.length})</h4>
                            <span className="text-[11px] opacity-60">الأرشيف والمفضلة المحفوظة</span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-lg mt-accent-soft text-purple-300 border border-purple-500/30">
                          {history.length} محفوظ
                        </span>
                      </div>
                      <p className="text-xs mt-subtext/75 leading-relaxed">
                        سجل كامل لجميع الترجمات السابقة للبحث والنسخ والاسترجاع في أي وقت مع إمكانية مسح السجل بأمان.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        onClose();
                        if (onOpenHistory) onOpenHistory();
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-purple-500 hover:bg-purple-400 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-98"
                    >
                      <History className="w-4 h-4" />
                      <span>فتح واستعراض سجل الترجمات ({history.length})</span>
                    </button>
                  </div>
                </div>

                {/* Quick orientation helper */}
                <div className="p-4 rounded-2xl mt-surface-soft border mt-hairline flex items-center justify-between flex-wrap gap-3">
                  <div className="text-xs space-y-1">
                    <span className="font-bold mt-accent-text block">هل تود إظهار هذه الأزرار كشريط وصول سريع أسفل الترجمة أيضاً؟</span>
                    <span className="opacity-70 text-[11px]">يمكنك تخصيص ترتيبها أو تفعيلها من تبويب "ترتيب وأبعاد الأزرار".</span>
                  </div>
                  <button
                    onClick={() => setActiveCategory('buttons')}
                    className="px-3.5 py-1.5 rounded-xl mt-surface-soft hover:bg-[var(--mt-surface)] text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <LayoutGrid className="w-3.5 h-3.5 mt-accent-text" />
                    <span>تخصيص ترتيب الأزرار</span>
                  </button>
                </div>
              </div>
            )}
            
            {/* 1. GENERAL TAB */}
            {activeCategory === 'general' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl mt-surface-soft border mt-hairline space-y-4">
                  <h3 className="text-sm font-bold mt-accent-text flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    <span>تفضيلات الترجمة وسلوك التطبيق</span>
                  </h3>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <label className="flex items-center justify-between p-3 rounded-xl mt-surface-soft cursor-pointer hover:bg-[var(--mt-surface)] transition-colors">
                      <div className="text-xs">
                        <span className="font-bold block">الترجمة الفورية أثناء الكتابة</span>
                        <span className="opacity-60 text-[11px]">ترجمة سلسة سريعة دون انتظار ضغط زر</span>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={appSettings.instantTranslateWhileTyping}
                        onChange={(e) => handleUpdate({ instantTranslateWhileTyping: e.target.checked })}
                        className="w-4 h-4 accent-amber-500 cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 rounded-xl mt-surface-soft cursor-pointer hover:bg-[var(--mt-surface)] transition-colors">
                      <div className="text-xs">
                        <span className="font-bold block">نسخ الترجمة تلقائياً للحافظة</span>
                        <span className="opacity-60 text-[11px]">جاهزة للصق بمجرد اكتمال الترجمة</span>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={appSettings.autoCopyOnTranslate}
                        onChange={(e) => handleUpdate({ autoCopyOnTranslate: e.target.checked })}
                        className="w-4 h-4 accent-amber-500 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>

                {/* Force Offline Mode */}
                <div className="p-4 rounded-2xl mt-accent-soft border border-amber-500/20 flex items-center justify-between gap-4">
                  <div className="space-y-1 text-xs">
                    <span className="font-bold mt-accent-text flex items-center gap-1.5">
                      <HardDrive className="w-4 h-4" />
                      <span>فرض وضع الترجمة بدون إنترنت (Offline Mode)</span>
                    </span>
                    <p className="opacity-80 text-[11px]">
                      استخدام محرك مهدي الداخلي وحزم اللغات المحملة حصرياً حتى لو كان الهاتف متصلاً بالإنترنت.
                    </p>
                  </div>
                  <button
                    onClick={() => onToggleForceOffline(!forceOffline)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                      forceOffline 
                        ? 'mt-btn-primary shadow-md' 
                        : 'mt-surface-soft mt-subtext hover:bg-[var(--mt-surface)]'
                    }`}
                  >
                    {forceOffline ? 'مفعّل (أوفلاين)' : 'معطّل (سحابي)'}
                  </button>
                </div>
              </div>
            )}

            {/* 2. LINGUISTICS TAB: المجال، النبرة، اللهجة (مرتبة بدقة داخل الإعدادات) */}
            {activeCategory === 'linguistics' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold mt-accent-text flex items-center gap-2 mb-1">
                    <SlidersHorizontal className="w-4 h-4" />
                    <span>التخصيص اللغوي الدقيق (المجال • النبرة • اللهجة)</span>
                  </h3>
                  <p className="text-xs opacity-70">
                    حدد التخصص الدلالي، الأسلوب البلاغي، واللهجة المستهدفة للحصول على أعلى دقة صياغة ممكنة
                  </p>
                </div>

                {/* Section A: المجال (Domain) */}
                <div className="p-4 rounded-2xl mt-surface-soft border mt-hairline space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold mt-accent-text">🏢 المجال والتخصص الدلالي (Domain):</span>
                    <span className="text-[11px] opacity-60">
                      الحالي: {DOMAINS.find(d => d.code === selectedDomain)?.nameAr}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {DOMAINS.map(d => {
                      const isSel = selectedDomain === d.code;
                      return (
                        <button
                          key={d.code}
                          onClick={() => {
                            if (onChangeDomain) onChangeDomain(d.code);
                            handleUpdate({ defaultDomain: d.code });
                          }}
                          className={`p-2.5 rounded-xl text-right border transition-all text-xs ${
                            isSel 
                              ? 'mt-accent-soft mt-hairline mt-accent-text font-bold shadow-sm' 
                              : 'mt-surface-soft mt-hairline opacity-75 hover:opacity-100'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-bold">{d.nameAr}</span>
                            {isSel && <Check className="w-3 h-3 mt-accent-text" />}
                          </div>
                          <span className="text-[10px] opacity-60 block truncate">{d.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Section B: النبرة (Tone) */}
                <div className="p-4 rounded-2xl mt-surface-soft border mt-hairline space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-300">🎙️ النبرة والأسلوب البلاغي (Tone):</span>
                    <span className="text-[11px] opacity-60">
                      الحالي: {TONES.find(t => t.code === selectedTone)?.nameAr}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {TONES.map(t => {
                      const isSel = selectedTone === t.code;
                      return (
                        <button
                          key={t.code}
                          onClick={() => {
                            if (onChangeTone) onChangeTone(t.code);
                            handleUpdate({ defaultTone: t.code });
                          }}
                          className={`p-2.5 rounded-xl text-right border transition-all text-xs ${
                            isSel 
                              ? 'mt-accent-soft border-indigo-500 text-indigo-300 font-bold shadow-sm' 
                              : 'mt-surface-soft mt-hairline opacity-75 hover:opacity-100'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-bold">{t.nameAr}</span>
                            {isSel && <Check className="w-3 h-3 mt-accent-text" />}
                          </div>
                          <span className="text-[10px] opacity-60 block truncate">{t.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Section C: اللهجة (Dialect) */}
                <div className="p-4 rounded-2xl mt-surface-soft border mt-hairline space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold mt-success-text">🗣️ اللهجة المستهدفة (Dialect):</span>
                    <span className="text-[11px] opacity-60">
                      الحالي: {DIALECTS.find(dl => dl.code === selectedDialect)?.nameAr}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {DIALECTS.map(dl => {
                      const isSel = selectedDialect === dl.code;
                      return (
                        <button
                          key={dl.code}
                          onClick={() => {
                            if (onChangeDialect) onChangeDialect(dl.code);
                            handleUpdate({ defaultDialect: dl.code });
                          }}
                          className={`p-2.5 rounded-xl text-right border transition-all text-xs ${
                            isSel 
                              ? 'mt-accent-soft border-emerald-500 mt-success-text font-bold shadow-sm' 
                              : 'mt-surface-soft mt-hairline opacity-75 hover:opacity-100'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-bold">{dl.nameAr}</span>
                            {isSel && <Check className="w-3 h-3 mt-accent-text" />}
                          </div>
                          <span className="text-[10px] opacity-60 block truncate">{dl.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 3. TRANSLATION ENGINES TAB */}
            {activeCategory === 'translation' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl mt-surface-soft border mt-hairline space-y-3">
                  <h3 className="text-sm font-bold mt-accent-text">محركات الترجمة المدمجة</h3>
                  <div className="grid sm:grid-cols-3 gap-3">
                    {[
                      { id: 'mahdi-neural', name: 'مهدي العصبي الذكي ✨', desc: 'أعلى فهم سياقي وأدق صياغة لغوية' },
                      { id: 'deepl-style', name: 'أسلوب DeepL الأدبي 📘', desc: 'دقة كتابية رفيعة للأبحاث والكتب' },
                      { id: 'offline-local', name: 'المحرك المحلي الفوري ⚡', desc: 'فائق السرعة وبدون إنترنت' },
                    ].map(eng => (
                      <button
                        key={eng.id}
                        onClick={() => handleUpdate({ defaultEngine: eng.id as any })}
                        className={`p-3.5 rounded-2xl text-right border transition-all ${
                          appSettings.defaultEngine === eng.id
                            ? 'mt-accent-soft border-amber-500/50 '
                            : 'mt-surface-soft mt-hairline opacity-70 hover:opacity-100'
                        }`}
                      >
                        <span className="font-bold text-xs block mb-1">{eng.name}</span>
                        <span className="text-[11px] opacity-75 leading-tight block">{eng.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 4. OFFLINE PACKS TAB */}
            {activeCategory === 'offline' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl mt-surface-soft border mt-hairline flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold mt-accent-text flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      <span>الحزم المحملة على الهاتف</span>
                    </h3>
                    <p className="text-xs opacity-70 mt-0.5">
                      المساحة المستهلكة: {(getTotalDownloadedSizeMB() / 1024).toFixed(2)} GB من أصل {appSettings.storageLimitGB} GB
                    </p>
                  </div>

                  <button
                    onClick={() => downloadAllEssentialPacks()}
                    className="px-3.5 py-1.5 rounded-xl mt-btn-primary text-xs font-bold transition-all shadow-sm"
                  >
                    تحميل الحزم الأساسية
                  </button>
                </div>

                <div className="grid gap-2.5">
                  {offlinePacks.slice(0, 8).map(p => (
                    <div 
                      key={p.id}
                      className="p-3 rounded-2xl mt-surface-soft border mt-hairline flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold">{p.langNative}</span>
                        <span className="opacity-60 text-[11px]">({p.typeNameAr})</span>
                        <span className="px-1.5 py-0.5 rounded-md mt-surface-soft text-[10px] font-mono">{p.sizeMB} MB</span>
                      </div>

                      <div>
                        {p.status === 'downloaded' ? (
                          <span className="mt-accent-text font-bold flex items-center gap-1 text-[11px]">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>مثبت وجاهز</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => startDownloadPack(p.id)}
                            className="px-2.5 py-1 rounded-xl mt-accent-soft mt-accent-text font-bold hover:bg-amber-500/30 text-[11px]"
                          >
                            تنزيل الآن
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. VOICE TAB & VOICE PREVIEW (معاينة الصوت قبل اختياره) */}
            {activeCategory === 'voice' && (
              <div className="space-y-5">
                <div className="p-4 rounded-2xl mt-surface-soft border mt-hairline space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold mt-accent-text flex items-center gap-2">
                      <Volume2 className="w-4 h-4" />
                      <span>إعدادات النطق ومعاينة الأصوات (Voice & TTS)</span>
                    </h3>

                    {/* Quick Preview Action */}
                    <button
                      onClick={() => handlePreviewVoice('ar')}
                      disabled={previewVoicePlaying}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl mt-btn-primary font-bold text-xs transition-all active:scale-95 disabled:opacity-50"
                      title="تجربة الاستماع للصوت الحالي"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{previewVoicePlaying ? 'جاري النطق...' : 'معاينة الصوت العربي ▶'}</span>
                    </button>
                  </div>

                  {/* Available Voices Grid */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold opacity-80 block">اختيار الصوت المفضل:</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {availableVoices.map(v => {
                        const isSel = ttsSettings.voiceName === v;
                        return (
                          <div 
                            key={v}
                            className={`p-2.5 rounded-xl border flex flex-col justify-between gap-2 transition-all ${
                              isSel 
                                ? 'mt-accent-soft mt-hairline mt-accent-text' 
                                : 'mt-surface-soft mt-hairline '
                            }`}
                          >
                            <button
                              onClick={() => onChangeTtsSettings({ ...ttsSettings, voiceName: v })}
                              className="text-right font-bold text-xs"
                            >
                              {v}
                            </button>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                await speakText('مرحباً، أنا صوت ' + v, 'ar', { ...ttsSettings, voiceName: v });
                              }}
                              className="self-end px-2 py-0.5 rounded-lg mt-surface-soft hover:bg-[var(--mt-surface)] text-[10px] mt-subtext flex items-center gap-1"
                              title="استمع لتجربة هذا الصوت"
                            >
                              <Play className="w-2.5 h-2.5 fill-current" />
                              <span>تجربة</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sliders: Rate & Pitch with Live Preview */}
                  <div className="grid sm:grid-cols-2 gap-4 text-xs pt-2">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="font-bold">سرعة النطق:</span>
                        <span className="mt-accent-text font-mono font-bold">{ttsSettings.rate}x</span>
                      </div>
                      <input 
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.1"
                        value={ttsSettings.rate}
                        onChange={(e) => onChangeTtsSettings({ ...ttsSettings, rate: parseFloat(e.target.value) })}
                        className="w-full accent-amber-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="font-bold">طبقة الصوت (Pitch):</span>
                        <span className="mt-accent-text font-mono font-bold">{ttsSettings.pitch}x</span>
                      </div>
                      <input 
                        type="range"
                        min="0.5"
                        max="1.5"
                        step="0.1"
                        value={ttsSettings.pitch}
                        onChange={(e) => onChangeTtsSettings({ ...ttsSettings, pitch: parseFloat(e.target.value) })}
                        className="w-full accent-amber-500"
                      />
                    </div>
                  </div>

                  {/* English Preview */}
                  <div className="pt-2 border-t mt-hairline flex items-center justify-between text-xs">
                    <span className="opacity-60">يمكنك أيضاً تجربة النطق باللغة الإنجليزية:</span>
                    <button
                      onClick={() => handlePreviewVoice('en')}
                      className="px-2.5 py-1 rounded-lg mt-surface-soft hover:bg-[var(--mt-surface)] mt-subtext text-[11px] font-bold"
                    >
                      معاينة بالإنجليزية 🎙️
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 6. GOOGLE ACCOUNT & CLOUD STORAGE (تسجيل الدخول والتخزين السحابي الرسمي) */}
            {activeCategory === 'account' && (
              <div className="space-y-5">
                <div className="p-5 rounded-2xl mt-surface-soft border mt-hairline space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold mt-accent-text flex items-center gap-2">
                      <Cloud className="w-4 h-4" />
                      <span>حساب Google الرسمي والتخزين السحابي</span>
                    </h3>

                    {googleUser && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full mt-accent-soft mt-accent-text border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        <span>متصل بنجاح</span>
                      </span>
                    )}
                  </div>

                  {googleUser ? (
                    /* Logged In Google Account State */
                    <div className="p-4 rounded-2xl bg-black/30 border mt-hairline flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={googleUser.avatarUrl} 
                          alt={googleUser.name} 
                          className="w-12 h-12 rounded-2xl border-2 border-amber-500/50 shadow-md"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm">{googleUser.name}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded mt-accent-soft mt-accent-text font-bold">Google</span>
                          </div>
                          <span className="text-xs mt-subtext block font-mono">{googleUser.email}</span>
                          {googleUser.lastSyncedAt && (
                            <span className="text-[10px] mt-subtext block mt-0.5">
                              آخر مزامنة: {new Date(googleUser.lastSyncedAt).toLocaleTimeString()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleManualSync}
                          disabled={isSyncing}
                          className="px-3.5 py-1.5 rounded-xl mt-btn-primary text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                          <span>{isSyncing ? 'جاري المزامنة...' : 'مزامنة السحابة الآن'}</span>
                        </button>

                        <button
                          onClick={handleGoogleSignOut}
                          className="p-2 rounded-xl mt-surface-soft hover:bg-[var(--mt-accent-soft)] mt-subtext hover:text-[var(--mt-danger)] transition-colors"
                          title="تسجيل الخروج"
                        >
                          <LogOut className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Official Google Sign In Button */
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 via-black/40 to-black border border-amber-500/20 text-center space-y-4">
                      <div className="w-12 h-12 mx-auto rounded-2xl bg-white flex items-center justify-center shadow-lg">
                        {/* Google G Logo SVG */}
                        <svg className="w-6 h-6" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                        </svg>
                      </div>

                      <div>
                        <h4 className="font-bold text-sm">تسجيل الدخول باستخدام حساب Google</h4>
                        <p className="text-xs opacity-70 mt-1 max-w-sm mx-auto">
                          احفظ سجل ترجماتك، المفضلة، والثيمات الخاصة بك في سحابة Google للوصول إليها من أي جهاز
                        </p>
                      </div>

                      <button
                        onClick={handleGoogleSignIn}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white text-zinc-900 hover:bg-zinc-100 font-bold text-xs shadow-lg transition-all active:scale-95"
                      >
                        <span>متابعة بحساب Google الرسمي</span>
                      </button>
                    </div>
                  )}

                  {/* Cloud Storage Features Checklist */}
                  <div className="pt-2 text-xs space-y-2 opacity-80">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 mt-accent-text shrink-0" />
                      <span>مزامنة فورية مشفرة لسجل الترجمات بين هاتفك وحاسوبك</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 mt-accent-text shrink-0" />
                      <span>حفظ المفضلة والقواميس المخصصة</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 mt-accent-text shrink-0" />
                      <span>استرجاع البيانات بضغطة زر عند تغيير الجهاز</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 7. BUTTONS LAYOUT, ORDER & REORDERING (ترتيب وصعود ونزول للأزرار) */}
            {activeCategory === 'buttons' && (
              <div className="space-y-5">
                <div className="p-4 rounded-2xl mt-surface-soft border mt-hairline space-y-4">
                  <div>
                    <h3 className="text-sm font-bold mt-accent-text flex items-center gap-2">
                      <LayoutGrid className="w-4 h-4" />
                      <span>تخصيص ترتيب واتجاه أزرار شريط المهام</span>
                    </h3>
                    <p className="text-xs opacity-70 mt-0.5">
                      تحكم بحرية في طريقة عرض الأزرار وترتيب صعودها ونزولها حسب رغبتك
                    </p>
                  </div>

                  {/* Orientation Switcher (أفقي / عمودي) */}
                  <div className="p-3 rounded-xl mt-surface-soft flex items-center justify-between">
                    <div>
                      <span className="font-bold text-xs block">اتجاه شريط الأزرار:</span>
                      <span className="opacity-60 text-[11px]">أفقي في الأعلى أو عمودي جانبي</span>
                    </div>
                    <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl">
                      <button
                        onClick={() => onChangeToolbarOrientation && onChangeToolbarOrientation('horizontal')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          toolbarOrientation === 'horizontal' ? 'mt-btn-primary' : 'mt-subtext'
                        }`}
                      >
                        أفقي (Horizontal)
                      </button>
                      <button
                        onClick={() => onChangeToolbarOrientation && onChangeToolbarOrientation('vertical')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          toolbarOrientation === 'vertical' ? 'mt-btn-primary' : 'mt-subtext'
                        }`}
                      >
                        عمودي (Vertical)
                      </button>
                    </div>
                  </div>

                  {/* Reordering List (صعود ونزول لكل زر) */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold mt-accent-text block">
                      ترتيب الأزرار (استخدم الأسهم للصعود والنزول):
                    </span>

                    <div className="space-y-1.5">
                      {toolbarButtonsOrder.map((btnKey, idx) => (
                        <div 
                          key={btnKey}
                          className="p-2.5 rounded-xl mt-surface-soft border mt-hairline flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full mt-surface-soft flex items-center justify-center font-mono text-[10px] font-bold">
                              {idx + 1}
                            </span>
                            <span className="font-medium">{buttonLabels[btnKey] || btnKey}</span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => moveToolbarButton(idx, 'up')}
                              disabled={idx === 0}
                              className="p-1 rounded-lg mt-surface-soft hover:bg-[var(--mt-surface)] disabled:opacity-20 mt-subtext transition-all"
                              title="صعود للأعلى"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => moveToolbarButton(idx, 'down')}
                              disabled={idx === toolbarButtonsOrder.length - 1}
                              className="p-1 rounded-lg mt-surface-soft hover:bg-[var(--mt-surface)] disabled:opacity-20 mt-subtext transition-all"
                              title="نزول للأسفل"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 8. APPEARANCE & THEMES (+125 THEMES) */}
            {activeCategory === 'appearance' && (
              <div className="space-y-5">
                {/* Zoom Control */}
                <div className="mt-surface-soft p-4 flex items-center justify-between text-xs" style={{ border: '1px solid var(--mt-border)', borderRadius: 'var(--mt-radius)' }}>
                  <div>
                    <span className="font-bold block">مستوى تكبير وتصغير الواجهة (Zoom)</span>
                    <span className="opacity-60 text-[11px]">تحكم سلس بحجم الخطوط والعناصر</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onChangeZoom(Math.max(50, zoom - 10))}
                      className="mt-btn px-3 py-1.5"
                    >
                      -
                    </button>
                    <span className="mt-badge font-mono px-3 py-1">
                      {zoom}%
                    </span>
                    <button
                      onClick={() => onChangeZoom(Math.min(250, zoom + 10))}
                      className="mt-btn px-3 py-1.5"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Full theme engine: 1500+ themes + appearance studio */}
                <ThemeGallery variant="full" maxHeightClass="max-h-[38vh]" />
              </div>
            )}

            {/* 9. PRIVACY TAB */}
            {activeCategory === 'privacy' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl mt-surface-soft border mt-hairline space-y-3 text-xs">
                  <h3 className="text-sm font-bold mt-accent-text flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    <span>الخصوصية والأمان المصرفي</span>
                  </h3>

                  <label className="flex items-center justify-between p-3 rounded-xl mt-surface-soft cursor-pointer">
                    <div>
                      <span className="font-bold block">الوضع الخاص (Private Mode)</span>
                      <span className="opacity-60 text-[11px]">عدم تخزين أي ترجمات في سجل التاريخ مطلقاً</span>
                    </div>
                    <input 
                      type="checkbox"
                      checked={appSettings.privateModeNoHistory}
                      onChange={(e) => handleUpdate({ privateModeNoHistory: e.target.checked })}
                      className="w-4 h-4 accent-amber-500"
                    />
                  </label>

                  <div className="flex items-center justify-between p-3 rounded-xl mt-accent-soft border border-rose-500/20">
                    <div>
                      <span className="font-bold mt-danger-text block">مسح سجل التاريخ والمفضلة</span>
                      <span className="opacity-70 text-[11px]">حذف كافة النصوص من التخزين المحلي</span>
                    </div>
                    <button
                      onClick={() => {
                        if (window.confirm('هل أنت متأكد من رغبتك في مسح السجل كاملاً؟')) {
                          onClearHistory();
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl mt-accent-soft hover:bg-rose-500/30 mt-danger-text font-bold"
                    >
                      مسح الآن
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 10. ABOUT TAB */}
            {activeCategory === 'about' && (
              <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-500/10 via-zinc-900 to-black border border-amber-500/20 space-y-3 text-center">
                <div className="w-14 h-14 mx-auto rounded-2xl mt-accent-soft flex items-center justify-center mt-accent-text border mt-hairline">
                  <Sparkles className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg font-bold mt-accent-text">مهدي — Mahdi Translator V3</h3>
                  <p className="text-xs text-amber-200/80 mt-1">
                    ترجمة فورية ذكية • حزم كاملة بدون إنترنت • محادثة صوتية ثنائية • دقة لغوية متكيفة
                  </p>
                </div>
              </div>
            )}

          </main>
        </div>
      </div>
    </div>
  );
};
