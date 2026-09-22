import React, { useState, useRef, useEffect } from 'react';
import { 
  Minus, 
  X, 
  ArrowRightLeft, 
  Volume2, 
  Copy, 
  Sparkles, 
  GripHorizontal,
  RefreshCw,
  Maximize2
} from 'lucide-react';
import { ThemeConfig, Language } from '../types.ts';
import { AUTO_DETECT_OPTION, detectLanguageFromText } from '../constants.ts';
import { ResizeHandle } from './ResizeHandle.tsx';

interface FloatingTranslateWindowProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: ThemeConfig;
  languages: Language[];
  onTranslate: (text: string, from: string, to: string) => Promise<string>;
  onSpeak: (text: string, lang: string) => void;
  onCopy: (text: string) => void;
}

export const FloatingTranslateWindow: React.FC<FloatingTranslateWindowProps> = ({
  isOpen,
  onClose,
  currentTheme,
  languages,
  onTranslate,
  onSpeak,
  onCopy,
}) => {
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 30, y: 80 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number }>({
    startX: 0,
    startY: 0,
    initialX: 30,
    initialY: 80,
  });

  // Dynamic Box Size, Font Size, and Corner Radius controlled by the micro drag handle ("الشخطة")
  const [windowHeight, setWindowHeight] = useState<number>(140);
  const [contentFontSize, setContentFontSize] = useState<number>(13);
  const [cornerRadius, setCornerRadius] = useState<number>(24);

  const [fromLang, setFromLang] = useState<string>('auto');
  const [toLang, setToLang] = useState<string>('ar');
  const [inputText, setInputText] = useState<string>('');
  const [resultText, setResultText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [detectedLangCode, setDetectedLangCode] = useState<string>('');

  // Auto-detect language when user types
  useEffect(() => {
    if (fromLang === 'auto' && inputText.trim()) {
      const detected = detectLanguageFromText(inputText);
      setDetectedLangCode(detected);
    } else {
      setDetectedLangCode('');
    }
  }, [inputText, fromLang]);

  // Drag handlers for header
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: pos.x,
      initialY: pos.y,
    };
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragRef.current = {
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        initialX: pos.x,
        initialY: pos.y,
      };
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      const nextX = Math.max(10, Math.min(window.innerWidth - 360, dragRef.current.initialX + dx));
      const nextY = Math.max(10, Math.min(window.innerHeight - 200, dragRef.current.initialY + dy));
      setPos({ x: nextX, y: nextY });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - dragRef.current.startX;
      const dy = e.touches[0].clientY - dragRef.current.startY;
      const nextX = Math.max(10, Math.min(window.innerWidth - 320, dragRef.current.initialX + dx));
      const nextY = Math.max(10, Math.min(window.innerHeight - 150, dragRef.current.initialY + dy));
      setPos({ x: nextX, y: nextY });
    };

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging]);

  const handleSwap = () => {
    const actualFrom = fromLang === 'auto' ? (detectedLangCode || 'en') : fromLang;
    setFromLang(toLang);
    setToLang(actualFrom);
    setInputText(resultText);
    setResultText(inputText);
  };

  const handleInstantTranslate = async () => {
    if (!inputText.trim() || isLoading) return;
    setIsLoading(true);
    try {
      const res = await onTranslate(inputText, fromLang, toLang);
      setResultText(res);
    } catch (err) {
      setResultText('تعذر إكمال الترجمة.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  // Minimized Floating Bubble
  if (isMinimized) {
    return (
      <div
        style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
        className="fixed z-[95] cursor-pointer animate-in zoom-in-75 duration-150"
      >
        <div
          onClick={() => setIsMinimized(false)}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-full shadow-2xl border ${currentTheme.border} ${currentTheme.card} ${currentTheme.text} hover:scale-105 active:scale-95 transition-all`}
        >
          <div className={`p-1.5 rounded-full ${currentTheme.primary}`}>
            <Sparkles size={14} />
          </div>
          <span className="text-xs font-bold">الترجمة العائمة</span>
          <button 
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="p-1 hover:bg-[var(--mt-surface)] rounded-full opacity-60 hover:opacity-100"
          >
            <X size={12} />
          </button>
        </div>
      </div>
    );
  }

  const detectedName = detectedLangCode 
    ? languages.find(l => l.code === detectedLangCode)?.nativeName 
    : '';

  return (
    <div
      style={{ 
        left: `${pos.x}px`, 
        top: `${pos.y}px`,
        borderRadius: `${cornerRadius}px`,
      }}
      className={`fixed z-[95] w-84 sm:w-96 border ${currentTheme.border} ${currentTheme.card} ${currentTheme.text} shadow-2xl overflow-hidden flex flex-col transition-all duration-150 animate-in fade-in zoom-in-95`}
      dir="rtl"
    >
      {/* Drag handle header */}
      <div 
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        className="flex items-center justify-between px-4 py-2.5 border-b mt-hairline mt-surface-soft cursor-grab active:cursor-grabbing select-none"
      >
        <div className="flex items-center gap-2">
          <GripHorizontal size={16} className="opacity-40" />
          <span className="text-xs font-bold flex items-center gap-1.5">
            <Sparkles size={14} className="mt-accent-text" />
            <span>نافذة الترجمة العائمة</span>
          </span>
          {detectedName && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md mt-accent-soft mt-accent-text font-bold">
              كُشف: {detectedName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1 rounded-lg hover:bg-[var(--mt-surface)] transition-colors opacity-70 hover:opacity-100"
            title="تصغير"
          >
            <Minus size={14} />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[var(--mt-surface)] transition-colors opacity-70 hover:opacity-100"
            title="إغلاق"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Languages toolbar with Auto Detect */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b mt-hairline mt-surface-soft">
        <select
          value={fromLang}
          onChange={(e) => setFromLang(e.target.value)}
          className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer py-1 px-1 rounded-lg max-w-[140px]"
        >
          <option value="auto" className="mt-surface-soft font-bold">
            ✨ كشف تلقائي
          </option>
          {languages.map((l) => (
            <option key={l.code} value={l.code} className="mt-surface-soft">
              {l.nativeName}
            </option>
          ))}
        </select>

        <button
          onClick={handleSwap}
          className="p-1.5 rounded-xl hover:bg-[var(--mt-surface)] transition-transform active:rotate-180"
          title="تبديل اللغات"
        >
          <ArrowRightLeft size={13} />
        </button>

        <select
          value={toLang}
          onChange={(e) => setToLang(e.target.value)}
          className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer py-1 px-1 rounded-lg text-left max-w-[130px]"
        >
          {languages.map((l) => (
            <option key={l.code} value={l.code} className="mt-surface-soft">
              {l.nativeName}
            </option>
          ))}
        </select>
      </div>

      {/* Body Inputs Resizable via Notch */}
      <div 
        className="p-3 space-y-2 relative"
        style={{
          minHeight: `${windowHeight}px`,
        }}
      >
        {/* Input Textarea */}
        <div className="relative">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleInstantTranslate();
              }
            }}
            placeholder="اكتب هنا أو الصق النص للترجمة فوراً..."
            rows={2}
            style={{ fontSize: `${contentFontSize}px` }}
            className="w-full mt-surface-soft rounded-xl p-2.5 resize-none focus:outline-none border mt-hairline placeholder:opacity-40 leading-relaxed transition-all"
          />
          <div className="flex justify-between items-center mt-1">
            <button
              onClick={() => onSpeak(inputText, fromLang === 'auto' ? (detectedLangCode || 'en') : fromLang)}
              disabled={!inputText.trim()}
              className="p-1 rounded opacity-60 hover:opacity-100 disabled:opacity-20 transition-opacity"
              title="استماع للنص"
            >
              <Volume2 size={14} />
            </button>
            <button
              onClick={handleInstantTranslate}
              disabled={isLoading || !inputText.trim()}
              className={`px-3 py-1 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${currentTheme.primary} disabled:opacity-40 shadow-sm`}
            >
              {isLoading ? <RefreshCw size={12} className="animate-spin" /> : null}
              <span>ترجم الآن</span>
            </button>
          </div>
        </div>

        {/* Translation Output Box */}
        <div 
          className="p-2.5 rounded-xl mt-surface-soft border mt-hairline min-h-[60px] relative flex flex-col justify-between"
        >
          <div 
            style={{ fontSize: `${contentFontSize}px` }}
            className="leading-relaxed whitespace-pre-wrap break-words font-medium transition-all"
          >
            {resultText ? (
              <span>{resultText}</span>
            ) : (
              <span className="opacity-30 italic text-xs">ستظهر نتيجة الترجمة هنا مباشرة...</span>
            )}
          </div>

          {resultText && (
            <div className="flex items-center justify-end gap-1 pt-1.5 border-t mt-hairline mt-1.5">
              <button
                onClick={() => onSpeak(resultText, toLang)}
                className="p-1 rounded opacity-60 hover:opacity-100 transition-opacity"
                title="استماع للترجمة"
              >
                <Volume2 size={13} />
              </button>
              <button
                onClick={() => onCopy(resultText)}
                className="p-1 rounded opacity-60 hover:opacity-100 transition-opacity"
                title="نسخ الترجمة"
              >
                <Copy size={13} />
              </button>
            </div>
          )}
        </div>

        {/* THE MICRO DRAG HANDLE ("الشخطة") for Floating Window */}
        <ResizeHandle
          currentHeight={windowHeight}
          currentFontSize={contentFontSize}
          currentRadius={cornerRadius}
          onResize={(h, fs, r) => {
            setWindowHeight(h);
            setContentFontSize(fs);
            setCornerRadius(r);
          }}
          minHeight={100}
          maxHeight={320}
          minFontSize={11}
          maxFontSize={20}
          minRadius={12}
          maxRadius={36}
          position="bottom-left"
          tooltipLabel="حجم الشاشة العائمة والخط"
        />
      </div>
    </div>
  );
};
