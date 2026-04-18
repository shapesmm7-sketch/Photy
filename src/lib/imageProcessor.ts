export async function autoProcessImage(originalSrc: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get 2d context"));
        return;
      }

      // 1. Auto Crop (approximate status and nav bars)
      // Trim top 4% and bottom 5%
      const cropTop = img.height * 0.04;
      const cropBottom = img.height * 0.05;
      const croppedHeight = img.height - cropTop - cropBottom;
      const croppedWidth = img.width;

      // 2. Padding and Beautification dimensions
      const padding = Math.max(croppedWidth, croppedHeight) * 0.05; // 5% padding around
      canvas.width = croppedWidth + padding * 2;
      canvas.height = croppedHeight + padding * 2;

      // Fill background
      ctx.fillStyle = "#E4E3E0"; // Light tech background
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 3. Draw shadow
      const radius = Math.min(croppedWidth, croppedHeight) * 0.03; // Rounded corner radius
      
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.15)";
      ctx.shadowBlur = canvas.width * 0.02;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = canvas.width * 0.01;

      // Create rounded rect path for clipping and shadow
      ctx.beginPath();
      ctx.roundRect(padding, padding, croppedWidth, croppedHeight, radius);
      ctx.fillStyle = "#FFF";
      ctx.fill(); // Draw shadow holder
      ctx.restore();

      // clip
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(padding, padding, croppedWidth, croppedHeight, radius);
      ctx.clip();

      // Apply enhancements
      ctx.filter = 'brightness(1.03) contrast(1.05) saturate(1.05)';

      // Draw cropped image
      ctx.drawImage(
        img,
        0, cropTop, croppedWidth, croppedHeight, // Source crop
        padding, padding, croppedWidth, croppedHeight // Destination
      );
      ctx.restore();

      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = originalSrc;
  });
}
