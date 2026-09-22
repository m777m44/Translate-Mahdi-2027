import React, { useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Check, SlidersHorizontal } from 'lucide-react';
import { ThemeConfig, ZoomLevel } from '../types.ts';

interface ZoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  zoom: ZoomLevel;
  onChangeZoom: (zoom: ZoomLevel) => void;
  currentTheme: ThemeConfig;
}

export const ZoomModal: React.FC<ZoomModalProps> = ({
  isOpen,
  onClose,
  zoom,
  onChangeZoom,
  currentTheme,
}) => {
  const [tempZoom, setTempZoom] = useState<number>(zoom);

  useEffect(() => {
    setTempZoom(zoom);
  }, [zoom, isOpen]);

  if (!isOpen) return null;

  const handleApply = (val: number) => {
    const clamped = Math.max(50, Math.min(250, val));
    setTempZoom(clamped);
    onChangeZoom(clamped);
  };

  const presetValues = [75, 85, 90, 100, 110, 115, 125, 135, 150, 175];

  return (
    <div 
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md rounded-3xl border ${currentTheme.border} ${currentTheme.card} ${currentTheme.text} shadow-2xl p-5 sm:p-6 space-y-5 animate-in zoom-in-95 duration-200`}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b mt-hairline pb-4">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-2xl ${currentTheme.primary}`}>
              <SlidersHorizontal size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base">التحكم الدقيق في التكبير والتصغير</h3>
              <p className="text-xs opacity-60">أدخل أي رقم تريده بحرية تامة بين 50% و 250%</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[var(--mt-surface)] opacity-60 hover:opacity-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Numeric Input & Step Buttons */}
        <div className="space-y-3">
          <label className="text-xs font-bold opacity-75 block">
            أدخل النسبة المئوية المباشرة (Zoom %):
          </label>
          <div className="flex items-center gap-3">
            {/* Decrease step */}
            <button
              onClick={() => handleApply(tempZoom - 5)}
              className="p-3 rounded-2xl border mt-hairline mt-surface-soft hover:bg-[var(--mt-surface)] active:scale-95 transition-all"
              title="تصغير بمقدار 5%"
            >
              <ZoomOut size={18} />
            </button>

            {/* Direct Number Input */}
            <div className="relative flex-1">
              <input
                type="number"
                min="50"
                max="250"
                step="1"
                value={tempZoom}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) {
                    setTempZoom(val);
                    handleApply(val);
                  }
                }}
                className="w-full text-center py-3 px-4 rounded-2xl mt-surface-soft border mt-hairline text-2xl font-black focus:outline-none focus:ring-2 focus:ring-[var(--mt-accent)]"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold opacity-40 pointer-events-none">
                %
              </span>
            </div>

            {/* Increase step */}
            <button
              onClick={() => handleApply(tempZoom + 5)}
              className="p-3 rounded-2xl border mt-hairline mt-surface-soft hover:bg-[var(--mt-surface)] active:scale-95 transition-all"
              title="تكبير بمقدار 5%"
            >
              <ZoomIn size={18} />
            </button>
          </div>
        </div>

        {/* Smooth Slider */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs opacity-60">
            <span>50% (أصغر)</span>
            <span className="font-bold mt-accent-text">{tempZoom}%</span>
            <span>250% (أكبر)</span>
          </div>
          <input
            type="range"
            min="50"
            max="250"
            step="1"
            value={tempZoom}
            onChange={(e) => handleApply(parseInt(e.target.value, 10))}
            className="w-full accent-amber-500 cursor-pointer h-2 mt-surface-soft rounded-lg appearance-none"
          />
        </div>

        {/* Fast Presets Pills */}
        <div className="space-y-2">
          <span className="text-xs font-bold opacity-60 block">نسب نموذجية سريعة:</span>
          <div className="grid grid-cols-5 gap-1.5">
            {presetValues.map((val) => (
              <button
                key={val}
                onClick={() => handleApply(val)}
                className={`py-1.5 rounded-xl text-xs font-bold transition-all ${
                  tempZoom === val
                    ? `${currentTheme.primary} shadow-sm font-black`
                    : 'mt-surface-soft  opacity-70 hover:opacity-100 hover:bg-[var(--mt-surface)]'
                }`}
              >
                {val}%
              </button>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t mt-hairline">
          <button
            onClick={() => handleApply(100)}
            className="flex items-center gap-1.5 text-xs opacity-60 hover:opacity-100 transition-opacity"
            title="إعادة ضبط للحجم الطبيعي"
          >
            <RotateCcw size={14} />
            <span>إعادة للوضع الطبيعي (100%)</span>
          </button>

          <button
            onClick={onClose}
            className={`px-5 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 ${currentTheme.primary} shadow-md hover:brightness-110 active:scale-95 transition-all`}
          >
            <Check size={14} />
            <span>تم واعتماد</span>
          </button>
        </div>
      </div>
    </div>
  );
};
