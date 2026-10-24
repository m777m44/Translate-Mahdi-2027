import React, { useState, useRef } from 'react';
import {
  X, FileText, Upload, Loader2, Download, FileWarning, CheckCircle2, Languages, Subtitles,
} from 'lucide-react';
import { ThemeConfig, Language } from '../types.ts';
import { LANGUAGES } from '../constants.ts';
import {
  detectDocumentKind, parseDocument, translateDocument, buildTranslatedFileName,
  downloadTextFile, ParsedDocument, TranslateProgress,
} from '../documentTranslator.ts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeConfig;
  languages?: Language[];
  translateFn: (text: string, from: string, to: string) => Promise<string>;
  onToast?: (msg: string) => void;
}

export const DocumentTranslateModal: React.FC<Props> = ({
  isOpen, onClose, theme, languages = LANGUAGES, translateFn, onToast,
}) => {
  const [targetLang, setTargetLang] = useState('ar');
  const [doc, setDoc] = useState<ParsedDocument | null>(null);
  const [rawName, setRawName] = useState('');
  const [output, setOutput] = useState('');
  const [progress, setProgress] = useState<TranslateProgress | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const reset = () => {
    setDoc(null); setOutput(''); setProgress(null); setBusy(false); setError(null); setRawName('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleFile = async (file: File) => {
    setError(null);
    const kind = detectDocumentKind(file.name);
    if (!kind) {
      setError('الصيغة غير مدعومة — الملفات المقبولة: .txt و .md و .srt و .vtt');
      return;
    }
    const text = await file.text();
    setRawName(file.name);
    setDoc(parseDocument(file.name, text));
    setOutput('');
    setProgress(null);
  };

  const run = async () => {
    if (!doc) return;
    setBusy(true);
    setError(null);
    try {
      const result = await translateDocument(
        doc,
        (t) => translateFn(t, 'auto', targetLang),
        (p) => setProgress(p),
      );
      setOutput(result);
      onToast?.('اكتملت ترجمة المستند ✓');
    } catch (e: any) {
      setError(`فشلت الترجمة: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    if (!doc || !output) return;
    const name = buildTranslatedFileName(rawName || doc.fileName, targetLang);
    const mime = doc.kind === 'vtt' ? 'text/vtt' : doc.kind === 'srt' ? 'application/x-subrip' : 'text/plain';
    downloadTextFile(name, output, mime);
  };

  const blockCount = doc?.blocks.filter((b) => b.lines.length).length || 0;

  return (
    <div className="mt-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="ترجمة المستندات">
      <div className="mt-modal w-full max-w-2xl" dir="rtl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: 'var(--mt-border)' }}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl" style={{ background: 'var(--mt-primary-gradient)', color: 'var(--mt-on-primary)' }}>
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold mt-heading">ترجمة المستندات والترجمات</h2>
              <p className="text-[11px] mt-subtext">TXT / Markdown / SRT / VTT — مع الحفاظ على توقيتات الترجمة</p>
            </div>
          </div>
          <button onClick={onClose} className="mt-icon-btn p-2" aria-label="إغلاق"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto mt-scroll p-4 sm:p-5 space-y-4" style={{ maxHeight: '62vh' }}>
          {error && (
            <div className="p-3 rounded-2xl text-[11px] flex items-start gap-2" style={{ background: 'color-mix(in srgb, var(--mt-danger) 14%, transparent)', color: 'var(--mt-danger)' }}>
              <FileWarning size={15} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
            onClick={() => inputRef.current?.click()}
            className="rounded-3xl border-2 border-dashed p-8 text-center cursor-pointer transition-all"
            style={{
              borderColor: dragOver ? 'var(--mt-accent)' : 'var(--mt-border)',
              background: dragOver ? 'var(--mt-accent-soft)' : 'var(--mt-surface)',
            }}
          >
            <Upload size={30} className="mx-auto mt-accent-text mb-2" />
            <p className="text-sm font-extrabold">اسحب ملفك هنا أو انقر للاختيار</p>
            <p className="text-[10px] mt-subtext mt-1 flex items-center justify-center gap-1.5">
              <Subtitles size={12} /> .txt · .md · .srt · .vtt
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".txt,.md,.srt,.vtt,text/plain"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>

          {doc && (
            <>
              <div className="mt-surface rounded-2xl border p-3.5" style={{ borderColor: 'var(--mt-border)' }}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold truncate flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="mt-accent-text shrink-0" /> {rawName}
                    </p>
                    <p className="text-[10px] mt-subtext mt-1">
                      النوع: {doc.kind.toUpperCase()} · {blockCount} كتلة نصية قابلة للترجمة
                    </p>
                  </div>
                  <button onClick={reset} className="mt-btn mt-btn-ghost rounded-xl px-3 py-1.5 text-[11px] font-bold">ملف آخر</button>
                </div>
              </div>

              <label className="flex items-center gap-2.5">
                <Languages size={15} className="mt-accent-text" />
                <span className="text-[11px] font-bold">الترجمة إلى:</span>
                <select value={targetLang} onChange={(e) => setTargetLang(e.target.value)} className="mt-input rounded-xl px-2.5 py-2 text-xs font-bold bg-transparent">
                  {languages.map((l) => <option key={l.code} value={l.code}>{l.flag} {l.nativeName}</option>)}
                </select>
              </label>

              {busy && progress && (
                <div>
                  <div className="mt-progress-track">
                    <div className="mt-progress-bar" style={{ width: `${progress.percent}%` }} />
                  </div>
                  <p className="text-[10px] mt-subtext mt-1.5 flex items-center gap-1.5">
                    <Loader2 size={11} className="animate-spin" /> يترجم الكتلة {progress.done} من {progress.total} ({progress.percent}%)
                  </p>
                </div>
              )}

              {output && (
                <div className="mt-surface rounded-2xl border p-3.5" style={{ borderColor: 'var(--mt-border)' }}>
                  <p className="text-[10px] font-bold mt-subtext mb-2">معاينة النتيجة</p>
                  <pre className="text-[11px] leading-relaxed whitespace-pre-wrap max-h-44 overflow-y-auto mt-scroll font-sans">{output.slice(0, 2400)}</pre>
                </div>
              )}
            </>
          )}
        </div>

        <div className="border-t px-5 py-3.5 flex gap-2.5" style={{ borderColor: 'var(--mt-border)' }}>
          {!output ? (
            <button onClick={run} disabled={!doc || busy} className="mt-btn mt-btn-primary flex-1 rounded-2xl py-3 text-sm font-extrabold flex items-center justify-center gap-2">
              {busy ? <Loader2 size={17} className="animate-spin" /> : <Languages size={17} />}
              {busy ? 'جاري الترجمة...' : 'ترجمة المستند'}
            </button>
          ) : (
            <button onClick={save} className="mt-btn mt-btn-primary flex-1 rounded-2xl py-3 text-sm font-extrabold flex items-center justify-center gap-2">
              <Download size={17} /> تنزيل الملف المترجم
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
