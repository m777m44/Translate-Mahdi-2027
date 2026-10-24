import React, { useMemo, useState } from 'react';
import {
  X, BarChart3, Flame, Type, Mic, Camera, Cpu, TrendingUp, CalendarDays, Trash2, Globe,
} from 'lucide-react';
import { ThemeConfig } from '../types.ts';
import { summarizeStats, resetUsageStats, engineLabel, StatsSummary } from '../usageStats.ts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeConfig;
}

export const StatsModal: React.FC<Props> = ({ isOpen, onClose, theme }) => {
  const [tick, setTick] = useState(0);
  const summary: StatsSummary = useMemo(() => summarizeStats(), [isOpen, tick]);

  if (!isOpen) return null;

  const maxDay = Math.max(1, ...summary.last14Days.map((d) => d.count));
  const maxPair = Math.max(1, ...summary.topPairs.map((p) => p.count));
  const maxEngine = Math.max(1, ...summary.topEngines.map((e) => e.count));

  const cards = [
    { icon: TrendingUp, label: 'إجمالي الترجمات', value: summary.total.toLocaleString('ar-EG') },
    { icon: Type, label: 'حروف تُرجمت', value: summary.chars.toLocaleString('ar-EG') },
    { icon: Flame, label: 'أيام متتالية (Streak)', value: `${summary.streak} 🔥` },
    { icon: CalendarDays, label: 'أيام نشطة', value: `${summary.activeDays}` },
    { icon: Cpu, label: 'ترجمات عصبية محلية', value: summary.neural.toLocaleString('ar-EG') },
    { icon: Mic, label: 'ترجمات صوتية', value: summary.voice.toLocaleString('ar-EG') },
    { icon: Camera, label: 'ترجمات صور', value: summary.image.toLocaleString('ar-EG') },
    { icon: BarChart3, label: 'متوسط يومي', value: summary.avgPerDay.toLocaleString('ar-EG') },
  ];

  return (
    <div className="mt-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="لوحة الإحصائيات">
      <div className="mt-modal w-full max-w-2xl" dir="rtl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: 'var(--mt-border)' }}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl" style={{ background: 'var(--mt-primary-gradient)', color: 'var(--mt-on-primary)' }}>
              <BarChart3 size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold mt-heading">لوحة إحصائيات الترجمة</h2>
              <p className="text-[11px] mt-subtext">بياناتك تبقى على جهازك فقط ولا تُرسل لأي خادم</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => { if (confirm('هل تريد تصفير كل الإحصائيات؟')) { resetUsageStats(); setTick((t) => t + 1); } }}
              className="mt-icon-btn p-2" title="تصفير الإحصائيات"
            >
              <Trash2 size={17} />
            </button>
            <button onClick={onClose} className="mt-icon-btn p-2" aria-label="إغلاق"><X size={20} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto mt-scroll p-4 sm:p-5 space-y-5" style={{ maxHeight: '66vh' }}>
          {/* KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {cards.map((c) => (
              <div key={c.label} className="mt-surface rounded-2xl border p-3" style={{ borderColor: 'var(--mt-border)' }}>
                <c.icon size={17} className="mt-accent-text mb-2" />
                <div className="text-lg font-extrabold leading-none">{c.value}</div>
                <div className="text-[9.5px] mt-subtext mt-1 leading-tight">{c.label}</div>
              </div>
            ))}
          </div>

          {/* 14-day chart */}
          <div>
            <h3 className="text-xs font-extrabold mb-2.5 flex items-center gap-1.5"><BarChart3 size={14} className="mt-accent-text" /> آخر 14 يوماً</h3>
            <div className="mt-surface rounded-2xl border p-3.5" style={{ borderColor: 'var(--mt-border)' }}>
              <div className="flex items-end gap-1 h-28">
                {summary.last14Days.map((d) => (
                  <div key={d.day} className="flex-1 flex flex-col items-center justify-end gap-1 group">
                    <span className="text-[8px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">{d.count}</span>
                    <div
                      className="w-full rounded-t-md transition-all"
                      style={{
                        height: `${Math.max(4, (d.count / maxDay) * 100)}%`,
                        background: d.count ? 'var(--mt-primary-gradient)' : 'var(--mt-surface)',
                        border: d.count ? 'none' : '1px solid var(--mt-border)',
                      }}
                      title={`${d.day}: ${d.count}`}
                    />
                    <span className="text-[7.5px] mt-subtext rotate-0">{d.day}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pairs + engines */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="mt-surface rounded-2xl border p-3.5" style={{ borderColor: 'var(--mt-border)' }}>
              <h3 className="text-xs font-extrabold mb-2.5 flex items-center gap-1.5"><Globe size={14} className="mt-accent-text" /> أكثر أزواج اللغات</h3>
              {summary.topPairs.length === 0 && <p className="text-[11px] mt-subtext py-4 text-center">لا بيانات بعد</p>}
              <div className="space-y-2">
                {summary.topPairs.map((p) => (
                  <div key={p.pair}>
                    <div className="flex justify-between text-[10px] font-bold mb-1">
                      <span>{p.pair}</span><span>{p.count}</span>
                    </div>
                    <div className="mt-progress-track"><div className="mt-progress-bar" style={{ width: `${(p.count / maxPair) * 100}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-surface rounded-2xl border p-3.5" style={{ borderColor: 'var(--mt-border)' }}>
              <h3 className="text-xs font-extrabold mb-2.5 flex items-center gap-1.5"><Cpu size={14} className="mt-accent-text" /> المحركات المستخدمة</h3>
              {summary.topEngines.length === 0 && <p className="text-[11px] mt-subtext py-4 text-center">لا بيانات بعد</p>}
              <div className="space-y-2">
                {summary.topEngines.map((e) => (
                  <div key={e.engine}>
                    <div className="flex justify-between text-[10px] font-bold mb-1">
                      <span>{engineLabel(e.engine)}</span><span>{e.count}</span>
                    </div>
                    <div className="mt-progress-track"><div className="mt-progress-bar" style={{ width: `${(e.count / maxEngine) * 100}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
