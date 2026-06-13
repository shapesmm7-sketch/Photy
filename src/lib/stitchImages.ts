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
        const ratio = targetCardWidth / img.width;
        let drawWidth = targetCardWidth;
        let drawHeight = img.height * ratio;

        // If for some reason the image is portrait, we rotate or treat differently? Let's assume it's landscape as captured from the box.
        if (drawHeight > drawWidth) {
           // Swap scale logic if needed, but we'll stick to scaling by width
        }

        const exactX = (a4Width - drawWidth) / 2;
        // The top card is centered in the first half of the A4 page (a4Height/4)
        // The bottom card is centered in the second half of the A4 page (a4Height * 3/4)
        const centerY = isTop ? (a4Height / 4) : (a4Height * 3 / 4);
        const exactY = centerY - (drawHeight / 2);

        ctx.drawImage(img, exactX, exactY, drawWidth, drawHeight);
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
      const physicalScreenWidth = Math.max(1080, Math.floor(window.screen.width * pixelRatio));

      // Match the device's physical screen width to trigger "Long Screenshot" viewer modes natively, which prevents "fit-to-height" shrinkage.
      let outputWidth = Math.min(physicalScreenWidth, Math.max(...images.map((img) => img.width)));

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
