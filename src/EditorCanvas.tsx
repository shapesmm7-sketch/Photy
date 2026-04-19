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
  fontName: string;
}

const fontNames = ["Default", "Serif", "SansSerif", "Monospace", "Cursive"];
const textColors = ["#FFFFFF", "#CCCCCC", "#888888", "#444444", "#000000", "#FF3366", "#FF0000", "#FF5722", "#4CAF50", "#2196F3", "#9C27B0", "#FFEB3B"];

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
  const [editingTextIndex, setEditingTextIndex] = useState<number>(-1);
  const [currentText, setCurrentText] = useState('');
  const [textPositionMode, setTextPositionMode] = useState<'Top' | 'Default' | 'Bottom'>('Default');
  const [currentTextSize, setCurrentTextSize] = useState(32);
  const [currentTextColor, setCurrentTextColor] = useState('#FFFFFF');
  const [currentTextFont, setCurrentTextFont] = useState('Default');

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
    
    const hasTop = texts.some(t => t.positionMode === 'Top') || (showTextModal && textPositionMode === 'Top');
    const hasBottom = texts.some(t => t.positionMode === 'Bottom') || (showTextModal && textPositionMode === 'Bottom');
    
    // Fit logic
    const padding = 32;
    const cw = container.clientWidth - padding * 2;
    const ch = container.clientHeight - padding * 2;
    
    const topTextSize = Math.max(0, ...texts.filter(t => t.positionMode === 'Top').map(t => t.size), (showTextModal && textPositionMode === 'Top') ? currentTextSize : 0);
    const bottomTextSize = Math.max(0, ...texts.filter(t => t.positionMode === 'Bottom').map(t => t.size), (showTextModal && textPositionMode === 'Bottom') ? currentTextSize : 0);
    
    const topPad = topTextSize > 24 ? topTextSize * 1.2 : 0;
    const bottomPad = bottomTextSize > 24 ? bottomTextSize * 1.2 : 0;

    const virtualH = rect.h + topPad + bottomPad;

    // Calculate aspect ratios based on current crop rect + pads
    const imageAspect = rect.w / virtualH;
    const containerAspect = cw / ch;
    
    let destW, destH;
    if (imageAspect > containerAspect) {
      destW = cw;
      destH = cw / imageAspect;
    } else {
      destH = ch;
      destW = ch * imageAspect;
    }

    // Set canvas resolution strictly to crop size + padding for quality
    const canvasObj = canvasRef.current;
    const blurCanvasObj = blurCanvasRef.current;
    
    canvasObj.width = rect.w;
    canvasObj.height = virtualH;
    blurCanvasObj.width = rect.w;
    blurCanvasObj.height = virtualH;

    setCanvasSize({ width: destW, height: destH });
    
    // Re-prepare blurred version
    const bCtx = blurCanvasObj.getContext('2d');
    if (bCtx) {
      bCtx.clearRect(0, 0, blurCanvasObj.width, blurCanvasObj.height);
      bCtx.filter = 'blur(15px)';
      bCtx.drawImage(img, rect.x, rect.y, rect.w, rect.h, 0, topPad, rect.w, rect.h);
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

    const topTextSize = Math.max(0, ...texts.filter(t => t.positionMode === 'Top').map(t => t.size), (showTextModal && textPositionMode === 'Top') ? currentTextSize : 0);
    const topPad = topTextSize > 24 ? topTextSize * 1.2 : 0;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Base image (cropped region)
    ctx.drawImage(img, currentCrop.x, currentCrop.y, currentCrop.w, currentCrop.h, 0, topPad, currentCrop.w, currentCrop.h);

    ctx.save();
    ctx.translate(0, topPad);

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
      
      let fontStr = 'sans-serif';
      if (t.fontName === 'Serif') fontStr = 'serif';
      if (t.fontName === 'Monospace') fontStr = 'monospace';
      if (t.fontName === 'Cursive') fontStr = 'cursive';
      ctx.font = `bold ${t.size}px ${fontStr}`;
      
      ctx.textAlign = 'center';
      ctx.fillText(t.text, t.x, t.y);
    });

    // Draw temporary preview text if modal is open
    if (showTextModal && currentText.trim() && currentCrop) {
      const size = currentTextSize;
      const x = canvas.width / 2;
      let y = currentCrop.h / 2;
      
      if (textPositionMode === 'Top') y = size + 20;
      if (textPositionMode === 'Bottom') y = currentCrop.h - 40;

      ctx.fillStyle = currentTextColor;
      ctx.globalAlpha = 0.8;
      
      let fontStr = 'sans-serif';
      if (currentTextFont === 'Serif') fontStr = 'serif';
      if (currentTextFont === 'Monospace') fontStr = 'monospace';
      if (currentTextFont === 'Cursive') fontStr = 'cursive';
      
      ctx.font = `bold ${size}px ${fontStr}`;
      ctx.textAlign = 'center';
      ctx.fillText(currentText, x, y);
      ctx.globalAlpha = 1.0;
    }
    
    ctx.restore();

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
    if (originalImageRef.current && cropRect) {
        fitImageToContainer(originalImageRef.current, cropRect);
    } else {
        redraw();
    }
  }, [currentText, textPositionMode, texts, showTextModal]);

  const getCanvasPoint = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || !cropRect) return { x: 0, y: 0 };
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

    const hasTop = texts.some(t => t.positionMode === 'Top') || (showTextModal && textPositionMode === 'Top');
    const imgY = hasTop ? (cropRect.h * 0.15) : 0;

    return {
      x: (clientX - rect.left) * scaleX,
      y: ((clientY - rect.top) * scaleY) - (activeTool === 'crop' ? 0 : imgY)
    };
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    const pt = getCanvasPoint(e);

    // Hit test for texts (even if activeTool !== 'text', allow tapping to edit)
    const clickedTextIndex = texts.findIndex(t => {
      // Approximation of font bounds. t.x is center, t.y is baseline
      const height = t.size * 1.5; // add padding
      const width = Math.max(t.text.length * (t.size * 0.7), 40) + 40; // approx width with generous padding
      return pt.x > t.x - width/2 && pt.x < t.x + width/2 && pt.y < t.y + 20 && pt.y > t.y - height;
    });

    if (clickedTextIndex >= 0) {
      const t = texts[clickedTextIndex];
      setEditingTextIndex(clickedTextIndex);
      setCurrentText(t.text);
      setCurrentTextColor(t.color);
      setCurrentTextSize(t.size);
      setCurrentTextFont(t.fontName);
      setTextPositionMode(t.positionMode);
      setActiveTool('text');
      setShowTextModal(true);
      return;
    }

    if (activeTool === 'none' || activeTool === 'text') return;
    setIsDrawing(true);

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
    if (!canvasRef.current || !currentText.trim() || !cropRect) return;
    const canvas = canvasRef.current;
    
    const size = currentTextSize;
    const x = canvas.width / 2;
    let y = canvas.height / 2;

    const topTextSize = Math.max(0, ...texts.filter(t => t.positionMode === 'Top').map(t => t.size), (showTextModal && textPositionMode === 'Top') ? currentTextSize : 0);
    const topPad = topTextSize > 24 ? topTextSize * 1.2 : 0;

    if (textPositionMode === 'Top') y = size;
    if (textPositionMode === 'Bottom') y = canvas.height - 20;

    const newText: TextItem = {
      text: currentText,
      x,
      y,
      color: currentTextColor,
      size: currentTextSize,
      positionMode: textPositionMode,
      fontName: currentTextFont
    };

    if (editingTextIndex >= 0) {
      const newTexts = [...texts];
      newTexts[editingTextIndex] = newText;
      setTexts(newTexts);
    } else {
      setTexts([...texts, newText]);
    }
    
    setEditingTextIndex(-1);
    setShowTextModal(false);
    setCurrentText('');
    redraw();
  };

  const handleDeleteText = () => {
    if (editingTextIndex >= 0) {
      const newTexts = [...texts];
      newTexts.splice(editingTextIndex, 1);
      setTexts(newTexts);
    }
    setEditingTextIndex(-1);
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute inset-x-0 bottom-0 z-[60] flex items-end justify-center pb-24"
          >
            <div className="bg-white/95 backdrop-blur-md w-full max-w-[400px] mx-4 rounded-3xl p-6 shadow-2xl text-black border border-gray-200">
              <h3 className="text-lg font-bold mb-4">Add Text</h3>
              
              <div className="space-y-4 max-h-[50vh] overflow-y-auto">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest pl-1 mb-1">Text</label>
                  <input 
                    autoFocus
                    className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 ring-blue-500 transition-all font-medium text-sm text-black"
                    placeholder="Enter text here..."
                    value={currentText}
                    onChange={e => setCurrentText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && currentText && handleAddText()}
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Size: {currentTextSize}</label>
                  <input 
                    type="range"
                    min="12" max="100"
                    value={currentTextSize}
                    onChange={e => setCurrentTextSize(Number(e.target.value))}
                    className="w-full mt-2"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Position</label>
                  <div className="flex gap-2">
                    {(['Top', 'Default', 'Bottom'] as const).map(mode => (
                      <button
                        key={mode}
                        onClick={() => setTextPositionMode(mode)}
                        className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                          textPositionMode === mode ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {fontNames.map(font => (
                    <button
                      key={font}
                      onClick={() => setCurrentTextFont(font)}
                      className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                        currentTextFont === font ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }`}
                    >
                      {font}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                  {textColors.map(color => (
                    <button
                      key={color}
                      onClick={() => setCurrentTextColor(color)}
                      className={`w-7 h-7 shrink-0 rounded-full border-2 transition-transform ${
                        currentTextColor === color ? 'border-blue-500 scale-110' : 'border-gray-200 opacity-80'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>

                <div className="flex gap-3 pt-2">
                  {editingTextIndex >= 0 && (
                    <button 
                      onClick={handleDeleteText}
                      className="py-2 px-4 bg-red-100 text-red-600 hover:bg-red-200 rounded-xl font-bold text-sm transition-colors"
                    >
                      Delete
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      setShowTextModal(false);
                      setEditingTextIndex(-1);
                    }}
                    className="flex-1 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-xl font-bold text-sm"
                  >
                    Cancel
                  </button>
                  <button 
                    disabled={!currentText.trim()}
                    onClick={handleAddText}
                    className="flex-[2] py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 text-white rounded-xl font-bold text-sm shadow-md transition-all active:scale-95"
                  >
                    {editingTextIndex >= 0 ? "Save" : "Add"}
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
