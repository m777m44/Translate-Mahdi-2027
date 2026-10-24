import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Users, QrCode, Copy, Check, Link2, LogIn, Radio, Send, Volume2,
  Loader2, AlertCircle, Trash2, ShieldCheck, Wifi,
} from 'lucide-react';
import qrcode from 'qrcode-generator';
import { ThemeConfig, Language } from '../types.ts';
import { LANGUAGES } from '../constants.ts';
import { P2PSession, P2PConnectionState, P2PMessage, isWebRtcSupported } from '../p2pSession.ts';

interface ChatLine extends P2PMessage {
  mine: boolean;
  translatedText?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeConfig;
  languages?: Language[];
  translateFn: (text: string, from: string, to: string) => Promise<string>;
  onSpeak: (text: string, lang: string) => void;
}

type Step = 'role' | 'host-offer' | 'host-wait' | 'join-paste' | 'join-answer' | 'connected';

function toQrDataUrl(text: string): string | null {
  try {
    const qr = qrcode(0, 'L');
    qr.addData(text);
    qr.make();
    return qr.createDataURL(5, 10);
  } catch {
    return null;
  }
}

export const P2PConversationModal: React.FC<Props> = ({
  isOpen, onClose, theme, languages = LANGUAGES, translateFn, onSpeak,
}) => {
  const [step, setStep] = useState<Step>('role');
  const [state, setState] = useState<P2PConnectionState>('idle');
  const [myName, setMyName] = useState('');
  const [myLang, setMyLang] = useState('ar');
  const [peerLang, setPeerLang] = useState('en');
  const [offerCode, setOfferCode] = useState('');
  const [answerCode, setAnswerCode] = useState('');
  const [pastedCode, setPastedCode] = useState('');
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const sessionRef = useRef<P2PSession | null>(null);
  const translateRef = useRef(translateFn);
  const speakRef = useRef(onSpeak);
  const myLangRef = useRef(myLang);
  const bottomRef = useRef<HTMLDivElement>(null);
  translateRef.current = translateFn;
  speakRef.current = onSpeak;
  myLangRef.current = myLang;

  const supported = isWebRtcSupported();

  const reset = useCallback(() => {
    sessionRef.current?.close();
    sessionRef.current = null;
    setStep('role');
    setState('idle');
    setOfferCode('');
    setAnswerCode('');
    setPastedCode('');
    setQrUrl(null);
    setError(null);
    setLines([]);
    setDraft('');
  }, []);

  useEffect(() => () => sessionRef.current?.close(), []);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  if (!isOpen) return null;

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch { /* ignore */ }
  };

  const share = async (text: string) => {
    if (navigator.share) {
      try { await navigator.share({ text }); } catch { /* user cancelled */ }
    } else {
      copy(text);
    }
  };

  const bindSession = (session: P2PSession) => {
    sessionRef.current = session;
    // Re-bind events with translation handling for incoming messages.
    (session as any).events = {
      onState: (s: P2PConnectionState) => {
        setState(s);
        if (s === 'connected') setStep('connected');
        if (s === 'failed' || s === 'disconnected') {
          setError(s === 'failed' ? 'فشل الاتصال المباشر — قد تمنع الشبكة نظير-إلى-نظير. حاول مرة أخرى بشبكة أخرى.' : 'انقطع الاتصال مع الطرف الآخر.');
        }
      },
      onMessage: async (msg: P2PMessage) => {
        let translated = msg.text;
        try {
          if (msg.lang !== myLangRef.current) {
            translated = await translateRef.current(msg.text, msg.lang, myLangRef.current);
          }
        } catch { /* keep original */ }
        setLines((prev) => [...prev, { ...msg, mine: false, translatedText: translated }]);
        try { speakRef.current(translated, myLangRef.current); } catch { /* ignore */ }
      },
      onError: (m: string) => setError(m),
    };
  };

  const hostMeeting = async () => {
    setError(null);
    try {
      const session = new P2PSession();
      bindSession(session);
      const code = await session.createOffer();
      setOfferCode(code);
      setQrUrl(toQrDataUrl(code));
      setStep('host-wait');
    } catch (e: any) {
      setError(`تعذّر إنشاء الجلسة: ${e?.message || e}`);
    }
  };

  const hostAcceptAnswer = async () => {
    if (!sessionRef.current || !pastedCode.trim()) {
      setError('الصق كود الإجابة الذي أرسله الطرف المنضم أولاً.');
      return;
    }
    try {
      await sessionRef.current.acceptAnswer(pastedCode.trim());
      setStep('connected');
    } catch (e: any) {
      setError(e?.message || 'كود الإجابة غير صالح');
    }
  };

  const joinGenerateAnswer = async () => {
    setError(null);
    if (!pastedCode.trim()) {
      setError('الصق كود دعوة المضيف أولاً.');
      return;
    }
    try {
      const { session, answer } = await P2PSession.answerOffer(pastedCode.trim());
      bindSession(session);
      setAnswerCode(answer);
      setQrUrl(toQrDataUrl(answer));
      setStep('join-answer');
    } catch (e: any) {
      setError(e?.message || 'كود الدعوة غير صالح');
    }
  };

  const sendMessage = async () => {
    const text = draft.trim();
    if (!text || !sessionRef.current) return;
    setSending(true);
    sessionRef.current.send({ text, lang: myLang, name: myName || undefined });
    setLines((prev) => [
      ...prev,
      { id: `local-${Date.now()}`, text, lang: myLang, name: myName, ts: Date.now(), mine: true },
    ]);
    setDraft('');
    setSending(false);
  };

  const langName = (code: string) => languages.find((l) => l.code === code)?.nativeName || code;
  const rtlLang = (code: string) => languages.find((l) => l.code === code)?.rtl;

  return (
    <div className="mt-modal-backdrop" onClick={() => { reset(); onClose(); }} role="dialog" aria-modal="true" aria-label="محادثة مباشرة بين جهازين">
      <div className="mt-modal w-full max-w-2xl" dir="rtl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: 'var(--mt-border)' }}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl" style={{ background: 'var(--mt-primary-gradient)', color: 'var(--mt-on-primary)' }}>
              <Users size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold mt-heading">محادثة مباشرة بين جهازين</h2>
              <p className="text-[11px] mt-subtext flex items-center gap-1">
                <ShieldCheck size={11} className="mt-accent-text" /> اتصال WebRTC مشفّر مباشر — تُترجم الرسائل على جهازك
              </p>
            </div>
          </div>
          <button onClick={() => { reset(); onClose(); }} className="mt-icon-btn p-2" aria-label="إغلاق"><X size={20} /></button>
        </div>

        {!supported && (
          <div className="m-4 p-3 rounded-2xl text-[11px] flex items-start gap-2" style={{ background: 'color-mix(in srgb, var(--mt-danger) 14%, transparent)', color: 'var(--mt-danger)' }}>
            <AlertCircle size={15} className="shrink-0 mt-0.5" /> متصفحك لا يدعم WebRTC. استخدم تطبيق أندرويد أو متصفح حديث.
          </div>
        )}
        {error && (
          <div className="mx-4 mt-3 p-3 rounded-2xl text-[11px] flex items-start gap-2" style={{ background: 'color-mix(in srgb, var(--mt-warning) 14%, transparent)', color: 'var(--mt-warning)' }}>
            <AlertCircle size={15} className="shrink-0 mt-0.5" /> {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto mt-scroll p-4 sm:p-5" style={{ maxHeight: '62vh' }}>
          {/* STEP: role */}
          {step === 'role' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="mt-surface rounded-2xl p-3">
                  <span className="text-[10px] font-bold mt-subtext">اسمك (اختياري)</span>
                  <input value={myName} onChange={(e) => setMyName(e.target.value)} placeholder="مثلاً: مهدي" className="mt-input w-full rounded-xl px-3 py-2 mt-1 text-xs" />
                </label>
                <label className="mt-surface rounded-2xl p-3">
                  <span className="text-[10px] font-bold mt-subtext">لغتك</span>
                  <select value={myLang} onChange={(e) => setMyLang(e.target.value)} className="mt-input w-full rounded-xl px-2 py-2 mt-1 text-xs bg-transparent">
                    {languages.map((l) => <option key={l.code} value={l.code}>{l.flag} {l.nativeName}</option>)}
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button onClick={hostMeeting} disabled={!supported} className="mt-btn mt-btn-primary rounded-2xl p-5 flex flex-col items-center gap-2">
                  <Radio size={26} />
                  <span className="text-sm font-extrabold">إنشاء جلسة (مضيف)</span>
                  <span className="text-[10px] opacity-80">أنشئ كود الدعوة وشاركه مع الطرف الآخر</span>
                </button>
                <button onClick={() => setStep('join-paste')} disabled={!supported} className="mt-btn mt-btn-outline rounded-2xl p-5 flex flex-col items-center gap-2">
                  <LogIn size={26} />
                  <span className="text-sm font-extrabold">الانضمام لجلسة</span>
                  <span className="text-[10px] opacity-80">الصق كود الدعوة الذي استلمته من المضيف</span>
                </button>
              </div>
              <p className="text-[10px] mt-subtext leading-relaxed flex items-start gap-1.5">
                <Wifi size={12} className="shrink-0 mt-0.5" />
                يحتاج الطرفان إلى إنترنت فقط لتبادل كود الاقتران أول مرة؛ بعدها تمر الرسائل عبر قناة مباشرة مشفّرة، وكل الترجمة تتم محلياً على جهاز كل طرف.
              </p>
            </div>
          )}

          {/* STEP: host waiting for answer */}
          {step === 'host-wait' && (
            <div className="space-y-4">
              <h3 className="text-sm font-extrabold flex items-center gap-2"><QrCode size={16} className="mt-accent-text" /> 1) أرسل كود الدعوة هذا للطرف الآخر</h3>
              {qrUrl
                ? <img src={qrUrl} alt="QR الدعوة" className="w-52 h-52 mx-auto rounded-2xl bg-white p-2" />
                : <div className="text-center text-[11px] mt-subtext p-6">الكود كبير جداً لرسم QR — استخدم النسخ النصي</div>}
              <textarea readOnly value={offerCode} dir="ltr" className="mt-input w-full rounded-2xl p-3 text-[10px] font-mono" rows={4} />
              <div className="flex gap-2">
                <button onClick={() => share(offerCode)} className="mt-btn mt-btn-primary flex-1 rounded-xl py-2.5 text-xs font-bold flex items-center justify-center gap-1.5"><Link2 size={14} /> مشاركة</button>
                <button onClick={() => copy(offerCode)} className="mt-btn mt-btn-outline flex-1 rounded-xl py-2.5 text-xs font-bold flex items-center justify-center gap-1.5">
                  {copied ? <Check size={14} /> : <Copy size={14} />} نسخ
                </button>
              </div>
              <h3 className="text-sm font-extrabold pt-2">2) الصق كود الإجابة بعد أن ينضم الطرف الآخر</h3>
              <textarea value={pastedCode} onChange={(e) => setPastedCode(e.target.value)} dir="ltr" placeholder="الصق كود الإجابة هنا..." className="mt-input w-full rounded-2xl p-3 text-[10px] font-mono" rows={3} />
              <button onClick={hostAcceptAnswer} className="mt-btn mt-btn-primary w-full rounded-xl py-3 text-sm font-extrabold flex items-center justify-center gap-2">
                <Check size={16} /> إتمام الاقتران
              </button>
            </div>
          )}

          {/* STEP: joiner paste offer */}
          {step === 'join-paste' && (
            <div className="space-y-4">
              <h3 className="text-sm font-extrabold">الصق كود دعوة المضيف</h3>
              <textarea value={pastedCode} onChange={(e) => setPastedCode(e.target.value)} dir="ltr" placeholder="كود الدعوة..." className="mt-input w-full rounded-2xl p-3 text-[10px] font-mono" rows={5} />
              <div className="flex gap-2">
                <button onClick={() => setStep('role')} className="mt-btn mt-btn-ghost rounded-xl px-4 py-2.5 text-xs font-bold">رجوع</button>
                <button onClick={joinGenerateAnswer} className="mt-btn mt-btn-primary flex-1 rounded-xl py-2.5 text-xs font-bold flex items-center justify-center gap-2">
                  <QrCode size={15} /> توليد كود الإجابة
                </button>
              </div>
            </div>
          )}

          {/* STEP: joiner answer */}
          {step === 'join-answer' && (
            <div className="space-y-4">
              <h3 className="text-sm font-extrabold flex items-center gap-2"><Check size={16} className="mt-accent-text" /> أرسل كود الإجابة هذا إلى المضيف</h3>
              {qrUrl && <img src={qrUrl} alt="QR الإجابة" className="w-52 h-52 mx-auto rounded-2xl bg-white p-2" />}
              <textarea readOnly value={answerCode} dir="ltr" className="mt-input w-full rounded-2xl p-3 text-[10px] font-mono" rows={4} />
              <div className="flex gap-2">
                <button onClick={() => share(answerCode)} className="mt-btn mt-btn-primary flex-1 rounded-xl py-2.5 text-xs font-bold flex items-center justify-center gap-1.5"><Link2 size={14} /> مشاركة</button>
                <button onClick={() => copy(answerCode)} className="mt-btn mt-btn-outline flex-1 rounded-xl py-2.5 text-xs font-bold flex items-center justify-center gap-1.5"><Copy size={14} /> نسخ</button>
              </div>
              <p className="text-[11px] mt-subtext text-center flex items-center justify-center gap-2">
                <Loader2 size={13} className="animate-spin" /> بانتظار تأكيد المضيف للاتصال...
              </p>
            </div>
          )}

          {/* STEP: connected chat */}
          {step === 'connected' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="mt-badge text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5" style={{ background: 'color-mix(in srgb, var(--mt-success) 16%, transparent)', color: 'var(--mt-success)' }}>
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'currentColor' }} /> متصل مباشرة
                </span>
                <div className="flex items-center gap-2 text-[10px] mt-subtext">
                  <span>لغتك: <b className="mt-accent-text">{langName(myLang)}</b></span>
                </div>
              </div>
              <div className="space-y-2.5 min-h-[180px]">
                {lines.length === 0 && (
                  <div className="text-center py-10 mt-subtext text-xs">ابدأ الحديث — ستصل رسائلك مترجمة للطرف الآخر فوراً</div>
                )}
                {lines.map((l) => (
                  <div key={l.id} className={`flex ${l.mine ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[85%] rounded-2xl px-3.5 py-2.5 border" style={{ background: l.mine ? 'var(--mt-accent-soft)' : 'var(--mt-surface)', borderColor: 'var(--mt-border)' }}>
                      <div className="text-[9px] font-bold mt-subtext mb-1">{l.name || (l.mine ? 'أنا' : 'الطرف الآخر')} · {langName(l.lang)}</div>
                      <div className="text-xs font-semibold" dir={rtlLang(l.lang) ? 'rtl' : 'ltr'}>{l.text}</div>
                      {l.translatedText && (
                        <div className="mt-1.5 pt-1.5 border-t text-sm font-extrabold mt-accent-text flex items-start justify-between gap-2" style={{ borderColor: 'var(--mt-border)' }}>
                          <span>{l.translatedText}</span>
                          <button onClick={() => speakRef.current(l.translatedText!, myLang)} className="mt-icon-btn p-1 shrink-0" title="نطق"><Volume2 size={13} /></button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <div className="flex items-end gap-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  rows={2}
                  placeholder={`اكتب بـ${langName(myLang)}...`}
                  className="mt-input flex-1 rounded-2xl px-3 py-2.5 text-xs resize-none"
                  dir={rtlLang(myLang) ? 'rtl' : 'ltr'}
                />
                <button onClick={sendMessage} disabled={!draft.trim() || sending} className="mt-btn mt-btn-primary p-3.5 rounded-2xl" title="إرسال">
                  <Send size={17} />
                </button>
                <button onClick={() => setLines([])} className="mt-icon-btn p-3.5 rounded-2xl" title="مسح"><Trash2 size={16} /></button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
