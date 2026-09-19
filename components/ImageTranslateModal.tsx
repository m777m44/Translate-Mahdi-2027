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
    <div className="fixed inset-0 z-50 flex flex-col w-full h-full bg-zinc-950/98 text-white backdrop-blur-2xl animate-in slide-in-from-bottom-4 duration-300 overflow-hidden" dir="rtl">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 sm:px-8 py-3.5 border-b border-white/10 bg-black/30 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2 sm:p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">ترجمة الصور والكاميرا (OCR Vision)</h2>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
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
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-xs">
            <span className="opacity-60 text-[11px]">الترجمة إلى:</span>
            <select
              value={selectedTargetLang}
              onChange={(e) => setSelectedTargetLang(e.target.value)}
              className="bg-transparent font-bold text-amber-400 outline-none cursor-pointer"
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code} className="bg-zinc-900 text-white">
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
            className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-200 hover:text-white transition-all text-xs font-bold flex items-center gap-1.5 active:scale-95"
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
              }}
              className={`px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeMode === 'upload'
                  ? 'bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/20'
                  : 'bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>رفع ملف صورة</span>
            </button>

            <button
              onClick={() => {
                setActiveMode('camera');
                startCamera();
              }}
              className={`px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeMode === 'camera'
                  ? 'bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/20'
                  : 'bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>التقاط بالكاميرا الحية</span>
            </button>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
            <div className="flex-1">{errorMessage}</div>
            <button
              onClick={() => setErrorMessage(null)}
              className="p-1 rounded-lg hover:bg-rose-500/20 text-rose-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Capture / Upload Zone */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* LEFT: Image Source Card */}
          <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/10 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-amber-400" />
                <span>الصورة المختارة</span>
              </h3>
              {imagePreview && (
                <button
                  onClick={handleReset}
                  className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>تغيير الصورة</span>
                </button>
              )}
            </div>

            {/* If an image is captured or uploaded */}
            {imagePreview ? (
              <div className="space-y-4">
                <div className="relative rounded-2xl overflow-hidden border border-white/15 bg-black/40 max-h-[380px] flex items-center justify-center">
                  <img
                    src={imagePreview}
                    alt="Captured text"
                    className="max-h-[380px] w-auto object-contain rounded-2xl"
                  />
                  <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-xl text-[11px] font-bold text-emerald-300 border border-white/10 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>جاهزة للترجمة</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleTranslate}
                    disabled={isLoading}
                    className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-98"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>جاري قراءة النصوص وترجمتها بواسطة AI...</span>
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
                    className="p-3 rounded-xl bg-white/10 hover:bg-white/15 text-zinc-300 transition-all"
                    title="إعادة التقاط"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : activeMode === 'camera' ? (
              /* Camera Live Stream */
              <div className="space-y-4">
                <div className="relative rounded-2xl overflow-hidden border border-white/15 bg-black/60 aspect-video flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {!cameraActive && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center gap-3 bg-black/80">
                      <Camera className="w-8 h-8 text-amber-400 animate-pulse" />
                      <p className="text-xs text-zinc-300">جاري بدء الكاميرا أو في انتظار الموافقة على الإذن...</p>
                      <button
                        onClick={() => startCamera()}
                        className="px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 text-xs font-bold"
                      >
                        إعادة محاولة تشغيل الكاميرا
                      </button>
                    </div>
                  )}

                  {/* Switch Camera Button (front/back) */}
                  {cameraActive && (
                    <button
                      onClick={handleSwitchCamera}
                      className="absolute top-3 left-3 p-2 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/15 transition-all"
                      title="تبديل الكاميرا الأمامية والخلفية"
                    >
                      <SwitchCamera className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {cameraActive && (
                  <button
                    onClick={handleCaptureSnapshot}
                    className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-98"
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
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-white/20 hover:border-amber-500/50 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-white/[0.02] transition-all text-center min-h-[260px]"
              >
                <div className="p-4 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Upload className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-200">اسحب صورة النص وأفلتها هنا</h4>
                  <p className="text-xs text-zinc-400 mt-1">أو انقر لتصفح واختيار ملف من جهازك</p>
                </div>
                <span className="text-[10px] text-zinc-500">يدعم صيغ PNG, JPG, JPEG, WEBP</span>
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
          <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/10 flex flex-col gap-4 shadow-xl min-h-[380px]">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>النص المترجم والمستخرج</span>
              </h3>
              {translatedText && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onSpeak(translatedText, selectedTargetLang)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-zinc-300 transition-all"
                    title="نطق الترجمة صوتياً"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onCopy(translatedText)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-zinc-300 transition-all"
                    title="نسخ النص"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {isLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-amber-500 border-t-transparent" />
                <p className="text-xs font-bold text-amber-300 animate-pulse">
                  جاري تحليل النص داخل الصورة وترجمته بدقة ذكاء اصطناعي عالية...
                </p>
              </div>
            ) : translatedText ? (
              <div className="flex-1 flex flex-col justify-between gap-4">
                <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 text-sm leading-relaxed whitespace-pre-wrap max-h-[320px] overflow-y-auto text-zinc-100 font-medium select-text">
                  {translatedText}
                </div>

                <div className="flex items-center gap-3 pt-2 border-t border-white/10">
                  <button
                    onClick={() => {
                      onApplyText(translatedText);
                      stopCamera();
                      onClose();
                    }}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-98"
                  >
                    <Check className="w-4 h-4" />
                    <span>إدراج في شاشة الترجمة الرئيسية</span>
                  </button>

                  <button
                    onClick={() => onCopy(translatedText)}
                    className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-2 transition-all"
                  >
                    <Copy className="w-4 h-4" />
                    <span>نسخ</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-2 text-zinc-500 border border-dashed border-white/10 rounded-2xl">
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
