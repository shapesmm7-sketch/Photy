import React, { useRef, useState, useEffect } from "react";
import {
  Share2,
  Download,
  Edit2,
  Crop,
  PenTool,
  Droplets,
  X,
  Check,
  Save,
  Type,
  Smile,
  Sun,
  Maximize,
  Eraser,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { removeBackground } from "@imgly/background-removal";
import { Styles, PhoneLayouts, applyStyle } from "./lib/imageProcessor";
import { PHONE_FRAMES } from "./lib/phoneFrames";
import { translations, LanguageKey } from "./i18n";
import { AdMobBanner, admobManager } from "./lib/admob";

type Tool = "none" | "crop" | "draw" | "blur" | "text" | "sticker" | "adjust" | "size" | "removebg";

interface TextItem {
  text: string;
  x: number;
  y: number;
  color: string;
  size: number;
  positionMode: "Top" | "Default" | "Bottom";
  fontName: string;
  rotation?: number;
  hasShadow?: boolean;
  isSticker?: boolean;
  stickerType?: "emoji" | "badge";
  badgeBg?: string;
}

const fontNames = [
  "Default",
  "Inter",
  "Montserrat",
  "Playfair Display",
  "EB Garamond",
  "Space Grotesk",
  "Oswald",
  "Anton",
  "Pacifico",
  "Serif",
  "Monospace",
  "Cursive"
];

const fontCSSMap: Record<string, string> = {
  "Default": "sans-serif",
  "Inter": "'Inter', sans-serif",
  "Montserrat": "'Montserrat', sans-serif",
  "Playfair Display": "'Playfair Display', serif",
  "EB Garamond": "'EB Garamond', serif",
  "Space Grotesk": "'Space Grotesk', sans-serif",
  "Oswald": "'Oswald', sans-serif",
  "Anton": "'Anton', sans-serif",
  "Pacifico": "'Pacifico', cursive",
  "Serif": "serif",
  "Monospace": "monospace",
  "Cursive": "cursive"
};
const textColors = [
  // Neutrals, Grayscale & Background Matchers
  "#FFFFFF", // Pure White (Common Page BG)
  "#F5F5F7", // Soft Off-White (Apple Style)
  "#FAF0E6", // Linen Cream (Very Common Document BG)
  "#FFFDD0", // Warm Cream
  "#F5F5DC", // Beige / Ivory
  "#E2E8F0", // Cool Slate Light
  "#CCCCCC", // Light Silver
  "#888888", // Medium Gray
  "#444444", // Dark Charcoal
  "#1E1E24", // Night Slate / Dark Mode BG
  "#000000", // Pure Black
  
  // Vibrant & Accent Colors
  "#FF3366", // Bright Rose / Magenta
  "#FF0000", // Ruby Red
  "#E53E3E", // Soft Red
  "#FF5722", // Deep Orange
  "#ED8936", // Bright Orange
  "#FFEB3B", // Electric Yellow
  "#F6E05E", // Pale Yellow
  "#ECC94B", // Golden Yellow
  "#4CAF50", // Emerald Green
  "#38A169", // Forest Green
  "#319795", // Deep Teal
  "#00BCD4", // Cyan
  "#2196F3", // Dododger Blue
  "#3182CE", // Steel Blue
  "#1A365D", // Navy Blue
  "#9C27B0", // Warm Purple
  "#805AD5", // Indigo/Violet
  "#D53F8C", // Vivid Pink
  "#AEC6CF", // Pastel Blue
  "#D3E2CD", // Sage Green
  "#8C7853", // Raw Umber / Khaki
  "#5C4033", // Espresso Brown
];

interface DrawingPath {
  points: { x: number; y: number }[];
  path2d: Path2D;
  color: string;
  width: number;
  isBlur: boolean;
}

interface EditorCanvasProps {
  imageSrc: string;
  cleanImageSrc?: string;
  originalScreenshotSrc?: string;
  initialCropRect?: { x: number; y: number; w: number; h: number } | null;
  initialCustomSize?: { width: number; height: number } | null;
  initialPaths?: DrawingPath[];
  initialTexts?: TextItem[];
  onSave: (
    dataUrl: string,
    cleanSrc: string,
    paths: DrawingPath[],
    texts: TextItem[],
    customCropRect?: { x: number; y: number; w: number; h: number } | null,
    customSize?: { width: number; height: number } | null,
  ) => void;
  onCancel: () => void;
  styleName?: string;
  layoutName?: string;
  customBg?: string | null;
  isPremium?: boolean;
}

export default function EditorCanvas({
  imageSrc,
  cleanImageSrc,
  originalScreenshotSrc,
  initialCropRect = null,
  initialCustomSize = null,
  initialPaths = [],
  initialTexts = [],
  onSave,
  onCancel,
  styleName,
  layoutName,
  customBg,
  isPremium = false,
}: EditorCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const blurCanvasRef = useRef<HTMLCanvasElement>(null);
  const scratchCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>("none");
  const [isApplyingCrop, setIsApplyingCrop] = useState(false);

  const getPadding = (w: number, h: number) => {
    const sName = styleName || "Minimal";
    const lName = layoutName || "None";
    const bgVal = customBg || null;

    const config = Styles[sName] || Styles["Minimal"];
    const layout = PhoneLayouts[lName] || PhoneLayouts["None"];

    let basePaddingFactor = config.paddingFactor;
    if (layout.name !== "None") {
      basePaddingFactor = Math.max(config.paddingFactor, 0.25);
    } else if (bgVal && sName === "Original") {
      basePaddingFactor = 0.15;
    }

    return Math.max(w, h) * basePaddingFactor;
  };

  const getScreenshotCenterAndScale = (rect: { x: number; y: number; w: number; h: number }) => {
    const sName = styleName || "Minimal";
    const lName = layoutName || "None";
    const bgVal = customBg || null;

    const config = Styles[sName] || Styles["Minimal"];
    const layout = PhoneLayouts[lName] || PhoneLayouts["None"];

    let basePaddingFactor = config.paddingFactor;
    if (layout.name !== "None") {
      basePaddingFactor = Math.max(config.paddingFactor, 0.25);
    } else if (bgVal && sName === "Original") {
      basePaddingFactor = 0.15;
    }

    const padding = Math.max(rect.w, rect.h) * basePaddingFactor;
    const styledW = rect.w + padding * 2;
    const styledH = rect.h + padding * 2;

    if (layout.name === "None") {
      return {
        centerX: rect.w / 2 + padding,
        centerY: rect.h / 2 + padding,
        scale: 1,
      };
    } else {
      const px = layout.deviceX !== undefined ? layout.deviceX : 0.5;
      const py = layout.deviceY !== undefined ? layout.deviceY : 0.5;
      const deviceScale = layout.deviceScale !== undefined ? layout.deviceScale : 0.85;

      const devX = styledW * px;
      const devY = styledH * py;
      const maxWidth = styledW * deviceScale;
      const maxHeight = styledH * deviceScale;

      let frameW = maxWidth;
      let frameH = maxHeight;
      let sRect = { top: 3.5, left: 3.5, width: 93, height: 93, radius: 10 }; // Generic fallback screen rect

      if (layout.deviceType === "custom" && layout.frameId) {
        const frameData = PHONE_FRAMES.find((f) => f.id === layout.frameId);
        if (frameData) {
          sRect = frameData.screenRect;
          const frameRatio = 9 / 16;
          frameW = maxWidth;
          frameH = maxWidth / frameRatio;

          if (frameH > maxHeight) {
            frameH = maxHeight;
            frameW = maxHeight * frameRatio;
          }
        }
      } else {
        let ratio = layout.isLandscape ? 19.5 / 9 : 9 / 19.5;
        if (layout.deviceType === "ipad") {
          ratio = layout.isLandscape ? 4 / 3 : 3 / 4;
        } else if (layout.deviceType === "samsung") {
          ratio = layout.isLandscape ? 20 / 9 : 9 / 20;
        }
        frameW = maxWidth;
        frameH = maxWidth / ratio;
        if (frameH > maxHeight) {
          frameH = maxHeight;
          frameW = maxHeight * ratio;
        }

        let swPercent = 90;
        let shPercent = 90;
        if (layout.deviceType === "iphone" || layout.deviceType === "samsung") {
          swPercent = 91;
          shPercent = 91;
        } else if (layout.deviceType === "ipad") {
          swPercent = 88;
          shPercent = 88;
        }
        sRect = {
          top: (100 - shPercent) / 2,
          left: (100 - swPercent) / 2,
          width: swPercent,
          height: shPercent,
          radius: 10,
        };
      }

      const screenCenterX = -frameW / 2 + (sRect.left / 100) * frameW + ((sRect.width / 100) * frameW) / 2;
      const screenCenterY = -frameH / 2 + (sRect.top / 100) * frameH + ((sRect.height / 100) * frameH) / 2;
      const screenW = (sRect.width / 100) * frameW;
      const screenH = (sRect.height / 100) * frameH;

      const isImgLandscape = rect.w > rect.h;
      const isScreenLandscape = screenW > screenH;
      const shouldRotate = isImgLandscape !== isScreenLandscape;

      const virtualImgW = shouldRotate ? rect.h : rect.w;
      const virtualImgH = shouldRotate ? rect.w : rect.h;

      const imgRatio = virtualImgW / virtualImgH;
      const screenRatio = screenW / screenH;

      let drawW = screenW;
      let drawH = screenW / imgRatio;
      if (imgRatio > screenRatio) {
        drawW = screenW;
        drawH = screenW / imgRatio;
        if (drawH < screenH) {
          drawH = screenH;
          drawW = screenH * imgRatio;
        }
      } else {
        drawH = screenH;
        drawW = screenH * imgRatio;
        if (drawW < screenW) {
          drawW = screenW;
          drawH = screenW / imgRatio;
        }
      }

      const scale = drawW / rect.w;

      return {
        centerX: devX + screenCenterX,
        centerY: devY + screenCenterY,
        scale,
      };
    }
  };
  const [isDrawing, setIsDrawing] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Base image state
  const styledImageRef = useRef<HTMLImageElement | null>(null);
  const rawScreenshotRef = useRef<HTMLImageElement | null>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const [cropRect, setCropRect] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const cropStartRef = useRef<{ x: number; y: number } | null>(null);
  const cropEndRef = useRef<{ x: number; y: number } | null>(null);
  const cropDragModeRef = useRef<"none" | "new" | "tl" | "tr" | "bl" | "br" | "t" | "b" | "l" | "r" | "move">("none");
  const dragStartPointRef = useRef<{ x: number; y: number } | null>(null);
  const dragStartCropRectRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const tempCropRectRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  // Focus and Zoom state
  const [zoomScale, setZoomScale] = useState(1);
  const [zoomOffset, setZoomOffset] = useState({ x: 0, y: 0 });
  const zoomStartRef = useRef<{ x: number; y: number } | null>(null);
  const zoomInitialScaleRef = useRef<number>(1);
  const zoomInitialDistanceRef = useRef<number | null>(null);
  const isPinchZoomingRef = useRef<boolean>(false);
  
  const isPinchingTextRef = useRef<boolean>(false);
  const textInitialAngleRef = useRef<number>(0);
  const textInitialBaseRotationRef = useRef<number>(0);
  const textInitialMidpointRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const textInitialPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const editorLastTapRef = useRef<number>(0);

  // Drawing state
  const [paths, setPaths] = useState<DrawingPath[]>(() => {
    // Regenerate Path2D objects to prevent WebKit detached memory segfaults on unmount/remount
    return initialPaths.map((p) => {
      const newPath = new Path2D();
      if (p.points && p.points.length > 0) {
        newPath.moveTo(p.points[0].x, p.points[0].y);
        for (let i = 1; i < p.points.length; i++) {
          newPath.lineTo(p.points[i].x, p.points[i].y);
        }
      }
      return { ...p, path2d: newPath };
    });
  });
  const currentPathRef = useRef<Path2D | null>(null);
  const drawingPointsRef = useRef<{ x: number; y: number }[]>([]);
  const [suggestedShape, setSuggestedShape] = useState<
    "Line" | "Circle" | null
  >(null);
  const [editingPathIndex, setEditingPathIndex] = useState<number>(-1);

  const detectShapeWeb = (points: { x: number; y: number }[]) => {
    if (points.length < 10) return null;
    const start = points[0];
    const end = points[points.length - 1];
    const directDist = Math.sqrt(
      Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2),
    );

    let pathDist = 0;
    for (let i = 0; i < points.length - 1; i++) {
      pathDist += Math.sqrt(
        Math.pow(points[i + 1].x - points[i].x, 2) +
          Math.pow(points[i + 1].y - points[i].y, 2),
      );
    }

    if (directDist > 0.9 * pathDist) return "Line";

    if (directDist < pathDist * 0.3) {
      const avgX = points.reduce((s, p) => s + p.x, 0) / points.length;
      const avgY = points.reduce((s, p) => s + p.y, 0) / points.length;
      const radii = points.map((p) =>
        Math.sqrt(Math.pow(p.x - avgX, 2) + Math.pow(p.y - avgY, 2)),
      );
      const avgRadius = radii.reduce((s, r) => s + r, 0) / radii.length;
      const variance =
        radii.reduce((s, r) => s + Math.pow(r - avgRadius, 2), 0) /
        radii.length;
      if (Math.sqrt(variance) < avgRadius * 0.25) return "Circle";
    }
    return null;
  };

  // Text state
  const [texts, setTexts] = useState<TextItem[]>(initialTexts);
  const [selectedTextIndex, setSelectedTextIndex] = useState<number | null>(null);

  // Advanced on-screen text/sticker drag/resize/rotate actions
  const textDragModeRef = useRef<"drag" | "resize_rotate" | null>(null);
  const initialTextSizeRef = useRef<number>(80);
  const initialTextRotationRef = useRef<number>(0);
  const initialPointerAngleRef = useRef<number>(0);
  const initialPointerDistRef = useRef<number>(100);

  const getTextBounds = (t: TextItem) => {
    let w = 40;
    let h = 40;
    if (t.isSticker) {
      if (t.stickerType === "badge") {
        const charCount = t.text.length;
        const widthPerChar = t.size * 0.55;
        w = Math.max(charCount * widthPerChar + t.size * 1.0, t.size * 1.5);
        h = t.size * 1.6;
      } else {
        // Emoji
        w = t.size * 1.25;
        h = t.size * 1.25;
      }
    } else {
      // Standard text
      const charCount = t.text.length;
      const widthPerChar = t.size * 0.55;
      w = Math.max(charCount * widthPerChar, 30) + 30;
      h = t.size * 1.35;
    }
    return { w, h };
  };

  const [showTextModal, setShowTextModal] = useState(false);
  const [editingTextIndex, setEditingTextIndex] = useState<number>(-1);
  const [currentText, setCurrentText] = useState("");
  const [textPositionMode, setTextPositionMode] = useState<
    "Top" | "Default" | "Bottom"
  >("Default");
  const [currentTextSize, setCurrentTextSize] = useState(80);
  const [currentTextColor, setCurrentTextColor] = useState("#FFFFFF");
  const [currentTextFont, setCurrentTextFont] = useState("Default");
  const [currentTextRotation, setCurrentTextRotation] = useState(0);
  const [currentTextShadow, setCurrentTextShadow] = useState(false);

  // Sticker & Emoji state
  const [showStickerPanel, setShowStickerPanel] = useState(false);
  const [selectedStickerTab, setSelectedStickerTab] = useState<"emoji" | "badge">("emoji");
  const [selectedStickerColor, setSelectedStickerColor] = useState("#FF3366");
  const [selectedStickerText, setSelectedStickerText] = useState("HOT");
  const [selectedStickerSize, setSelectedStickerSize] = useState(72);
  const [selectedStickerRotation, setSelectedStickerRotation] = useState(0);
  const [selectedStickerFont, setSelectedStickerFont] = useState("Inter");

  // Text drag & double-tap states
  const [draggingTextIndex, setDraggingTextIndex] = useState<number | null>(
    null,
  );
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastTapRef = useRef<{ time: number; textIndex: number }>({
    time: 0,
    textIndex: -1,
  });

  // Base screenshot image adjustments
  const [brightness, setBrightness] = useState<number>(100);

  // Draw and Blur active tool colors
  const [selectedDrawColor, setSelectedDrawColor] = useState<string>("#FF3366");
  const [selectedBlurColor, setSelectedBlurColor] =
    useState<string>("transparent");
  const [brushSize, setBrushSize] = useState<number>(45);
  const [isRemovingBackground, setIsRemovingBackground] = useState(false);
  const [removalProgress, setRemovalProgress] = useState(0);
  const [removalStatus, setRemovalStatus] = useState("");
  const [preBgRemovalImageSrc, setPreBgRemovalImageSrc] = useState<string | null>(null);

  // Size tool states
  const [canvasWidthInput, setCanvasWidthInput] = useState<string>("");
  const [canvasHeightInput, setCanvasHeightInput] = useState<string>("");
  const [manualCanvasSize, setManualCanvasSize] = useState<{ width: number; height: number } | null>(initialCustomSize);
  
  // Keep track of the clean image (no layout) for re-styling when canvas size changes.
  const [currentCleanSrc, setCurrentCleanSrc] = useState<string | null>(cleanImageSrc || originalScreenshotSrc || imageSrc);

  // Initialize and load images
  useEffect(() => {
    const img = new Image();
    let isCurrent = true;
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (!isCurrent) return;
      styledImageRef.current = img;
      
      if (activeTool !== "crop") {
        originalImageRef.current = img;
      }

      if (!originalScreenshotSrc) {
        rawScreenshotRef.current = img;
        if (activeTool === "crop") {
          originalImageRef.current = img;
        }
        if (!cropRect) {
          setCropRect({ x: 0, y: 0, w: img.width, h: img.height });
          setCanvasWidthInput(img.width.toString());
          setCanvasHeightInput(img.height.toString());
        }
      }

      const tryFit = () => {
        if (!isCurrent) return;
        if (containerRef.current && canvasRef.current && blurCanvasRef.current) {
          const activeImg = activeTool === "crop" ? (rawScreenshotRef.current || img) : img;
          const rect = { x: 0, y: 0, w: activeImg.width, h: activeImg.height };
          fitImageToContainer(activeImg, rect);
        } else {
          setTimeout(tryFit, 30);
        }
      };
      tryFit();
    };
    img.src = imageSrc;
    return () => {
      isCurrent = false;
    };
  }, [imageSrc, activeTool, originalScreenshotSrc]);

  // Load raw original screenshot
  useEffect(() => {
    if (!originalScreenshotSrc) return;
    const img = new Image();
    let isCurrent = true;
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (!isCurrent) return;
      rawScreenshotRef.current = img;

      if (activeTool === "crop") {
        originalImageRef.current = img;
      }

      if (initialCropRect) {
        setCropRect(initialCropRect);
      } else {
        const topH = Math.round(img.height * 0.04);
        const bottomH = Math.round(img.height * 0.05);
        const defaultCrop = {
          x: 0,
          y: topH,
          w: img.width,
          h: img.height - topH - bottomH,
        };
        setCropRect(defaultCrop);
      }

      const tryFit = () => {
        if (!isCurrent) return;
        if (containerRef.current && canvasRef.current && blurCanvasRef.current) {
          const activeImg = activeTool === "crop" ? img : (styledImageRef.current || img);
          const rect = { x: 0, y: 0, w: activeImg.width, h: activeImg.height };
          fitImageToContainer(activeImg, rect);
        } else {
          setTimeout(tryFit, 30);
        }
      };
      tryFit();
    };
    img.src = originalScreenshotSrc;
    return () => {
      isCurrent = false;
    };
  }, [originalScreenshotSrc, initialCropRect, activeTool]);

  // Sync originalImageRef whenever activeTool switches/images load
  useEffect(() => {
    originalImageRef.current = activeTool === "crop"
      ? (rawScreenshotRef.current || styledImageRef.current)
      : styledImageRef.current;
  }, [activeTool, styledImageRef.current, rawScreenshotRef.current]);

  useEffect(() => {
    // Only re-style when the active block isn't initializing (to avoid looping on mount)
    if (!currentCleanSrc) return;
    
    // We update the dynamic layout styling purely for the preview representation of the current layout with the new size!
    const timer = setTimeout(async () => {
      try {
        const sourceSrc = originalScreenshotSrc || currentCleanSrc;
        const finalCrop = originalScreenshotSrc ? cropRect : null;

        const newPreviewSrc = await applyStyle(
          sourceSrc,
          styleName,
          layoutName,
          [],
          15,
          customBg,
          finalCrop,
          manualCanvasSize
        );
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          styledImageRef.current = img;
          if (activeTool !== "crop") {
            originalImageRef.current = img;
            fitImageToContainer(img, { x: 0, y: 0, w: img.width, h: img.height });
          }
        };
        img.src = newPreviewSrc;
      } catch (err) {
        console.error("Failed to update layout preview on resize", err);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [manualCanvasSize, currentCleanSrc, originalScreenshotSrc, cropRect, styleName, layoutName, customBg]);

  // Increment AdMob interactions when tool changes, if not premium
  useEffect(() => {
    if (activeTool !== "none" && !isPremium) {
      admobManager.incrementInteractions();
    }
  }, [activeTool, isPremium]);

  // Handle resizing of container (with ResizeObserver for dynamic transitions) and tool change fitting
  useEffect(() => {
    if (originalImageRef.current) {
      const rect = { x: 0, y: 0, w: originalImageRef.current.width, h: originalImageRef.current.height };
      fitImageToContainer(originalImageRef.current, rect);
    }

    const handleResize = () => {
      if (originalImageRef.current) {
        const rect = { x: 0, y: 0, w: originalImageRef.current.width, h: originalImageRef.current.height };
        fitImageToContainer(originalImageRef.current, rect);
      }
    };
    window.addEventListener("resize", handleResize);

    let observer: ResizeObserver | null = null;
    if (containerRef.current) {
      observer = new ResizeObserver((entries) => {
        if (
          originalImageRef.current &&
          entries[0].contentRect.width > 0
        ) {
          const rect = activeTool === "crop"
            ? { x: 0, y: 0, w: originalImageRef.current.width, h: originalImageRef.current.height }
            : { x: 0, y: 0, w: originalImageRef.current.width, h: originalImageRef.current.height };
          
          fitImageToContainer(originalImageRef.current, rect);
        }
      });
      observer.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      if (observer) {
        observer.disconnect();
      }
    };
  }, [cropRect, activeTool]);

  const fitImageToContainer = (
    img: HTMLImageElement,
    rect: { x: number; y: number; w: number; h: number },
  ) => {
    if (!containerRef.current || !canvasRef.current || !blurCanvasRef.current)
      return;
    const container = containerRef.current;

    // Delay setting up canvas dimensions if the container layout is not complete (e.g. during animations)
    if (container.clientWidth <= 0 || container.clientHeight <= 0) {
      setTimeout(() => {
        if (originalImageRef.current === img) {
          fitImageToContainer(img, rect);
        }
      }, 50);
      return;
    }

    const hasTop =
      texts.some((t) => t.positionMode === "Top") ||
      (showTextModal && textPositionMode === "Top");
    const hasBottom =
      texts.some((t) => t.positionMode === "Bottom") ||
      (showTextModal && textPositionMode === "Bottom");

    // Fit logic
    const padding = 32;
    const cw = container.clientWidth - padding * 2;
    const ch = container.clientHeight - padding * 2;

    const topTextSize = Math.max(
      0,
      ...texts.filter((t) => t.positionMode === "Top").map((t) => t.size),
      showTextModal && textPositionMode === "Top" ? currentTextSize : 0,
    );
    const bottomTextSize = Math.max(
      0,
      ...texts.filter((t) => t.positionMode === "Bottom").map((t) => t.size),
      showTextModal && textPositionMode === "Bottom" ? currentTextSize : 0,
    );

    const topPad = 0;
    const bottomPad = 0;

    const virtualH = rect.h + topPad + bottomPad;

    const finalW = manualCanvasSize ? manualCanvasSize.width : rect.w;
    const finalH = manualCanvasSize ? manualCanvasSize.height : virtualH;

    // Calculate aspect ratios based on final dimensions
    const imageAspect = finalW / finalH;
    const containerAspect = cw / ch;

    let destW, destH;
    if (imageAspect > containerAspect) {
      destW = cw;
      destH = cw / imageAspect;
    } else {
      destH = ch;
      destW = ch * imageAspect;
    }

    // Set canvas resolution strictly to target size
    const canvasObj = canvasRef.current;
    const blurCanvasObj = blurCanvasRef.current;

    canvasObj.width = finalW;
    canvasObj.height = finalH;
    blurCanvasObj.width = finalW;
    blurCanvasObj.height = finalH;

    setCanvasSize({ width: destW, height: destH });

    // Re-prepare blurred version
    const bCtx = blurCanvasObj.getContext("2d");
    if (bCtx) {
      bCtx.clearRect(0, 0, blurCanvasObj.width, blurCanvasObj.height);
      const blurRadius = Math.max(25, Math.round(rect.w * 0.04));
      bCtx.filter = `blur(${blurRadius}px)`;
      bCtx.drawImage(
        img,
        rect.x,
        rect.y,
        rect.w,
        rect.h,
        0,
        topPad,
        rect.w,
        rect.h,
      );
      bCtx.filter = "none";
    }

    redraw(rect); // Pass rect to use latest crop
  };

  const drawBlurredPath = (
    ctx: CanvasRenderingContext2D,
    path2d: Path2D,
    width: number,
    color: string | undefined,
    topPad: number,
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!scratchCanvasRef.current) {
      scratchCanvasRef.current = document.createElement("canvas");
    }
    const scratch = scratchCanvasRef.current;
    if (scratch.width !== canvas.width || scratch.height !== canvas.height) {
      scratch.width = canvas.width;
      scratch.height = canvas.height;
    }
    const sCtx = scratch.getContext("2d");
    if (!sCtx) return;

    sCtx.clearRect(0, 0, scratch.width, scratch.height);

    sCtx.save();
    sCtx.lineCap = "round";
    sCtx.lineJoin = "round";
    sCtx.shadowColor = "#FFFFFF";
    sCtx.shadowBlur = width * 0.45; // Smooth feathered boundaries
    sCtx.strokeStyle = "#FFFFFF";
    sCtx.lineWidth = width * 0.75; // Sightly narrower core for smooth blending
    sCtx.stroke(path2d);
    sCtx.restore();

    sCtx.save();
    sCtx.globalCompositeOperation = "source-in";
    if (blurCanvasRef.current) {
      sCtx.drawImage(blurCanvasRef.current, 0, 0);
    }
    sCtx.restore();

    if (color && color !== "transparent") {
      sCtx.save();
      // Use source-over instead of source-atop to completely mask and redact underlying content
      sCtx.globalCompositeOperation = "source-over";
      sCtx.lineCap = "round";
      sCtx.lineJoin = "round";
      // Render feathered solid color overlay
      sCtx.shadowColor = color;
      sCtx.shadowBlur = width * 0.45;
      sCtx.strokeStyle = color;
      sCtx.lineWidth = width * 0.75;
      sCtx.globalAlpha = 1.0; // 100% solid opacity
      sCtx.stroke(path2d);
      sCtx.restore();
    }

    ctx.save();
    ctx.drawImage(scratch, 0, -topPad);
    ctx.restore();
  };

  const redraw = (
    currentCrop?: { x: number; y: number; w: number; h: number } | null,
    explicitPaths?: DrawingPath[],
    explicitTexts?: TextItem[]
  ) => {
    const canvas = canvasRef.current;
    const img = originalImageRef.current;
    if (!canvas || !img) return;

    let activeRect = currentCrop;
    if (!activeRect) {
      if (activeTool === "crop" && cropRect) {
        activeRect = cropRect;
      } else {
        activeRect = { x: 0, y: 0, w: img.width, h: img.height };
      }
    }
    if (!activeRect) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const topPad = 0;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background color if provided
    if (customBg) {
      ctx.fillStyle = customBg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const drawX = manualCanvasSize ? (canvas.width - activeRect.w) / 2 : 0;
    const drawY = manualCanvasSize ? (canvas.height - activeRect.h) / 2 : topPad;

    // Base image (cropped region or full original depending on activeRect)
    ctx.save();
    if (brightness !== 100) {
      ctx.filter = `brightness(${brightness}%)`;
    }
    ctx.drawImage(
      img,
      activeRect.x,
      activeRect.y,
      activeRect.w,
      activeRect.h,
      drawX,
      drawY,
      activeRect.w,
      activeRect.h,
    );
    ctx.restore();

    ctx.save();
    // Path drawing uses absolute coordinates from canvas

    if (activeTool !== "crop") {
      // Draw paths
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const pathsToDraw = explicitPaths || paths;
      pathsToDraw.forEach((p) => {
        if (p.isBlur) {
          drawBlurredPath(ctx, p.path2d, p.width, p.color, topPad);
        } else {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.width;
          ctx.stroke(p.path2d);
        }
      });

      // Draw texts
      const textsToDraw = explicitTexts || texts;
      textsToDraw.forEach((t) => {
        ctx.fillStyle = t.color;

        let fontStr = fontCSSMap[t.fontName] || "sans-serif";
        ctx.font = `bold ${t.size}px ${fontStr}`;

        ctx.textAlign = "center";

        ctx.save();
        ctx.translate(t.x, t.y);
        if (t.rotation) {
          ctx.rotate(t.rotation);
        }

        if (t.isSticker) {
          if (t.stickerType === "badge") {
            const padX = t.size * 0.5;
            const padY = t.size * 0.3;
            const textWidth = ctx.measureText(t.text).width;
            const bgW = textWidth + padX * 2;
            const bgH = t.size + padY * 2;
            const r = bgH / 2;

            ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
            ctx.shadowBlur = Math.max(6, t.size * 0.15);
            ctx.shadowOffsetX = Math.max(3, t.size * 0.08);
            ctx.shadowOffsetY = Math.max(3, t.size * 0.08);

            ctx.fillStyle = t.badgeBg || "#2563EB";
            ctx.beginPath();
            if (ctx.roundRect) {
              ctx.roundRect(-bgW / 2, -bgH / 2, bgW, bgH, r);
            } else {
              const x = -bgW / 2;
              const y = -bgH / 2;
              ctx.moveTo(x + r, y);
              ctx.lineTo(x + bgW - r, y);
              ctx.quadraticCurveTo(x + bgW, y, x + bgW, y + r);
              ctx.lineTo(x + bgW, y + bgH - r);
              ctx.quadraticCurveTo(x + bgW, y + bgH, x + bgW - r, y + bgH);
              ctx.lineTo(x + r, y + bgH);
              ctx.quadraticCurveTo(x, y + bgH, x, y + bgH - r);
              ctx.lineTo(x, y + r);
              ctx.quadraticCurveTo(x, y, x + r, y);
            }
            ctx.fill();

            ctx.shadowColor = "transparent";
            ctx.fillStyle = t.color || "#FFFFFF";
            ctx.textBaseline = "middle";
            ctx.fillText(t.text, 0, 0);
          } else {
            // Emoji
            ctx.font = `${t.size}px sans-serif`;
            ctx.textBaseline = "middle";
            ctx.textAlign = "center";
            if (t.hasShadow) {
              ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
              ctx.shadowBlur = Math.max(6, t.size * 0.15);
              ctx.shadowOffsetX = Math.max(3, t.size * 0.08);
              ctx.shadowOffsetY = Math.max(3, t.size * 0.08);
            }
            ctx.fillText(t.text, 0, 0);
          }
        } else {
          // Standard text
          if (t.hasShadow) {
            ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
            ctx.shadowBlur = Math.max(4, t.size * 0.15);
            ctx.shadowOffsetX = Math.max(2, t.size * 0.08);
            ctx.shadowOffsetY = Math.max(2, t.size * 0.08);
          }

          // Draw dark readable outline behind text
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = Math.max(2, t.size * 0.08);
          ctx.strokeText(t.text, 0, 0);
          ctx.fillText(t.text, 0, 0);
        }
        
        ctx.restore();
      });

      // Draw active selected text bounding box with interactive handles (Delete & Resize/Rotate)
      if (selectedTextIndex !== null && selectedTextIndex < texts.length) {
        const t = texts[selectedTextIndex];
        const bounds = getTextBounds(t);
        
        ctx.save();
        ctx.translate(t.x, t.y);
        if (t.rotation) {
          ctx.rotate(t.rotation);
        }

        // Draw dotted Cyan bounding box
        ctx.strokeStyle = "#22D3EE";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.strokeRect(-bounds.w / 2, -bounds.h / 2, bounds.w, bounds.h);
        ctx.setLineDash([]); // clear dash

        // Corner helper solid circles
        ctx.fillStyle = "#22D3EE";
        ctx.beginPath();
        ctx.arc(-bounds.w / 2, bounds.h / 2, 5, 0, Math.PI * 2);
        ctx.arc(bounds.w / 2, -bounds.h / 2, 5, 0, Math.PI * 2);
        ctx.fill();

        // Top-Left RED deletion handle
        const delRadius = 12;
        ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
        ctx.shadowBlur = 4;
        ctx.fillStyle = "#EF4444";
        ctx.beginPath();
        ctx.arc(-bounds.w / 2, -bounds.h / 2, delRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowColor = "transparent";

        // Draw white 'X' icon
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        const offset = 4.5;
        ctx.moveTo(-bounds.w / 2 - offset, -bounds.h / 2 - offset);
        ctx.lineTo(-bounds.w / 2 + offset, -bounds.h / 2 + offset);
        ctx.moveTo(-bounds.w / 2 + offset, -bounds.h / 2 - offset);
        ctx.lineTo(-bounds.w / 2 - offset, -bounds.h / 2 + offset);
        ctx.stroke();

        // Bottom-Right TEAL/GREEN Resize and Rotate handle
        const resRadius = 13;
        ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
        ctx.shadowBlur = 4;
        ctx.fillStyle = "#10B981";
        ctx.beginPath();
        ctx.arc(bounds.w / 2, bounds.h / 2, resRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowColor = "transparent";

        // Draw white diagonal arrows inside bottom-right handle
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 2;
        ctx.beginPath();
        // Diagonal arrow body line
        ctx.moveTo(bounds.w / 2 - 4.5, bounds.h / 2 - 4.5);
        ctx.lineTo(bounds.w / 2 + 4.5, bounds.h / 2 + 4.5);
        // Arrow heads
        ctx.moveTo(bounds.w / 2 + 4.5, bounds.h / 2);
        ctx.lineTo(bounds.w / 2 + 4.5, bounds.h / 2 + 4.5);
        ctx.lineTo(bounds.w / 2, bounds.h / 2 + 4.5);

        ctx.moveTo(bounds.w / 2 - 4.5, bounds.h / 2);
        ctx.lineTo(bounds.w / 2 - 4.5, bounds.h / 2 - 4.5);
        ctx.lineTo(bounds.w / 2, bounds.h / 2 - 4.5);
        ctx.stroke();

        ctx.restore();
      }

      // Draw temporary preview text if modal is open
      if (showTextModal && currentText.trim() && activeRect) {
        const size = currentTextSize;
        const x = canvas.width / 2;
        let y = activeRect.h / 2;

        if (textPositionMode === "Top") y = size + 10;
        if (textPositionMode === "Bottom") y = activeRect.h - 20;

        ctx.fillStyle = currentTextColor;
        ctx.globalAlpha = 0.8;

        let fontStr = fontCSSMap[currentTextFont] || "sans-serif";
        ctx.font = `bold ${size}px ${fontStr}`;
        ctx.textAlign = "center";

        ctx.save();
        ctx.translate(x, y);
        if (currentTextRotation) {
          ctx.rotate(currentTextRotation);
        }

        if (currentTextShadow) {
          ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
          ctx.shadowBlur = Math.max(4, size * 0.15);
          ctx.shadowOffsetX = Math.max(2, size * 0.08);
          ctx.shadowOffsetY = Math.max(2, size * 0.08);
        }

        // Draw dark readable outline behind temporary preview text
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = Math.max(2, size * 0.08);
        ctx.strokeText(currentText, 0, 0);

        ctx.fillText(currentText, 0, 0);
        ctx.restore();
        
        ctx.globalAlpha = 1.0;
      }
    }

    ctx.restore();

    if (activeTool === "crop") {
      // Draw crop overlay (darken outside the crop region)
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      let sx: number | undefined, sy: number | undefined, w: number | undefined, h: number | undefined;
      if (cropDragModeRef.current === "new" && cropStartRef.current && cropEndRef.current) {
        sx = Math.min(cropStartRef.current.x, cropEndRef.current.x);
        sy = Math.min(cropStartRef.current.y, cropEndRef.current.y);
        w = Math.abs(cropStartRef.current.x - cropEndRef.current.x);
        h = Math.abs(cropStartRef.current.y - cropEndRef.current.y);
      } else if (tempCropRectRef.current) {
        sx = tempCropRectRef.current.x;
        sy = tempCropRectRef.current.y;
        w = tempCropRectRef.current.w;
        h = tempCropRectRef.current.h;
      } else if (cropRect) {
        sx = cropRect.x;
        sy = cropRect.y;
        w = cropRect.w;
        h = cropRect.h;
      }

      if (sx !== undefined && sy !== undefined && w !== undefined && h !== undefined) {
        ctx.clearRect(sx, sy, w, h);
        
        // Redraw just the cropped portion of the image inside the clear area so it's beautifully bright and color-accurate
        ctx.drawImage(
          img,
          sx,
          sy,
          w,
          h,
          sx,
          sy,
          w,
          h
        );

        // Core outline of crop box
        ctx.strokeStyle = "#2563EB";
        ctx.lineWidth = Math.max(2.5, canvas.width * 0.005);
        ctx.strokeRect(sx, sy, w, h);

        // Elegant semi-transparent grid lines (thirds) like premium photo editors
        ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
        ctx.lineWidth = 1;
        // Verticals
        ctx.beginPath();
        ctx.moveTo(sx + w / 3, sy);
        ctx.lineTo(sx + w / 3, sy + h);
        ctx.moveTo(sx + (w * 2) / 3, sy);
        ctx.lineTo(sx + (w * 2) / 3, sy + h);
        // Horizontals
        ctx.moveTo(sx, sy + h / 3);
        ctx.lineTo(sx + w, sy + h / 3);
        ctx.moveTo(sx, sy + (h * 2) / 3);
        ctx.lineTo(sx + w, sy + (h * 2) / 3);
        ctx.stroke();

        // High contrast corner brackets/handles
        const handleSize = Math.max(14, canvas.width * 0.025);
        ctx.fillStyle = "#2563EB";
        const handleThickness = 4.5;
        // Top-Left
        ctx.fillRect(sx - 2, sy - 2, handleSize, handleThickness);
        ctx.fillRect(sx - 2, sy - 2, handleThickness, handleSize);
        // Top-Right
        ctx.fillRect(sx + w - handleSize + 2, sy - 2, handleSize, handleThickness);
        ctx.fillRect(sx + w - 2, sy - 2, handleThickness, handleSize);
        // Bottom-Left
        ctx.fillRect(sx - 2, sy + h - 2, handleSize, handleThickness);
        ctx.fillRect(sx - 2, sy + h - handleSize + 2, handleThickness, handleSize);
        // Bottom-Right
        ctx.fillRect(sx + w - handleSize + 2, sy + h - 2, handleSize, handleThickness);
        ctx.fillRect(sx + w - 2, sy + h - handleSize + 2, handleThickness, handleSize);
      }
    } else if (currentPathRef.current) {
      if (activeTool === "blur") {
        drawBlurredPath(ctx, currentPathRef.current, brushSize, selectedBlurColor, topPad);
      } else if (activeTool === "draw") {
        ctx.strokeStyle = selectedDrawColor;
        ctx.lineWidth = brushSize;
        ctx.stroke(currentPathRef.current);
      }
    }
  };

  // Trigger redraw when state changes for live preview
  useEffect(() => {
    if (originalImageRef.current) {
      const rect = { x: 0, y: 0, w: originalImageRef.current.width, h: originalImageRef.current.height };
      fitImageToContainer(originalImageRef.current, rect);
    } else {
      redraw();
    }
  }, [currentText, textPositionMode, texts, showTextModal, activeTool, selectedTextIndex]);

  useEffect(() => {
    redraw();
  }, [paths, brushSize, selectedDrawColor, selectedBlurColor, brightness]);

  const getCanvasPoint = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || !cropRect) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    let clientX, clientY;
    if ("touches" in e) {
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
      y: (clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if ("touches" in e && e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];

      if (draggingTextIndex !== null) {
        isPinchingTextRef.current = true;
        textInitialAngleRef.current = Math.atan2(touch2.clientY - touch1.clientY, touch2.clientX - touch1.clientX);
        textInitialBaseRotationRef.current = texts[draggingTextIndex].rotation || 0;
        textInitialMidpointRef.current = {
          x: (touch1.clientX + touch2.clientX) / 2,
          y: (touch1.clientY + touch2.clientY) / 2
        };
        textInitialPosRef.current = {
          x: texts[draggingTextIndex].x,
          y: texts[draggingTextIndex].y
        };
        return;
      }

      isPinchZoomingRef.current = true;
      setIsDrawing(false);
      currentPathRef.current = null;
      drawingPointsRef.current = [];
      setSuggestedShape(null);

      const dist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      zoomInitialDistanceRef.current = dist;
      zoomInitialScaleRef.current = zoomScale;
      zoomStartRef.current = {
        x: ((touch1.clientX + touch2.clientX) / 2) - zoomOffset.x,
        y: ((touch1.clientY + touch2.clientY) / 2) - zoomOffset.y
      };
      return;
    }

    if ("touches" in e && e.touches.length === 1 && isPinchZoomingRef.current) {
      return;
    }

    if ("touches" in e && e.touches.length === 1) {
      const now = Date.now();
      const DOUBLE_TAP_DELAY = 300;
      if (now - editorLastTapRef.current < DOUBLE_TAP_DELAY) {
        const pt = getCanvasPoint(e);
        const onText = texts.some((t) => {
          if (t.isSticker) {
            const hitSize = Math.max(t.size * 1.5, 44);
            const width = t.stickerType === "badge" ? Math.max(t.text.length * (t.size * 0.6), hitSize) + 20 : hitSize;
            return (
              pt.x > t.x - width / 2 &&
              pt.x < t.x + width / 2 &&
              pt.y > t.y - hitSize / 2 &&
              pt.y < t.y + hitSize / 2
            );
          }
          const height = t.size * 1.5;
          const width = Math.max(t.text.length * (t.size * 0.6), 30) + 20;
          return (
            pt.x > t.x - width / 2 &&
            pt.x < t.x + width / 2 &&
            pt.y < t.y + 10 &&
            pt.y > t.y - height + 10
          );
        });
        if (!onText) {
          if (zoomScale > 1.1) {
            setZoomScale(1);
            setZoomOffset({ x: 0, y: 0 });
          } else {
            setZoomScale(3);
            setZoomOffset({ x: 0, y: 0 });
          }
          editorLastTapRef.current = 0;
          return;
        }
      }
      editorLastTapRef.current = now;
    }

    const pt = getCanvasPoint(e);

    // 1. Check if we have an active selected text and if we hit its handles
    if (selectedTextIndex !== null && selectedTextIndex < texts.length) {
      const parentText = texts[selectedTextIndex];
      const bounds = getTextBounds(parentText);
      const dx = pt.x - parentText.x;
      const dy = pt.y - parentText.y;
      const rot = parentText.rotation || 0;
      
      // Convert clicked screen point to parent text's local/rotated coords
      const localX = dx * Math.cos(-rot) - dy * Math.sin(-rot);
      const localY = dx * Math.sin(-rot) + dy * Math.cos(-rot);

      const deleteX = -bounds.w / 2;
      const deleteY = -bounds.h / 2;
      const resizeX = bounds.w / 2;
      const resizeY = bounds.h / 2;

      const deleteRadius = 24; // Generous hit area for easy touch/mouse activation
      const resizeRadius = 24;

      if (Math.hypot(localX - deleteX, localY - deleteY) <= deleteRadius) {
        // HIT DELETE HANDLE
        const newTexts = [...texts];
        newTexts.splice(selectedTextIndex, 1);
        setTexts(newTexts);
        setSelectedTextIndex(null);
        setDraggingTextIndex(null);
        textDragModeRef.current = null;
        redraw(undefined, undefined, newTexts);
        return;
      }

      if (Math.hypot(localX - resizeX, localY - resizeY) <= resizeRadius) {
        // HIT RESIZE / ROTATE HANDLE
        textDragModeRef.current = "resize_rotate";
        setDraggingTextIndex(selectedTextIndex);
        initialTextSizeRef.current = parentText.size;
        initialTextRotationRef.current = parentText.rotation || 0;

        const currentDist = Math.hypot(pt.x - parentText.x, pt.y - parentText.y);
        initialPointerDistRef.current = currentDist > 0 ? currentDist : 1;

        const currentAngle = Math.atan2(pt.y - parentText.y, pt.x - parentText.x);
        initialPointerAngleRef.current = currentAngle;
        return;
      }
    }

    // 2. Hit test for texts to select them or start standard dragging
    const clickedTextIndex = texts.findIndex((t) => {
      const bounds = getTextBounds(t);
      const dx = pt.x - t.x;
      const dy = pt.y - t.y;
      const rot = t.rotation || 0;
      const localX = dx * Math.cos(-rot) - dy * Math.sin(-rot);
      const localY = dx * Math.sin(-rot) + dy * Math.cos(-rot);

      // Give a little margin of buffer for smaller icons or texts
      const pad = 12;
      return (
        localX > -bounds.w / 2 - pad &&
        localX < bounds.w / 2 + pad &&
        localY > -bounds.h / 2 - pad &&
        localY < bounds.h / 2 + pad
      );
    });

    if (clickedTextIndex >= 0) {
      setSelectedTextIndex(clickedTextIndex);
      textDragModeRef.current = "drag";
      setDraggingTextIndex(clickedTextIndex);
      dragOffsetRef.current = {
        x: pt.x - texts[clickedTextIndex].x,
        y: pt.y - texts[clickedTextIndex].y,
      };

      const now = Date.now();
      const doubleTapDelay = 300; // ms

      if (
        lastTapRef.current.textIndex === clickedTextIndex &&
        now - lastTapRef.current.time < doubleTapDelay
      ) {
        // Double Tap: Open edit modal
        const t = texts[clickedTextIndex];
        setEditingTextIndex(clickedTextIndex);
        if (t.isSticker) {
          setSelectedStickerText(t.text);
          setSelectedStickerColor(t.badgeBg || t.color);
          setSelectedStickerSize(t.size);
          setSelectedStickerRotation(t.rotation || 0);
          setSelectedStickerFont(t.fontName || "Inter");
          setActiveTool("sticker");
          setShowStickerPanel(true);
        } else {
          setCurrentText(t.text);
          setCurrentTextColor(t.color);
          setCurrentTextSize(t.size);
          setCurrentTextFont(t.fontName);
          setCurrentTextRotation(t.rotation || 0);
          setCurrentTextShadow(t.hasShadow || false);
          setTextPositionMode(t.positionMode);
          setActiveTool("text");
          setShowTextModal(true);
        }
        setDraggingTextIndex(null);
        textDragModeRef.current = null;
        lastTapRef.current = { time: 0, textIndex: -1 };
      } else {
        lastTapRef.current = { time: now, textIndex: clickedTextIndex };
      }
      return;
    } else {
      // Tap outside all text/stickers: deselect currently active bounding box
      setSelectedTextIndex(null);
    }

    // Hit test for paths (Draw/Blur)
    const clickedPathIndex = paths.findIndex((p) => {
      return p.points.some(
        (ppp) =>
          Math.sqrt(Math.pow(ppp.x - pt.x, 2) + Math.pow(ppp.y - pt.y, 2)) <
          p.width + 10,
      );
    });

    if (clickedPathIndex >= 0) {
      setEditingPathIndex(clickedPathIndex);
      // Give feedback by resetting tool? Or just allow deletion
      return;
    } else {
      setEditingPathIndex(-1);
    }

    if (activeTool === "none" || activeTool === "text") return;
    setIsDrawing(true);

    if (activeTool === "crop") {
      const threshold = Math.max(30, canvasRef.current!.width * 0.05);
      const cr = cropRect || { x: 0, y: 0, w: canvasRef.current!.width, h: canvasRef.current!.height };
      
      const isTL = Math.abs(pt.x - cr.x) < threshold && Math.abs(pt.y - cr.y) < threshold;
      const isTR = Math.abs(pt.x - (cr.x + cr.w)) < threshold && Math.abs(pt.y - cr.y) < threshold;
      const isBL = Math.abs(pt.x - cr.x) < threshold && Math.abs(pt.y - (cr.y + cr.h)) < threshold;
      const isBR = Math.abs(pt.x - (cr.x + cr.w)) < threshold && Math.abs(pt.y - (cr.y + cr.h)) < threshold;

      if (isTL) {
        cropDragModeRef.current = "tl";
      } else if (isTR) {
        cropDragModeRef.current = "tr";
      } else if (isBL) {
        cropDragModeRef.current = "bl";
      } else if (isBR) {
        cropDragModeRef.current = "br";
      } else {
        const nearTop = Math.abs(pt.y - cr.y) < threshold && pt.x >= cr.x - threshold && pt.x <= cr.x + cr.w + threshold;
        const nearBottom = Math.abs(pt.y - (cr.y + cr.h)) < threshold && pt.x >= cr.x - threshold && pt.x <= cr.x + cr.w + threshold;
        const nearLeft = Math.abs(pt.x - cr.x) < threshold && pt.y >= cr.y - threshold && pt.y <= cr.y + cr.h + threshold;
        const nearRight = Math.abs(pt.x - (cr.x + cr.w)) < threshold && pt.y >= cr.y - threshold && pt.y <= cr.y + cr.h + threshold;

        let bestEdge: "t" | "b" | "l" | "r" | null = null;
        let minDist = Infinity;

        if (nearTop) {
          const dist = Math.abs(pt.y - cr.y);
          if (dist < minDist) {
            minDist = dist;
            bestEdge = "t";
          }
        }
        if (nearBottom) {
          const dist = Math.abs(pt.y - (cr.y + cr.h));
          if (dist < minDist) {
            minDist = dist;
            bestEdge = "b";
          }
        }
        if (nearLeft) {
          const dist = Math.abs(pt.x - cr.x);
          if (dist < minDist) {
            minDist = dist;
            bestEdge = "l";
          }
        }
        if (nearRight) {
          const dist = Math.abs(pt.x - (cr.x + cr.w));
          if (dist < minDist) {
            minDist = dist;
            bestEdge = "r";
          }
        }

        if (bestEdge) {
          cropDragModeRef.current = bestEdge;
        } else {
          const isInside = pt.x > cr.x + threshold && pt.x < cr.x + cr.w - threshold && pt.y > cr.y + threshold && pt.y < cr.y + cr.h - threshold;
          if (isInside) {
            cropDragModeRef.current = "move";
          } else {
            cropDragModeRef.current = "new";
          }
        }
      }

      if (cropDragModeRef.current === "new") {
        cropStartRef.current = pt;
        cropEndRef.current = pt;
        tempCropRectRef.current = null;
      } else {
        dragStartPointRef.current = pt;
        dragStartCropRectRef.current = { ...cr };
        tempCropRectRef.current = { ...cr };
      }
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
    if ("touches" in e && e.touches.length === 2) {
      e.preventDefault();

      const touch1 = e.touches[0];
      const touch2 = e.touches[1];

      if (isPinchingTextRef.current && draggingTextIndex !== null) {
        const currentAngle = Math.atan2(touch2.clientY - touch1.clientY, touch2.clientX - touch1.clientX);
        const deltaAngle = currentAngle - textInitialAngleRef.current;
        
        const rect = canvasRef.current!.getBoundingClientRect();
        const scaleX = canvasRef.current!.width / rect.width;
        const scaleY = canvasRef.current!.height / rect.height;

        const currentMidpoint = {
          x: (touch1.clientX + touch2.clientX) / 2,
          y: (touch1.clientY + touch2.clientY) / 2
        };

        const deltaX = (currentMidpoint.x - textInitialMidpointRef.current.x) * scaleX;
        const deltaY = (currentMidpoint.y - textInitialMidpointRef.current.y) * scaleY;
        
        const nextTexts = [...texts];
        if (nextTexts[draggingTextIndex]) {
          nextTexts[draggingTextIndex] = {
            ...nextTexts[draggingTextIndex],
            x: textInitialPosRef.current.x + deltaX,
            y: textInitialPosRef.current.y + deltaY,
            rotation: textInitialBaseRotationRef.current + deltaAngle,
          };
        }
        setTexts(nextTexts);
        redraw(undefined, undefined, nextTexts);
        return;
      }

      isPinchZoomingRef.current = true;
      setIsDrawing(false);
      currentPathRef.current = null;
      drawingPointsRef.current = [];
      setSuggestedShape(null);
      if (zoomInitialDistanceRef.current && zoomStartRef.current) {
        const dist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
        const factor = dist / zoomInitialDistanceRef.current;
        const newScale = Math.max(1, Math.min(6, zoomInitialScaleRef.current * factor));
        setZoomScale(newScale);

        if (newScale > 1) {
          const midX = (touch1.clientX + touch2.clientX) / 2;
          const midY = (touch1.clientY + touch2.clientY) / 2;
          setZoomOffset({
            x: midX - zoomStartRef.current.x,
            y: midY - zoomStartRef.current.y
          });
        } else {
          setZoomOffset({ x: 0, y: 0 });
        }
      }
      return;
    }

    if ("touches" in e && isPinchZoomingRef.current) {
      return;
    }

    const pt = getCanvasPoint(e);

    if (draggingTextIndex !== null) {
      e.preventDefault();
      const nextTexts = [...texts];
      if (nextTexts[draggingTextIndex]) {
        if (textDragModeRef.current === "resize_rotate") {
          const parentText = nextTexts[draggingTextIndex];
          const rCurrent = Math.hypot(pt.x - parentText.x, pt.y - parentText.y);
          const sizeNew = Math.max(12, Math.min(300, Math.round(initialTextSizeRef.current * (rCurrent / initialPointerDistRef.current))));
          
          const currentAngle = Math.atan2(pt.y - parentText.y, pt.x - parentText.x);
          const angleDiff = currentAngle - initialPointerAngleRef.current;
          const rotationNew = initialTextRotationRef.current + angleDiff;
          
          nextTexts[draggingTextIndex] = {
            ...parentText,
            size: sizeNew,
            rotation: rotationNew,
          };
        } else {
          // Standard move/dragging
          const newX = pt.x - dragOffsetRef.current.x;
          const newY = pt.y - dragOffsetRef.current.y;
          nextTexts[draggingTextIndex] = {
            ...nextTexts[draggingTextIndex],
            x: newX,
            y: newY,
            positionMode: "Default",
          };
        }
      }
      setTexts(nextTexts);
      redraw(undefined, undefined, nextTexts);
      return;
    }

    if (!isDrawing || activeTool === "none") return;
    e.preventDefault();

    if (activeTool === "crop") {
      if (cropDragModeRef.current === "new") {
        cropEndRef.current = pt;
      } else if (dragStartCropRectRef.current && dragStartPointRef.current) {
        const dx = pt.x - dragStartPointRef.current.x;
        const dy = pt.y - dragStartPointRef.current.y;
        const startRect = dragStartCropRectRef.current;
        let newRect = { ...startRect };
        
        if (cropDragModeRef.current === "move") {
           newRect.x += dx;
           newRect.y += dy;
        } else {
           if (cropDragModeRef.current.includes("t")) {
               newRect.y += dy;
               newRect.h -= dy;
           }
           if (cropDragModeRef.current.includes("b")) {
               newRect.h += dy;
           }
           if (cropDragModeRef.current.includes("l")) {
               newRect.x += dx;
               newRect.w -= dx;
           }
           if (cropDragModeRef.current.includes("r")) {
               newRect.w += dx;
           }
        }
        
        // fix negative w/h
        if (newRect.w < 20) {
            if (cropDragModeRef.current.includes("l")) newRect.x -= (20 - newRect.w);
            newRect.w = 20;
        }
        if (newRect.h < 20) {
            if (cropDragModeRef.current.includes("t")) newRect.y -= (20 - newRect.h);
            newRect.h = 20;
        }

        const img = originalImageRef.current;
        if (img) {
          // Restrict to bounds
          if (newRect.x < 0) {
             if (cropDragModeRef.current.includes("l")) newRect.w += newRect.x;
             newRect.x = 0;
          }
          if (newRect.y < 0) {
             if (cropDragModeRef.current.includes("t")) newRect.h += newRect.y;
             newRect.y = 0;
          }
          if (newRect.x + newRect.w > img.width) {
             newRect.w = img.width - newRect.x;
          }
          if (newRect.y + newRect.h > img.height) {
             newRect.h = img.height - newRect.y;
          }
        }
        
        tempCropRectRef.current = newRect;
      }
    } else if (currentPathRef.current) {
      currentPathRef.current.lineTo(pt.x, pt.y);
      drawingPointsRef.current.push(pt);
    }
    redraw();
  };

  const handlePointerUp = (e?: React.MouseEvent | React.TouchEvent) => {
    isPinchingTextRef.current = false;
    
    if (e && "touches" in e) {
      if (e.touches.length === 0) {
        if (isPinchZoomingRef.current) {
          isPinchZoomingRef.current = false;
          zoomStartRef.current = null;
          zoomInitialDistanceRef.current = null;
          if (zoomScale <= 1.05) {
            setZoomScale(1);
            setZoomOffset({ x: 0, y: 0 });
          }
          return;
        }
      } else if (e.touches.length === 1 && isPinchZoomingRef.current) {
        const touch = e.touches[0];
        zoomStartRef.current = {
          x: touch.clientX - zoomOffset.x,
          y: touch.clientY - zoomOffset.y
        };
        zoomInitialDistanceRef.current = null;
        return;
      }
    }

    if (isPinchZoomingRef.current) {
      return;
    }

    if (draggingTextIndex !== null) {
      setDraggingTextIndex(null);
      textDragModeRef.current = null;
      redraw();
      return;
    }

    if (!isDrawing) return;
    setIsDrawing(false);

    if (
      activeTool === "crop" &&
      originalImageRef.current
    ) {
      let newRect: { x: number; y: number; w: number; h: number } | null = null;
      if (cropDragModeRef.current === "new" && cropStartRef.current && cropEndRef.current) {
        const sx = Math.min(cropStartRef.current.x, cropEndRef.current.x);
        const sy = Math.min(cropStartRef.current.y, cropEndRef.current.y);
        const w = Math.abs(cropStartRef.current.x - cropEndRef.current.x);
        const h = Math.abs(cropStartRef.current.y - cropEndRef.current.y);
  
        // Check if crop area is reasonably large, else ignore
        if (w > 20 && h > 20) {
          const img = originalImageRef.current;
          const xCoord = Math.max(0, Math.min(img.width - 20, Math.round(sx)));
          const yCoord = Math.max(0, Math.min(img.height - 20, Math.round(sy)));
          const wVal = Math.max(20, Math.min(img.width - xCoord, Math.round(w)));
          const hVal = Math.max(20, Math.min(img.height - yCoord, Math.round(h)));
  
          newRect = { x: xCoord, y: yCoord, w: wVal, h: hVal };
        }
      } else if (cropDragModeRef.current !== "new" && tempCropRectRef.current) {
         newRect = tempCropRectRef.current;
      }
      
      if (newRect && cropRect) {
        const oldSetup = getScreenshotCenterAndScale(cropRect);
        const newSetup = getScreenshotCenterAndScale(newRect);
        const drawScale = newSetup.scale / oldSetup.scale;

        // Always update text positions, text size, drawing path points, and drawing path stroke widths
        const nextTexts = texts.map((t) => {
          const rx_rel = (t.x - oldSetup.centerX) / oldSetup.scale;
          const ry_rel = (t.y - oldSetup.centerY) / oldSetup.scale;

          const rx_abs = cropRect.x + cropRect.w / 2 + rx_rel;
          const ry_abs = cropRect.y + cropRect.h / 2 + ry_rel;

          const rx_new_rel = rx_abs - (newRect.x + newRect.w / 2);
          const ry_new_rel = ry_abs - (newRect.y + newRect.h / 2);

          const new_x = newSetup.centerX + rx_new_rel * newSetup.scale;
          const new_y = newSetup.centerY + ry_new_rel * newSetup.scale;

          return {
            ...t,
            x: new_x,
            y: new_y,
            size: Math.max(8, Math.round(t.size * drawScale)),
          };
        });
        setTexts(nextTexts);

        const nextPaths = paths.map((p) => {
          const nextPoints = p.points.map((pt) => {
            const rx_rel = (pt.x - oldSetup.centerX) / oldSetup.scale;
            const ry_rel = (pt.y - oldSetup.centerY) / oldSetup.scale;

            const rx_abs = cropRect.x + cropRect.w / 2 + rx_rel;
            const ry_abs = cropRect.y + cropRect.h / 2 + ry_rel;

            const rx_new_rel = rx_abs - (newRect.x + newRect.w / 2);
            const ry_new_rel = ry_abs - (newRect.y + newRect.h / 2);

            const new_x = newSetup.centerX + rx_new_rel * newSetup.scale;
            const new_y = newSetup.centerY + ry_new_rel * newSetup.scale;

            return { x: new_x, y: new_y };
          });

          const path2d = new Path2D();
          if (nextPoints.length > 0) {
            path2d.moveTo(nextPoints[0].x, nextPoints[0].y);
            for (let i = 1; i < nextPoints.length; i++) {
              path2d.lineTo(nextPoints[i].x, nextPoints[i].y);
            }
          }
          return {
            ...p,
            points: nextPoints,
            path2d,
            width: Math.max(1, Math.round(p.width * drawScale)),
          };
        });
        setPaths(nextPaths);

        // Scale current helper states so that subsequent drawings/texts match the new crop size
        setBrushSize((prev) => Math.max(1, Math.round(prev * drawScale)));
        setCurrentTextSize((prev) => Math.max(8, Math.round(prev * drawScale)));

        setCropRect(newRect);
      }
      
      cropStartRef.current = null;
      cropEndRef.current = null;
      tempCropRectRef.current = null;
      cropDragModeRef.current = "none";
    } else if (currentPathRef.current && canvasRef.current) {
      const color =
        activeTool === "draw" ? selectedDrawColor : selectedBlurColor;
      const width = brushSize;

      const newPaths = [
        ...paths,
        {
          points: [...drawingPointsRef.current],
          path2d: currentPathRef.current,
          color,
          width: width,
          isBlur: activeTool === "blur",
        },
      ];
      setPaths(newPaths);

      if (activeTool === "draw") {
        const shape = detectShapeWeb(drawingPointsRef.current);
        setSuggestedShape(shape);
      }
      currentPathRef.current = null;
      redraw(undefined, newPaths);
      return;
    }

    redraw();
  };

  const handleAddText = () => {
    if (!canvasRef.current || !currentText.trim() || !cropRect) return;
    const canvas = canvasRef.current;

    const size = currentTextSize;
    let x = canvas.width / 2;
    let y = canvas.height / 2;

    const topTextSize = Math.max(
      0,
      ...texts.filter((t) => t.positionMode === "Top").map((t) => t.size),
      showTextModal && textPositionMode === "Top" ? currentTextSize : 0,
    );
    const topPad = 0;

    if (editingTextIndex >= 0 && textPositionMode === "Default") {
      x = texts[editingTextIndex].x;
      y = texts[editingTextIndex].y;
    } else {
      if (textPositionMode === "Top") y = size + 10;
      if (textPositionMode === "Bottom") y = canvas.height - 20;
    }

    const newText: TextItem = {
      text: currentText,
      x,
      y,
      color: currentTextColor,
      size: currentTextSize,
      positionMode: textPositionMode,
      fontName: currentTextFont,
      rotation: currentTextRotation,
      hasShadow: currentTextShadow,
    };

    let finalTexts;
    let selectedIdx = -1;
    if (editingTextIndex >= 0) {
      const newTexts = [...texts];
      newTexts[editingTextIndex] = newText;
      setTexts(newTexts);
      finalTexts = newTexts;
      selectedIdx = editingTextIndex;
    } else {
      finalTexts = [...texts, newText];
      setTexts(finalTexts);
      selectedIdx = finalTexts.length - 1;
    }

    setEditingTextIndex(-1);
    setSelectedTextIndex(selectedIdx);
    setShowTextModal(false);
    setActiveTool("none");
    setCurrentText("");
    redraw(undefined, undefined, finalTexts);
  };

  const handleDeleteText = () => {
    let finalTexts = texts;
    if (editingTextIndex >= 0) {
      const newTexts = [...texts];
      newTexts.splice(editingTextIndex, 1);
      setTexts(newTexts);
      finalTexts = newTexts;
    }
    setEditingTextIndex(-1);
    setShowTextModal(false);
    setShowStickerPanel(false);
    setActiveTool("none");
    setCurrentText("");
    redraw(undefined, undefined, finalTexts);
  };

  const handleAddSticker = (stickerText: string, type: "emoji" | "badge") => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    const size = selectedStickerSize;
    let x = canvas.width / 2;
    let y = canvas.height / 2;

    if (editingTextIndex >= 0) {
      x = texts[editingTextIndex].x;
      y = texts[editingTextIndex].y;
    } else {
      // Small random dispersion so they don't map exactly on top of each other
      x += (Math.random() - 0.5) * 60;
      y += (Math.random() - 0.5) * 60;
    }

    const newSticker: TextItem = {
      text: stickerText,
      x,
      y,
      color: type === "badge" ? "#FFFFFF" : selectedStickerColor,
      size,
      positionMode: "Default",
      fontName: selectedStickerFont,
      rotation: selectedStickerRotation,
      hasShadow: true,
      isSticker: true,
      stickerType: type,
      badgeBg: type === "badge" ? selectedStickerColor : undefined,
    };

    let finalTexts;
    let selectedIdx = -1;
    if (editingTextIndex >= 0) {
      const newTexts = [...texts];
      newTexts[editingTextIndex] = newSticker;
      setTexts(newTexts);
      finalTexts = newTexts;
      selectedIdx = editingTextIndex;
    } else {
      finalTexts = [...texts, newSticker];
      setTexts(finalTexts);
      selectedIdx = finalTexts.length - 1;
    }

    setEditingTextIndex(-1);
    setSelectedTextIndex(selectedIdx);
    setShowStickerPanel(false);
    setActiveTool("none");
    redraw(undefined, undefined, finalTexts);
  };

  const handleUpdateActiveStickerSize = (newSize: number) => {
    setSelectedStickerSize(newSize);
    if (editingTextIndex >= 0) {
      const nextTexts = [...texts];
      nextTexts[editingTextIndex] = {
        ...nextTexts[editingTextIndex],
        size: newSize
      };
      setTexts(nextTexts);
      redraw(undefined, undefined, nextTexts);
    }
  };

  const handleUpdateActiveStickerRotation = (newRotRad: number) => {
    setSelectedStickerRotation(newRotRad);
    if (editingTextIndex >= 0) {
      const nextTexts = [...texts];
      nextTexts[editingTextIndex] = {
        ...nextTexts[editingTextIndex],
        rotation: newRotRad
      };
      setTexts(nextTexts);
      redraw(undefined, undefined, nextTexts);
    }
  };

  const handleUpdateActiveStickerColor = (newColor: string) => {
    setSelectedStickerColor(newColor);
    if (editingTextIndex >= 0) {
      const nextTexts = [...texts];
      const t = nextTexts[editingTextIndex];
      nextTexts[editingTextIndex] = {
        ...t,
        badgeBg: t.stickerType === "badge" ? newColor : undefined,
        color: t.stickerType === "badge" ? "#FFFFFF" : newColor
      };
      setTexts(nextTexts);
      redraw(undefined, undefined, nextTexts);
    }
  };

  const handleUpdateActiveStickerText = (newText: string) => {
    setSelectedStickerText(newText);
    if (editingTextIndex >= 0) {
      const nextTexts = [...texts];
      nextTexts[editingTextIndex] = {
        ...nextTexts[editingTextIndex],
        text: newText
      };
      setTexts(nextTexts);
      redraw(undefined, undefined, nextTexts);
    }
  };

  const handleUpdateActiveStickerFont = (newFont: string) => {
    setSelectedStickerFont(newFont);
    if (editingTextIndex >= 0) {
      const nextTexts = [...texts];
      nextTexts[editingTextIndex] = {
        ...nextTexts[editingTextIndex],
        fontName: newFont
      };
      setTexts(nextTexts);
      redraw(undefined, undefined, nextTexts);
    }
  };

  const handleRemoveBackground = async () => {
    if (isRemovingBackground) return;
    
    setIsRemovingBackground(true);
    setRemovalProgress(0);
    setRemovalStatus("Initializing model...");
    
    try {
      // Scale down image before background removal to prevent memory crashes
      const img = new Image();
      img.src = imageSrc;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const MAX_DIMENSION = 1000;
      let width = img.width;
      let height = img.height;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
      }
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.9);
      });

      const resultBlob = await removeBackground(blob, {
        publicPath: "https://static.imgly.com/@imgly/background-removal-data/1.7.0/dist/",
        debug: true,
        progress: (key, current, total) => {
          console.log(`BGremo progress: ${key} ${current}/${total}`);
          setRemovalStatus(key.replace("fetch:", "Downloading ").replace("compute:", "Processing "));
          if (total > 0) {
            setRemovalProgress(Math.round((current / total) * 100));
          }
        }
      });
      
      setRemovalStatus("Finalizing...");
      setRemovalProgress(100);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const img = new Image();
        img.onload = () => {
          setPreBgRemovalImageSrc(imageSrc);
          styledImageRef.current = img;
          originalImageRef.current = img;
          onSave(base64, base64, paths, texts, cropRect, manualCanvasSize);
          setIsRemovingBackground(false);
          setRemovalStatus("");
          setRemovalProgress(0);
          setActiveTool("none");
        };
        img.onerror = () => {
          console.error("Failed to load processing result");
          setIsRemovingBackground(false);
          setRemovalStatus("Error loading result");
        };
        img.src = base64;
      };
      reader.readAsDataURL(resultBlob);
    } catch (error) {
      console.error("Failed to remove background:", error);
      setIsRemovingBackground(false);
      setRemovalStatus("");
      setRemovalProgress(0);
      alert("Background removal failed. This can happen on low-memory devices or slow connections.");
    }
  };

  const handleUndoRemoveBackground = () => {
    if (preBgRemovalImageSrc) {
      const img = new Image();
      img.onload = () => {
        styledImageRef.current = img;
        originalImageRef.current = img;
        onSave(preBgRemovalImageSrc, preBgRemovalImageSrc, paths, texts, cropRect, manualCanvasSize);
        setPreBgRemovalImageSrc(null);
        setActiveTool("none");
      };
      img.src = preBgRemovalImageSrc;
    }
  };

  const handleApplySaveCrop = async () => {
    const screenshotSrc = originalScreenshotSrc || imageSrc;
    if (!screenshotSrc || !cropRect) return;

    const img = rawScreenshotRef.current || originalImageRef.current;
    if (!img) return;

    setIsApplyingCrop(true);

    try {
      // 1. Generate the clean cropped image from raw unstyled screenshot
      const cleanCanvas = document.createElement("canvas");
      cleanCanvas.width = cropRect.w;
      cleanCanvas.height = cropRect.h;
      const cCtx = cleanCanvas.getContext("2d");
      if (!cCtx) {
        setIsApplyingCrop(false);
        return;
      }

      cCtx.drawImage(
        img,
        cropRect.x,
        cropRect.y,
        cropRect.w,
        cropRect.h,
        0,
        0,
        cropRect.w,
        cropRect.h,
      );
      const cleanDataUrl = cleanCanvas.toDataURL("image/png");

      // 2. Run applyStyle to dynamically generate the new base styled mockup!
      const newStyledDataUrl = await applyStyle(
        screenshotSrc,
        styleName || "Minimal",
        layoutName || "None",
        [],
        15,
        customBg || null,
        cropRect
      );

      // 3. Load these images into refs so the editor instantly switches to the new styled mockup base
      const updatedStyledImg = new Image();
      updatedStyledImg.crossOrigin = "anonymous";
      updatedStyledImg.onload = () => {
        styledImageRef.current = updatedStyledImg;
        originalImageRef.current = updatedStyledImg;

        // Keep local clean src in sync so layout previews updated for size changes correctly
        setCurrentCleanSrc(cleanDataUrl);

        // Switch tool to none, to exit the crop mode and let them preview/continue drawing!
        setActiveTool("none");
        setIsApplyingCrop(false);

        // Notify parent immediately so that outer preview / phone layout gets the cropped image
        onSave(
          newStyledDataUrl,
          cleanDataUrl,
          paths,
          texts,
          cropRect,
          manualCanvasSize
        );

        // Force a redraw with the new image loaded. Since we now set the styled image,
        // the canvas fits the newly generated styled mockup, which is perfect and scaled!
        fitImageToContainer(updatedStyledImg, { x: 0, y: 0, w: updatedStyledImg.width, h: updatedStyledImg.height });
      };
      updatedStyledImg.src = newStyledDataUrl;

    } catch (err) {
      console.error("Error applying and saving crop:", err);
      setIsApplyingCrop(false);
    }
  };

  const handleSave = () => {
    const rawImg = rawScreenshotRef.current || styledImageRef.current || originalImageRef.current;
    if (canvasRef.current && rawImg && cropRect) {
      // Create clean cropped base from raw unstyled screenshot
      const cleanCanvas = document.createElement("canvas");
      cleanCanvas.width = cropRect.w;
      cleanCanvas.height = cropRect.h;
      const cCtx = cleanCanvas.getContext("2d");
      if (cCtx) {
        cCtx.save();
        if (brightness !== 100) {
          cCtx.filter = `brightness(${brightness}%)`;
        }
        cCtx.drawImage(
          rawImg,
          cropRect.x,
          cropRect.y,
          cropRect.w,
          cropRect.h,
          0,
          0,
          cropRect.w,
          cropRect.h,
        );
        cCtx.restore();
        const cleanDataUrl = cleanCanvas.toDataURL("image/png");
        
        let previewDataUrl = canvasRef.current.toDataURL("image/png", 0.9);
        if (activeTool === "crop") {
          // If we are currently cropping, canvas has dark overlay UI.
          // Don't save the UI into the preview.
          previewDataUrl = cleanDataUrl;
        }
        
        setCurrentCleanSrc(cleanDataUrl);

        onSave(
          previewDataUrl,
          cleanDataUrl,
          paths,
          texts,
          cropRect,
          manualCanvasSize,
        );
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-black text-white absolute inset-0 z-50">
      <canvas ref={blurCanvasRef} className="hidden" />

      {!isPremium && <AdMobBanner />}

      <div className="flex items-center justify-between p-4 bg-[#111] z-10 pt-safe border-b border-white/10">
        <button
          onClick={onCancel}
          className="p-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <span className="font-medium text-sm tracking-wide">EDITOR</span>
        <button
          onClick={handleSave}
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-sm font-medium rounded-full transition-colors"
        >
          Save
        </button>
      </div>

      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center relative overflow-hidden bg-[#0a0a0a]"
      >
        {activeTool === "crop" && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-blue-600/95 backdrop-blur-md text-white font-bold text-xs px-4 py-2.5 rounded-full border border-blue-400/30 shadow-2xl flex items-center gap-2 pointer-events-none whitespace-nowrap animate-bounce">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-100 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-400"></span>
            </span>
            Drag to Crop/Resize the original uncropped screenshot!
          </div>
        )}
        <div
          className={`relative flex items-center justify-center ${canvasSize.width === 0 ? "invisible" : ""}`}
          style={{
            transform: `translate(${zoomOffset.x}px, ${zoomOffset.y}px) scale(${zoomScale})`,
            transformOrigin: "center center",
            transition: isPinchZoomingRef.current ? "none" : "transform 0.15s ease-out",
          }}
        >
          <canvas
            ref={canvasRef}
            style={{
              width: canvasSize.width,
              height: canvasSize.height,
              touchAction: "none",
              cursor: activeTool === "crop" ? "crosshair" : "default",
              zIndex: 10,
            }}
            className="shadow-2xl rounded border border-white/20"
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
          />

          {activeTool === "crop" && (() => {
            const canvas = canvasRef.current;
            if (!canvas) return null;
            
            let sx: number | undefined, sy: number | undefined, w: number | undefined, h: number | undefined;
            if (cropDragModeRef.current === "new" && cropStartRef.current && cropEndRef.current) {
              sx = Math.min(cropStartRef.current.x, cropEndRef.current.x);
              sy = Math.min(cropStartRef.current.y, cropEndRef.current.y);
              w = Math.abs(cropStartRef.current.x - cropEndRef.current.x);
              h = Math.abs(cropStartRef.current.y - cropEndRef.current.y);
            } else if (tempCropRectRef.current) {
              sx = tempCropRectRef.current.x;
              sy = tempCropRectRef.current.y;
              w = tempCropRectRef.current.w;
              h = tempCropRectRef.current.h;
            } else if (cropRect) {
              sx = cropRect.x;
              sy = cropRect.y;
              w = cropRect.w;
              h = cropRect.h;
            }

            if (sx === undefined || sy === undefined || w === undefined || h === undefined || w < 25 || h < 25) return null;

            // Convert to CSS pixels
            const cssX = (sx / canvas.width) * canvasSize.width;
            const cssY = (sy / canvas.height) * canvasSize.height;
            const cssW = (w / canvas.width) * canvasSize.width;
            const cssH = (h / canvas.height) * canvasSize.height;

            return (
              <div
                style={{
                  position: "absolute",
                  left: cssX,
                  top: cssY,
                  width: cssW,
                  height: cssH,
                  pointerEvents: "none",
                  zIndex: 25,
                }}
                className="flex items-center justify-center font-sans"
              >
                <button
                  disabled={isApplyingCrop}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleApplySaveCrop();
                  }}
                  style={{ pointerEvents: "auto" }}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white font-bold text-xs uppercase tracking-wide rounded-lg shadow-2xl flex items-center gap-1.5 border border-emerald-400/40 hover:scale-105 active:scale-95 transition-all whitespace-nowrap cursor-pointer pointer-events-auto"
                >
                  {isApplyingCrop ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      Save Crop
                    </>
                  )}
                </button>
              </div>
            );
          })()}
        </div>

        {/* Path Deletion Prompt */}
        {editingPathIndex >= 0 && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30">
            <button
              onClick={() => {
                const newPaths = [...paths];
                newPaths.splice(editingPathIndex, 1);
                setPaths(newPaths);
                setEditingPathIndex(-1);
                redraw(undefined, newPaths);
              }}
              className="bg-red-600 text-white px-6 py-2 rounded-full font-bold shadow-xl border border-white/20 flex items-center gap-2"
            >
              <X className="w-4 h-4" /> Delete Drawing
            </button>
          </div>
        )}

        {/* Refinement Prompt */}
        {suggestedShape && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30">
            <button
              onClick={() => {
                if (paths.length === 0 || drawingPointsRef.current.length === 0)
                  return;
                const newRefined = new Path2D();
                let newPoints: { x: number; y: number }[] = [];
                if (suggestedShape === "Line") {
                  const s = drawingPointsRef.current[0];
                  const e =
                    drawingPointsRef.current[
                      drawingPointsRef.current.length - 1
                    ];
                  newRefined.moveTo(s.x, s.y);
                  newRefined.lineTo(e.x, e.y);
                  newPoints = [s, e];
                } else {
                  const points = drawingPointsRef.current;
                  const minX = Math.min(...points.map((p) => p.x));
                  const maxX = Math.max(...points.map((p) => p.x));
                  const minY = Math.min(...points.map((p) => p.y));
                  const maxY = Math.max(...points.map((p) => p.y));
                  const w = maxX - minX;
                  const h = maxY - minY;
                  const cx = minX + w / 2;
                  const cy = minY + h / 2;
                  const r = (w + h) / 4;
                  newRefined.arc(cx, cy, r, 0, Math.PI * 2);

                  const steps = 100;
                  for (let i = 0; i <= steps; i++) {
                    const theta = (i / steps) * Math.PI * 2;
                    newPoints.push({
                      x: cx + r * Math.cos(theta),
                      y: cy + r * Math.sin(theta),
                    });
                  }
                }
                setPaths((prev) => {
                  const next = [...prev];
                  const last = next[next.length - 1];
                  if (!last) return prev;
                  next[next.length - 1] = { ...last, path2d: newRefined, points: newPoints };
                  redraw(undefined, next);
                  return next;
                });
                setSuggestedShape(null);
              }}
              className="bg-blue-600 shadow-xl shadow-blue-900/40 text-white px-6 py-3 rounded-full font-bold animate-pulse flex items-center gap-2 border border-white/20 whitespace-nowrap"
            >
              ✨ Perfect to {suggestedShape}?
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-start gap-1 p-3 bg-[#111] pb-safe z-10 border-t border-white/10 overflow-x-auto no-scrollbar">
        <ToolButton
          active={activeTool === "crop"}
          onClick={() => setActiveTool(activeTool === "crop" ? "none" : "crop")}
          icon={<Crop />}
          label="Crop"
        />
        <ToolButton
          active={activeTool === "draw"}
          onClick={() => setActiveTool(activeTool === "draw" ? "none" : "draw")}
          icon={<PenTool />}
          label="Draw"
        />
        <ToolButton
          active={activeTool === "blur"}
          onClick={() => setActiveTool(activeTool === "blur" ? "none" : "blur")}
          icon={<Droplets />}
          label="Blur"
        />
        <ToolButton
          active={activeTool === "text"}
          onClick={() => {
            if (activeTool === "text") {
              setActiveTool("none");
              setShowTextModal(false);
            } else {
              setActiveTool("text");
              setCurrentText("");
              setCurrentTextRotation(0);
              setCurrentTextShadow(false);
              setTextPositionMode("Default");
              setShowTextModal(true);
              setShowStickerPanel(false);
            }
          }}
          icon={<Type />}
          label="Text"
        />
        <ToolButton
          active={activeTool === "sticker"}
          onClick={() => {
            if (activeTool === "sticker") {
              setActiveTool("none");
              setShowStickerPanel(false);
            } else {
              setActiveTool("sticker");
              setEditingTextIndex(-1);
              setSelectedStickerFont("Inter");
              setShowStickerPanel(true);
              setShowTextModal(false);
            }
          }}
          icon={<Smile />}
          label="Stickers"
        />
        <ToolButton
          active={activeTool === "adjust"}
          onClick={() => {
            if (activeTool === "adjust") {
              setActiveTool("none");
            } else {
              setActiveTool("adjust");
              setShowStickerPanel(false);
              setShowTextModal(false);
            }
          }}
          icon={<Sun />}
          label="Adjust"
        />
        <ToolButton
          active={activeTool === "size"}
          onClick={() => {
            if (activeTool === "size") {
              setActiveTool("none");
            } else {
              setActiveTool("size");
              setShowStickerPanel(false);
              setShowTextModal(false);
            }
          }}
          icon={<Maximize />}
          label="Size"
        />
        <ToolButton
          active={activeTool === "removebg"}
          disabled={isRemovingBackground}
          onClick={() => {
            if (activeTool === "removebg") {
              setActiveTool("none");
            } else {
              setActiveTool("removebg");
              setShowStickerPanel(false);
              setShowTextModal(false);
            }
          }}
          icon={isRemovingBackground ? <Loader2 className="animate-spin" /> : <Eraser />}
          label="Cleanup"
        />
        <div className="w-[1px] h-8 bg-white/10 mx-2" />
        <button
          onClick={() => {
            setPaths([]);
            setTexts([]);
            setBrightness(100);
            setManualCanvasSize(null);
            if (originalImageRef.current) {
              setCanvasWidthInput(originalImageRef.current.width.toString());
              setCanvasHeightInput(originalImageRef.current.height.toString());
            }
            if (rawScreenshotRef.current) {
              const rect = {
                x: 0,
                y: 0,
                w: rawScreenshotRef.current.width,
                h: rawScreenshotRef.current.height,
              };
              setCropRect(rect);
            }
            if (originalImageRef.current) {
              const rect = {
                x: 0,
                y: 0,
                w: originalImageRef.current.width,
                h: originalImageRef.current.height,
              };
              fitImageToContainer(originalImageRef.current, rect);
              setTimeout(() => redraw(undefined, [], []), 50); // Ensure clear renders
            }
          }}
          className="flex flex-col items-center gap-1 p-2 text-red-400 opacity-80 hover:opacity-100 transition-opacity"
        >
          <X className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-medium tracking-wide uppercase">
            Reset
          </span>
        </button>
      </div>

      {/* Floating Color Selector for Draw and Blur */}
      <AnimatePresence>
        {(activeTool === "draw" || activeTool === "blur") && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-3 bg-[#111111] border-t border-white/5 flex flex-col gap-2.5 shrink-0 z-20 overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold tracking-widest text-gray-400 uppercase">
                {activeTool === "draw" ? "DRAW COLOR" : "BLUR TINT OVERLAY"}
              </span>
              {activeTool === "blur" && selectedBlurColor !== "transparent" && (
                <button
                  onClick={() => {
                    setSelectedBlurColor("transparent");
                    setTimeout(() => redraw(), 0);
                  }}
                  className="text-[10px] text-blue-400 font-extrabold tracking-wider uppercase hover:underline"
                >
                  Clear Tint
                </button>
              )}
            </div>
            <div className="flex gap-2.5 overflow-x-auto py-1 no-scrollbar scroll-smooth">
              {activeTool === "draw" ? (
                textColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      setSelectedDrawColor(color);
                      setTimeout(() => redraw(), 0);
                    }}
                    className={`w-7 h-7 shrink-0 rounded-full border-2 transition-all relative flex items-center justify-center ${
                      selectedDrawColor === color
                        ? "border-blue-500 scale-110 shadow-lg ring-2 ring-blue-500/20"
                        : "border-transparent opacity-80 hover:opacity-100 hover:scale-105"
                    }`}
                    style={{ backgroundColor: color }}
                  >
                    {selectedDrawColor === color && (
                      <div className="w-1.5 h-1.5 rounded-full bg-black invert select-none" />
                    )}
                  </button>
                ))
              ) : (
                // Blur tint options: first one is transparent (No Tint), followed by standard colors
                ["transparent", ...textColors].map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      setSelectedBlurColor(color);
                      setTimeout(() => redraw(), 0);
                    }}
                    className={`w-7 h-7 shrink-0 rounded-full border-2 transition-all relative flex items-center justify-center ${
                      selectedBlurColor === color
                        ? "border-blue-500 scale-110 shadow-lg ring-2 ring-blue-500/20"
                        : "border-transparent opacity-80 hover:opacity-100 hover:scale-105"
                    }`}
                    style={
                      color === "transparent"
                        ? {
                            background:
                              "linear-gradient(45deg, #3f3f46 25%, transparent 25%), linear-gradient(-45deg, #3f3f46 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #3f3f46 75%), linear-gradient(-45deg, transparent 75%, #3f3f46 75%)",
                            backgroundSize: "6px 6px",
                            backgroundPosition: "0 0, 0 3px, 3px -3px, -3px 0",
                            backgroundColor: "#1c1c1e",
                          }
                        : { backgroundColor: color }
                    }
                    title={color === "transparent" ? "No Tint" : color}
                  >
                    {color === "transparent" ? (
                      <span className="text-[10px] font-extrabold text-white/50 select-none">
                        Ø
                      </span>
                    ) : (
                      selectedBlurColor === color && (
                        <div className="w-1.5 h-1.5 rounded-full bg-black invert select-none" />
                      )
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Premium Brush Size Control Slider */}
            <div className="flex items-center justify-between gap-4 mt-2 bg-white/5 px-3.5 py-2.5 rounded-2xl border border-white/5">
              <span className="text-[10px] font-extrabold tracking-widest text-gray-300 uppercase shrink-0">
                BRUSH SIZE: {brushSize}px
              </span>
              <div className="flex-1 flex items-center gap-3">
                <span className="text-[9px] font-extrabold text-gray-500 uppercase select-none">Min</span>
                <input
                  type="range"
                  min="12"
                  max="140"
                  value={brushSize}
                  onChange={(e) => {
                    setBrushSize(Number(e.target.value));
                    setTimeout(() => redraw(), 0);
                  }}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <span className="text-[9px] font-extrabold text-gray-500 uppercase select-none">Max</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeTool === "adjust" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-4 bg-[#111111] border-t border-white/5 flex flex-col gap-3 shrink-0 z-20 overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold tracking-widest text-gray-400 uppercase">
                IMAGE ADJUSTMENT
              </span>
              <button
                onClick={() => {
                  setBrightness(100);
                }}
                className="text-[10px] text-blue-400 font-extrabold tracking-wider uppercase hover:underline cursor-pointer"
              >
                Reset Brightness
              </button>
            </div>

            {/* Brightness Slider */}
            <div className="flex flex-col gap-2 bg-white/5 px-4 py-3.5 rounded-2xl border border-white/5">
              <div className="flex justify-between items-center text-xs font-bold text-gray-300 uppercase tracking-wider">
                <span>Brightness</span>
                <span className="text-white font-mono font-medium">
                  {brightness}%
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[9px] font-extrabold text-gray-500 uppercase select-none">
                  Darker
                </span>
                <input
                  type="range"
                  min="30"
                  max="200"
                  value={brightness}
                  onChange={(e) => {
                    setBrightness(Number(e.target.value));
                  }}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <span className="text-[9px] font-extrabold text-gray-500 uppercase select-none">
                  Brighter
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeTool === "removebg" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-4 bg-[#111111] border-t border-white/5 flex flex-col gap-3 shrink-0 z-20 overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold tracking-widest text-gray-400 uppercase">
                Background Remover
              </span>
            </div>

            <div className="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex gap-3">
                <div className="bg-blue-600/20 p-2 rounded-xl h-fit">
                  <Eraser className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h4 className="text-white text-sm font-bold">Remove Background</h4>
                  <p className="text-gray-400 text-[11px] leading-relaxed mt-0.5">
                    This will automatically detect and remove the background from your photo, leaving only the subject.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2 w-full">
                <button
                  disabled={isRemovingBackground}
                  onClick={handleRemoveBackground}
                  className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                    isRemovingBackground 
                      ? "bg-gray-800 text-gray-500 cursor-not-allowed" 
                      : "bg-blue-600 hover:bg-blue-700 text-white active:scale-95 shadow-lg shadow-blue-500/20"
                  }`}
                >
                  {isRemovingBackground ? (
                    <div className="flex flex-col items-center gap-1.5 w-full">
                      <div className="flex items-center gap-2">
                         <Loader2 className="w-4 h-4 animate-spin" />
                         <span className="text-blue-400 font-bold">{removalProgress}%</span>
                      </div>
                      <span className="text-[10px] text-blue-300/70 font-medium">
                        {removalStatus}
                      </span>
                      <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-1">
                        <motion.div 
                           initial={{ width: 0 }}
                           animate={{ width: `${removalProgress}%` }}
                           className="h-full bg-blue-500"
                        />
                      </div>
                    </div>
                  ) : (
                    "Remove Photo Background"
                  )}
                </button>
                {preBgRemovalImageSrc && !isRemovingBackground && (
                  <button
                    onClick={handleUndoRemoveBackground}
                    className="flex-1 py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 active:scale-95"
                  >
                    Undo Removal
                  </button>
                )}
              </div>
            </div>
            
            <p className="text-[9px] text-gray-500 font-medium italic px-1">
              Note: This ONLY removes background from the photo/screenshot itself. Your custom background colors remain.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeTool === "size" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-4 bg-[#111111] border-t border-white/5 flex flex-col gap-3 shrink-0 z-20 overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold tracking-widest text-gray-400 uppercase">
                Canvas Size
              </span>
              <button
                onClick={() => {
                  setManualCanvasSize(null);
                  if (originalImageRef.current) {
                    setCanvasWidthInput(
                      originalImageRef.current.width.toString(),
                    );
                    setCanvasHeightInput(
                      originalImageRef.current.height.toString(),
                    );
                  }
                  setTimeout(() => {
                    if (originalImageRef.current && cropRect) {
                      fitImageToContainer(originalImageRef.current, cropRect);
                    }
                  }, 0);
                }}
                className="text-[10px] text-blue-400 font-extrabold tracking-wider uppercase hover:underline cursor-pointer"
              >
                Reset Size
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-extrabold text-gray-500 uppercase tracking-wider pl-1">
                  Width (px)
                </label>
                <input
                  type="number"
                  value={canvasWidthInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCanvasWidthInput(val);
                    const w = parseInt(val);
                    const h = parseInt(canvasHeightInput);
                    if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
                      setManualCanvasSize({ width: w, height: h });
                      setTimeout(() => {
                        if (originalImageRef.current && cropRect) {
                          fitImageToContainer(
                            originalImageRef.current,
                            cropRect,
                          );
                        }
                      }, 0);
                    }
                  }}
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:ring-1 ring-blue-500/50"
                  placeholder="Width"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-extrabold text-gray-500 uppercase tracking-wider pl-1">
                  Height (px)
                </label>
                <input
                  type="number"
                  value={canvasHeightInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCanvasHeightInput(val);
                    const h = parseInt(val);
                    const w = parseInt(canvasWidthInput);
                    if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
                      setManualCanvasSize({ width: w, height: h });
                      setTimeout(() => {
                        if (originalImageRef.current && cropRect) {
                          fitImageToContainer(
                            originalImageRef.current,
                            cropRect,
                          );
                        }
                      }, 0);
                    }
                  }}
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:ring-1 ring-blue-500/50"
                  placeholder="Height"
                />
              </div>
            </div>
            <p className="text-[9px] text-gray-500 font-medium italic mt-1 px-1">
              Typing a custom size will resize the whole canvas and background.
            </p>
            <button
              onClick={() => setActiveTool("none")}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs transition-all active:scale-95 mt-1 shadow-lg shadow-blue-900/20"
            >
              Save Size
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTextModal && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute inset-x-0 bottom-0 z-[60] flex items-end justify-center pb-24"
          >
            <div className="bg-white/95 backdrop-blur-md w-full max-w-[400px] mx-4 rounded-3xl p-6 shadow-2xl text-black border border-gray-200">
              <h3 className="text-lg font-bold mb-4">
                {editingTextIndex >= 0 ? "Edit Text" : "Add Text"}
              </h3>

              <div className="space-y-4 max-h-[50vh] overflow-y-auto">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest pl-1 mb-1">
                    Text
                  </label>
                  <input
                    autoFocus
                    className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 ring-blue-500 transition-all font-medium text-sm text-black"
                    placeholder="Enter text here..."
                    value={currentText}
                    onChange={(e) => setCurrentText(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && currentText && handleAddText()
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-1 bg-gray-50/50 rounded-2xl border border-gray-100 px-3 py-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest select-none">
                    Drop Shadow
                  </span>
                  <button
                    onClick={() => setCurrentTextShadow(!currentTextShadow)}
                    role="switch"
                    aria-checked={currentTextShadow}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      currentTextShadow ? "bg-blue-600" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        currentTextShadow ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">
                    Font Style
                  </label>
                  <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar select-none">
                    {fontNames.map((font) => (
                      <button
                        key={font}
                        onClick={() => setCurrentTextFont(font)}
                        className={`whitespace-nowrap px-3.5 py-2 rounded-xl text-xs font-medium transition-all duration-200 border cursor-pointer ${
                          currentTextFont === font
                            ? "bg-blue-600 text-white border-blue-600 shadow-md scale-[1.02] font-semibold"
                            : "bg-white text-gray-750 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                        }`}
                        style={{ fontFamily: fontCSSMap[font] || "sans-serif" }}
                      >
                        {font}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">
                    Text Color
                  </label>
                  <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {textColors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setCurrentTextColor(color)}
                        className={`w-7 h-7 shrink-0 rounded-full border border-gray-200 cursor-pointer transition-transform ${
                          currentTextColor === color
                            ? "border-blue-500 ring-2 ring-blue-500/30 scale-110"
                            : "opacity-80 hover:opacity-100"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
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
                      setActiveTool("none");
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

        {showStickerPanel && (() => {
          const POPULAR_EMOJIS = [
            // Birthday, Wedding & Celebration
            "🎂", "🎁", "🎈", "🥳", "🎉", "🧁", "💍", "💒", "👰", "🤵", "🥂", "💖",
            // Tech & Interaction Controls
            "🔥", "🚀", "💡", "✨", "⭐", "💯", "✔️", "❌", "❤️", "👍", "👏",
            "😂", "😍", "🤔", "😱", "📱", "💻", "🎯", "📢", "⬇️", "➡️", "💥", "🌈",
            "🏆", "🌟", "🔔", "📎", "🔒", "🎨", "🧪", "🍕", "☕", "🎮", "⚡", "💎",
            // Hand Gestures & Directional Pointers
            "👇", "👉", "👈", "👆", "✊", "✌️", "🤟", "✋", "🖖", "✍️", "🙌", "🙏",
            "🏹", "📍", "📌", "🚩", "🔍", "🔎", "👀", "🗣️", "💬", "💭", "🗯️", "✉️",
            // App state / Indicators
            "🟢", "🟡", "🔴", "🔵", "🟣", "⚫", "⚪", "🟩", "🟨", "🟥", "🟧", "🟪",
            "📈", "📉", "📊", "📁", "📂", "📅", "📆", "⏰", "⏱️", "⏳", "🔋", "🔌",
            // Symbols & Alerts
            "⚠️", "🛑", "🚫", "❔", "❓", "‼️", "ℹ️", "🆗", "🆒", "🆕", "🆙", "🆓",
            "👑", "🎩", "🎒", "🎓", "🔑", "🛡️", "🔗", "🧩", "⚙️", "🛠️",
            // Fun Expression Emojis
            "😎", "🤓", "🤩", "🤯", "🤖", "👾", "👽", "🦄", "🐱", "🐶", "🦊",
            "🐼", "🐨", "🦁", "🦖", "🐉", "🍁", "🍀", "🌸", "🌻", "☀️", "🌙", "☁️"
          ];

          const PRESET_BADGES = [
            "HBD 🎂", "BIRTHDAY", "WEDDING 💍", "MARRIED", "PARTY 🥳", "CELEBRATE",
            "HOT", "NEW", "BUG", "IDEA", "SOLVED", "A+", "TIP", "MVP", "NOTE", "DONE",
            "TOP", "FREE", "PRO", "LIVE", "BETA", "COOL", "INFO", "WARN", "FIX", "OMG",
            "BEST", "CHEF", "EPIC", "WOW", "YES", "NO", "TODO", "VIP", "OFFER", "SALE"
          ];

          const BADGE_COLORS = [
            "#FF3366", // Rose
            "#2563EB", // Blue
            "#FF5722", // Orange
            "#10B981", // Emerald
            "#8B5CF6", // Purple
            "#F59E0B", // Yellow
            "#000000", // Black
            "#888888", // Gray
            "#FFFFFF", // White
          ];

          const isEditing = editingTextIndex >= 0;
          const currentEditingItem = isEditing ? texts[editingTextIndex] : null;

          return (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute inset-x-0 bottom-0 z-[60] flex items-end justify-center pb-24"
            >
              <div className="bg-white/95 backdrop-blur-md w-full max-w-[420px] mx-4 rounded-3xl p-5 shadow-2xl text-black border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold">
                    {isEditing ? "Edit Sticker / Emoji" : "Add Sticker & Emoji"}
                  </h3>
                  <button
                    onClick={() => {
                      setShowStickerPanel(false);
                      setEditingTextIndex(-1);
                      setActiveTool("none");
                    }}
                    className="p-1 rounded-full hover:bg-gray-100 text-gray-500"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Tabs selection (Only if we are NOT editing, or we show current type) */}
                {!isEditing ? (
                  <div className="flex bg-gray-100 p-1 rounded-xl mb-4">
                    <button
                      onClick={() => setSelectedStickerTab("emoji")}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        selectedStickerTab === "emoji"
                          ? "bg-white text-black shadow-sm"
                          : "text-gray-500 hover:text-gray-800"
                      }`}
                    >
                      😃 Emojis
                    </button>
                    <button
                      onClick={() => setSelectedStickerTab("badge")}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        selectedStickerTab === "badge"
                          ? "bg-white text-black shadow-sm"
                          : "text-gray-500 hover:text-gray-800"
                      }`}
                    >
                      🏷️ Badges / Tags
                    </button>
                  </div>
                ) : (
                  <div className="text-xs font-bold text-gray-400 bg-gray-50 rounded-xl px-3 py-1.5 mb-4 text-center font-sans">
                    Editing <strong>{currentEditingItem?.stickerType === "badge" ? "Badge Tag" : "Emoji Sticker"}</strong>
                  </div>
                )}

                <div className="space-y-4 max-h-[48vh] overflow-y-auto pr-1 no-scrollbar">
                  
                  {/* Emoji selection tab */}
                  {((!isEditing && selectedStickerTab === "emoji") || (isEditing && currentEditingItem?.stickerType === "emoji")) && (
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                        Select Emoji
                      </label>
                      <div className="grid grid-cols-6 gap-2 bg-gray-50 p-2.5 rounded-2xl border border-gray-100 max-h-[140px] overflow-y-auto">
                        {POPULAR_EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => {
                              if (isEditing) {
                                handleUpdateActiveStickerText(emoji);
                              } else {
                                handleAddSticker(emoji, "emoji");
                              }
                            }}
                            className={`text-2xl p-1.5 hover:scale-125 hover:bg-white rounded-lg transition-all active:scale-95 ${
                              selectedStickerText === emoji ? "bg-blue-100 border border-blue-400" : ""
                            }`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Badge selection tab */}
                  {((!isEditing && selectedStickerTab === "badge") || (isEditing && currentEditingItem?.stickerType === "badge")) && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                          Badge Label
                        </label>
                        <input
                          className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 outline-none focus:ring-2 ring-blue-500 font-bold text-sm text-black uppercase"
                          placeholder="Type sticker text..."
                          maxLength={15}
                          value={selectedStickerText}
                          onChange={(e) => handleUpdateActiveStickerText(e.target.value.toUpperCase())}
                        />
                      </div>

                      {/* Presets */}
                      <div>
                        <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Preset Words</span>
                        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                          {PRESET_BADGES.map((badge) => (
                            <button
                              key={badge}
                              onClick={() => handleUpdateActiveStickerText(badge)}
                              className={`whitespace-nowrap px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all border ${
                                selectedStickerText === badge
                                  ? "bg-black text-white border-black"
                                  : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200"
                              }`}
                            >
                              {badge}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Color Palette */}
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                          Badge Color
                        </label>
                        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar font-sans">
                          {BADGE_COLORS.map((color) => (
                            <button
                              key={color}
                              onClick={() => handleUpdateActiveStickerColor(color)}
                              className={`w-7 h-7 shrink-0 rounded-full border-2 transition-transform ${
                                selectedStickerColor === color
                                  ? "border-blue-500 scale-110"
                                  : "border-gray-200 opacity-80"
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Font List */}
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                          Font Style
                        </label>
                        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                          {fontNames.map((f) => (
                            <button
                              key={f}
                              onClick={() => handleUpdateActiveStickerFont(f)}
                              className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                selectedStickerFont === f
                                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                  : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200"
                              }`}
                              style={{ fontFamily: fontCSSMap[f] }}
                            >
                              {f}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}



                  {/* Action Buttons */}
                  <div className="flex gap-2.5 pt-2">
                    {isEditing && (
                      <button
                        onClick={handleDeleteText}
                        className="py-2.5 px-4 bg-red-100 text-red-600 hover:bg-red-200 rounded-xl font-bold text-xs uppercase tracking-wide transition-colors"
                      >
                        Delete
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setShowStickerPanel(false);
                        setEditingTextIndex(-1);
                        setActiveTool("none");
                      }}
                      className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs uppercase tracking-wide"
                    >
                      {isEditing ? "Close" : "Cancel"}
                    </button>
                    {!isEditing && selectedStickerTab === "badge" && (
                      <button
                        disabled={!selectedStickerText.trim()}
                        onClick={() => handleAddSticker(selectedStickerText, "badge")}
                        className="flex-[1.5] py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl font-bold text-xs uppercase tracking-wide shadow-md transition-all active:scale-95"
                      >
                        Place Badge
                      </button>
                    )}
                  </div>

                </div>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}

function ToolButton({
  icon,
  label,
  active,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`flex flex-col items-center gap-1 p-2 min-w-[64px] rounded-xl transition-all shrink-0 ${
        disabled ? "opacity-30 cursor-not-allowed" : ""
      } ${
        active
          ? "text-white bg-white/10 shadow-inner"
          : "text-gray-500 hover:text-white/80"
      }`}
    >
      <div
        className={`transition-transform ${active ? "scale-110 mb-1 text-blue-400" : ""}`}
      >
        {icon}
      </div>
      <span className="text-[10px] font-bold tracking-wider uppercase">
        {label}
      </span>
    </button>
  );
}
