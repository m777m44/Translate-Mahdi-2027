import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowRight,
  CheckCircle2,
  Download,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react';
import {
  UpdateInfo,
  downloadUpdate,
  formatSize,
  getInstalledVersion,
  installUpdate,
  openInstallPermission,
} from '../updater.ts';

interface UpdateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  info: UpdateInfo | null;
}

type Stage = 'idle' | 'downloading' | 'ready' | 'installing' | 'permission' | 'error';

/**
 * نافذة التحديث — Material 3 style dialog matching the app's own theme tokens.
 *
 * States: idle → downloading (live %) → ready → installing, plus the
 * "unknown sources" permission step Android requires before installing an APK.
 */
export const UpdateDialog: React.FC<UpdateDialogProps> = ({ isOpen, onClose, info }) => {
  const [stage, setStage] = useState<Stage>('idle');
  const [percent, setPercent] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [installed, setInstalled] = useState('—');
  const disposeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setStage('idle');
    setPercent(0);
    setError(null);
    void getInstalledVersion().then(setInstalled);
  }, [isOpen]);

  useEffect(() => () => disposeRef.current?.(), []);

  const startDownload = useCallback(async () => {
    if (!info) return;
    setStage('downloading');
    setPercent(0);
    setError(null);
    try {
      const handle = await downloadUpdate(info, (p) => setPercent(p));
      disposeRef.current = handle.dispose;
      const path = await handle.promise;
      disposeRef.current?.();
      disposeRef.current = null;
      if (path === null) {
        // Web/PWA: the browser already opened the permanent download link.
        onClose();
        return;
      }
      setPercent(100);
      setStage('ready');
      // Straight into the installer — one tap for the user.
      const started = await installUpdate(path);
      if (started) setStage('installing');
    } catch (e: any) {
      const message = String(e?.message || e || '');
      if (/مصدر|permission|unknown/i.test(message)) {
        setStage('permission');
      } else {
        setError(message || 'تعذّر تنزيل التحديث. تحقق من اتصالك بالإنترنت.');
        setStage('error');
      }
    }
  }, [info, onClose]);

  const retry = useCallback(() => {
    void startDownload();
  }, [startDownload]);

  const grantPermission = useCallback(async () => {
    await openInstallPermission();
    setStage('ready');
  }, []);

  if (!isOpen || !info?.available || typeof document === 'undefined') return null;

  const newVersion = info.versionName || '—';
  const size = formatSize(info.sizeBytes);

  return createPortal(
    <div className="mt-backdrop" dir="rtl" role="dialog" aria-modal="true" aria-label="تحديث التطبيق">
      <div className="mt-sheet-solid mt-update-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="mt-update-head">
          <span className="mt-update-icon" aria-hidden="true">
            <Sparkles size={22} />
          </span>
          <div className="mt-update-headtext">
            <h2 className="mt-update-title">تحديث متاح</h2>
            <p className="mt-update-sub">
              النسخة {newVersion} جاهزة {size ? `· ${size}` : ''}
            </p>
          </div>
          <button type="button" className="mt-lang-iconbtn" onClick={onClose} aria-label="إغلاق">
            <X size={20} />
          </button>
        </div>

        {/* Version line */}
        <div className="mt-update-versions">
          <span className="mt-update-ver">الحالية {installed}</span>
          <ArrowRight size={14} className="mt-update-arrow" />
          <span className="mt-update-ver mt-update-ver--new">{newVersion}</span>
        </div>

        {/* Changelog */}
        {info.changelog ? (
          <div className="mt-update-notes mt-scroll">
            {info.changelog
              .split('\n')
              .filter((line) => line.trim())
              .slice(0, 24)
              .map((line, index) => (
                <p key={index} className="mt-update-note">{line.replace(/^[#*\-\s]+/, '').trim()}</p>
              ))}
          </div>
        ) : null}

        {/* Progress / status */}
        {stage === 'downloading' && (
          <div className="mt-update-progress">
            <div className="mt-update-progress-head">
              <Loader2 size={15} className="animate-spin" />
              <span>جاري التنزيل… {percent}%</span>
            </div>
            <div className="mt-update-track">
              <div className="mt-update-bar" style={{ width: `${percent}%` }} />
            </div>
          </div>
        )}

        {stage === 'ready' && (
          <div className="mt-update-status mt-update-status--ok">
            <CheckCircle2 size={16} />
            <span>اكتمل التنزيل — جاري فتح شاشة التثبيت…</span>
          </div>
        )}

        {stage === 'installing' && (
          <div className="mt-update-status mt-update-status--ok">
            <CheckCircle2 size={16} />
            <span>أكمل خطوات التثبيت في الشاشة التي فُتحت.</span>
          </div>
        )}

        {stage === 'permission' && (
          <div className="mt-update-status mt-update-status--warn">
            <ShieldAlert size={16} />
            <span>يجب السماح بتثبيت التطبيقات من هذا المصدر مرة واحدة فقط.</span>
          </div>
        )}

        {stage === 'error' && error && (
          <div className="mt-update-status mt-update-status--error">
            <ShieldAlert size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Actions */}
        <div className="mt-update-actions">
          <button type="button" className="mt-update-btn mt-update-btn--ghost" onClick={onClose}>
            {stage === 'installing' ? 'إغلاق' : 'لاحقاً'}
          </button>

          {stage === 'permission' ? (
            <button type="button" className="mt-update-btn mt-update-btn--primary" onClick={grantPermission}>
              <ShieldAlert size={16} /> السماح ثم التثبيت
            </button>
          ) : stage === 'error' ? (
            <button type="button" className="mt-update-btn mt-update-btn--primary" onClick={retry}>
              <RefreshCw size={16} /> إعادة المحاولة
            </button>
          ) : (
            <button
              type="button"
              className="mt-update-btn mt-update-btn--primary"
              onClick={() => void startDownload()}
              disabled={stage === 'downloading' || stage === 'installing'}
            >
              {stage === 'downloading' ? (
                <><Loader2 size={16} className="animate-spin" /> جاري التنزيل</>
              ) : (
                <><Download size={16} /> تحديث الآن</>
              )}
            </button>
          )}
        </div>

        <p className="mt-update-foot">التحديث يحافظ على بياناتك وإعداداتك — لا حاجة لإلغاء التثبيت.</p>
      </div>
    </div>,
    document.body,
  );
};
