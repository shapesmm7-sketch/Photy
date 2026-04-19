import React, { useRef, useState, useEffect } from 'react';
import { Share2, Download, Edit2, Crop, PenTool, Droplets, X, Check, Save, Type } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type Tool = 'none' | 'crop' | 'draw' | 'blur' | 'text';

interface TextItem {
  text: string;
  x: number;
  y: number;
  color: string;
  size: number;
  positionMode: 'Top' | 'Default' | 'Bottom';
}

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
  const drawingPointsRef = useRef<{x: number, y: number}[]>([]);
  const [suggestedShape, setSuggestedShape] = useState<'Line' | 'Circle' | null>(null);

  const detectShapeWeb = (points: {x: number, y: number}[]) => {
    if (points.length < 10) return null;
    const start = points[0];
    const end = points[points.length - 1];
    const directDist = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
    
    let pathDist = 0;
    for (let i = 0; i < points.length - 1; i++) {
      pathDist += Math.sqrt(Math.pow(points[i+1].x - points[i].x, 2) + Math.pow(points[i+1].y - points[i].y, 2));
    }
    
    if (directDist > 0.9 * pathDist) return 'Line';
    
    if (directDist < pathDist * 0.3) {
       const avgX = points.reduce((s, p) => s + p.x, 0) / points.length;
       const avgY = points.reduce((s, p) => s + p.y, 0) / points.length;
       const radii = points.map(p => Math.sqrt(Math.pow(p.x - avgX, 2) + Math.pow(p.y - avgY, 2)));
       const avgRadius = radii.reduce((s, r) => s + r, 0) / radii.length;
       const variance = radii.reduce((s, r) => s + Math.pow(r - avgRadius, 2), 0) / radii.length;
       if (Math.sqrt(variance) < avgRadius * 0.25) return 'Circle';
    }
    return null;
  };

  // Text state
  const [texts, setTexts] = useState<TextItem[]>([]);
  const [showTextModal, setShowTextModal] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [textPositionMode, setTextPositionMode] = useState<'Top' | 'Default' | 'Bottom'>('Default');

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

    // Draw texts
    texts.forEach(t => {
      ctx.fillStyle = t.color;
      ctx.font = `bold ${t.size}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(t.text, t.x, t.y);
    });

    // Draw temporary preview text if modal is open
    if (showTextModal && currentText.trim()) {
      const size = canvas.width * 0.05;
      const x = canvas.width / 2;
      let y = canvas.height / 2;
      if (textPositionMode === 'Top') y = size * 2;
      if (textPositionMode === 'Bottom') y = canvas.height - size;

      ctx.fillStyle = 'rgba(255,255,255,0.8)'; // Slightly transparent for preview
      ctx.font = `bold ${size}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(currentText, x, y);
    }

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

  // Trigger redraw when state changes for live preview
  useEffect(() => {
    redraw();
  }, [currentText, textPositionMode, texts, showTextModal]);

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
       drawingPointsRef.current = [pt];
       setSuggestedShape(null);
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
       drawingPointsRef.current.push(pt);
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
        const color = activeTool === 'draw' ? '#FF3366' : 'transparent';
        const width = canvasRef.current.width * 0.01;
        setPaths([...paths, { 
          path: currentPathRef.current, 
          color, 
          width: activeTool === 'blur' ? 30 : width, 
          isBlur: activeTool === 'blur' 
        }]);

        if (activeTool === 'draw') {
          const shape = detectShapeWeb(drawingPointsRef.current);
          setSuggestedShape(shape);
        }
        currentPathRef.current = null;
    }
    
    redraw();
  };

  const handleAddText = () => {
    if (!canvasRef.current || !currentText.trim()) return;
    const canvas = canvasRef.current;
    
    const size = canvas.width * 0.05;
    const x = canvas.width / 2;
    let y = canvas.height / 2;

    if (textPositionMode === 'Top') y = size * 2;
    if (textPositionMode === 'Bottom') y = canvas.height - size;

    const newText: TextItem = {
      text: currentText,
      x,
      y,
      color: 'white',
      size,
      positionMode: textPositionMode
    };

    setTexts([...texts, newText]);
    setShowTextModal(false);
    setCurrentText('');
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

        {/* Refinement Prompt */}
        {suggestedShape && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30">
             <button 
               onClick={() => {
                 if (paths.length === 0 || drawingPointsRef.current.length === 0) return;
                 const newRefined = new Path2D();
                 if (suggestedShape === 'Line') {
                   const s = drawingPointsRef.current[0];
                   const e = drawingPointsRef.current[drawingPointsRef.current.length - 1];
                   newRefined.moveTo(s.x, s.y);
                   newRefined.lineTo(e.x, e.y);
                 } else {
                   const points = drawingPointsRef.current;
                   const minX = Math.min(...points.map(p => p.x));
                   const maxX = Math.max(...points.map(p => p.x));
                   const minY = Math.min(...points.map(p => p.y));
                   const maxY = Math.max(...points.map(p => p.y));
                   const w = maxX - minX;
                   const h = maxY - minY;
                   const cx = minX + w/2;
                   const cy = minY + h/2;
                   const r = (w + h) / 4;
                   newRefined.arc(cx, cy, r, 0, Math.PI * 2);
                 }
                 setPaths(prev => {
                   const next = [...prev];
                   const last = next[next.length - 1];
                   if (!last) return prev;
                   next[next.length - 1] = { ...last, path: newRefined };
                   return next;
                 });
                 setSuggestedShape(null);
                 setTimeout(() => redraw(), 0);
               }}
               className="bg-blue-600 shadow-xl shadow-blue-900/40 text-white px-6 py-3 rounded-full font-bold animate-pulse flex items-center gap-2 border border-white/20 whitespace-nowrap"
             >
               ✨ Perfect to {suggestedShape}?
             </button>
          </div>
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
        <ToolButton 
           active={activeTool === 'text'} 
           onClick={() => {
             setActiveTool('text');
             setCurrentText('');
             setTextPositionMode('Default');
             setShowTextModal(true);
           }} 
           icon={<Type />} 
           label="Text" 
        />
        <div className="w-[1px] h-8 bg-white/10 mx-2" />
        <button 
           onClick={() => {
              setPaths([]);
              setTexts([]);
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

      <AnimatePresence>
        {showTextModal && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 z-[60] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          >
            <div className="bg-[#1a1a1a] w-full max-w-sm rounded-[32px] p-8 border border-white/10 shadow-2xl">
              <h3 className="text-xl font-bold mb-6 text-center">Add Text</h3>
              
              <div className="space-y-6">
                <input 
                  autoFocus
                  className="w-full bg-[#2a2a2a] rounded-2xl px-6 py-4 outline-none focus:ring-2 ring-blue-500 transition-all font-medium"
                  placeholder="Enter text here..."
                  value={currentText}
                  onChange={e => setCurrentText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && currentText && handleAddText()}
                />

                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Position</label>
                  <div className="flex gap-2">
                    {(['Top', 'Default', 'Bottom'] as const).map(mode => (
                      <button
                        key={mode}
                        onClick={() => setTextPositionMode(mode)}
                        className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${
                          textPositionMode === mode ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'bg-[#2a2a2a] text-gray-400 hover:bg-[#333]'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setShowTextModal(false)}
                    className="flex-1 py-4 bg-transparent text-gray-400 font-bold"
                  >
                    Cancel
                  </button>
                  <button 
                    disabled={!currentText.trim()}
                    onClick={handleAddText}
                    className="flex-1 py-4 bg-blue-600 rounded-2xl font-bold shadow-xl shadow-blue-900/20 disabled:opacity-50 transition-all active:scale-95"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
