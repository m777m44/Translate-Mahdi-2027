import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Smartphone, X, Package } from 'lucide-react';

/**
 * Install shortcut for Android.
 *
 * Behaviour:
 * - Hides entirely when the app is running as an installed app (PWA standalone
 *   or a packaged APK/TWA) so it never gets in the user's way.
 * - Prefers the native `beforeinstallprompt` flow (Add to Home screen / install).
 * - Falls back to a direct `.apk` download when a prebuilt package exists at
 *   /downloads/mahdi-translate.apk.
 * - Otherwise shows a short explanation of how to produce the real APK.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** True when the app is already installed / running standalone. */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as any;
  const d = document as any;
  return (
    Boolean(w.matchMedia?.('(display-mode: standalone)').matches) ||
    w.matchMedia?.('(display-mode: window-controls-overlay)').matches ||
    d.displayMode === 'standalone' ||
    w.navigator?.standalone === true ||
    // A TWA/APK launched from Android reports the android-app referrer.
    d.referrer?.startsWith?.('android-app://') === true ||
    w.location?.search?.includes?.('source=pwa') && Boolean(w.matchMedia?.('(display-mode: standalone)').matches)
  );
}

interface InstallAppButtonProps {
  onShowToast?: (msg: string) => void;
  className?: string;
}

export const InstallAppButton: React.FC<InstallAppButtonProps> = ({ onShowToast, className = '' }) => {
  const [standalone, setStandalone] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [apkAvailable, setApkAvailable] = useState<boolean | null>(null); // null = unknown
  const [explaining, setExplaining] = useState(false);
  const [installing, setInstalling] = useState(false);
  const toast = useRef(onShowToast);
  toast.current = onShowToast;

  // Determine once whether we should hide the button entirely.
  useEffect(() => {
    setStandalone(isStandalone());
    const mq = window.matchMedia?.('(display-mode: standalone)');
    const onChange = (e: MediaQueryListEvent) => setStandalone(e.matches || isStandalone());
    mq?.addEventListener?.('change', onChange);
    return () => mq?.removeEventListener?.('change', onChange);
  }, []);

  // Capture the native install prompt.
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setStandalone(true); // installed → hide
      toast.current?.('تم تثبيت التطبيق بنجاح 🎉');
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  // Probe for a prebuilt APK on first open.
  useEffect(() => {
    const probe = async () => {
      try {
        const res = await fetch('/downloads/mahdi-translate.apk', { method: 'HEAD' });
        setApkAvailable(res.ok);
      } catch {
        setApkAvailable(false);
      }
    };
    probe();
  }, []);

  const handleInstall = useCallback(async () => {
    // 1) Native prompt (best path).
    if (installEvent) {
      setInstalling(true);
      try {
        await installEvent.prompt();
        const choice = await installEvent.userChoice;
        if (choice.outcome === 'accepted') {
          setStandalone(true);
          toast.current?.('جاري تثبيت التطبيق…');
        }
      } finally {
        setInstalling(false);
        setInstallEvent(null);
      }
      return;
    }

    // 2) Direct APK download if a package exists.
    if (apkAvailable) {
      window.location.href = '/downloads/mahdi-translate.apk';
      return;
    }

    // 3) No native prompt & no prebuilt package → show how to build the APK.
    setExplaining(true);
  }, [installEvent, apkAvailable]);

  // Never show anything when already installed / standalone.
  if (standalone) return null;

  return (
    <>
      <button
        onClick={handleInstall}
        className={`mt-btn mt-btn-accent ${className}`}
        title="تثبيت التطبيق على Android أو تحميل APK"
        aria-label="تثبيت التطبيق"
      >
        {installing ? <span className="mt-spinner w-3.5 h-3.5" /> : <Download size={14} />}
        <span className="hidden sm:inline">تحميل APK / تثبيت</span>
        <span className="sm:hidden">APK</span>
      </button>

      {explaining && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 mt-modal-backdrop" onClick={() => setExplaining(false)} />
          <div className="mt-modal relative w-full max-w-md p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="mt-btn mt-btn-accent p-2 rounded-xl">
                  <Smartphone size={16} />
                </div>
                <h3 className="font-extrabold text-lg">تثبيت على Android</h3>
              </div>
              <button onClick={() => setExplaining(false)} className="mt-icon-btn p-2" aria-label="إغلاق">
                <X size={16} />
              </button>
            </div>

            <ol className="list-none flex flex-col gap-2.5 text-sm leading-relaxed mt-surface-soft border rounded-xl p-4" style={{ borderColor: 'var(--mt-border)' }}>
              <li className="flex gap-2">
                <Package size={15} className="mt-accent-text shrink-0 mt-0.5" />
                <span>
                  <b>الطريقة الأسهل:</b> من قائمة المتصفح اختر «إضافة إلى الشاشة الرئيسية / تثبيت التطبيق» وسيعمل التطبيق كتطبيق مستقل بملء الشاشة.
                </span>
              </li>
              <li className="flex gap-2">
                <Smartphone size={15} className="mt-accent-text shrink-0 mt-0.5" />
                <span>
                  <b>ملف APK حقيقي:</b> ضع ملف <code dir="ltr" className="font-mono text-xs mt-badge">mahdi-translate.apk</code> في مجلد{' '}
                  <code dir="ltr" className="font-mono text-xs mt-badge">public/downloads</code> فيظهر زر التحميل مباشرة، أو ابنِه عبر{' '}
                  <span dir="ltr" className="font-mono text-xs">PWABuilder.com</span> أو <span dir="ltr" className="font-mono text-xs">Capacitor</span> من هذا المشروع.
                </span>
              </li>
            </ol>

            <button onClick={() => setExplaining(false)} className="mt-btn mt-btn-primary w-full">
              فهمت
            </button>
          </div>
        </div>
      )}
    </>
  );
};
