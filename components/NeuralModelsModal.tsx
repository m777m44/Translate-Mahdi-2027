import React, { useState, useEffect, useCallback } from 'react';
import {
  X, Download, Trash2, Cpu, Zap, BrainCircuit, AudioLines, Languages,
  CheckCircle2, HardDrive, AlertTriangle, RefreshCw, Info, Sparkles, Loader2,
} from 'lucide-react';
import { ThemeConfig } from '../types.ts';
import {
  NEURAL_MODELS,
  NeuralModelStatus,
  NeuralQuality,
  getNeuralModelStatuses,
  getNeuralStorageMB,
  downloadModel,
  deleteNeuralModel,
  subscribeNeuralState,
  isWebGpuAvailable,
} from '../neuralEngine.ts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeConfig;
  quality: NeuralQuality;
  onQualityChange: (q: NeuralQuality) => void;
  useGpu: boolean;
  onUseGpuChange: (v: boolean) => void;
  onToast?: (msg: string) => void;
}

const QUALITY_OPTIONS: Array<{ id: NeuralQuality; nameAr: string; desc: string }> = [
  { id: 'fast-int4', nameAr: 'سريع (INT4)', desc: 'أصغر حجماً وأسرع استجابة' },
  { id: 'balanced-int8', nameAr: 'متوازن (INT8)', desc: 'توازن الجودة والحجم' },
  { id: 'fp16-precise', nameAr: 'دقة عالية (FP32)', desc: 'أعلى جودة وأكبر حجماً' },
];

export const NeuralModelsModal: React.FC<Props> = ({
  isOpen, onClose, theme, quality, onQualityChange, useGpu, onUseGpuChange, onToast,
}) => {
  const [statuses, setStatuses] = useState<NeuralModelStatus[]>([]);
  const [storageMB, setStorageMB] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'downloaded' | 'nllb' | 'marian' | 'whisper'>('all');
  const [mirror, setMirror] = useState('');
  const webgpu = isWebGpuAvailable();

  const refresh = useCallback(async () => {
    const [s, mb] = await Promise.all([getNeuralModelStatuses(), getNeuralStorageMB()]);
    setStatuses(s);
    setStorageMB(mb);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    refresh();
    const unsub = subscribeNeuralState(refresh);
    return unsub;
  }, [isOpen, refresh]);

  useEffect(() => {
    try { setMirror(localStorage.getItem('mahdi_hf_mirror') || ''); } catch { /* ignore */ }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDownload = async (id: string) => {
    setBusyId(id);
    try {
      await downloadModel(id, quality);
      onToast?.('اكتمل تنزيل النموذج — يعمل الآن بدون إنترنت ✓');
    } catch (e: any) {
      onToast?.(`فشل التنزيل: ${e?.message || e}`);
    } finally {
      setBusyId(null);
      refresh();
    }
  };

  const handleDelete = async (id: string) => {
    await deleteNeuralModel(id);
    onToast?.('تم حذف النموذج وتحرير المساحة');
    refresh();
  };

  const saveMirror = () => {
    try {
      if (mirror.trim()) localStorage.setItem('mahdi_hf_mirror', mirror.trim());
      else localStorage.removeItem('mahdi_hf_mirror');
      onToast?.('تم حفظ إعدادات المصدر — أعد فتح الأداة العصبية للتطبيق');
    } catch { /* ignore */ }
  };

  const filtered = statuses.filter((s) => {
    if (filter === 'all' || filter === 'downloaded') {
      return filter === 'all' || s.downloaded;
    }
    return s.kind === filter;
  });

  const downloadedCount = statuses.filter((s) => s.downloaded).length;
  const kindMeta = {
    nllb: { icon: BrainCircuit, label: 'متعدد اللغات' },
    marian: { icon: Languages, label: 'زوج لغوي' },
    whisper: { icon: AudioLines, label: 'تعرّف الكلام' },
  } as const;

  return (
    <div className="mt-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="إدارة النماذج العصبية المحلية">
      <div className="mt-modal w-full max-w-3xl" dir="rtl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: 'var(--mt-border)' }}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl" style={{ background: 'var(--mt-primary-gradient)', color: 'var(--mt-on-primary)' }}>
              <Cpu size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold mt-heading">الذكاء الاصطناعي على الجهاز</h2>
              <p className="text-[11px] mt-subtext">نماذج NLLB و Bergamot/Marian و Whisper — تعمل محلياً بدون إنترنت تماماً</p>
            </div>
          </div>
          <button onClick={onClose} className="mt-icon-btn p-2" aria-label="إغلاق"><X size={20} /></button>
        </div>

        {/* Status strip */}
        <div className="px-5 py-3 grid grid-cols-2 sm:grid-cols-4 gap-2 border-b" style={{ borderColor: 'var(--mt-border)' }}>
          <div className="mt-surface rounded-2xl p-2.5 flex items-center gap-2">
            <HardDrive size={16} className="mt-accent-text" />
            <div>
              <div className="text-[10px] mt-subtext">المساحة المستخدمة</div>
              <div className="text-sm font-extrabold">{storageMB} MB</div>
            </div>
          </div>
          <div className="mt-surface rounded-2xl p-2.5 flex items-center gap-2">
            <Download size={16} className="mt-accent-text" />
            <div>
              <div className="text-[10px] mt-subtext">نماذج محمّلة</div>
              <div className="text-sm font-extrabold">{downloadedCount} / {NEURAL_MODELS.length}</div>
            </div>
          </div>
          <div className="mt-surface rounded-2xl p-2.5 flex items-center gap-2">
            <Zap size={16} style={{ color: webgpu ? 'var(--mt-success)' : 'var(--mt-warning)' }} />
            <div>
              <div className="text-[10px] mt-subtext">تسريع WebGPU</div>
              <div className="text-sm font-extrabold">{webgpu ? 'متاح' : 'WASM'}</div>
            </div>
          </div>
          <div className="mt-surface rounded-2xl p-2.5 flex items-center gap-2">
            <Sparkles size={16} className="mt-accent-text" />
            <div>
              <div className="text-[10px] mt-subtext">جودة النماذج</div>
              <div className="text-sm font-extrabold">{QUALITY_OPTIONS.find((q) => q.id === quality)?.nameAr}</div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="px-5 py-3 flex flex-wrap items-center gap-2 border-b" style={{ borderColor: 'var(--mt-border)' }}>
          {(['all', 'downloaded', 'nllb', 'marian', 'whisper'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="mt-chip px-3 py-1.5 rounded-full text-[11px] font-bold border"
              style={{
                borderColor: filter === f ? 'var(--mt-accent)' : 'var(--mt-border)',
                background: filter === f ? 'var(--mt-accent-soft)' : 'transparent',
                color: filter === f ? 'var(--mt-accent)' : 'var(--mt-subtext)',
              }}
            >
              {f === 'all' ? 'الكل' : f === 'downloaded' ? 'المحمّلة' : f === 'nllb' ? 'متعدد اللغات' : f === 'marian' ? 'أزواج لغوية' : 'صوت'}
            </button>
          ))}
          <button onClick={refresh} className="mt-icon-btn p-2 mr-auto" title="تحديث الحالة"><RefreshCw size={15} /></button>
        </div>

        {/* Model list */}
        <div className="flex-1 overflow-y-auto mt-scroll p-4 sm:p-5 space-y-3" style={{ maxHeight: '46vh' }}>
          {filtered.map((m) => {
            const Icon = kindMeta[m.kind].icon;
            const busy = busyId === m.id || m.active;
            return (
              <div key={m.id} className="mt-surface rounded-2xl border p-3.5" style={{ borderColor: 'var(--mt-border)' }}>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl mt-accent-soft shrink-0">
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-extrabold">{m.titleAr}</h3>
                      {m.recommended && (
                        <span className="mt-badge text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--mt-accent-soft)', color: 'var(--mt-accent)' }}>موصى به</span>
                      )}
                      {m.downloaded && (
                        <span className="mt-badge text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: 'color-mix(in srgb, var(--mt-success) 18%, transparent)', color: 'var(--mt-success)' }}>
                          <CheckCircle2 size={10} /> جاهز أوفلاين
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] mt-subtext mt-1 leading-relaxed">{m.descriptionAr}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] mt-subtext">
                      <span className="flex items-center gap-1"><HardDrive size={11} /> ~{m.sizeMB} MB</span>
                      <span className="flex items-center gap-1"><Cpu size={11} /> {kindMeta[m.kind].label}</span>
                      {m.error && <span className="flex items-center gap-1 mt-danger-text"><AlertTriangle size={11} /> {m.error.slice(0, 40)}</span>}
                    </div>

                    {busy && (
                      <div className="mt-2.5">
                        <div className="mt-progress-track">
                          <div className="mt-progress-bar" style={{ width: `${Math.max(3, m.progress)}%` }} />
                        </div>
                        <div className="text-[10px] mt-subtext mt-1 flex items-center gap-1.5">
                          <Loader2 size={11} className="animate-spin" /> جاري التنزيل... {m.progress}%
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="shrink-0">
                    {m.downloaded ? (
                      <button onClick={() => handleDelete(m.id)} disabled={busy} className="mt-btn mt-btn-ghost px-3 py-2 rounded-xl text-[11px] font-bold flex items-center gap-1.5" title="حذف النموذج">
                        <Trash2 size={14} /> حذف
                      </button>
                    ) : (
                      <button onClick={() => handleDownload(m.id)} disabled={busy} className="mt-btn mt-btn-primary px-3 py-2 rounded-xl text-[11px] font-bold flex items-center gap-1.5">
                        {busy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} تنزيل
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-10 mt-subtext text-sm">لا توجد نماذج في هذا التصنيف</div>
          )}
        </div>

        {/* Footer settings */}
        <div className="border-t px-5 py-3.5 space-y-3" style={{ borderColor: 'var(--mt-border)' }}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold mt-subtext">جودة الأوزان:</span>
            {QUALITY_OPTIONS.map((q) => (
              <button
                key={q.id}
                onClick={() => onQualityChange(q.id)}
                title={q.desc}
                className="mt-chip px-3 py-1.5 rounded-full text-[11px] font-bold border"
                style={{
                  borderColor: quality === q.id ? 'var(--mt-accent)' : 'var(--mt-border)',
                  background: quality === q.id ? 'var(--mt-accent-soft)' : 'transparent',
                  color: quality === q.id ? 'var(--mt-accent)' : 'var(--mt-subtext)',
                }}
              >
                {q.nameAr}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" checked={useGpu} onChange={(e) => onUseGpuChange(e.target.checked)} className="accent-[var(--mt-accent)] w-4 h-4" />
            <span className="text-[11px] font-bold flex items-center gap-1.5"><Zap size={13} className="mt-accent-text" /> تسريع المعالجة عبر WebGPU/NPU عند توفره</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              value={mirror}
              onChange={(e) => setMirror(e.target.value)}
              placeholder="مرآة HuggingFace بديلة (اختياري) مثال: https://hf-mirror.com"
              className="mt-input flex-1 rounded-xl px-3 py-2 text-[11px]"
              dir="ltr"
            />
            <button onClick={saveMirror} className="mt-btn mt-btn-outline px-3 py-2 rounded-xl text-[11px] font-bold">حفظ المصدر</button>
          </div>
          <p className="text-[10px] mt-subtext flex items-start gap-1.5 leading-relaxed">
            <Info size={12} className="shrink-0 mt-0.5" />
            النماذج تُحفظ داخل ذاكرة التطبيق (Cache API) وتعمل بدون إنترنت بعد التنزيل، ولا تمر نصوصك على أي خادم. في المناطق التي يُحجب فيها HuggingFace، ضع رابط مرآة بديلة مثل hf-mirror.com.
          </p>
        </div>
      </div>
    </div>
  );
};
