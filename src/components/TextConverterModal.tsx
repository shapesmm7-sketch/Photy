import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Type,
  Download,
  Check,
  Palette,
  Type as FontIcon,
  Layout,
  ChevronDown,
  Share2,
} from "lucide-react";
import jsPDF from "jspdf";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { Share } from "@capacitor/share";

import { isNative } from "../lib/isNative";
import { admobManager } from "../lib/admob";

interface TextConverterModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  isPremium?: boolean;
}

type Format = "jpg" | "png" | "webp" | "pdf";

const FONTS = [
  { name: "Inter", family: '"Inter", sans-serif' },
  { name: "Space Grotesk", family: '"Space Grotesk", sans-serif' },
  { name: "Outfit", family: '"Outfit", sans-serif' },
  { name: "Playfair", family: '"Playfair Display", serif' },
  { name: "JetBrains Mono", family: '"JetBrains Mono", monospace' },
  { name: "Bebas Neue", family: '"Bebas Neue", sans-serif' },
];

const COLORS = [
  "#000000",
  "#ffffff",
  "#ef4444", // red-500
  "#f97316", // orange-500
  "#f59e0b", // amber-500
  "#10b981", // emerald-500
  "#3b82f6", // blue-500
  "#6366f1", // indigo-500
  "#a855f7", // purple-500
  "#ec4899", // pink-500
  // Muted / dark / less shining colors
  "#f8fafc", // slate-50
  "#94a3b8", // slate-400
  "#475569", // slate-600
  "#1e293b", // slate-800
  "#0f172a", // slate-900
  "#7f1d1d", // red-900
  "#7c2d12", // orange-900
  "#064e3b", // emerald-900
  "#1e3a8a", // blue-900
  "#312e81", // indigo-900
  "#581c87", // purple-900
  "#831843", // pink-900
  "#fafaf9", // stone-50
  "#a8a29e", // stone-400
  "#57534e", // stone-600
  "#1c1917", // stone-900
];

export const TextConverterModal: React.FC<TextConverterModalProps> = ({
  isOpen,
  onClose,
  isDarkMode,
  isPremium = false,
}) => {
  const [text, setText] = useState("Design Your Text");
  const [selectedFont, setSelectedFont] = useState(FONTS[0]);
  const [textColor, setTextColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [shadowColor, setShadowColor] = useState("transparent");
  const [strokeColor, setStrokeColor] = useState("transparent");
  const [selectedFormat, setSelectedFormat] = useState<Format>("png");
  const [isConverting, setIsConverting] = useState(false);
  const [convertSuccess, setConvertSuccess] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [activeSection, setActiveSection] = useState<
    "font" | "colors" | "format" | null
  >(null);

  const availableFormats = [
    { id: "png", label: "PNG", mime: "image/png", color: "bg-blue-500" },
    { id: "jpg", label: "JPG", mime: "image/jpeg", color: "bg-orange-500" },
    { id: "webp", label: "WebP", mime: "image/webp", color: "bg-emerald-500" },
    { id: "pdf", label: "PDF", mime: "application/pdf", color: "bg-red-500" },
  ];

  const formats = availableFormats as { id: Format; label: string; mime: string; color: string }[];

  const toggleSection = (section: "font" | "colors" | "format") => {
    setActiveSection(activeSection === section ? null : section);
  };

  const generateImageData = (): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    // Create a temporary canvas for measurement to avoid flashing
    const measureCanvas = document.createElement("canvas");
    const mCtx = measureCanvas.getContext("2d");
    if (!mCtx) return null;

    const pixelRatio = window.devicePixelRatio || 1;
    // Match physical device width so native gallery apps recognize it as a long screenshot and allow vertical scrolling without fitting to height
    const rawWidth = window.screen?.width ? window.screen.width * pixelRatio : window.innerWidth * pixelRatio;
    
    // Snap to exact common physical screen widths to trigger Android "screenshot" viewer mode
    const commonWidths = [720, 1080, 1170, 1179, 1242, 1284, 1290, 1440, 1644];
    let snappedWidth = Math.round(rawWidth);
    for (const cw of commonWidths) {
      if (Math.abs(rawWidth - cw) <= 15) {
        snappedWidth = cw;
        break;
      }
    }
    
    // Ensure we don't end up with an unreadably small canvas on desktop previews
    const canvasWidth = Math.max(1080, snappedWidth);
    
    // Match the text editor's exact proportional text size and padding
    // Editor uses text-sm (14px) and px-4 (16px) on mobile viewports (~390px)
    const vw = ("innerWidth" in window && window.innerWidth > 0 && window.innerWidth < 800) ? window.innerWidth : 390;
    const fontSizeRatio = 15 / vw; // Slightly bumped for better readability
    const paddingRatio = 16 / vw;  // Exactly px-4 proportion
    
    const baseSize = Math.max(40, Math.floor(canvasWidth * fontSizeRatio));
    const padding = Math.floor(canvasWidth * paddingRatio);
    const maxWidth = canvasWidth - padding * 2;

    mCtx.font = `500 ${baseSize}px ${selectedFont.family}`;

    const paragraphs = text.split("\n");
    const lines: string[] = [];

    paragraphs.forEach((para) => {
      if (para.trim() === "") {
        lines.push(""); // Paragraph break
        return;
      }
      const words = para.split(/\s+/);
      let currentLine = words[0];
      for (let i = 1; i < words.length; i++) {
        const testLine = currentLine + " " + words[i];
        if (mCtx.measureText(testLine).width > maxWidth) {
          lines.push(currentLine);
          currentLine = words[i];
        } else {
          currentLine = testLine;
        }
      }
      lines.push(currentLine);
    });

    const lineHeight = baseSize * 1.4;
    const totalContentHeight = lines.length * lineHeight;
    let finalHeight = Math.max(630, totalContentHeight + padding * 2);
    let renderWidth = canvasWidth;

    const MAX_CANVAS_HEIGHT = 16384;
    let renderScale = 1;
    if (finalHeight > MAX_CANVAS_HEIGHT) {
      renderScale = MAX_CANVAS_HEIGHT / finalHeight;
      finalHeight = MAX_CANVAS_HEIGHT;
      renderWidth = Math.floor(renderWidth * renderScale);
    }

    canvas.width = renderWidth;
    canvas.height = finalHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    if (renderScale !== 1) {
      ctx.scale(renderScale, renderScale);
    }

    // Draw Background
    ctx.fillStyle = bgColor;
    // Use original unscaled virtual coordinates since ctx is scaled
    const virtualWidth = canvas.width / renderScale;
    const virtualHeight = canvas.height / renderScale;
    ctx.fillRect(0, 0, virtualWidth, virtualHeight);

    // Draw Text
    ctx.font = `500 ${baseSize}px ${selectedFont.family}`;
    ctx.fillStyle = textColor;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    // Set Stroke
    if (strokeColor !== "transparent") {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 4; // Increased for visibility on high-res canvas
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
    }

    // Set Shadow
    if (shadowColor !== "transparent") {
      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = 15;
      ctx.shadowOffsetX = 5;
      ctx.shadowOffsetY = 5;
    } else {
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
    }

    // Center the block vertically but align horizontally to the left padding
    let startY = (canvas.height - totalContentHeight) / 2;

    lines.forEach((line) => {
      if (line !== "") {
        if (strokeColor !== "transparent") {
          ctx.strokeText(line, padding, startY);
        }
        ctx.fillText(line, padding, startY);
      }
      startY += lineHeight;
    });

    return canvas.toDataURL("image/png");
  };

  const handleShare = async () => {
    setIsConverting(true);
    try {
      const imageData = generateImageData();
      if (!imageData) return;

      if (Capacitor.isNativePlatform()) {
        try {
          const NativeMedia = registerPlugin<any>("NativeMedia");
          const cleanBase64 = imageData.includes(",") ? imageData.split(",")[1] : imageData;
          await NativeMedia.shareImage({ base64: cleanBase64 });
          return;
        } catch (nativeErr) {
          console.error("Native share failed, falling back:", nativeErr);
        }
      }

      const blob = await (await fetch(imageData)).blob();
      const file = new File(
        [blob],
        `text_design.${selectedFormat === "pdf" ? "png" : selectedFormat}`,
        { type: blob.type },
      );

      if (
        navigator.share &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          files: [file],
          title: "My Text Design",
          text: "Check out this design I created!",
        });
      } else if (navigator.share) {
        await navigator.share({
          title: "My Text Design",
          text: "Check out this design I created!\n\n" + text,
        });
      } else {
        throw new Error("Sharing not supported on this device/browser");
      }
    } catch (e: any) {
      console.error(e);
      if (e.name !== "AbortError") {
        alert("Sharing failed: " + e.message);
      }
    } finally {
      setIsConverting(false);
    }
  };

  const performSave = async () => {
    setIsConverting(true);
    try {
      if (selectedFormat === "pdf") {
        const canvas = document.createElement("canvas");
        canvas.width = 1200;
        canvas.height = 1600;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "px",
          format: [1200, 1600],
        });

        const fontSize = 42;
        const lineHeight = fontSize * 1.5;
        const margin = 100;
        const maxWidth = canvas.width - margin * 2;
        const maxHeight = canvas.height - margin * 2;

        const drawPageBackground = () => {
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          // Redraw font settings after clear
          ctx.font = `500 ${fontSize}px ${selectedFont.family}`;
          ctx.fillStyle = textColor;
          if (strokeColor !== "transparent") {
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 4; // Increased for visibility
            ctx.lineJoin = "round";
            ctx.lineCap = "round";
          }
          ctx.textAlign = "left";
          ctx.textBaseline = "top";
        };

        const addPageToPdf = () => {
          pdf.addImage(
            canvas.toDataURL("image/jpeg", 0.9),
            "JPEG",
            0,
            0,
            1200,
            1600,
          );
        };

        drawPageBackground();
        let cursorY = margin;

        const paragraphs = text.split("\n");
        paragraphs.forEach((para, pIdx) => {
          if (para.trim() === "") {
            cursorY += lineHeight;
            // Handle page break on empty line
            if (cursorY > maxHeight) {
              addPageToPdf();
              pdf.addPage();
              drawPageBackground();
              cursorY = margin;
            }
            return;
          }

          const words = para.split(/\s+/);
          let currentLine = words[0];

          for (let i = 1; i < words.length; i++) {
            const testLine = currentLine + " " + words[i];
            if (ctx.measureText(testLine).width > maxWidth) {
              if (strokeColor !== "transparent") {
                ctx.strokeText(currentLine, margin, cursorY);
              }
              ctx.fillText(currentLine, margin, cursorY);
              cursorY += lineHeight;

              if (cursorY > maxHeight) {
                addPageToPdf();
                pdf.addPage();
                drawPageBackground();
                cursorY = margin;
              }
              currentLine = words[i];
            } else {
              currentLine = testLine;
            }
          }

          // Last line of paragraph
          if (strokeColor !== "transparent") {
            ctx.strokeText(currentLine, margin, cursorY);
          }
          ctx.fillText(currentLine, margin, cursorY);
          cursorY += lineHeight * 1.5; // Paragraph spacing

          if (cursorY > maxHeight && pIdx < paragraphs.length - 1) {
            addPageToPdf();
            pdf.addPage();
            drawPageBackground();
            cursorY = margin;
          }
        });

        addPageToPdf();

        if (Capacitor.isNativePlatform()) {
          const NativeMedia = registerPlugin<any>("NativeMedia");
          const pdfDataUri = pdf.output("datauristring");
          const cleanBase64 = pdfDataUri.includes(",") ? pdfDataUri.split(",")[1] : pdfDataUri;
          await NativeMedia.savePdf({ base64: cleanBase64, filename: "text_document_" + Date.now() + ".pdf" });
        } else {
          pdf.save("text_document.pdf");
        }
      } else {
        const imageData = generateImageData();
        if (!imageData) return;

        const mimeType =
          formats.find((f) => f.id === selectedFormat)?.mime || "image/png";
        const canvas = canvasRef.current;
        if (!canvas) return;

        const dataUrl = canvas.toDataURL(mimeType, 0.9);
        let finalBase64 = dataUrl;

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
            await NativeMedia.saveImage({ base64: cleanBase64, filename: "text_image_" + Date.now() + "." + selectedFormat, mimeType: mimeType });
            setConvertSuccess(true);
            setTimeout(() => setConvertSuccess(false), 2000);
            return;
          } catch (nativeErr) {
            console.error("Native save failed, falling back:", nativeErr);
            alert("Native Save Failed: " + (nativeErr as Error).message);
          }
        }

        const link = document.createElement("a");
        link.href = finalBase64;
        link.download = `text_design.${selectedFormat}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      setConvertSuccess(true);
      setTimeout(() => setConvertSuccess(false), 2000);
    } catch (e: any) {
      console.error(e);
      alert("Save failed: " + e.message);
    } finally {
      setIsConverting(false);
    }
  };

  const handleSave = () => {
    admobManager.showInterstitialBeforeAction(() => {
      performSave();
    });
  };

  const handleShareWithAd = () => {
    admobManager.showInterstitialBeforeAction(() => {
      handleShare();
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className={`fixed inset-0 z-[100] flex justify-center p-2 sm:p-4 overflow-y-auto`}
          style={{ paddingBottom: (!isPremium) ? 'calc(env(safe-area-inset-bottom) + 56px)' : undefined }}
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

            <div className="overflow-y-auto flex-1 custom-scrollbar flex flex-col">
              <div className="bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-600 px-6 py-4 sm:py-5 text-center relative overflow-hidden shrink-0">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
                <Type className="w-8 h-8 sm:w-10 sm:h-10 text-white drop-shadow-lg mx-auto mb-1.5" />
                <h2 className="text-lg sm:text-xl font-black text-white drop-shadow-md uppercase tracking-tighter">
                  Text Graphics
                </h2>
                <p className="text-white/80 font-medium text-[9px] sm:text-[10px] px-2 mt-0.5">
                  Convert any text into PDF, PNG, JPG and more. Design and
                  export high-quality text assets instantly.
                </p>
              </div>

              <div className="p-4 sm:p-6 flex flex-col gap-3">
                {/* Input Text */}
                <div className="space-y-1.5 mb-2">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 pl-1">
                    Enter Your Content (Supports Paragraphs)
                  </label>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Type or paste your text here..."
                    rows={4}
                    className={`w-full px-4 py-3 rounded-xl border-2 font-medium text-sm transition-all focus:outline-none focus:border-purple-500 custom-scrollbar resize-none ${
                      isDarkMode
                        ? "bg-slate-800 border-slate-700 text-white"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  />
                </div>

                {/* Fonts Section */}
                <div
                  className={`rounded-2xl border-2 transition-all ${activeSection === "font" ? "border-purple-500/30" : "border-transparent"}`}
                >
                  <button
                    onClick={() => toggleSection("font")}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
                      isDarkMode
                        ? "bg-slate-800/50 hover:bg-slate-800"
                        : "bg-slate-50 hover:bg-slate-100"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      <FontIcon className="w-3.5 h-3.5" /> Typography & Style
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-purple-500 uppercase">
                        {selectedFont.name}
                      </span>
                      <span
                        className={`text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest hidden sm:inline-block ${
                          isDarkMode
                            ? "bg-slate-700 text-slate-300"
                            : "bg-slate-200 text-slate-500"
                        }`}
                      >
                        {activeSection === "font" ? "Close" : "Expand"}
                      </span>
                      <motion.div
                        animate={{ rotate: activeSection === "font" ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      </motion.div>
                    </div>
                  </button>

                  <AnimatePresence>
                    {activeSection === "font" && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-3 grid grid-cols-2 gap-2">
                          {FONTS.map((font) => (
                            <button
                              key={font.name}
                              onClick={() => setSelectedFont(font)}
                              style={{ fontFamily: font.family }}
                              className={`px-3 py-2.5 rounded-xl border-2 text-[11px] font-bold text-center transition-all ${
                                selectedFont.name === font.name
                                  ? "border-purple-500 bg-purple-50/10 text-purple-500"
                                  : isDarkMode
                                    ? "border-slate-800 bg-slate-800/50"
                                    : "border-slate-100 bg-slate-50"
                              }`}
                            >
                              {font.name}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Colors Section */}
                <div
                  className={`rounded-2xl border-2 transition-all ${activeSection === "colors" ? "border-purple-500/30" : "border-transparent"}`}
                >
                  <button
                    onClick={() => toggleSection("colors")}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
                      isDarkMode
                        ? "bg-slate-800/50 hover:bg-slate-800"
                        : "bg-slate-50 hover:bg-slate-100"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      <Palette className="w-3.5 h-3.5" /> Color Palette
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1 hidden sm:flex">
                        <div
                          className="w-3 h-3 rounded-full border border-black/10"
                          style={{ backgroundColor: textColor }}
                        />
                        <div
                          className="w-3 h-3 rounded-full border border-black/10"
                          style={{ backgroundColor: bgColor }}
                        />
                        <div
                          className="w-3 h-3 rounded-full border border-black/10 shadow-sm"
                          style={{
                            backgroundColor:
                              shadowColor === "transparent"
                                ? "#ccc"
                                : shadowColor,
                          }}
                        />
                        <div
                          className="w-3 h-3 rounded-full border-2 border-black/20"
                          style={{
                            backgroundColor:
                              strokeColor === "transparent"
                                ? "#ccc"
                                : strokeColor,
                          }}
                        />
                      </div>
                      <span
                        className={`text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${
                          isDarkMode
                            ? "bg-slate-700 text-slate-300"
                            : "bg-slate-200 text-slate-500"
                        }`}
                      >
                        {activeSection === "colors" ? "Close" : "Expand"}
                      </span>
                      <motion.div
                        animate={{
                          rotate: activeSection === "colors" ? 180 : 0,
                        }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      </motion.div>
                    </div>
                  </button>

                  <AnimatePresence>
                    {activeSection === "colors" && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="flex items-center gap-2 text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                                <Palette className="w-3 h-3" /> Text Color
                              </label>
                              <div className="flex overflow-x-auto gap-2 py-1.5 px-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                {COLORS.map((c) => (
                                  <button
                                    key={c}
                                    onClick={() => setTextColor(c)}
                                    className={`w-6 h-6 rounded-full border border-black/10 transition-transform active:scale-75 shrink-0 ${textColor === c ? "scale-110 ring-2 ring-purple-500" : ""}`}
                                    style={{ backgroundColor: c }}
                                  />
                                ))}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="flex items-center gap-2 text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                                <Layout className="w-3 h-3" /> Background
                              </label>
                              <div className="flex overflow-x-auto gap-2 py-1.5 px-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                {COLORS.map((c) => (
                                  <button
                                    key={c}
                                    onClick={() => setBgColor(c)}
                                    className={`w-6 h-6 rounded-full border border-black/10 transition-transform active:scale-75 shrink-0 ${bgColor === c ? "scale-110 ring-2 ring-purple-500" : ""}`}
                                    style={{ backgroundColor: c }}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2 pt-2 border-t border-slate-100">
                            <label className="flex items-center gap-2 text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                              <Type className="w-3 h-3" /> Shadow Color
                            </label>
                            <div className="flex overflow-x-auto gap-2 py-1.5 px-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                              <button
                                onClick={() => setShadowColor("transparent")}
                                className={`w-6 h-6 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center transition-transform active:scale-75 shrink-0 ${shadowColor === "transparent" ? "scale-110 ring-2 ring-purple-500" : ""}`}
                              >
                                <X className="w-3 h-3 text-slate-400" />
                              </button>
                              {COLORS.map((c) => (
                                <button
                                  key={c}
                                  onClick={() => setShadowColor(c)}
                                  className={`w-6 h-6 rounded-full border border-black/10 transition-transform active:scale-75 shrink-0 ${shadowColor === c ? "scale-110 ring-2 ring-purple-500" : ""}`}
                                  style={{ backgroundColor: c }}
                                />
                              ))}
                            </div>
                          </div>

                          <div className="space-y-2 pt-2 border-t border-slate-100">
                            <label className="flex items-center gap-2 text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                              <Layout className="w-3 h-3 rotate-45" /> Stroke Color
                            </label>
                            <div className="flex overflow-x-auto gap-2 py-1.5 px-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                              <button
                                onClick={() => setStrokeColor("transparent")}
                                className={`w-6 h-6 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center transition-transform active:scale-75 shrink-0 ${strokeColor === "transparent" ? "scale-110 ring-2 ring-purple-500" : ""}`}
                              >
                                <X className="w-3 h-3 text-slate-400" />
                              </button>
                              {COLORS.map((c) => (
                                <button
                                  key={c}
                                  onClick={() => setStrokeColor(c)}
                                  className={`w-6 h-6 rounded-full border border-black/10 transition-transform active:scale-75 shrink-0 ${strokeColor === c ? "scale-110 ring-2 ring-purple-500" : ""}`}
                                  style={{ backgroundColor: c }}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Preview Card - Dynamic height to show all text */}
                <div className="space-y-1.5 mt-2">
                  <div
                    className="w-full min-h-[128px] sm:min-h-[160px] h-auto rounded-2xl shadow-inner flex flex-col p-6 text-left shadow-lg border-4 border-black/5"
                    style={{ backgroundColor: bgColor }}
                  >
                    <div className="my-auto">
                      <p
                        style={{
                          fontFamily: selectedFont.family,
                          color: textColor,
                          lineHeight: 1.4,
                          whiteSpace: "pre-wrap",
                          textShadow:
                            shadowColor !== "transparent"
                              ? `4px 4px 8px ${shadowColor}`
                              : "none",
                          WebkitTextStroke:
                            strokeColor !== "transparent"
                              ? `1px ${strokeColor}`
                              : "0px transparent",
                        }}
                        className="text-lg sm:text-xl font-medium break-words w-full"
                      >
                        {text || "Preview"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Format Section */}
                <div
                  className={`rounded-2xl border-2 transition-all ${activeSection === "format" ? "border-purple-500/30" : "border-transparent"}`}
                >
                  <button
                    onClick={() => toggleSection("format")}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
                      isDarkMode
                        ? "bg-slate-800/50 hover:bg-slate-800"
                        : "bg-slate-50 hover:bg-slate-100"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      <Download className="w-3.5 h-3.5" /> Export Settings
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-purple-500 uppercase">
                        {selectedFormat}
                      </span>
                      <span
                        className={`text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest hidden sm:inline-block ${
                          isDarkMode
                            ? "bg-slate-700 text-slate-300"
                            : "bg-slate-200 text-slate-500"
                        }`}
                      >
                        {activeSection === "format" ? "Close" : "Expand"}
                      </span>
                      <motion.div
                        animate={{
                          rotate: activeSection === "format" ? 180 : 0,
                        }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      </motion.div>
                    </div>
                  </button>

                  <AnimatePresence>
                    {activeSection === "format" && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-3 grid grid-cols-3 gap-2">
                          {formats.map((format) => (
                            <button
                              key={format.id}
                              onClick={() => setSelectedFormat(format.id)}
                              className={`relative flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all active:scale-[0.95] cursor-pointer ${
                                selectedFormat === format.id
                                  ? "border-purple-500 bg-purple-50/10"
                                  : isDarkMode
                                    ? "border-slate-800 bg-slate-800/50"
                                    : "border-slate-100 bg-slate-50"
                              }`}
                            >
                              <div
                                className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg ${format.color} flex items-center justify-center mb-1 shadow-sm`}
                              >
                                <Download className="w-3 sm:w-3.5 text-white" />
                              </div>
                              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-tight">
                                {format.label}
                              </span>
                              {selectedFormat === format.id && (
                                <div className="absolute top-1 right-1">
                                  <Check className="w-2.5 h-2.5 text-purple-500" />
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Hidden Master Canvas */}
                <canvas ref={canvasRef} className="hidden" />

                {/* Action Buttons */}
                <div className="pt-2 mt-auto flex flex-col gap-2">
                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      disabled={isConverting || !text}
                      className={`flex-1 py-3.5 sm:py-4 rounded-xl flex items-center justify-center gap-2.5 font-black text-[10px] sm:text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 ${
                        convertSuccess
                          ? "bg-emerald-500 text-white shadow-emerald-500/20"
                          : "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-600/20"
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
                          Export
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleShareWithAd}
                      disabled={isConverting || !text}
                      className={`flex-1 py-3.5 sm:py-4 rounded-xl flex items-center justify-center gap-2.5 font-black text-[10px] sm:text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 ${
                        isDarkMode
                          ? "bg-slate-800 text-white border border-slate-700"
                          : "bg-slate-100 text-slate-800 border border-slate-200"
                      }`}
                    >
                      <Share2 className="w-4 h-4" />
                      Share
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
