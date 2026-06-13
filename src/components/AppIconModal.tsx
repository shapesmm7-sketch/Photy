import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Layers, Download, Check } from "lucide-react";
import JSZip from "jszip";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import saveAs from "file-saver";

import { isNative, playRewardedAds } from "../lib/admob";

interface AppIconModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageData: string | null;
  isDarkMode: boolean;
  isPremium?: boolean;
}

const IOS_SIZES = [
  { name: "Icon-App-20x20@1x.png", size: 20 },
  { name: "Icon-App-20x20@2x.png", size: 40 },
  { name: "Icon-App-20x20@3x.png", size: 60 },
  { name: "Icon-App-29x29@1x.png", size: 29 },
  { name: "Icon-App-29x29@2x.png", size: 58 },
  { name: "Icon-App-29x29@3x.png", size: 87 },
  { name: "Icon-App-40x40@1x.png", size: 40 },
  { name: "Icon-App-40x40@2x.png", size: 80 },
  { name: "Icon-App-40x40@3x.png", size: 120 },
  { name: "Icon-App-60x60@2x.png", size: 120 },
  { name: "Icon-App-60x60@3x.png", size: 180 },
  { name: "Icon-App-76x76@1x.png", size: 76 },
  { name: "Icon-App-76x76@2x.png", size: 152 },
  { name: "Icon-App-83.5x83.5@2x.png", size: 167 },
  { name: "Icon-App-1024x1024@1x.png", size: 1024 },
];

const ANDROID_SIZES = [
  { folder: "mipmap-mdpi", size: 48 },
  { folder: "mipmap-hdpi", size: 72 },
  { folder: "mipmap-xhdpi", size: 96 },
  { folder: "mipmap-xxhdpi", size: 144 },
  { folder: "mipmap-xxxhdpi", size: 192 },
];

export const AppIconModal: React.FC<AppIconModalProps> = ({
  isOpen,
  onClose,
  imageData,
  isDarkMode,
  isPremium = false,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateSuccess, setGenerateSuccess] = useState(false);

  const resizeImage = (
    img: HTMLImageElement,
    size: number,
  ): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      // Fill transparent background with white for standard icons, or keep it.
      // Usually App Store requires no transparency. We'll draw a white background first.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);

      // Stretch to fit the square icon exactly so no parts are cut off
      ctx.drawImage(img, 0, 0, size, size);

      resolve(canvas.toDataURL("image/png").split(",")[1]);
    });
  };

  const generateContentsJson = () => {
    return {
      images: [
        {
          size: "20x20",
          idiom: "iphone",
          filename: "Icon-App-20x20@2x.png",
          scale: "2x",
        },
        {
          size: "20x20",
          idiom: "iphone",
          filename: "Icon-App-20x20@3x.png",
          scale: "3x",
        },
        {
          size: "29x29",
          idiom: "iphone",
          filename: "Icon-App-29x29@2x.png",
          scale: "2x",
        },
        {
          size: "29x29",
          idiom: "iphone",
          filename: "Icon-App-29x29@3x.png",
          scale: "3x",
        },
        {
          size: "40x40",
          idiom: "iphone",
          filename: "Icon-App-40x40@2x.png",
          scale: "2x",
        },
        {
          size: "40x40",
          idiom: "iphone",
          filename: "Icon-App-40x40@3x.png",
          scale: "3x",
        },
        {
          size: "60x60",
          idiom: "iphone",
          filename: "Icon-App-60x60@2x.png",
          scale: "2x",
        },
        {
          size: "60x60",
          idiom: "iphone",
          filename: "Icon-App-60x60@3x.png",
          scale: "3x",
        },
        {
          size: "20x20",
          idiom: "ipad",
          filename: "Icon-App-20x20@1x.png",
          scale: "1x",
        },
        {
          size: "20x20",
          idiom: "ipad",
          filename: "Icon-App-20x20@2x.png",
          scale: "2x",
        },
        {
          size: "29x29",
          idiom: "ipad",
          filename: "Icon-App-29x29@1x.png",
          scale: "1x",
        },
        {
          size: "29x29",
          idiom: "ipad",
          filename: "Icon-App-29x29@2x.png",
          scale: "2x",
        },
        {
          size: "40x40",
          idiom: "ipad",
          filename: "Icon-App-40x40@1x.png",
          scale: "1x",
        },
        {
          size: "40x40",
          idiom: "ipad",
          filename: "Icon-App-40x40@2x.png",
          scale: "2x",
        },
        {
          size: "76x76",
          idiom: "ipad",
          filename: "Icon-App-76x76@1x.png",
          scale: "1x",
        },
        {
          size: "76x76",
          idiom: "ipad",
          filename: "Icon-App-76x76@2x.png",
          scale: "2x",
        },
        {
          size: "83.5x83.5",
          idiom: "ipad",
          filename: "Icon-App-83.5x83.5@2x.png",
          scale: "2x",
        },
        {
          size: "1024x1024",
          idiom: "ios-marketing",
          filename: "Icon-App-1024x1024@1x.png",
          scale: "1x",
        },
      ],
      info: { version: 1, author: "xcode" },
    };
  };

  const performGenerate = async () => {
    if (!imageData) return;
    setIsGenerating(true);

    try {
      const img = new Image();
      img.src = imageData;
      await new Promise((resolve) => (img.onload = resolve));

      const zip = new JSZip();

      // Top-level files
      zip.file("appstore.png", await resizeImage(img, 1024), { base64: true });
      zip.file("playstore.png", await resizeImage(img, 512), { base64: true });

      // iOS AppIconset
      const iosFolder = zip.folder("Assets.xcassets/AppIcon.appiconset");
      if (iosFolder) {
        iosFolder.file(
          "Contents.json",
          JSON.stringify(generateContentsJson(), null, 2),
        );
        for (const size of IOS_SIZES) {
          iosFolder.file(size.name, await resizeImage(img, size.size), {
            base64: true,
          });
        }
      }

      // Android mipmap
      const androidFolder = zip.folder("android");
      if (androidFolder) {
        for (const size of ANDROID_SIZES) {
          androidFolder
            .folder(size.folder)
            ?.file("ic_launcher.png", await resizeImage(img, size.size), {
              base64: true,
            });
        }
      }

      const zipBase64 = await zip.generateAsync({ type: "base64" });

      if (Capacitor.isNativePlatform()) {
        try {
          const fileName = `AppIcons_${new Date().getTime()}.zip`;
          const NativeMedia = registerPlugin<any>("NativeMedia");
          await NativeMedia.saveZip({ base64: zipBase64, filename: fileName });
          
          setGenerateSuccess(true);
          setTimeout(() => setGenerateSuccess(false), 2000);
          return;
        } catch (nativeErr) {
          console.error("Native zip save failed", nativeErr);
          alert("Native File Save Failed: " + (nativeErr as Error).message);
        }
      }

      // Web Fallback
      const blob = await zip.generateAsync({ type: "blob" });
      saveAs(blob, "AppIcons.zip");
      setGenerateSuccess(true);
      setTimeout(() => setGenerateSuccess(false), 2000);
    } catch (err: any) {
      console.error(err);
      alert("Error generating zip: " + err?.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerate = () => {
    if (!imageData) return;
    if (!isPremium) {
      playRewardedAds(performGenerate);
    } else {
      performGenerate();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm rounded-3xl shadow-2xl z-[101] overflow-hidden flex flex-col max-h-[90dvh] ${
              isDarkMode ? "bg-slate-900 border border-slate-800" : "bg-white"
            }`}
          >
            {/* Header */}
            <div
              className={`p-4 sm:p-5 flex items-center justify-between border-b ${
                isDarkMode ? "border-slate-800" : "border-slate-100"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isDarkMode
                      ? "bg-blue-500/10 text-blue-400"
                      : "bg-blue-50 text-blue-600"
                  }`}
                >
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3
                    className={`font-bold text-base ${isDarkMode ? "text-white" : "text-slate-900"}`}
                  >
                    App Icon Generator
                  </h3>
                  <p
                    className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
                  >
                    Export to iOS & Android Sizes
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className={`p-2 rounded-full transition-colors ${
                  isDarkMode
                    ? "hover:bg-slate-800 text-slate-400 hover:text-white"
                    : "hover:bg-slate-100 text-slate-400 hover:text-slate-900"
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-5 flex-1 overflow-y-auto">
              {imageData ? (
                <div className="flex flex-col items-center justify-center space-y-6">
                  {/* Preview Image */}
                  <div
                    className={`w-32 h-32 rounded-3xl shadow-xl overflow-hidden flex items-center justify-center ${
                      isDarkMode ? "bg-slate-800" : "bg-slate-50"
                    }`}
                  >
                    <img
                      src={imageData}
                      alt="App Icon Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <p
                    className={`text-xs text-center leading-relaxed max-w-xs ${
                      isDarkMode ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    Automatically generate all required iOS Appiconset dimensions and Android mipmap directories in a single export. Saves hours of manual resizing by compiling everything into a ready-to-import Xcode & Android Studio package.
                  </p>

                  <div className="w-full space-y-3">
                    <div
                      className={`p-4 rounded-xl text-center space-y-1 ${
                        isDarkMode ? "bg-slate-800/50" : "bg-slate-50"
                      }`}
                    >
                      <h4
                        className={`text-sm font-bold ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}
                      >
                        iOS (Xcode)
                      </h4>
                      <p
                        className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
                      >
                        AppIcon.appiconset (18 icons) + Contents.json
                      </p>
                    </div>
                    <div
                      className={`p-4 rounded-xl text-center space-y-1 ${
                        isDarkMode ? "bg-slate-800/50" : "bg-green-50/50"
                      }`}
                    >
                      <h4
                        className={`text-sm font-bold ${isDarkMode ? "text-slate-200" : "text-green-700"}`}
                      >
                        Android (Studio)
                      </h4>
                      <p
                        className={`text-xs ${isDarkMode ? "text-slate-400" : "text-green-600/70"}`}
                      >
                        ic_launcher (mdpi to xxxhdpi)
                      </p>
                    </div>
                    <div
                      className={`p-4 rounded-xl text-center space-y-1 ${
                        isDarkMode ? "bg-slate-800/50" : "bg-blue-50/50"
                      }`}
                    >
                      <h4
                        className={`text-sm font-bold ${isDarkMode ? "text-slate-200" : "text-blue-700"}`}
                      >
                        Stores
                      </h4>
                      <p
                        className={`text-xs ${isDarkMode ? "text-slate-400" : "text-blue-600/70"}`}
                      >
                        playstore.png (512px), appstore.png (1024px)
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  className={`w-full h-40 rounded-xl flex items-center justify-center border-2 border-dashed ${
                    isDarkMode
                      ? "border-slate-800 text-slate-500"
                      : "border-slate-200 text-slate-400"
                  }`}
                >
                  <p>No image uploaded</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className={`p-4 sm:p-5 border-t ${
                isDarkMode
                  ? "border-slate-800 bg-slate-900"
                  : "border-slate-100 bg-white"
              }`}
            >
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !imageData}
                className={`w-full py-3.5 sm:py-4 flex items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all ${
                  generateSuccess
                    ? "bg-green-500 text-white"
                    : isDarkMode
                      ? "bg-blue-600 hover:bg-blue-500 text-white"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                } disabled:opacity-50 active:scale-[0.98]`}
              >
                {isGenerating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Generating Zip...</span>
                  </>
                ) : generateSuccess ? (
                  <>
                    <Check className="w-5 h-5" />
                    <span>Saved to Downloads folder!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    <span>Download AppIcons.zip</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
