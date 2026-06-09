import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // API routes FIRST
  app.post("/api/detect-sensitive", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        return res.status(500).json({ error: "Missing or invalid GEMINI_API_KEY. Please provide a valid Gemini API Key in the Settings." });
      }

      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: [
            {
                inlineData: {
                    mimeType: req.body.mimeType,
                    data: req.body.base64
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
      
      const resultObj = JSON.parse(response.text || "[]");
      res.json(resultObj);
    } catch (e: any) {
      console.error("Gemini API Error:", e);
      let errMsg = e.message || String(e);
      if (errMsg.includes("API Key not found") || errMsg.includes("API_KEY_INVALID")) {
          errMsg = "Invalid Gemini API Key. Please update your API key in the Settings.";
      }
      res.status(500).json({ error: errMsg });
    }
  });

  app.post("/api/convert", async (req, res) => {
    try {
      const { base64, format, quality } = req.body;
      if (!base64 || !format) {
        return res.status(400).json({ error: "Missing base64 or format" });
      }

      // Remove data URL prefix if present
      const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      const sharpInstance = (await import("sharp")).default(buffer);

      let outputBuffer: Buffer;
      const q = quality || 80;

      switch (format) {
        case "jpg":
        case "jpeg":
          outputBuffer = await sharpInstance.jpeg({ quality: q }).toBuffer();
          break;
        case "png":
          outputBuffer = await sharpInstance.png().toBuffer();
          break;
        case "webp":
          outputBuffer = await sharpInstance.webp({ quality: q }).toBuffer();
          break;
        case "avif":
          outputBuffer = await sharpInstance.avif({ quality: q }).toBuffer();
          break;
        case "gif":
          outputBuffer = await sharpInstance.gif().toBuffer();
          break;
        default:
          return res.status(400).json({ error: `Unsupported format: ${format}` });
      }

      const mimeType = format === "jpg" ? "image/jpeg" : `image/${format}`;
      res.json({
        base64: `data:${mimeType};base64,${outputBuffer.toString("base64")}`,
        format,
        mimeType
      });
    } catch (e: any) {
      console.error("Sharp Conversion Error:", e);
      res.status(500).json({ error: e.message || "Conversion failed" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Express 4 route
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
