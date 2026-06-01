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
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Styles, PhoneLayouts } from "./lib/imageProcessor";
import { translations, LanguageKey } from "./i18n";

type Tool = "none" | "crop" | "draw" | "blur" | "text";

interface TextItem {
  text: string;
  x: number;
  y: number;
  color: string;
  size: number;
  positionMode: "Top" | "Default" | "Bottom";
  fontName: string;
  rotation?: number;
}

const fontNames = ["Default", "Serif", "SansSerif", "Monospace", "Cursive"];
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
  originalScreenshotSrc?: string;
  initialCropRect?: { x: number; y: number; w: number; h: number } | null;
  initialPaths?: DrawingPath[];
  initialTexts?: TextItem[];
  onSave: (
    dataUrl: string,
    cleanSrc: string,
    paths: DrawingPath[],
    texts: TextItem[],
    customCropRect?: { x: number; y: number; w: number; h: number } | null,
  ) => void;
  onCancel: () => void;
}

export default function EditorCanvas({
  imageSrc,
  originalScreenshotSrc,
  initialCropRect = null,
  initialPaths = [],
  initialTexts = [],
  onSave,
  onCancel,
}: EditorCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const blurCanvasRef = useRef<HTMLCanvasElement>(null);
  const scratchCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>("none");
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

  // Text drag & double-tap states
  const [draggingTextIndex, setDraggingTextIndex] = useState<number | null>(
    null,
  );
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastTapRef = useRef<{ time: number; textIndex: number }>({
    time: 0,
    textIndex: -1,
  });

  // Draw and Blur active tool colors
  const [selectedDrawColor, setSelectedDrawColor] = useState<string>("#FF3366");
  const [selectedBlurColor, setSelectedBlurColor] =
    useState<string>("transparent");
  const [brushSize, setBrushSize] = useState<number>(45);

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
      activeRect = { x: 0, y: 0, w: img.width, h: img.height };
    }
    if (!activeRect) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const topPad = 0;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Base image (cropped region or full original depending on activeRect)
    ctx.drawImage(
      img,
      activeRect.x,
      activeRect.y,
      activeRect.w,
      activeRect.h,
      0,
      topPad,
      activeRect.w,
      activeRect.h,
    );

    ctx.save();
    ctx.translate(0, topPad);

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

        let fontStr = "sans-serif";
        if (t.fontName === "Serif") fontStr = "serif";
        if (t.fontName === "Monospace") fontStr = "monospace";
        if (t.fontName === "Cursive") fontStr = "cursive";
        ctx.font = `bold ${t.size}px ${fontStr}`;

        ctx.textAlign = "center";

        ctx.save();
        ctx.translate(t.x, t.y);
        if (t.rotation) {
          ctx.rotate(t.rotation);
        }

        // Draw dark readable outline behind text
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = Math.max(2, t.size * 0.08);
        ctx.strokeText(t.text, 0, 0);
        ctx.fillText(t.text, 0, 0);
        
        ctx.restore();
      });

      // Draw temporary preview text if modal is open
      if (showTextModal && currentText.trim() && activeRect) {
        const size = currentTextSize;
        const x = canvas.width / 2;
        let y = activeRect.h / 2;

        if (textPositionMode === "Top") y = size + 10;
        if (textPositionMode === "Bottom") y = activeRect.h - 20;

        ctx.fillStyle = currentTextColor;
        ctx.globalAlpha = 0.8;

        let fontStr = "sans-serif";
        if (currentTextFont === "Serif") fontStr = "serif";
        if (currentTextFont === "Monospace") fontStr = "monospace";
        if (currentTextFont === "Cursive") fontStr = "cursive";

        ctx.font = `bold ${size}px ${fontStr}`;
        ctx.textAlign = "center";

        ctx.save();
        ctx.translate(x, y);
        if (currentTextRotation) {
          ctx.rotate(currentTextRotation);
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
  }, [currentText, textPositionMode, texts, showTextModal, activeTool]);

  useEffect(() => {
    redraw();
  }, [paths, brushSize, selectedDrawColor, selectedBlurColor]);

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

    // Hit test for texts
    const clickedTextIndex = texts.findIndex((t) => {
      const height = t.size * 1.5;
      const width = Math.max(t.text.length * (t.size * 0.6), 30) + 20;
      return (
        pt.x > t.x - width / 2 &&
        pt.x < t.x + width / 2 &&
        pt.y < t.y + 10 &&
        pt.y > t.y - height + 10
      );
    });

    if (clickedTextIndex >= 0) {
      const now = Date.now();
      const doubleTapDelay = 300; // ms

      if (
        lastTapRef.current.textIndex === clickedTextIndex &&
        now - lastTapRef.current.time < doubleTapDelay
      ) {
        // Double Tap: Open edit modal
        const t = texts[clickedTextIndex];
        setEditingTextIndex(clickedTextIndex);
        setCurrentText(t.text);
        setCurrentTextColor(t.color);
        setCurrentTextSize(t.size);
        setCurrentTextFont(t.fontName);
        setCurrentTextRotation(t.rotation || 0);
        setTextPositionMode(t.positionMode);
        setActiveTool("text");
        setShowTextModal(true);
        setDraggingTextIndex(null);
        lastTapRef.current = { time: 0, textIndex: -1 };
      } else {
        // Single Tap / Hold: Start dragging
        setDraggingTextIndex(clickedTextIndex);
        dragOffsetRef.current = {
          x: pt.x - texts[clickedTextIndex].x,
          y: pt.y - texts[clickedTextIndex].y,
        };
        lastTapRef.current = { time: now, textIndex: clickedTextIndex };
      }
      return;
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
      const newX = pt.x - dragOffsetRef.current.x;
      const newY = pt.y - dragOffsetRef.current.y;

      const nextTexts = [...texts];
      if (nextTexts[draggingTextIndex]) {
        nextTexts[draggingTextIndex] = {
          ...nextTexts[draggingTextIndex],
          x: newX,
          y: newY,
          positionMode: "Default",
        };
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
        const dx = cropRect.x - newRect.x;
        const dy = cropRect.y - newRect.y;

        if (dx !== 0 || dy !== 0) {
          // Shift texts
          const nextTexts = texts.map((t) => ({ ...t, x: t.x + dx, y: t.y + dy }));
          setTexts(nextTexts);

          // Shift paths
          const nextPaths = paths.map((p) => {
            const nextPoints = p.points.map((pt) => ({ x: pt.x + dx, y: pt.y + dy }));
            const path2d = new Path2D();
            if (nextPoints.length > 0) {
              path2d.moveTo(nextPoints[0].x, nextPoints[0].y);
              for (let i = 1; i < nextPoints.length; i++) {
                path2d.lineTo(nextPoints[i].x, nextPoints[i].y);
              }
            }
            return { ...p, points: nextPoints, path2d };
          });
          setPaths(nextPaths);
        }

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
    };

    let finalTexts;
    if (editingTextIndex >= 0) {
      const newTexts = [...texts];
      newTexts[editingTextIndex] = newText;
      setTexts(newTexts);
      finalTexts = newTexts;
    } else {
      finalTexts = [...texts, newText];
      setTexts(finalTexts);
    }

    setEditingTextIndex(-1);
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
    setActiveTool("none");
    setCurrentText("");
    redraw(undefined, undefined, finalTexts);
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
        const cleanDataUrl = cleanCanvas.toDataURL("image/png");
        
        let previewDataUrl = canvasRef.current.toDataURL("image/png", 0.9);
        if (activeTool === "crop") {
          // If we are currently cropping, canvas has dark overlay UI.
          // Don't save the UI into the preview.
          previewDataUrl = cleanDataUrl;
        }

        onSave(
          previewDataUrl,
          cleanDataUrl,
          paths,
          texts,
          cropRect,
        );
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-black text-white absolute inset-0 z-50">
      <canvas ref={blurCanvasRef} className="hidden" />

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

      <div className="flex justify-around items-center p-4 bg-[#111] pb-safe z-10 border-t border-white/10">
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
              setTextPositionMode("Default");
              setShowTextModal(true);
            }
          }}
          icon={<Type />}
          label="Text"
        />
        <div className="w-[1px] h-8 bg-white/10 mx-2" />
        <button
          onClick={() => {
            setPaths([]);
            setTexts([]);
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

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">
                    Size: {currentTextSize}
                  </label>
                  <input
                    type="range"
                    min="12"
                    max="300"
                    value={currentTextSize}
                    onChange={(e) => setCurrentTextSize(Number(e.target.value))}
                    className="w-full mt-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">
                    Rotation
                  </label>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    value={Math.round((currentTextRotation * 180) / Math.PI)}
                    onChange={(e) =>
                      setCurrentTextRotation((Number(e.target.value) * Math.PI) / 180)
                    }
                    className="w-full mt-2"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">
                    Position
                  </label>
                  <div className="flex gap-2">
                    {(["Top", "Default", "Bottom"] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setTextPositionMode(mode)}
                        className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                          textPositionMode === mode
                            ? "bg-blue-600 text-white shadow-lg"
                            : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {fontNames.map((font) => (
                    <button
                      key={font}
                      onClick={() => setCurrentTextFont(font)}
                      className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                        currentTextFont === font
                          ? "bg-blue-600 text-white shadow-lg"
                          : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                      }`}
                    >
                      {font}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                  {textColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setCurrentTextColor(color)}
                      className={`w-7 h-7 shrink-0 rounded-full border-2 transition-transform ${
                        currentTextColor === color
                          ? "border-blue-500 scale-110"
                          : "border-gray-200 opacity-80"
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
      </AnimatePresence>
    </div>
  );
}

function ToolButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 p-2 min-w-[64px] rounded-xl transition-all ${
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
