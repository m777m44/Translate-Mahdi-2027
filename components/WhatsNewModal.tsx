import React from 'react';
import {
  X, Cpu, Radio, Wifi, FileText, Brain, BarChart3, ShieldCheck, Zap, Sparkles,
} from 'lucide-react';
import { ThemeConfig } from '../types.ts';

const VERSION = '4.1.0';
const SEEN_KEY = 'mahdi_whatsnew_seen';

export function shouldShowWhatsNew(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) !== VERSION;
  } catch {
    return false;
  }
}

export function markWhatsNewSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, VERSION);
  } catch { /* ignore */ }
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeConfig;
}

const HIGHLIGHTS = [
  {
    icon: ShieldCheck,
    title: 'ترجمة بلا خط مختلط — إصلاح شامل',
    desc: 'كل كلمة تُترجَم أو تُحوَّل لخط اللغة هدف (نقحرة عربية للأعلام والأسماء)، في الأونلاين والأوفلاين معاً. لن تبقى كلمة لاتينية عالقة مثل «Heroes» داخل ترجمتك بعد اليوم.',
  },
  {
    icon: Wifi,
    title: 'محرك Google gtx المجاني الجديد',
    desc: 'أُضيف محرر جوجل بدون مفتاح كأفضل خيار مجاني، مع تقسيم النصوص الطويلة إلى مقاطع على حدود الجمل ودمجها بسلاسة — ترتيب المحركات: Google ثم MyMemory ثم LibreTranslate.',
  },
  {
    icon: Brain,
    title: 'تحليل الكلمات التفصيلي',
    desc: 'نافذة جديدة تعرض ترجمة كل كلمة على حدة، نوعها (اسم/فعل/حرف…)، ونسبة التغطية المعجمية — أداة تعلّم وفهم دقيقة بلمسة واحدة من شريط النتيجة.',
  },
  {
    icon: Zap,
    title: 'إبقاء الشاشة مضاءة + عبارة اليوم',
    desc: 'زر Power في الترويسة يمنع انطفاء الشاشة أثناء الجلسات الطويلة، وبانر «عبارة اليوم» يقترح جملة مفيدة يومياً من بنك العبارات الثماني اللغات.',
  },
  {
    icon: Sparkles,
    title: 'واجهة متجاوبة لكل شاشات أندرويد',
    desc: 'أزرار ومسافات وأحجام خطوط متدرجة، مودالات منبثقة بملء الشاشة على الهواتف، دعم النتوء وشريط الإيماءات (safe-area)، ومنع أي تمدد أفقي للنصوص الطويلة.',
  },
  {
    icon: Cpu,
    title: 'ذكاء اصطناعي يعمل على جهازك',
    desc: 'نماذج NLLB-200 من ميتا و Bergamot/Marian و Whisper من OpenAI — ترجمة وتعرّف كلام محلي بالكامل بدون إنترنت وبخصوصية تامة، مستوحاة من بنية RTranslator.',
  },
  {
    icon: Radio,
    title: 'وضع اللاسلكي WalkieTalkie',
    desc: 'هاتف واحد يستمع للغتين معاً ويكتشف لغة المتحدث تلقائياً، يترجم وينطق ثم يعود للاستماع — كل ذلك في حلقة تلقائية سلسة.',
  },
  {
    icon: Wifi,
    title: 'محادثة مباشرة بين جهازين',
    desc: 'اقتران عبر رمز QR وقناة WebRTC مشفّرة نظير-إلى-نظير، مع ترجمة الرسائل على جهاز كل طرف دون أي خادم وسيط.',
  },
  {
    icon: FileText,
    title: 'ترجمة المستندات والترجمات المرئية',
    desc: 'أرسل ملفات TXT أو Markdown أو SRT أو VTT وتُترجم مع الحفاظ على توقيتات الترجمة المرئية، ثم نزّل الملف جاهزاً.',
  },
  {
    icon: Brain,
    title: 'عبارات وبطاقات مراجعة ذكية',
    desc: 'بنك جمل سفر وطوارئ يعمل أوفلاين بثماني لغات مع نظام تكرار متباعد (Leitner) لتعلّم العبارات بسرعة.',
  },
  {
    icon: BarChart3,
    title: 'لوحة إحصائيات وأداء',
    desc: 'تتبّع ترجماتك، سلسلة الأيام المتتالية، أكثر اللغات والمحركات استخداماً — ببيانات تبقى على جهازك.',
  },
  {
    icon: ShieldCheck,
    title: 'كشف لغة محلي بالكامل',
    desc: 'معرّف لغات ثلاثي الحروف (trigram) مستوحى من FastText و Lingua يعمل دون اتصال ويغذّي كل الأوضاع الصوتية.',
  },
  {
    icon: Zap,
    title: 'تسريع WebGPU/NPU',
    desc: 'تسريع الاستدلال العصبي عبر كرت الشاشة عند توفره، مع جودات أوزان INT4/INT8/FP32 ومرآة تنزيل بديلة للمناطق المحجوبة.',
  },
];

export const WhatsNewModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="mt-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="ما الجديد في الإصدار 4.1">
      <div className="mt-modal w-full max-w-2xl" dir="rtl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: 'var(--mt-border)' }}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl" style={{ background: 'var(--mt-primary-gradient)', color: 'var(--mt-on-primary)' }}>
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold mt-heading">ما الجديد في مهدي 4.1</h2>
              <p className="text-[11px] mt-subtext">إصلاح شامل للترجمة + محركات أقوى + أدوات وتجاوب جديد</p>
            </div>
          </div>
          <button onClick={onClose} className="mt-icon-btn p-2" aria-label="إغلاق"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto mt-scroll p-4 sm:p-5" style={{ maxHeight: '68vh' }}>
          <div className="grid sm:grid-cols-2 gap-3">
            {HIGHLIGHTS.map((h) => (
              <div key={h.title} className="mt-surface rounded-2xl border p-4" style={{ borderColor: 'var(--mt-border)' }}>
                <div className="p-2 rounded-xl w-fit mb-2.5 mt-accent-soft">
                  <h.icon size={19} />
                </div>
                <h3 className="text-xs font-extrabold mb-1.5">{h.title}</h3>
                <p className="text-[10.5px] mt-subtext leading-relaxed">{h.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t px-5 py-3.5" style={{ borderColor: 'var(--mt-border)' }}>
          <button
            onClick={() => { markWhatsNewSeen(); onClose(); }}
            className="mt-btn mt-btn-primary w-full rounded-2xl py-3 text-sm font-extrabold"
          >
            ابدأ التجربة الآن
          </button>
        </div>
      </div>
    </div>
  );
};
