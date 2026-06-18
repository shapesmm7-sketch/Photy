import React, { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Camera as CameraIcon, RefreshCcw, Flashlight, FlashlightOff, ArrowLeft, Image as ImageIcon, Grid, MoreVertical, Sliders, Aperture, Target } from "lucide-react";

interface CameraOverlayScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (base64Image: string) => void;
  docTitle: string;
  targetAspect?: number;
  pagesCount?: number;
}

export function CameraOverlayScanner({
  isOpen,
  onClose,
  onCapture,
  docTitle,
  targetAspect = 1.58,
  pagesCount = 0,
}: CameraOverlayScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const viewfinderRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>("");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [isTorchSupported, setIsTorchSupported] = useState(false);
  const [focusRing, setFocusRing] = useState<{ x: number; y: number; id: number } | null>(null);

  // Focus configuration states
  const [isMacroMode, setIsMacroMode] = useState(false);
  const [focusDistanceRange, setFocusDistanceRange] = useState<{ min: number; max: number; step: number } | null>(null);
  const [currentFocusDistance, setCurrentFocusDistance] = useState<number>(0.15);

  const isIDCardType =
    docTitle.toLowerCase().includes("id") ||
    docTitle.toLowerCase().includes("permit") ||
    docTitle.toLowerCase().includes("license") ||
    docTitle.toLowerCase().includes("card");

  const triggerAutofocus = useCallback(async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (!track) return;
    try {
      const caps = track.getCapabilities ? track.getCapabilities() : {};
      const supportedFocusModes = caps.focusMode || [];
      if (supportedFocusModes.length > 0) {
        if (supportedFocusModes.includes("continuous")) {
          // Force a hardware focus lock sweep by switching to single-shot first
          await track.applyConstraints({
            advanced: [{ focusMode: "single-shot" } as any],
          });
          // Switch back to continuous focus after 250ms to maintain active tracking
          setTimeout(async () => {
            try {
              if (track.readyState === "live") {
                await track.applyConstraints({
                  advanced: [{ focusMode: "continuous" } as any],
                });
              }
            } catch (err) {
              // Ignore silent focus errors
            }
          }, 250);
        } else if (supportedFocusModes.includes("single-shot")) {
          await track.applyConstraints({
            advanced: [{ focusMode: "single-shot" } as any],
          });
        }
      }
    } catch (e) {
      console.warn("Direct hardware track focus application failed:", e);
    }
  }, [stream]);

  const handleScreenTap = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest("button")) {
        return;
      }
      if (!overlayRef.current) return;

      const rect = overlayRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setFocusRing({ x, y, id: Date.now() });
      triggerAutofocus();
    },
    [triggerAutofocus]
  );

  useEffect(() => {
    if (focusRing) {
      const timer = setTimeout(() => {
        setFocusRing(null);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [focusRing]);

  useEffect(() => {
    if (!isOpen || !stream || isMacroMode) return;

    // Run custom hardware lens autofocus sweeps on startup
    const t1 = setTimeout(() => {
      triggerAutofocus();
    }, 500);

    const t2 = setTimeout(() => {
      triggerAutofocus();
    }, 1500);

    // Keep the focus sharp with gentle continuous sweeps every 4 seconds dynamically
    const focusInterval = setInterval(() => {
      triggerAutofocus();
    }, 4000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearInterval(focusInterval);
    };
  }, [isOpen, stream, isMacroMode, triggerAutofocus]);

  const startCamera = useCallback(async () => {
    try {
      if (videoRef.current?.srcObject) {
        const oldStream = videoRef.current.srcObject as MediaStream;
        oldStream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }

      // Standard user media parameters - avoid polluting the root with focusMode/exposureMode
      // as it causes many browsers/webviews to drop capabilities or fail streams.
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920, max: 2560 },
          height: { ideal: 1080, max: 1440 },
        },
        audio: false,
      });
      setStream(newStream);

      const track = newStream.getVideoTracks()[0];
      const caps: any = track.getCapabilities ? track.getCapabilities() : {};
      setIsTorchSupported(!!caps.torch);
      setIsTorchOn(false);

      // Read focus distance configurations
      if (caps.focusDistance) {
        setFocusDistanceRange({
          min: caps.focusDistance.min,
          max: caps.focusDistance.max,
          step: caps.focusDistance.step || 0.01,
        });
        setCurrentFocusDistance(caps.focusDistance.min || 0.15);
      } else {
        setFocusDistanceRange(null);
      }
      setIsMacroMode(false); // Reset to standard auto focus tracking initially

      const supportedFocusModes = caps.focusMode || [];
      if (supportedFocusModes.length > 0) {
        try {
          const targetFocus = supportedFocusModes.includes("continuous")
            ? "continuous"
            : supportedFocusModes.includes("single-shot")
            ? "single-shot"
            : null;

          if (targetFocus) {
            await track.applyConstraints({
              advanced: [{ focusMode: targetFocus } as any],
            });
          }
        } catch (e) {
          console.warn("Could not apply autofocus constraints:", e);
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.play().catch((e) => console.warn("Video play error:", e));
      }
      setError("");
      return newStream;
    } catch (err: any) {
      console.warn("Camera error:", err);
      setError(
        "Please allow camera access to scan documents directly. You can also upload a photo instead."
      );
      return null;
    }
  }, [facingMode]);

  useEffect(() => {
    let isMounted = true;

    if (isOpen) {
      startCamera().then((newStream) => {
        if (!isMounted && newStream) {
          newStream.getTracks().forEach((t) => t.stop());
        }
      });
    }

    return () => {
      isMounted = false;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (videoRef.current?.srcObject) {
        const oldStream = videoRef.current.srcObject as MediaStream;
        oldStream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
      setStream(null);
    };
  }, [isOpen, startCamera]);

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  const toggleTorch = async () => {
    if (stream) {
      const track = stream.getVideoTracks()[0];
      try {
        await track.applyConstraints({
          advanced: [{ torch: !isTorchOn }],
        } as any);
        setIsTorchOn(!isTorchOn);
      } catch (e) {
        console.warn("Torch error", e);
      }
    }
  };

  const handleToggleMacroMode = async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (!track) return;

    const nextMacro = !isMacroMode;
    setIsMacroMode(nextMacro);

    try {
      const caps: any = track.getCapabilities ? track.getCapabilities() : {};
      const supportedFocusModes = caps.focusMode || [];

      if (nextMacro) {
        // Turning Macro Mode ON - locks focus on close range text/ID document bounds
        if (supportedFocusModes.includes("manual") && caps.focusDistance) {
          const targetDistance = caps.focusDistance.min || 0.12;
          setCurrentFocusDistance(targetDistance);
          await track.applyConstraints({
            advanced: [{ focusMode: "manual", focusDistance: targetDistance } as any],
          });
        } else {
          // Fallback if full native manual zoom distance isn't supported inside webview:
          // Switch to single-shot for intense focusing lock and do targeted sweep
          await track.applyConstraints({
            advanced: [{ focusMode: "single-shot" } as any],
          });
        }
      } else {
        // Turning Macro Mode OFF (switches back to standard continuous sweep tracking)
        if (supportedFocusModes.includes("continuous")) {
          await track.applyConstraints({
            advanced: [{ focusMode: "continuous" } as any],
          });
        }
        triggerAutofocus();
      }
    } catch (err) {
      console.warn("Error toggling macro focus constraints:", err);
    }
  };

  const handleFocusDistanceChange = async (distanceValue: number) => {
    setCurrentFocusDistance(distanceValue);
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (!track) return;

    try {
      const caps: any = track.getCapabilities ? track.getCapabilities() : {};
      const supportedFocusModes = caps.focusMode || [];
      if (supportedFocusModes.includes("manual")) {
        setIsMacroMode(true);
        await track.applyConstraints({
          advanced: [{ focusMode: "manual", focusDistance: distanceValue } as any],
        });
      }
    } catch (err) {
      console.warn("Could not apply micro distance shift:", err);
    }
  };

  const handleCapture = async () => {
    if (videoRef.current && overlayRef.current && viewfinderRef.current) {
      const video = videoRef.current;

      const videoW = video.videoWidth;
      const videoH = video.videoHeight;
      const containerW = overlayRef.current.clientWidth || window.innerWidth;
      const containerH = overlayRef.current.clientHeight || window.innerHeight;

      const canvas = document.createElement("canvas");
      canvas.width = videoW;
      canvas.height = videoH;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        ctx.drawImage(video, 0, 0, videoW, videoH);

        // Scale factor for object-cover fit
        const scale = Math.max(containerW / videoW, containerH / videoH);

        // Bounding dimensions of current video rendering
        const scaledWidth = videoW * scale;
        const scaledHeight = videoH * scale;

        // Position offsets
        const videoX = (containerW - scaledWidth) / 2;
        const videoY = (containerH - scaledHeight) / 2;

        // Bounding rect of the viewfinder element containing the yellow highlights
        const rect = viewfinderRef.current.getBoundingClientRect();

        // Map the viewfinder window to the canvas coordinates
        const cropX = Math.max(0, (rect.left - videoX) / scale);
        const cropY = Math.max(0, (rect.top - videoY) / scale);
        const cropW = Math.min(videoW - cropX, rect.width / scale);
        const cropH = Math.min(videoH - cropY, rect.height / scale);

        const visibleCanvas = document.createElement("canvas");
        visibleCanvas.width = cropW;
        visibleCanvas.height = cropH;
        const visibleCtx = visibleCanvas.getContext("2d");

        if (visibleCtx) {
          visibleCtx.drawImage(
            canvas,
            cropX,
            cropY,
            cropW,
            cropH,
            0,
            0,
            cropW,
            cropH
          );

          const base64 = visibleCanvas.toDataURL("image/jpeg", 0.98);
          onCapture(base64);
        }
      }
    }
  };

  const handleAlbumClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onCapture(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="camera-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-black flex flex-col select-none"
      >
        {/* HIDDEN FILE INPUT FOR ALBUMS */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*"
          className="hidden"
        />

        {/* TOP BAR ACTION CONTROLLERS */}
        <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-black/80 to-transparent z-30 px-6 flex items-center justify-between pointer-events-auto">
          {/* Back Action */}
          <button
            onClick={onClose}
            className="p-2 -ml-2 text-white bg-black/30 hover:bg-black/50 active:scale-95 rounded-full transition-all cursor-pointer flex items-center justify-center shadow-md"
            aria-label="Back button"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>

          {/* Right Utilities */}
          <div className="flex items-center gap-3">
            {isTorchSupported && (
              <button
                onClick={toggleTorch}
                className={`p-2.5 rounded-full bg-black/30 hover:bg-black/50 transition-all active:scale-95 cursor-pointer flex items-center justify-center shadow-md ${
                  isTorchOn ? "text-yellow-400" : "text-white"
                }`}
                aria-label="Toggle flash"
              >
                {isTorchOn ? (
                  <Flashlight className="w-5 h-5 animate-pulse" />
                ) : (
                  <FlashlightOff className="w-5 h-5 opacity-80" />
                )}
              </button>
            )}

            <button
              onClick={toggleCamera}
              className="p-2.5 text-white bg-black/30 hover:bg-black/50 active:scale-95 rounded-full transition-all cursor-pointer flex items-center justify-center shadow-md"
              aria-label="Switch camera view"
            >
              <RefreshCcw className="w-5 h-5" />
            </button>

            {/* Decorative Screenshot-Match Buttons */}
            <span className="p-2.5 text-white bg-black/30 opacity-70 rounded-full flex items-center justify-center shadow-md select-none">
              <Grid className="w-5 h-5" />
            </span>

            <span className="p-2.5 text-white bg-black/30 opacity-70 rounded-full flex items-center justify-center shadow-md select-none">
              <MoreVertical className="w-5 h-5" />
            </span>
          </div>
        </div>

        {/* VIEWPORT CONTROLLER CONTAINER */}
        <div
          ref={overlayRef}
          className="relative flex-1 overflow-hidden flex flex-col justify-center items-center cursor-crosshair pb-28 pt-10"
          onClick={handleScreenTap}
        >
          {error ? (
            <div className="text-white text-center p-6 bg-slate-900 rounded-2xl max-w-sm mx-4 shadow-xl border border-slate-850 z-20">
              <CameraIcon className="w-12 h-12 mx-auto mb-4 text-slate-505" />
              <p className="text-sm">{error}</p>
              <button
                onClick={onClose}
                className="mt-6 px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full font-bold text-white text-sm cursor-pointer shadow-lg hover:brightness-110 active:scale-95 transition-all"
              >
                Go Back
              </button>
            </div>
          ) : (
            <>
              {/* VIDEO FEEDS */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover bg-black"
                style={{ opacity: 1.0 }}
              />

              {/* TAP-TO-FOCUS RING */}
              {focusRing && (
                <div
                  key={focusRing.id}
                  className="absolute pointer-events-none z-30 -ml-8 -mt-8 flex items-center justify-center"
                  style={{ left: focusRing.x, top: focusRing.y }}
                >
                  <div className="absolute w-16 h-16 border-2 border-yellow-400 rounded-full animate-ping opacity-75" />
                  <div className="absolute w-12 h-12 border border-dashed border-yellow-400/80 rounded-full animate-pulse flex items-center justify-center">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full" />
                  </div>
                </div>
              )}

              {/* VIEWPORT OVERLAYS (BOX SHADOW CUTOUT + CORNER HIGHLIGHTING) */}
              <div className="absolute inset-0 z-10 flex flex-col justify-between pointer-events-none overflow-hidden">
                <div className="flex-1" />

                {/* Cam Framing Zone */}
                <div className="w-full flex justify-center px-6">
                  <div
                    ref={viewfinderRef}
                    className="relative w-full max-w-[360px] rounded-xl pointer-events-none transition-all duration-300 shadow-[0_0_0_9999px_rgba(0,0,0,0.72)] border-0"
                    style={{
                      aspectRatio: targetAspect ? targetAspect : 1.58,
                    }}
                  >
                    {/* Yellow corner brackets */}
                    <div className="absolute -top-[2px] -left-[2px] w-8 h-8 border-t-[5px] border-l-[5px] border-[#FACC15] rounded-tl-xl pointer-events-none" />
                    <div className="absolute -top-[2px] -right-[2px] w-8 h-8 border-t-[5px] border-r-[5px] border-[#FACC15] rounded-tr-xl pointer-events-none" />
                    <div className="absolute -bottom-[2px] -left-[2px] w-8 h-8 border-b-[5px] border-l-[5px] border-[#FACC15] rounded-bl-xl pointer-events-none" />
                    <div className="absolute -bottom-[2px] -right-[2px] w-8 h-8 border-b-[5px] border-r-[5px] border-[#FACC15] rounded-br-xl pointer-events-none" />

                    {/* Central Translucent Pill Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-black/75 px-6 py-2.5 rounded-2xl flex flex-col items-center justify-center max-w-[85%] text-center pointer-events-none shadow-xl border border-white/5 animate-fade-in">
                        <span className="text-white font-bold text-sm tracking-wide">
                          {isIDCardType
                            ? pagesCount === 0
                              ? "Front page"
                              : "Back page"
                            : docTitle}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-1" />
              </div>
            </>
          )}

          {/* BOTTOM BAR ACTION PANELS */}
          {!error && (
            <div className="absolute bottom-0 left-0 w-full p-6 flex flex-col items-center gap-2 z-20 bg-gradient-to-t from-black/95 via-black/85 to-transparent pb-safe pb-8 pointer-events-auto">
              {/* Conditional indicator above capture */}
              {isIDCardType && (
                <div className="text-[#FACC15] font-bold text-center text-xs tracking-wider uppercase mb-1 drop-shadow animate-pulse">
                  Both sides
                </div>
              )}

              {/* Dynamic Focus Distance Slider - shows when manual lens tracking is supported */}
              {focusDistanceRange && (
                <div className="w-full max-w-[280px] mb-3 bg-black/70 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 flex flex-col items-center gap-1.5 animate-fade-in shadow-2xl">
                  <div className="flex justify-between w-full text-[10px] text-white/60 font-bold uppercase tracking-wider">
                    <span>Close (Macro)</span>
                    <span className="text-[#FACC15]">{Math.round(currentFocusDistance * 100)}cm</span>
                    <span>Far (Infinite)</span>
                  </div>
                  <div className="w-full flex items-center gap-2">
                    <Sliders className="w-3.5 h-3.5 text-[#FACC15] opacity-80" />
                    <input
                      type="range"
                      min={focusDistanceRange.min}
                      max={focusDistanceRange.max}
                      step={focusDistanceRange.step}
                      value={currentFocusDistance}
                      onChange={(e) => handleFocusDistanceChange(parseFloat(e.target.value))}
                      className="flex-1 accent-yellow-400 h-1 bg-white/20 rounded-lg cursor-pointer appearance-none focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Shutter Circle Controller, Macro Toggle, and Gallery Button */}
              <div className="w-full flex items-center justify-center relative h-24">
                {/* ID/Doc Close-up Macro Focus Toggle on Left */}
                <button
                  onClick={handleToggleMacroMode}
                  className="absolute left-8 flex flex-col items-center justify-center gap-1 group focus:outline-none cursor-pointer z-10"
                  aria-label="Toggle close-up document focus mode"
                >
                  <div className={`p-3 rounded-xl transition-all active:scale-95 flex items-center justify-center ${
                    isMacroMode 
                      ? "bg-yellow-400 text-black shadow-[0_0_12px_rgba(250,204,21,0.4)]" 
                      : "bg-white/10 hover:bg-white/20 text-white"
                  }`}>
                    {isMacroMode ? (
                      <Target className="w-6 h-6 animate-pulse" />
                    ) : (
                      <Aperture className="w-6 h-6" />
                    )}
                  </div>
                  <span className={`text-[9px] uppercase font-bold tracking-widest mt-1 ${isMacroMode ? "text-yellow-400" : "text-white/80"}`}>
                    {isMacroMode ? "Macro On" : "Auto Focus"}
                  </span>
                </button>

                {/* Captured Action Shutter */}
                <button
                  onClick={handleCapture}
                  className="w-20 h-20 rounded-full border-[6px] border-white flex items-center justify-center bg-transparent active:scale-95 transition-transform shadow-xl hover:scale-105 cursor-pointer z-10"
                  aria-label="Capture photo"
                >
                  <div className="w-14 h-14 bg-white active:bg-gray-100 rounded-full" />
                </button>

                {/* Albums Gallery on Right */}
                <button
                  onClick={handleAlbumClick}
                  className="absolute right-8 flex flex-col items-center justify-center gap-1 group focus:outline-none cursor-pointer z-10"
                  aria-label="Upload from gallery"
                >
                  <div className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all active:scale-95 flex items-center justify-center">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <span className="text-[9px] text-white/80 font-bold uppercase tracking-widest mt-1">
                    Albums
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
