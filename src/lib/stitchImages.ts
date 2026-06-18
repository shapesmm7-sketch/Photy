import { Capacitor, registerPlugin } from "@capacitor/core";

export function compileIDCardToA4(frontSrc: string, backSrc: string): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const waitImg = (src: string) => new Promise<HTMLImageElement>((res, rej) => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = () => rej(new Error("Failed to load image"));
        img.src = src;
      });

      const frontImg = await waitImg(frontSrc);
      const backImg = await waitImg(backSrc);

      const canvas = document.createElement("canvas");
      
      // Standard A4 dimensions at 300 DPI
      const a4Width = 2480;
      const a4Height = 3508;
      
      canvas.width = a4Width;
      canvas.height = a4Height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("No 2d context"));

      // Fill with white background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // We want to draw the ID cards in the center of the top and bottom halves.
      // Make it occupy 80% of the A4 page width so it is large and easy to read.
      const targetCardWidth = a4Width * 0.8;

      const drawCard = (img: HTMLImageElement, isTop: boolean) => {
        let isPortrait = img.height > img.width;
        
        // Target dimensions for a landscape card
        const cardTargetWidth = a4Width * 0.8; 
        
        let actualImgLandscapeWidth = isPortrait ? img.height : img.width;
        let actualImgLandscapeHeight = isPortrait ? img.width : img.height;
        
        const ratio = cardTargetWidth / actualImgLandscapeWidth;
        const drawWidth = cardTargetWidth;
        const drawHeight = actualImgLandscapeHeight * ratio;

        const exactX = (a4Width - drawWidth) / 2;
        const centerY = isTop ? (a4Height / 4) : (a4Height * 3 / 4);
        const exactY = centerY - (drawHeight / 2);

        ctx.save();
        if (isPortrait) {
           // Translate to center of drawing area
           ctx.translate(exactX + drawWidth / 2, exactY + drawHeight / 2);
           ctx.rotate(-Math.PI / 2);
           // Draw image centered on origin
           ctx.drawImage(img, -drawHeight / 2, -drawWidth / 2, drawHeight, drawWidth);
        } else {
           ctx.drawImage(img, exactX, exactY, drawWidth, drawHeight);
        }
        ctx.restore();
      };

      drawCard(frontImg, true);
      drawCard(backImg, false);

      resolve(canvas.toDataURL("image/png", 1.0));
    } catch (e) {
      reject(e);
    }
  });
}

export function stitchImages(imageSources: string[]): Promise<string> {
  return new Promise(async (resolve, reject) => {
    if (!imageSources || imageSources.length === 0) {
      return reject(new Error("No images provided"));
    }
    try {
      const images: HTMLImageElement[] = await Promise.all(
        imageSources.map((src, idx) => {
          return new Promise<HTMLImageElement>((res, rej) => {
            const img = new Image();
            img.onload = () => res(img);
            img.onerror = () => rej(new Error(`Failed to load image ${idx + 1}`));
            img.src = src;
          });
        })
      );

      const canvas = document.createElement("canvas");
      
      const pixelRatio = window.devicePixelRatio || 1;
      const rawWidth = window.screen?.width ? window.screen.width * pixelRatio : window.innerWidth * pixelRatio;
      const commonWidths = [720, 1080, 1170, 1179, 1242, 1284, 1290, 1440, 1644];
      let snappedWidth = Math.round(rawWidth);
      for (const cw of commonWidths) {
        if (Math.abs(rawWidth - cw) <= 15) {
          snappedWidth = cw;
          break;
        }
      }

      // Match the device's physical screen width to trigger "Long Screenshot" viewer modes natively, which prevents "fit-to-height" shrinkage.
      // Force it to the device width (minimum 1080) so OS galleries treat it as a scrolling screenshot instead of fitting the entire height on screen.
      let outputWidth = Math.max(1080, snappedWidth);

      // Add a gap between them (e.g., 20px)
      const gap = 20;

      let totalHeight = 0;
      const originalHeights = images.map((img) => {
        const ratio = outputWidth / img.width;
        let height = img.height * ratio;
        return height;
      });
      
      totalHeight = originalHeights.reduce((a, b) => a + b, 0) + (images.length - 1) * gap;

      // Hard limit on canvas height to prevent GPU crash or silent scaling on mobile
      const MAX_CANVAS_HEIGHT = 16384; 
      if (totalHeight > MAX_CANVAS_HEIGHT) {
         const rescaleFactor = MAX_CANVAS_HEIGHT / totalHeight;
         outputWidth = Math.floor(outputWidth * rescaleFactor);
         totalHeight = MAX_CANVAS_HEIGHT;
      }

      const heights = images.map((img) => {
        const ratio = outputWidth / img.width;
        return img.height * ratio;
      });

      canvas.width = outputWidth;
      canvas.height = totalHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("No 2d context"));

      // Fill with white background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      let currentY = 0;
      for (let i = 0; i < images.length; i++) {
        ctx.drawImage(images[i], 0, currentY, outputWidth, heights[i]);
        currentY += heights[i] + gap;
      }

      resolve(canvas.toDataURL("image/png", 1.0));
    } catch (e) {
      reject(e);
    }
  });
}
