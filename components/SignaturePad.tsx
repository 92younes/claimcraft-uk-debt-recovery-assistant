
import React, { useRef, useState, useEffect } from 'react';
import { Eraser, Check } from 'lucide-react';
import { Button } from './ui/Button';

interface SignaturePadProps {
  onSave: (base64: string) => void;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({ onSave }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);

  // Resize canvas to match display size and handle high-DPI displays
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      // Set actual canvas size in memory (scaled for DPR)
      canvas.width = rect.width * dpr;
      canvas.height = 150 * dpr;

      // Scale context to match DPR
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
        // Reset drawing styles after context scale
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#000';
      }
    };

    resizeCanvas();

    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasContent(true);
    const { offsetX, offsetY } = getCoordinates(e, canvas);
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const { offsetX, offsetY } = getCoordinates(e, canvas);
    ctx.lineTo(offsetX, offsetY);
    ctx.stroke();
  };

  const endDraw = () => {
    setIsDrawing(false);
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      offsetX: clientX - rect.left,
      offsetY: clientY - rect.top
    };
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasContent(false);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
  };

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm w-full max-w-lg">
       <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Sign Here</h3>
       <div ref={containerRef} className="relative border border-slate-300 rounded-lg bg-slate-50 touch-none overflow-hidden">
          <canvas
            ref={canvasRef}
            className="w-full cursor-crosshair"
            style={{ width: '100%', height: '150px' }}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
          />
          {!hasContent && (
             <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-slate-400 text-sm italic">
                Draw your signature here...
             </div>
          )}
       </div>
       <div className="flex justify-end gap-2 mt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            icon={<Eraser className="w-4 h-4" />}
          >
            Clear
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasContent}
            icon={<Check className="w-4 h-4" />}
          >
            Apply Signature
          </Button>
       </div>
    </div>
  );
};
