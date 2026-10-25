import React from 'react';
import {
  X, Wifi, WifiOff, Zap, Power, Volume2, Type, Palette, HardDrive,
  Trash2, Info, ChevronLeft,
} from 'lucide-react';
import { ThemeConfig, TtsSettings } from '../types.ts';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeConfig;
  forceOffline: boolean;
  onToggleForceOffline: (v: boolean) => void;
  instantTranslate: boolean;
  onToggleInstant: (v: boolean) => void;
  keepScreenOn: boolean;
  onToggleKeepScreenOn: (v: boolean) => void;
  ttsSettings: TtsSettings;
  onChangeTtsSettings: (s: TtsSettings) => void;
  availableVoices: string[];
  onOpenThemes: () => void;
  onOpenZoom: () => void;
  onOpenPacks: () => void;
  historyCount: number;
  onClearHistory: () => void;
}

const Toggle: React.FC<{ value: boolean; onChange: (v: boolean) => void }> = ({ value, onChange }) => (
  <button
    role="switch"
    aria-checked={value}
    onClick={() => onChange(!value)}
    className="relative w-11 h-6 rounded-full transition-colors shrink-0"
    style={{ background: value ? 'var(--mt-primary)' : 'var(--mt-surface-2, var(--mt-surface))', border: '1px solid var(--mt-border)' }}
  >
    <span
      className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
      style={{ insetInlineStart: value ? 'calc(100% - 1.375rem)' : '0.125rem' }}
    />
  </button>
);

const Row: React.FC<{ icon: React.ReactNode; title: string; desc?: string; children: React.ReactNode }> = ({ icon, title, desc, children }) => (
  <div className="flex items-center gap-3 py-3 border-b last:border-0" style={{ borderColor: 'var(--mt-border)' }}>
    <div className="p-2 rounded-xl mt-accent-soft shrink-0">{icon}</div>
    <div className="flex-1 min-w-0">
      <div className="text-xs font-extrabold">{title}</div>
      {desc && <div className="text-[10px] mt-subtext mt-0.5 leading-relaxed">{desc}</div>}
    </div>
    {children}
  </div>
);

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen, onClose, forceOffline, onToggleForceOffline,
  instantTranslate, onToggleInstant, keepScreenOn, onToggleKeepScreenOn,
  ttsSettings, onChangeTtsSettings, availableVoices,
  onOpenThemes, onOpenZoom, onOpenPacks, historyCount, onClearHistory,
}) => {
  if (!isOpen) return null;

  const navBtn = 'mt-btn mt-btn-ghost rounded-xl px-3 py-2 text-[11px] font-bold flex items-center gap-1.5';

  return (
    <div className="mt-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="الإعدادات">
      <div className="mt-modal w-full max-w-lg" dir="rtl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: 'var(--mt-border)' }}>
          <h2 className="text-base font-extrabold mt-heading">الإعدادات</h2>
          <button onClick={onClose} className="mt-icon-btn p-2" aria-label="إغلاق"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto mt-scroll px-5 py-2" style={{ maxHeight: '72vh' }}>
          <Row icon={forceOffline ? <WifiOff size={17} /> : <Wifi size={17} />} title="وضع بدون إنترنت" desc="الاعتماد على القاموس المحلي فقط">
            <Toggle value={forceOffline} onChange={onToggleForceOffline} />
          </Row>

          <Row icon={<Zap size={17} />} title="ترجمة فورية أثناء الكتابة" desc="تظهر الترجمة تلقائياً دون الضغط على زر">
            <Toggle value={instantTranslate} onChange={onToggleInstant} />
          </Row>

          <Row icon={<Power size={17} />} title="إبقاء الشاشة مضاءة" desc="تمنع انطفاء الشاشة أثناء الجلسات الطويلة">
            <Toggle value={keepScreenOn} onChange={onToggleKeepScreenOn} />
          </Row>

          <Row icon={<Palette size={17} />} title="الثيمات والمظهر">
            <button className={navBtn} onClick={onOpenThemes}>فتح المكتبة <ChevronLeft size={14} /></button>
          </Row>

          <Row icon={<Type size={17} />} title="حجم الخط">
            <button className={navBtn} onClick={onOpenZoom}>ضبط الحجم <ChevronLeft size={14} /></button>
          </Row>

          <Row icon={<HardDrive size={17} />} title="حزم اللغات الأوفلاين">
            <button className={navBtn} onClick={onOpenPacks}>إدارة الحزم <ChevronLeft size={14} /></button>
          </Row>

          <div className="py-3 border-b" style={{ borderColor: 'var(--mt-border)' }}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl mt-accent-soft shrink-0"><Volume2 size={17} /></div>
              <div className="text-xs font-extrabold">إعدادات الصوت والنطق</div>
            </div>
            <div className="mt-3 space-y-3 pe-11">
              <label className="block text-[10px] mt-subtext font-bold">
                الصوت
                <select
                  value={ttsSettings.voiceName}
                  onChange={(e) => onChangeTtsSettings({ ...ttsSettings, voiceName: e.target.value })}
                  className="mt-input w-full mt-1 rounded-xl text-xs py-2"
                >
                  {availableVoices.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </label>
              <label className="block text-[10px] mt-subtext font-bold">
                السرعة: {ttsSettings.rate?.toFixed(1) ?? '1.0'}x
                <input
                  type="range" min={0.5} max={1.8} step={0.1}
                  value={ttsSettings.rate ?? 1}
                  onChange={(e) => onChangeTtsSettings({ ...ttsSettings, rate: Number(e.target.value) })}
                  className="w-full mt-1"
                />
              </label>
              <label className="block text-[10px] mt-subtext font-bold">
                طبقة الصوت: {ttsSettings.pitch?.toFixed(1) ?? '1.0'}
                <input
                  type="range" min={0.5} max={1.8} step={0.1}
                  value={ttsSettings.pitch ?? 1}
                  onChange={(e) => onChangeTtsSettings({ ...ttsSettings, pitch: Number(e.target.value) })}
                  className="w-full mt-1"
                />
              </label>
            </div>
          </div>

          <Row icon={<Trash2 size={17} />} title={`مسح السجل (${historyCount})`} desc="حذف كل الترجمات المحفوظة على هذا الجهاز">
            <button className="mt-btn rounded-xl px-3 py-2 text-[11px] font-bold" style={{ color: 'var(--mt-danger)' }} onClick={onClearHistory}>
              مسح
            </button>
          </Row>

          <div className="flex items-center gap-3 py-4">
            <div className="p-2 rounded-xl mt-accent-soft shrink-0"><Info size={17} /></div>
            <div className="text-[10px] mt-subtext leading-relaxed">
              <div className="font-extrabold mt-heading mb-0.5">مهدي للترجمة — Mahdi Translate</div>
              <div>الإصدار 5.1.0 · MAHDI © 2027 · ترجمة فورية أونلاين وأوفلاين</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
