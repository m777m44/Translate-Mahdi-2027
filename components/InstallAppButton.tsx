import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

/**
 * PWA-only install shortcut.
 *
 * Uses the native `beforeinstallprompt` flow (Add to Home screen / Install).
 * Hides itself entirely when the app is already installed (standalone) or when
 * the browser does not offer an install prompt. There is deliberately no APK
 * download here — packaged builds are published on GitHub Releases.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as any;
  return Boolean(
    w.matchMedia?.('(display-mode: standalone)').matches ||
    w.matchMedia?.('(display-mode: fullscreen)').matches ||
    w.navigator?.standalone === true,
  );
}

interface Props {
  className?: string;
  onInstalled?: () => void;
}

export const InstallAppButton: React.FC<Props> = ({ className = '', onInstalled }) => {
  const [available, setAvailable] = useState(false);
  const [installed, setInstalled] = useState(isStandalone());
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
      setAvailable(true);
    };
    const onInstalled = () => {
      setInstalled(true);
      setAvailable(false);
      onInstalled?.();
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [onInstalled]);

  if (installed || !available) return null;

  return (
    <button
      onClick={async () => {
        if (!promptEvent) return;
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice.catch(() => null);
        if (choice?.outcome === 'accepted') {
          setInstalled(true);
          setAvailable(false);
          onInstalled?.();
        }
      }}
      className={`mt-btn h-8 px-2.5 rounded-full text-[11px] font-bold flex items-center gap-1.5 ${className}`}
      title="تثبيت التطبيق على الشاشة الرئيسية"
      aria-label="تثبيت التطبيق"
    >
      <Download size={14} />
      <span className="hidden sm:inline">تثبيت</span>
    </button>
  );
};
