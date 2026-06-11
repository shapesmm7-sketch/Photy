import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Image as ImageIcon, FileText, Download, Check } from "lucide-react";
import jsPDF from "jspdf";
import { Capacitor, registerPlugin } from "@capacitor/core";

import { isNative, playRewardedAds } from "../lib/admob";

interface ConverterModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageData: string | null;
  isDarkMode: boolean;
  isPremium?: boolean;
}

type Format = "jpg" | "png" | "webp" | "avif" | "gif" | "pdf";

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

  const formats: { id: Format; label: string; mime: string; color: string }[] =
    [
      { id: "png", label: "PNG", mime: "image/png", color: "bg-blue-500" },
      { id: "jpg", label: "JPG", mime: "image/jpeg", color: "bg-orange-500" },
      {
        id: "webp",
        label: "WebP",
        mime: "image/webp",
        color: "bg-emerald-500",
      },
      { id: "avif", label: "AVIF", mime: "image/avif", color: "bg-indigo-500" },
      { id: "gif", label: "GIF", mime: "image/gif", color: "bg-purple-500" },
      { id: "pdf", label: "PDF", mime: "application/pdf", color: "bg-red-500" },
    ];

  const performConvert = async () => {
    setIsConverting(true);

    try {
      if (selectedFormat === "pdf") {
        const img = new Image();
        img.src = imageData!;
        await new Promise((resolve) => (img.onload = resolve));

        const pdf = new jsPDF({
          orientation: img.width > img.height ? "landscape" : "portrait",
          unit: "px",
          format: [img.width, img.height],
        });

        pdf.addImage(imageData!, "PNG", 0, 0, img.width, img.height);

        if (Capacitor.isNativePlatform()) {
          const NativeMedia = registerPlugin<any>("NativeMedia");
          const pdfDataUri = pdf.output("datauristring");
          const cleanBase64 = pdfDataUri.includes(",") ? pdfDataUri.split(",")[1] : pdfDataUri;
          await NativeMedia.savePdf({ base64: cleanBase64, filename: "converted_" + Date.now() + ".pdf" });
        } else {
          pdf.save("converted_image.pdf");
        }
      } else {
        // Try Client-side first for speed
        const img = new Image();
        img.src = imageData!;
        await new Promise((resolve) => (img.onload = resolve));

        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");

        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const mimeType =
            formats.find((f) => f.id === selectedFormat)?.mime || "image/png";
          const quality =
            selectedFormat === "jpg" ||
            selectedFormat === "webp" ||
            selectedFormat === "avif"
              ? 0.9
              : undefined;

          const dataUrl = canvas.toDataURL(mimeType, quality);

          if (Capacitor.isNativePlatform()) {
            try {
              const NativeMedia = registerPlugin<any>("NativeMedia");
              const cleanBase64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
              await NativeMedia.saveImage({ base64: cleanBase64 });
              setConvertSuccess(true);
              setTimeout(() => setConvertSuccess(false), 2000);
              return;
            } catch (nativeErr) {
              console.error("Native save failed", nativeErr);
              alert("Native Save Failed: " + (nativeErr as Error).message);
            }
          }

          // If the browser successfully created the requested format (native support)
          if (dataUrl.startsWith(`data:${mimeType}`)) {
            const link = document.createElement("a");
            link.href = dataUrl;
            link.download = `converted_image.${selectedFormat}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          } else {
            // Fallback to server for advanced formats (AVIF/GIF) or unsupported browsers
            const response = await fetch("/api/convert", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                base64: imageData,
                format: selectedFormat,
                quality: 90,
              }),
            });

            if (!response.ok) {
              const err = await response.json();
              throw new Error(err.error || "Conversion failed");
            }

            const result = await response.json();

            const link = document.createElement("a");
            link.href = result.base64;
            link.download = `converted_image.${selectedFormat}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        }
      }

      setConvertSuccess(true);
      setTimeout(() => setConvertSuccess(false), 2000);
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
    if (!imageData) return;
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
          className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4"
          style={{
            paddingTop:
              !isPremium && isNative
                ? "calc(env(safe-area-inset-top) + 60px)"
                : undefined,
          }}
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
            className={`relative w-full max-w-md rounded-[28px] overflow-hidden shadow-2xl flex flex-col max-h-[92vh] ${
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

            <div className="overflow-y-auto flex-1 custom-scrollbar flex flex-col">
              {/* Header - Extremely Compact for Mobile */}
              <div className="bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 px-6 py-4 sm:py-5 text-center relative overflow-hidden shrink-0">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
                <ImageIcon className="w-8 h-8 sm:w-10 sm:h-10 text-white drop-shadow-lg mx-auto mb-1.5" />
                <h2 className="text-lg sm:text-xl font-black text-white drop-shadow-md">
                  Image Converter
                </h2>
                <p className="text-white/80 font-medium text-[9px] sm:text-[10px] px-2 mt-0.5">
                  Convert images to PDF, JPG, PNG and more. High-speed
                  multi-format transformation.
                </p>
              </div>

              <div className="p-4 sm:p-6 flex flex-col flex-1 min-h-0 space-y-4 sm:space-y-6">
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
                <div className="space-y-1.5 flex-1 min-h-[80px] sm:min-h-[120px] max-h-[180px] flex flex-col">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 pl-1">
                    Preview
                  </label>
                  <div
                    className={`w-full flex-1 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden bg-slate-100/10 ${
                      isDarkMode ? "border-slate-700" : "border-slate-200"
                    }`}
                  >
                    {imageData ? (
                      <img
                        src={imageData}
                        alt="Preview"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-slate-400 opacity-30" />
                    )}
                  </div>
                </div>

                {/* Action Button - Normal flow avoids covering inputs on mobile */}
                <div className="pt-2 mt-auto">
                  <button
                    onClick={handleConvert}
                    disabled={isConverting || !imageData}
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
