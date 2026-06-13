import React, { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Camera as CameraIcon, CopyX, RefreshCcw, Flashlight, FlashlightOff } from "lucide-react";

interface CameraOverlayScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (base64Image: string) => void;
  docTitle: string;
  targetAspect?: number;
}

export function CameraOverlayScanner({ isOpen, onClose, onCapture, docTitle, targetAspect = 1.588 }: CameraOverlayScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>("");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [isTorchSupported, setIsTorchSupported] = useState(false);
  const [focusRing, setFocusRing] = useState<{ x: number; y: number; id: number } | null>(null);

  const triggerAutofocus = useCallback(async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (!track) return;
    try {
      const caps = track.getCapabilities ? track.getCapabilities() : {};
      const supportedFocusModes = caps.focusMode || [];
      if (supportedFocusModes.length > 0) {
        if (supportedFocusModes.includes("continuous")) {
          // Apply continuous focusing mode - safe, non-destructive, robust
          await track.applyConstraints({
            advanced: [{ focusMode: "continuous" } as any]
          });
        } else if (supportedFocusModes.includes("single-shot")) {
          await track.applyConstraints({
            advanced: [{ focusMode: "single-shot" } as any]
          });
        }
      }
    } catch (e) {
      console.warn("Direct hardware track focus application failed:", e);
    }
  }, [stream]);

  const handleScreenTap = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) {
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setFocusRing({ x, y, id: Date.now() });
    
    // Explicit manual autofocus sweep on tap
    triggerAutofocus();
  }, [triggerAutofocus]);

  useEffect(() => {
    if (focusRing) {
      const timer = setTimeout(() => {
        setFocusRing(null);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [focusRing]);

  useEffect(() => {
    if (!isOpen || !stream) return;

    // Run custom focus cycle initially after camera stabilizes to acquire perfect initial focus
    const initFocusTimer = setTimeout(() => {
      triggerAutofocus();
    }, 1000);

    return () => {
      clearTimeout(initFocusTimer);
    };
  }, [isOpen, stream, triggerAutofocus]);

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
      
      // Request maximum possible resolution and disable user-agent scaling with resizeMode: "none"
      // Request continuous focus, exposure, and white balance modes at the browser-camera level
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: { ideal: facingMode },
          width: { ideal: 3840, max: 3840 },
          height: { ideal: 2160, max: 2160 },
          focusMode: { ideal: "continuous" },
          exposureMode: { ideal: "continuous" },
          whiteBalanceMode: { ideal: "continuous" },
          resizeMode: "none",
        } as any,
        audio: false,
      });
      setStream(newStream);
      
      const track = newStream.getVideoTracks()[0];
      const caps: any = track.getCapabilities ? track.getCapabilities() : {};
      setIsTorchSupported(!!caps.torch);
      setIsTorchOn(false);

      // Programmatically apply continuous focus constraints if supported by the hardware track
      const supportedFocusModes = caps.focusMode || [];
      if (supportedFocusModes.length > 0) {
        try {
          const targetFocus = supportedFocusModes.includes("continuous") 
            ? "continuous" 
            : (supportedFocusModes.includes("autofocus") ? "autofocus" : null);
          
          if (targetFocus) {
            await track.applyConstraints({
              advanced: [{ focusMode: targetFocus } as any]
            });
          }
        } catch (e) {
          console.warn("Could not apply autofocus constraints:", e);
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.play().catch(e => console.warn("Video play error:", e));
      }
      setError("");
      return newStream;
    } catch (err: any) {
      console.warn("Camera error:", err);
      setError("Please allow camera access to scan documents directly. You can also upload a photo instead.");
      return null;
    }
  }, [facingMode]);

  useEffect(() => {
    let isMounted = true;
    
    if (isOpen) {
      startCamera().then(newStream => {
        if (!isMounted && newStream) {
          // If unmounted before camera started, stop the tracks immediately
          newStream.getTracks().forEach(t => t.stop());
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
          advanced: [{ torch: !isTorchOn }]
        } as any);
        setIsTorchOn(!isTorchOn);
      } catch (e) {
        console.warn("Torch error", e);
      }
    }
  };

  const handleCapture = async () => {
    if (videoRef.current && overlayRef.current) {
      const video = videoRef.current;
      const overlay = overlayRef.current;
      
      let imgElement: HTMLImageElement | HTMLVideoElement = video;
      let imgWidth = video.videoWidth;
      let imgHeight = video.videoHeight;
      let objectUrlToCleanup = "";

      const track = stream?.getVideoTracks()[0];
      // Check if browser/platform supports high-resolution photographic ImageCapture API
      if (track && (window as any).ImageCapture) {
        try {
          const imageCapture = new (window as any).ImageCapture(track);
          const photoBlob = await imageCapture.takePhoto({
            imageWidth: track.getCapabilities?.()?.imageWidth?.max,
            imageHeight: track.getCapabilities?.()?.imageHeight?.max
          });
          
          const blobUrl = URL.createObjectURL(photoBlob);
          const fullImg = new Image();
          await new Promise((resolve) => {
            fullImg.onload = () => {
              objectUrlToCleanup = blobUrl;
              imgWidth = fullImg.width;
              imgHeight = fullImg.height;
              imgElement = fullImg;
              resolve(true);
            };
            fullImg.onerror = () => {
              resolve(false);
            };
            fullImg.src = blobUrl;
          });
        } catch (e) {
          console.warn("ImageCapture takePhoto failed, falling back to video stream canvas frame:", e);
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = imgWidth;
      canvas.height = imgHeight;
      const ctx = canvas.getContext("2d");
      
      if (ctx) {
        ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);
        
        if (objectUrlToCleanup) {
          URL.revokeObjectURL(objectUrlToCleanup);
        }
        
        // The media source (image or video) is `object-cover` within absolute inset-0 (the window container)
        const videoRatio = imgWidth / imgHeight;
        const containerW = window.innerWidth;
        const containerH = window.innerHeight;
        const containerRatio = containerW / containerH;
        
        let drawWidth, drawHeight, offsetX, offsetY;
        
        if (containerRatio > videoRatio) {
            // Container is wider than the source, so source height is cropped visually
            drawWidth = containerW;
            drawHeight = containerW / videoRatio;
            offsetX = 0;
            offsetY = (containerH - drawHeight) / 2;
        } else {
            // Container is taller than the source, so source width is cropped visually
            drawHeight = containerH;
            drawWidth = containerH * videoRatio;
            offsetX = (containerW - drawWidth) / 2;
            offsetY = 0;
        }

        // Overlay rect relative to window
        const rect = overlay.getBoundingClientRect();
        
        // Map overlay visual rect to the source's native high-resolution pixel dimensions
        const scale = imgWidth / drawWidth;
        
        const cropX = Math.max(0, (rect.left - offsetX) * scale);
        const cropY = Math.max(0, (rect.top - offsetY) * scale);
        const cropW = Math.min(canvas.width - cropX, rect.width * scale);
        const cropH = Math.min(canvas.height - cropY, rect.height * scale);

        const croppedCanvas = document.createElement("canvas");
        croppedCanvas.width = cropW;
        croppedCanvas.height = cropH;
        const croppedCtx = croppedCanvas.getContext("2d");
        if (croppedCtx) {
          croppedCtx.drawImage(
            canvas,
            cropX, cropY, cropW, cropH,
            0, 0, cropW, cropH
          );
          const base64 = croppedCanvas.toDataURL("image/jpeg", 0.98);
          onCapture(base64);
        }
      }
    }
  };

  if (!isOpen) return null;

  const isLandscape = targetAspect > 1;
  const overlayWidthClass = isLandscape 
    ? "w-[90%] sm:w-[500px]" 
    : "w-[82%] max-w-[340px] md:w-[450px]";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-black flex flex-col"
      >
        <div className="relative flex-1 overflow-hidden flex flex-col justify-center items-center cursor-crosshair" onClick={handleScreenTap}>
          {error ? (
            <div className="text-white text-center p-6 bg-gray-900 rounded-2xl max-w-sm">
              <CameraIcon className="w-12 h-12 mx-auto mb-4 text-gray-500" />
              <p className="text-sm">{error}</p>
              <button 
                onClick={onClose}
                className="mt-6 px-6 py-2 bg-blue-600 rounded-full font-bold text-white text-sm"
              >
                Go Back
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover bg-black"
                style={{ opacity: 1.0 }}
              />

              {focusRing && (
                <div
                  key={focusRing.id}
                  className="absolute pointer-events-none z-30 -ml-8 -mt-8 flex items-center justify-center"
                  style={{ left: focusRing.x, top: focusRing.y }}
                >
                  {/* Outer ring pulsing/pinging */}
                  <div className="absolute w-16 h-16 border-2 border-amber-400 rounded-full animate-ping opacity-75" />
                  {/* Inner ring pulse with center guide dot */}
                  <div className="absolute w-12 h-12 border border-dashed border-amber-400/80 rounded-full animate-pulse flex items-center justify-center">
                    <div className="w-2 h-2 bg-amber-400 rounded-full" />
                  </div>
                </div>
              )}
              
              {/* Separate Overlay layout darkening ONLY the outside area with NO covering layer on the ID frame clear area */}
              <div className="absolute inset-0 z-10 flex flex-col pointer-events-none">
                {/* TOP DARK AREA - background opacity is #99000000 equivalent (rgba(0,0,0,0.6)) */}
                 <div className="flex-1 w-full bg-black/60 flex items-end justify-center pb-6">
                  <p className="text-white font-bold tracking-widest text-xs sm:text-sm drop-shadow-md px-4 text-center">
                    Fit {docTitle} within the frame
                  </p>
                </div>

                {/* CENTER ROW */}
                <div className="flex-none flex flex-row items-stretch w-full">
                  {/* LEFT DARK */}
                  <div className="flex-1 bg-black/60" />

                  {/* ID FRAME (CLEAR AREA with 100% original, untouched camera feed) */}
                  <div 
                     ref={overlayRef}
                     className={`${overlayWidthClass} relative border-3 border-[#00AEEF] rounded-xl bg-transparent flex-none`}
                     style={{ aspectRatio: targetAspect.toString() }}
                  >
                    {/* Corners around cutout for precise visual guides */}
                    <div className="absolute -top-[3px] -left-[3px] w-8 h-8 border-t-3 border-l-3 border-white rounded-tl-xl" />
                    <div className="absolute -top-[3px] -right-[3px] w-8 h-8 border-t-3 border-r-3 border-white rounded-tr-xl" />
                    <div className="absolute -bottom-[3px] -left-[3px] w-8 h-8 border-b-3 border-l-3 border-white rounded-bl-xl" />
                    <div className="absolute -bottom-[3px] -right-[3px] w-8 h-8 border-b-3 border-r-3 border-white rounded-br-xl" />
                  </div>

                  {/* RIGHT DARK */}
                  <div className="flex-1 bg-black/60" />
                </div>

                {/* BOTTOM DARK AREA */}
                <div className="flex-1 w-full bg-black/60" />
              </div>
            </>
          )}

          {/* Bottom Bar Controls - Relocated to the bottom, untouched by top banner ads */}
          {!error && (
            <div className="absolute bottom-0 left-0 w-full p-6 flex flex-col items-center gap-4 z-20 bg-gradient-to-t from-black/90 via-black/75 to-transparent pb-safe pb-8">
              {/* Floating Torch/Flashlight control */}
              {isTorchSupported && (
                <button
                  onClick={toggleTorch}
                  className={`p-3.5 backdrop-blur rounded-full text-white transition-all shadow-md active:scale-90 ${
                    isTorchOn ? "bg-amber-500 hover:bg-amber-600 scale-105" : "bg-black/60 hover:bg-black/85"
                  }`}
                  aria-label="Toggle flashlight"
                >
                  {isTorchOn ? <Flashlight className="w-5 h-5 animate-pulse" /> : <FlashlightOff className="w-5 h-5 opacity-80" />}
                </button>
              )}

              {/* Main controls row */}
              <div className="w-full flex items-center justify-around max-w-xs sm:max-w-md">
                {/* Cancel/Close Button */}
                <button
                  onClick={onClose}
                  className="flex flex-col items-center gap-1 group focus:outline-none"
                  aria-label="Cancel scanning"
                >
                  <div className="p-3.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-full transition-transform active:scale-90 shadow-lg">
                    <X className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] text-white/80 font-bold uppercase tracking-widest leading-none mt-1">Cancel</span>
                </button>

                {/* Capture Button */}
                <button
                  onClick={handleCapture}
                  className="w-20 h-20 rounded-full border-[6px] border-white flex items-center justify-center bg-transparent active:scale-95 transition-transform shadow-xl hover:scale-105"
                  aria-label="Capture photo"
                >
                  <div className="w-14 h-14 bg-white active:bg-gray-100 rounded-full"></div>
                </button>

                {/* Switch Camera Button */}
                <button
                  onClick={toggleCamera}
                  className="flex flex-col items-center gap-1 group focus:outline-none"
                  aria-label="Switch camera"
                >
                  <div className="p-3.5 bg-black/60 active:bg-black/85 text-white border border-white/20 rounded-full transition-transform active:scale-90 shadow-lg">
                    <RefreshCcw className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] text-white/80 font-bold uppercase tracking-widest leading-none mt-1">Flip</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
