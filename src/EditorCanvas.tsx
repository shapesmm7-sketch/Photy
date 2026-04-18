import React, { useRef, useState, useEffect } from 'react';
import { Share2, Download, Edit2, Crop, PenTool, Droplets, X, Check, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type Tool = 'none' | 'crop' | 'draw' | 'blur';

interface EditorCanvasProps {
  imageSrc: string;
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
}

export default function EditorCanvas({ imageSrc, onSave, onCancel }: EditorCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const blurCanvasRef = useRef<HTMLCanvasElement>(null);
  const [activeTool, setActiveTool] = useState<Tool>('none');
  const [isDrawing, setIsDrawing] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  
  // Base image state
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const [cropRect, setCropRect] = useState<{x: number, y: number, w: number, h: number} | null>(null);
  const cropStartRef = useRef<{x: number, y: number} | null>(null);
  const cropEndRef = useRef<{x: number, y: number} | null>(null);

  // Drawing state
  const [paths, setPaths] = useState<{ path: Path2D, color: string, width: number, isBlur: boolean }[]>([]);
  const currentPathRef = useRef<Path2D | null>(null);

  // Initialize and load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      originalImageRef.current = img;
      setCropRect({ x: 0, y: 0, w: img.width, h: img.height });
      fitImageToContainer(img, { x: 0, y: 0, w: img.width, h: img.height });
    };
    img.src = imageSrc;

    const handleResize = () => {
      // Basic resize handler
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [imageSrc]);

  const fitImageToContainer = (img: HTMLImageElement, rect: {x: number, y: number, w: number, h: number}) => {
    if (!containerRef.current || !canvasRef.current || !blurCanvasRef.current) return;
    const container = containerRef.current;
    
    // Fit logic
    const padding = 32;
    const cw = container.clientWidth - padding * 2;
    const ch = container.clientHeight - padding * 2;
    
    // Calculate aspect ratios based on current crop rect
    const imageAspect = rect.w / rect.h;
    const containerAspect = cw / ch;
    
    let destW, destH;
    if (imageAspect > containerAspect) {
      destW = cw;
      destH = cw / imageAspect;
    } else {
      destH = ch;
      destW = ch * imageAspect;
    }

    // Set canvas resolution strictly to crop size for quality
    const canvasObj = canvasRef.current;
    const blurCanvasObj = blurCanvasRef.current;
    
    canvasObj.width = rect.w;
    canvasObj.height = rect.h;
    blurCanvasObj.width = rect.w;
    blurCanvasObj.height = rect.h;

    setCanvasSize({ width: destW, height: destH });
    
    // Re-prepare blurred version for the blur tool (from original image cropped area)
    const bCtx = blurCanvasObj.getContext('2d');
    if (bCtx) {
      bCtx.filter = 'blur(15px)';
      bCtx.drawImage(img, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
      bCtx.filter = 'none';
    }

    redraw(rect); // Pass rect to use latest crop
  };

  const redraw = (currentCrop = cropRect) => {
    const canvas = canvasRef.current;
    const img = originalImageRef.current;
    if (!canvas || !img || !currentCrop) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Base image (cropped region)
    ctx.drawImage(img, currentCrop.x, currentCrop.y, currentCrop.w, currentCrop.h, 0, 0, canvas.width, canvas.height);

    // Draw paths
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    paths.forEach(p => {
      if (p.isBlur) {
        ctx.save();
        ctx.clip(p.path);
        if (blurCanvasRef.current) {
          ctx.drawImage(blurCanvasRef.current, 0, 0);
        }
        ctx.restore();
      } else {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.width;
        ctx.stroke(p.path);
      }
    });

    if (activeTool === 'crop' && cropStartRef.current && cropEndRef.current) {
       // Draw crop overlay
       ctx.fillStyle = 'rgba(0,0,0,0.5)';
       ctx.fillRect(0, 0, canvas.width, canvas.height);

       const sx = Math.min(cropStartRef.current.x, cropEndRef.current.x);
       const sy = Math.min(cropStartRef.current.y, cropEndRef.current.y);
       const w = Math.abs(cropStartRef.current.x - cropEndRef.current.x);
       const h = Math.abs(cropStartRef.current.y - cropEndRef.current.y);

       ctx.clearRect(sx, sy, w, h);
       ctx.strokeStyle = '#2563EB';
       ctx.lineWidth = Math.max(2, canvas.width * 0.005);
       ctx.strokeRect(sx, sy, w, h);
    } else if (currentPathRef.current) {
       if (activeTool === 'blur') {
          ctx.save();
          ctx.clip(currentPathRef.current);
          if (blurCanvasRef.current) {
            ctx.drawImage(blurCanvasRef.current, 0, 0);
          }
          ctx.restore();
       } else if (activeTool === 'draw') {
          ctx.strokeStyle = '#FF3366';
          ctx.lineWidth = canvas.width * 0.01;
          ctx.stroke(currentPathRef.current);
       }
    }
  };

  const getCanvasPoint = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (activeTool === 'none') return;
    setIsDrawing(true);
    const pt = getCanvasPoint(e);

    if (activeTool === 'crop') {
       cropStartRef.current = pt;
       cropEndRef.current = pt;
    } else {
       const path = new Path2D();
       path.moveTo(pt.x, pt.y);
       path.lineTo(pt.x + 0.1, pt.y + 0.1); 
       currentPathRef.current = path;
    }
    redraw();
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || activeTool === 'none') return;
    e.preventDefault();
    const pt = getCanvasPoint(e);

    if (activeTool === 'crop') {
       cropEndRef.current = pt;
    } else if (currentPathRef.current) {
       currentPathRef.current.lineTo(pt.x, pt.y);
    }
    redraw();
  };

  const handlePointerUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (activeTool === 'crop' && cropStartRef.current && cropEndRef.current && originalImageRef.current && cropRect) {
       const sx = Math.min(cropStartRef.current.x, cropEndRef.current.x);
       const sy = Math.min(cropStartRef.current.y, cropEndRef.current.y);
       const w = Math.abs(cropStartRef.current.x - cropEndRef.current.x);
       const h = Math.abs(cropStartRef.current.y - cropEndRef.current.y);

       // Check if crop area is reasonably large, else ignore
       if (w > 20 && h > 20) {
           // We are cropping the already cropped canvas area.
           // Relative to current cropRect
           const newCropRect = {
              x: cropRect.x + sx,
              y: cropRect.y + sy,
              w: w,
              h: h
           };
           setCropRect(newCropRect);
           // Clear paths because they will be misaligned after crop
           setPaths([]); 
           fitImageToContainer(originalImageRef.current, newCropRect);
       }
       cropStartRef.current = null;
       cropEndRef.current = null;
       setActiveTool('none'); // Reset tool after crop
    } else if (currentPathRef.current && canvasRef.current) {
       setPaths([...paths, { 
         path: currentPathRef.current, 
         color: '#FF3366', 
         width: canvasRef.current.width * 0.01,
         isBlur: activeTool === 'blur'
       }]);
       currentPathRef.current = null;
    }
    
    redraw();
  };

  const handleSave = () => {
    if (canvasRef.current) {
        onSave(canvasRef.current.toDataURL('image/png', 0.9));
    }
  };

  return (
    <div className="flex flex-col h-full bg-black text-white absolute inset-0 z-50">
      <canvas ref={blurCanvasRef} className="hidden" />

      <div className="flex items-center justify-between p-4 bg-[#111] z-10 pt-safe border-b border-white/10">
        <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <X className="w-5 h-5" />
        </button>
        <span className="font-medium text-sm tracking-wide">EDITOR</span>
        <button onClick={handleSave} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-sm font-medium rounded-full transition-colors">
          Save
        </button>
      </div>

      <div 
        ref={containerRef} 
        className="flex-1 flex items-center justify-center relative overflow-hidden bg-[#0a0a0a]"
      >
        {canvasSize.width > 0 && (
            <canvas
              ref={canvasRef}
              style={{
                width: canvasSize.width,
                height: canvasSize.height,
                touchAction: 'none',
                cursor: activeTool === 'crop' ? 'crosshair' : 'default'
              }}
              className="shadow-2xl rounded"
              onMouseDown={handlePointerDown}
              onMouseMove={handlePointerMove}
              onMouseUp={handlePointerUp}
              onMouseLeave={handlePointerUp}
              onTouchStart={handlePointerDown}
              onTouchMove={handlePointerMove}
              onTouchEnd={handlePointerUp}
            />
        )}
      </div>

      <div className="flex justify-around items-center p-4 bg-[#111] pb-safe z-10 border-t border-white/10">
        <ToolButton 
           active={activeTool === 'crop'} 
           onClick={() => setActiveTool('crop')} 
           icon={<Crop />} 
           label="Crop" 
        />
        <ToolButton 
           active={activeTool === 'draw'} 
           onClick={() => setActiveTool('draw')} 
           icon={<PenTool />} 
           label="Draw" 
        />
        <ToolButton 
           active={activeTool === 'blur'} 
           onClick={() => setActiveTool('blur')} 
           icon={<Droplets />} 
           label="Blur" 
        />
        <div className="w-[1px] h-8 bg-white/10 mx-2" />
        <button 
           onClick={() => {
              setPaths([]);
              if (originalImageRef.current) {
                 const rect = { x: 0, y: 0, w: originalImageRef.current.width, h: originalImageRef.current.height };
                 setCropRect(rect);
                 fitImageToContainer(originalImageRef.current, rect);
              }
           }} 
           className="flex flex-col items-center gap-1 p-2 text-red-400 opacity-80 hover:opacity-100 transition-opacity"
        >
          <X className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-medium tracking-wide uppercase">Reset</span>
        </button>
      </div>
    </div>
  );
}

function ToolButton({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 p-2 min-w-[64px] rounded-xl transition-all ${
        active ? 'text-white bg-white/10 shadow-inner' : 'text-gray-500 hover:text-white/80'
      }`}
    >
      <div className={`transition-transform ${active ? 'scale-110 mb-1 text-blue-400' : ''}`}>
        {icon}
      </div>
      <span className="text-[10px] font-bold tracking-wider uppercase">{label}</span>
    </button>
  );
}
