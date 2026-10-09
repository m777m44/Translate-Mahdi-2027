import React from 'react';
import { 
  X, 
  Sparkles, 
  BookOpen, 
  Globe2, 
  Lightbulb, 
  Copy, 
  Check, 
  ArrowRight,
  Scale
} from 'lucide-react';
import { AIAnalysisResult, MultiEngineComparison, ThemeConfig } from '../types.ts';

interface AIAnalysisDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: AIAnalysisResult | null;
  comparison?: MultiEngineComparison | null;
  onSelectAlternative: (text: string) => void;
  theme: ThemeConfig;
  sourceText: string;
}

export const AIAnalysisDrawer: React.FC<AIAnalysisDrawerProps> = ({
  isOpen,
  onClose,
  analysis,
  comparison,
  onSelectAlternative,
  theme,
  sourceText,
}) => {
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col w-full h-full mt-sheet overflow-hidden">
      <div 
        className={`w-full h-full flex flex-col ${theme.card} ${theme.text} overflow-hidden`}
        dir="rtl"
      >
        {/* Header - Full Width Sticky */}
        <div className="flex items-center justify-between px-4 sm:px-8 py-3.5 border-b mt-hairline mt-sheet-header shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 rounded-2xl mt-accent-soft mt-accent-text border mt-hairline">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight">تحليل مهدي اللغوي الذكي (Mahdi AI)</h2>
              <p className="text-xs opacity-70 hidden sm:block">
                بدائل دقيقة، سياق ثقافي، وشرح لغوي معمق بشاشة كاملة وسلسة
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl mt-surface-soft hover:bg-[var(--mt-surface)] hover:text-[var(--mt-text)] transition-all text-xs font-bold flex items-center gap-1.5 active:scale-95"
            title="إغلاق والعودة"
          >
            <X className="w-4 h-4" />
            <span>إغلاق</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Source Text Snippet */}
          <div className="p-3.5 rounded-2xl mt-surface-soft border mt-hairline text-xs">
            <span className="opacity-60 block mb-1">النص الأصلي:</span>
            <p className="font-medium">{sourceText}</p>
          </div>

          {/* Alternatives */}
          {analysis?.alternatives && analysis.alternatives.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold mt-accent-text">
                <Lightbulb className="w-4 h-4" />
                <span>بدائل وصياغات مقترحة</span>
              </div>

              <div className="grid gap-2.5">
                {analysis.alternatives.map((alt, idx) => (
                  <div 
                    key={idx}
                    className="p-3.5 rounded-2xl mt-surface-soft hover:bg-[var(--mt-surface)] border mt-hairline hover:border-[var(--mt-border-strong)] transition-all flex items-center justify-between gap-3 group"
                  >
                    <p className="text-sm font-medium flex-1">{alt}</p>
                    <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100">
                      <button
                        onClick={() => handleCopy(alt, idx)}
                        className="p-2 rounded-xl mt-surface-soft hover:bg-[var(--mt-surface)] mt-subtext transition-all"
                        title="نسخ"
                      >
                        {copiedIndex === idx ? <Check className="w-4 h-4 mt-accent-text" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => {
                          onSelectAlternative(alt);
                          onClose();
                        }}
                        className="px-3 py-1.5 text-xs font-semibold rounded-xl mt-accent-soft hover:bg-amber-500/30 mt-accent-text border mt-hairline transition-all flex items-center gap-1"
                      >
                        <span>اعتماد الترجمة</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Multi-Engine Comparison if available */}
          {comparison && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold mt-accent-text">
                <Scale className="w-4 h-4" />
                <span>مقارنة المحركات الثلاثية (Multi-Engine)</span>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl mt-accent-soft border border-amber-500/20">
                  <span className="text-[11px] font-bold mt-accent-text block mb-1.5">⚡ محرك مهدي الذكي</span>
                  <p className="text-xs leading-relaxed">{comparison.mahdiNeural || 'جاري التحليل...'}</p>
                </div>
                <div className="p-3.5 rounded-2xl mt-accent-soft border border-blue-500/20">
                  <span className="text-[11px] font-bold mt-accent-text block mb-1.5">📘 أسلوب DeepL الأدبي</span>
                  <p className="text-xs leading-relaxed">{comparison.deepLStyle || 'جاري التحليل...'}</p>
                </div>
                <div className="p-3.5 rounded-2xl mt-surface-soft border mt-hairline">
                  <span className="text-[11px] font-bold mt-subtext block mb-1.5">🌐 محرك MT التقليدي</span>
                  <p className="text-xs leading-relaxed">{comparison.standardMt || 'جاري التحليل...'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Cultural Notes */}
          {analysis?.culturalNotes && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1.5">
              <div className="flex items-center gap-2 text-sm font-bold mt-accent-text">
                <Globe2 className="w-4 h-4" />
                <span>السياق الثقافي والاستخدام الشائع</span>
              </div>
              <p className="text-xs leading-relaxed opacity-90">{analysis.culturalNotes}</p>
            </div>
          )}

          {/* Grammar & Linguistic Nuance */}
          {analysis?.grammarExplanation && (
            <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 space-y-1.5">
              <div className="flex items-center gap-2 text-sm font-bold mt-accent-text">
                <BookOpen className="w-4 h-4" />
                <span>الإيضاح النحوي والمفردات</span>
              </div>
              <p className="text-xs leading-relaxed opacity-90">{analysis.grammarExplanation}</p>
            </div>
          )}

          {/* Key Terms */}
          {analysis?.keyTerms && analysis.keyTerms.length > 0 && (
            <div className="space-y-2.5">
              <span className="text-xs font-bold opacity-70 block">المصطلحات البارزة:</span>
              <div className="flex flex-wrap gap-2">
                {analysis.keyTerms.map((kt, i) => (
                  <div key={i} className="px-3 py-1.5 rounded-xl mt-surface-soft border mt-hairline text-xs">
                    <strong className="mt-accent-text ml-1">{kt.term}:</strong>
                    <span className="opacity-80">{kt.meaning}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t mt-hairline mt-surface-soft flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl mt-surface-soft hover:bg-[var(--mt-surface)] text-xs font-semibold transition-all"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
