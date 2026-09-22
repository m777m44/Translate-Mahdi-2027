import React, { useState, useRef, useEffect } from 'react';

interface ResizeHandleProps {
  currentHeight: number;
  currentFontSize: number;
  currentRadius: number;
  currentWidth?: number;
  onResize: (height: number, fontSize: number, radius: number, width?: number) => void;
  minHeight?: number;
  maxHeight?: number;
  minWidth?: number;
  maxWidth?: number;
  minFontSize?: number;
  maxFontSize?: number;
  minRadius?: number;
  maxRadius?: number;
  tooltipLabel?: string;
  className?: string;
  position?: 'bottom-left' | 'bottom-right';
}

export const ResizeHandle: React.FC<ResizeHandleProps> = ({
  currentHeight,
  currentFontSize,
  currentRadius,
  currentWidth = 100,
  onResize,
  minHeight = 75,
  maxHeight = 550,
  minWidth = 50,
  maxWidth = 100,
  minFontSize = 12,
  maxFontSize = 32,
  minRadius = 6,
  maxRadius = 36,
  className = '',
  position = 'bottom-left',
}) => {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const startYRef = useRef<number>(0);
  const startXRef = useRef<number>(0);
  const startHeightRef = useRef<number>(currentHeight);
  const startWidthRef = useRef<number>(currentWidth);
  const startFontSizeRef = useRef<number>(currentFontSize);
  const startRadiusRef = useRef<number>(currentRadius);

  const handleStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    startYRef.current = clientY;
    startXRef.current = clientX;
    startHeightRef.current = currentHeight;
    startWidthRef.current = currentWidth;
    startFontSizeRef.current = currentFontSize;
    startRadiusRef.current = currentRadius;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleStart(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      e.stopPropagation();
      handleStart(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  useEffect(() => {
    const handleMove = (clientX: number, clientY: number) => {
      if (!isDragging) return;

      const deltaY = clientY - startYRef.current;
      const deltaX = clientX - startXRef.current;

      // 1. Vertical resizing (Height)
      const newHeight = Math.max(minHeight, Math.min(maxHeight, startHeightRef.current + deltaY));
      
      // 2. Horizontal resizing (Width percentage or pixels)
      // For RTL left handle: moving left expands, moving right shrinks
      const widthDelta = position === 'bottom-left' ? -deltaX * 0.15 : deltaX * 0.15;
      const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidthRef.current + widthDelta));

      // 3. Proportional Font Size based on 2D diagonal scale
      const heightRatio = (newHeight - minHeight) / (maxHeight - minHeight);
      const newFontSize = Math.round(minFontSize + heightRatio * (maxFontSize - minFontSize));

      // 4. Smooth corner radius adjustment
      const radiusDelta = position === 'bottom-left' ? -deltaX * 0.08 : deltaX * 0.08;
      const newRadius = Math.max(minRadius, Math.min(maxRadius, Math.round(startRadiusRef.current + radiusDelta)));

      onResize(newHeight, newFontSize, newRadius, newWidth);
    };

    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, minHeight, maxHeight, minWidth, maxWidth, minFontSize, maxFontSize, minRadius, maxRadius, onResize, position]);

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    onResize(130, 17, 16, 100);
  };

  const posClasses = position === 'bottom-left' ? 'left-1.5 bottom-1.5' : 'right-1.5 bottom-1.5';

  return (
    <div
      className={`absolute ${posClasses} z-20 select-none ${className}`}
      title="اسحب الشخطة بحرية في أي اتجاه (أفقي، عمودي، أو قطري) لتغيير أبعاد المربع • انقر مرتين لإعادة الضبط"
      onDoubleClick={handleReset}
    >
      {/* Floating tooltip preview during drag */}
      {isDragging && (
        <div 
          className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full mt-surface-soft mt-accent-text text-[10px] font-mono whitespace-nowrap shadow-xl border mt-hairline pointer-events-none z-30"
          dir="ltr"
        >
          ↕ {Math.round(currentHeight)}px • ↔ {Math.round(currentWidth)}% • T:{Math.round(currentFontSize)}px
        </div>
      )}

      {/* The Small, Translucent Micro Resize Notch ("الشخطة الشفافة الصغيرة") */}
      <div
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        className={`cursor-nwse-resize p-1 rounded-md flex items-center justify-center transition-all duration-200 backdrop-blur-xs ${
          isDragging 
            ? 'bg-amber-500 text-black scale-125 shadow-lg shadow-amber-500/40 ring-2 ring-amber-400' 
            : 'mt-surface-soft  text-white/40 hover:text-[var(--mt-text)] hover:bg-amber-500/80 hover:text-black opacity-35 hover:opacity-100 border mt-hairline hover:border-amber-400'
        }`}
      >
        {/* Subtle diagonal micro notch lines */}
        <div className="flex flex-col items-center justify-center gap-0.5 w-3 h-3">
          <div className="w-2.5 h-[1.2px] bg-current rounded-full" />
          <div className="w-1.5 h-[1.2px] bg-current rounded-full" />
          <div className="w-1 h-[1.2px] bg-current rounded-full" />
        </div>
      </div>
    </div>
  );
};
