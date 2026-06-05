export { PHONE_FRAMES } from "./phoneFrames";
import { PHONE_FRAMES } from "./phoneFrames";

export interface StyleConfig {
  bgColor: string;
  bgGradient?: string[];
  paddingFactor: number;
  cornerRadiusFactor: number;
  shadowAlpha: number;
  contrastFactor: number;
  brightnessFactor: number;
}

export const Styles: Record<string, StyleConfig> = {
  Original: {
    bgColor: "#FFFFFF",
    paddingFactor: 0,
    cornerRadiusFactor: 0,
    shadowAlpha: 0,
    contrastFactor: 1,
    brightnessFactor: 1,
  },
  Minimal: {
    bgColor: "#F8FAFC",
    paddingFactor: 0.08,
    cornerRadiusFactor: 0.04,
    shadowAlpha: 0.15,
    contrastFactor: 1.05,
    brightnessFactor: 1.03,
  },
  Dark: {
    bgColor: "#0F172A",
    paddingFactor: 0.08,
    cornerRadiusFactor: 0.04,
    shadowAlpha: 0.3,
    contrastFactor: 1.1,
    brightnessFactor: 1.02,
  },
  Instagram: {
    bgColor: "#f09433",
    bgGradient: ["#f09433", "#e6683c", "#dc2743", "#cc2366", "#bc1888"],
    paddingFactor: 0.08,
    cornerRadiusFactor: 0.04,
    shadowAlpha: 0.2,
    contrastFactor: 1.05,
    brightnessFactor: 1.03,
  },
  Shadow: {
    bgColor: "#E2E8F0",
    paddingFactor: 0.12,
    cornerRadiusFactor: 0.04,
    shadowAlpha: 0.4,
    contrastFactor: 1,
    brightnessFactor: 1,
  },
  Money: {
    bgColor: "#065F46",
    paddingFactor: 0.08,
    cornerRadiusFactor: 0.04,
    shadowAlpha: 0.2,
    contrastFactor: 1.2,
    brightnessFactor: 1,
  },
  Focus: {
    bgColor: "#1F2937",
    paddingFactor: 0.1,
    cornerRadiusFactor: 0.04,
    shadowAlpha: 0.2,
    contrastFactor: 1.1,
    brightnessFactor: 1,
  },
  Viral: {
    bgColor: "#EF4444",
    paddingFactor: 0.05,
    cornerRadiusFactor: 0.04,
    shadowAlpha: 0.2,
    contrastFactor: 1.1,
    brightnessFactor: 1,
  },
  Chat: {
    bgColor: "#ECFDF5",
    paddingFactor: 0.15,
    cornerRadiusFactor: 0.08,
    shadowAlpha: 0.2,
    contrastFactor: 1.05,
    brightnessFactor: 1.03,
  },
  Stacked: {
    bgColor: "#F1F5F9",
    paddingFactor: 0.2,
    cornerRadiusFactor: 0.04,
    shadowAlpha: 0.2,
    contrastFactor: 1,
    brightnessFactor: 1,
  },
  "Stacked Left": {
    bgColor: "#F1F5F9",
    paddingFactor: 0.2,
    cornerRadiusFactor: 0.04,
    shadowAlpha: 0.2,
    contrastFactor: 1,
    brightnessFactor: 1,
  },
  "Stacked Right": {
    bgColor: "#F1F5F9",
    paddingFactor: 0.2,
    cornerRadiusFactor: 0.04,
    shadowAlpha: 0.2,
    contrastFactor: 1,
    brightnessFactor: 1,
  },
};

export interface SensitiveArea {
  rect: { x: number; y: number; width: number; height: number };
  type: string;
  isBlurred: boolean;
}

export interface LayoutConfig {
  name: string;
  deviceX: number; // 0 to 1 relative to canvas
  deviceY: number; // 0 to 1 relative to canvas
  deviceScale: number;
  rotation?: number;
  isLandscape?: boolean;
  premium?: boolean;
  themeColor: string; // Background color for this layout
  deviceType?: "iphone" | "samsung" | "ipad" | "custom";
  frameId?: string; // ID from PHONE_FRAMES
  placements?: {
    x: number;
    y: number;
    scale: number;
    rotation?: number;
    isLandscape?: boolean;
    isBack?: boolean;
  }[];
}

export const PhoneLayouts: Record<string, LayoutConfig> = {
  None: {
    name: "None",
    deviceX: 0.5,
    deviceY: 0.5,
    deviceScale: 1,
    themeColor: "#f3f4f6",
  },
  "iPhone 15": {
    name: "iPhone 15",
    deviceX: 0.5,
    deviceY: 0.5,
    deviceScale: 0.85,
    themeColor: "#3b82f6",
    deviceType: "iphone",
  },
  "Samsung S24": {
    name: "Samsung S24",
    deviceX: 0.5,
    deviceY: 0.5,
    deviceScale: 0.85,
    themeColor: "#10b981",
    deviceType: "samsung",
  },
  "iPad Pro": {
    name: "iPad Pro",
    deviceX: 0.5,
    deviceY: 0.5,
    deviceScale: 0.8,
    themeColor: "#6366f1",
    deviceType: "ipad",
  },
  "Bottom View": {
    name: "Bottom View",
    deviceX: 0.5,
    deviceY: 0.65,
    deviceScale: 0.7,
    themeColor: "#8b5cf6",
    deviceType: "iphone",
  },
  "Forest View": {
    name: "Forest View",
    deviceX: 0.5,
    deviceY: 0.65,
    deviceScale: 0.7,
    themeColor: "#10b981",
    deviceType: "iphone",
  },
  "Top View": {
    name: "Top View",
    deviceX: 0.5,
    deviceY: 0.35,
    deviceScale: 0.7,
    themeColor: "#f59e0b",
    deviceType: "iphone",
  },
  Elevated: {
    name: "Elevated",
    deviceX: 0.5,
    deviceY: 0.3,
    deviceScale: 0.8,
    themeColor: "#06b6d4",
    deviceType: "iphone",
  },
  "Split Right": {
    name: "Split Right",
    deviceX: 0.75,
    deviceY: 0.5,
    deviceScale: 0.8,
    themeColor: "#ec4899",
    deviceType: "iphone",
  },
  "Split Left": {
    name: "Split Left",
    deviceX: 0.25,
    deviceY: 0.5,
    deviceScale: 0.8,
    themeColor: "#6366f1",
    deviceType: "iphone",
  },
  Tilted: {
    name: "Tilted",
    deviceX: 0.5,
    deviceY: 0.5,
    deviceScale: 0.8,
    rotation: 15,
    themeColor: "#f97316",
    deviceType: "iphone",
  },
  "Cinema Center": {
    name: "Cinema Center",
    deviceX: 0.5,
    deviceY: 0.5,
    deviceScale: 0.85,
    isLandscape: true,
    themeColor: "#14b8a6",
    deviceType: "iphone",
  },
  "Cinema Top": {
    name: "Cinema Top",
    deviceX: 0.5,
    deviceY: 0.3,
    deviceScale: 0.7,
    isLandscape: true,
    themeColor: "#ef4444",
    deviceType: "iphone",
  },
  "Cinema Btm": {
    name: "Cinema Btm",
    deviceX: 0.5,
    deviceY: 0.7,
    deviceScale: 0.7,
    isLandscape: true,
    themeColor: "#4f46e5",
    deviceType: "iphone",
  },
  "Cinema Left": {
    name: "Cinema Left",
    deviceX: 0.25,
    deviceY: 0.6,
    deviceScale: 0.8,
    isLandscape: true,
    themeColor: "#84cc16",
    deviceType: "iphone",
  },
  "Cinema Right": {
    name: "Cinema Right",
    deviceX: 0.75,
    deviceY: 0.6,
    deviceScale: 0.8,
    isLandscape: true,
    themeColor: "#a855f7",
    deviceType: "iphone",
  },
  "iPad Hero": {
    name: "iPad Hero",
    deviceX: 0.5,
    deviceY: 0.5,
    deviceScale: 0.7,
    themeColor: "#1e293b",
    deviceType: "ipad",
  },
  "Samsung Tilted": {
    name: "Samsung Tilted",
    deviceX: 0.5,
    deviceY: 0.5,
    deviceScale: 0.8,
    rotation: 15,
    themeColor: "#f97316",
    deviceType: "samsung",
  },
};

// Cache for preloaded frame images
const frameImageCache: Record<string, HTMLImageElement> = {};

function getFrameImage(frameId: string): Promise<HTMLImageElement | null> {
  if (frameImageCache[frameId])
    return Promise.resolve(frameImageCache[frameId]);

  const frameData = PHONE_FRAMES.find((f) => f.id === frameId);
  if (!frameData || !frameData.image) return Promise.resolve(null);

  return new Promise((resolve) => {
    const img = new Image();
    img.referrerPolicy = "no-referrer";
    console.log(`Attempting to load frame image: ${frameData.image}`);
    const timeout = setTimeout(() => {
      img.onload = null;
      img.onerror = null;
      console.warn(`Frame image load timeout for: ${frameId}`);
      resolve(null);
    }, 15000);

    img.onload = () => {
      clearTimeout(timeout);
      console.log(`Successfully loaded frame image: ${frameId}`);
      frameImageCache[frameId] = img;
      resolve(img);
    };
    img.onerror = (e) => {
      clearTimeout(timeout);
      console.error(`Frame image load error for: ${frameId}`, e);
      resolve(null);
    };
    img.src = frameData.image;
  });
}

function drawDevice(
  ctx: CanvasRenderingContext2D,
  img: HTMLCanvasElement | HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  layout: LayoutConfig,
  frameImgEle?: HTMLImageElement | null,
  isBack: boolean = false,
) {
  console.log(
    `drawDevice: layout=${layout.name}, deviceType=${layout.deviceType}, frameId=${layout.frameId}, frameImgEle=${frameImgEle ? "present" : "null"}`,
  );
  ctx.save();
  ctx.translate(x, y);
  if (layout.rotation) {
    ctx.rotate((layout.rotation * Math.PI) / 180);
  }

  // Handle custom image frames
  if (layout.deviceType === "custom" && layout.frameId) {
    const frameData = PHONE_FRAMES.find((f) => f.id === layout.frameId);
    console.log(`drawDevice: frameData found=${!!frameData}`);
    if (frameData) {
      console.log(`drawDevice: Drawing custom frame`);
      // Most phone mockups are roughly 9:16 or 9:19.5
      // We use 9:16 as a safe base for the frame boundary
      const frameRatio = frameImgEle
        ? frameImgEle.width / frameImgEle.height
        : 9 / 16;
      let frameW = width;
      let frameH = width / frameRatio;

      if (frameH > height) {
        frameH = height;
        frameW = height * frameRatio;
      }

      if (isBack) {
        const r = frameW * 0.12;

        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.3)";
        ctx.shadowBlur = frameW * 0.08;
        ctx.shadowOffsetY = frameW * 0.04;

        // Outer bezel/rim
        ctx.beginPath();
        if (ctx.roundRect)
          ctx.roundRect(-frameW / 2, -frameH / 2, frameW, frameH, r);
        else ctx.rect(-frameW / 2, -frameH / 2, frameW, frameH);
        ctx.fillStyle = "#1e1e1e"; // Sleek metallic black trim
        ctx.fill();
        ctx.restore();

        // Inner gorgeous porcelain shell
        const innerMargin = frameW * 0.015;
        const innerW = frameW - innerMargin * 2;
        const innerH = frameH - innerMargin * 2;
        const innerR = Math.max(0, r - innerMargin);

        ctx.save();
        ctx.beginPath();
        if (ctx.roundRect)
          ctx.roundRect(-innerW / 2, -innerH / 2, innerW, innerH, innerR);
        else ctx.rect(-innerW / 2, -innerH / 2, innerW, innerH);
        ctx.fillStyle = "#e8d9b5"; // Beautiful porcelain/beige-gold body
        ctx.fill();

        // Soft gloss gradient across the back
        const gloss = ctx.createLinearGradient(
          -innerW / 2,
          -innerH / 2,
          innerW / 2,
          innerH / 2,
        );
        gloss.addColorStop(0, "rgba(255,255,255,0.08)");
        gloss.addColorStop(0.5, "rgba(255,255,255,0)");
        gloss.addColorStop(1, "rgba(0,0,0,0.03)");
        ctx.fillStyle = gloss;
        ctx.fill();
        ctx.restore();

        // Premium Google Metallic Camera Visor/Bar
        const barW = frameW * 0.95;
        const barH = frameH * 0.09;
        const barX = -barW / 2;
        const barY = -frameH / 2 + frameH * 0.05;
        const barR = barH * 0.22; // rounded edges matching actual Pixel 7 Pro/8 Pro camera visor shape

        ctx.save();
        // Drop shadow for the metallic camera visor
        ctx.shadowColor = "rgba(0,0,0,0.18)";
        ctx.shadowBlur = frameW * 0.03;
        ctx.shadowOffsetY = frameW * 0.015;

        const visorGrad = ctx.createLinearGradient(
          barX,
          barY,
          barX + barW,
          barY + barH,
        );
        visorGrad.addColorStop(0, "#f2e6cf"); // Glossy light gold highlight
        visorGrad.addColorStop(0.3, "#d8bc8f"); // Warm gold steel
        visorGrad.addColorStop(0.5, "#c7ad7e"); // Metallic gold shadow
        visorGrad.addColorStop(0.7, "#ebd8ba"); // Lighter gold steel
        visorGrad.addColorStop(1, "#cbaf7c"); // Deep gold corner
        ctx.fillStyle = visorGrad;

        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(barX, barY, barW, barH, barR);
        else ctx.rect(barX, barY, barW, barH);
        ctx.fill();
        ctx.restore();

        // Black camera glass window cutout (contain lenses)
        const pillW = barW * 0.32;
        const pillH = barH * 0.48;
        const pillX = barX + barW * 0.16;
        const pillY = barY + barH * 0.26;
        const pillR = pillH / 2;

        ctx.save();
        ctx.fillStyle = "#0c0c0c"; // Deep infinite pitch black glass
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(pillX, pillY, pillW, pillH, pillR);
        else ctx.rect(pillX, pillY, pillW, pillH);
        ctx.fill();

        // Circular secondary lens window
        const circR = barH * 0.22;
        const circX = barX + barW * 0.58;
        const circY = barY + barH * 0.5;
        ctx.beginPath();
        ctx.arc(circX, circY, circR, 0, Math.PI * 2);
        ctx.fillStyle = "#0c0c0c";
        ctx.fill();

        // Draw micro camera lens details (reflections + aperture iris rings)
        // Lens 1
        const irisCirc1X = pillX + pillW * 0.28;
        const irisCirc1Y = pillY + pillH * 0.5;
        ctx.beginPath();
        ctx.arc(irisCirc1X, irisCirc1Y, barH * 0.1, 0, Math.PI * 2);
        ctx.fillStyle = "#161616";
        ctx.fill();
        // Lens center 1
        ctx.beginPath();
        ctx.arc(irisCirc1X, irisCirc1Y, barH * 0.05, 0, Math.PI * 2);
        ctx.fillStyle = "#02070e";
        ctx.fill();
        // Glass reflection 1
        ctx.beginPath();
        ctx.arc(
          irisCirc1X - barH * 0.02,
          irisCirc1Y - barH * 0.02,
          barH * 0.025,
          0,
          Math.PI * 2,
        );
        ctx.fillStyle = "rgba(100, 240, 255, 0.5)";
        ctx.fill();

        // Lens 2
        const irisCirc2X = pillX + pillW * 0.72;
        const irisCirc2Y = pillY + pillH * 0.5;
        ctx.beginPath();
        ctx.arc(irisCirc2X, irisCirc2Y, barH * 0.1, 0, Math.PI * 2);
        ctx.fillStyle = "#161616";
        ctx.fill();
        // Lens center 2
        ctx.beginPath();
        ctx.arc(irisCirc2X, irisCirc2Y, barH * 0.05, 0, Math.PI * 2);
        ctx.fillStyle = "#02070e";
        ctx.fill();
        // Glass reflection 2
        ctx.beginPath();
        ctx.arc(
          irisCirc2X - barH * 0.02,
          irisCirc2Y - barH * 0.02,
          barH * 0.025,
          0,
          Math.PI * 2,
        );
        ctx.fillStyle = "rgba(100, 240, 255, 0.5)";
        ctx.fill();

        // Lens 3 (zoom)
        ctx.beginPath();
        ctx.arc(circX, circY, barH * 0.12, 0, Math.PI * 2);
        ctx.fillStyle = "#161616";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(circX, circY, barH * 0.06, 0, Math.PI * 2);
        ctx.fillStyle = "#02070e";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(
          circX - barH * 0.02,
          circY - barH * 0.02,
          barH * 0.03,
          0,
          Math.PI * 2,
        );
        ctx.fillStyle = "rgba(100, 240, 255, 0.5)";
        ctx.fill();

        // Amber flash light
        const flashX = barX + barW * 0.82;
        const flashY = barY + barH * 0.5;
        const flashR = barH * 0.11;
        ctx.beginPath();
        ctx.arc(flashX, flashY, flashR, 0, Math.PI * 2);
        ctx.fillStyle = "#fffbed";
        ctx.fill();
        ctx.strokeStyle = "rgba(200, 160, 100, 0.4)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // G stamp logo
        ctx.restore();
        ctx.save();
        ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
        ctx.font = `bold ${frameW * 0.14}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("G", 0, frameH * 0.12);
        ctx.restore();

        ctx.restore();
        return;
      }

      // Draw the frame image if available, otherwise draw a generic dark frame
      if (frameImgEle) {
        console.log(
          `Drawing frame image: ${frameImgEle.src}, size: ${frameImgEle.width}x${frameImgEle.height}`,
        );
        ctx.drawImage(frameImgEle, -frameW / 2, -frameH / 2, frameW, frameH);
      } else {
        console.log("No frame image element, using fallback");
        // Improved generic frame fallback
        const frameRatio = 9 / 16;
        let frameW = width;
        let frameH = width / frameRatio;

        if (frameH > height) {
          frameH = height;
          frameW = height * frameRatio;
        }

        ctx.fillStyle = "#111"; // Darker for frame
        const r = frameW * 0.12;
        ctx.beginPath();
        if (ctx.roundRect)
          ctx.roundRect(-frameW / 2, -frameH / 2, frameW, frameH, r);
        else ctx.rect(-frameW / 2, -frameH / 2, frameW, frameH);
        ctx.fill();

        // Highlight/border for fallback
        ctx.strokeStyle = "rgba(255,255,255,0.1)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Need to define frameW and frameH for the screen calculation below,
      // but they depend on frameImgEle presence.
      // Let's re-calculate them consistently for screen calculation.

      if (frameH > height) {
        frameH = height;
        frameW = height * frameRatio;
      }

      // Screen area calculation
      const sRect = frameData.screenRect;
      const screenX = -frameW / 2 + (sRect.left / 100) * frameW;
      const screenY = -frameH / 2 + (sRect.top / 100) * frameH;
      const screenW = (sRect.width / 100) * frameW;
      const screenH = (sRect.height / 100) * frameH;
      const screenRadius = (sRect.radius / 100) * screenW;

      ctx.save();
      ctx.beginPath();
      if (ctx.roundRect)
        ctx.roundRect(screenX, screenY, screenW, screenH, screenRadius);
      else ctx.rect(screenX, screenY, screenW, screenH);
      ctx.clip();

      // Fill background for screen
      ctx.fillStyle = "#111";
      ctx.fillRect(screenX, screenY, screenW, screenH);

      // Draw image adjusted to screen
      const isImgLandscape = img.width > img.height;
      const isScreenLandscape = screenW > screenH;
      const shouldRotate = isImgLandscape !== isScreenLandscape;

      const virtualImgW = shouldRotate ? img.height : img.width;
      const virtualImgH = shouldRotate ? img.width : img.height;

      const imgRatio = virtualImgW / virtualImgH;
      const screenRatio = screenW / screenH;

      let drawW, drawH;
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

      // Slightly zoom in to hide any baked-in rounded corners or borders from the original screenshot
      drawW *= 1.03;
      drawH *= 1.03;

      ctx.save();
      ctx.translate(screenX + screenW / 2, screenY + screenH / 2);
      if (shouldRotate) {
        // Negative 90 degrees CCW
        ctx.rotate(-Math.PI / 2);
        ctx.drawImage(img, -drawH / 2, -drawW / 2, drawH, drawW);
      } else {
        ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      }
      ctx.restore();
      ctx.restore();
      ctx.restore();
      return;
    }
  }

  // Calculate device dimensions based on aspect ratio
  let ratio = layout.isLandscape ? 19.5 / 9 : 9 / 19.5;
  if (layout.deviceType === "ipad") {
    ratio = layout.isLandscape ? 4 / 3 : 3 / 4;
  } else if (layout.deviceType === "samsung") {
    ratio = layout.isLandscape ? 20 / 9 : 9 / 20;
  }

  let devW = width;
  let devH = width / ratio;

  if (devH > height) {
    devH = height;
    devW = height * ratio;
  }

  // Draw Shadow
  ctx.shadowColor = "rgba(0,0,0,0.3)";
  ctx.shadowBlur = devW * 0.1;
  ctx.shadowOffsetY = devW * 0.05;

  // Draw Frame
  let radius = devW * 0.12;
  if (layout.deviceType === "ipad") radius = devW * 0.06;
  if (layout.deviceType === "samsung") radius = devW * 0.08;

  ctx.beginPath();
  ctx.roundRect(-devW / 2, -devH / 2, devW, devH, radius);
  ctx.fillStyle = "#1a1a1a"; // Device frame color
  ctx.fill();

  // Outer border
  ctx.strokeStyle = "#444";
  ctx.lineWidth = devW * 0.02;
  ctx.stroke();

  ctx.shadowColor = "transparent";

  // Clip content inside screen
  let screenMargin = devW * 0.04;
  if (layout.deviceType === "ipad") screenMargin = devW * 0.05;
  if (layout.deviceType === "samsung") screenMargin = devW * 0.03;

  const screenRadius = radius * 0.8;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(
    -devW / 2 + screenMargin,
    -devH / 2 + screenMargin,
    devW - screenMargin * 2,
    devH - screenMargin * 2,
    screenRadius,
  );
  ctx.clip();

  // Fill screen background before image
  ctx.fillStyle = "#111";
  ctx.fillRect(-devW / 2, -devH / 2, devW, devH);

  // Draw Image - fitted to screen
  const screenW = devW - screenMargin * 2;
  const screenH = devH - screenMargin * 2;
  const isImgLandscape = img.width > img.height;
  const isScreenLandscape = screenW > screenH;
  const shouldRotate = isImgLandscape !== isScreenLandscape;

  const virtualImgW = shouldRotate ? img.height : img.width;
  const virtualImgH = shouldRotate ? img.width : img.height;

  const imgRatio = virtualImgW / virtualImgH;
  const screenRatio = screenW / screenH;

  let drawW, drawH;
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

  // Slightly zoom in to hide any baked-in rounded corners or borders from the original screenshot
  drawW *= 1.03;
  drawH *= 1.03;

  ctx.save();
  if (shouldRotate) {
    ctx.rotate(-Math.PI / 2);
    ctx.drawImage(img, -drawH / 2, -drawW / 2, drawH, drawW);
  } else {
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
  }
  ctx.restore();
  ctx.restore();

  // Draw Dynamic Island / Camera
  ctx.fillStyle = "#000";
  if (layout.deviceType === "samsung") {
    // Punch hole
    const holeSize = layout.isLandscape ? (devH * 0.03) : (devW * 0.03);
    ctx.beginPath();
    ctx.arc(
      layout.isLandscape ? (-devW / 2 + screenMargin + devW * 0.02) : 0,
      layout.isLandscape ? 0 : (-devH / 2 + screenMargin + devH * 0.02),
      holeSize, 0, Math.PI * 2
    );
    ctx.fill();
  } else if (layout.deviceType === "ipad") {
    const holeSize = layout.isLandscape ? (devH * 0.015) : (devW * 0.015);
    ctx.beginPath();
    ctx.arc(layout.isLandscape ? (-devW / 2 + screenMargin / 2) : 0, layout.isLandscape ? 0 : (-devH / 2 + screenMargin / 2), holeSize, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // iPhone Dynamic Island
    const islandW = layout.isLandscape ? (devW * 0.025) : (devW * 0.25);
    const islandH = layout.isLandscape ? (devH * 0.25) : (devH * 0.025);
    ctx.beginPath();
    ctx.roundRect(
      layout.isLandscape ? (-devW / 2 + screenMargin + devW * 0.015) : (-islandW / 2),
      layout.isLandscape ? (-islandH / 2) : (-devH / 2 + screenMargin + devH * 0.015),
      islandW,
      islandH,
      Math.min(islandW, islandH) / 2
    );
    ctx.fill();
  }

  ctx.restore();
}

export async function applyStyle(
  originalSrc: string,
  styleName: string = "Minimal",
  layoutName: string = "None",
  sensitiveAreas: SensitiveArea[] = [],
  blurStrength: number = 15,
  customBg: string | null = null,
  customCropRect: { x: number; y: number; w: number; h: number } | null = null,
  customCanvasSize: { width: number; height: number } | null = null,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!originalSrc.startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => {
      const config = Styles[styleName] || Styles["Minimal"];
      const layout = PhoneLayouts[layoutName] || PhoneLayouts["None"];

      const finishProcessing = (
        frameImgEle: HTMLImageElement | null = null,
      ) => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get 2d context"));
          return;
        }

        // Base dimensions for the card content
        const cropLeft = customCropRect ? customCropRect.x : 0;
        const cropTop = customCropRect
          ? customCropRect.y
          : Math.round(img.height * 0.04);
        const croppedWidth = customCropRect ? customCropRect.w : img.width;
        const croppedHeight = customCropRect
          ? customCropRect.h
          : Math.max(
              1,
              Math.round(img.height - img.height * 0.04 - img.height * 0.05),
            );

        // Processing on source canvas
        const sourceCanvas = document.createElement("canvas");
        sourceCanvas.width = croppedWidth;
        sourceCanvas.height = croppedHeight;
        const sCtx = sourceCanvas.getContext("2d");
        if (!sCtx) {
          reject(new Error("Failed to get source 2d context"));
          return;
        }

        sCtx.drawImage(
          img,
          cropLeft,
          cropTop,
          croppedWidth,
          croppedHeight,
          0,
          0,
          croppedWidth,
          croppedHeight,
        );

        if (styleName === "Money") {
          const moneyAreas = sensitiveAreas.filter((a) => a.type === "Amount");
          if (moneyAreas.length > 0) {
            const offCanvas = document.createElement("canvas");
            offCanvas.width = croppedWidth;
            offCanvas.height = croppedHeight;
            const oCtx = offCanvas.getContext("2d");
            if (oCtx) {
              oCtx.drawImage(sourceCanvas, 0, 0);
              sCtx.filter = "blur(10px)";
              sCtx.drawImage(offCanvas, 0, 0);
              sCtx.filter = "none";
              moneyAreas.forEach((area) => {
                const { x, y, width, height } = area.rect;
                sCtx.drawImage(
                  offCanvas,
                  x,
                  y,
                  width,
                  height,
                  x,
                  y,
                  width,
                  height,
                );
                sCtx.fillStyle = "rgba(16, 185, 129, 0.2)";
                sCtx.fillRect(x, y, width, height);
                sCtx.strokeStyle = "#10B981";
                sCtx.lineWidth = 2;
                sCtx.strokeRect(x, y, width, height);
              });
            }
          }
        } else if (styleName === "Focus") {
          const offCanvas = document.createElement("canvas");
          offCanvas.width = croppedWidth;
          offCanvas.height = croppedHeight;
          const oCtx = offCanvas.getContext("2d");
          if (oCtx) {
            oCtx.drawImage(sourceCanvas, 0, 0);
            sCtx.filter = "blur(15px)";
            sCtx.drawImage(offCanvas, 0, 0);
            sCtx.filter = "none";
            const cx = croppedWidth * 0.2,
              cy = croppedHeight * 0.2;
            const cw = croppedWidth * 0.6,
              ch = croppedHeight * 0.6;
            sCtx.drawImage(offCanvas, cx, cy, cw, ch, cx, cy, cw, ch);
          }
        } else {
          const areas = sensitiveAreas.filter((a) => a.isBlurred);
          if (areas.length > 0) {
            const offCanvas = document.createElement("canvas");
            offCanvas.width = croppedWidth;
            offCanvas.height = croppedHeight;
            const oCtx = offCanvas.getContext("2d");
            if (oCtx) {
              oCtx.drawImage(sourceCanvas, 0, 0);
              areas.forEach((area) => {
                const { x, y, width, height } = area.rect;
                if (width <= 0 || height <= 0) return;
                sCtx.save();
                sCtx.beginPath();
                sCtx.rect(x, y, width, height);
                sCtx.clip();
                sCtx.filter = `blur(${blurStrength}px)`;
                sCtx.drawImage(offCanvas, 0, 0);
                sCtx.restore();
              });
            }
          }
        }

        // Final Canvas Setup
        let basePaddingFactor = config.paddingFactor;
        let baseRadiusFactor = config.cornerRadiusFactor;
        let baseShadowAlpha = config.shadowAlpha;
        if (layout.name === "None" && customBg && styleName === "Original") {
          // Add default padding if custom background color is selected on Original style without layout
          basePaddingFactor = 0.15;
          baseRadiusFactor = 0.04;
          baseShadowAlpha = 0.15;
        }

        const padding =
          Math.max(croppedWidth, croppedHeight) * basePaddingFactor;

        let contentW = croppedWidth + padding * 2;
        let contentH = croppedHeight + padding * 2;

        canvas.width = customCanvasSize ? customCanvasSize.width : contentW;
        canvas.height = customCanvasSize ? customCanvasSize.height : contentH;

        ctx.filter = `brightness(${config.brightnessFactor}) contrast(${config.contrastFactor})`;

        // Background drawing logic
        if (customBg) {
          if (customBg.includes(",")) {
            const colors = customBg.split(",");
            const grad = ctx.createLinearGradient(
              0,
              0,
              canvas.width,
              canvas.height,
            );
            colors.forEach((color, i, arr) => {
              grad.addColorStop(i / (arr.length - 1), color.trim());
            });
            ctx.fillStyle = grad;
          } else {
            ctx.fillStyle = customBg;
          }
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else if (layout.name !== "None" && styleName === "Original") {
          ctx.fillStyle = layout.themeColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else if (config.bgGradient) {
          const grad = ctx.createLinearGradient(
            0,
            0,
            canvas.width,
            canvas.height,
          );
          config.bgGradient.forEach((color, i, arr) => {
            grad.addColorStop(i / (arr.length - 1), color);
          });
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else {
          ctx.fillStyle = config.bgColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Center content mapping
        ctx.save();
        if (customCanvasSize && layout.name === "None") {
           ctx.translate((canvas.width - contentW) / 2, (canvas.height - contentH) / 2);
        }

        // Decorative lines for layouts removed per user request

        const radius =
          Math.max(croppedWidth, croppedHeight) * baseRadiusFactor;

        // Main drawing
        if (layout.name === "None") {
          if (styleName.startsWith("Stacked")) {
            const layers = 3;
            for (let i = layers; i > 0; i--) {
              let offsetX = 0;
              let offsetY = i * (canvas.height * 0.03);
              if (styleName === "Stacked Right")
                offsetX = i * (canvas.width * 0.03);
              if (styleName === "Stacked Left")
                offsetX = -i * (canvas.width * 0.03);
              const scale = 1 - i * 0.05;
              ctx.save();
              ctx.translate(canvas.width / 2, canvas.height / 2);
              ctx.translate(offsetX, offsetY);
              ctx.scale(scale, scale);
              ctx.translate(-canvas.width / 2, -canvas.height / 2);
              ctx.shadowColor = `rgba(0, 0, 0, 0.15)`;
              ctx.shadowBlur = canvas.width * 0.02;
              ctx.shadowOffsetY = canvas.width * 0.01;
              ctx.beginPath();
              if (ctx.roundRect)
                ctx.roundRect(
                  padding,
                  padding,
                  croppedWidth,
                  croppedHeight,
                  radius,
                );
              else ctx.rect(padding, padding, croppedWidth, croppedHeight);
              ctx.fillStyle = "#FFF";
              ctx.fill();
              ctx.shadowColor = "transparent";
              ctx.clip();
              ctx.drawImage(sourceCanvas, padding, padding);
              ctx.restore();
            }
          }

          if (baseShadowAlpha > 0) {
            ctx.save();
            ctx.shadowColor = `rgba(0, 0, 0, ${baseShadowAlpha})`;
            ctx.shadowBlur = canvas.width * 0.03;
            ctx.shadowOffsetY = canvas.width * 0.015;
            ctx.beginPath();
            if (ctx.roundRect)
              ctx.roundRect(
                padding,
                padding,
                croppedWidth,
                croppedHeight,
                radius,
              );
            else ctx.rect(padding, padding, croppedWidth, croppedHeight);
            ctx.fillStyle = "#FFF";
            ctx.fill();
            ctx.restore();
          }
          ctx.save();
          ctx.beginPath();
          if (ctx.roundRect)
            ctx.roundRect(
              padding,
              padding,
              croppedWidth,
              croppedHeight,
              radius,
            );
          else ctx.rect(padding, padding, croppedWidth, croppedHeight);
          ctx.clip();
          ctx.drawImage(sourceCanvas, padding, padding);
          ctx.restore();
        } else {
          const isContentLandscape = sourceCanvas.width > sourceCanvas.height;
          const placements = layout.placements || [
            {
              x: layout.deviceX,
              y: layout.deviceY,
              scale: layout.deviceScale,
              rotation: layout.rotation,
              isLandscape: layout.isLandscape !== undefined ? layout.isLandscape : isContentLandscape,
            },
          ];

          // Sort placements to draw from back to front if needed?
          // Usually the order in the array should define the depth.
          placements.forEach((p) => {
            const devX = canvas.width * p.x;
            const devY = canvas.height * p.y;
            const maxWidth = canvas.width * p.scale;
            const maxHeight = canvas.height * p.scale;
            drawDevice(
              ctx,
              sourceCanvas,
              devX,
              devY,
              maxWidth,
              maxHeight,
              { ...layout, rotation: p.rotation, isLandscape: p.isLandscape },
              frameImgEle,
              p.isBack,
            );
          });
        }

        // Restore layout transform before watermark
        ctx.restore();

        // Watermark
        if (styleName !== "Original" || layout.name !== "None") {
          const isDarkBg =
            styleName.includes("Dark") ||
            (layout.name !== "None" && layout.themeColor !== "#f3f4f6");
          ctx.fillStyle = isDarkBg
            ? "rgba(255, 255, 255, 0.45)"
            : "rgba(0, 0, 0, 0.35)";
          // Set font size based on the content or final canvas width, taking minimum
          const referenceWidth = customCanvasSize ? contentW : canvas.width;
          ctx.font = `${referenceWidth * 0.024}px sans-serif`;
          ctx.textAlign = "right";

          if (layout.name === "None" && !customCanvasSize) {
            ctx.fillText(
              "Edited with Shot Clean",
              padding + croppedWidth - canvas.width * 0.015,
              padding + croppedHeight - canvas.height * 0.015,
            );
          } else {
            ctx.fillText(
              "Edited with Shot Clean",
              canvas.width - canvas.width * 0.03,
              canvas.height - canvas.height * 0.03,
            );
          }
        }

        try {
          resolve(canvas.toDataURL("image/jpeg", 0.95));
        } catch (securityErr) {
          console.warn(
            "Canvas export error, retrying without external assets...",
            securityErr,
          );
          if (frameImgEle !== null) {
            finishProcessing(null);
          } else {
            reject(securityErr);
          }
        }
      };

      if (layout.deviceType === "custom" && layout.frameId) {
        getFrameImage(layout.frameId).then((frameImg) => {
          finishProcessing(frameImg);
        });
      } else {
        finishProcessing(null);
      }
    };

    img.onerror = reject;
    img.src = originalSrc;
  });
}

// Keep backward compatibility for initial load
export async function autoProcessImage(originalSrc: string): Promise<string> {
  return applyStyle(originalSrc, "Minimal");
}

export async function burnEditsToImage(
  styledImageDataUrl: string,
  paths: any[],
  texts: any[],
): Promise<string> {
  if (paths.length === 0 && texts.length === 0) {
    return styledImageDataUrl;
  }

  return new Promise((resolve) => {
    const img = new Image();
    if (!styledImageDataUrl.startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(styledImageDataUrl);
          return;
        }

        // Draw background styled image
        ctx.drawImage(img, 0, 0);

        // Pre-render a blurred canvas if we have any blur paths
        let blurCanvas: HTMLCanvasElement | null = null;
        const hasBlurPaths = paths.some((p) => p.isBlur);
        if (hasBlurPaths) {
          blurCanvas = document.createElement("canvas");
          blurCanvas.width = canvas.width;
          blurCanvas.height = canvas.height;
          const bCtx = blurCanvas.getContext("2d");
          if (bCtx) {
            bCtx.drawImage(img, 0, 0);
            bCtx.save();
            bCtx.filter = "blur(20px)";
            bCtx.drawImage(blurCanvas, 0, 0);
            bCtx.restore();
          }
        }

        // Help draw blurred path locally
        const drawBlurredPathLocal = (
          pathPoints: { x: number; y: number }[],
          width: number,
          color: string | undefined,
        ) => {
          if (!blurCanvas) return;
          const scratch = document.createElement("canvas");
          scratch.width = canvas.width;
          scratch.height = canvas.height;
          const sCtx = scratch.getContext("2d");
          if (!sCtx) return;

          sCtx.save();
          sCtx.lineCap = "round";
          sCtx.lineJoin = "round";
          sCtx.shadowColor = "#FFFFFF";
          sCtx.shadowBlur = width * 0.45;
          sCtx.strokeStyle = "#FFFFFF";
          sCtx.lineWidth = width * 0.75;
          sCtx.beginPath();
          if (pathPoints.length > 0) {
            sCtx.moveTo(pathPoints[0].x, pathPoints[0].y);
            for (let i = 1; i < pathPoints.length; i++) {
              sCtx.lineTo(pathPoints[i].x, pathPoints[i].y);
            }
          }
          sCtx.stroke();
          sCtx.restore();

          sCtx.save();
          sCtx.globalCompositeOperation = "source-in";
          sCtx.drawImage(blurCanvas, 0, 0);
          sCtx.restore();

          if (color && color !== "transparent") {
            sCtx.save();
            sCtx.globalCompositeOperation = "source-over";
            sCtx.lineCap = "round";
            sCtx.lineJoin = "round";
            sCtx.shadowColor = color;
            sCtx.shadowBlur = width * 0.45;
            sCtx.strokeStyle = color;
            sCtx.lineWidth = width * 0.75;
            sCtx.globalAlpha = 1.0;
            sCtx.beginPath();
            if (pathPoints.length > 0) {
              sCtx.moveTo(pathPoints[0].x, pathPoints[0].y);
              for (let i = 1; i < pathPoints.length; i++) {
                sCtx.lineTo(pathPoints[i].x, pathPoints[i].y);
              }
            }
            sCtx.stroke();
            sCtx.restore();
          }

          ctx.save();
          ctx.drawImage(scratch, 0, 0);
          ctx.restore();
        };

        // Draw drawings/paths
        paths.forEach((p) => {
          if (p.isBlur) {
            drawBlurredPathLocal(p.points, p.width, p.color);
          } else {
            ctx.save();
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.strokeStyle = p.color;
            ctx.lineWidth = p.width;
            ctx.beginPath();
            if (p.points && p.points.length > 0) {
              ctx.moveTo(p.points[0].x, p.points[0].y);
              for (let i = 1; i < p.points.length; i++) {
                ctx.lineTo(p.points[i].x, p.points[i].y);
              }
            }
            ctx.stroke();
            ctx.restore();
          }
        });

        // Draw text items
        texts.forEach((t) => {
          ctx.save();
          ctx.fillStyle = t.color;

          let fontStr = "sans-serif";
          if (t.fontName === "Serif") fontStr = "serif";
          if (t.fontName === "Monospace") fontStr = "monospace";
          if (t.fontName === "Cursive") fontStr = "cursive";
          ctx.font = `bold ${t.size}px ${fontStr}`;

          ctx.textAlign = "center";

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
            
            ctx.fillStyle = t.color; // ensure text color is set
            if (t.hasShadow) {
              ctx.shadowColor = t.shadowColor || "rgba(0, 0, 0, 0.6)";
              ctx.shadowBlur = Math.max(4, t.size * 0.15);
              ctx.shadowOffsetX = Math.max(2, t.size * 0.08);
              ctx.shadowOffsetY = Math.max(2, t.size * 0.08);
            }

            if (t.bgColor === "transparent" || !t.bgColor) {
               ctx.strokeStyle = "#000000";
               ctx.lineWidth = Math.max(2, t.size * 0.08);
               ctx.strokeText(t.text, 0, 0);
            }
            ctx.fillText(t.text, 0, 0);
          }
          ctx.restore();
        });

        resolve(canvas.toDataURL("image/jpeg", 0.95));
      } catch (err) {
        console.error("Failed burning edits:", err);
        resolve(styledImageDataUrl);
      }
    };
    img.onerror = (e) => {
      console.error(e);
      resolve(styledImageDataUrl);
    };
    img.src = styledImageDataUrl;
  });
}
