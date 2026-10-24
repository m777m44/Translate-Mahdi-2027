import React from 'react';
import {
  X, Camera, Users, Radio, Wifi, Cpu, FileText, Brain, BarChart3, HardDrive,
  AppWindow, Pen, Star, Palette, Settings, Languages, Sparkles,
} from 'lucide-react';
import { ThemeConfig } from '../types.ts';

export type ToolId =
  | 'image' | 'dual' | 'walkie' | 'p2p' | 'neural' | 'document' | 'phrasebook'
  | 'stats' | 'packs' | 'floating' | 'handwriting' | 'starred' | 'themes' | 'settings';

interface Tool {
  id: ToolId;
  nameAr: string;
  desc: string;
  icon: React.ReactNode;
  isNew?: boolean;
}

const TOOLS: Tool[] = [
  { id: 'walkie', nameAr: 'وضع اللاسلكي', desc: 'هاتف واحد يستمع للغتين ويترجم تلقائياً', icon: <Radio size={22} />, isNew: true },
  { id: 'p2p', nameAr: 'محادثة بين جهازين', desc: 'اتصال WebRTC مشفّر مع ترجمة فورية', icon: <Wifi size={22} />, isNew: true },
  { id: 'neural', nameAr: 'النماذج العصبية', desc: 'NLLB و Whisper على جهازك بدون إنترنت', icon: <Cpu size={22} />, isNew: true },
  { id: 'document', nameAr: 'ترجمة المستندات', desc: 'ملفات TXT و SRT و VTT مع الحفاظ على التوقيت', icon: <FileText size={22} />, isNew: true },
  { id: 'phrasebook', nameAr: 'العبارات والبطاقات', desc: 'بنك جمل أوفلاين ومراجعة بالتكرار المتباعد', icon: <Brain size={22} />, isNew: true },
  { id: 'stats', nameAr: 'لوحة الإحصائيات', desc: 'إنجازك اليومي وأكثر اللغات استخداماً', icon: <BarChart3 size={22} />, isNew: true },
  { id: 'dual', nameAr: 'المحادثة الثنائية', desc: 'ترجمة صوتية تبادلية بين متحدثين', icon: <Users size={22} /> },
  { id: 'image', nameAr: 'ترجمة الصور', desc: 'التقاط النص من الكاميرا وترجمته (OCR)', icon: <Camera size={22} /> },
  { id: 'floating', nameAr: 'النافذة العائمة', desc: 'ترجمة سريعة فوق أي تطبيق', icon: <AppWindow size={22} /> },
  { id: 'handwriting', nameAr: 'الكتابة اليدوية', desc: 'ارسم النص وأدخله مباشرة', icon: <Pen size={22} /> },
  { id: 'packs', nameAr: 'حزم الأوفلاين', desc: 'إدارة اللغات والحزم المحلية', icon: <HardDrive size={22} /> },
  { id: 'starred', nameAr: 'المفضلة', desc: 'ترجماتك المميزة بنجمة', icon: <Star size={22} /> },
  { id: 'themes', nameAr: 'مكتبة الثيمات', desc: 'أكثر من 1500 ثيم فوري', icon: <Palette size={22} /> },
  { id: 'settings', nameAr: 'الإعدادات', desc: 'كل خيارات التطبيق الاحترافية', icon: <Settings size={22} /> },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeConfig;
  onOpenTool: (id: ToolId) => void;
}

export const ToolsHubModal: React.FC<Props> = ({ isOpen, onClose, onOpenTool }) => {
  if (!isOpen) return null;
  return (
    <div className="mt-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="مركز الأدوات">
      <div className="mt-modal w-full max-w-3xl" dir="rtl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: 'var(--mt-border)' }}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl" style={{ background: 'var(--mt-primary-gradient)', color: 'var(--mt-on-primary)' }}>
              <Languages size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold mt-heading flex items-center gap-2">
                مركز الأدوات
                <span className="mt-badge text-[9px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: 'var(--mt-accent-soft)', color: 'var(--mt-accent)' }}>
                  <Sparkles size={9} /> إصدار 4.0
                </span>
              </h2>
              <p className="text-[11px] mt-subtext">كل قدرات الترجمة في مكان واحد أنيق</p>
            </div>
          </div>
          <button onClick={onClose} className="mt-icon-btn p-2" aria-label="إغلاق"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto mt-scroll p-4 sm:p-5" style={{ maxHeight: '70vh' }}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {TOOLS.map((tool) => (
              <button
                key={tool.id}
                onClick={() => { onClose(); onOpenTool(tool.id); }}
                className="group relative text-right mt-surface rounded-2xl border p-4 transition-all hover:-translate-y-0.5"
                style={{ borderColor: 'var(--mt-border)' }}
              >
                {tool.isNew && (
                  <span className="absolute top-2 left-2 text-[8px] font-extrabold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--mt-primary-gradient)', color: 'var(--mt-on-primary)' }}>
                    جديد
                  </span>
                )}
                <div className="p-2.5 rounded-xl w-fit mb-2.5 mt-accent-soft transition-transform group-hover:scale-110">
                  {tool.icon}
                </div>
                <h3 className="text-xs font-extrabold mb-1">{tool.nameAr}</h3>
                <p className="text-[9.5px] mt-subtext leading-snug line-clamp-2">{tool.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
