import { jsPDF } from "jspdf";
import { Capacitor, registerPlugin } from "@capacitor/core";

export interface PDFExportOptions {
  pageSize: "A4" | "Letter" | "Original";
  orientation: "portrait" | "landscape" | "auto";
  margin: "none" | "thin" | "normal";
}

/**
 * Converts a Base64/DataURL/Src image into a PDF document and downloads it.
 */
export function convertPhotoToPdf(
  imgSrc: string,
  options: PDFExportOptions,
  filename: string = "document.pdf",
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const originalWidth = img.width;
        const originalHeight = img.height;

        let finalOrientation: "p" | "l" = "p";
        if (options.orientation === "auto") {
          finalOrientation = originalWidth > originalHeight ? "l" : "p";
        } else {
          finalOrientation = options.orientation === "portrait" ? "p" : "l";
        }

        // Standard size mapping
        let format: string | number[] = "a4";
        let pdfWidth = 595; // Pt (A4 standard)
        let pdfHeight = 842;

        if (options.pageSize === "Letter") {
          format = "letter";
          pdfWidth = 612;
          pdfHeight = 792;
        } else if (options.pageSize === "Original") {
          format = [originalWidth, originalHeight];
          pdfWidth = originalWidth;
          pdfHeight = originalHeight;
        }

        // If landscape, flip the reference dimensions (not needed for original size array config)
        if (finalOrientation === "l" && options.pageSize !== "Original") {
          const temp = pdfWidth;
          pdfWidth = pdfHeight;
          pdfHeight = temp;
        }

        const doc = new jsPDF({
          orientation: finalOrientation,
          unit: "pt",
          format: format,
          compress: true,
        });

        let marginPts = 0;
        if (options.margin === "thin") {
          marginPts = 18; // approx 0.25 inch
        } else if (options.margin === "normal") {
          marginPts = 36; // approx 0.5 inch
        }

        const maxDrawWidth = pdfWidth - marginPts * 2;
        const maxDrawHeight = pdfHeight - marginPts * 2;

        // Scale and fit
        const imgRatio = originalWidth / originalHeight;
        const pageRatio = maxDrawWidth / maxDrawHeight;

        let drawW = maxDrawWidth;
        let drawH = maxDrawHeight;

        if (imgRatio > pageRatio) {
          // Fit to width
          drawH = maxDrawWidth / imgRatio;
        } else {
          // Fit to height
          drawW = maxDrawHeight * imgRatio;
        }

        const drawX = marginPts + (maxDrawWidth - drawW) / 2;
        const drawY = marginPts + (maxDrawHeight - drawH) / 2;

        // Draw image onto the PDF
        doc.addImage(
          imgSrc,
          "JPEG",
          drawX,
          drawY,
          drawW,
          drawH,
          undefined,
          "FAST",
        );

        if (Capacitor.isNativePlatform()) {
          const NativeMedia = registerPlugin<any>("NativeMedia");
          const pdfDataUri = doc.output("datauristring");
          const cleanBase64 = pdfDataUri.includes(",") ? pdfDataUri.split(",")[1] : pdfDataUri;
          NativeMedia.savePdf({ base64: cleanBase64, filename: filename })
            .then(() => resolve())
            .catch((e: any) => reject(e));
        } else {
          doc.save(filename);
          resolve();
        }
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => {
      reject(new Error("Unable to load image for PDF compilation"));
    };
    img.src = imgSrc;
  });
}
