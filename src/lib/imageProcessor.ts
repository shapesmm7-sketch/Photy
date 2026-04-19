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
  "Chat": { bgColor: "#ECFDF5", paddingFactor: 0.15, cornerRadiusFactor: 0.08, shadowAlpha: 0.2, contrastFactor: 1.05, brightnessFactor: 1.03 }
};

export interface SensitiveArea {
  rect: { x: number; y: number; width: number; height: number };
  type: string;
  isBlurred: boolean;
}

export async function applyStyle(
  originalSrc: string, 
  styleName: string = "Minimal", 
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
      
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get 2d context"));
        return;
      }

      // 1. Auto Crop
      const cropTop = img.height * 0.04;
      const cropBottom = img.height * 0.05;
      const croppedHeight = img.height - cropTop - cropBottom;
      const croppedWidth = img.width;

      // 2. Initial processing on a source canvas (for blurs/highlights)
      const sourceCanvas = document.createElement("canvas");
      sourceCanvas.width = croppedWidth;
      sourceCanvas.height = croppedHeight;
      const sCtx = sourceCanvas.getContext("2d");
      if (!sCtx) return;

      sCtx.drawImage(img, 0, cropTop, croppedWidth, croppedHeight, 0, 0, croppedWidth, croppedHeight);

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
      const padding = Math.max(croppedWidth, croppedHeight) * config.paddingFactor;
      canvas.width = croppedWidth + padding * 2;
      canvas.height = croppedHeight + padding * 2;

      // Background
      if (config.bgGradient) {
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
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(padding, padding, croppedWidth, croppedHeight, radius);
      ctx.clip();
      ctx.filter = `brightness(${config.brightnessFactor}) contrast(${config.contrastFactor})`;
      ctx.drawImage(sourceCanvas, padding, padding);
      ctx.restore();

      // 4. Overlays
      if (styleName === "Meme") {
          ctx.fillStyle = "white";
          ctx.strokeStyle = "black";
          ctx.lineWidth = canvas.width * 0.01;
          ctx.font = `bold ${canvas.width * 0.07}px Impact, sans-serif`;
          ctx.textAlign = "center";
          
          if (memeTop) {
            ctx.strokeText(memeTop.toUpperCase(), canvas.width / 2, padding * 0.7);
            ctx.fillText(memeTop.toUpperCase(), canvas.width / 2, padding * 0.7);
          }
          if (memeBottom) {
            ctx.strokeText(memeBottom.toUpperCase(), canvas.width / 2, canvas.height - (padding * 0.3));
            ctx.fillText(memeBottom.toUpperCase(), canvas.width / 2, canvas.height - (padding * 0.3));
          }
      } else if (styleName === "Viral") {
          ctx.strokeStyle = "red";
          ctx.lineWidth = canvas.width * 0.015;
          const cx = canvas.width / 2, cy = canvas.height / 2;

          ctx.beginPath();
          ctx.moveTo(cx + 50, cy - 150);
          ctx.lineTo(cx, cy - 20);
          ctx.lineTo(cx - 50, cy - 150);
          ctx.stroke();
      }

      // Watermark
      if (styleName !== "Original") {
          ctx.fillStyle = styleName === "Dark" ? "rgba(255, 255, 255, 0.4)" : "rgba(0, 0, 0, 0.3)";
          ctx.font = `${canvas.width * 0.024}px sans-serif`;
          ctx.textAlign = "right";
          ctx.fillText("Edited with SnapClean", canvas.width - (padding / 2), canvas.height - (padding / 4));
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
