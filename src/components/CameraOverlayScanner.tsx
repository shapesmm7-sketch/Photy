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

  const startCamera = useCallback(async () => {
    try {
      if (videoRef.current?.srcObject) {
        const oldStream = videoRef.current.srcObject as MediaStream;
        oldStream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
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
        <div className="relative flex-1 overflow-hidden flex flex-col justify-center items-center">
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
              />
              
              {/* Overlay with cutout */}
              <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                {/* We use a shadow strategy for the dark overlay around the cutout. */}
                <div 
                   ref={overlayRef}
                   className={`${overlayWidthClass} border-4 border-white/80 rounded-2xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.65)]`}
                   style={{ aspectRatio: targetAspect.toString() }}
                >
                  <div className="absolute -top-[4px] -left-[4px] w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-2xl" />
                  <div className="absolute -top-[4px] -right-[4px] w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-2xl" />
                  <div className="absolute -bottom-[4px] -left-[4px] w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-2xl" />
                  <div className="absolute -bottom-[4px] -right-[4px] w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-2xl" />
                  <p className="absolute -top-10 left-0 right-0 text-center text-white font-bold tracking-widest text-xs sm:text-sm drop-shadow-md">
                    Fit {docTitle} within the frame
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Top Bar */}
          <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-20 SafeAreaTop">
            <button
              onClick={onClose}
              className="p-3 bg-black/40 backdrop-blur rounded-full text-white hover:bg-black/60 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <button
              onClick={toggleCamera}
              className="p-3 bg-black/40 backdrop-blur rounded-full text-white hover:bg-black/60 transition-colors"
            >
              <RefreshCcw className="w-6 h-6" />
            </button>
            {isTorchSupported && (
              <button
                onClick={toggleTorch}
                className={`p-3 backdrop-blur rounded-full text-white transition-colors ${
                  isTorchOn ? "bg-amber-500 hover:bg-amber-600" : "bg-black/40 hover:bg-black/60"
                }`}
              >
                {isTorchOn ? <Flashlight className="w-6 h-6" /> : <FlashlightOff className="w-6 h-6" />}
              </button>
            )}
          </div>

          {/* Bottom Bar Controls */}
          {!error && (
            <div className="absolute bottom-0 left-0 w-full p-8 flex justify-center items-center z-20 pb-safe pb-10">
              <button
                onClick={handleCapture}
                className="w-20 h-20 rounded-full border-[6px] border-white/80 flex items-center justify-center bg-transparent active:scale-95 transition-transform"
              >
                <div className="w-16 h-16 bg-white rounded-full"></div>
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
