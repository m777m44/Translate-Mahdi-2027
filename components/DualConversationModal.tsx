import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Mic, 
  MicOff, 
  Volume2, 
  Send, 
  Trash2, 
  Download, 
  Languages, 
  Sparkles,
  ArrowLeftRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown
} from 'lucide-react';
import { ConversationMessage, ThemeConfig, TtsSettings } from '../types.ts';
import { LANGUAGES } from '../constants.ts';
import { translateText, speakText } from '../geminiService.ts';
import { translateOffline } from '../offlineEngine.ts';
import { createSpeechSession, SpeechSession } from '../platform.ts';

interface DualConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeConfig;
  ttsSettings: TtsSettings;
  forceOffline: boolean;
}

export const DualConversationModal: React.FC<DualConversationModalProps> = ({
  isOpen,
  onClose,
  theme,
  ttsSettings,
  forceOffline,
}) => {
  const [speakerALang, setSpeakerALang] = useState<string>('ar');
  const [speakerBLang, setSpeakerBLang] = useState<string>('en');
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [inputA, setInputA] = useState('');
  const [inputB, setInputB] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isListeningA, setIsListeningA] = useState(false);
  const [isListeningB, setIsListeningB] = useState(false);
  const [sortOrder, setSortOrder] = useState<'chronological' | 'reverse'>('chronological');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesTopRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const speechSessionRef = useRef<SpeechSession | null>(null);

  // Release the microphone whenever the sheet closes.
  useEffect(() => {
    if (!isOpen) {
      speechSessionRef.current?.stop();
      speechSessionRef.current = null;
      setIsListeningA(false);
      setIsListeningB(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (sortOrder === 'chronological') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      messagesTopRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, sortOrder]);

  if (!isOpen) return null;

  const scrollToTop = () => {
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' });
    }
  };

  const handleSendSpeakerA = async () => {
    if (!inputA.trim() || isTranslating) return;
    const text = inputA.trim();
    setInputA('');
    setIsTranslating(true);

    let translated = '';
    try {
      if (forceOffline) {
        const res = translateOffline(text, speakerALang, speakerBLang);
        translated = res.translation;
      } else {
        const res = await translateText(text, speakerALang, speakerBLang);
        translated = res.translation;
      }
    } catch {
      const res = translateOffline(text, speakerALang, speakerBLang);
      translated = res.translation;
    } finally {
      setIsTranslating(false);
    }

    const newMsg: ConversationMessage = {
      id: Date.now().toString(),
      speaker: 'A',
      speakerName: 'المتحدث الأول (طرف أ)',
      lang: speakerALang,
      sourceText: text,
      translatedText: translated,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, newMsg]);
    speakText(translated, speakerBLang, ttsSettings);
  };

  const handleSendSpeakerB = async () => {
    if (!inputB.trim() || isTranslating) return;
    const text = inputB.trim();
    setInputB('');
    setIsTranslating(true);

    let translated = '';
    try {
      if (forceOffline) {
        const res = translateOffline(text, speakerBLang, speakerALang);
        translated = res.translation;
      } else {
        const res = await translateText(text, speakerBLang, speakerALang);
        translated = res.translation;
      }
    } catch {
      const res = translateOffline(text, speakerBLang, speakerALang);
      translated = res.translation;
    } finally {
      setIsTranslating(false);
    }

    const newMsg: ConversationMessage = {
      id: Date.now().toString(),
      speaker: 'B',
      speakerName: 'المتحدث الثاني (طرف ب)',
      lang: speakerBLang,
      sourceText: text,
      translatedText: translated,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, newMsg]);
    speakText(translated, speakerALang, ttsSettings);
  };

  const startVoiceInput = async (speaker: 'A' | 'B') => {
    // Toggle off when the active speaker's mic is tapped again.
    const active = speaker === 'A' ? isListeningA : isListeningB;
    if (active) {
      speechSessionRef.current?.stop();
      speechSessionRef.current = null;
      setIsListeningA(false);
      setIsListeningB(false);
      return;
    }

    const targetLangCode = speaker === 'A' ? speakerALang : speakerBLang;
    if (speaker === 'A') setIsListeningA(true);
    else setIsListeningB(true);

    const session = await createSpeechSession({
      onPartial: (t) => { if (speaker === 'A') setInputA(t); else setInputB(t); },
      onFinal: (t) => { if (speaker === 'A') setInputA(t); else setInputB(t); },
      onError: () => {
        setIsListeningA(false);
        setIsListeningB(false);
      },
      onEnd: () => {
        setIsListeningA(false);
        setIsListeningB(false);
        speechSessionRef.current = null;
      },
    });

    if (!session) {
      alert('التعرف على الصوت غير مدعوم على هذا الجهاز حالياً.');
      setIsListeningA(false);
      setIsListeningB(false);
      return;
    }

    try {
      speechSessionRef.current = session;
      await session.start(targetLangCode);
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsListeningA(false);
      setIsListeningB(false);
    }
  };

  const swapLanguages = () => {
    const temp = speakerALang;
    setSpeakerALang(speakerBLang);
    setSpeakerBLang(temp);
  };

  const exportConversation = () => {
    const lines = messages.map(m => `[${new Date(m.timestamp).toLocaleTimeString()}] ${m.speakerName} (${m.lang}):\nالأصل: ${m.sourceText}\nالترجمة: ${m.translatedText}\n`).join('\n---\n\n');
    const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mahdi-conversation-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const displayedMessages = sortOrder === 'chronological' ? messages : [...messages].reverse();

  return (
    <div className="fixed inset-0 z-50 flex flex-col w-full h-full mt-sheet overflow-hidden">
      <div 
        className={`w-full h-full flex flex-col ${theme.card} ${theme.text} overflow-hidden`}
        dir="rtl"
      >
        {/* Compact Header */}
        <div className="flex items-center justify-between px-4 sm:px-8 py-3.5 border-b mt-hairline mt-sheet-header shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl mt-accent-soft mt-accent-text border mt-hairline">
              <Languages className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm sm:text-base font-bold tracking-tight">المحادثة الصوتية الثنائية (Dual Speaker)</h2>
                <span className="px-1.5 py-0.5 text-[9px] sm:text-[10px] font-semibold rounded-md mt-accent-soft mt-accent-text border mt-hairline">
                  صوت-إلى-صوت
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] opacity-65 hidden xs:block">
                ترجمة فورية وجهاً لوجه بين لغتين مع نطق فوري متزامن بشاشة كاملة وسلسة
              </p>
            </div>
          </div>

          {/* Compact Top Action Buttons (صعود/نزول وترتيب وتصدير ومسح) */}
          <div className="flex items-center gap-2">
            {/* Scroll Navigation & Ordering */}
            <button
              onClick={() => setSortOrder(prev => prev === 'chronological' ? 'reverse' : 'chronological')}
              className="px-2.5 py-1.5 rounded-xl mt-surface-soft hover:bg-[var(--mt-surface)] mt-subtext text-xs flex items-center gap-1 transition-all"
              title={sortOrder === 'chronological' ? 'الترتيب: الأقدم أولاً (انقر للتبديل)' : 'الترتيب: الأحدث أولاً (انقر للتبديل)'}
            >
              <ArrowUpDown className="w-3.5 h-3.5 mt-accent-text" />
              <span className="hidden sm:inline">{sortOrder === 'chronological' ? 'الأقدم أولاً' : 'الأحدث أولاً'}</span>
            </button>

            <button
              onClick={scrollToTop}
              className="p-2 rounded-xl mt-surface-soft hover:bg-[var(--mt-surface)] mt-subtext transition-all"
              title="التمرير لأعلى المحادثة"
            >
              <ArrowUp className="w-4 h-4" />
            </button>

            <button
              onClick={scrollToBottom}
              className="p-2 rounded-xl mt-surface-soft hover:bg-[var(--mt-surface)] mt-subtext transition-all"
              title="التمرير لأسفل المحادثة"
            >
              <ArrowDown className="w-4 h-4" />
            </button>

            {messages.length > 0 && (
              <>
                <button
                  onClick={exportConversation}
                  className="p-2 rounded-xl mt-surface-soft hover:bg-[var(--mt-surface)] mt-subtext transition-all"
                  title="تصدير نص المحادثة"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setMessages([])}
                  className="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 mt-danger-text transition-all"
                  title="مسح المحادثة"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}

            <button 
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl mt-surface-soft hover:bg-[var(--mt-surface)] hover:text-[var(--mt-text)] transition-all text-xs font-bold flex items-center gap-1.5 active:scale-95"
              title="إغلاق والعودة"
            >
              <X className="w-4 h-4" />
              <span>إغلاق</span>
            </button>
          </div>
        </div>

        {/* Compact Language Selector Bar */}
        <div className="px-3 sm:px-5 py-2 border-b mt-hairline mt-surface-soft flex items-center justify-between gap-2 shrink-0 text-xs">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span className="font-bold mt-accent-text shrink-0 text-[11px]">الطرف (أ):</span>
            <select
              value={speakerALang}
              onChange={(e) => setSpeakerALang(e.target.value)}
              className="px-2 py-1 rounded-xl mt-surface-soft border mt-hairline text-xs focus:outline-none focus:border-[var(--mt-accent)] w-full max-w-[140px]"
            >
              {LANGUAGES.map(l => (
                <option key={l.code} value={l.code} className="mt-surface-soft">
                  {l.flag} {l.nativeName}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={swapLanguages}
            className="p-1.5 rounded-xl mt-surface-soft hover:bg-[var(--mt-surface)] mt-subtext transition-all active:scale-95 shrink-0"
            title="تبديل اللغتين"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
            <span className="font-bold mt-accent-text shrink-0 text-[11px]">الطرف (ب):</span>
            <select
              value={speakerBLang}
              onChange={(e) => setSpeakerBLang(e.target.value)}
              className="px-2 py-1 rounded-xl mt-surface-soft border mt-hairline text-xs focus:outline-none focus:border-[var(--mt-accent)] w-full max-w-[140px]"
            >
              {LANGUAGES.map(l => (
                <option key={l.code} value={l.code} className="mt-surface-soft">
                  {l.flag} {l.nativeName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Messages Stream Area */}
        <div ref={containerRef} className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3">
          <div ref={messagesTopRef} />
          {displayedMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-60 p-4">
              <Languages className="w-10 h-10 mb-2 opacity-40 mt-accent-text" />
              <p className="text-xs font-bold">ابدأ المحادثة الآن</p>
              <p className="text-[11px] mt-1 max-w-xs">
                اضغط على ميكروفون الطرف (أ) أو الطرف (ب) في الأسفل للتحدث وسيقوم مهدي بترجمة ونطق الجمل فورياً
              </p>
            </div>
          ) : (
            displayedMessages.map(msg => {
              const isSpeakerA = msg.speaker === 'A';
              return (
                <div 
                  key={msg.id}
                  className={`flex flex-col ${isSpeakerA ? 'items-start' : 'items-end'} animate-in fade-in duration-150`}
                >
                  <div className={`max-w-[85%] sm:max-w-[75%] p-3 rounded-2xl border ${
                    isSpeakerA 
                      ? 'mt-accent-soft mt-hairline text-amber-100 rounded-tr-none' 
                      : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-100 rounded-tl-none'
                  }`}>
                    <div className="flex items-center justify-between gap-2 mb-1 text-[10px] opacity-70">
                      <span className="font-bold">{msg.speakerName}</span>
                      <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    {/* Source Text */}
                    <p className="text-xs sm:text-sm font-medium mb-1.5 opacity-90">{msg.sourceText}</p>

                    {/* Translated Text with Speaker button */}
                    <div className="pt-2 border-t mt-hairline flex items-center justify-between gap-2">
                      <p className="text-xs sm:text-sm font-bold mt-accent-text">{msg.translatedText}</p>
                      <button
                        onClick={() => speakText(msg.translatedText, isSpeakerA ? speakerBLang : speakerALang, ttsSettings)}
                        className="p-1 rounded-lg hover:bg-[var(--mt-surface)] hover:text-[var(--mt-text)] transition-colors"
                        title="إعادة نطق الترجمة"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Dual Input Docks (Side-by-side on tablet/desktop, stacked on mobile) */}
        <div className="p-2 sm:p-3 border-t mt-hairline mt-sheet-header shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            
            {/* Speaker A Input Dock (Compact) */}
            <div className="p-2 sm:p-2.5 rounded-2xl mt-accent-soft border border-amber-500/20 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold mt-accent-text">
                <span>المتحدث الأول (طرف أ)</span>
                <span className="text-[10px] opacity-60">
                  {LANGUAGES.find(l => l.code === speakerALang)?.nativeName}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <input 
                  type="text"
                  value={inputA}
                  onChange={(e) => setInputA(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendSpeakerA()}
                  placeholder="اكتب هنا أو انقر الميكروفون..."
                  className="flex-1 px-2.5 py-1.5 text-xs rounded-xl bg-black/30 border mt-hairline focus:outline-none focus:border-[var(--mt-accent)]"
                />
                <button
                  onClick={() => startVoiceInput('A')}
                  className={`p-2 rounded-xl text-xs font-bold transition-all ${
                    isListeningA 
                      ? 'bg-[var(--mt-danger)]  animate-pulse shadow-lg ' 
                      : 'mt-btn-primary hover:bg-amber-400'
                  }`}
                  title="تحدث بالصوت"
                >
                  {isListeningA ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={handleSendSpeakerA}
                  disabled={!inputA.trim() || isTranslating}
                  className="p-2 rounded-xl mt-accent-soft hover:bg-amber-500/30 mt-accent-text disabled:opacity-30 text-xs font-bold"
                  title="إرسال وترجمة"
                >
                  <Send className="w-3.5 h-3.5 rotate-180" />
                </button>
              </div>
            </div>

            {/* Speaker B Input Dock (Compact) */}
            <div className="p-2 sm:p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold mt-accent-text">
                <span>المتحدث الثاني (طرف ب)</span>
                <span className="text-[10px] opacity-60">
                  {LANGUAGES.find(l => l.code === speakerBLang)?.nativeName}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <input 
                  type="text"
                  value={inputB}
                  onChange={(e) => setInputB(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendSpeakerB()}
                  placeholder="Type here or tap microphone..."
                  className="flex-1 px-2.5 py-1.5 text-xs rounded-xl bg-black/30 border mt-hairline focus:outline-none focus:border-[var(--mt-accent)]"
                />
                <button
                  onClick={() => startVoiceInput('B')}
                  className={`p-2 rounded-xl text-xs font-bold transition-all ${
                    isListeningB 
                      ? 'bg-[var(--mt-danger)]  animate-pulse shadow-lg ' 
                      : 'bg-indigo-500  hover:bg-indigo-400'
                  }`}
                  title="تحدث بالصوت"
                >
                  {isListeningB ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={handleSendSpeakerB}
                  disabled={!inputB.trim() || isTranslating}
                  className="p-2 rounded-xl mt-accent-soft hover:bg-indigo-500/30 text-indigo-300 disabled:opacity-30 text-xs font-bold"
                  title="إرسال وترجمة"
                >
                  <Send className="w-3.5 h-3.5 rotate-180" />
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
