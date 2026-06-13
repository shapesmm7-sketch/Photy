import { Capacitor, registerPlugin } from "@capacitor/core";

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
