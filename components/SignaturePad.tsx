
import React, { useRef, useState } from 'react';
import { Eraser, Check } from 'lucide-react';

interface SignaturePadProps {
  onSave: (base64: string) => void;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({ onSave }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);

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
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm w-full max-w-md">
       <h3 className="text-sm font-bold text-slate-500 uppercase mb-2">Sign Here</h3>
       <div className="relative border border-slate-300 rounded-lg bg-slate-50 touch-none overflow-hidden">
          <canvas
            ref={canvasRef}
            width={400}
            height={150}
            className="w-full h-[150px] cursor-crosshair"
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
          <button 
            onClick={handleClear}
            className="text-slate-500 hover:text-slate-800 px-3 py-1.5 text-sm font-medium flex items-center gap-1"
          >
             <Eraser className="w-4 h-4" /> Clear
          </button>
          <button 
            onClick={handleSave}
            disabled={!hasContent}
            className="bg-slate-900 text-white hover:bg-slate-800 px-4 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 disabled:opacity-50 transition-colors duration-200"
          >
             <Check className="w-4 h-4" /> Apply Signature
          </button>
       </div>
    </div>
  );
};
