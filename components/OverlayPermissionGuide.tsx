import React, { useEffect, useState } from 'react';
import { X, ExternalLink, RefreshCw, SquareStack, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  checkOverlayPermission,
  requestOverlayPermission,
  openOverlaySettings,
  showNativeOverlay,
} from '../floatingWindow.ts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onActivated: () => void;
  onShowToast: (msg: string) => void;
}

/**
 * Arabic step-by-step guide for the SYSTEM_ALERT_WINDOW ("display over other
 * apps") permission, plus a one-tap activation flow for the native overlay.
 */
export const OverlayPermissionGuide: React.FC<Props> = ({ isOpen, onClose, onActivated, onShowToast }) => {
  const [granted, setGranted] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = React.useCallback(async () => {
    const res = await checkOverlayPermission();
    setGranted(res.granted);
    return res.granted;
  }, []);

  // Re-check every time the sheet opens and whenever the app regains focus
  // (the user returns from the Android settings screen).
  useEffect(() => {
    if (!isOpen) return;
    void refresh();
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [isOpen, refresh]);

  if (!isOpen) return null;

  const handleRequest = async () => {
    setBusy(true);
    try {
      const res = await requestOverlayPermission();
      if (res.granted) {
        setGranted(true);
        onShowToast('تم منح إذن الظهور فوق التطبيقات ✓');
      } else {
        onShowToast('اتبع الخطوات ثم فعّل الإذن من شاشة النظام');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleActivate = async () => {
    setBusy(true);
    try {
      await showNativeOverlay({ width: 320, height: 380, x: 24, y: 120 });
      onActivated();
      onClose();
      onShowToast('النافذة العائمة تعمل الآن فوق كل التطبيقات 🪟');
    } catch (e: any) {
      onShowToast(e?.message || 'تعذّر تشغيل النافذة العائمة');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="تفعيل النافذة العائمة">
      <div className="mt-modal w-full max-w-md" dir="rtl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: 'var(--mt-border)' }}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl mt-accent-soft"><SquareStack size={18} /></div>
            <h2 className="text-base font-extrabold mt-heading">تفعيل النافذة العائمة 🪟</h2>
          </div>
          <button onClick={onClose} className="mt-icon-btn p-2" aria-label="إغلاق"><X size={20} /></button>
        </div>

        <div className="px-5 py-4 overflow-y-auto mt-scroll" style={{ maxHeight: '70vh' }}>
          <div
            className="flex items-start gap-2.5 rounded-2xl border px-3.5 py-3 mb-4 text-[11.5px] font-bold leading-relaxed"
            style={{
              borderColor: granted ? 'var(--mt-success)' : 'var(--mt-warning)',
              background: 'color-mix(in srgb, var(--mt-surface) 70%, transparent)',
              color: granted ? 'var(--mt-success)' : 'var(--mt-warning)',
            }}
          >
            {granted ? <CheckCircle2 size={18} className="shrink-0 mt-0.5" /> : <AlertCircle size={18} className="shrink-0 mt-0.5" />}
            <span>
              {granted
                ? 'الإذن مفعّل — اضغط «تشغيل النافذة العائمة» وستبقى نافذة الترجمة ظاهرة فوق كل التطبيقات.'
                : 'لتظهر نافذة الترجمة فوق التطبيقات الأخرى، يجب منح إذن «الظهور فوق التطبيقات» من إعدادات أندرويد.'}
            </span>
          </div>

          <ol className="space-y-3 pe-1">
            {[
              'اضغط زر «فتح إعدادات الإذن» بالأسفل.',
              'ابحث عن تطبيق Translate Mahdi 2027 في قائمة «الظهور فوق التطبيقات».',
              'فعّل المفتاح بجانب اسم التطبيق ثم ارجع إلى هنا.',
              'اضغط «تشغيل النافذة العائمة» — ستظهر فقاعة عائمة ولوحة ترجمة فوق أي تطبيق.',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span
                  className="shrink-0 w-6 h-6 rounded-full text-[11px] font-black flex items-center justify-center text-white"
                  style={{ background: 'var(--mt-primary-gradient)' }}
                >
                  {i + 1}
                </span>
                <span className="text-xs leading-relaxed mt-1">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="border-t px-5 py-3.5 flex flex-col gap-2" style={{ borderColor: 'var(--mt-border)' }}>
          {granted ? (
            <button
              onClick={handleActivate}
              disabled={busy}
              className="mt-btn mt-btn-primary w-full rounded-2xl py-3 text-sm font-extrabold flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <SquareStack size={17} /> تشغيل النافذة العائمة
            </button>
          ) : (
            <button
              onClick={handleRequest}
              disabled={busy}
              className="mt-btn mt-btn-primary w-full rounded-2xl py-3 text-sm font-extrabold flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <ExternalLink size={17} /> فتح إعدادات الإذن
            </button>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => void refresh()}
              className="mt-btn mt-btn-ghost flex-1 rounded-2xl py-2.5 text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <RefreshCw size={14} /> إعادة فحص الإذن
            </button>
            <button
              onClick={() => void openOverlaySettings()}
              className="mt-btn mt-btn-ghost flex-1 rounded-2xl py-2.5 text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <ExternalLink size={14} /> إعدادات النظام
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
