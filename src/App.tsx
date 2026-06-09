/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import {
  Upload,
  Image as ImageIcon,
  Share2,
  Download,
  Edit2,
  Sparkles,
  Shield,
  Palette,
  X,
  Smartphone,
  PaintBucket,
  Settings,
  Star,
  Moon,
  Sun,
  Globe,
  Crown,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  applyStyle,
  SensitiveArea,
  Styles,
  PhoneLayouts,
  burnEditsToImage,
  preloadPhoneFrames,
} from "./lib/imageProcessor";
import EditorCanvas from "./EditorCanvas";
import { convertPhotoToPdf } from "./lib/pdfGenerator";
import { ConverterModal } from "./components/ConverterModal";
import { TextConverterModal } from "./components/TextConverterModal";
import { translations, LanguageKey } from "./i18n";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { Share } from "@capacitor/share";
import {
  initializeAdMob,
  showBannerAd,
  hideBannerAd,
  playRewardedAds,
  isNative,
  AdMobBanner,
  admobManager,
  AdMobInterstitialContainer,
} from "./lib/admob";

type AppState = "upload" | "processing" | "preview";

const EXTENDED_PALETTE = [
  "#FFFFFF", // White
  "#F1F5F9", // Light Slate
  "#94A3B8", // Medium Gray
  "#475569", // Dark Slate
  "#000000", // Black
  "#FEF2F2", // Very Light Red
  "#EF4444", // Red
  "#991B1B", // Dark Red
  "#FFF7ED", // Very Light Orange
  "#F97316", // Orange
  "#9A3412", // Dark Orange
  "#FCD34D", // Yellow
  "#B45309", // Dark Yellow/Brown
  "#ECFCCB", // Very Light Lime
  "#84CC16", // Lime Green
  "#4D7C0F", // Dark Lime
  "#22C55E", // Green
  "#15803D", // Dark Green
  "#10B981", // Emerald
  "#14B8A6", // Teal
  "#06B6D4", // Cyan
  "#0EA5E9", // Sky Blue
  "#3B82F6", // Blue
  "#1D4ED8", // Dark Blue
  "#6366F1", // Indigo
  "#312E81", // Dark Indigo
  "#8B5CF6", // Violet
  "#A855F7", // Purple
  "#6B21A8", // Dark Purple
  "#D946EF", // Fuchsia
  "#EC4899", // Pink
  "#BE185D", // Dark Pink
  "#F43F5E", // Rose
  "#FFD700", // Gold
  "#FF7F50", // Coral
  "#40E0D0", // Turquoise
  "#8B4513", // SaddleBrown
  "#000080", // Navy

  // Gradients
  "#f09433,#dc2743", // Insta-like
  "#1e3c72,#2a5298", // Deep Space
  "#ffecd2,#fcb69f", // Peach
  "#8e2de2,#4a00e0", // Purple Dream
  "#a1c4fd,#c2e9fb", // Winter Sky
  "#00c6ff,#0072ff", // Ocean Blue
  "#f12711,#f5af19", // Fire
  "#11998e,#38ef7d", // Fresh Mint
  "#eb3349,#f45c43", // Cherry
  "#4cb8c4,#3cd3ad", // Turquoise Flow
  "#fdfc47,#24fe41", // Yellow & Green Mix
  "#9a55ff,#33bfff", // Purple & Blue Mix
  "#ff416c,#ff4b2b", // Red & Orange Mix
  "#1380a1,#34e89e", // Tealish Blue & Mint Green Mix
  "#da22ff,#9733ee", // Pinkish Purple & Purple Mix
  "#ff8c00,#ff0080", // Orange & Pinkish Red Mix
  "#8ec5fc,#e0c3fc", // Lilac & Sky Blue Mix
  "#4facfe,#00f2fe", // Blue & Teal Mix
  "#ff3366,#6600cc", // Ruby Pink & Purple Indigo Mix
  "#a8ff78,#78ffd6", // Lime & Aquamarine Mix
];

export default function App() {
  const [appState, setAppState] = useState<AppState>("upload");
  const [originalImage, setOriginalImage] = useState<string | null>(null); // Baked version for style
  const [loadedOriginalImage, setLoadedOriginalImage] = useState<HTMLImageElement | null>(null);
  const [cleanImage, setCleanImage] = useState<string | null>(null); // Clean version for editor (un-baked)
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [baseStyledImage, setBaseStyledImage] = useState<string | null>(null);
  const [customCropRect, setCustomCropRect] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const [customCanvasSize, setCustomCanvasSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [customImageOffset, setCustomImageOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [customImageScale, setCustomImageScale] = useState<number>(1);
  const [showEditor, setShowEditor] = useState(false);

  // Quick Landing Feature states
  const [activeQuickFeature, setActiveQuickFeature] = useState<"draw" | "blur" | "watermark" | "pdf" | "resizer" | "arrows" | "converter" | "text" | null>(null);
  const [editorInitialTool, setEditorInitialTool] = useState<any>("none");

  // PDF Export settings
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isConverterModalOpen, setIsConverterModalOpen] = useState(false);
  const [isTextModalOpen, setIsTextModalOpen] = useState(false);
  const [pdfPageSize, setPdfPageSize] = useState<"A4" | "Letter" | "Original">("A4");
  const [pdfOrientation, setPdfOrientation] = useState<"portrait" | "landscape" | "auto">("auto");
  const [pdfMargin, setPdfMargin] = useState<"none" | "thin" | "normal">("none");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // NEW STATES
  const [editorPaths, setEditorPaths] = useState<any[]>([]);
  const [editorTexts, setEditorTexts] = useState<any[]>([]);
  const [selectedStyle, setSelectedStyle] = useState("Original");
  const [selectedLayout, setSelectedLayout] = useState("None");
  const [isPrivacyScanning, setIsPrivacyScanning] = useState(false);
  const [blurStrength, setBlurStrength] = useState(15);
  const [sensitiveAreas, setSensitiveAreas] = useState<SensitiveArea[]>([]);
  const [memeTopText, setMemeTopText] = useState("TOP TEXT");
  const [memeBottomText, setMemeBottomText] = useState("BOTTOM TEXT");
  const [customBgColor, setCustomBgColor] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [language, setLanguage] = useState<LanguageKey>("en");
  const [activeTab, setActiveTab] = useState<"styles" | "layouts" | "colors">(
    "layouts",
  );
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [selectedPremiumPlan, setSelectedPremiumPlan] = useState<
    "monthly" | "6months" | "12months"
  >("12months");
  const [isPremium, setIsPremium] = useState(false);

  // Zoom & Pan states for the preview image
  const [zoomScale, setZoomScale] = useState(1);
  const [zoomOffset, setZoomOffset] = useState({ x: 0, y: 0 });
  const zoomStartRef = useRef<{ x: number; y: number } | null>(null);
  const zoomInitialScaleRef = useRef<number>(1);
  const zoomInitialDistanceRef = useRef<number | null>(null);
  const zoomLastTapRef = useRef<number>(0);
  const [isMouseDragging, setIsMouseDragging] = useState(false);

  const handleDoubleTap = (clientX: number, clientY: number) => {
    if (zoomScale > 1.1) {
      setZoomScale(1);
      setZoomOffset({ x: 0, y: 0 });
    } else {
      setZoomScale(2.5);
      setZoomOffset({ x: 0, y: 0 });
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (
      now - zoomLastTapRef.current < DOUBLE_TAP_DELAY &&
      e.touches.length === 1
    ) {
      handleDoubleTap(e.touches[0].clientX, e.touches[0].clientY);
      zoomLastTapRef.current = 0;
      return;
    }
    zoomLastTapRef.current = now;

    if (e.touches.length === 1) {
      zoomStartRef.current = {
        x: e.touches[0].clientX - zoomOffset.x,
        y: e.touches[0].clientY - zoomOffset.y,
      };
    } else if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY,
      );
      zoomInitialDistanceRef.current = dist;
      zoomInitialScaleRef.current = zoomScale;
      zoomStartRef.current = {
        x: (touch1.clientX + touch2.clientX) / 2 - zoomOffset.x,
        y: (touch1.clientY + touch2.clientY) / 2 - zoomOffset.y,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && zoomStartRef.current && zoomScale > 1) {
      if (e.cancelable) e.preventDefault();
      const touch = e.touches[0];
      setZoomOffset({
        x: touch.clientX - zoomStartRef.current.x,
        y: touch.clientY - zoomStartRef.current.y,
      });
    } else if (
      e.touches.length === 2 &&
      zoomInitialDistanceRef.current &&
      zoomStartRef.current
    ) {
      if (e.cancelable) e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY,
      );
      const factor = dist / zoomInitialDistanceRef.current;
      const newScale = Math.max(
        1,
        Math.min(4, zoomInitialScaleRef.current * factor),
      );
      setZoomScale(newScale);

      if (newScale > 1) {
        const midX = (touch1.clientX + touch2.clientX) / 2;
        const midY = (touch1.clientY + touch2.clientY) / 2;
        setZoomOffset({
          x: midX - zoomStartRef.current.x,
          y: midY - zoomStartRef.current.y,
        });
      } else {
        setZoomOffset({ x: 0, y: 0 });
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      zoomStartRef.current = null;
      zoomInitialDistanceRef.current = null;
      if (zoomScale <= 1.05) {
        setZoomScale(1);
        setZoomOffset({ x: 0, y: 0 });
      }
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      zoomStartRef.current = {
        x: touch.clientX - zoomOffset.x,
        y: touch.clientY - zoomOffset.y,
      };
      zoomInitialDistanceRef.current = null;
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    handleDoubleTap(e.clientX, e.clientY);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomScale > 1.1) {
      setIsMouseDragging(true);
      zoomStartRef.current = {
        x: e.clientX - zoomOffset.x,
        y: e.clientY - zoomOffset.y,
      };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isMouseDragging && zoomStartRef.current) {
      setZoomOffset({
        x: e.clientX - zoomStartRef.current.x,
        y: e.clientY - zoomStartRef.current.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsMouseDragging(false);
    zoomStartRef.current = null;
  };

  const t = (key: keyof (typeof translations)["en"]) =>
    translations[language]?.[key] || translations["en"][key];

  const fileInputRef = useRef<HTMLInputElement>(null);

  const prevStyleRef = React.useRef(selectedStyle);
  const prevLayoutRef = React.useRef(selectedLayout);
  const prevBgRef = React.useRef(customBgColor);
  const prevOriginalImageRef = React.useRef<string | null>(null);

  // Capacitor AdMob Initialization
  React.useEffect(() => {
    if (!isPremium) {
      initializeAdMob().then(() => {
        showBannerAd();
        admobManager.preloadInterstitial();
      });
    } else {
      hideBannerAd();
    }
  }, [isPremium]);

  // Track user customizing choices as active interactions for AdMob Interstitials
  React.useEffect(() => {
    if (!originalImage || isPremium) return;
    admobManager.incrementInteractions();
  }, [selectedStyle, selectedLayout, customBgColor]);

  // Preload all frames on mount
  React.useEffect(() => {
    preloadPhoneFrames();
  }, []);

  // Preload original image into HTMLImageElement for instant subsequent rendering
  React.useEffect(() => {
    if (originalImage) {
      const img = new Image();
      img.onload = () => {
        setLoadedOriginalImage(img);
      };
      img.src = originalImage;
    } else {
      setLoadedOriginalImage(null);
    }
  }, [originalImage]);

  // Sync processed image when any parameter changes
  React.useEffect(() => {
    if (originalImage && loadedOriginalImage) {
      setZoomScale(1);
      setZoomOffset({ x: 0, y: 0 });
      applyStyle(
        loadedOriginalImage,
        selectedStyle,
        selectedLayout,
        sensitiveAreas,
        blurStrength,
        customBgColor,
        customCropRect,
        customCanvasSize,
        customImageOffset,
        customImageScale
      )
        .then((res) => {
          setBaseStyledImage(res);

          // Only clear manual edits if structural options actually changed in the sidebar
          const styleChanged = prevStyleRef.current !== selectedStyle;
          const layoutChanged = prevLayoutRef.current !== selectedLayout;
          const bgChanged = prevBgRef.current !== customBgColor;
          const originalImageChanged =
            prevOriginalImageRef.current !== originalImage;

          if (originalImageChanged) {
            setEditorPaths([]);
            setEditorTexts([]);
            setProcessedImage(res);
          } else if (styleChanged || layoutChanged || bgChanged) {
            burnEditsToImage(res, editorPaths, editorTexts).then(
              (finalCombined) => {
                setProcessedImage(finalCombined);
              },
            );
          } else {
            if (editorPaths.length > 0 || editorTexts.length > 0) {
              burnEditsToImage(res, editorPaths, editorTexts).then(
                (finalCombined) => {
                  setProcessedImage(finalCombined);
                },
              );
            } else {
              setProcessedImage(res);
            }
          }

          prevOriginalImageRef.current = originalImage;
          prevStyleRef.current = selectedStyle;
          prevLayoutRef.current = selectedLayout;
          prevBgRef.current = customBgColor;
        })
        .catch(console.error);
    }
  }, [
    originalImage,
    loadedOriginalImage,
    selectedStyle,
    selectedLayout,
    sensitiveAreas,
    blurStrength,
    memeTopText,
    memeBottomText,
    customBgColor,
    customCropRect,
    customCanvasSize,
    customImageOffset,
    customImageScale,
    editorPaths,
    editorTexts,
  ]);

  // Deselect custom color if style or layout changes, EXCEPT when changing the custom color itself
  // Actually, we don't necessarily want to unset it. Let's let the user keep it if they explicitly set it.

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Clear input value so selecting the same file works
    e.target.value = "";

    setActiveTab("layouts");
    setSelectedLayout("None");

    const reader = new FileReader();
    reader.onload = async (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const isMobile = Capacitor.isNativePlatform() || (typeof window !== "undefined" && window.innerWidth < 768);
        const MAX_WIDTH = isMobile ? 1000 : 1400;
        const MAX_HEIGHT = isMobile ? 1000 : 1400;
        let width = img.width;
        let height = img.height;

        const scale = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
        if (scale < 1) {
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        const resizedResult = canvas.toDataURL("image/jpeg", 0.9);
        setOriginalImage(resizedResult);
        setCleanImage(resizedResult);
        setProcessedImage(resizedResult);

        if (!activeQuickFeature) {
          const topH = Math.round(height * 0.04);
          const bottomH = Math.round(height * 0.05);
          setCustomCropRect({
            x: 0,
            y: topH,
            w: width,
            h: height - topH - bottomH,
          });
          setCustomCanvasSize(null);
          setEditorPaths([]);
          setEditorTexts([]);

          setAppState("processing");

          setTimeout(() => {
            setAppState("preview");
          }, 800);
        } else {
          // If a quick feature from landing page is active:
          setEditorPaths([]);
          setCustomCanvasSize(null);
          setCustomCropRect(null); // Full size canvas, no custom template wrapper
          
          if (activeQuickFeature === "pdf") {
            setIsPdfModalOpen(true);
          } else if (activeQuickFeature === "converter") {
            setIsConverterModalOpen(true);
          } else if (activeQuickFeature === "text") {
            setIsTextModalOpen(true);
          } else {
            if (activeQuickFeature === "draw") {
              setEditorInitialTool("draw");
              setEditorTexts([]);
            } else if (activeQuickFeature === "blur") {
              setEditorInitialTool("blur");
              setEditorTexts([]);
            } else if (activeQuickFeature === "arrows") {
              setEditorInitialTool("arrows");
              setEditorTexts([]);
            } else if (activeQuickFeature === "resizer") {
              setEditorInitialTool("size");
              setEditorTexts([]);
            } else if (activeQuickFeature === "watermark") {
              setEditorInitialTool("text");
              // Elegant drag-adjustable watermark centered by default
              setEditorTexts([
                {
                  text: "Draft Watermark",
                  x: width / 2,
                  y: height / 2,
                  color: "#FFFFFF",
                  size: Math.round(Math.max(width, height) * 0.05),
                  positionMode: "Default",
                  fontName: "Space Grotesk",
                  hasShadow: true,
                  shadowColor: "rgba(0, 0, 0, 0.4)",
                  bgColor: "rgba(0, 0, 0, 0.25)"
                }
              ]);
            }
            setShowEditor(true);
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const currentDisplayImage = showEditor ? null : processedImage;

  const triggerDownloadOfBase64 = async (base64String: string, defaultFilename: string = "edited_screenshot.png") => {
    if (!base64String) return;

    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android") {
      try {
        const NativeMedia = registerPlugin<any>("NativeMedia");
        await NativeMedia.saveImage({ base64: base64String });
        alert(
          "Image saved directly to your phone gallery under 'Pictures/MyApp'!",
        );
        return;
      } catch (nativeErr: any) {
        console.error(
          "Native save failed, trying Web download fallback:",
          nativeErr,
        );
      }
    }

    try {
      const parts = base64String.split(";base64,");
      const contentType = parts[0].split(":")[1];
      const raw = window.atob(parts[1]);
      const rawLength = raw.length;
      const uInt8Array = new Uint8Array(rawLength);

      for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
      }

      const blob = new Blob([uInt8Array], { type: contentType });
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = defaultFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 3000);
    } catch (e) {
      console.warn(
        "Blob conversion failed, attempting direct base64 download fallback",
        e,
      );
      const link = document.createElement("a");
      link.href = base64String;
      link.download = defaultFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const executeDownload = async () => {
    if (!processedImage) return;
    await triggerDownloadOfBase64(processedImage, "photy_edited.png");
  };

  const downloadImage = () => {
    if (!isPremium) {
      playRewardedAds(executeDownload);
      return;
    }
    executeDownload();
  };

  const executeShare = async () => {
    if (!processedImage) return;

    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android") {
      try {
        const NativeMedia = registerPlugin<any>("NativeMedia");
        await NativeMedia.shareImage({ base64: processedImage });
        return;
      } catch (nativeErr: any) {
        console.error(
          "Native share failed, trying Web share fallback:",
          nativeErr,
        );
      }
    }

    try {
      const response = await fetch(processedImage);
      const blob = await response.blob();
      const file = new File([blob], "edited_screenshot.png", {
        type: blob.type,
      });

      // Attempt the full Web Share API for native file sharing
      if (
        navigator.share &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          files: [file],
          title: "Edited Screenshot",
        });
      } else if (navigator.share) {
        // Fallback to simple link/text share if file share is restricted
        await navigator.share({
          title: "Edited Screenshot",
          text: "Check out my screenshot edited with Photy!",
          url: window.location.origin,
        });
      } else {
        // Ultimate fallback: save to clipboard + trigger direct download
        if (navigator.clipboard && window.ClipboardItem) {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({
                [blob.type]: blob,
              }),
            ]);
            console.log("Screenshot copied to clipboard as share fallback.");
          } catch (clipErr) {
            console.warn("Clipboard share backup failed:", clipErr);
          }
        }
        executeDownload();
      }
    } catch (err) {
      console.error("Web Share failed, downloading file instead", err);
      executeDownload();
    }
  };

  const shareImage = () => {
    if (!isPremium) {
      playRewardedAds(executeShare);
      return;
    }
    executeShare();
  };

  const handleShareSystem = async () => {
    try {
      // First try to use Capacitor Native Share if supported
      await Share.share({
        title: t("appName"),
        text: t("shareText"),
        url: "https://play.google.com/store/apps/details?id=com.shotclean.myapp",
        dialogTitle: t("shareApp"),
      });
      return;
    } catch (e) {
      console.log(
        "Capacitor native share not available or failed, trying Web Share API...",
        e,
      );
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: t("appName"),
          text: t("shareText"),
          url: "https://play.google.com/store/apps/details?id=com.shotclean.myapp",
        });
      } catch (e) {
        console.log("User cancelled web share");
      }
    } else {
      try {
        await navigator.clipboard.writeText(
          "https://play.google.com/store/apps/details?id=com.shotclean.myapp",
        );
        alert(t("shareText") + "\n\nLink copied to clipboard!");
      } catch (err) {
        alert(
          "https://play.google.com/store/apps/details?id=com.shotclean.myapp",
        );
      }
    }
  };

  const handleRateUs = () => {
    const playStoreUrl =
      "https://play.google.com/store/apps/details?id=com.shotclean.myapp";
    try {
      window.open(playStoreUrl, "_system");
    } catch (e) {
      window.open(playStoreUrl, "_blank");
    }
  };

  const handleFeaturedClick = (feature: "draw" | "blur" | "watermark" | "pdf" | "resizer" | "arrows" | "converter" | "text") => {
    setActiveQuickFeature(feature);
    setSelectedLayout("None");
    if (feature === "text") {
      setIsTextModalOpen(true);
    } else {
      fileInputRef.current?.click();
    }
  };

  return (
    <div
      className={`h-[100dvh] w-full font-sans flex items-center justify-center relative overflow-hidden transition-colors duration-500 flex-col pt-safe ${isDarkMode ? "bg-slate-900 text-white" : "bg-blue-600 text-gray-900"}`}
      style={{ paddingTop: (!isPremium && isNative) ? 'calc(env(safe-area-inset-top) + 60px)' : undefined }}
    >
      {/* Banner Ads on top of landing page, main page, and edit page */}
      {!isPremium && <AdMobBanner className="shrink-0 z-[60]" />}

      {/* Full-screen simulated AdMob Interstitial Overlay */}
      <AdMobInterstitialContainer />

      <AnimatePresence mode="wait">
        {/* ... upload and processing screens same ... */}
        {appState === "upload" && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`w-full max-w-md p-8 flex flex-col items-center text-center space-y-6 backdrop-blur-xl rounded-[40px] shadow-2xl m-4 relative ${isDarkMode ? "bg-slate-800/80 border border-slate-700" : "bg-white/10 border border-white/20"}`}
          >
            {/* Settings Button */}
            <button
              onClick={() => setShowSettings(true)}
              className={`absolute top-6 right-6 p-2 rounded-full transition-colors ${isDarkMode ? "bg-slate-700 text-slate-300 hover:bg-slate-600" : "bg-white/20 text-white hover:bg-white/30"}`}
            >
              <Settings className="w-5 h-5" />
            </button>

            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-xl ${isDarkMode ? "bg-slate-700 text-blue-400" : "bg-white text-blue-600"}`}
            >
              <ImageIcon className="w-8 h-8" />
            </div>
            <div className={isDarkMode ? "text-white" : "text-white"}>
              <h1 className="text-4xl font-black mb-2 tracking-tighter">
                {t("appName")}
              </h1>
              <p
                className={`text-sm font-medium ${isDarkMode ? "text-slate-300" : "text-blue-100"}`}
              >
                {t("subtitle")}
              </p>
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className={`w-full py-5 rounded-2xl font-black shadow-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-lg ${isDarkMode ? "bg-blue-600 text-white hover:bg-blue-500" : "bg-white text-blue-600 hover:bg-blue-50"}`}
            >
              <Upload className="w-6 h-6" />
              {t("uploadBtn")}
            </button>
            <input
              type="file"
              accept="image/png, image/jpeg"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileUpload}
            />

            <div className="grid grid-cols-1 gap-3 w-full">
              <div
                className={`p-4 rounded-2xl border text-center ${isDarkMode ? "bg-slate-800/50 border-slate-700" : "bg-white/10 border-white/10"}`}
              >
                <Palette
                  className={`w-5 h-5 mb-2 mx-auto ${isDarkMode ? "text-blue-400" : "text-blue-200"}`}
                />
                <h3
                  className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? "text-slate-200" : "text-white"}`}
                >
                  {t("viralStylesTitle")}
                </h3>
                <p
                  className={`text-[10px] ${isDarkMode ? "text-slate-400" : "text-blue-100/60"}`}
                >
                  {t("viralStylesDesc")}
                </p>
              </div>
            </div>

            {/* Quick Actions / Featured Badges */}
            <div className={`w-full border-t pt-4 ${isDarkMode ? "border-slate-700/60" : "border-white/10"}`}>
              <p className={`text-[10px] font-extrabold uppercase tracking-widest mb-3 ${isDarkMode ? "text-slate-450" : "text-blue-100/90"}`}>
                Quick Actions
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  onClick={() => handleFeaturedClick("draw")}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm ${
                    isDarkMode
                      ? "bg-slate-700 hover:bg-slate-650 text-blue-400 border border-slate-600/50"
                      : "bg-white/15 hover:bg-white/25 text-white border border-white/15"
                  }`}
                >
                  Draw
                </button>
                <button
                  onClick={() => handleFeaturedClick("arrows")}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm ${
                    isDarkMode
                      ? "bg-slate-700 hover:bg-slate-650 text-blue-400 border border-slate-600/50"
                      : "bg-white/15 hover:bg-white/25 text-white border border-white/15"
                  }`}
                >
                  Arrows & Shapes
                </button>
                <button
                  onClick={() => handleFeaturedClick("blur")}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm ${
                    isDarkMode
                      ? "bg-slate-700 hover:bg-slate-650 text-blue-400 border border-slate-600/50"
                      : "bg-white/15 hover:bg-white/25 text-white border border-white/15"
                  }`}
                >
                  Blur
                </button>
                <button
                  onClick={() => handleFeaturedClick("watermark")}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm ${
                    isDarkMode
                      ? "bg-slate-700 hover:bg-slate-650 text-blue-400 border border-slate-600/50"
                      : "bg-white/15 hover:bg-white/25 text-white border border-white/15"
                  }`}
                >
                  add watermark
                </button>
                <button
                  onClick={() => handleFeaturedClick("resizer")}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm ${
                    isDarkMode
                      ? "bg-slate-700 hover:bg-slate-650 text-blue-400 border border-slate-600/50"
                      : "bg-white/15 hover:bg-white/25 text-white border border-white/15"
                  }`}
                >
                  image resizer
                </button>
                <button
                  onClick={() => handleFeaturedClick("converter")}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm ${
                    isDarkMode
                      ? "bg-slate-700 hover:bg-slate-650 text-blue-400 border border-slate-600/50"
                      : "bg-white/15 hover:bg-white/25 text-white border border-white/15"
                  }`}
                >
                  image converter
                </button>
                <button
                  onClick={() => handleFeaturedClick("text")}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm ${
                    isDarkMode
                      ? "bg-slate-700 hover:bg-slate-650 text-purple-400 border border-slate-600/50"
                      : "bg-white/15 hover:bg-white/25 text-white border border-white/15"
                  }`}
                >
                  text converter
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {appState === "processing" && (
          <motion.div
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-md flex flex-col items-center justify-center space-y-6"
          >
            <div className="relative w-20 h-20">
              <motion.div
                className="absolute inset-0 border-4 border-t-blue-600 border-r-transparent border-b-transparent border-l-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
              />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold">{t("enhancing")}</h2>
              <p className="text-sm text-gray-400">{t("perfecting")}</p>
            </div>
          </motion.div>
        )}

        {/* PREVIEW SCREEN */}
        {appState === "preview" && processedImage && !showEditor && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full flex-1 min-h-0 md:h-[95vh] md:w-[420px] md:rounded-[40px] bg-white flex flex-col shadow-2xl relative overflow-hidden ring-8 ring-gray-900/5 select-none"
          >
            {/* Main Preview Area - Structured at exactly 74% of parent */}
            <div className="h-[74%] max-h-[74%] bg-[#F1F5F9] p-3 flex items-center justify-center overflow-hidden relative select-none shrink-0 border-b border-gray-100">
              {/* Absolute Close/Reset Button inside the Preview Area */}
              <button
                onClick={() => setAppState("upload")}
                className="absolute bottom-3.5 left-3.5 z-30 p-2 bg-white/95 hover:bg-white text-gray-700 hover:text-gray-900 backdrop-blur rounded-full shadow border border-gray-200/50 transition-all active:scale-95 cursor-pointer"
                title={t("startOverBtn")}
              >
                <X className="w-4 h-4" />
              </button>

              <div
                className="relative h-full w-full flex items-center justify-center"
                style={{ touchAction: "none" }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onDoubleClick={handleDoubleClick}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                <img
                  src={processedImage}
                  className={`max-h-[85%] max-w-full object-contain rounded-xl shadow-xl ${
                    zoomScale > 1.1
                      ? "cursor-grab active:cursor-grabbing"
                      : "cursor-zoom-in"
                  }`}
                  style={{
                    transform: `translate(${zoomOffset.x}px, ${zoomOffset.y}px) scale(${zoomScale})`,
                    transition:
                      isMouseDragging || zoomStartRef.current
                        ? "none"
                        : "transform 0.15s ease-out",
                    transformOrigin: "center center",
                  }}
                  alt="Preview"
                  draggable={false}
                />
              </div>

              {zoomScale > 1.05 && (
                <button
                  onClick={() => {
                    setZoomScale(1);
                    setZoomOffset({ x: 0, y: 0 });
                  }}
                  className="absolute bottom-3.5 right-3.5 bg-gray-900/90 backdrop-blur text-white text-[10px] font-bold px-2.5 py-1.5 rounded-full flex items-center gap-1 shadow-lg border border-white/10 hover:bg-gray-800 transition-colors z-30 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  Reset Zoom
                </button>
              )}
            </div>

            {/* Bottom Controls Panel - Structured at exactly 26% of parent */}
            <div className="h-[26%] max-h-[26%] shrink-0 bg-white flex flex-col justify-between overflow-hidden p-2.5 pb-2">
              {/* Selectors Wrapper: Scrollable to avoid overflow on tiny screens */}
              <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 mt-0.5">
                {/* Tabs for Organization */}
                <div className="flex w-full rounded-full bg-slate-100/80 p-1 mb-2 shrink-0 border border-slate-200/60 shadow-inner">
                  <button
                    onClick={() => setActiveTab("styles")}
                    className={`flex-1 rounded-full py-1.5 text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1.5 ${
                      activeTab === "styles"
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 scale-100"
                        : "text-blue-600 bg-blue-100/50 hover:bg-blue-100 hover:text-blue-700 scale-95"
                    }`}
                  >
                    <Palette className="w-3.5 h-3.5" />
                    {t("viralStylesTitle")}
                  </button>
                  <button
                    onClick={() => setActiveTab("layouts")}
                    className={`flex-1 rounded-full py-1.5 text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1.5 ${
                      activeTab === "layouts"
                        ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25 scale-100"
                        : "text-emerald-600 bg-emerald-100/50 hover:bg-emerald-100 hover:text-emerald-700 scale-95"
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    {t("phoneLayouts")}
                  </button>
                  <button
                    onClick={() => setActiveTab("colors")}
                    className={`flex-1 rounded-full py-1.5 text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1.5 ${
                      activeTab === "colors"
                        ? "bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-md shadow-rose-500/25 scale-100"
                        : "text-rose-600 bg-rose-100/50 hover:bg-rose-100 hover:text-rose-700 scale-95"
                    }`}
                  >
                    <PaintBucket className="w-3.5 h-3.5" />
                    {t("canvasColor")}
                  </button>
                </div>

                {activeTab === "styles" && (
                  <div>
                    {/* Viral Styles */}
                    <div className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar items-center px-1">
                      {Object.keys(Styles).map((style) => {
                        const isSelected = selectedStyle === style;

                        return (
                          <button
                            key={style}
                            onClick={() => {
                              setSelectedStyle(style);
                              setCustomBgColor(null);
                            }}
                            className="flex flex-col items-center gap-1 shrink-0 group"
                          >
                            <div
                              className={`w-7.5 h-7.5 rounded-lg flex items-center justify-center text-xs font-black transition-all border ${isSelected ? "border-blue-600 scale-105 shadow-md shadow-blue-50" : "border-gray-100"} ${
                                style === "Original"
                                  ? "bg-white"
                                  : style === "Minimal"
                                    ? "bg-[#F8FAFC]"
                                    : style === "Dark"
                                      ? "bg-[#0F172A]"
                                      : style === "Instagram"
                                        ? "bg-gradient-to-br from-[#f09433] via-[#dc2743] to-[#bc1888]"
                                        : style === "Shadow"
                                          ? "bg-[#E2E8F0]"
                                          : style === "Meme"
                                            ? "bg-black"
                                            : style === "Money"
                                              ? "bg-[#065F46]"
                                              : style === "Focus"
                                                ? "bg-[#1F2937]"
                                                : style === "Viral"
                                                  ? "bg-red-500"
                                                  : style === "Chat"
                                                    ? "bg-[#ECFDF5]"
                                                    : "bg-[#F1F5F9]"
                              }`}
                            >
                              <span
                                className={`${style === "Dark" || style === "Money" || style === "Focus" || style === "Instagram" || style === "Meme" || style === "Viral" ? "text-white" : "text-gray-900"}`}
                              >
                                {style[0]}
                              </span>
                            </div>
                            <span
                              className={`text-[8px] leading-none ${isSelected ? "text-blue-600 font-bold" : "text-gray-400 font-medium"}`}
                            >
                              {style}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {activeTab === "layouts" && (
                  <div>
                    {/* Phone Layouts */}
                    <div className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar px-1 items-center">
                      {Object.keys(PhoneLayouts).map((layoutName) => {
                        const isSelected = selectedLayout === layoutName;
                        const config = PhoneLayouts[layoutName];

                        return (
                          <button
                            key={layoutName}
                            onClick={() => {
                              setSelectedLayout(layoutName);
                              setCustomBgColor(null);
                              if (
                                layoutName !== "None" &&
                                selectedStyle !== "Original"
                              ) {
                                setSelectedStyle("Original");
                              }
                            }}
                            className="flex flex-col items-center gap-1 shrink-0 group relative"
                          >
                            <div
                              style={{ backgroundColor: config.themeColor }}
                              className={`w-7 h-10 rounded-lg flex flex-col items-center justify-center transition-all border ${isSelected ? "border-white ring-1 ring-blue-600 scale-105 shadow-md" : "border-black/5 hover:border-black/10 shadow-sm opacity-90 hover:opacity-100"}`}
                            >
                              {layoutName === "None" ? (
                                <X
                                  className={`w-3.5 h-3.5 ${layoutName === "None" && config.themeColor === "#f3f4f6" ? "text-gray-400" : "text-white"}`}
                                />
                              ) : (
                                <div
                                  style={{
                                    transform: config.rotation
                                      ? `rotate(${config.rotation}deg)`
                                      : "none",
                                    aspectRatio: config.isLandscape
                                      ? "16/9"
                                      : "9/16",
                                  }}
                                  className={`bg-slate-900 rounded-[2px] border border-white/20 shadow relative flex flex-col items-center justify-center ${config.isLandscape ? "w-5 h-3" : "w-3.5 h-6"}`}
                                >
                                  <div className="w-[85%] h-[85%] bg-blue-500/20 rounded-[1px] flex items-center justify-center">
                                    <div className="w-[60%] h-[10%] bg-blue-400/40 rounded-full" />
                                  </div>
                                  {!config.isLandscape && (
                                    <div className="absolute top-[1px] w-[30%] h-[1px] bg-black rounded-full" />
                                  )}
                                </div>
                              )}
                            </div>
                            <span
                              className={`text-[7px] leading-none uppercase tracking-tighter ${isSelected ? "text-blue-600 font-extrabold" : "text-gray-400 font-bold"}`}
                            >
                              {layoutName}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {activeTab === "colors" && (
                  <div>
                    {/* Canvas Color */}
                    <div className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar px-1 items-center">
                      <button
                        onClick={() => setCustomBgColor(null)}
                        className="flex flex-col items-center gap-1 shrink-0 group relative"
                      >
                        <div
                          className={`w-6.5 h-6.5 rounded-full flex items-center justify-center transition-all border bg-gray-100 ${customBgColor === null ? "border-blue-600 ring-1 ring-blue-600 scale-105 shadow-sm" : "border-gray-200"}`}
                        >
                          <X className="w-3 h-3 text-gray-500" />
                        </div>
                      </button>

                      {/* Custom Color Picker */}
                      <div className="flex flex-col items-center gap-1 shrink-0 group relative">
                        <div
                          className={`w-6.5 h-6.5 rounded-full transition-all border shadow-sm relative flex items-center justify-center cursor-pointer hover:scale-105 ${
                            customBgColor &&
                            !EXTENDED_PALETTE.includes(
                              customBgColor.toUpperCase(),
                            )
                              ? "border-white ring-1 ring-blue-600 scale-105 shadow-md"
                              : "border-white"
                          }`}
                          style={{
                            background:
                              "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)",
                          }}
                        >
                          <input
                            type="color"
                            title="Pick custom color"
                            value={customBgColor || "#FFFFFF"}
                            onChange={(e) => {
                              setCustomBgColor(e.target.value);
                            }}
                            className="absolute inset-[-10px] w-10 h-10 opacity-0 cursor-pointer"
                          />
                        </div>
                      </div>

                      {/* Palette colors */}
                      {EXTENDED_PALETTE.map((hex) => (
                        <button
                          key={hex}
                          onClick={() => {
                            setCustomBgColor(hex);
                          }}
                          className="flex flex-col items-center gap-1 shrink-0 group relative"
                        >
                          <div
                            style={{
                              background: hex.includes(",")
                                ? `linear-gradient(to bottom right, ${hex})`
                                : hex,
                            }}
                            className={`w-6.5 h-6.5 rounded-full transition-all border ${customBgColor?.toUpperCase() === hex.toUpperCase() ? "border-white ring-1 ring-blue-600 scale-105 shadow-md" : "border-black/5 hover:scale-105"}`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Multi-Function Sleek Bottom Row Buttons */}
              <div className="w-full max-w-md mx-auto flex items-center justify-between gap-1.5 pt-1.5 mt-auto shrink-0 px-1">
                <button
                  onClick={() => setShowEditor(true)}
                  className="flex-1 py-1 bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white rounded-lg font-bold flex flex-col items-center justify-center gap-[1px] transition-all shadow-sm cursor-pointer"
                >
                  <Edit2 className="w-3 h-3 shrink-0" />
                  <span className="text-[8.5px] tracking-tight truncate">
                    {t("editBtn")}
                  </span>
                </button>
                <button
                  onClick={shareImage}
                  className="flex-1 py-1 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 rounded-lg font-bold flex flex-col items-center justify-center gap-[1px] transition-all cursor-pointer"
                >
                  <Share2 className="w-3 h-3 shrink-0" />
                  <span className="text-[8.5px] tracking-tight truncate">
                    {t("shareBtn")}
                  </span>
                </button>
                <button
                  onClick={downloadImage}
                  className="flex-1 py-1 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white rounded-lg font-bold flex flex-col items-center justify-center gap-[1px] transition-all shadow-sm cursor-pointer"
                >
                  <Download className="w-3 h-3 shrink-0" />
                  <span className="text-[8.5px] tracking-tight truncate">
                    {t("saveBtn")}
                  </span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SETTINGS MODAL */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div
              key="settings-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              key="settings-sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className={`absolute bottom-0 left-0 right-0 z-50 rounded-t-[32px] p-6 pb-12 shadow-2xl ${isDarkMode ? "bg-slate-800" : "bg-white"}`}
            >
              <div className="flex justify-between items-center mb-6">
                <h2
                  className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}
                >
                  {t("settings")}
                </h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className={`p-2 rounded-full ${isDarkMode ? "bg-slate-700 text-gray-300" : "bg-gray-100 text-gray-500"}`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                {/* Language Selector */}
                <div
                  className={`w-full flex items-center justify-between p-4 rounded-2xl transition-colors ${isDarkMode ? "bg-slate-700" : "bg-gray-50"}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-xl ${isDarkMode ? "bg-slate-600 text-blue-400" : "bg-white text-blue-600 shadow-sm"}`}
                    >
                      <Globe className="w-5 h-5" />
                    </div>
                    <span
                      className={`font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}
                    >
                      {t("language")}
                    </span>
                  </div>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as LanguageKey)}
                    className={`bg-transparent p-1 outline-none font-semibold cursor-pointer ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}
                  >
                    <option
                      value="en"
                      className={
                        isDarkMode
                          ? "bg-slate-800 text-white"
                          : "bg-white text-gray-900"
                      }
                    >
                      English
                    </option>
                    <option
                      value="es"
                      className={
                        isDarkMode
                          ? "bg-slate-800 text-white"
                          : "bg-white text-gray-900"
                      }
                    >
                      Español
                    </option>
                    <option
                      value="fr"
                      className={
                        isDarkMode
                          ? "bg-slate-800 text-white"
                          : "bg-white text-gray-900"
                      }
                    >
                      Français
                    </option>
                    <option
                      value="de"
                      className={
                        isDarkMode
                          ? "bg-slate-800 text-white"
                          : "bg-white text-gray-900"
                      }
                    >
                      Deutsch
                    </option>
                    <option
                      value="hi"
                      className={
                        isDarkMode
                          ? "bg-slate-800 text-white"
                          : "bg-white text-gray-900"
                      }
                    >
                      हिन्दी
                    </option>
                    <option
                      value="zh"
                      className={
                        isDarkMode
                          ? "bg-slate-800 text-white"
                          : "bg-white text-gray-900"
                      }
                    >
                      中文
                    </option>
                  </select>
                </div>

                {/* Upgrade App */}
                <button
                  onClick={() => {
                    setShowSettings(false);
                    setTimeout(() => setShowPremiumModal(true), 300);
                  }}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl transition-colors bg-gradient-to-r from-amber-200 via-yellow-400 to-orange-400 hover:from-amber-300 hover:to-orange-500 shadow-lg`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-xl bg-white/20 text-white backdrop-blur-sm`}
                    >
                      <Crown className="w-5 h-5 drop-shadow" />
                    </div>
                    <span className={`font-bold text-white drop-shadow-sm`}>
                      {t("upgradePremium")}
                    </span>
                  </div>
                </button>

                {/* Dark Mode Toggle */}
                <button
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl transition-colors ${isDarkMode ? "bg-slate-700 hover:bg-slate-600" : "bg-gray-50 hover:bg-gray-100"}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-xl ${isDarkMode ? "bg-slate-600 text-blue-400" : "bg-white text-blue-600 shadow-sm"}`}
                    >
                      {isDarkMode ? (
                        <Moon className="w-5 h-5" />
                      ) : (
                        <Sun className="w-5 h-5" />
                      )}
                    </div>
                    <span
                      className={`font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}
                    >
                      {t("darkMode")}
                    </span>
                  </div>
                  <div
                    className={`w-12 h-6 rounded-full transition-colors relative ${isDarkMode ? "bg-blue-600" : "bg-gray-300"}`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isDarkMode ? "left-7" : "left-1"}`}
                    />
                  </div>
                </button>

                {/* Share App */}
                <button
                  onClick={handleShareSystem}
                  className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-colors ${isDarkMode ? "bg-slate-700 hover:bg-slate-600" : "bg-gray-50 hover:bg-gray-100"}`}
                >
                  <div
                    className={`p-2 rounded-xl ${isDarkMode ? "bg-slate-600 text-blue-400" : "bg-white text-blue-600 shadow-sm"}`}
                  >
                    <Share2 className="w-5 h-5" />
                  </div>
                  <span
                    className={`font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}
                  >
                    {t("shareApp")}
                  </span>
                </button>

                {/* Rate Us */}
                <button
                  onClick={handleRateUs}
                  className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-colors ${isDarkMode ? "bg-slate-700 hover:bg-slate-600" : "bg-gray-50 hover:bg-gray-100"}`}
                >
                  <div
                    className={`p-2 rounded-xl text-yellow-500 ${isDarkMode ? "bg-slate-600" : "bg-white shadow-sm"}`}
                  >
                    <Star className="w-5 h-5 fill-current" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span
                      className={`font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}
                    >
                      {t("rateUs")}
                    </span>
                    <span
                      className={`text-xs ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}
                    >
                      {t("rateUsSubtitle")}
                    </span>
                  </div>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* PREMIUM UPGRADE MODAL */}
      <AnimatePresence>
        {showPremiumModal && (
          <>
            <motion.div
              key="premium-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPremiumModal(false)}
              className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
              style={{ paddingTop: (!isPremium && isNative) ? 'calc(env(safe-area-inset-top) + 60px)' : undefined }}
            >
              <motion.div
                key="premium-modal"
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className={`w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl relative ${isDarkMode ? "bg-slate-900 border border-slate-700" : "bg-white"}`}
              >
                <button
                  onClick={() => setShowPremiumModal(false)}
                  className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Header */}
                <div className="bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 px-6 py-10 text-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
                  <Crown className="w-16 h-16 text-white drop-shadow-lg mx-auto mb-4" />
                  <h2 className="text-3xl font-black text-white drop-shadow-md mb-2">
                    {t("upgradePremium")}
                  </h2>
                  <p className="text-white/90 font-medium text-sm px-4">
                    {t("premiumSubtitle")}
                  </p>
                </div>

                {/* Plans */}
                <div className="p-6 space-y-4">
                  {/* 12 Months */}
                  <button
                    onClick={() => setSelectedPremiumPlan("12months")}
                    className={`w-full text-left p-4 rounded-2xl border-2 transition-all relative ${selectedPremiumPlan === "12months" ? "border-orange-500 bg-orange-50" : isDarkMode ? "border-slate-700 hover:border-slate-600" : "border-gray-200 hover:border-gray-300"}`}
                  >
                    {selectedPremiumPlan === "12months" && (
                      <div className="absolute top-0 right-0 bg-gradient-to-r from-orange-500 to-rose-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-xl rounded-tr-xl">
                        {t("bestValue")}
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <div>
                        <h3
                          className={`font-bold ${isDarkMode && selectedPremiumPlan !== "12months" ? "text-white" : "text-gray-900"}`}
                        >
                          {t("yearly")}
                        </h3>
                        <p
                          className={`text-sm ${selectedPremiumPlan === "12months" ? "text-orange-700" : "text-gray-500"}`}
                        >
                          {t("billedTotal")} $18.00
                        </p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-xl font-black ${selectedPremiumPlan === "12months" ? "text-orange-600" : isDarkMode ? "text-white" : "text-gray-900"}`}
                        >
                          $1.50
                        </span>
                        <span
                          className={`text-xs font-semibold ${selectedPremiumPlan === "12months" ? "text-orange-600/70" : "text-gray-500"}`}
                        >
                          {t("perMonth")}
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* 6 Months */}
                  <button
                    onClick={() => setSelectedPremiumPlan("6months")}
                    className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${selectedPremiumPlan === "6months" ? "border-orange-500 bg-orange-50" : isDarkMode ? "border-slate-700 hover:border-slate-600" : "border-gray-200 hover:border-gray-300"}`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3
                          className={`font-bold ${isDarkMode && selectedPremiumPlan !== "6months" ? "text-white" : "text-gray-900"}`}
                        >
                          {t("sixMonths")}
                        </h3>
                        <p
                          className={`text-sm ${selectedPremiumPlan === "6months" ? "text-orange-700" : "text-gray-500"}`}
                        >
                          {t("billedTotal")} $10.80
                        </p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-xl font-black ${selectedPremiumPlan === "6months" ? "text-orange-600" : isDarkMode ? "text-white" : "text-gray-900"}`}
                        >
                          $1.80
                        </span>
                        <span
                          className={`text-xs font-semibold ${selectedPremiumPlan === "6months" ? "text-orange-600/70" : "text-gray-500"}`}
                        >
                          {t("perMonth")}
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* Monthly */}
                  <button
                    onClick={() => setSelectedPremiumPlan("monthly")}
                    className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${selectedPremiumPlan === "monthly" ? "border-orange-500 bg-orange-50" : isDarkMode ? "border-slate-700 hover:border-slate-600" : "border-gray-200 hover:border-gray-300"}`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3
                          className={`font-bold ${isDarkMode && selectedPremiumPlan !== "monthly" ? "text-white" : "text-gray-900"}`}
                        >
                          {t("monthly")}
                        </h3>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-xl font-black ${selectedPremiumPlan === "monthly" ? "text-orange-600" : isDarkMode ? "text-white" : "text-gray-900"}`}
                        >
                          $2.70
                        </span>
                        <span
                          className={`text-xs font-semibold ${selectedPremiumPlan === "monthly" ? "text-orange-600/70" : "text-gray-500"}`}
                        >
                          {t("perMonth")}
                        </span>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setIsPremium(true);
                      alert(
                        "Processing upgrade simulation via App Store / Play Store... Thanks for subscribing! You are now Premium and Ads are disabled.",
                      );
                      setShowPremiumModal(false);
                    }}
                    className="w-full mt-6 py-4 bg-gray-900 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-gray-800 hover:-translate-y-0.5 transition-all"
                  >
                    {t("subscribeBtn")}
                  </button>
                  <p className="text-center text-[10px] text-gray-400 mt-3 px-4 leading-tight">
                    Subscriptions auto-renew. Cancel anytime in your device
                    settings.
                  </p>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* MANUAL EDITOR MODAL */}
      <AnimatePresence>
        {showEditor && (originalImage || processedImage) && (
          <motion.div
            key="editor-modal"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute inset-0 z-50 md:rounded-3xl overflow-hidden bg-black md:inset-auto md:w-[480px] md:h-[90vh]"
          >
            <EditorCanvas
              imageSrc={baseStyledImage || cleanImage!}
              cleanImageSrc={cleanImage!}
              originalScreenshotSrc={originalImage || undefined}
              initialCropRect={customCropRect}
              initialCustomSize={customCanvasSize}
              initialImageOffset={customImageOffset}
              initialImageScale={customImageScale}
              initialPaths={editorPaths}
              initialTexts={editorTexts}
              onCancel={() => {
                setShowEditor(false);
                setEditorInitialTool("none");
                if (activeQuickFeature) {
                  setActiveQuickFeature(null);
                }
              }}
              styleName={selectedStyle}
              layoutName={selectedLayout}
              customBg={customBgColor}
              isPremium={isPremium}
              initialTool={editorInitialTool}
              isWatermarkMode={activeQuickFeature === "watermark"}
              onSave={async (
                newImgDataUrl,
                finalCleanSrc,
                finalPaths,
                finalTexts,
                customCrop,
                customSize,
                newOriginalSrc,
                newImageOffset,
                newImageScale
              ) => {
                if (activeQuickFeature) {
                  await triggerDownloadOfBase64(newImgDataUrl, `${activeQuickFeature}_edited.png`);
                  setShowEditor(false);
                  setEditorInitialTool("none");
                  setActiveQuickFeature(null);
                  return;
                }

                if (newOriginalSrc) {
                   setOriginalImage(newOriginalSrc);
                }
                setProcessedImage(newImgDataUrl);
                setCleanImage(finalCleanSrc);
                setEditorPaths(finalPaths);
                setEditorTexts(finalTexts);
                if (customSize) {
                  setCustomCanvasSize(customSize);
                } else if (customSize === null) {
                  setCustomCanvasSize(null);
                }
                if (newImageOffset) {
                  setCustomImageOffset(newImageOffset);
                }
                if (newImageScale !== undefined) {
                  setCustomImageScale(newImageScale);
                }
                if (customCrop) {
                  setCustomCropRect((prev) => {
                    if (
                      prev &&
                      prev.x === customCrop.x &&
                      prev.y === customCrop.y &&
                      prev.w === customCrop.w &&
                      prev.h === customCrop.h
                    ) {
                      return prev;
                    }
                    return customCrop;
                  });
                }
                setShowEditor(false);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* PHOTO TO PDF MODAL */}
      <AnimatePresence>
        {isPdfModalOpen && (
          <>
            <motion.div
              key="pdf-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsPdfModalOpen(false);
                setEditorInitialTool("none");
                if (activeQuickFeature) {
                  setActiveQuickFeature(null);
                }
              }}
              className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
              style={{ paddingTop: (!isPremium && isNative) ? 'calc(env(safe-area-inset-top) + 60px)' : undefined }}
            >
              <motion.div
                key="pdf-modal"
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className={`w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl relative ${isDarkMode ? "bg-slate-900 border border-slate-700 text-white" : "bg-white text-slate-800"}`}
              >
                <button
                  onClick={() => {
                    setIsPdfModalOpen(false);
                    setEditorInitialTool("none");
                    if (activeQuickFeature) {
                      setActiveQuickFeature(null);
                    }
                  }}
                  className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Header */}
                <div className="bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-600 px-6 py-8 text-center relative overflow-hidden animate-gradient">
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
                  <FileText className="w-16 h-16 text-white drop-shadow-lg mx-auto mb-3" />
                  <h2 className="text-2xl font-black text-white drop-shadow-md">
                    Convert Photo into PDF
                  </h2>
                  <p className="text-white/90 font-medium text-xs px-2 mt-1">
                    Export your custom screenshot or photo into a highly polished PDF document of your choice.
                  </p>
                </div>

                {/* Document Options */}
                <div className="p-6 space-y-5">
                  {/* Page Size Selection */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 pl-1">
                      Page Layout Size
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["A4", "Letter", "Original"] as const).map((size) => (
                        <button
                          key={size}
                          onClick={() => setPdfPageSize(size)}
                          className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all active:scale-[0.97] cursor-pointer ${
                            pdfPageSize === size
                              ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/10"
                              : isDarkMode
                              ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                              : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Orientation Settings */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 pl-1">
                      Page Orientation
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {["Portrait", "Landscape", "Auto Detect"].map((mode) => {
                        const val = mode === "Portrait" ? "portrait" : mode === "Landscape" ? "landscape" : "auto";
                        return (
                          <button
                            key={mode}
                            onClick={() => setPdfOrientation(val as any)}
                            className={`py-2 px-2 rounded-xl text-[11px] font-bold border transition-all active:scale-[0.97] cursor-pointer ${
                              pdfOrientation === val
                                ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/10"
                                : isDarkMode
                                ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                                : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            {mode}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Margins */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 pl-1">
                      Border Margins
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {["None (0pt)", "Thin (18pt)", "Normal (36pt)"].map((mode) => {
                        const val = mode.startsWith("None") ? "none" : mode.startsWith("Thin") ? "thin" : "normal";
                        return (
                          <button
                            key={mode}
                            onClick={() => setPdfMargin(val as any)}
                            className={`py-2 px-1 rounded-xl text-[10.5px] font-bold border transition-all active:scale-[0.97] cursor-pointer ${
                              pdfMargin === val
                                ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/10"
                                : isDarkMode
                                ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                                : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            {mode.split(" ")[0]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => {
                        setIsPdfModalOpen(false);
                        setEditorInitialTool("none");
                        if (activeQuickFeature) {
                          setActiveQuickFeature(null);
                        }
                      }}
                      className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer text-center ${
                        isDarkMode
                          ? "bg-slate-800 hover:bg-slate-700 text-slate-300"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      disabled={isGeneratingPdf}
                      onClick={async () => {
                        setIsGeneratingPdf(true);
                        try {
                          await convertPhotoToPdf(processedImage || cleanImage || originalImage!, {
                            pageSize: pdfPageSize,
                            orientation: pdfOrientation,
                            margin: pdfMargin,
                          });
                          setIsPdfModalOpen(false);
                          if (activeQuickFeature) {
                            setActiveQuickFeature(null);
                          }
                        } catch (err: any) {
                          alert("Error generating PDF: " + err?.message);
                        } finally {
                          setIsGeneratingPdf(false);
                        }
                      }}
                      className="flex-[2] py-3 px-4 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-indigo-505 via-purple-600 to-pink-600 hover:opacity-95 shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {isGeneratingPdf ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          <span>Download PDF</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ConverterModal
        isOpen={isConverterModalOpen}
        onClose={() => {
          setIsConverterModalOpen(false);
          if (activeQuickFeature) {
            setActiveQuickFeature(null);
          }
        }}
        imageData={originalImage}
        isDarkMode={isDarkMode}
        isPremium={isPremium}
      />

      <TextConverterModal
        isOpen={isTextModalOpen}
        onClose={() => {
          setIsTextModalOpen(false);
          if (activeQuickFeature === "text") {
            setActiveQuickFeature(null);
          }
        }}
        isDarkMode={isDarkMode}
        isPremium={isPremium}
      />
    </div>
  );
}
