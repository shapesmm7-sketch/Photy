import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  Download, 
  Check, 
  Plus, 
  ArrowUpDown, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  Sparkles, 
  RefreshCw, 
  Grid, 
  SlidersHorizontal,
  PlusCircle,
  AlertCircle
} from "lucide-react";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { playRewardedAds, isNative } from "../lib/admob";

interface StitchPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialImageSrc: string | null;
  initialImageSrcs?: string[];
  isPremium?: boolean;
}

export const StitchPhotoModal: React.FC<StitchPhotoModalProps> = ({
  isOpen,
  onClose,
  initialImageSrc,
  initialImageSrcs,
  isPremium = false,
}) => {
  const [images, setImages] = useState<string[]>([]);
  const [direction, setDirection] = useState<"vertical" | "horizontal">("vertical");
  const [gap, setGap] = useState<number>(10);
  const [bgColor, setBgColor] = useState<string>("#ffffff");
  
  // Custom smart auto-stitch states
  const [autoStitchEnabled, setAutoStitchEnabled] = useState<boolean>(true);
  const [equalizeEnabled, setEqualizeEnabled] = useState<boolean>(true);
  
  // Sheet states
  const [showSortSheet, setShowSortSheet] = useState<boolean>(false);
  const [showSettingsSheet, setShowSettingsSheet] = useState<boolean>(false);
  
  const [compiledImageSrc, setCompiledImageSrc] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize with initial state
  useEffect(() => {
    if (isOpen) {
      if (initialImageSrcs && initialImageSrcs.length > 0) {
        setImages(initialImageSrcs);
      } else if (initialImageSrc) {
        setImages([initialImageSrc]);
      } else {
        setImages([]);
      }
      setCompiledImageSrc(null);
      setDirection("vertical");
      setGap(10);
      setAutoStitchEnabled(true);
      setEqualizeEnabled(true);
      setShowSortSheet(false);
      setShowSettingsSheet(false);
    }
  }, [isOpen, initialImageSrc, initialImageSrcs]);

  // Handle auto-stitch edge-trimming of device status bars/navigation bars automatically
  const trimImageMargins = async (imgSrc: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(imgSrc);
          return;
        }

        ctx.drawImage(img, 0, 0);
        
        try {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imgData.data;

          const isMatch = (index: number, r: number, g: number, b: number) => {
            const diff = Math.abs(data[index] - r) + Math.abs(data[index + 1] - g) + Math.abs(data[index + 2] - b);
            return diff < 15; // margin threshold
          };

          // Sample color candidate
          const mR = data[0];
          const mG = data[1];
          const mB = data[2];

          const isSolidBg = (mR > 230 && mG > 230 && mB > 230) || (mR < 40 && mG < 40 && mB < 40);
          if (!isSolidBg) {
            resolve(imgSrc);
            return;
          }

          let topTrim = 0;
          let bottomTrim = 0;

          const topLimit = Math.floor(img.height * 0.15);
          for (let y = 0; y < topLimit; y++) {
            let isSolidRow = true;
            for (let x = 0; x < img.width; x += 10) {
              const idx = (y * img.width + x) * 4;
              if (!isMatch(idx, mR, mG, mB)) {
                isSolidRow = false;
                break;
              }
            }
            if (isSolidRow) {
              topTrim = y;
            } else {
              break;
            }
          }

          const bottomLimit = img.height - Math.floor(img.height * 0.15);
          for (let y = img.height - 1; y > bottomLimit; y--) {
            let isSolidRow = true;
            for (let x = 0; x < img.width; x += 10) {
              const idx = (y * img.width + x) * 4;
              if (!isMatch(idx, mR, mG, mB)) {
                isSolidRow = false;
                break;
              }
            }
            if (isSolidRow) {
              bottomTrim = img.height - y;
            } else {
              break;
            }
          }

          if (topTrim > 5 || bottomTrim > 5) {
            const cropCanvas = document.createElement("canvas");
            cropCanvas.width = img.width;
            cropCanvas.height = img.height - topTrim - bottomTrim;
            const cropCtx = cropCanvas.getContext("2d");
            if (cropCtx) {
              cropCtx.drawImage(
                img, 
                0, topTrim, img.width, img.height - topTrim - bottomTrim, 
                0, 0, img.width, img.height - topTrim - bottomTrim
              );
              resolve(cropCanvas.toDataURL("image/png"));
              return;
            }
          }
        } catch (e) {
          console.warn("Auto-stitch analysis error: ", e);
        }

        resolve(imgSrc);
      };
      img.onerror = () => resolve(imgSrc);
      img.src = imgSrc;
    });
  };

  const compileStitch = async () => {
    // Only compile when indeed we have 2 or more images
    if (images.length < 2) {
      setCompiledImageSrc(null);
      return;
    }
    setIsCompiling(true);

    try {
      const processedSources = await Promise.all(
        images.map(async (src) => {
          if (autoStitchEnabled) {
            return await trimImageMargins(src);
          }
          return src;
        })
      );

      const loadedImages: HTMLImageElement[] = await Promise.all(
        processedSources.map((src, idx) => {
          return new Promise<HTMLImageElement>((res, rej) => {
            const img = new Image();
            img.onload = () => res(img);
            img.onerror = () => rej(new Error(`Failed to load image index ${idx}`));
            img.src = src;
          });
        })
      );

      let outputWidth = 0;
      let outputHeight = 0;

      if (direction === "vertical") {
        if (equalizeEnabled) {
          outputWidth = Math.max(...loadedImages.map((img) => img.width), 1080);
        } else {
          outputWidth = loadedImages[0]?.width || 1080;
        }

        let totalHeight = 0;
        const heights = loadedImages.map((img) => {
          const ratio = equalizeEnabled ? (outputWidth / img.width) : 1;
          return img.height * ratio;
        });

        totalHeight = heights.reduce((sum, h) => sum + h, 0) + (loadedImages.length - 1) * gap;

        const canvas = document.createElement("canvas");
        canvas.width = outputWidth;
        canvas.height = totalHeight;
        const ctx = canvas.getContext("2d");
        
        if (ctx) {
          ctx.fillStyle = bgColor === "transparent" ? "rgba(0,0,0,0)" : bgColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          let currentY = 0;
          loadedImages.forEach((img, i) => {
            const h = heights[i];
            const w = equalizeEnabled ? outputWidth : img.width;
            const xOffset = equalizeEnabled ? 0 : Math.max(0, (outputWidth - w) / 2);
            ctx.drawImage(img, xOffset, currentY, w, h);
            currentY += h + gap;
          });

          setCompiledImageSrc(canvas.toDataURL("image/png", 0.95));
        }
      } else {
        // Horizontal
        if (equalizeEnabled) {
          outputHeight = Math.max(...loadedImages.map((img) => img.height), 1080);
        } else {
          outputHeight = loadedImages[0]?.height || 1080;
        }

        let totalWidth = 0;
        const widths = loadedImages.map((img) => {
          const ratio = equalizeEnabled ? (outputHeight / img.height) : 1;
          return img.width * ratio;
        });

        totalWidth = widths.reduce((sum, w) => sum + w, 0) + (loadedImages.length - 1) * gap;

        const canvas = document.createElement("canvas");
        canvas.width = totalWidth;
        canvas.height = outputHeight;
        const ctx = canvas.getContext("2d");

        if (ctx) {
          ctx.fillStyle = bgColor === "transparent" ? "rgba(0,0,0,0)" : bgColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          let currentX = 0;
          loadedImages.forEach((img, i) => {
            const w = widths[i];
            const h = equalizeEnabled ? outputHeight : img.height;
            const yOffset = equalizeEnabled ? 0 : Math.max(0, (outputHeight - h) / 2);
            ctx.drawImage(img, currentX, yOffset, w, h);
            currentX += w + gap;
          });

          setCompiledImageSrc(canvas.toDataURL("image/png", 0.95));
        }
      }
    } catch (err) {
      console.error("Stitching compilation error: ", err);
    } finally {
      setIsCompiling(false);
    }
  };

  // Compile when properties change
  useEffect(() => {
    if (isOpen && images.length >= 2) {
      compileStitch();
    } else {
      setCompiledImageSrc(null);
    }
  }, [images, direction, gap, bgColor, autoStitchEnabled, equalizeEnabled, isOpen]);

  // Handle uploading files
  const handleAddNewImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const len = files.length;
    let loadedCount = 0;
    const newSrcs: string[] = [];

    for (let i = 0; i < len; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          newSrcs.push(event.target.result as string);
        }
        loadedCount++;
        if (loadedCount === len) {
          setImages((prev) => [...prev, ...newSrcs]);
        }
      };
      reader.readAsDataURL(file);
    }

    e.target.value = ""; // reset
  };

  const moveImage = (index: number, up: boolean) => {
    if (up && index === 0) return;
    if (!up && index === images.length - 1) return;

    const targetIndex = up ? index - 1 : index + 1;
    setImages((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const reverseImages = () => {
    setImages((prev) => [...prev].reverse());
  };

  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const handleSaveStitch = () => {
    if (!compiledImageSrc || images.length < 2 || isSaving) return;
    if (!isPremium) {
      playRewardedAds(handleSaveStitchActual);
    } else {
      handleSaveStitchActual();
    }
  };

  const handleSaveStitchActual = async () => {
    if (!compiledImageSrc || images.length < 2) return;
    setIsSaving(true);
    try {
      const defaultFilename = `stitched_photo_${Date.now()}.png`;

      if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android") {
        try {
          const NativeMedia = registerPlugin<any>("NativeMedia");
          const cleanBase64 = compiledImageSrc.includes(",")
            ? compiledImageSrc.split(",")[1]
            : compiledImageSrc;
          
          await NativeMedia.saveImage({
            base64: cleanBase64,
            filename: defaultFilename,
            mimeType: "image/png"
          });
          alert("Image saved directly to your phone gallery under 'Pictures/Photy'!");
          setIsSaving(false);
          return;
        } catch (nativeErr: any) {
          console.error("Native save failed, trying Web download fallback:", nativeErr);
        }
      }

      const a = document.createElement("a");
      a.href = compiledImageSrc;
      a.download = defaultFilename;
      a.click();
    } catch (e) {
      console.error(e);
      alert("Failed to save stitched image.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed inset-0 z-50 bg-[#121212] flex flex-col items-center select-none"
        >
          {/* Header */}
          <div className="w-full flex items-center justify-between p-4 bg-[#1e1e1e] shrink-0 shadow-md z-10 border-b border-white/5">
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 transition text-white"
            >
              <X className="w-6 h-6" />
            </button>
            <span className="text-white font-bold flex-1 text-center font-sans tracking-wide text-md">
              Stitch Photos
            </span>
            <button
              onClick={handleSaveStitch}
              disabled={images.length < 2 || isSaving || isCompiling}
              className="px-4 py-2 bg-blue-600 disabled:opacity-30 disabled:scale-100 text-white font-bold rounded-full hover:bg-blue-500 transition flex items-center gap-1.5 shadow-md active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>{isSaving ? "Saving..." : "Save"}</span>
            </button>
          </div>

          {/* Main Workspace Preview Canvas */}
          <div className="flex-1 w-full bg-[#0d0d0d] relative overflow-hidden flex flex-col items-center justify-center p-4">
            {images.length < 2 ? (
              <div className="text-center flex flex-col items-center gap-4 text-gray-400 p-8 max-w-sm">
                <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center relative">
                  <Grid className="w-8 h-8 text-blue-400" />
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white font-black text-[9px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#0d0d0d]">
                    {images.length}
                  </span>
                </div>
                <h3 className="text-white font-bold text-lg">Stitch requires 2+ Photos</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  You currently have selected <span className="text-red-400 font-extrabold">{images.length}</span> image. You must choose at least <span className="text-blue-400 font-extrabold">2 photos</span> to join them together.
                </p>
                <div className="w-full flex flex-col gap-2.5 mt-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm transition shadow-md active:scale-95 flex items-center justify-center gap-2"
                  >
                    <PlusCircle className="w-5 h-5" />
                    <span>Choose Photos</span>
                  </button>
                  {images.length > 0 && (
                    <button
                      onClick={() => setShowSortSheet(true)}
                      className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-bold text-xs transition active:scale-95 border border-white/5"
                    >
                      View upload queue
                    </button>
                  )}
                </div>
              </div>
            ) : isCompiling ? (
              <div className="flex flex-col items-center gap-3">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
                <span className="text-xs font-semibold text-gray-400">Rendering high-quality stitch...</span>
              </div>
            ) : compiledImageSrc ? (
              <div className="w-full h-full flex flex-col items-center justify-center relative">
                <div className="max-w-full max-h-[62vh] overflow-auto rounded-xl border border-white/10 shadow-2xl bg-black p-2 scrollbar-none">
                  <img
                    src={compiledImageSrc}
                    alt="Stitched canvas preview"
                    className="object-contain max-h-[58vh] max-w-full rounded-lg"
                  />
                </div>
                
                <div className="absolute top-4 bg-black/75 text-white/90 px-3.5 py-1.5 rounded-full text-[11px] font-bold backdrop-blur-md flex items-center gap-2 border border-white/5 shadow-lg">
                  <span className="capitalize text-blue-400">{direction} Layout</span>
                  <span className="w-1 h-1 rounded-full bg-white/45"></span>
                  <span>{images.length} Items</span>
                  <span className="w-1 h-1 rounded-full bg-white/45"></span>
                  <span>{gap}px spacing</span>
                </div>
              </div>
            ) : null}
          </div>

          {/* Quick-Adjustment Sliding Sheets */}
          <AnimatePresence>
            {showSortSheet && (
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="absolute bottom-[80px] left-0 right-0 max-h-[52dvh] bg-[#1a1a1a] p-4 rounded-t-2xl z-20 overflow-y-auto border-t border-white/10 flex flex-col gap-3.5 shadow-[0_-12px_32px_rgba(0,0,0,0.7)]"
              >
                <div className="flex items-center justify-between border-b border-white/5 pb-2.5 shrink-0">
                  <span className="text-white font-extrabold text-sm flex items-center gap-1.5">
                    <Grid className="w-4 h-4 text-blue-400" />
                    Organize Photo Order ({images.length})
                  </span>
                  <div className="flex items-center gap-2">
                    {images.length >= 2 && (
                      <button
                        onClick={reverseImages}
                        className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-white text-xs font-semibold transition border border-white/5"
                      >
                        Reverse
                      </button>
                    )}
                    <button
                      onClick={() => setShowSortSheet(false)}
                      className="text-gray-400 hover:text-white font-bold text-xs px-2 py-1"
                    >
                      Done
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2 overflow-y-auto pr-1">
                  {images.map((src, i) => (
                    <div 
                      key={i}
                      className="flex items-center gap-3 p-2 rounded-xl bg-[#222] border border-white/5"
                    >
                      <span className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-400 font-black text-[10px] flex items-center justify-center">
                        {i + 1}
                      </span>
                      <img src={src} className="w-11 h-11 object-cover rounded-lg border border-white/5 bg-black" />
                      <span className="text-xs text-white/50 truncate flex-1 font-mono">Photo {i + 1}</span>
                      
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => moveImage(i, true)}
                          disabled={i === 0}
                          className="p-1.5 text-gray-400 hover:text-white disabled:opacity-20 transition"
                        >
                          <ChevronUp className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => moveImage(i, false)}
                          disabled={i === images.length - 1}
                          className="p-1.5 text-gray-400 hover:text-white disabled:opacity-20 transition"
                        >
                          <ChevronDown className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => removeImage(i)}
                          className="p-2 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition ml-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {images.length === 0 && (
                    <div className="text-center text-xs text-gray-500 py-8">
                      No photos added.
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {showSettingsSheet && (
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="absolute bottom-[80px] left-0 right-0 bg-[#1a1a1a] p-5 rounded-t-2xl z-20 border-t border-white/10 flex flex-col gap-4 shadow-[0_-12px_32px_rgba(0,0,0,0.7)] text-white"
              >
                <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                  <span className="font-bold text-sm flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-blue-400" />
                    Gap & Background Canvas
                  </span>
                  <button 
                    onClick={() => setShowSettingsSheet(false)}
                    className="text-gray-400 hover:text-white text-xs font-semibold px-2 py-1"
                  >
                    Done
                  </button>
                </div>

                {/* Gap Spacing Slider */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>Spacing Gap</span>
                    <span className="font-mono text-blue-400 font-bold">{gap}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="2"
                    value={gap}
                    onChange={(e) => setGap(parseInt(e.target.value))}
                    className="w-full accent-blue-500 cursor-pointer h-1.5 bg-white/10 rounded-lg outline-none"
                  />
                  <div className="flex justify-between text-[10px] text-gray-600 font-mono">
                    <span>Seamless 0px</span>
                    <span>Standard</span>
                    <span>100px</span>
                  </div>
                </div>

                {/* Background Colors */}
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <span className="text-xs text-gray-400">Background Color</span>
                  <div className="flex items-center gap-2">
                    {[
                      { value: "#ffffff", label: "White" },
                      { value: "#000000", label: "Black" },
                      { value: "transparent", label: "Transparent" }
                    ].map((col) => (
                      <button
                        key={col.value}
                        onClick={() => setBgColor(col.value)}
                        className={`px-3 py-1 text-[11px] font-bold rounded-lg transition border ${
                          bgColor === col.value 
                            ? "bg-blue-500/20 text-blue-450 border-blue-500/60" 
                            : "bg-white/5 text-gray-400 border-transparent hover:bg-white/10"
                        }`}
                      >
                        {col.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Auto stretches of sizing widths */}
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-gray-300">Uniform Width / Height Alignment</span>
                    <span className="text-[10px] text-gray-500">Scales all elements to match output standard widths</span>
                  </div>
                  <button
                    onClick={() => setEqualizeEnabled(!equalizeEnabled)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${
                      equalizeEnabled 
                        ? "bg-blue-600 text-white border-blue-500" 
                        : "bg-white/5 text-gray-400 border-white/10"
                    }`}
                  >
                    {equalizeEnabled ? "Enabled" : "Disabled"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom Navigation Toolbar matches layout perfectly */}
          <div className="w-full bg-[#161616] pt-4 pb-8 px-4 flex flex-col gap-4 shadow-[0_-4px_22px_rgba(0,0,0,0.6)] z-10 border-t border-white/5 shrink-0">
            <div className="flex items-center justify-around w-full max-w-md mx-auto">
              
              {/* Magic Wand Auto Stitch */}
              <button 
                onClick={() => {
                  setAutoStitchEnabled(!autoStitchEnabled);
                }}
                className={`flex flex-col items-center gap-1.5 transition-all ${
                  autoStitchEnabled ? "text-blue-400 scale-105" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                <div className="relative">
                  <Sparkles className="w-6 h-6" />
                  {autoStitchEnabled && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                  )}
                </div>
                <span className="text-[11px] font-bold">Auto Stitch</span>
              </button>

              {/* Direction Toggle */}
              <button 
                onClick={() => {
                  setDirection((prev) => (prev === "vertical" ? "horizontal" : "vertical"));
                }}
                className="flex flex-col items-center gap-1.5 text-gray-500 hover:text-gray-300 transition-all"
              >
                <ArrowUpDown className={`w-6 h-6 transition-transform duration-300 ${direction === "horizontal" ? "rotate-90 text-indigo-400" : "text-blue-400"}`} />
                <span className="text-[11px] font-bold">Direction</span>
              </button>

              {/* Sort / Reorder Overlay Trigger */}
              <button 
                onClick={() => {
                  setShowSortSheet(!showSortSheet);
                  setShowSettingsSheet(false);
                }}
                className={`flex flex-col items-center gap-1.5 transition-all ${
                  showSortSheet ? "text-blue-400" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                <div className="grid grid-cols-1 gap-[3px] w-5 h-5 py-1 items-center">
                  <div className="h-0.5 bg-current rounded-full" />
                  <div className="h-0.5 bg-current rounded-full" />
                  <div className="h-0.5 bg-current rounded-full" />
                </div>
                <span className="text-[11px] font-bold">Sort</span>
              </button>

              {/* Fine tuning settings (gaps, sliders) */}
              <button 
                onClick={() => {
                  setShowSettingsSheet(!showSettingsSheet);
                  setShowSortSheet(false);
                }}
                className={`flex flex-col items-center gap-1.5 transition-all ${
                  showSettingsSheet ? "text-blue-400" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                <SlidersHorizontal className="w-6 h-6" />
                <span className="text-[11px] font-bold">Gap & BG</span>
              </button>

              {/* Add files */}
              <button 
                onClick={() => {
                  fileInputRef.current?.click();
                  setShowSortSheet(false);
                  setShowSettingsSheet(false);
                }}
                className="flex flex-col items-center gap-1.5 text-green-400 hover:text-green-300 transition-all active:scale-95"
              >
                <Plus className="w-6 h-6 bg-green-500/10 rounded-full p-[2px]" />
                <span className="text-[11px] font-bold">Add</span>
              </button>
            </div>
          </div>

          {/* Hidden multi-file selector input */}
          <input
            type="file"
            accept="image/png, image/jpeg"
            multiple
            className="hidden"
            ref={fileInputRef}
            onChange={handleAddNewImages}
          />

        </motion.div>
      )}
    </AnimatePresence>
  );
};
