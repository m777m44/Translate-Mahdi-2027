import React, { useRef, useState, useEffect } from 'react';
import { Pen, X, Trash2, Check, RotateCcw } from 'lucide-react';

interface HandwritingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyText: (text: string) => void;
}

export const HandwritingModal: React.FC<HandwritingModalProps> = ({
  isOpen,
  onClose,
  onApplyText,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set high resolution
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
  }, [isOpen]);

  if (!isOpen) return null;

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawn(true);

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    setRecognizedText('');
  };

  const handleInsert = () => {
    if (recognizedText.trim()) {
      onApplyText(recognizedText.trim());
    } else if (hasDrawn) {
      onApplyText('نص مكتوب بخط اليد');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
      <div 
        className="w-full max-w-md rounded-3xl bg-zinc-900 border border-zinc-700 shadow-2xl overflow-hidden flex flex-col text-right"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/90">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <Pen size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">الكتابة بخط اليد</h2>
              <p className="text-[11px] text-zinc-400">اكتب هنا بإصبعك أو بالفأرة</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10"
          >
            <X size={18} />
          </button>
        </div>

        {/* Canvas Area */}
        <div className="p-3 bg-zinc-950 flex flex-col items-center justify-center">
          <div className="relative w-full h-56 rounded-2xl bg-zinc-900 border-2 border-dashed border-zinc-700/80 overflow-hidden cursor-crosshair">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-full touch-none"
            />
            {!hasDrawn && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-zinc-500 text-xs">
                <Pen size={28} className="mb-2 opacity-40 animate-pulse" />
                <span>اكتب الحروف أو الكلمات هنا...</span>
              </div>
            )}
          </div>

          {/* Quick recognition or manual text field */}
          <div className="w-full mt-3">
            <input
              type="text"
              value={recognizedText}
              onChange={(e) => setRecognizedText(e.target.value)}
              placeholder="أو اكتب النص المكتوب للترجمة المباشرة..."
              className="w-full px-3 py-2 text-xs bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {/* Controls */}
        <div className="p-3 border-t border-zinc-800 bg-zinc-900 flex items-center justify-between">
          <button
            onClick={clearCanvas}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-colors"
          >
            <RotateCcw size={14} />
            <span>مسح اللوحة</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl text-zinc-400 hover:text-white text-xs font-bold"
            >
              إلغاء
            </button>
            <button
              onClick={handleInsert}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-black text-xs font-bold transition-colors shadow-lg shadow-sky-500/25"
            >
              <Check size={14} />
              <span>إدراج وترجمة</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
