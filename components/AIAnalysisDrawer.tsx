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
    <div className="fixed inset-0 z-50 flex flex-col w-full h-full bg-zinc-950/98 text-white backdrop-blur-2xl animate-in slide-in-from-bottom-4 duration-300 overflow-hidden">
      <div 
        className={`w-full h-full flex flex-col ${theme.card} ${theme.text} overflow-hidden`}
        dir="rtl"
      >
        {/* Header - Full Width Sticky */}
        <div className="flex items-center justify-between px-4 sm:px-8 py-3.5 border-b border-white/10 bg-black/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
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
            className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-200 hover:text-white transition-all text-xs font-bold flex items-center gap-1.5 active:scale-95"
            title="إغلاق والعودة"
          >
            <X className="w-4 h-4" />
            <span>إغلاق</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Source Text Snippet */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs">
            <span className="opacity-60 block mb-1">النص الأصلي:</span>
            <p className="font-medium">{sourceText}</p>
          </div>

          {/* Alternatives */}
          {analysis?.alternatives && analysis.alternatives.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-amber-400">
                <Lightbulb className="w-4 h-4" />
                <span>بدائل وصياغات مقترحة</span>
              </div>

              <div className="grid gap-2.5">
                {analysis.alternatives.map((alt, idx) => (
                  <div 
                    key={idx}
                    className="p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 hover:border-amber-500/30 transition-all flex items-center justify-between gap-3 group"
                  >
                    <p className="text-sm font-medium flex-1">{alt}</p>
                    <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100">
                      <button
                        onClick={() => handleCopy(alt, idx)}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-zinc-300 transition-all"
                        title="نسخ"
                      >
                        {copiedIndex === idx ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => {
                          onSelectAlternative(alt);
                          onClose();
                        }}
                        className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-all flex items-center gap-1"
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
              <div className="flex items-center gap-2 text-sm font-bold text-indigo-400">
                <Scale className="w-4 h-4" />
                <span>مقارنة المحركات الثلاثية (Multi-Engine)</span>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                  <span className="text-[11px] font-bold text-amber-400 block mb-1.5">⚡ محرك مهدي الذكي</span>
                  <p className="text-xs leading-relaxed">{comparison.mahdiNeural || 'جاري التحليل...'}</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                  <span className="text-[11px] font-bold text-blue-400 block mb-1.5">📘 أسلوب DeepL الأدبي</span>
                  <p className="text-xs leading-relaxed">{comparison.deepLStyle || 'جاري التحليل...'}</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-zinc-500/10 border border-zinc-500/20">
                  <span className="text-[11px] font-bold text-zinc-400 block mb-1.5">🌐 محرك MT التقليدي</span>
                  <p className="text-xs leading-relaxed">{comparison.standardMt || 'جاري التحليل...'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Cultural Notes */}
          {analysis?.culturalNotes && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1.5">
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-400">
                <Globe2 className="w-4 h-4" />
                <span>السياق الثقافي والاستخدام الشائع</span>
              </div>
              <p className="text-xs leading-relaxed opacity-90">{analysis.culturalNotes}</p>
            </div>
          )}

          {/* Grammar & Linguistic Nuance */}
          {analysis?.grammarExplanation && (
            <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 space-y-1.5">
              <div className="flex items-center gap-2 text-sm font-bold text-sky-400">
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
                  <div key={i} className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs">
                    <strong className="text-amber-400 ml-1">{kt.term}:</strong>
                    <span className="opacity-80">{kt.meaning}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-black/20 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
