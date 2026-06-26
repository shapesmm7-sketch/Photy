import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Download, ArrowUpRight, Check, Hand, GripVertical, GripHorizontal, Minimize, Sparkles } from "lucide-react";
import JSZip from "jszip";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { isNative } from "../lib/isNative";
import { admobManager } from "../lib/admob";

interface SplitPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  isPremium?: boolean;
}

type SplitMode = "vertical" | "horizontal" | "equal" | "manual";

export const SplitPhotoModal: React.FC<SplitPhotoModalProps> = ({
  isOpen,
  onClose,
  imageSrc,
  isPremium = false,
}) => {
  const [splitMode, setSplitMode] = useState<SplitMode>("vertical");
  const [splitCount, setSplitCount] = useState<number>(2);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [displayedSize, setDisplayedSize] = useState({ width: 0, height: 0 });
  const [manualLines, setManualLines] = useState<number[]>([]);
  const [activeLineIndex, setActiveLineIndex] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && imageSrc) {
      const img = new Image();
      img.onload = () => {
        setImageSize({ width: img.width, height: img.height });
        // Initial setup based on size
        setSplitMode("vertical");
        setSplitCount(2);
        setManualLines([]);
      };
      img.src = imageSrc;
    }
  }, [isOpen, imageSrc]);

  useEffect(() => {
    // calculate displayed size
    const updateDisplayedSize = () => {
      if (containerRef.current && imageSize.width > 0) {
        const cW = containerRef.current.clientWidth;
        const cH = containerRef.current.clientHeight;
        const scale = Math.min(cW / imageSize.width, cH / imageSize.height);
        setDisplayedSize({
          width: imageSize.width * scale,
          height: imageSize.height * scale,
        });
      }
    };
    updateDisplayedSize();
    window.addEventListener("resize", updateDisplayedSize);
    return () => window.removeEventListener("resize", updateDisplayedSize);
  }, [imageSize, isOpen]);

  // Adjust manual lines when switching modes
  useEffect(() => {
    if (splitMode === "manual" && manualLines.length === 0 && splitCount > 1) {
      // populate manual lines based on previous count
      const lines = [];
      const count = Math.max(1, splitCount - 1);
      for (let i = 1; i <= count; i++) {
        lines.push(i / (count + 1));
      }
      setManualLines(lines);
    }
  }, [splitMode, splitCount]);

  const increaseCount = () => setSplitCount(c => Math.min(10, c + 1));
  const decreaseCount = () => setSplitCount(c => Math.max(2, c - 1));

  const handleContainerPointerDown = (e: React.PointerEvent) => {
    if (splitMode !== "manual") return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const yPos = (e.clientY - rect.top - (rect.height - displayedSize.height) / 2);
    const fraction = yPos / displayedSize.height;

    if (fraction > 0 && fraction < 1) {
      setManualLines([...manualLines, fraction]);
    }
  };

  const handleLinePointerDown = (e: React.PointerEvent, index: number) => {
    e.stopPropagation();
    setActiveLineIndex(index);
    const html = document.documentElement;

    const moveLine = (moveEvent: PointerEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const yPos = (moveEvent.clientY - rect.top - (rect.height - displayedSize.height) / 2);
      let fraction = yPos / displayedSize.height;
      fraction = Math.max(0.01, Math.min(0.99, fraction));

      setManualLines(prev => {
        const next = [...prev];
        next[index] = fraction;
        return next;
      });
    };

    const upLine = () => {
      setActiveLineIndex(null);
      html.removeEventListener("pointermove", moveLine);
      html.removeEventListener("pointerup", upLine);
    };

    html.addEventListener("pointermove", moveLine);
    html.addEventListener("pointerup", upLine);
  };

  const generateSplitImages = async (): Promise<string[]> => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return [];
    
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise((resolve) => {
      img.onload = resolve;
      img.src = imageSrc;
    });

    const segments: string[] = [];

    if (splitMode === "vertical" || splitMode === "manual") {
      let lines = [];
      if (splitMode === "vertical") {
        for (let i = 1; i < splitCount; i++) {
          lines.push(i / splitCount);
        }
      } else {
        lines = [...manualLines].sort();
      }

      const cutPoints = [0, ...lines.map(l => Math.round(l * imageSize.height)), imageSize.height];

      for (let i = 0; i < cutPoints.length - 1; i++) {
        const startY = cutPoints[i];
        const endY = cutPoints[i + 1];
        const h = endY - startY;
        if (h <= 0) continue;

        canvas.width = imageSize.width;
        canvas.height = h;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, startY, imageSize.width, h, 0, 0, canvas.width, h);
        segments.push(canvas.toDataURL("image/png"));
      }
    } else if (splitMode === "horizontal") {
      let lines = [];
      for (let i = 1; i < splitCount; i++) {
        lines.push(i / splitCount);
      }
      const cutPoints = [0, ...lines.map(l => Math.round(l * imageSize.width)), imageSize.width];

      for (let i = 0; i < cutPoints.length - 1; i++) {
        const startX = cutPoints[i];
        const endX = cutPoints[i + 1];
        const w = endX - startX;
        if (w <= 0) continue;

        canvas.width = w;
        canvas.height = imageSize.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, startX, 0, w, imageSize.height, 0, 0, w, canvas.height);
        segments.push(canvas.toDataURL("image/png"));
      }
    } else if (splitMode === "equal") {
      // Let's assume splitCount x splitCount grid if "equal" grid, or just N col x M req.
      // Usually "splitCount" handles grid dimension. Let's do a square grid layout (e.g. 2x2, 3x3) based on splitCount.
      // But typically "Equal" might mean a grid like 3x3.
      // For simplicity let's make a grid of splitCount x splitCount.
      const cols = splitCount;
      const rows = splitCount;
      const w = Math.round(imageSize.width / cols);
      const h = Math.round(imageSize.height / rows);

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const startX = c * w;
          const startY = r * h;
          canvas.width = w;
          canvas.height = h;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, startX, startY, w, h, 0, 0, w, h);
          segments.push(canvas.toDataURL("image/png"));
        }
      }
    }

    return segments;
  };

  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const handleDownload = () => {
    if (isExporting) return;
    admobManager.showInterstitialBeforeAction(() => {
      handleDownloadActual();
    });
  };

  const handleDownloadActual = async () => {
    setIsExporting(true);
    try {
      const segments = await generateSplitImages();
      const timestamp = Date.now();
      
      if (segments.length === 1) {
        // Native Android saving using NativeMedia plugin
        if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android") {
          try {
            const NativeMedia = registerPlugin<any>("NativeMedia");
            const cleanBase64 = segments[0].includes(",") ? segments[0].split(",")[1] : segments[0];
            await NativeMedia.saveImage({
              base64: cleanBase64,
              filename: `split_image_${timestamp}.png`,
              mimeType: "image/png"
            });
            alert("Image saved directly to your phone gallery under 'Pictures/Photy'!");
            setIsExporting(false);
            return;
          } catch (nativeErr: any) {
            console.error("Native save failed, trying Web download fallback:", nativeErr);
          }
        }

        const a = document.createElement("a");
        a.href = segments[0];
        a.download = `split_image_${timestamp}.png`;
        a.click();
      } else {
        // Zip download
        if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android") {
          try {
            const NativeMedia = registerPlugin<any>("NativeMedia");
            const zip = new JSZip();
            segments.forEach((seg, i) => {
              const b64 = seg.split(",")[1];
              zip.file(`split_${i + 1}.png`, b64, { base64: true });
            });
            const base64Content = await zip.generateAsync({ type: "base64" });
            
            await NativeMedia.saveZip({
              base64: base64Content,
              filename: `split_photos_${timestamp}.zip`
            });
            alert("Zip file saved directly to your 'Downloads/Photy' folder!");
            setIsExporting(false);
            return;
          } catch (nativeErr: any) {
            console.error("Native zip save failed, trying Web fallback:", nativeErr);
          }
        }

        const zip = new JSZip();
        segments.forEach((seg, i) => {
          const b64 = seg.split(",")[1];
          zip.file(`split_${i + 1}.png`, b64, { base64: true });
        });
        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const a = document.createElement("a");
        a.href = url;
        a.download = `split_photos_${timestamp}.zip`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error(e);
      alert("Error generating split images.");
    } finally {
      setIsExporting(false);
    }
  };

  const getCutLines = () => {
    if (splitMode === "vertical" || splitMode === "horizontal") {
      const lines = [];
      for (let i = 1; i < splitCount; i++) {
        lines.push(i / splitCount);
      }
      return lines;
    }
    if (splitMode === "manual") {
      return manualLines;
    }
    return [];
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed inset-0 z-50 bg-[#1e1e1e] flex flex-col items-center select-none"
        >
          {/* Header */}
          <div className="w-full flex items-center justify-between p-4 bg-[#252525] shrink-0 shadow-sm z-10">
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 transition text-white"
            >
              <X className="w-6 h-6" />
            </button>
            <span className="text-white font-semibold flex-1 text-center font-sans tracking-wide">
              Split Photo
            </span>
            <button
              onClick={handleDownload}
              disabled={isExporting}
              className="px-4 py-2 bg-blue-500 text-white font-bold rounded-full hover:bg-blue-600 transition flex items-center gap-1.5 shadow-md active:scale-95 disabled:opacity-50"
            >
              {isExporting ? <Check className="w-4 h-4 animate-spin hidden" /> : <Download className="w-4 h-4" />}
              {isExporting ? "Saving..." : "Save"}
            </button>
          </div>

          {/* Canvas Wrapper */}
          <div 
            className="flex-1 w-full bg-[#1e1e1e] relative overflow-hidden flex items-center justify-center p-4"
            ref={containerRef}
          >
            {displayedSize.width > 0 && (
              <div 
                className="relative shadow-2xl"
                style={{
                  width: displayedSize.width,
                  height: displayedSize.height,
                  backgroundImage: `url(${imageSrc})`,
                  backgroundSize: "contain",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "center",
                }}
                onPointerDown={handleContainerPointerDown}
              >
                {/* Overlay guides */}
                {(splitMode === "vertical" || splitMode === "manual") && getCutLines().map((fraction, i) => (
                  <div
                    key={i}
                    className="absolute left-0 right-0 h-[2px] bg-yellow-400 shadow-[0_0_8px_rgba(0,0,0,0.8)] z-10 flex items-center justify-center cursor-row-resize"
                    style={{ top: `${fraction * 100}%` }}
                    onPointerDown={splitMode === "manual" ? (e) => handleLinePointerDown(e, i) : undefined}
                  >
                    {splitMode === "manual" && (
                      <div className="w-8 h-8 rounded-full bg-yellow-400/20 absolute z-20" />
                    )}
                  </div>
                ))}
                
                {splitMode === "horizontal" && getCutLines().map((fraction, i) => (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 w-[2px] bg-yellow-400 shadow-[0_0_8px_rgba(0,0,0,0.8)] z-10"
                    style={{ left: `${fraction * 100}%` }}
                  />
                ))}

                {splitMode === "equal" && (
                  <div className="absolute inset-0 pointer-events-none">
                    {Array.from({ length: splitCount - 1 }).map((_, i) => (
                      <div
                        key={`h-${i}`}
                        className="absolute left-0 right-0 h-[1px] bg-yellow-400/70"
                        style={{ top: `${((i + 1) / splitCount) * 100}%` }}
                      />
                    ))}
                    {Array.from({ length: splitCount - 1 }).map((_, i) => (
                      <div
                        key={`v-${i}`}
                        className="absolute top-0 bottom-0 w-[1px] bg-yellow-400/70"
                        style={{ left: `${((i + 1) / splitCount) * 100}%` }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {splitMode === "manual" && (
               <div className="absolute top-4 bg-black/60 text-white/90 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-md">
                 Tap to add line. Drag to move.
               </div>
            )}
          </div>

          {/* Bottom Toolbar Area */}
          <div className="w-full bg-[#121212] pt-4 pb-8 px-4 flex flex-col gap-6 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] z-10 border-t border-white/5">
            {/* Mode Selector */}
            <div className="flex items-center justify-around w-full max-w-sm mx-auto">
              <button 
                onClick={() => setSplitMode("vertical")}
                className={`flex flex-col items-center gap-1.5 ${splitMode === "vertical" ? "text-blue-400" : "text-gray-400 hover:text-gray-300"}`}
              >
                <GripVertical className="w-6 h-6 rotate-90" />
                <span className="text-xs font-medium">Vertical</span>
              </button>
              <button 
                onClick={() => setSplitMode("horizontal")}
                className={`flex flex-col items-center gap-1.5 ${splitMode === "horizontal" ? "text-blue-400" : "text-gray-400 hover:text-gray-300"}`}
              >
                <GripVertical className="w-6 h-6" />
                <span className="text-xs font-medium">Horizontal</span>
              </button>
              <button 
                onClick={() => setSplitMode("equal")}
                className={`flex flex-col items-center gap-1.5 ${splitMode === "equal" ? "text-blue-400" : "text-gray-400 hover:text-gray-300"}`}
              >
                <div className="grid grid-cols-2 gap-[1px] w-5 h-5 bg-current border-[1.5px] border-current p-[1px] rounded-sm bg-clip-content">
                  <div className="bg-[#121212]"></div>
                  <div className="bg-[#121212]"></div>
                  <div className="bg-[#121212]"></div>
                  <div className="bg-[#121212]"></div>
                </div>
                <span className="text-xs font-medium">Equal</span>
              </button>
              <button 
                onClick={() => setSplitMode("manual")}
                className={`flex flex-col items-center gap-1.5 ${splitMode === "manual" ? "text-blue-400" : "text-gray-400 hover:text-gray-300"}`}
              >
                <Hand className="w-6 h-6" />
                <span className="text-xs font-medium">Manual</span>
              </button>
            </div>

            {/* Stepper */}
            {splitMode !== "manual" && (
              <div className="flex items-center justify-center gap-6">
                <button 
                  onClick={decreaseCount}
                  className="w-12 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center text-2xl hover:bg-white/20 transition disabled:opacity-50"
                  disabled={splitCount <= 2}
                >
                  −
                </button>
                <span className="text-2xl font-semibold text-white w-8 text-center">{splitCount}</span>
                <button 
                  onClick={increaseCount}
                  className="w-12 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center text-2xl hover:bg-white/20 transition disabled:opacity-50"
                  disabled={splitCount >= 10}
                >
                  +
                </button>
              </div>
            )}
            {splitMode === "manual" && (
              <div className="h-10 flex items-center justify-center text-sm text-gray-400 font-medium">
                {manualLines.length + 1} piece(s) — Tap canvas to add cuts
              </div>
            )}
          </div>

      </motion.div>
    )}
  </AnimatePresence>
);
};
