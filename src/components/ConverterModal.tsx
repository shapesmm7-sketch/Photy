import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Image as ImageIcon, FileText, Download, Check, Plus, Upload } from "lucide-react";
import { Capacitor, registerPlugin } from "@capacitor/core";

import { isNative, playRewardedAds } from "../lib/admob";
import { stitchImages } from "../lib/stitchImages";
import { convertPhotoToPdf, PDFExportOptions } from "../lib/pdfGenerator";

interface ConverterModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageData: string | null;
  isDarkMode: boolean;
  isPremium?: boolean;
}

type Format = "jpg" | "png" | "webp" | "pdf";

export const ConverterModal: React.FC<ConverterModalProps> = ({
  isOpen,
  onClose,
  imageData,
  isDarkMode,
  isPremium = false,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<Format>("png");
  const [isConverting, setIsConverting] = useState(false);
  const [convertSuccess, setConvertSuccess] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && imageData) {
      setImages([imageData]);
    } else if (!isOpen) {
      setImages([]);
    }
  }, [isOpen, imageData]);

  const handleImageLoad = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setImages((prev) => [...prev, e.target!.result as string]);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleImagesLoad = (files: FileList) => {
    const promises = Array.from(files).map((file) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            resolve(e.target.result as string);
          } else {
            resolve("");
          }
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(promises).then((results) => {
      const filteredResults = results.filter(r => r !== "");
      setImages((prev) => [...prev, ...filteredResults]);
    });
  };

  const removePage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const availableFormats = [
    { id: "png", label: "PNG", mime: "image/png", color: "bg-blue-500" },
    { id: "jpg", label: "JPG", mime: "image/jpeg", color: "bg-orange-500" },
    { id: "webp", label: "WebP", mime: "image/webp", color: "bg-emerald-500" },
    { id: "pdf", label: "PDF", mime: "application/pdf", color: "bg-red-500" },
  ];

  const formats = availableFormats as { id: Format; label: string; mime: string; color: string }[];

  const performConvert = async () => {
    if (images.length === 0) return;
    setIsConverting(true);

    try {
      if (selectedFormat === "pdf") {
        const options: PDFExportOptions = {
          pageSize: "A4",
          orientation: "portrait",
          margin: "normal",
        };
        await convertPhotoToPdf(images, options, `converted_${Date.now()}.pdf`);
        setConvertSuccess(true);
        setTimeout(() => setConvertSuccess(false), 2000);
      } else {
        // Image format processing
        let finalImageSrc = images[0];
        if (images.length > 1) {
          finalImageSrc = await stitchImages(images);
        }

        const img = new Image();
        img.src = finalImageSrc;
        await new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve; // Continue on error to avoid hanging
        });

        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");

        if (ctx) {
          if (selectedFormat === "jpg") {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, img.width, img.height);
          }
          ctx.drawImage(img, 0, 0);
          const mimeType =
            formats.find((f) => f.id === selectedFormat)?.mime || "image/png";
          const quality =
            selectedFormat === "jpg" ||
            selectedFormat === "webp"
              ? 1.0
              : undefined;

          const dataUrl = canvas.toDataURL(mimeType, quality);
          let finalBase64 = dataUrl;

          // Fallback to native processing for complex formats on mobile
          if (!dataUrl.startsWith(`data:${mimeType}`)) {
            if (Capacitor.isNativePlatform()) {
              const NativeMedia = registerPlugin<any>("NativeMedia");
              try {
                const response = await NativeMedia.convertImage({
                  base64: dataUrl,
                  format: selectedFormat
                });
                finalBase64 = response.base64;
              } catch (nativeErr) {
                console.error("Native conversion failed", nativeErr);
                throw new Error("Native Conversion Failed: " + (nativeErr as Error).message);
              }
            } else {
              throw new Error("Format conversion not supported in web version. Please use the mobile app.");
            }
          }

          if (Capacitor.isNativePlatform()) {
            try {
              const NativeMedia = registerPlugin<any>("NativeMedia");
              const cleanBase64 = finalBase64.includes(",") ? finalBase64.split(",")[1] : finalBase64;
              await NativeMedia.saveImage({ base64: cleanBase64, filename: "converted_" + Date.now() + "." + selectedFormat, mimeType: mimeType });
              setConvertSuccess(true);
              setTimeout(() => setConvertSuccess(false), 2000);
              return;
            } catch (nativeErr) {
              console.error("Native save failed", nativeErr);
              alert("Native Save Failed: " + (nativeErr as Error).message);
            }
          } else {
            const link = document.createElement("a");
            link.href = finalBase64;
            link.download = `converted_image.${selectedFormat}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        }

        setConvertSuccess(true);
        setTimeout(() => setConvertSuccess(false), 2000);
      }
    } catch (error) {
      console.error("Conversion failed:", error);
      alert(
        `Conversion failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsConverting(false);
    }
  };

  const handleConvert = () => {
    if (images.length === 0) return;
    if (!isPremium) {
      playRewardedAds(performConvert);
    } else {
      performConvert();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className={`fixed inset-0 z-[100] flex justify-center p-2 sm:p-4 overflow-y-auto ${!isPremium && isNative ? "items-start pt-[calc(env(safe-area-inset-top)+115px)] pb-10" : "items-center"}`}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className={`relative w-full max-w-md rounded-[28px] overflow-hidden shadow-2xl flex flex-col my-auto ${
              isDarkMode
                ? "bg-slate-900 border border-slate-700 text-white"
                : "bg-white text-slate-800"
            }`}
          >
            <button
              onClick={onClose}
              className="absolute top-3 right-3 z-[25] p-1.5 rounded-full bg-black/10 hover:bg-black/20 text-current transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="overflow-y-auto flex-1 custom-scrollbar flex flex-col relative w-full">
              {/* Header - Extremely Compact for Mobile */}
              <div className="bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 px-6 py-4 sm:py-5 text-center relative overflow-hidden shrink-0">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
                <ImageIcon className="w-8 h-8 sm:w-10 sm:h-10 text-white drop-shadow-lg mx-auto mb-1.5" />
                <h2 className="text-lg sm:text-xl font-black text-white drop-shadow-md">
                  Image Converter
                </h2>
                <p className="text-white/80 font-medium text-[9px] sm:text-[10px] px-2 mt-0.5">
                  Convert images to PDF, JPG, PNG and more. High-speed
                  multi-format transformation. Combine multiple images easily.
                </p>
              </div>

              <div className="p-4 flex flex-col flex-1 min-h-0 space-y-4">
                {/* Format Selection Grid */}
                <div className="space-y-2.5">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 pl-1">
                    Target Format
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {formats.map((format) => (
                      <button
                        key={format.id}
                        onClick={() => setSelectedFormat(format.id)}
                        className={`relative group flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all active:scale-[0.95] cursor-pointer ${
                          selectedFormat === format.id
                            ? "border-emerald-500 bg-emerald-50/10"
                            : isDarkMode
                              ? "border-slate-800 bg-slate-800/50 hover:border-slate-700"
                              : "border-slate-100 bg-slate-50 hover:border-slate-200"
                        }`}
                      >
                        <div
                          className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg ${format.color} flex items-center justify-center mb-1 shadow-sm`}
                        >
                          {format.id === "pdf" ? (
                            <FileText className="w-3 sm:w-3.5 text-white" />
                          ) : (
                            <ImageIcon className="w-3 sm:w-3.5 text-white" />
                          )}
                        </div>
                        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-tight">
                          {format.label}
                        </span>
                        {selectedFormat === format.id && (
                          <div className="absolute top-1 right-1">
                            <Check className="w-2.5 h-2.5 text-emerald-500" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview Area - Flexible height to preserve space for buttons */}
                <div className="space-y-1.5 flex-1 min-h-[140px] flex flex-col w-full">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 pl-1">
                    Images ({images.length})
                  </label>
                  <div className="w-full flex-1 overflow-x-auto flex gap-3 pb-2 custom-scrollbar items-center">
                    {images.map((img, idx) => (
                      <div key={idx} className="relative flex-shrink-0 w-28 h-36 rounded-xl border-2 border-slate-200 flex items-center justify-center overflow-hidden bg-slate-100/50 group">
                        <img
                          src={img}
                          alt={`Preview ${idx + 1}`}
                          className="w-full h-full object-contain"
                        />
                        <button onClick={() => removePage(idx)} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    
                    <button 
                      onClick={() => uploadInputRef.current?.click()}
                      className={`relative flex-shrink-0 w-28 h-36 rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer ${
                        isDarkMode ? "border-slate-700 bg-slate-800/50 hover:bg-slate-800" : "border-slate-300 bg-slate-50 hover:bg-slate-100"
                      }`}
                    >
                      <Plus className="w-6 h-6 text-slate-400 mb-1" />
                      <span className="text-[10px] font-bold text-slate-500">Add Image</span>
                    </button>
                    <input 
                      type="file" 
                      accept="image/png, image/jpeg, image/jpg, image/webp" 
                      multiple
                      className="hidden" 
                      ref={uploadInputRef}
                      onChange={(e) => { if (e.target.files && e.target.files.length > 0) handleImagesLoad(e.target.files); e.target.value = ""; }} 
                    />
                  </div>
                </div>

                {/* Action Button - Normal flow avoids covering inputs on mobile */}
                <div className="pt-2 mt-auto">
                  <button
                    onClick={handleConvert}
                    disabled={isConverting || images.length === 0}
                    className={`w-full py-3.5 sm:py-4 rounded-xl flex items-center justify-center gap-2.5 font-black text-xs sm:text-sm uppercase tracking-widest shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 ${
                      convertSuccess
                        ? "bg-emerald-500 text-white shadow-emerald-500/20"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                    }`}
                  >
                    {isConverting ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : convertSuccess ? (
                      <>
                        <Check className="w-4 h-4" />
                        Saved to Downloads folder!
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Convert & Save
                      </>
                    )}
                  </button>
                  <p className="text-[8px] text-center text-slate-400 mt-2 font-medium opacity-50 uppercase tracking-tighter">
                    Native browser encoding enabled for maximum speed
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

