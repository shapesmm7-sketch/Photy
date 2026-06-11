var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json({ limit: "50mb" }));
  app.post("/api/detect-sensitive", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        return res.status(500).json({ error: "Missing or invalid GEMINI_API_KEY. Please provide a valid Gemini API Key in the Settings." });
      }
      const ai = new import_genai.GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
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
            type: import_genai.Type.ARRAY,
            items: {
              type: import_genai.Type.OBJECT,
              properties: {
                x: { type: import_genai.Type.NUMBER, description: "X coordinate of top-left corner (0-1000 space)" },
                y: { type: import_genai.Type.NUMBER, description: "Y coordinate of top-left corner (0-1000 space)" },
                w: { type: import_genai.Type.NUMBER, description: "Width (0-1000 space)" },
                h: { type: import_genai.Type.NUMBER, description: "Height (0-1000 space)" },
                type: { type: import_genai.Type.STRING, description: "Type of sensitive info detected, e.g. email, phone" }
              },
              required: ["x", "y", "w", "h", "type"]
            }
          }
        }
      });
      const resultObj = JSON.parse(response.text || "[]");
      res.json(resultObj);
    } catch (e) {
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
      const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const sharpInstance = (await import("sharp")).default(buffer);
      let outputBuffer;
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
    } catch (e) {
      console.error("Sharp Conversion Error:", e);
      res.status(500).json({ error: e.message || "Conversion failed" });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
