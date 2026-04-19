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
  "Original": { bgColor: "#FFFFFF", paddingFactor: 0, cornerRadiusFactor: 0, shadowAlpha: 0, contrastFactor: 1, brightnessFactor: 1 },
  "Minimal": { bgColor: "#F8FAFC", paddingFactor: 0.08, cornerRadiusFactor: 0.04, shadowAlpha: 0.15, contrastFactor: 1.05, brightnessFactor: 1.03 },
  "Dark": { bgColor: "#0F172A", paddingFactor: 0.08, cornerRadiusFactor: 0.04, shadowAlpha: 0.3, contrastFactor: 1.1, brightnessFactor: 1.02 },
  "Instagram": { bgColor: "#f09433", bgGradient: ["#f09433", "#e6683c", "#dc2743", "#cc2366", "#bc1888"], paddingFactor: 0.08, cornerRadiusFactor: 0.04, shadowAlpha: 0.2, contrastFactor: 1.05, brightnessFactor: 1.03 },
  "Shadow": { bgColor: "#E2E8F0", paddingFactor: 0.12, cornerRadiusFactor: 0.04, shadowAlpha: 0.4, contrastFactor: 1, brightnessFactor: 1 },
  "Meme": { bgColor: "#000000", paddingFactor: 0.18, cornerRadiusFactor: 0.02, shadowAlpha: 0, contrastFactor: 1.2, brightnessFactor: 1 },
  "Money": { bgColor: "#065F46", paddingFactor: 0.08, cornerRadiusFactor: 0.04, shadowAlpha: 0.2, contrastFactor: 1.2, brightnessFactor: 1 },
  "Focus": { bgColor: "#1F2937", paddingFactor: 0.1, cornerRadiusFactor: 0.04, shadowAlpha: 0.2, contrastFactor: 1.1, brightnessFactor: 1 },
  "Viral": { bgColor: "#EF4444", paddingFactor: 0.05, cornerRadiusFactor: 0.04, shadowAlpha: 0.2, contrastFactor: 1.1, brightnessFactor: 1 },
  "Chat": { bgColor: "#ECFDF5", paddingFactor: 0.15, cornerRadiusFactor: 0.08, shadowAlpha: 0.2, contrastFactor: 1.05, brightnessFactor: 1.03 },
  "Stacked": { bgColor: "#F1F5F9", paddingFactor: 0.2, cornerRadiusFactor: 0.04, shadowAlpha: 0.2, contrastFactor: 1, brightnessFactor: 1 },
  "Stacked Left": { bgColor: "#F1F5F9", paddingFactor: 0.2, cornerRadiusFactor: 0.04, shadowAlpha: 0.2, contrastFactor: 1, brightnessFactor: 1 },
  "Stacked Right": { bgColor: "#F1F5F9", paddingFactor: 0.2, cornerRadiusFactor: 0.04, shadowAlpha: 0.2, contrastFactor: 1, brightnessFactor: 1 }
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
  deviceType?: 'iphone' | 'samsung' | 'ipad';
}

export const PhoneLayouts: Record<string, LayoutConfig> = {
  "None": { name: "None", deviceX: 0.5, deviceY: 0.5, deviceScale: 1, themeColor: "#f3f4f6" },
  "iPhone 15": { name: "iPhone 15", deviceX: 0.5, deviceY: 0.5, deviceScale: 0.85, themeColor: "#3b82f6", deviceType: 'iphone' },
  "Samsung S24": { name: "Samsung S24", deviceX: 0.5, deviceY: 0.5, deviceScale: 0.85, themeColor: "#10b981", deviceType: 'samsung' },
  "iPad Pro": { name: "iPad Pro", deviceX: 0.5, deviceY: 0.5, deviceScale: 0.8, themeColor: "#6366f1", deviceType: 'ipad' },
  "Bottom View": { name: "Bottom View", deviceX: 0.5, deviceY: 0.65, deviceScale: 0.7, themeColor: "#8b5cf6", deviceType: 'iphone' },
  "Forest View": { name: "Forest View", deviceX: 0.5, deviceY: 0.65, deviceScale: 0.7, themeColor: "#10b981", deviceType: 'iphone' },
  "Top View": { name: "Top View", deviceX: 0.5, deviceY: 0.35, deviceScale: 0.7, themeColor: "#f59e0b", deviceType: 'iphone' },
  "Elevated": { name: "Elevated", deviceX: 0.5, deviceY: 0.3, deviceScale: 0.8, themeColor: "#06b6d4", deviceType: 'iphone' },
  "Split Right": { name: "Split Right", deviceX: 0.75, deviceY: 0.5, deviceScale: 0.8, premium: true, themeColor: "#ec4899", deviceType: 'iphone' },
  "Split Left": { name: "Split Left", deviceX: 0.25, deviceY: 0.5, deviceScale: 0.8, premium: true, themeColor: "#6366f1", deviceType: 'iphone' },
  "Tilted": { name: "Tilted", deviceX: 0.5, deviceY: 0.5, deviceScale: 0.8, rotation: 15, premium: true, themeColor: "#f97316", deviceType: 'iphone' },
  "Cinema Center": { name: "Cinema Center", deviceX: 0.5, deviceY: 0.5, deviceScale: 0.85, isLandscape: true, premium: true, themeColor: "#14b8a6", deviceType: 'iphone' },
  "Cinema Top": { name: "Cinema Top", deviceX: 0.5, deviceY: 0.3, deviceScale: 0.7, isLandscape: true, premium: true, themeColor: "#ef4444", deviceType: 'iphone' },
  "Cinema Btm": { name: "Cinema Btm", deviceX: 0.5, deviceY: 0.7, deviceScale: 0.7, isLandscape: true, premium: true, themeColor: "#4f46e5", deviceType: 'iphone' },
  "Cinema Left": { name: "Cinema Left", deviceX: 0.25, deviceY: 0.6, deviceScale: 0.8, isLandscape: true, premium: true, themeColor: "#84cc16", deviceType: 'iphone' },
  "Cinema Right": { name: "Cinema Right", deviceX: 0.75, deviceY: 0.6, deviceScale: 0.8, isLandscape: true, premium: true, themeColor: "#a855f7", deviceType: 'iphone' },
  "iPad Hero": { name: "iPad Hero", deviceX: 0.5, deviceY: 0.5, deviceScale: 0.7, themeColor: "#1e293b", deviceType: 'ipad', premium: true },
  "Samsung Tilted": { name: "Samsung Tilted", deviceX: 0.5, deviceY: 0.5, deviceScale: 0.8, rotation: 15, themeColor: "#f97316", deviceType: 'samsung', premium: true }
};

function drawDevice(ctx: CanvasRenderingContext2D, img: HTMLCanvasElement | HTMLImageElement, x: number, y: number, width: number, height: number, layout: LayoutConfig) {
  ctx.save();
  ctx.translate(x, y);
  if (layout.rotation) {
    ctx.rotate((layout.rotation * Math.PI) / 180);
  }

  // Calculate device dimensions based on aspect ratio
  let ratio = layout.isLandscape ? (19.5/9) : (9/19.5);
  if (layout.deviceType === 'ipad') {
    ratio = layout.isLandscape ? (4/3) : (3/4);
  } else if (layout.deviceType === 'samsung') {
    ratio = layout.isLandscape ? (20/9) : (9/20);
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
  if (layout.deviceType === 'ipad') radius = devW * 0.06;
  if (layout.deviceType === 'samsung') radius = devW * 0.08;

  ctx.beginPath();
  ctx.roundRect(-devW/2, -devH/2, devW, devH, radius);
  ctx.fillStyle = "#1a1a1a"; // Device frame color
  ctx.fill();
  
  // Outer border
  ctx.strokeStyle = "#444";
  ctx.lineWidth = devW * 0.02;
  ctx.stroke();

  ctx.shadowColor = "transparent";

  // Clip content inside screen
  let screenMargin = devW * 0.04;
  if (layout.deviceType === 'ipad') screenMargin = devW * 0.05;
  if (layout.deviceType === 'samsung') screenMargin = devW * 0.03;

  const screenRadius = radius * 0.8;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(-devW/2 + screenMargin, -devH/2 + screenMargin, devW - screenMargin*2, devH - screenMargin*2, screenRadius);
  ctx.clip();
  
  // Fill screen background before image
  ctx.fillStyle = "#000";
  ctx.fillRect(-devW/2, -devH/2, devW, devH);

  // Draw Image - fitted to screen
  const imgW = img.width;
  const imgH = img.height;
  const screenW = devW - screenMargin*2;
  const screenH = devH - screenMargin*2;
  const imgRatio = imgW / imgH;
  const screenRatio = screenW / screenH;

  let drawW, drawH;
  if (imgRatio > screenRatio) {
    drawW = screenW;
    drawH = screenW / imgRatio;
    // ensure fits vertically
    if (drawH < screenH) {
        drawH = screenH;
        drawW = screenH * imgRatio;
    }
  } else {
    drawH = screenH;
    drawW = screenH * imgRatio;
    // ensure fits horizontally
    if (drawW < screenW) {
        drawW = screenW;
        drawH = screenW / imgRatio;
    }
  }
  
  ctx.drawImage(img, -drawW/2, -drawH/2, drawW, drawH);
  ctx.restore();

  // Draw Dynamic Island / Camera
  if (!layout.isLandscape) {
    ctx.fillStyle = "#000";
    if (layout.deviceType === 'samsung') {
        // Punch hole
        const holeSize = devW * 0.03;
        ctx.beginPath();
        ctx.arc(0, -devH/2 + screenMargin + devH * 0.02, holeSize, 0, Math.PI * 2);
        ctx.fill();
    } else if (layout.deviceType === 'ipad') {
        // Minimal bezel camera
        const holeSize = devW * 0.015;
        ctx.beginPath();
        ctx.arc(0, -devH/2 + screenMargin/2, holeSize, 0, Math.PI * 2);
        ctx.fill();
    } else {
        // iPhone Dynamic Island
        const islandW = devW * 0.25;
        const islandH = devH * 0.025;
        ctx.beginPath();
        ctx.roundRect(-islandW/2, -devH/2 + screenMargin + devH * 0.015, islandW, islandH, islandH/2);
        ctx.fill();
    }
  }

  ctx.restore();
}

export async function applyStyle(
  originalSrc: string, 
  styleName: string = "Minimal", 
  layoutName: string = "None",
  sensitiveAreas: SensitiveArea[] = [],
  blurStrength: number = 15,
  memeTop: string = "",
  memeBottom: string = ""
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const config = Styles[styleName] || Styles["Minimal"];
      const layout = PhoneLayouts[layoutName] || PhoneLayouts["None"];
      
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get 2d context"));
        return;
      }

      // Base dimensions for the card content
      const cropTop = img.height * 0.04;
      const cropBottom = img.height * 0.05;
      const croppedHeight = img.height - cropTop - cropBottom;
      const croppedWidth = img.width;

      // Processing on source canvas
      const sourceCanvas = document.createElement("canvas");
      sourceCanvas.width = croppedWidth;
      sourceCanvas.height = croppedHeight;
      const sCtx = sourceCanvas.getContext("2d");
      if (!sCtx) return;

      sCtx.drawImage(img, 0, cropTop, croppedWidth, croppedHeight, 0, 0, croppedWidth, croppedHeight);
      
      // ... same processing for sensitiveAreas ...

      if (styleName === "Money") {
          // Blur BG except money
          const moneyAreas = sensitiveAreas.filter(a => a.type === "Amount");
          if (moneyAreas.length > 0) {
              const offCanvas = document.createElement("canvas");
              offCanvas.width = croppedWidth;
              offCanvas.height = croppedHeight;
              const oCtx = offCanvas.getContext("2d");
              if (oCtx) {
                  oCtx.drawImage(sourceCanvas, 0, 0);
                  sCtx.filter = 'blur(10px)';
                  sCtx.drawImage(offCanvas, 0, 0);
                  sCtx.filter = 'none';
                  
                  moneyAreas.forEach(area => {
                      const { x, y, width, height } = area.rect;
                      sCtx.drawImage(offCanvas, x, y, width, height, x, y, width, height);
                      sCtx.fillStyle = 'rgba(16, 185, 129, 0.2)';
                      sCtx.fillRect(x, y, width, height);
                      sCtx.strokeStyle = '#10B981';
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
              sCtx.filter = 'blur(15px)';
              sCtx.drawImage(offCanvas, 0, 0);
              sCtx.filter = 'none';
              
              const cx = croppedWidth * 0.2, cy = croppedHeight * 0.2;
              const cw = croppedWidth * 0.6, ch = croppedHeight * 0.6;
              sCtx.drawImage(offCanvas, cx, cy, cw, ch, cx, cy, cw, ch);
          }
      } else {
          sensitiveAreas.filter(a => a.isBlurred).forEach(area => {
              const { x, y, width, height } = area.rect;
              sCtx.save();
              sCtx.beginPath();
              sCtx.rect(x, y, width, height);
              sCtx.clip();
              sCtx.filter = `blur(${blurStrength}px)`;
              sCtx.drawImage(sourceCanvas, 0, 0);
              sCtx.restore();
          });
      }

      // 3. Final Canvas Setup
      // For Phone Layouts, we need much more padding to see the background and motifs
      const basePaddingFactor = layout.name !== "None" ? Math.max(config.paddingFactor, 0.2) : config.paddingFactor;
      const padding = Math.max(croppedWidth, croppedHeight) * basePaddingFactor;
      
      canvas.width = croppedWidth + padding * 2;
      canvas.height = croppedHeight + padding * 2;

      // Background
      if (layout.name !== "None") {
          ctx.fillStyle = layout.themeColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Add decorative lines to match user screenshot mockup
          ctx.save();
          ctx.globalAlpha = 0.2;
          ctx.fillStyle = "#FFF";
          const lineW = canvas.width * 0.4;
          const lineH = canvas.height * 0.015;
          const lineGap = canvas.height * 0.025;
          
          if (layout.name.includes("Top") || layout.name === "Elevated") {
              // Lines at bottom
              for(let i=0; i<4; i++) {
                  ctx.fillRect(canvas.width/2 - lineW/2, canvas.height * 0.75 + i * lineGap, lineW, lineH);
              }
          } else if (layout.name.includes("Bottom") || layout.name === "Forest View" || layout.name.includes("Btm")) {
              // Lines at top
              for(let i=0; i<4; i++) {
                  ctx.fillRect(canvas.width/2 - lineW/2, canvas.height * 0.15 + i * lineGap, lineW, lineH);
              }
          } else if (layout.name.includes("Left")) {
              // Lines on right
              for(let i=0; i<6; i++) {
                  ctx.fillRect(canvas.width * 0.65, canvas.height * 0.3 + i * lineGap, lineW * 0.7, lineH);
              }
          } else if (layout.name.includes("Right")) {
              // Lines on left
              for(let i=0; i<6; i++) {
                  ctx.fillRect(canvas.width * 0.05, canvas.height * 0.3 + i * lineGap, lineW * 0.7, lineH);
              }
          }
          ctx.restore();
      } else if (config.bgGradient) {
          const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
          config.bgGradient.forEach((color, i, arr) => {
              grad.addColorStop(i / (arr.length - 1), color);
          });
          ctx.fillStyle = grad;
      } else {
          ctx.fillStyle = config.bgColor;
      }
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Shadow
      const radius = Math.max(croppedWidth, croppedHeight) * config.cornerRadiusFactor;

      // Special handling for Stacked style (draw background layers)
      if (styleName.startsWith("Stacked")) {
          const layers = 3;
          for (let i = layers; i > 0; i--) {
              let offsetX = 0;
              let offsetY = i * (canvas.height * 0.03); // base down
              
              if (styleName === "Stacked Right") { offsetX = i * (canvas.width * 0.03); }
              if (styleName === "Stacked Left") { offsetX = -i * (canvas.width * 0.03); }
              
              const scale = 1 - (i * 0.05);

              ctx.save();
              ctx.translate(canvas.width / 2, canvas.height / 2);
              ctx.translate(offsetX, offsetY);
              ctx.scale(scale, scale);
              ctx.translate(-canvas.width / 2, -canvas.height / 2);

              ctx.shadowColor = `rgba(0, 0, 0, 0.15)`;
              ctx.shadowBlur = canvas.width * 0.02;
              ctx.shadowOffsetY = canvas.width * 0.01;
              ctx.beginPath();
              ctx.roundRect(padding, padding, croppedWidth, croppedHeight, radius);
              ctx.fillStyle = "#FFF";
              ctx.fill();

              ctx.shadowColor = "transparent";
              ctx.clip();
              ctx.drawImage(sourceCanvas, padding, padding);
              
              // Layer Watermark inside the card
              ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
              ctx.font = `${canvas.width * 0.024}px sans-serif`;
              ctx.textAlign = "right";
              ctx.fillText("Edited with SnapClean", padding + croppedWidth - (canvas.width * 0.015), padding + croppedHeight - (canvas.height * 0.015));

              ctx.restore();
          }
      }

      if (config.shadowAlpha > 0) {
          ctx.save();
          ctx.shadowColor = `rgba(0, 0, 0, ${config.shadowAlpha})`;
          ctx.shadowBlur = canvas.width * 0.03;
          ctx.shadowOffsetY = canvas.width * 0.015;
          ctx.beginPath();
          ctx.roundRect(padding, padding, croppedWidth, croppedHeight, radius);
          ctx.fillStyle = "#FFF";
          ctx.fill();
          ctx.restore();
      }

      // Clip and Draw
      if (layout.name === "None") {
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(padding, padding, croppedWidth, croppedHeight, radius);
          ctx.clip();
          ctx.filter = `brightness(${config.brightnessFactor}) contrast(${config.contrastFactor})`;
          ctx.drawImage(sourceCanvas, padding, padding);
          ctx.restore();
      } else {
          const devX = canvas.width * layout.deviceX;
          const devY = canvas.height * layout.deviceY;
          const maxWidth = canvas.width * layout.deviceScale;
          const maxHeight = canvas.height * layout.deviceScale;
          
          ctx.filter = `brightness(${config.brightnessFactor}) contrast(${config.contrastFactor})`;
          drawDevice(ctx, sourceCanvas, devX, devY, maxWidth, maxHeight, layout);
          ctx.filter = "none";
      }

      // 4. Overlays
      if (styleName === "Meme") {
          // Meme style now just has black background and specific padding
      }

      // Watermark
      if (styleName !== "Original") {
          ctx.fillStyle = styleName.includes("Dark") ? "rgba(255, 255, 255, 0.4)" : "rgba(0, 0, 0, 0.3)";
          ctx.font = `${canvas.width * 0.024}px sans-serif`;
          ctx.textAlign = "right";
          
          // Draw standard watermark inside white bounding box
          // (padding + croppedWidth is the right edge of the white box)
          ctx.fillText("Edited with SnapClean", padding + croppedWidth - (canvas.width * 0.015), padding + croppedHeight - (canvas.height * 0.015));
      }

      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = originalSrc;
  });
}

// Keep backward compatibility for initial load
export async function autoProcessImage(originalSrc: string): Promise<string> {
    return applyStyle(originalSrc, "Minimal");
}
