import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Upload, 
  X, 
  Check, 
  Volume2, 
  Copy, 
  ArrowRight, 
  RefreshCw, 
  Sparkles, 
  SwitchCamera, 
  Image as ImageIcon,
  FileText,
  AlertCircle
} from 'lucide-react';
import { Theme, Language } from '../types.ts';
import { isNativeApp, captureNativePhoto, pickNativePhoto } from '../platform.ts';

interface ImageTranslateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: Theme;
  languages: Language[];
  targetLang: string;
  onTranslateImage: (base64Data: string, targetLang: string) => Promise<string>;
  onApplyText: (text: string) => void;
  onSpeak: (text: string, lang: string) => void;
  onCopy: (text: string) => void;
}

export const ImageTranslateModal: React.FC<ImageTranslateModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  languages,
  targetLang: initialTargetLang,
  onTranslateImage,
  onApplyText,
  onSpeak,
  onCopy,
}) => {
  const [selectedTargetLang, setSelectedTargetLang] = useState<string>(initialTargetLang);
  const [activeMode, setActiveMode] = useState<'camera' | 'upload'>('upload');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [rawBase64, setRawBase64] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [translatedText, setTranslatedText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraActive, setCameraActive] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    setSelectedTargetLang(initialTargetLang);
  }, [initialTargetLang]);

  // Clean up camera stream when modal closes or unmounts
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setImagePreview(null);
      setRawBase64(null);
      setTranslatedText('');
      setErrorMessage(null);
    }
  }, [isOpen]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  /** Normalises any data URL into preview + raw base64 states. */
  const applyDataUrl = (dataUrl: string) => {
    setImagePreview(dataUrl);
    setRawBase64(dataUrl.replace(/^data:image\/\w+;base64,/, ''));
  };

  /**
   * Camera entry point:
   *  - native Android shell → system camera via Capacitor (handles permissions)
   *  - browser/PWA → live getUserMedia stream with a snapshot button
   */
  const openCamera = async () => {
    if (isNativeApp()) {
      const photo = await captureNativePhoto();
      if (photo?.dataUrl) {
        applyDataUrl(photo.dataUrl);
        setActiveMode('camera');
      }
      return;
    }
    startCamera();
  };

  /** Gallery entry point with the same native/web split. */
  const openPicker = async () => {
    if (isNativeApp()) {
      const photo = await pickNativePhoto();
      if (photo?.dataUrl) {
        applyDataUrl(photo.dataUrl);
        setActiveMode('upload');
      }
      return;
    }
    fileInputRef.current?.click();
  };

  const startCamera = async (mode: 'environment' | 'user' = facingMode) => {
    stopCamera();
    setErrorMessage(null);
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: any) {
      console.error('Camera access error:', err);
      setErrorMessage('تعذر الوصول للكاميرا، يرجى منح إذن الكاميرا أو استخدام خيار رفع صورة.');
      setCameraActive(false);
    }
  };

  const handleCaptureSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setImagePreview(dataUrl);
    // Base64 without data prefix
    const base64Clean = dataUrl.replace(/^data:image\/\w+;base64,/, '');
    setRawBase64(base64Clean);
    stopCamera();
  };

  const handleSwitchCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processSelectedFile(file);
  };

  const processSelectedFile = (file: File) => {
    setErrorMessage(null);
    if (!file.type.startsWith('image/')) {
      setErrorMessage('يرجى اختيار ملف صورة صالح (PNG, JPG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setImagePreview(dataUrl);
        const base64Clean = dataUrl.replace(/^data:image\/\w+;base64,/, '');
        setRawBase64(base64Clean);
      }
    };
    reader.onerror = () => {
      setErrorMessage('فشل في قراءة ملف الصورة.');
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleTranslate = async () => {
    if (!rawBase64) {
      setErrorMessage('يرجى التقاط صورة أو رفع ملف أولاً.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setTranslatedText('');

    try {
      const res = await onTranslateImage(rawBase64, selectedTargetLang);
      setTranslatedText(res || 'لم يتم العثور على نصوص قابلة للترجمة في هذه الصورة.');
    } catch (err: any) {
      console.error('Image translate failed:', err);
      setErrorMessage(err.message || 'فشلت عملية استخراج وترجمة النص من الصورة. تحقق من الاتصال وحاول مجدداً.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    stopCamera();
    setImagePreview(null);
    setRawBase64(null);
    setTranslatedText('');
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col w-full h-full mt-sheet overflow-hidden" dir="rtl">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 sm:px-8 py-3.5 border-b mt-hairline mt-sheet-header shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2 sm:p-2.5 rounded-2xl mt-accent-soft mt-accent-text border mt-hairline">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold tracking-tight">ترجمة الصور والكاميرا (OCR Vision)</h2>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-lg mt-accent-soft mt-accent-text border mt-hairline">
                ذكاء بصري
              </span>
            </div>
            <p className="text-[11px] opacity-65 hidden sm:block">
              التقط صورة بالكاميرا أو ارفع صورة ليقوم محرك مهدي بقراءة النصوص وترجمتها فورياً
            </p>
          </div>
        </div>

        {/* Action Controls & Close */}
        <div className="flex items-center gap-3">
          {/* Target Language Selector */}
          <div className="flex items-center gap-1.5 mt-surface-soft border mt-hairline px-3 py-1.5 rounded-xl text-xs">
            <span className="opacity-60 text-[11px]">الترجمة إلى:</span>
            <select
              value={selectedTargetLang}
              onChange={(e) => setSelectedTargetLang(e.target.value)}
              className="bg-transparent font-bold mt-accent-text outline-none cursor-pointer"
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code} className="mt-surface-soft">
                  {lang.flag} {lang.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="px-3.5 py-1.5 rounded-xl mt-surface-soft hover:bg-[var(--mt-surface)] hover:text-[var(--mt-text)] transition-all text-xs font-bold flex items-center gap-1.5 active:scale-95"
            title="إغلاق والعودة"
          >
            <X className="w-4 h-4" />
            <span>إغلاق</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-6xl mx-auto w-full flex flex-col gap-6">
        {/* Mode Selector Tabs */}
        {!imagePreview && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => {
                setActiveMode('upload');
                stopCamera();
                if (isNativeApp()) void openPicker();
              }}
              className={`px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeMode === 'upload'
                  ? 'mt-btn-primary shadow-lg shadow-amber-500/20'
                  : 'mt-surface-soft hover:bg-[var(--mt-surface)] mt-subtext border mt-hairline'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>رفع ملف صورة</span>
            </button>

            <button
              onClick={() => {
                setActiveMode('camera');
                void openCamera();
              }}
              className={`px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeMode === 'camera'
                  ? 'mt-btn-primary shadow-lg shadow-amber-500/20'
                  : 'mt-surface-soft hover:bg-[var(--mt-surface)] mt-subtext border mt-hairline'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>التقاط بالكاميرا الحية</span>
            </button>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 rounded-2xl mt-accent-soft border border-rose-500/30 mt-danger-text text-xs flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-danger-text" />
            <div className="flex-1">{errorMessage}</div>
            <button
              onClick={() => setErrorMessage(null)}
              className="p-1 rounded-lg hover:bg-[var(--mt-accent-soft)] mt-danger-text"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Capture / Upload Zone */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* LEFT: Image Source Card */}
          <div className="p-5 rounded-3xl mt-surface-soft border mt-hairline flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <ImageIcon className="w-4 h-4 mt-accent-text" />
                <span>الصورة المختارة</span>
              </h3>
              {imagePreview && (
                <button
                  onClick={handleReset}
                  className="text-xs mt-subtext hover:text-[var(--mt-text)] flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>تغيير الصورة</span>
                </button>
              )}
            </div>

            {/* If an image is captured or uploaded */}
            {imagePreview ? (
              <div className="space-y-4">
                <div className="relative rounded-2xl overflow-hidden border mt-hairline bg-black/40 max-h-[380px] flex items-center justify-center">
                  <img
                    src={imagePreview}
                    alt="Captured text"
                    className="max-h-[380px] w-auto object-contain rounded-2xl"
                  />
                  <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-xl text-[11px] font-bold mt-success-text border mt-hairline flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>جاهزة للترجمة</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleTranslate}
                    disabled={isLoading}
                    className="flex-1 py-3 px-4 rounded-xl mt-btn-primary disabled:opacity-50 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-98"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>جاري قراءة النصوص وترجمتها...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>بدء ترجمة الصورة الآن</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleReset}
                    className="p-3 rounded-xl mt-surface-soft hover:bg-[var(--mt-surface)] mt-subtext transition-all"
                    title="إعادة التقاط"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : activeMode === 'camera' ? (
              /* Camera Live Stream */
              <div className="space-y-4">
                <div className="relative rounded-2xl overflow-hidden border mt-hairline bg-black/60 aspect-video flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {!cameraActive && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center gap-3 bg-black/80">
                      <Camera className="w-8 h-8 mt-accent-text animate-pulse" />
                      <p className="text-xs mt-subtext">جاري بدء الكاميرا أو في انتظار الموافقة على الإذن...</p>
                      <button
                        onClick={() => void openCamera()}
                        className="px-4 py-2 rounded-xl mt-btn-primary text-xs font-bold"
                      >
                        إعادة محاولة تشغيل الكاميرا
                      </button>
                    </div>
                  )}

                  {/* Switch Camera Button (front/back) */}
                  {cameraActive && (
                    <button
                      onClick={handleSwitchCamera}
                      className="absolute top-3 left-3 p-2 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md border mt-hairline transition-all"
                      title="تبديل الكاميرا الأمامية والخلفية"
                    >
                      <SwitchCamera className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {cameraActive && (
                  <button
                    onClick={handleCaptureSnapshot}
                    className="w-full py-3 px-4 rounded-xl mt-btn-primary font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-98"
                  >
                    <Camera className="w-4 h-4" />
                    <span>التقاط الصورة وترجمتها</span>
                  </button>
                )}
              </div>
            ) : (
              /* Drag & Drop / File Picker */
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => void openPicker()}
                className="border-2 border-dashed mt-hairline hover:border-[var(--mt-border-strong)] rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-[var(--mt-surface)] transition-all text-center min-h-[260px]"
              >
                <div className="p-4 rounded-2xl mt-accent-soft mt-accent-text border border-amber-500/20">
                  <Upload className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-sm font-bold">اسحب صورة النص وأفلتها هنا</h4>
                  <p className="text-xs mt-subtext mt-1">أو انقر لتصفح واختيار ملف من جهازك</p>
                </div>
                <span className="text-[10px] mt-subtext">يدعم صيغ PNG, JPG, JPEG, WEBP</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            )}
          </div>

          {/* RIGHT: Result Card */}
          <div className="p-5 rounded-3xl mt-surface-soft border mt-hairline flex flex-col gap-4 shadow-xl min-h-[380px]">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <FileText className="w-4 h-4 mt-accent-text" />
                <span>النص المترجم والمستخرج</span>
              </h3>
              {translatedText && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onSpeak(translatedText, selectedTargetLang)}
                    className="p-1.5 rounded-lg mt-surface-soft hover:bg-[var(--mt-surface)] mt-subtext transition-all"
                    title="نطق الترجمة صوتياً"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onCopy(translatedText)}
                    className="p-1.5 rounded-lg mt-surface-soft hover:bg-[var(--mt-surface)] mt-subtext transition-all"
                    title="نسخ النص"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {isLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-2 mt-hairline border-t-transparent" />
                <p className="text-xs font-bold mt-accent-text animate-pulse">
                  جاري تحليل النص داخل الصورة وترجمته بدقة ذكاء اصطناعي عالية...
                </p>
              </div>
            ) : translatedText ? (
              <div className="flex-1 flex flex-col justify-between gap-4">
                <div className="p-4 rounded-2xl mt-surface-soft border mt-hairline text-sm leading-relaxed whitespace-pre-wrap max-h-[320px] overflow-y-auto font-medium select-text">
                  {translatedText}
                </div>

                <div className="flex items-center gap-3 pt-2 border-t mt-hairline">
                  <button
                    onClick={() => {
                      onApplyText(translatedText);
                      stopCamera();
                      onClose();
                    }}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-98"
                  >
                    <Check className="w-4 h-4" />
                    <span>إدراج في شاشة الترجمة الرئيسية</span>
                  </button>

                  <button
                    onClick={() => onCopy(translatedText)}
                    className="py-2.5 px-4 rounded-xl mt-surface-soft hover:bg-[var(--mt-surface)] font-bold text-xs flex items-center gap-2 transition-all"
                  >
                    <Copy className="w-4 h-4" />
                    <span>نسخ</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-2 mt-subtext border border-dashed mt-hairline rounded-2xl">
                <Sparkles className="w-8 h-8 opacity-40" />
                <p className="text-xs">
                  اختر صورة أو التقط صورة، ثم انقر على "بدء ترجمة الصورة الآن" لترى النتيجة هنا
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
