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
  Undo,
  Redo,
  RotateCw,
  Wand2,
  ChevronDown,
  ChevronUp,
  Upload,
  ChevronRight,
  Trash2,
  Move,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Square,
  Circle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Styles, PhoneLayouts, applyStyle } from "./lib/imageProcessor";
import { PHONE_FRAMES } from "./lib/phoneFrames";
import { translations, LanguageKey } from "./i18n";
import { isNative } from "./lib/isNative";

type Tool = "none" | "crop" | "draw" | "blur" | "text" | "sticker" | "adjust" | "size" | "arrows";

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
  shadowColor?: string;
  bgColor?: string;
  isSticker?: boolean;
  stickerType?: "emoji" | "badge";
  badgeBg?: string;
  isLogo?: boolean;
  logoSrc?: string;
  logoImg?: HTMLImageElement | null;
  opacity?: number;
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
  shapeType?: "arrow" | "tapered_arrow" | "double_arrow" | "rect" | "circle" | "line";
}

interface EditorCanvasProps {
  key?: string | null;
  imageSrc: string;
  cleanImageSrc?: string;
  originalScreenshotSrc?: string;
  initialCropRect?: { x: number; y: number; w: number; h: number } | null;
  initialCustomSize?: { width: number; height: number } | null;
  initialImageOffset?: { x: number; y: number };
  initialImageScale?: number;
  initialPaths?: DrawingPath[];
  initialTexts?: TextItem[];
  onSave: (
    dataUrl: string,
    cleanSrc: string,
    paths: DrawingPath[],
    texts: TextItem[],
    customCropRect?: { x: number; y: number; w: number; h: number } | null,
    customSize?: { width: number; height: number } | null,
    newOriginalSrc?: string,
    manualImageOffset?: { x: number; y: number },
    manualImageScale?: number,
    customResizeMode?: "cover" | "fit_no_border" | "fit_border" | "stretch",
    customResizerBg?: string,
    referenceSize?: { width: number; height: number }
  ) => void;
  onCancel: () => void;
  styleName?: string;
  layoutName?: string;
  customBg?: string | null;
  isPremium?: boolean;
  initialTool?: Tool;
  isWatermarkMode?: boolean;
}

function getDistanceToSegment(pt: { x: number; y: number }, p1: { x: number; y: number }, p2: { x: number; y: number }) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    return Math.hypot(pt.x - p1.x, pt.y - p1.y);
  }
  let t = ((pt.x - p1.x) * dx + (pt.y - p1.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(pt.x - (p1.x + t * dx), pt.y - (p1.y + t * dy));
}

function isPointNearPath(pt: { x: number; y: number }, p: DrawingPath): boolean {
  const threshold = Math.max(p.width + 12, 24); // Generous hit area for easy selection
  
  if (p.shapeType) {
    if (p.points.length < 2) return false;
    const start = p.points[0];
    const end = p.points[p.points.length - 1];
    
    if (p.shapeType === "rect") {
      const x1 = Math.min(start.x, end.x);
      const x2 = Math.max(start.x, end.x);
      const y1 = Math.min(start.y, end.y);
      const y2 = Math.max(start.y, end.y);
      
      // Inside check
      if (pt.x >= x1 && pt.x <= x2 && pt.y >= y1 && pt.y <= y2) {
        return true;
      }
      
      // Boundary segments check
      const d1 = getDistanceToSegment(pt, { x: x1, y: y1 }, { x: x2, y: y1 });
      const d2 = getDistanceToSegment(pt, { x: x2, y: y1 }, { x: x2, y: y2 });
      const d3 = getDistanceToSegment(pt, { x: x2, y: y2 }, { x: x1, y: y2 });
      const d4 = getDistanceToSegment(pt, { x: x1, y: y2 }, { x: x1, y: y1 });
      
      return Math.min(d1, d2, d3, d4) < threshold;
    }
    
    if (p.shapeType === "circle") {
      const rx = Math.abs(end.x - start.x) / 2;
      const ry = Math.abs(end.y - start.y) / 2;
      const cx = start.x + (end.x - start.x) / 2;
      const cy = start.y + (end.y - start.y) / 2;
      
      const dx = pt.x - cx;
      const dy = pt.y - cy;
      
      // Inside ellipse check
      if ((dx * dx) / (rx * rx || 1) + (dy * dy) / (ry * ry || 1) <= 1.0) {
        return true;
      }
      
      // Boundary check
      const theta = Math.atan2(dy, dx);
      const px = cx + rx * Math.cos(theta);
      const py = cy + ry * Math.sin(theta);
      return Math.hypot(pt.x - px, pt.y - py) < threshold;
    }
    
    // Default shapes: line, arrow, tapered_arrow, double_arrow
    return getDistanceToSegment(pt, start, end) < threshold;
  }
  
  // Standard freeform drawing
  return p.points.some(
    (ppp) =>
      Math.sqrt(Math.pow(ppp.x - pt.x, 2) + Math.pow(ppp.y - pt.y, 2)) < threshold
  );
}

function drawShape(
  ctx: CanvasRenderingContext2D,
  shapeType: "arrow" | "tapered_arrow" | "double_arrow" | "rect" | "circle" | "line",
  points: { x: number; y: number }[],
  color: string,
  width: number
) {
  if (points.length < 2) return;
  const start = points[0];
  const end = points[points.length - 1];

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (shapeType === "line") {
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  } else if (shapeType === "rect") {
    ctx.beginPath();
    ctx.rect(start.x, start.y, end.x - start.x, end.y - start.y);
    ctx.stroke();
  } else if (shapeType === "circle") {
    ctx.beginPath();
    const rx = Math.abs(end.x - start.x) / 2;
    const ry = Math.abs(end.y - start.y) / 2;
    const cx = start.x + (end.x - start.x) / 2;
    const cy = start.y + (end.y - start.y) / 2;
    // fallback if ellipse is not supported
    if (ctx.ellipse) {
      ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
    } else {
      ctx.arc(cx, cy, Math.max(rx, ry), 0, 2 * Math.PI);
    }
    ctx.stroke();
  } else if (shapeType === "arrow") {
    // Draw line
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    // Draw arrow head at the end pointing towards end coordinates
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const arrowLength = Math.max(15, width * 2.5);

    ctx.beginPath();
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(
      end.x - arrowLength * Math.cos(angle - Math.PI / 6),
      end.y - arrowLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      end.x - arrowLength * Math.cos(angle + Math.PI / 6),
      end.y - arrowLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
  } else if (shapeType === "tapered_arrow") {
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const anglePerp = angle + Math.PI / 2;
    const arrowLength = Math.max(15, width * 2.5);
    
    // Base is where the arrowhead begins
    const base = {
      x: end.x - arrowLength * Math.cos(angle),
      y: end.y - arrowLength * Math.sin(angle),
    };

    // 1. Draw the tapered stem
    ctx.beginPath();
    const startLeft = { x: start.x - 1 * Math.cos(anglePerp), y: start.y - 1 * Math.sin(anglePerp) };
    const startRight = { x: start.x + 1 * Math.cos(anglePerp), y: start.y + 1 * Math.sin(anglePerp) };
    const baseLeft = { x: base.x - (width / 2) * Math.cos(anglePerp), y: base.y - (width / 2) * Math.sin(anglePerp) };
    const baseRight = { x: base.x + (width / 2) * Math.cos(anglePerp), y: base.y + (width / 2) * Math.sin(anglePerp) };
    
    ctx.moveTo(startLeft.x, startLeft.y);
    ctx.lineTo(baseLeft.x, baseLeft.y);
    ctx.lineTo(baseRight.x, baseRight.y);
    ctx.lineTo(startRight.x, startRight.y);
    ctx.closePath();
    ctx.fill();

    // 2. Draw the arrowhead at the end
    ctx.beginPath();
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(
      end.x - arrowLength * Math.cos(angle - Math.PI / 6),
      end.y - arrowLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      end.x - arrowLength * Math.cos(angle + Math.PI / 6),
      end.y - arrowLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
  } else if (shapeType === "double_arrow") {
    // Draw line
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const arrowLength = Math.max(15, width * 2.5);

    // End Arrowhead
    ctx.beginPath();
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(
      end.x - arrowLength * Math.cos(angle - Math.PI / 6),
      end.y - arrowLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      end.x - arrowLength * Math.cos(angle + Math.PI / 6),
      end.y - arrowLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();

    // Start Arrowhead pointing backward
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(
      start.x + arrowLength * Math.cos(angle - Math.PI / 6),
      start.y + arrowLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      start.x + arrowLength * Math.cos(angle + Math.PI / 6),
      start.y + arrowLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
  }
}

export default function EditorCanvas({
  imageSrc,
  cleanImageSrc,
  originalScreenshotSrc,
  initialCropRect = null,
  initialCustomSize = null,
  initialImageOffset = { x: 0, y: 0 },
  initialImageScale = 1,
  initialPaths = [],
  initialTexts = [],
  onSave,
  onCancel,
  styleName,
  layoutName,
  customBg,
  isPremium = false,
  initialTool = "none",
  isWatermarkMode = false,
}: EditorCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const blurCanvasRef = useRef<HTMLCanvasElement>(null);
  const scratchCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>(initialTool);
  const [isApplyingCrop, setIsApplyingCrop] = useState(false);
  const [isRotating, setIsRotating] = useState(false);

  const getPadding = (w: number, h: number) => {
    const sName = styleName || "Minimal";
    const lName = layoutName || "None";

    const config = Styles[sName] || Styles["Minimal"];
    const layout = PhoneLayouts[lName] || PhoneLayouts["None"];

    let basePaddingFactor = config.paddingFactor;
    if (layout.name !== "None" || manualCanvasSize) {
      basePaddingFactor = 0;
    } else if (layout.name === "None" && sName === "Original") {
      basePaddingFactor = 0;
    }

    return Math.max(w, h) * basePaddingFactor;
  };

  const getScreenshotCenterAndScale = (rect: { x: number; y: number; w: number; h: number }) => {
    const sName = styleName || "Minimal";
    const lName = layoutName || "None";

    const config = Styles[sName] || Styles["Minimal"];
    const layout = PhoneLayouts[lName] || PhoneLayouts["None"];

    let basePaddingFactor = config.paddingFactor;
    if (layout.name !== "None" || manualCanvasSize) {
      basePaddingFactor = 0;
    } else if (layout.name === "None" && sName === "Original") {
      basePaddingFactor = 0;
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
      const shouldRotate = !!layout.isLandscape && !isImgLandscape;

      const virtualImgW = shouldRotate ? rect.h : rect.w;
      const virtualImgH = shouldRotate ? rect.w : rect.h;

      const imgRatio = virtualImgW / virtualImgH;
      const screenRatio = screenW / screenH;

      const scale = screenW / rect.w;

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
  const textInitialDistRef = useRef<number>(0);
  const textInitialSizeRef = useRef<number>(0);

  const editorLastTapRef = useRef<number>(0);

  const isDraggingPathRef = useRef<boolean>(false);
  const pathDragEndpointRef = useRef<"move" | "start" | "end">("move");
  const pathDragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastPathPointsRef = useRef<{ x: number; y: number }[]>([]);

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
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [showAllToolsInWatermark, setShowAllToolsInWatermark] = useState(false);
  const [texts, setTexts] = useState<TextItem[]>(initialTexts);
  const [selectedTextIndex, setSelectedTextIndex] = useState<number | null>(initialTexts.length > 0 ? 0 : null);

  const latestTextsRef = useRef<TextItem[]>(texts);
  latestTextsRef.current = texts;
  const latestPathsRef = useRef<DrawingPath[]>(paths);
  latestPathsRef.current = paths;

  // History state for undo/redo
  const [history, setHistory] = useState<{
    paths: DrawingPath[];
    texts: TextItem[];
    cropRect: { x: number; y: number; w: number; h: number } | null;
  }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [shouldCommit, setShouldCommit] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);

  useEffect(() => {
    if (history.length === 0 && cropRect !== null) {
      setHistory([{ paths, texts, cropRect }]);
      setHistoryIndex(0);
    }
  }, [cropRect]);

  useEffect(() => {
    if (shouldCommit && !isUndoing) {
      setHistory(prev => {
        const nextHistory = prev.slice(0, historyIndex + 1);
        nextHistory.push({ paths, texts, cropRect });
        if (nextHistory.length > 50) nextHistory.shift();
        return nextHistory;
      });
      setHistoryIndex(prev => {
        const next = prev + 1;
        return next >= 50 ? 49 : next;
      });
      setShouldCommit(false);
    }
  }, [shouldCommit, paths, texts, cropRect, historyIndex, isUndoing]);

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const state = history[newIndex];
      setHistoryIndex(newIndex);
      setPaths(state.paths);
      setTexts(state.texts);
      setCropRect(state.cropRect);
      setIsUndoing(true);
      setTimeout(() => setIsUndoing(false), 50);
      redraw(undefined, state.paths, state.texts);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const state = history[newIndex];
      setHistoryIndex(newIndex);
      setPaths(state.paths);
      setTexts(state.texts);
      setCropRect(state.cropRect);
      setIsUndoing(true);
      setTimeout(() => setIsUndoing(false), 50);
      redraw(undefined, state.paths, state.texts);
    }
  };

  // Advanced on-screen text/sticker drag/resize/rotate actions
  const textDragModeRef = useRef<"drag" | "resize_rotate" | null>(null);
  const initialTextSizeRef = useRef<number>(80);
  const initialTextRotationRef = useRef<number>(0);
  const initialPointerAngleRef = useRef<number>(0);
  const initialPointerDistRef = useRef<number>(100);

  const getTextBounds = (t: TextItem) => {
    let w = 40;
    let h = 40;
    if (t.isLogo) {
      let ratio = 1.0;
      if (t.logoImg && t.logoImg.naturalWidth && t.logoImg.naturalHeight) {
        ratio = t.logoImg.naturalWidth / t.logoImg.naturalHeight;
      }
      w = t.size * ratio;
      h = t.size;
    } else if (t.isSticker) {
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
  const [currentTextShadowColor, setCurrentTextShadowColor] = useState("rgba(0,0,0,0.6)");
  const [currentTextBgColor, setCurrentTextBgColor] = useState("transparent");
  const [activeTextTab, setActiveTextTab] = useState<"font" | "color" | "bg" | "shadow">("font");

  // Sticker & Emoji state
  const [showStickerPanel, setShowStickerPanel] = useState(false);
  const [selectedStickerTab, setSelectedStickerTab] = useState<"emoji" | "badge">("emoji");
  const [selectedStickerColor, setSelectedStickerColor] = useState("#FF3366");
  const [selectedStickerTextColor, setSelectedStickerTextColor] = useState("#FFFFFF");
  const [selectedStickerShadow, setSelectedStickerShadow] = useState(true);
  const [selectedStickerShadowColor, setSelectedStickerShadowColor] = useState("rgba(0,0,0,0.4)");
  const [selectedStickerBgColor, setSelectedStickerBgColor] = useState("transparent");
  const [selectedStickerText, setSelectedStickerText] = useState("");
  const [selectedStickerSize, setSelectedStickerSize] = useState(72);
  const [selectedStickerRotation, setSelectedStickerRotation] = useState(0);
  const [selectedStickerFont, setSelectedStickerFont] = useState("Inter");
  const [expandedBadgeSection, setExpandedBadgeSection] = useState<string>("Presets");

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
  const [selectedShapeTool, setSelectedShapeTool] = useState<"arrow" | "tapered_arrow" | "double_arrow" | "rect" | "circle" | "line" >("arrow");
  const [arrowSubTab, setArrowSubTab] = useState<"shape" | "color" | "thickness">("shape");
  const [isDetectingSensitive, setIsDetectingSensitive] = useState(false);

  // Size tool states
  const [canvasWidthInput, setCanvasWidthInput] = useState<string>(
    initialCustomSize ? initialCustomSize.width.toString() : ""
  );
  const [canvasHeightInput, setCanvasHeightInput] = useState<string>(
    initialCustomSize ? initialCustomSize.height.toString() : ""
  );
  const [selectedPresetLabel, setSelectedPresetLabel] = useState<string | null>(() => {
    if (!initialCustomSize) return null;
    const presets = [
      { label: "Insta Post", w: 1080, h: 1080 },
      { label: "Insta Story", w: 1080, h: 1920 },
      { label: "FB Post", w: 1080, h: 1080 },
      { label: "Play Store", w: 1080, h: 1920 }
    ];
    const match = presets.find(p => p.w === initialCustomSize.width && p.h === initialCustomSize.height);
    return match ? match.label : null;
  });
  const [manualCanvasSize, setManualCanvasSize] = useState<{ width: number; height: number } | null>(initialCustomSize);
  const [manualImageOffset, setManualImageOffset] = useState<{ x: number; y: number }>(initialImageOffset);
  const [manualImageScale, setManualImageScale] = useState<number>(initialImageScale);
  const [resizeMode, setResizeMode] = useState<"cover" | "fit_no_border" | "fit_border" | "stretch">("stretch");
  const [resizerBg, setResizerBg] = useState<string>("transparent");
  
  // Create local states to handle rotated internal images safely apart from props
  const [workingOriginalSrc, setWorkingOriginalSrc] = useState<string | undefined>(originalScreenshotSrc);

  // Keep track of the clean image (no layout) for re-styling when canvas size changes.
  const [currentCleanSrc, setCurrentCleanSrc] = useState<string | null>(cleanImageSrc || originalScreenshotSrc || imageSrc);

  // Sync states if props change (e.g., when a user uploads a new image or activates a tool)
  useEffect(() => {
    setWorkingOriginalSrc(originalScreenshotSrc);
    setCurrentCleanSrc(cleanImageSrc || originalScreenshotSrc || imageSrc);
    const nextPaths = initialPaths || [];
    setPaths(nextPaths);
    const nextTexts = initialTexts || [];
    setTexts(nextTexts);
    if (nextTexts.length > 0) {
      setSelectedTextIndex((prev) => (prev !== null && prev < nextTexts.length) ? prev : 0);
    } else {
      setSelectedTextIndex(null);
    }
    // Explicitly redraw to reflect prop updates on the canvas right away
    redraw(undefined, nextPaths, nextTexts);
  }, [originalScreenshotSrc, cleanImageSrc, imageSrc, initialPaths, initialTexts]);

  // Initialize and load images
  useEffect(() => {
    const img = new Image();
    let isCurrent = true;
    if (!imageSrc.startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => {
      if (!isCurrent) return;
      styledImageRef.current = img;
      
      if (activeTool !== "crop") {
        originalImageRef.current = img;
      }

      if (!workingOriginalSrc) {
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
    img.onerror = () => {
      console.error("Failed to load initial image");
    };
    img.src = imageSrc;
    return () => {
      isCurrent = false;
    };
  }, [imageSrc]); // Removed activeTool and workingOriginalSrc to prevent crop reset on tool change

  const hasInitializedCropRef = useRef(false);

  // Keep local image sources and states in sync with props when they change (e.g., following new image uploads)
  useEffect(() => {
    if (originalScreenshotSrc) {
      setWorkingOriginalSrc(originalScreenshotSrc);
      hasInitializedCropRef.current = false;
    }
  }, [originalScreenshotSrc]);

  useEffect(() => {
    if (cleanImageSrc) {
      setCurrentCleanSrc(cleanImageSrc);
    }
  }, [cleanImageSrc]);

  // Load raw original screenshot
  useEffect(() => {
    if (!workingOriginalSrc) return;
    const img = new Image();
    let isCurrent = true;
    if (!workingOriginalSrc.startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => {
      if (!isCurrent) return;
      rawScreenshotRef.current = img;

      if (!hasInitializedCropRef.current) {
        hasInitializedCropRef.current = true;
        if (initialCropRect) {
          setCropRect(initialCropRect);
        } else {
          const isQuickFeatureMode = activeTool === "size" || activeTool === "draw" || activeTool === "blur" || activeTool === "text" || activeTool === "arrows";
          const topH = isQuickFeatureMode ? 0 : Math.round(img.height * 0.04);
          const bottomH = isQuickFeatureMode ? 0 : Math.round(img.height * 0.05);
          const defaultCrop = {
            x: 0,
            y: topH,
            w: img.width,
            h: img.height - topH - bottomH,
          };
          setCropRect(defaultCrop);
        }
      }

      setCanvasWidthInput((prev) => prev || img.width.toString());
      setCanvasHeightInput((prev) => prev || img.height.toString());

      const tryFit = () => {
        if (!isCurrent) return;
        if (containerRef.current && canvasRef.current && blurCanvasRef.current) {
          // Force activeImage to styled if available, crop handles originalImageRef
          const activeImg = styledImageRef.current || img;
          const rect = { x: 0, y: 0, w: activeImg.width, h: activeImg.height };
          fitImageToContainer(activeImg, rect);
        } else {
          setTimeout(tryFit, 30);
        }
      };
      tryFit();
    };
    img.onerror = () => {
      console.error("Failed to load raw screenshot image");
    };
    img.src = workingOriginalSrc;
    return () => {
      isCurrent = false;
    };
  }, [workingOriginalSrc, initialCropRect]);

  // Sync originalImageRef whenever activeTool switches/images load
  useEffect(() => {
    originalImageRef.current = activeTool === "crop"
      ? (rawScreenshotRef.current || styledImageRef.current)
      : styledImageRef.current;
  }, [activeTool, styledImageRef.current, rawScreenshotRef.current]);

  const handleRotate90 = () => {
    if (isRotating) return;
    setIsRotating(true);
    const rawImg = rawScreenshotRef.current || originalImageRef.current;
    if (!rawImg) {
        setIsRotating(false);
        return;
    }

    const createRotatedImg = (imgRef: React.MutableRefObject<HTMLImageElement | null>, cb?: (rotatedSrc?: string) => void) => {
        if (!imgRef.current) {
            if (cb) cb();
            return;
        }
        const rc = document.createElement("canvas");
        rc.width = imgRef.current.height;
        rc.height = imgRef.current.width;
        const rcCtx = rc.getContext("2d");
        if (!rcCtx) {
            if (cb) cb();
            return;
        }
        rcCtx.imageSmoothingEnabled = true;
        rcCtx.imageSmoothingQuality = "high";
        rcCtx.translate(rc.width / 2, rc.height / 2);
        rcCtx.rotate(Math.PI / 2);
        rcCtx.drawImage(imgRef.current, -imgRef.current.width / 2, -imgRef.current.height / 2);
        const dataUrl = rc.toDataURL("image/png");
        const nextImg = new Image();
        if (!dataUrl.startsWith("data:")) {
            nextImg.crossOrigin = "anonymous";
        }
        nextImg.onload = () => {
            imgRef.current = nextImg;
            if (cb) cb(dataUrl);
        };
        nextImg.onerror = () => {
            console.error("Failed to load rotated image");
            if (cb) cb();
        };
        nextImg.src = dataUrl;
    };

    let completed = 0;
    const total = 3;
    let newOriginalSrc: string | undefined;
    let newCleanSrc: string | undefined;
    const checkComplete = () => {
        completed++;
        if (completed === total) {
           const W = rawImg.width;
           const H = rawImg.height;
           
           if (newOriginalSrc) {
               setWorkingOriginalSrc(newOriginalSrc);
           }
           if (newCleanSrc) {
               setCurrentCleanSrc(newCleanSrc);
           }

           if (cropRect) {
               setCropRect({
                   x: H - (cropRect.y + cropRect.h),
                   y: cropRect.x,
                   w: cropRect.h,
                   h: cropRect.w
               });
           }
           
           const manualW = parseInt(canvasWidthInput) || 0;
           const manualH = parseInt(canvasHeightInput) || 0;
           setCanvasWidthInput(manualH ? manualH.toString() : "");
           setCanvasHeightInput(manualW ? manualW.toString() : "");
           if (manualCanvasSize) {
               setManualCanvasSize({ width: manualCanvasSize.height, height: manualCanvasSize.width });
           }

           setPaths(prev => prev.map(p => {
               const newPoints = p.points.map(pt => ({ x: H - pt.y, y: pt.x }));
               const newPath2d = new Path2D();
               if (newPoints.length > 0) {
                 newPath2d.moveTo(newPoints[0].x, newPoints[0].y);
                 for (let i = 1; i < newPoints.length; i++) {
                   newPath2d.lineTo(newPoints[i].x, newPoints[i].y);
                 }
               }
               return { ...p, points: newPoints, path2d: newPath2d };
           }));

           setTexts(prev => prev.map(t => ({
               ...t,
               x: H - t.y,
               y: t.x,
               rotation: (t.rotation || 0) + Math.PI / 2
           })));
           
           setShouldCommit(true);
           if (originalImageRef.current && cropRect) {
              const isCropMode = activeTool === "crop";
              const rotatedOriginalImage = originalImageRef.current;
              const rectToUse = isCropMode
                ? { x: H - (cropRect.y + cropRect.h), y: cropRect.x, w: cropRect.h, h: cropRect.w }
                : { x: 0, y: 0, w: rotatedOriginalImage.width, h: rotatedOriginalImage.height };
              
              fitImageToContainer(rotatedOriginalImage, rectToUse);
           }
           // Use the updated rect immediately in redraw to prevent stale activeRect mapping
           const isCropView = activeTool === "crop";
           const currentCropMapped = { x: H - (cropRect.y + cropRect.h), y: cropRect.x, w: cropRect.h, h: cropRect.w };
           redraw(isCropView ? currentCropMapped : null);
           setIsRotating(false);
        }
    };

    createRotatedImg(rawScreenshotRef, (url) => { if (url) newOriginalSrc = url; checkComplete(); });
    createRotatedImg(styledImageRef, (url) => { if (url) newCleanSrc = url; checkComplete(); });
    createRotatedImg(originalImageRef, () => { checkComplete(); });
  };

  useEffect(() => {
    // Only re-style when the active block isn't initializing (to avoid looping on mount)
    if (!currentCleanSrc) return;
    
    // We update the dynamic layout styling purely for the preview representation of the current layout with the new size!
    const timer = setTimeout(async () => {
      try {
        const sourceSrc = currentCleanSrc || workingOriginalSrc;
        const finalCrop = cropRect;

        const newPreviewSrc = await applyStyle(
          sourceSrc,
          styleName,
          layoutName,
          [],
          15,
          customBg,
          finalCrop,
          manualCanvasSize,
          manualImageOffset,
          manualImageScale,
          false,
          resizeMode,
          resizerBg
        );
        const img = new Image();
        if (!newPreviewSrc.startsWith("data:")) {
          img.crossOrigin = "anonymous";
        }
        img.onload = () => {
          const oldW = originalImageRef.current?.width || img.width;
          const oldH = originalImageRef.current?.height || img.height;

          styledImageRef.current = img;
          if (activeTool !== "crop") {
            originalImageRef.current = img;
            fitImageToContainer(img, { x: 0, y: 0, w: img.width, h: img.height });
          }

          const newW = img.width;
          const newH = img.height;
          if (oldW !== newW || oldH !== newH) {
            const scaleX = newW / oldW;
            const scaleY = newH / oldH;

            setTexts((prev) =>
              prev.map((t) => ({
                ...t,
                x: t.x * scaleX,
                y: t.y * scaleY,
                size: Math.round(t.size * Math.min(scaleX, scaleY)),
              }))
            );

            setPaths((prev) =>
              prev.map((p) => {
                const scaledPoints = p.points.map((pt) => ({
                  x: pt.x * scaleX,
                  y: pt.y * scaleY,
                }));
                const newPath2d = new Path2D();
                if (scaledPoints.length > 0) {
                  newPath2d.moveTo(scaledPoints[0].x, scaledPoints[0].y);
                  for (let i = 1; i < scaledPoints.length; i++) {
                    newPath2d.lineTo(scaledPoints[i].x, scaledPoints[i].y);
                  }
                }
                return {
                  ...p,
                  width: p.width * Math.min(scaleX, scaleY),
                  points: scaledPoints,
                  path2d: newPath2d,
                };
              })
            );
          }
        };
        img.onerror = () => {
          console.error("Failed to load resized layout preview");
        };
        img.src = newPreviewSrc;
      } catch (err) {
        console.error("Failed to update layout preview on resize", err);
      }
    }, 10);

    return () => clearTimeout(timer);
  }, [currentCleanSrc, workingOriginalSrc, cropRect, styleName, layoutName, customBg, manualCanvasSize, manualImageOffset, manualImageScale, resizeMode, resizerBg]);

  const handleAutoDetectSensitive = async () => {
    const rawImg = rawScreenshotRef.current || originalImageRef.current;
    if (!rawImg || isDetectingSensitive) return;
    
    setIsDetectingSensitive(true);
    try {
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = rawImg.width;
      tempCanvas.height = rawImg.height;
      const tCtx = tempCanvas.getContext("2d");
      if (!tCtx) throw new Error("Could not get 2d context for temp canvas");
      
      tCtx.drawImage(rawImg, 0, 0);
      const dataUrl = tempCanvas.toDataURL("image/jpeg", 0.7);
      const base64 = dataUrl.split(",")[1];
      const mimeType = dataUrl.substring(dataUrl.indexOf(":")+1, dataUrl.indexOf(";"));

      const apiKey = process.env.GEMINI_API_KEY || "";
      if (!apiKey) throw new Error("Missing GEMINI_API_KEY");
      
      const { GoogleGenAI, Type } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });
      
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: [
            {
                inlineData: {
                    mimeType: mimeType,
                    data: base64
                }
            },
            {
                text: "Analyze this image and identify all bounding boxes for sensitive information like email addresses, phone numbers, full names, account numbers, or financial data. Be very precise with the bounding boxes. Ensure they cover the sensitive text. The coordinates x and y are the top left corner, w is width and h is height. Your output space is normalized 0-1000 so coordinates should be integers from 0 to 1000 where 1000 x 1000 covers the entire image."
            }
        ],
        config: {
             responseMimeType: "application/json",
             responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        x: { type: Type.NUMBER, description: "X coordinate of top-left corner (0-1000 space)" },
                        y: { type: Type.NUMBER, description: "Y coordinate of top-left corner (0-1000 space)" },
                        w: { type: Type.NUMBER, description: "Width (0-1000 space)" },
                        h: { type: Type.NUMBER, description: "Height (0-1000 space)" },
                        type: { type: Type.STRING, description: "Type of sensitive info detected, e.g. email, phone" }
                    },
                    required: ["x", "y", "w", "h", "type"]
                }
             }
        }
      });
      
      const boxesStr = response.text || "[]";
      const boxes = JSON.parse(boxesStr);
      
      if (boxes && boxes.length > 0) {
        const newPaths: DrawingPath[] = boxes.map((box: any) => {
            const x = (box.x / 1000) * rawImg.width;
            const y = (box.y / 1000) * rawImg.height;
            const w = (box.w / 1000) * rawImg.width;
            const h = (box.h / 1000) * rawImg.height;
            
            const blurStrokeWidth = h; // use the height of the box as the width of our stroke
            const p2d = new Path2D();
            const middleY = y + h / 2;
            
            // Draw a line horizontally through the box
            p2d.moveTo(x, middleY);
            p2d.lineTo(x + w, middleY);
            
            return {
                points: [{x, y: middleY}, {x: x+w, y: middleY}],
                path2d: p2d,
                color: "transparent",
                width: blurStrokeWidth * 1.5, 
                isBlur: true
            };
        });
        
        setPaths(prev => {
            const combined = [...prev, ...newPaths];
            setShouldCommit(true);
            return combined;
        });
      } else {
        alert("No sensitive information detected.");
      }
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Failed to auto-detect sensitive information.");
    } finally {
      setIsDetectingSensitive(false);
    }
  };

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

  useEffect(() => {
    if (originalImageRef.current && cropRect) {
      fitImageToContainer(originalImageRef.current, cropRect);
    } else {
      redraw();
    }
  }, [resizeMode, resizerBg]);

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

    let finalW = manualCanvasSize ? manualCanvasSize.width : rect.w;
    let finalH = manualCanvasSize ? manualCanvasSize.height : virtualH;

    if (manualCanvasSize && resizeMode === "fit_no_border") {
      const imgAspect = rect.w / rect.h;
      const targetAspect = manualCanvasSize.width / manualCanvasSize.height;
      if (imgAspect > targetAspect) {
        finalW = manualCanvasSize.width;
        finalH = Math.round(manualCanvasSize.width / imgAspect);
      } else {
        finalH = manualCanvasSize.height;
        finalW = Math.round(manualCanvasSize.height * imgAspect);
      }
    }

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
    blurCanvasObj.setAttribute("data-dirty", "true");

    setCanvasSize({ width: destW, height: destH });

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
    explicitTexts?: TextItem[],
    hideSelectionBoxes?: boolean
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

    const hasBlurPaths = explicitPaths ? explicitPaths.some((p) => p.isBlur) : latestPathsRef.current.some((p) => p.isBlur);
    const needBlur = activeTool === "blur" || hasBlurPaths;

    if (needBlur && blurCanvasRef.current?.getAttribute("data-dirty") === "true") {
      const bCanvas = blurCanvasRef.current;
      const bCtx = bCanvas.getContext("2d");
      if (bCtx) {
        const blurRadius = Math.max(25, Math.round((activeRect?.w || img.width) * 0.04));
        bCtx.clearRect(0, 0, bCanvas.width, bCanvas.height);
        bCtx.filter = `blur(${blurRadius}px)`;
        bCtx.drawImage(
          img,
          activeRect.x,
          activeRect.y,
          activeRect.w,
          activeRect.h,
          0,
          0,
          activeRect.w,
          activeRect.h,
        );
        bCtx.filter = "none";
        bCanvas.removeAttribute("data-dirty");
      }
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const topPad = 0;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Load config for background drawing
    const sName = styleName || "Minimal";
    const config = Styles[sName] || Styles["Minimal"];

    let drawX = 0;
    let drawY = topPad;
    let drawW = activeRect.w;
    let drawH = activeRect.h;

    if (manualCanvasSize) {
      if (resizeMode === "stretch") {
        drawW = canvas.width;
        drawH = canvas.height;
        drawX = manualImageOffset.x;
        drawY = manualImageOffset.y;
      } else {
        const isFitBorder = resizeMode === "fit_border";
        const scaleFunc = isFitBorder ? Math.min : Math.max;
        const scale = scaleFunc(canvas.width / activeRect.w, canvas.height / activeRect.h) * manualImageScale;
        drawW = activeRect.w * scale;
        drawH = activeRect.h * scale;
        drawX = (canvas.width - drawW) / 2 + manualImageOffset.x;
        drawY = (canvas.height - drawH) / 2 + manualImageOffset.y;
      }
    }

    if (manualCanvasSize) {
      // In custom dimension/resizing mode
      if (resizeMode === "fit_border") {
        if (resizerBg === "blur" && blurCanvasRef.current) {
          ctx.drawImage(blurCanvasRef.current, 0, 0, canvas.width, canvas.height);
        } else if (resizerBg !== "transparent") {
          ctx.fillStyle = resizerBg;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      } else {
        // Other resize modes (fit_no_border, cover, stretch)
        if (customBg) {
          if (customBg.includes(",")) {
            const colors = customBg.split(",");
            const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            colors.forEach((color, i, arr) => {
              grad.addColorStop(i / (arr.length - 1), color.trim());
            });
            ctx.fillStyle = grad;
          } else {
            ctx.fillStyle = customBg;
          }
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else if (styleName !== "Original" || layoutName !== "None") {
          if (config.bgGradient) {
            const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            config.bgGradient.forEach((color, i, arr) => {
              grad.addColorStop(i / (arr.length - 1), color);
            });
            ctx.fillStyle = grad;
          } else {
            ctx.fillStyle = config.bgColor || "#FFFFFF";
          }
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }
    } else {
      // Standard layout mode (without preset canvas dimensions)
      if (customBg) {
        if (customBg.includes(",")) {
          const colors = customBg.split(",");
          const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
          colors.forEach((color, i, arr) => {
            grad.addColorStop(i / (arr.length - 1), color.trim());
          });
          ctx.fillStyle = grad;
        } else {
          ctx.fillStyle = customBg;
        }
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else {
        if (config.bgGradient) {
          const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
          config.bgGradient.forEach((color, i, arr) => {
            grad.addColorStop(i / (arr.length - 1), color);
          });
          ctx.fillStyle = grad;
        } else {
          ctx.fillStyle = config.bgColor || "#FFFFFF";
        }
        if (styleName !== "Original" || layoutName !== "None") {
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }
    }

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
      drawW,
      drawH,
    );
    ctx.restore();

    ctx.save();
    // Path drawing uses absolute coordinates from canvas

    if (activeTool !== "crop") {
      // Draw paths
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const pathsToDraw = explicitPaths || latestPathsRef.current;
      pathsToDraw.forEach((p, idx) => {
        if (p.isBlur) {
          drawBlurredPath(ctx, p.path2d, p.width, p.color, topPad);
        } else if (p.shapeType) {
          drawShape(ctx, p.shapeType, p.points, p.color, p.width);
        } else {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.width;
          ctx.stroke(p.path2d);
        }

        // Draw selected highlight outline indicator if it's currently selected
        const isEditingThisPath = !hideSelectionBoxes && editingPathIndex === idx;
        if (isEditingThisPath && p.points.length > 0) {
          ctx.save();

          // Calculate bounding box bounds
          let minX = p.points[0].x;
          let maxX = p.points[0].x;
          let minY = p.points[0].y;
          let maxY = p.points[0].y;
          p.points.forEach((pt) => {
            if (pt.x < minX) minX = pt.x;
            if (pt.x > maxX) maxX = pt.x;
            if (pt.y < minY) minY = pt.y;
            if (pt.y > maxY) maxY = pt.y;
          });

          const pad = 8;
          const rx = minX - pad;
          const ry = minY - pad;
          const rw = Math.max(16, (maxX - minX) + pad * 2);
          const rh = Math.max(16, (maxY - minY) + pad * 2);

          // Draw a soft translucent dark shadow for maximum contrast on any image background
          ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
          ctx.lineWidth = 3;
          ctx.setLineDash([]);
          ctx.strokeRect(rx, ry, rw, rh);

          // Draw the neon blue dashed boundary outline
          ctx.strokeStyle = "#3B82F6";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([6, 4]);
          ctx.strokeRect(rx, ry, rw, rh);

          // Draw professional design circular node handles at the bounding box corners
          const corners = [
            { x: rx, y: ry },
            { x: rx + rw, y: ry },
            { x: rx, y: ry + rh },
            { x: rx + rw, y: ry + rh }
          ];

          corners.forEach(corner => {
            // White highlight halo
            ctx.beginPath();
            ctx.arc(corner.x, corner.y, 4.5, 0, 2 * Math.PI);
            ctx.fillStyle = "#FFFFFF";
            ctx.fill();
            // Blue inner accent core
            ctx.beginPath();
            ctx.arc(corner.x, corner.y, 2.5, 0, 2 * Math.PI);
            ctx.fillStyle = "#3B82F6";
            ctx.fill();
          });

          // Draw special green and red start/end endpoints for arrows / lines to trace vector paths
          if (p.shapeType && p.points.length >= 2) {
            const start = p.points[0];
            const end = p.points[p.points.length - 1];
            [
              { pt: start, color: "#10B981" }, // Green for tail
              { pt: end, color: "#EF4444" }    // Red for pointer tip
            ].forEach((node) => {
              ctx.beginPath();
              ctx.arc(node.pt.x, node.pt.y, 5, 0, 2 * Math.PI);
              ctx.fillStyle = "#FFFFFF";
              ctx.fill();
              
              ctx.beginPath();
              ctx.arc(node.pt.x, node.pt.y, 3.5, 0, 2 * Math.PI);
              ctx.fillStyle = node.color;
              ctx.fill();
            });
          }

          ctx.restore();
        }
      });

      // Draw texts
      const textsToDraw = explicitTexts || latestTextsRef.current;
      textsToDraw.forEach((rawT, idx) => {
        // If we are currently editing this item and the modal is open, use the live state values instead of stale array values
        const t = (editingTextIndex === idx && showTextModal) ? {
          ...rawT,
          text: currentText,
          color: currentTextColor,
          size: currentTextSize,
          fontName: currentTextFont,
          rotation: currentTextRotation,
          hasShadow: currentTextShadow,
          shadowColor: currentTextShadowColor,
          bgColor: currentTextBgColor,
          positionMode: textPositionMode,
          y: textPositionMode === "Top" ? (currentTextSize + 10) : (textPositionMode === "Bottom" ? (canvas.height - 20) : rawT.y)
        } : rawT;

        if (t.opacity !== undefined && t.opacity !== null) {
          const parsedOpacity = typeof t.opacity === "string" ? parseFloat(t.opacity) : Number(t.opacity);
          ctx.globalAlpha = isNaN(parsedOpacity) ? 1.0 : parsedOpacity;
        } else {
          ctx.globalAlpha = 1.0;
        }

        ctx.fillStyle = t.color;

        let fontStr = fontCSSMap[t.fontName] || "sans-serif";
        ctx.font = `bold ${t.size}px ${fontStr}`;

        ctx.textAlign = "center";

        ctx.save();
        ctx.translate(t.x, t.y);
        if (t.rotation) {
          ctx.rotate(t.rotation);
        }

        if (t.isLogo) {
          if (t.logoSrc && (!t.logoImg || !t.logoImg.complete)) {
            if (!t.logoImg) {
              const img = new Image();
              img.onload = () => {
                t.logoImg = img;
                redraw();
              };
              img.onerror = () => {
                console.error("Failed to load logo image");
              };
              img.src = t.logoSrc;
              t.logoImg = img;
            }
          } else if (t.logoImg) {
            const aspect = t.logoImg.naturalHeight > 0 ? (t.logoImg.naturalWidth / t.logoImg.naturalHeight) : 1.0;
            const drawW = t.size * aspect;
            const drawH = t.size;
            ctx.drawImage(t.logoImg, -drawW / 2, -drawH / 2, drawW, drawH);
          }
        } else if (t.isSticker) {
          if (t.stickerType === "badge") {
            const padX = t.size * 0.5;
            const padY = t.size * 0.3;
            const textWidth = ctx.measureText(t.text).width;
            const bgW = textWidth + padX * 2;
            const bgH = t.size + padY * 2;
            const r = bgH / 2;

            if (t.hasShadow !== false) {
              ctx.shadowColor = t.shadowColor || "rgba(0, 0, 0, 0.4)";
              ctx.shadowBlur = Math.max(6, t.size * 0.15);
              ctx.shadowOffsetX = Math.max(3, t.size * 0.08);
              ctx.shadowOffsetY = Math.max(3, t.size * 0.08);
            } else {
              ctx.shadowColor = "transparent";
              ctx.shadowBlur = 0;
              ctx.shadowOffsetX = 0;
              ctx.shadowOffsetY = 0;
            }

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
            ctx.font = `${t.size}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
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
          ctx.textBaseline = "middle";
          if (t.bgColor && t.bgColor !== "transparent") {
            const metrics = ctx.measureText(t.text);
            const textWidth = metrics.width;
            let spanLeft = textWidth / 2;
            let spanRight = textWidth / 2;
            if ('actualBoundingBoxLeft' in metrics) {
              spanLeft = Math.max(spanLeft, Math.abs(metrics.actualBoundingBoxLeft));
              spanRight = Math.max(spanRight, Math.abs(metrics.actualBoundingBoxRight));
            }
            const padX = t.size * 0.4;
            const padY = t.size * 0.3; // middle baseline padding
            const leftEdge = -spanLeft - padX;
            const rightEdge = spanRight + padX;
            const rectW = rightEdge - leftEdge;
            const rectH = t.size + padY * 2;
            
            ctx.fillStyle = t.bgColor;
            if (ctx.roundRect) {
              ctx.beginPath();
              ctx.roundRect(leftEdge, -rectH/2, rectW, rectH, t.size * 0.15);
              ctx.fill();
            } else {
              ctx.fillRect(leftEdge, -rectH/2, rectW, rectH);
            }
          }

          ctx.fillStyle = t.color;
          if (t.hasShadow) {
            ctx.shadowColor = t.shadowColor || "rgba(0, 0, 0, 0.6)";
            ctx.shadowBlur = Math.max(4, t.size * 0.15);
            ctx.shadowOffsetX = Math.max(2, t.size * 0.08);
            ctx.shadowOffsetY = Math.max(2, t.size * 0.08);
          }

          if (t.bgColor === "transparent" || !t.bgColor) {
            // Draw dark readable outline behind text
            ctx.strokeStyle = "#000000";
            ctx.lineWidth = Math.max(2, t.size * 0.08);
            ctx.strokeText(t.text, 0, 0);
          }
          ctx.fillText(t.text, 0, 0);
        }
        
        ctx.restore();
      });

      // Draw active selected text bounding box with interactive handles (Delete & Resize/Rotate)
      if (!hideSelectionBoxes && selectedTextIndex !== null && selectedTextIndex < latestTextsRef.current.length) {
        const t = latestTextsRef.current[selectedTextIndex];
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

      // Draw temporary preview text if modal is open and we are adding a brand new text
      if (showTextModal && editingTextIndex < 0 && currentText.trim() && activeRect) {
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
        ctx.textBaseline = "middle";

        ctx.save();
        ctx.translate(x, y);
        if (currentTextRotation) {
          ctx.rotate(currentTextRotation);
        }

        if (currentTextBgColor && currentTextBgColor !== "transparent") {
          const metrics = ctx.measureText(currentText);
          const textWidth = metrics.width;
          let spanLeft = textWidth / 2;
          let spanRight = textWidth / 2;
          if ('actualBoundingBoxLeft' in metrics) {
            spanLeft = Math.max(spanLeft, Math.abs(metrics.actualBoundingBoxLeft));
            spanRight = Math.max(spanRight, Math.abs(metrics.actualBoundingBoxRight));
          }
          const padX = size * 0.4;
          const padY = size * 0.3; // middle baseline padding
          const leftEdge = -spanLeft - padX;
          const rightEdge = spanRight + padX;
          const rectW = rightEdge - leftEdge;
          const rectH = size + padY * 2;
          
          ctx.fillStyle = currentTextBgColor;
          if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(leftEdge, -rectH/2, rectW, rectH, size * 0.15);
            ctx.fill();
          } else {
            ctx.fillRect(leftEdge, -rectH/2, rectW, rectH);
          }
        }
        
        ctx.fillStyle = currentTextColor;

        if (currentTextShadow) {
          ctx.shadowColor = currentTextShadowColor || "rgba(0, 0, 0, 0.6)";
          ctx.shadowBlur = Math.max(4, size * 0.15);
          ctx.shadowOffsetX = Math.max(2, size * 0.08);
          ctx.shadowOffsetY = Math.max(2, size * 0.08);
        }

        if (currentTextBgColor === "transparent" || !currentTextBgColor) {
          // Draw dark readable outline behind temporary preview text
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = Math.max(2, size * 0.08);
          ctx.strokeText(currentText, 0, 0);
        }

        ctx.fillText(currentText, 0, 0);
        ctx.restore();
        
        ctx.globalAlpha = 1.0;
      }
    }

    ctx.restore();

    // Watermark drawing matching styleName and layoutName
    const lName = layoutName || "None";
    if (sName !== "Original" || lName !== "None") {
      const isColorDarkObj = (color: string): boolean => {
        if (!color) return false;
        const bg = color.toLowerCase().trim();
        if (bg.includes("white") || bg === "#ffffff" || bg === "#fff" || bg === "transparent") return false;
        if (bg.includes("black") || bg === "#000000" || bg === "#000") return true;
        if (bg.startsWith("#")) {
          const hex = bg.slice(1);
          let r = 0, g = 0, b = 0;
          if (hex.length === 3) {
            r = parseInt(hex[0] + hex[0], 16);
            g = parseInt(hex[1] + hex[1], 16);
            b = parseInt(hex[2] + hex[2], 16);
          } else if (hex.length === 6) {
            r = parseInt(hex.slice(0, 2), 16);
            g = parseInt(hex.slice(2, 4), 16);
            b = parseInt(hex.slice(4, 6), 16);
          }
          const brightness = (r * 299 + g * 587 + b * 114) / 1000;
          return brightness < 155;
        }
        if (
          bg.includes("slate") ||
          bg.includes("gray") ||
          bg.includes("indigo") ||
          bg.includes("blue") ||
          bg.includes("purple") ||
          bg.includes("dark")
        ) {
          return true;
        }
        return false;
      };

      const isBgDark = () => {
        if (customBg) {
          if (customBg.includes(",")) {
            const colors = customBg.split(",");
            return isColorDarkObj(colors[0]);
          }
          return isColorDarkObj(customBg);
        }
        if (sName === "Original") {
          const lObj = PhoneLayouts[lName];
          if (lObj && lObj.name !== "None") {
            return isColorDarkObj(lObj.themeColor);
          }
          return false;
        }
        if (sName.includes("Dark") || sName.includes("Cosmic") || sName.includes("Navy") || sName.includes("Steel")) {
          return true;
        }
        const styleConfig = Styles[sName];
        if (styleConfig) {
          if (styleConfig.bgGradient && styleConfig.bgGradient.length > 0) {
            return isColorDarkObj(styleConfig.bgGradient[0]);
          }
          if (styleConfig.bgColor) {
            return isColorDarkObj(styleConfig.bgColor);
          }
        }
        return false;
      };

      const isDarkBg = isBgDark();
      ctx.save();
      ctx.fillStyle = isDarkBg
        ? "rgba(255, 255, 255, 0.45)"
        : "rgba(0, 0, 0, 0.35)";

      // Set font size based on final canvas width
      const referenceWidth = canvas.width;
      ctx.font = `${Math.max(12, referenceWidth * 0.024)}px sans-serif`;
      ctx.textAlign = "right";

      if (lName === "None" && !manualCanvasSize) {
        const styleConfig = Styles[sName];
        const paddingVal = Math.max(img.width, img.height) * (styleConfig ? styleConfig.paddingFactor : 0);
        ctx.fillText(
          "Edited with Photy",
          paddingVal + img.width - canvas.width * 0.015,
          paddingVal + img.height - canvas.height * 0.015,
        );
      } else {
        // Use 4% margin
        ctx.fillText(
          "Edited with Photy",
          canvas.width - canvas.width * 0.04,
          canvas.height - canvas.height * 0.04,
        );
      }
      ctx.restore();
    }

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
      } else if (activeTool === "arrows" && drawingPointsRef.current.length >= 2) {
        drawShape(ctx, selectedShapeTool, drawingPointsRef.current, selectedDrawColor, brushSize);
      }
    }
  };

  // Trigger redraw when state changes for live preview
  useEffect(() => {
    redraw();
  }, [currentText, currentTextFont, currentTextColor, currentTextBgColor, currentTextShadow, currentTextShadowColor, currentTextRotation, textPositionMode, texts, showTextModal, activeTool, selectedTextIndex, selectedShapeTool]);

  useEffect(() => {
    redraw();
  }, [paths, brushSize, selectedDrawColor, selectedBlurColor, brightness, selectedShapeTool, editingPathIndex]);

  useEffect(() => {
    const t = setTimeout(() => {
      redraw();
    }, 10);
    return () => clearTimeout(t);
  }, [manualImageScale, manualImageOffset]);

  const getCanvasPoint = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
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
        textInitialDistRef.current = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
        textInitialSizeRef.current = texts[draggingTextIndex].size;
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

      const dist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      isPinchZoomingRef.current = true;
      setIsDrawing(false);
      currentPathRef.current = null;
      drawingPointsRef.current = [];
      setSuggestedShape(null);

      if (activeTool === "size") {
        zoomInitialDistanceRef.current = dist;
        zoomInitialScaleRef.current = manualImageScale;
        zoomStartRef.current = {
          x: ((touch1.clientX + touch2.clientX) / 2) - manualImageOffset.x,
          y: ((touch1.clientY + touch2.clientY) / 2) - manualImageOffset.y
        };
        return;
      }

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
        setShouldCommit(true);
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
      setEditingPathIndex(-1);
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
          setSelectedStickerTextColor(t.color || "#FFFFFF");
          setSelectedStickerShadow(t.hasShadow !== false);
          setSelectedStickerShadowColor(t.shadowColor || "rgba(0,0,0,0.6)");
          setSelectedStickerBgColor(t.bgColor || "transparent");
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
          setCurrentTextShadowColor(t.shadowColor || "rgba(0,0,0,0.6)");
          setCurrentTextBgColor(t.bgColor || "transparent");
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
      if (activeTool === "size") {
        textDragModeRef.current = "image_pan" as any;
        dragOffsetRef.current = {
          x: pt.x - manualImageOffset.x,
          y: pt.y - manualImageOffset.y
        };
        return;
      }
    }

    // Check if we hit the resize handles of the currently selected path first
    if (editingPathIndex >= 0 && editingPathIndex < paths.length) {
      const p = paths[editingPathIndex];
      if (p.shapeType) { // Allow modifying all shape types by endpoints
        if (p.points.length >= 2) {
          const start = p.points[0];
          const end = p.points[p.points.length - 1];
          const threshold = 30; // generous hit area
          if (Math.hypot(pt.x - start.x, pt.y - start.y) < threshold) {
            isDraggingPathRef.current = true;
            pathDragEndpointRef.current = "start";
            pathDragStartRef.current = { x: pt.x, y: pt.y };
            lastPathPointsRef.current = [...p.points];
            return;
          } else if (Math.hypot(pt.x - end.x, pt.y - end.y) < threshold) {
            isDraggingPathRef.current = true;
            pathDragEndpointRef.current = "end";
            pathDragStartRef.current = { x: pt.x, y: pt.y };
            lastPathPointsRef.current = [...p.points];
            return;
          }
        }
      }
    }

    // Hit test for paths (Draw/Blur/Arrows)
    const clickedPathIndex = paths.findIndex((p) => isPointNearPath(pt, p));

    if (clickedPathIndex >= 0) {
      setSelectedTextIndex(null);
      setEditingPathIndex(clickedPathIndex);
      isDraggingPathRef.current = true;
      pathDragEndpointRef.current = "move";
      pathDragStartRef.current = { x: pt.x, y: pt.y };
      lastPathPointsRef.current = [...paths[clickedPathIndex].points];
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
        
        const currentDist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
        const factor = textInitialDistRef.current ? currentDist / textInitialDistRef.current : 1;
        const newSize = Math.max(10, Math.min(2000, textInitialSizeRef.current * factor));
        
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
            size: newSize,
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
        if (activeTool === "size") {
          const dist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
          const factor = dist / zoomInitialDistanceRef.current;
          const newScale = Math.max(0.1, Math.min(10, zoomInitialScaleRef.current * factor));
          setManualImageScale(newScale);

          const midX = (touch1.clientX + touch2.clientX) / 2;
          const midY = (touch1.clientY + touch2.clientY) / 2;
          setManualImageOffset({
            x: midX - zoomStartRef.current.x,
            y: midY - zoomStartRef.current.y
          });
          redraw();
          return;
        }

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

    if (isDraggingPathRef.current && editingPathIndex >= 0 && editingPathIndex < paths.length) {
      e.preventDefault();
      const dx = pt.x - pathDragStartRef.current.x;
      const dy = pt.y - pathDragStartRef.current.y;
      
      const newPaths = [...paths];
      const p = newPaths[editingPathIndex];
      const originalPoints = lastPathPointsRef.current;
      
      let movedPoints = originalPoints;
      const mode = pathDragEndpointRef.current || "move";

      if (mode === "start" && originalPoints.length >= 2) {
         movedPoints = [...originalPoints];
         movedPoints[0] = { x: originalPoints[0].x + dx, y: originalPoints[0].y + dy };
      } else if (mode === "end" && originalPoints.length >= 2) {
         movedPoints = [...originalPoints];
         movedPoints[movedPoints.length - 1] = { x: originalPoints[movedPoints.length - 1].x + dx, y: originalPoints[movedPoints.length - 1].y + dy };
      } else {
         movedPoints = originalPoints.map(point => ({
           x: point.x + dx,
           y: point.y + dy
         }));
      }
      
      const newPath2D = new Path2D();
      if (movedPoints.length > 0) {
        newPath2D.moveTo(movedPoints[0].x, movedPoints[0].y);
        for (let i = 1; i < movedPoints.length; i++) {
          newPath2D.lineTo(movedPoints[i].x, movedPoints[i].y);
        }
      }
      
      newPaths[editingPathIndex] = {
        ...p,
        points: movedPoints,
        path2d: newPath2D
      };
      
      setPaths(newPaths);
      redraw(undefined, newPaths);
      return;
    }

    if (textDragModeRef.current === ("image_pan" as any)) {
      e.preventDefault();
      setManualImageOffset({
        x: pt.x - dragOffsetRef.current.x,
        y: pt.y - dragOffsetRef.current.y
      });
      redraw();
      return;
    }

    if (draggingTextIndex !== null) {
      e.preventDefault();
      const nextTexts = [...texts];
      if (nextTexts[draggingTextIndex]) {
        if (textDragModeRef.current === "resize_rotate") {
          const parentText = nextTexts[draggingTextIndex];
          const rCurrent = Math.hypot(pt.x - parentText.x, pt.y - parentText.y);
          const sizeNew = Math.max(12, Math.round(initialTextSizeRef.current * (rCurrent / initialPointerDistRef.current)));
          
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
      if (activeTool === "arrows") {
        drawingPointsRef.current = [drawingPointsRef.current[0], pt];
      } else {
        currentPathRef.current.lineTo(pt.x, pt.y);
        drawingPointsRef.current.push(pt);
      }
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
          if (activeTool !== "size" && zoomScale <= 1.05) {
            setZoomScale(1);
            setZoomOffset({ x: 0, y: 0 });
          }
          return;
        }
      } else if (e.touches.length === 1 && isPinchZoomingRef.current) {
        const touch = e.touches[0];
        if (activeTool === "size") {
          zoomStartRef.current = {
            x: touch.clientX - manualImageOffset.x,
            y: touch.clientY - manualImageOffset.y
          };
        } else {
          zoomStartRef.current = {
            x: touch.clientX - zoomOffset.x,
            y: touch.clientY - zoomOffset.y
          };
        }
        zoomInitialDistanceRef.current = null;
        return;
      }
    }

    if (isPinchZoomingRef.current) {
      return;
    }

    if (isDraggingPathRef.current) {
      isDraggingPathRef.current = false;
      setShouldCommit(true);
      redraw();
      return;
    }

    if (textDragModeRef.current === ("image_pan" as any)) {
      textDragModeRef.current = null;
      redraw();
      return;
    }

    if (draggingTextIndex !== null) {
      setDraggingTextIndex(null);
      textDragModeRef.current = null;
      setShouldCommit(true);
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
        setShouldCommit(true);
      }
      
      cropStartRef.current = null;
      cropEndRef.current = null;
      tempCropRectRef.current = null;
      cropDragModeRef.current = "none";
    } else if (currentPathRef.current && canvasRef.current) {
      const isArrowTool = activeTool === "arrows";
      const color =
        (activeTool === "draw" || isArrowTool) ? selectedDrawColor : selectedBlurColor;
      const width = brushSize;

      // Only add paths that have substantive movement to avoid "junk" dots when tapping to deselect
      const points = drawingPointsRef.current;
      let isSubstantive = false;
      if (points.length >= 2) {
        const dx = points[points.length - 1].x - points[0].x;
        const dy = points[points.length - 1].y - points[0].y;
        if (Math.hypot(dx, dy) > 6 || points.length > 5) {
          isSubstantive = true;
        }
      }

      if (!isSubstantive) {
        currentPathRef.current = null;
        redraw();
        return;
      }

      const newPaths = [
        ...paths,
        {
          points: [...drawingPointsRef.current],
          path2d: currentPathRef.current,
          color,
          width: width,
          isBlur: activeTool === "blur",
          shapeType: isArrowTool ? selectedShapeTool : undefined,
        },
      ];
      setPaths(newPaths);
      setShouldCommit(true);

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

    const designW = canvas.width > 100 ? canvas.width : (cropRect ? cropRect.w : 1080);
    const designH = canvas.height > 100 ? canvas.height : (cropRect ? cropRect.h : 1080);

    const size = currentTextSize;
    let x = designW / 2;
    let y = designH / 2;

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
      if (textPositionMode === "Bottom") y = designH - 20;
    }

    const newText: TextItem = {
      ... (editingTextIndex >= 0 ? texts[editingTextIndex] : {}),
      text: currentText,
      x,
      y,
      color: currentTextColor,
      size: currentTextSize,
      positionMode: textPositionMode,
      fontName: currentTextFont,
      rotation: currentTextRotation,
      hasShadow: currentTextShadow,
      shadowColor: currentTextShadowColor,
      bgColor: currentTextBgColor,
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
    setShouldCommit(true);

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
      setShouldCommit(true);
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
      color: type === "badge" ? selectedStickerTextColor : selectedStickerColor,
      size,
      positionMode: "Default",
      fontName: selectedStickerFont,
      rotation: selectedStickerRotation,
      hasShadow: type === "badge" ? selectedStickerShadow : true,
      shadowColor: type === "badge" ? selectedStickerShadowColor : undefined,
      bgColor: type === "badge" ? selectedStickerBgColor : undefined,
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
    setShouldCommit(true);

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
        color: t.stickerType === "badge" ? t.color : newColor
      };
      setTexts(nextTexts);
      redraw(undefined, undefined, nextTexts);
    }
  };

  const handleUpdateActiveStickerTextColor = (newColor: string) => {
    setSelectedStickerTextColor(newColor);
    if (editingTextIndex >= 0) {
      const nextTexts = [...texts];
      nextTexts[editingTextIndex] = { ...nextTexts[editingTextIndex], color: newColor };
      setTexts(nextTexts);
      redraw(undefined, undefined, nextTexts);
    }
  };

  const handleUpdateActiveStickerShadow = (val: boolean) => {
    setSelectedStickerShadow(val);
    if (editingTextIndex >= 0) {
      const nextTexts = [...texts];
      nextTexts[editingTextIndex] = { ...nextTexts[editingTextIndex], hasShadow: val };
      setTexts(nextTexts);
      redraw(undefined, undefined, nextTexts);
    }
  };

  const handleUpdateActiveStickerShadowColor = (color: string) => {
    setSelectedStickerShadowColor(color);
    if (editingTextIndex >= 0) {
      const nextTexts = [...texts];
      nextTexts[editingTextIndex] = { ...nextTexts[editingTextIndex], shadowColor: color };
      setTexts(nextTexts);
      redraw(undefined, undefined, nextTexts);
    }
  };

  const handleUpdateActiveStickerBgColor = (color: string) => {
    setSelectedStickerBgColor(color);
    if (editingTextIndex >= 0) {
      const nextTexts = [...texts];
      nextTexts[editingTextIndex] = { ...nextTexts[editingTextIndex], bgColor: color };
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

  const handleApplySaveCrop = async () => {
    const screenshotSrc = workingOriginalSrc || imageSrc;
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
        cropRect,
        manualCanvasSize,
        manualImageOffset,
        manualImageScale,
        false,
        resizeMode,
        resizerBg
      );

      // 3. Load both images into refs so the editor instantly switches to the new styled mockup and raw base
      const updatedStyledImg = new Image();
      const updatedRawImg = new Image();
      
      let loadedCount = 0;
      const onImageLoaded = () => {
        loadedCount++;
        if (loadedCount === 2) {
          rawScreenshotRef.current = updatedRawImg;
          styledImageRef.current = updatedStyledImg;
          originalImageRef.current = updatedStyledImg;

          // Keep local clean src in sync so layout previews updated for size changes correctly
          setCurrentCleanSrc(cleanDataUrl);
          setWorkingOriginalSrc(cleanDataUrl);
          setCropRect({ x: 0, y: 0, w: cropRect.w, h: cropRect.h });

          // Switch tool to none, to exit the crop mode and let them preview/continue drawing!
          setActiveTool("none");
          setIsApplyingCrop(false);

          // Force a redraw with the new image loaded. Since we now set the styled image,
          // the canvas fits the newly generated styled mockup, which is perfect and scaled!
          fitImageToContainer(updatedStyledImg, { x: 0, y: 0, w: updatedStyledImg.width, h: updatedStyledImg.height });
        }
      };

      if (!newStyledDataUrl.startsWith("data:")) {
        updatedStyledImg.crossOrigin = "anonymous";
      }
      updatedStyledImg.onload = onImageLoaded;
      updatedStyledImg.onerror = () => {
        console.error("Failed to load cropped styled image");
        setIsApplyingCrop(false);
      };
      updatedStyledImg.src = newStyledDataUrl;

      if (!cleanDataUrl.startsWith("data:")) {
        updatedRawImg.crossOrigin = "anonymous";
      }
      updatedRawImg.onload = onImageLoaded;
      updatedRawImg.onerror = () => {
        console.error("Failed to load cropped raw screenshot");
        setIsApplyingCrop(false);
      };
      updatedRawImg.src = cleanDataUrl;

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
        
        // Redraw without bounding boxes to capture clean preview
        redraw(undefined, undefined, undefined, true);
        let previewDataUrl = canvasRef.current.toDataURL("image/png");
        // Put bounding boxes back
        redraw();
        
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
          workingOriginalSrc,
          manualImageOffset,
          manualImageScale,
          resizeMode,
          resizerBg,
          canvasRef.current ? { width: canvasRef.current.width, height: canvasRef.current.height } : undefined
        );
      }
    }
  };

  return (
    <div 
      className="flex flex-col h-full bg-black text-white absolute inset-0 z-50"
      style={{ paddingTop: (!isPremium && isNative) ? 'calc(env(safe-area-inset-top) + 95px)' : undefined }}
    >
      <canvas ref={blurCanvasRef} className="hidden" />

      <div className={`flex items-center justify-between p-4 bg-[#111] z-10 border-b border-white/10 ${(!isPremium && isNative) ? '' : 'pt-safe'}`}>
        <button
          onClick={onCancel}
          className="p-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={undo}
            disabled={historyIndex <= 0}
            className="p-2 disabled:opacity-20 disabled:cursor-not-allowed hover:bg-white/10 rounded-full transition-colors active:scale-95 text-white"
            aria-label="Undo"
          >
            <Undo className="w-5 h-5" />
          </button>
          
          <span className="font-medium text-sm tracking-wide text-white px-2">EDITOR</span>

          <button
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            className="p-2 disabled:opacity-20 disabled:cursor-not-allowed hover:bg-white/10 rounded-full transition-colors active:scale-95 text-white"
            aria-label="Redo"
          >
            <Redo className="w-5 h-5" />
          </button>
        </div>

        <button
          onClick={handleSave}
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-sm font-medium rounded-full transition-colors"
        >
          Save
        </button>
      </div>

      <div
        ref={containerRef}
        className="flex items-center justify-center relative overflow-hidden bg-[#0a0a0a] flex-1 min-h-[240px] sm:min-h-[350px]"
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
            onWheel={(e) => {
              if (activeTool === "size") {
                e.preventDefault();
                const zoomFactor = -e.deltaY * 0.005;
                setManualImageScale(prev => Math.max(0.1, Math.min(10, prev + zoomFactor)));
                setTimeout(() => redraw(), 0);
              }
            }}
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
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
            <button
              onClick={() => {
                const newPaths = [...paths];
                newPaths.splice(editingPathIndex, 1);
                setPaths(newPaths);
                setEditingPathIndex(-1);
                setShouldCommit(true);
                redraw(undefined, newPaths);
              }}
              className="bg-red-600 hover:bg-red-500 text-white px-4 py-1.5 rounded-full font-bold text-xs shadow-xl border border-white/20 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
            <button
              onClick={() => {
                setEditingPathIndex(-1);
                redraw();
              }}
              className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-1.5 rounded-full font-bold text-xs shadow-xl border border-white/10 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              Deselect
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
                setShouldCommit(true);
                setSuggestedShape(null);
              }}
              className="bg-blue-600 shadow-xl shadow-blue-900/40 text-white px-6 py-3 rounded-full font-bold animate-pulse flex items-center gap-2 border border-white/20 whitespace-nowrap"
            >
              ✨ Perfect to {suggestedShape}?
            </button>
          </div>
        )}
      </div>

      {isWatermarkMode && !showAllToolsInWatermark ? (
        <div className="bg-[#111] p-3 pb-safe border-t border-white/10 flex flex-col gap-2 shrink-0 z-20">
          <div className="flex items-center justify-between shrink-0">
            <span className="text-[10px] font-extrabold tracking-widest text-[#22D3EE] uppercase">
              Watermark Properties
            </span>
            <span className="text-[9px] text-gray-400">
              Drag / style watermark manually
            </span>
          </div>

          <div className="flex flex-col gap-2.5 min-h-[190px]">
            {texts.length > 0 ? (() => {
              const activeIdx = selectedTextIndex !== null && selectedTextIndex < texts.length 
                ? selectedTextIndex 
                : texts.length - 1;
              const selectedWatermark = texts[activeIdx];
              
              // Helper to handle property changes and ensure selection
              const updateActive = (updater: (item: TextItem) => void) => {
                const next = [...texts];
                updater(next[activeIdx]);
                setTexts(next);
                if (selectedTextIndex !== activeIdx) setSelectedTextIndex(activeIdx);
                redraw(undefined, undefined, next);
              };

              return (
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center w-full">
                    <span className="text-[9px] font-extrabold text-gray-400 tracking-wider flex-1 uppercase">
                      {selectedWatermark.isLogo ? "Logo Image" : "Watermark Text"}
                    </span>
                    <button
                      onClick={() => {
                        const next = [...texts];
                        next.splice(activeIdx, 1);
                        setTexts(next);
                        setSelectedTextIndex(null);
                        redraw(undefined, undefined, next);
                      }}
                      className="flex items-center gap-1 text-red-400/80 hover:text-red-400 bg-red-400/10 hover:bg-red-400/20 px-2 py-1 rounded-md transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span className="text-[10px] font-bold">Remove</span>
                    </button>
                  </div>

                  {!selectedWatermark.isLogo && (
                    <div className="flex flex-col gap-0.5">
                      <input
                        type="text"
                        value={selectedWatermark.text}
                        onChange={(e) => updateActive((item) => { item.text = e.target.value; })}
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-1.5 text-white text-xs outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                        placeholder="Enter watermark text"
                      />
                    </div>
                  )}

                  {!selectedWatermark.isLogo && (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] font-extrabold text-gray-400 tracking-wider uppercase">Text Color</span>
                      <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                        {textColors.map((color) => (
                          <button
                            key={color}
                            onClick={() => updateActive((item) => { item.color = color; })}
                            className={`w-5 h-5 shrink-0 rounded-full border transition-transform duration-150 ${
                              selectedWatermark.color === color ? "border-blue-500 scale-110 ring-2 ring-blue-500/30" : "border-white/10"
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sizing, Opacity and Rotation adjustments in super compact columns */}
                  <div className="grid grid-cols-3 gap-2 mt-0.5 shadow-sm">
                    <div className="flex flex-col gap-1 bg-white/[0.04] px-2.5 py-1.5 rounded-xl border border-white/5">
                      <div className="flex justify-between items-center text-[8px] font-extrabold text-gray-400 tracking-wider">
                        <span>SIZE</span>
                        <span className="text-white font-mono text-[9px]">{selectedWatermark.size}px</span>
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={canvasRef.current ? Math.round(Math.min(canvasRef.current.width, canvasRef.current.height) * (selectedWatermark.isLogo ? 0.82 : 0.62)) : (selectedWatermark.isLogo ? 650 : 300)}
                        value={selectedWatermark.size}
                        onChange={(e) => updateActive((item) => { item.size = parseInt(e.target.value); })}
                        className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>

                    <div className="flex flex-col gap-1 bg-white/[0.04] px-2.5 py-1.5 rounded-xl border border-white/5">
                      <div className="flex justify-between items-center text-[8px] font-extrabold text-gray-400 tracking-wider">
                        <span>OPACITY</span>
                        <span className="text-white font-mono text-[9px]">{Math.round((selectedWatermark.opacity !== undefined ? selectedWatermark.opacity : 1.0) * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min={0.1}
                        max={1.0}
                        step={0.05}
                        value={selectedWatermark.opacity !== undefined ? selectedWatermark.opacity : 1.0}
                        onChange={(e) => updateActive((item) => { item.opacity = parseFloat(e.target.value); })}
                        className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>

                    <div className="flex flex-col gap-1 bg-white/[0.04] px-2.5 py-1.5 rounded-xl border border-white/5">
                      <div className="flex justify-between items-center text-[8px] font-extrabold text-gray-400 tracking-wider">
                        <span>ROTATE</span>
                        <span className="text-white font-mono text-[9px]">{Math.round((selectedWatermark.rotation || 0) * 180 / Math.PI)}°</span>
                      </div>
                      <input
                        type="range"
                        min={-180}
                        max={180}
                        value={Math.round((selectedWatermark.rotation || 0) * 180 / Math.PI)}
                        onChange={(e) => updateActive((item) => { item.rotation = parseInt(e.target.value) * Math.PI / 180; })}
                        className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>
                  </div>
                </div>
              );
            })() : (
              <div className="text-center py-3 px-4 bg-white/5 rounded-xl border border-dashed border-white/10 text-[11px] text-gray-400 my-auto leading-relaxed">
                No watermarks added yet. Click the buttons below to add text or a logo!
              </div>
            )}
          </div>

          {/* Action Footer block */}
          <div className="flex gap-2 justify-between items-center mt-1 border-t border-white/5 pt-3">
            <div className="flex gap-2">
              <button
                onClick={() => logoInputRef.current?.click()}
                className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-2 px-3 rounded-xl text-[11px] transition-all active:scale-95 cursor-pointer border border-white/5 shadow-md"
              >
                <Upload className="w-4 h-4 text-emerald-400" />
                Upload Logo
              </button>
              <input
                type="file"
                ref={logoInputRef}
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    // Clear input so same file can be re-selected
                    e.target.value = "";
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const src = event.target?.result as string;
                      const img = new Image();
                      img.onload = () => {
                        const newLogo: TextItem = {
                          text: "Logo",
                          x: canvasRef.current ? canvasRef.current.width / 2 : 250,
                          y: canvasRef.current ? canvasRef.current.height / 2 : 250,
                          color: "transparent",
                          size: Math.round(Math.min(canvasRef.current ? canvasRef.current.width : 500, canvasRef.current ? canvasRef.current.height : 500) * 0.25) || 120,
                          positionMode: "Default",
                          fontName: "Default",
                          isLogo: true,
                          logoSrc: src,
                          logoImg: img,
                          opacity: 0.7,
                          rotation: 0,
                        };
                        const updated = [...texts, newLogo];
                        setTexts(updated);
                        setSelectedTextIndex(updated.length - 1);
                        setShouldCommit(true);
                        redraw(undefined, undefined, updated);
                      };
                      img.onerror = () => {
                        console.error("Failed to load uploaded logo image");
                      };
                      img.src = src;
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />

              <button
                onClick={() => {
                  const designW = canvasRef.current && canvasRef.current.width > 100 ? canvasRef.current.width : (cropRect ? cropRect.w : 1080);
                  const designH = canvasRef.current && canvasRef.current.height > 100 ? canvasRef.current.height : (cropRect ? cropRect.h : 1080);
                  const baseSize = designW;
                  const newTxt: TextItem = {
                    text: "Draft Watermark",
                    x: designW / 2,
                    y: designH / 2,
                    color: "#FFFFFF",
                    size: Math.round(baseSize * 0.12) || 120,
                    positionMode: "Default",
                    fontName: "Space Grotesk",
                    hasShadow: true,
                    shadowColor: "rgba(0, 0, 0, 0.4)",
                    bgColor: "rgba(0, 0, 0, 0.35)",
                    opacity: 0.85,
                    rotation: 0,
                  };
                  const updated = [...texts, newTxt];
                  setTexts(updated);
                  setSelectedTextIndex(updated.length - 1);
                  setShouldCommit(true);
                  redraw(undefined, undefined, updated);
                }}
                className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-2 px-3 rounded-xl text-[11px] transition-all active:scale-95 cursor-pointer border border-white/5 shadow-md"
              >
                <Type className="w-4 h-4 text-blue-400" />
                Add Text
              </button>
            </div>

            <button
              onClick={() => {
                setShowAllToolsInWatermark(true);
                setActiveTool("none");
              }}
              className="flex items-center gap-1 bg-zinc-900 border border-white/10 hover:bg-zinc-800 text-gray-300 hover:text-white font-bold py-2 px-3 rounded-xl text-[11px] transition-all active:scale-95 cursor-pointer font-medium"
            >
              Add More <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-start gap-1 p-3 bg-[#111] pb-safe z-10 border-t border-white/10 overflow-x-auto no-scrollbar">
          <ToolButton
            active={false}
            disabled={isRotating}
            onClick={handleRotate90}
            icon={isRotating ? <Loader2 className="animate-spin" /> : <RotateCw />}
            label="Rotate"
          />
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
            active={activeTool === "arrows"}
            onClick={() => setActiveTool(activeTool === "arrows" ? "none" : "arrows")}
            icon={<ArrowRight />}
            label="Arrows"
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
              if (activeTool === "text" && showTextModal) {
                setActiveTool("none");
                setShowTextModal(false);
              } else {
                if (selectedTextIndex !== null && selectedTextIndex >= 0 && selectedTextIndex < texts.length) {
                  const t = texts[selectedTextIndex];
                  setEditingTextIndex(selectedTextIndex);
                  setCurrentText(t.text);
                  setCurrentTextColor(t.color);
                  setCurrentTextSize(t.size);
                  setCurrentTextFont(t.fontName);
                  setCurrentTextRotation(t.rotation || 0);
                  setCurrentTextShadow(t.hasShadow || false);
                  setCurrentTextShadowColor(t.shadowColor || "rgba(0,0,0,0.6)");
                  setCurrentTextBgColor(t.bgColor || "transparent");
                  setTextPositionMode(t.positionMode);
                  setActiveTool("text");
                  setShowTextModal(true);
                } else {
                  setActiveTool("text");
                  setEditingTextIndex(-1);
                  setCurrentText("");
                  setCurrentTextRotation(0);
                  setCurrentTextShadow(false);
                  setTextPositionMode("Default");
                  setShowTextModal(true);
                  setShowStickerPanel(false);
                }
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
                setShouldCommit(true);
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

          {isWatermarkMode && (
            <button
              onClick={() => {
                setShowAllToolsInWatermark(false);
                setActiveTool("none");
              }}
              className="flex items-center gap-1 ml-2 bg-[#22D3EE]/20 hover:bg-[#22D3EE]/40 border border-[#22D3EE]/30 text-[#22D3EE] hover:text-white font-bold py-2 px-3 rounded-xl text-xs whitespace-nowrap transition-all cursor-pointer shadow-sm"
            >
              Watermark Style
            </button>
          )}
        </div>
      )}

      {/* Floating Color Selector for Draw and Blur */}
      <AnimatePresence>
        {(activeTool === "draw" || activeTool === "blur" || activeTool === "arrows") && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-2 bg-[#111111] border-t border-white/5 flex flex-col gap-2 shrink-0 z-20 overflow-hidden"
          >
            {activeTool === "arrows" && (
              <div className="flex items-center justify-between border-b border-white/5 pb-1.5 mb-1.5 w-full gap-1.5">
                <button
                  type="button"
                  onClick={() => setArrowSubTab("shape")}
                  className={`flex-1 py-1 px-1.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    arrowSubTab === "shape"
                      ? "bg-blue-600/25 border border-blue-500/30 text-blue-400"
                      : "bg-black/20 border border-white/5 text-gray-400 hover:text-white"
                  }`}
                >
                  <span className="w-1 h-1 rounded-full bg-blue-500" />
                  Shapes
                </button>
                <button
                  type="button"
                  onClick={() => setArrowSubTab("color")}
                  className={`flex-1 py-1 px-1.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    arrowSubTab === "color"
                      ? "bg-blue-600/25 border border-blue-500/30 text-blue-400"
                      : "bg-black/20 border border-white/5 text-gray-300 hover:text-white"
                  }`}
                >
                  <div className="w-2 h-2 rounded-full border border-white/30 shrink-0 shadow-sm animate-pulse" style={{ backgroundColor: selectedDrawColor }} />
                  Color
                </button>
                <button
                  type="button"
                  onClick={() => setArrowSubTab("thickness")}
                  className={`flex-1 py-1 px-1.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    arrowSubTab === "thickness"
                      ? "bg-blue-600/25 border border-blue-500/30 text-blue-400"
                      : "bg-black/20 border border-white/5 text-gray-400 hover:text-white"
                  }`}
                >
                  <span className="text-[8px] text-[#60a5fa] font-extrabold select-none shrink-0 bg-blue-500/10 px-1 rounded">{brushSize}px</span>
                  Size
                </button>
              </div>
            )}

            {activeTool === "arrows" && arrowSubTab === "shape" && (
              <div className="flex flex-col gap-1 w-full animate-fadeIn">
                <div className="grid grid-cols-6 gap-1 w-full bg-transparent p-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedShapeTool === "arrow") {
                        setActiveTool("none");
                      } else {
                        setSelectedShapeTool("arrow");
                      }
                    }}
                    className={`flex flex-col items-center justify-center gap-1 py-1 rounded-lg transition-all cursor-pointer ${
                      selectedShapeTool === "arrow"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-black/15 text-gray-400 hover:text-white"
                    }`}
                  >
                    <ArrowRight className="w-4 h-4 flex-shrink-0" />
                    <span className="text-[9px] font-medium tracking-tight whitespace-nowrap">Arrow</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (selectedShapeTool === "tapered_arrow") {
                        setActiveTool("none");
                      } else {
                        setSelectedShapeTool("tapered_arrow");
                      }
                    }}
                    className={`flex flex-col items-center justify-center gap-1 py-1 rounded-lg transition-all cursor-pointer ${
                      selectedShapeTool === "tapered_arrow"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-black/15 text-gray-400 hover:text-white"
                    }`}
                  >
                    <svg className="w-4 h-4 flex items-center justify-center flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M4.5,19.5 C4.5,19.5 12,12 15,9 C12,12 4.5,19.5 4.5,19.5 Z" />
                      <polygon points="12,7 20,4 17,12 14,9" />
                    </svg>
                    <span className="text-[9px] font-medium tracking-tight whitespace-nowrap">Tapered</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (selectedShapeTool === "double_arrow") {
                        setActiveTool("none");
                      } else {
                        setSelectedShapeTool("double_arrow");
                      }
                    }}
                    className={`flex flex-col items-center justify-center gap-1 py-1 rounded-lg transition-all cursor-pointer ${
                      selectedShapeTool === "double_arrow"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-black/15 text-gray-400 hover:text-white"
                    }`}
                  >
                    <svg className="w-4 h-4 flex items-center justify-center flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="19" x2="19" y2="5" />
                      <polyline points="14,5 19,5 19,10" />
                      <polyline points="10,19 5,19 5,14" />
                    </svg>
                    <span className="text-[9px] font-medium tracking-tight whitespace-nowrap">Double End</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (selectedShapeTool === "line") {
                        setActiveTool("none");
                      } else {
                        setSelectedShapeTool("line");
                      }
                    }}
                    className={`flex flex-col items-center justify-center gap-1 py-1 rounded-lg transition-all cursor-pointer ${
                      selectedShapeTool === "line"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-black/15 text-gray-400 hover:text-white"
                    }`}
                  >
                    <div className="w-4 h-0.5 bg-current my-1.5 flex-shrink-0" />
                    <span className="text-[9px] font-medium tracking-tight whitespace-nowrap">Line</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (selectedShapeTool === "rect") {
                        setActiveTool("none");
                      } else {
                        setSelectedShapeTool("rect");
                      }
                    }}
                    className={`flex flex-col items-center justify-center gap-1 py-1 rounded-lg transition-all cursor-pointer ${
                      selectedShapeTool === "rect"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-black/15 text-gray-400 hover:text-white"
                    }`}
                  >
                    <Square className="w-4 h-4 p-0.5 flex-shrink-0" />
                    <span className="text-[9px] font-medium tracking-tight whitespace-nowrap">Rectangle</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (selectedShapeTool === "circle") {
                        setActiveTool("none");
                      } else {
                        setSelectedShapeTool("circle");
                      }
                    }}
                    className={`flex flex-col items-center justify-center gap-1 py-1 rounded-lg transition-all cursor-pointer ${
                      selectedShapeTool === "circle"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-black/15 text-gray-400 hover:text-white"
                    }`}
                  >
                    <Circle className="w-4 h-4 p-0.5 flex-shrink-0" />
                    <span className="text-[9px] font-medium tracking-tight whitespace-nowrap">Circle</span>
                  </button>
                </div>
              </div>
            )}

            {((activeTool === "draw" || activeTool === "blur") || (activeTool === "arrows" && arrowSubTab === "color")) && (
              <div className="flex flex-col gap-1 w-full animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold tracking-widest text-[#60a5fa] uppercase">
                    {activeTool === "draw" ? "DRAW COLOR" : activeTool === "arrows" ? "ARROW & SHAPE COLOR" : "BLUR TINT OVERLAY"}
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
                <div className="flex gap-2 text-center items-center overflow-x-auto py-1.5 no-scrollbar scroll-smooth">
                  {(activeTool === "draw" || activeTool === "arrows") ? (
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
              </div>
            )}

            {((activeTool === "draw" || activeTool === "blur") || (activeTool === "arrows" && arrowSubTab === "thickness")) && (
              /* Premium Brush Size Control Slider */
              <div className="flex items-center justify-between gap-4 mt-1 w-full bg-transparent p-0 animate-fadeIn">
                <span className="text-[10px] font-extrabold tracking-widest text-[#60a5fa] uppercase shrink-0">
                  {activeTool === "arrows" ? "THICKNESS" : "BRUSH SIZE"}: {brushSize}px
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
                    className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <span className="text-[9px] font-extrabold text-gray-500 uppercase select-none">Max</span>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeTool === "crop" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-3 bg-[#111111] border-t border-white/5 flex flex-col gap-2 shrink-0 z-20 overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold tracking-widest text-gray-400 uppercase">
                ASPECT RATIO
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto py-1 no-scrollbar shrink-0">
              {[
                { label: "Original", value: "original" },
                { label: "1:1", value: "1:1" },
                { label: "9:16", value: "9:16", desc: "Story" },
                { label: "4:5", value: "4:5", desc: "Post" },
                { label: "16:9", value: "16:9" },
                { label: "4:3", value: "4:3" },
                { label: "3:4", value: "3:4" },
              ].map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => {
                    const img = originalImageRef.current;
                    if (!img) return;

                    if (preset.value === "original") {
                      setCropRect({ x: 0, y: 0, w: img.width, h: img.height });
                      setShouldCommit(true);
                      return;
                    }

                    let ratio = 1;
                    if (preset.value === "1:1") ratio = 1;
                    else if (preset.value === "9:16") ratio = 9 / 16;
                    else if (preset.value === "4:5") ratio = 4 / 5;
                    else if (preset.value === "16:9") ratio = 16 / 9;
                    else if (preset.value === "4:3") ratio = 4 / 3;
                    else if (preset.value === "3:4") ratio = 3 / 4;

                    let newW = img.width;
                    let newH = newW / ratio;

                    if (newH > img.height) {
                      newH = img.height;
                      newW = newH * ratio;
                    }

                    const newX = (img.width - newW) / 2;
                    const newY = (img.height - newH) / 2;

                    setCropRect({ x: newX, y: newY, w: newW, h: newH });
                    setShouldCommit(true);
                  }}
                  className="flex flex-col items-center justify-center min-w-[60px] px-3 py-1.5 bg-[#1c1c1e] hover:bg-[#2c2c2e] active:bg-[#3c3c3e] border border-white/10 rounded-xl transition-colors shrink-0"
                >
                  <span className="text-xs font-bold text-white">{preset.label}</span>
                  {preset.desc && (
                    <span className="text-[9px] text-gray-500 font-medium">
                      {preset.desc}
                    </span>
                  )}
                </button>
              ))}
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
        {activeTool === "size" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-4 bg-[#111111] border-t border-white/5 flex flex-col gap-3 shrink-0 z-20 max-h-[44vh] md:max-h-none overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold tracking-widest text-[#22D3EE] uppercase">
                Image Resizer & Canvas Dimensions
              </span>
              <button
                onClick={() => {
                  setManualCanvasSize(null);
                  setSelectedPresetLabel(null);
                  setResizeMode("stretch");
                  setResizerBg("transparent");
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
                className="text-[10px] text-cyan-400 font-extrabold tracking-wider uppercase hover:underline cursor-pointer"
              >
                Reset Size
              </button>
            </div>

            {/* Resize Style / Fitting Mode Selector */}
            <div className="flex flex-col gap-1.5 bg-white/5 border border-white/5 p-3 rounded-2xl">
              <label className="text-[9px] font-extrabold text-[#22D3EE] uppercase tracking-widest pl-1">
                Resize Style (Fits All Photo Sizes Perfectly)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    id: "fit_no_border",
                    label: "Aspect Match (No Borders)",
                    desc: "Shrinks photo to 1080 bounds, auto-sizing canvas to fit aspect ratio.",
                  },
                  {
                    id: "fit_border",
                    label: "Contain (Custom Borders)",
                    desc: "Reduces all 4 sides of the photo to fit inside selected size.",
                  },
                  {
                    id: "cover",
                    label: "Crop & Fill (Stretch Crop)",
                    desc: "Covers selected size completely by cutting/cropping excess edges.",
                  },
                  {
                    id: "stretch",
                    label: "Stretch to Fit",
                    desc: "Stretches and squishes photo to fill dimensions with zero black space.",
                  },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => {
                      setResizeMode(mode.id as any);
                      // Recalculate dimensions for the new fitting mode immediately
                      if (originalImageRef.current) {
                        const img = originalImageRef.current;
                        const aspect = cropRect ? (cropRect.w / cropRect.h) : (img.width / img.height);
                        let w = parseInt(canvasWidthInput) || img.width;
                        let h = parseInt(canvasHeightInput) || img.height;
                        if (mode.id === "fit_no_border") {
                          const targetAspect = w / h;
                          if (aspect > targetAspect) {
                            h = Math.round(w / aspect);
                          } else {
                            w = Math.round(h * aspect);
                          }
                          setCanvasWidthInput(w.toString());
                          setCanvasHeightInput(h.toString());
                          setManualCanvasSize({ width: w, height: h });
                        }
                      }
                    }}
                    className={`p-2 rounded-xl text-left border transition-all active:scale-95 cursor-pointer flex flex-col justify-between min-h-[64px] ${
                      resizeMode === mode.id
                        ? "bg-gradient-to-r from-blue-600 to-cyan-600 border-cyan-400/50 text-white shadow-lg shadow-cyan-500/10"
                        : "bg-black/20 border-white/10 text-gray-300 hover:bg-black/40 hover:text-white"
                    }`}
                  >
                    <span className="text-[10px] font-extrabold block">{mode.label}</span>
                    <span className="text-[8px] opacity-75 leading-tight block mt-1">{mode.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Border Background Fill Selector (rendered ONLY under contain fit with borders) */}
            {resizeMode === "fit_border" && (
              <div className="flex flex-col gap-1.5 bg-white/5 border border-white/5 p-3 rounded-2xl">
                <label className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest pl-1">
                  Border Background/Space Fill
                </label>
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                  {[
                    { id: "transparent", label: "Transparent", class: "bg-neutral-800 border-dashed border-white/30 text-gray-400" },
                    { id: "#FFFFFF", label: "White", class: "bg-white border-white/20 text-black" },
                    { id: "#000000", label: "Black", class: "bg-black border-white/10 text-white" },
                    { id: "#1E293B", label: "Dark Blue", class: "bg-slate-800 text-white" },
                    { id: "#3B82F6", label: "Vibrant Blue", class: "bg-blue-500 text-white" },
                    { id: "#EF4444", label: "Modern Red", class: "bg-red-500 text-white" },
                    { id: "blur", label: "Blurred Backdrop", class: "bg-gradient-to-tr from-cyan-500/50 to-indigo-500/50 text-white font-semibold" },
                  ].map((bg) => {
                    const isSelected = resizerBg === bg.id;
                    return (
                      <button
                        key={bg.id}
                        type="button"
                        onClick={() => setResizerBg(bg.id)}
                        className={`flex-shrink-0 px-2.5 py-1.5 rounded-xl text-[9px] font-bold text-center border transition-all active:scale-95 cursor-pointer max-h-[32px] flex items-center justify-center gap-1 ${
                          isSelected
                            ? "ring-2 ring-cyan-500 border-white shadow-lg shadow-cyan-500/20"
                            : "border-white/5 hover:border-white/20 text-gray-300"
                        } ${bg.class}`}
                      >
                        {bg.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
 
            {/* Quick Presets for Common Sizes */}
            <div className="flex flex-col gap-1.5 bg-white/5 border border-white/5 p-3 rounded-2xl">
              <label className="text-[9px] font-extrabold text-gray-500 uppercase tracking-widest pl-1">
                Common Size Preset Bounds
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "Insta Post", w: 1080, h: 1080 },
                  { label: "Insta Story", w: 1080, h: 1920 },
                  { label: "FB Post", w: 1080, h: 1080 },
                  { label: "Play Store", w: 1080, h: 1920 }
                ].map((preset, idx) => {
                  const isSelected = selectedPresetLabel === preset.label;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        const aspect = cropRect ? (cropRect.w / cropRect.h) : (originalImageRef.current ? (originalImageRef.current.width / originalImageRef.current.height) : 1);
                        let finalW = preset.w;
                        let finalH = preset.h;
                        
                        if (resizeMode === "fit_no_border") {
                          const targetAspect = preset.w / preset.h;
                          if (aspect > targetAspect) {
                            finalW = preset.w;
                            finalH = Math.round(preset.w / aspect);
                          } else {
                            finalH = preset.h;
                            finalW = Math.round(preset.h * aspect);
                          }
                        }
                        
                        setCanvasWidthInput(finalW.toString());
                        setCanvasHeightInput(finalH.toString());
                        setSelectedPresetLabel(preset.label);
                        setManualCanvasSize({ width: finalW, height: finalH });
                        
                        setTimeout(() => {
                          if (originalImageRef.current && cropRect) {
                            fitImageToContainer(
                              originalImageRef.current,
                              cropRect,
                            );
                          }
                        }, 0);
                      }}
                      className={`py-1.5 px-1.5 rounded-xl text-[9px] font-bold text-center border transition-all active:scale-95 cursor-pointer flex flex-col items-center justify-center min-h-[44px] ${
                        isSelected
                          ? "bg-cyan-600 border-cyan-400 text-white shadow-lg shadow-cyan-500/25"
                          : "bg-black/20 border-white/10 text-gray-300 hover:bg-black/40 hover:text-white"
                      }`}
                    >
                      <span className="truncate w-full block">{preset.label}</span>
                      <span className="text-[7.5px] opacity-65 font-mono block mt-0.5 mt-auto">{preset.w}×{preset.h}</span>
                    </button>
                  );
                })}
              </div>
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
                    setSelectedPresetLabel(null);
                    const w = parseInt(val);
                    if (!isNaN(w) && w > 0) {
                      const img = originalImageRef.current;
                      if (img) {
                        const aspect = cropRect ? (cropRect.w / cropRect.h) : (img.width / img.height);
                        if (resizeMode === "fit_no_border") {
                          const h = Math.round(w / aspect);
                          setCanvasHeightInput(h.toString());
                          setManualCanvasSize({ width: w, height: h });
                        } else {
                          const h = parseInt(canvasHeightInput);
                          if (!isNaN(h) && h > 0) {
                            setManualCanvasSize({ width: w, height: h });
                          }
                        }
                        setTimeout(() => {
                          if (originalImageRef.current && cropRect) {
                            fitImageToContainer(
                              originalImageRef.current,
                              cropRect,
                            );
                          }
                        }, 0);
                      }
                    }
                  }}
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:ring-1 ring-blue-500/50"
                  placeholder="Width"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-extrabold text-gray-500 uppercase tracking-wider pl-1 font-sans">
                  Height (px)
                </label>
                <input
                  type="number"
                  value={canvasHeightInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCanvasHeightInput(val);
                    setSelectedPresetLabel(null);
                    const h = parseInt(val);
                    if (!isNaN(h) && h > 0) {
                      const img = originalImageRef.current;
                      if (img) {
                        const aspect = cropRect ? (cropRect.w / cropRect.h) : (img.width / img.height);
                        if (resizeMode === "fit_no_border") {
                          const w = Math.round(h * aspect);
                          setCanvasWidthInput(w.toString());
                          setManualCanvasSize({ width: w, height: h });
                        } else {
                          const w = parseInt(canvasWidthInput);
                          if (!isNaN(w) && w > 0) {
                            setManualCanvasSize({ width: w, height: h });
                          }
                        }
                        setTimeout(() => {
                          if (originalImageRef.current && cropRect) {
                            fitImageToContainer(
                              originalImageRef.current,
                              cropRect,
                            );
                          }
                        }, 0);
                      }
                    }
                  }}
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:ring-1 ring-blue-500/50"
                  placeholder="Height"
                />
              </div>
            </div>

            <p className="text-[9px] text-gray-500 font-medium italic mt-0.5 px-1">
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
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 ring-blue-500 transition-all font-medium text-sm"
                    placeholder="Enter text here..."
                    value={currentText}
                    onChange={(e) => setCurrentText(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && currentText && handleAddText()
                    }
                    style={{
                      fontFamily: fontCSSMap[currentTextFont] || "sans-serif",
                      color: currentTextColor,
                      backgroundColor: currentTextBgColor === "transparent" 
                        ? (currentTextColor === "#FFFFFF" || currentTextColor.toLowerCase() === "#fff" || currentTextColor === "white" ? "#cbd5e1" : "white") 
                        : currentTextBgColor,
                      textShadow: currentTextShadow ? `2px 2px 4px ${currentTextShadowColor}` : "none",
                    }}
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1 pr-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">
                      Font Size
                    </label>
                    <span className="text-xs font-mono font-bold text-blue-600">{currentTextSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="2000"
                    step="1"
                    value={currentTextSize}
                    onChange={(e) => setCurrentTextSize(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 mb-2"
                  />
                </div>

                <div className="flex bg-gray-100 rounded-lg p-1 gap-1 mb-2 select-none overflow-x-auto no-scrollbar">
                  {[
                    { id: "font", label: "Font" },
                    { id: "color", label: "Color" },
                    { id: "bg", label: "Background" },
                    { id: "shadow", label: "Shadow" }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTextTab(tab.id as any)}
                      className={`flex-1 min-w-[70px] whitespace-nowrap text-xs font-bold px-2 py-1.5 rounded-md transition-all ${
                        activeTextTab === tab.id ? "bg-white shadow-sm text-blue-600" : "text-gray-500 hover:text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {activeTextTab === "font" && (
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
                )}

                {activeTextTab === "color" && (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">
                      Text Color
                    </label>
                    <div className="flex gap-2 justify-start flex-wrap">
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
                )}

                {activeTextTab === "bg" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-1 bg-gray-50/50 rounded-2xl border border-gray-100 px-3 py-2">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-widest select-none">
                        Background
                      </span>
                      <button
                        onClick={() => setCurrentTextBgColor(currentTextBgColor === "transparent" ? "#000000" : "transparent")}
                        role="switch"
                        aria-checked={currentTextBgColor !== "transparent"}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          currentTextBgColor !== "transparent" ? "bg-blue-600" : "bg-gray-200"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            currentTextBgColor !== "transparent" ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {currentTextBgColor !== "transparent" && (
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest pl-1 mb-2">
                          Background Color
                        </label>
                        <div className="flex gap-2 justify-start flex-wrap">
                          {textColors.map((color) => (
                            <button
                              key={color}
                              onClick={() => setCurrentTextBgColor(color)}
                              className={`w-7 h-7 shrink-0 rounded-full border border-gray-200 cursor-pointer transition-transform flex items-center justify-center ${
                                currentTextBgColor === color
                                  ? "border-blue-500 ring-2 ring-blue-500/30 scale-110"
                                  : "opacity-80 hover:opacity-100"
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTextTab === "shadow" && (
                  <div className="space-y-4">
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
                        Shadow Color
                      </label>
                      <div className="flex gap-2 justify-start flex-wrap">
                        {["rgba(0,0,0,0.6)", "rgba(255,255,255,0.8)", ...textColors].map((color) => (
                          <button
                            key={color}
                            onClick={() => {
                              setCurrentTextShadowColor(color);
                              setCurrentTextShadow(true);
                            }}
                            className={`w-7 h-7 shrink-0 rounded-full border border-gray-200 cursor-pointer transition-transform ${
                              currentTextShadowColor === color
                                ? "border-blue-500 ring-2 ring-blue-500/30 scale-110"
                                : "opacity-80 hover:opacity-100"
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

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
            // Music
            "🎵", "🎶", "🎸", "🎹", "🎧", "🎤", "🥁", "🎷", "🎺", "🎻",
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
            "Happy birthday", "Hbd", "Happy Anniversary", "Happy wedding", "My love", "I love you"
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
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                          Badge Label
                        </label>
                        <input
                          className="w-full border border-gray-300 rounded-full px-4 py-3 outline-none focus:ring-2 ring-blue-500 font-bold text-sm text-center uppercase transition-all"
                          placeholder="Type sticker text..."
                          maxLength={15}
                          value={selectedStickerText}
                          onChange={(e) => handleUpdateActiveStickerText(e.target.value.toUpperCase())}
                          style={{
                            fontFamily: fontCSSMap[selectedStickerFont] || "sans-serif",
                            color: selectedStickerTextColor,
                            backgroundColor: selectedStickerColor === "transparent" 
                              ? (selectedStickerTextColor === "#FFFFFF" || selectedStickerTextColor.toLowerCase() === "#fff" || selectedStickerTextColor === "white" ? "#cbd5e1" : "white") 
                              : selectedStickerColor,
                            boxShadow: selectedStickerShadow ? `0px 4px 12px ${selectedStickerShadowColor.replace('0.4', '0.2')}` : "none",
                          }}
                        />
                      </div>

                      {/* Segmented Tabs for Categories */}
                      <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar border-b border-gray-100 mb-4">
                        {["Presets", "Font", "Color", "Background", "Shadow"].map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setExpandedBadgeSection(tab)}
                            className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap ${
                              expandedBadgeSection === tab
                                ? "bg-white text-blue-600 shadow-sm border border-gray-100"
                                : "text-gray-400 hover:text-gray-600"
                            }`}
                          >
                            {tab}
                          </button>
                        ))}
                      </div>

                      {/* Tab Contents */}
                      <div className="min-h-[140px]">
                        {expandedBadgeSection === "Presets" && (
                          <div className="space-y-3">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Quick Presets</label>
                            <div className="grid grid-cols-3 gap-2">
                              {PRESET_BADGES.map((badge) => (
                                <button
                                  key={badge}
                                  onClick={() => handleUpdateActiveStickerText(badge)}
                                  className={`px-2 py-2 rounded-xl text-[10px] font-extrabold transition-all border ${
                                    selectedStickerText === badge
                                      ? "bg-black text-white border-black shadow-md scale-105"
                                      : "bg-gray-50 text-gray-600 border-gray-100 hover:bg-gray-100"
                                  }`}
                                >
                                  {badge}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {expandedBadgeSection === "Font" && (
                          <div className="space-y-3">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Text Font Style</label>
                            <div className="grid grid-cols-2 gap-2">
                              {fontNames.slice(0, 8).map((f) => (
                                <button
                                  key={f}
                                  onClick={() => handleUpdateActiveStickerFont(f)}
                                  className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all border text-left flex justify-between items-center ${
                                    selectedStickerFont === f
                                      ? "bg-blue-50 text-blue-600 border-blue-200 shadow-sm"
                                      : "bg-gray-50 text-gray-600 border-gray-100 hover:bg-gray-100"
                                  }`}
                                  style={{ fontFamily: fontCSSMap[f] }}
                                >
                                  <span className="truncate">{f}</span>
                                  {selectedStickerFont === f && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {expandedBadgeSection === "Color" && (
                          <div className="space-y-4">
                            <div>
                              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Text Color</label>
                              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar font-sans">
                                {textColors.map((color) => (
                                  <button
                                    key={color}
                                    onClick={() => handleUpdateActiveStickerTextColor(color)}
                                    className={`w-8 h-8 shrink-0 rounded-full border-2 transition-transform ${
                                      selectedStickerTextColor === color
                                        ? "border-blue-500 scale-110 shadow-md"
                                        : "border-gray-100 opacity-80"
                                    }`}
                                    style={{ backgroundColor: color }}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {expandedBadgeSection === "Background" && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Enable Background</label>
                              <button
                                onClick={() => {
                                  if (selectedStickerColor !== "transparent") {
                                    handleUpdateActiveStickerColor("transparent");
                                  } else {
                                    handleUpdateActiveStickerColor("#FF3366"); // Default or last color
                                  }
                                }}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                  selectedStickerColor !== "transparent" ? "bg-blue-600" : "bg-gray-200"
                                }`}
                              >
                                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${selectedStickerColor !== "transparent" ? "translate-x-4" : "translate-x-0"}`} />
                              </button>
                            </div>
                            
                            {selectedStickerColor !== "transparent" && (
                              <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Background Color</label>
                                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar font-sans border-t border-gray-50 pt-2">
                                  {BADGE_COLORS.map((color) => (
                                    <button
                                      key={color}
                                      onClick={() => handleUpdateActiveStickerColor(color)}
                                      className={`w-8 h-8 shrink-0 rounded-full border-2 transition-transform ${
                                        selectedStickerColor === color
                                          ? "border-blue-500 scale-110 shadow-md"
                                          : "border-gray-100 opacity-80"
                                      }`}
                                      style={{ backgroundColor: color }}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {expandedBadgeSection === "Shadow" && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Enable Shadow</label>
                              <button
                                onClick={() => handleUpdateActiveStickerShadow(!selectedStickerShadow)}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                  selectedStickerShadow ? "bg-blue-600" : "bg-gray-200"
                                }`}
                              >
                                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${selectedStickerShadow ? "translate-x-4" : "translate-x-0"}`} />
                              </button>
                            </div>
                            {selectedStickerShadow && (
                              <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Shadow Color</label>
                                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar font-sans border-t border-gray-50 pt-2">
                                  {["rgba(0,0,0,0.6)", "rgba(255,255,255,0.8)", ...textColors].map((color) => (
                                    <button
                                      key={color}
                                      onClick={() => handleUpdateActiveStickerShadowColor(color)}
                                      className={`w-7 h-7 shrink-0 rounded-full border transition-transform flex items-center justify-center ${
                                        selectedStickerShadowColor === color
                                          ? "border-blue-500 ring-2 ring-blue-500/30 scale-110 shadow-sm"
                                          : "border-gray-100 opacity-80"
                                      }`}
                                      style={{ backgroundColor: color }}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
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
