import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Upload, Camera, FileText, Download, CheckCircle2, ChevronDown, Search, Plus, Sparkles } from "lucide-react";
import { convertPhotoToPdf, PDFExportOptions } from "../lib/pdfGenerator";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { stitchImages, compileIDCardToA4 } from "../lib/stitchImages";
import { admobManager, isNative } from "../lib/admob";
import { CameraOverlayScanner } from "./CameraOverlayScanner";

import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';

function isIDCard(type: string): boolean {
  const t = type.toLowerCase();
  return t.includes("id") || t.includes("permit") || t.includes("license") || t.includes("card");
}

/*
  1. National ID
  2. Driving Permit / Driver’s License
  3. Voter’s Card
  4. Passport
  ...
*/
const documentTypes = [
  "National ID",
  "Driving Permit / Driver's License",
  "Voter's Card",
  "Passport",
  "Birth Certificate",
  "Death Certificate",
  "Marriage Certificate",
  "Academic Certificate",
  "University Degree",
  "Diploma",
  "Transcript",
  "Report Card",
  "Recommendation Letter",
  "Admission Letter",
  "Student ID Card",
  "University Staff ID",
  "Employee/Staff ID Badge",
  "Work Permit Card",
  "Resident Permit / Alien Card",
  "Refugee ID",
  "Senior Citizen Card",
  "PWD Card",
  "Military/Police ID",
  "Health Insurance Card / NHIF Card",
  "Medical Report",
  "Prescription",
  "Vaccination Card",
  "Trading License",
  "Business Registration Certificate",
  "TIN Certificate",
  "Tax Clearance Certificate",
  "Invoice",
  "Receipt",
  "Bank Statement",
  "Bank Slip / Deposit Slip",
  "Bank ATM/Debit Card",
  "Cheque",
  "Vehicle Logbook",
  "Land Title",
  "Tenancy Agreement",
  "Sale Agreement",
  "Affidavit",
  "LC1 Letter",
  "Insurance Policy",
  "SACCO Membership Card",
  "Club/Church Membership Card",
  "Gym Membership Card",
  "Library Card",
  "Professional Body ID",
  "Visa",
  "Application Form",
  "CV / Resume",
  "Cover Letter",
  "Handwritten Note / Agreement",
  "Utility Bill"
];

type Format = "pdf" | "png" | "jpg" | "webp";

type DocScannerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  isPremium?: boolean;
  pages: string[];
  setPages: React.Dispatch<React.SetStateAction<string[]>>;
  onEditPage: (index: number, base64: string) => void;
};

export function DocScannerModal({ isOpen, onClose, isPremium, pages, setPages, onEditPage }: DocScannerModalProps) {
  const [selectedDocType, setSelectedDocType] = useState(documentTypes[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [targetIndex, setTargetIndex] = useState<number | null>(null);

  const [format, setFormat] = useState<Format>("pdf");
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [isPlayingAd, setIsPlayingAd] = useState(false);
  const [adCountdown, setAdCountdown] = useState(5);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const handleCameraClick = async (index?: number) => {
    setTargetIndex(index ?? null);
    // Open our extremely high-performance Custom CameraOverlayScanner directly (both on web and native)
    // as it is fully optimized with custom document framing guides, live tap-to-focus rings,
    // macro close-up locking states, and focal distance micrometer sliders to guarantee sharp pictures.
    setIsCameraScannerOpen(true);
  };

  const handleCameraCapture = (base64Image: string) => {
    setIsCameraScannerOpen(false);
    setPages(prev => {
      if (targetIndex !== null && targetIndex < prev.length) {
        const next = [...prev];
        next[targetIndex] = base64Image;
        return next;
      } else {
        return [...prev, base64Image];
      }
    });
    setTargetIndex(null);
  };

  const handleImageLoad = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        const newImg = e.target.result as string;
        setPages(prev => {
          if (targetIndex !== null && targetIndex < prev.length) {
            const next = [...prev];
            next[targetIndex] = newImg;
            return next;
          } else {
            return [...prev, newImg];
          }
        });
        setTargetIndex(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleImagesLoad = (files: FileList) => {
    if (targetIndex !== null) {
      if (files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            const newImg = e.target.result as string;
            setPages(prev => {
              if (targetIndex < prev.length) {
                const next = [...prev];
                next[targetIndex] = newImg;
                return next;
              }
              return [...prev, newImg];
            });
            setTargetIndex(null);
          }
        };
        reader.readAsDataURL(files[0]);
      }
      return;
    }

    const promises = Array.from(files).map((file) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            resolve(e.target.result as string);
          } else {
            resolve("");
          }
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(promises).then((results) => {
      const filteredResults = results.filter(r => r !== "");
      setPages((prev) => [...prev, ...filteredResults]);
    });
  };

  const handleUploadClick = (index?: number) => {
    setTargetIndex(index ?? null);
    uploadInputRef.current?.click();
  };

  const removePage = (index: number) => {
    setPages(prev => prev.filter((_, i) => i !== index));
  };

  const triggerSaveWithAd = () => {
    if (pages.length === 0) return;
    handleExport();
  };

  const handleExport = async () => {
    if (pages.length === 0) return;

    setIsExporting(true);
    setExportSuccess(false);

    try {
      const filename = `${selectedDocType.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_scan`;

      let imagesToCompile = [...pages];
      let hasIDLayoutGenerated = false;

      // If it's an ID Card and we have exactly 2 pages (Front and Back), composite them into one A4 page first!
      if (isIDCard(selectedDocType) && pages.length === 2) {
         try {
           const compositeA4 = await compileIDCardToA4(pages[0], pages[1]);
           imagesToCompile = [compositeA4];
           hasIDLayoutGenerated = true;
         } catch (err) {
           console.error("Failed to compile ID layout:", err);
         }
      }

      if (format === "pdf") {
        const options: PDFExportOptions = {
          pageSize: "A4",
          orientation: "portrait",
          margin: hasIDLayoutGenerated ? "none" : "normal", // if already composited onto A4, don't add more margins
        };
        await convertPhotoToPdf(imagesToCompile, options, `${filename}.pdf`);
      } else {
        // Image format export
        let finalImageSrc = imagesToCompile[0];
        if (imagesToCompile.length > 1) {
          finalImageSrc = await stitchImages(imagesToCompile);
        }

        // Change mime based on format
        let mime = "image/jpeg";
        let ext = "jpg";
        if (format === "png") { mime = "image/png"; ext = "png"; }
        if (format === "webp") { mime = "image/webp"; ext = "webp"; }

        // Needs to redraw onto canvas for jpg/webp
        const offCanvas = document.createElement("canvas");
        const img = new Image();
        await new Promise((res, rej) => {
          img.onload = () => res(true);
          img.onerror = () => rej(new Error("Image failed to load"));
          img.src = finalImageSrc;
        });

        offCanvas.width = img.width;
        offCanvas.height = img.height;
        const ctx = offCanvas.getContext("2d");
        if (ctx) {
          if (format === "jpg") {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, img.width, img.height);
          }
          ctx.drawImage(img, 0, 0);
        }
        
        const outBase64 = offCanvas.toDataURL(mime, 1.0);

        if (Capacitor.isNativePlatform()) {
          const NativeMedia = registerPlugin<any>("NativeMedia");
          const cleanBase64 = outBase64.includes(",") ? outBase64.split(",")[1] : outBase64;
          await NativeMedia.saveImage({ base64: cleanBase64, filename: `${filename}.${ext}`, mimeType: mime });
        } else {
          const link = document.createElement("a");
          link.href = outBase64;
          link.download = `${filename}.${ext}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (e) {
      console.error("Export failed:", e);
      alert("Failed to export document.");
    } finally {
      setIsExporting(false);
    }
  };

  const filteredDocs = documentTypes.filter(d => d.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`fixed inset-0 z-[100] flex justify-center p-4 bg-gray-900/80 backdrop-blur-sm shadow-2xl overflow-y-auto ${!isPremium && isNative ? "items-start pt-[calc(env(safe-area-inset-top)+84px)] pb-10" : "items-center"}`}
        >
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="bg-white w-full max-w-lg rounded-[32px] overflow-hidden flex flex-col relative my-auto"
          >
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-blue-50/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Doc Converter</h2>
                  <p className="text-xs text-gray-500 font-medium tracking-tight">Scan, combine, and convert physical documents into high-quality PDF, JPG, WebP, or PNG files.</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto w-full flex-1 space-y-6 bg-slate-50">
              {/* Document Type Selector */}
              <div className="space-y-2 relative" id="docTypeContainer">
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wide flex justify-between items-center">
                  Document Type
                </label>

                <div className="relative">
                  <button 
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full relative px-4 py-3 bg-white border border-gray-200 rounded-xl text-left font-medium text-gray-800 flex justify-between items-center hover:border-gray-300 shadow-sm transition-all"
                  >
                    <span className="truncate">{selectedDocType}</span>
                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {isDropdownOpen && (
                      <motion.div 
                         initial={{ opacity: 0, y: -10 }}
                         animate={{ opacity: 1, y: 0 }}
                         exit={{ opacity: 0, y: -10 }}
                         className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden"
                      >
                         <div className="p-2 border-b border-gray-100">
                           <div className="relative">
                             <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                             <input 
                               autoFocus
                               type="text" 
                               value={searchQuery}
                               onChange={(e) => setSearchQuery(e.target.value)}
                               placeholder="Search documents..."
                               className="w-full pl-9 pr-3 py-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-0 outline-none"
                             />
                           </div>
                         </div>
                         <div className="max-h-60 overflow-y-auto">
                            {filteredDocs.length > 0 ? filteredDocs.map((doc, idx) => (
                              <button 
                                key={`${doc}-${idx}`}
                                onClick={() => {
                                  setSelectedDocType(doc);
                                  setIsDropdownOpen(false);
                                  setSearchQuery("");
                                }}
                                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors ${doc === selectedDocType ? 'bg-blue-50 font-bold text-blue-700' : 'text-gray-700'}`}
                              >
                                {doc}
                              </button>
                            )) : (
                              <p className="px-4 py-3 text-sm text-gray-500 text-center">No documents found.</p>
                            )}
                         </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Photos Section */}
              <div className="space-y-4">
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wide block">
                  Photos ({pages.length})
                </label>

                <div className="flex flex-wrap gap-4">
                  {Array.from({ length: Math.max(pages.length, 2) }).map((_, index) => {
                    const pageImage = pages[index];
                    const title = index === 0 ? "Step 1: Front side (Required)" : index === 1 ? "Step 2: Back side (Optional)" : `Page ${index + 1}`;
                    
                    return (
                      <div key={`doc-page-${index}`} className="flex flex-col relative group flex-[1_1_calc(50%-8px)] min-w-[120px] max-w-[200px]">
                        <p className="text-[11px] sm:text-xs font-bold text-gray-500 mb-2 leading-tight text-center">{title}</p>
                        <div 
                          className={`relative flex-1 aspect-[3/4] sm:aspect-square flex flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all overflow-hidden ${pageImage ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'}`}
                        >
                          {pageImage ? (
                            <img src={pageImage} className="absolute inset-0 w-full h-full object-cover" alt={`Page ${index + 1}`} />
                          ) : (
                            <div className="w-full h-full flex flex-col">
                              <button onClick={() => handleCameraClick(index)} className="flex-1 flex flex-col items-center justify-center text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors border-b-2 border-dashed border-gray-100">
                                 <Camera className="w-6 h-6 mb-1" />
                                 <span className="text-xs font-bold">Camera</span>
                              </button>
                              <button onClick={() => handleUploadClick(index)} className="flex-1 flex flex-col items-center justify-center text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors">
                                 <Upload className="w-6 h-6 mb-1" />
                                 <span className="text-xs font-bold">Upload</span>
                              </button>
                            </div>
                          )}
                        </div>
                        {pageImage && (
                          <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5">
                            <button 
                              onClick={() => onEditPage(index, pageImage)} 
                              className="flex-[1_1_35%] py-1.5 px-2 bg-blue-50 active:bg-blue-105 text-blue-600 rounded-xl text-[10px] font-black flex items-center justify-center gap-1 transition-all"
                              title="Edit"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                              <span>Edit</span>
                            </button>
                            <button 
                              onClick={() => handleCameraClick(index)} 
                              className="flex-[1_1_35%] py-1.5 px-2 bg-gray-50 active:bg-gray-105 text-gray-700 border border-gray-200 rounded-xl text-[10px] font-black flex items-center justify-center gap-1 transition-all"
                              title="Retake"
                            >
                              <Camera className="w-3.5 h-3.5 text-gray-500" />
                              <span>Retake</span>
                            </button>
                            <button 
                              onClick={() => handleUploadClick(index)} 
                              className="p-1.5 bg-gray-50 active:bg-gray-105 text-gray-700 border border-gray-200 rounded-xl transition-all flex items-center justify-center"
                              title="Upload File"
                            >
                              <Upload className="w-3.5 h-3.5 text-gray-500" />
                            </button>
                            <button 
                              onClick={() => removePage(index)} 
                              className="p-1.5 bg-red-50 active:bg-red-105 text-red-600 border border-red-100 rounded-xl transition-all flex items-center justify-center"
                              title="Delete Page"
                            >
                              <X className="w-3.5 h-3.5 text-red-500" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {pages.length >= 2 && (
                    <div className="flex flex-col relative group flex-[1_1_calc(50%-8px)] min-w-[120px] max-w-[200px]">
                       <p className="text-[11px] sm:text-xs font-bold text-gray-500 mb-2 leading-tight text-center">Add Page {pages.length + 1}</p>
                       <div className="relative flex-1 aspect-[3/4] sm:aspect-square flex flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all overflow-hidden border-gray-300 bg-gray-50 hover:bg-blue-50 hover:border-blue-300">
                          <div className="w-full h-full flex flex-col">
                             <button onClick={() => handleCameraClick()} className="flex-1 flex flex-col items-center justify-center text-gray-400 hover:text-blue-600 transition-colors border-b-2 border-dashed border-gray-200">
                                <Camera className="w-6 h-6 mb-1 opacity-50" />
                                <span className="text-xs font-bold opacity-75">Camera</span>
                             </button>
                             <button onClick={() => handleUploadClick()} className="flex-1 flex flex-col items-center justify-center text-gray-400 hover:text-blue-600 transition-colors">
                                <Upload className="w-6 h-6 mb-1 opacity-50" />
                                <span className="text-xs font-bold opacity-75">Upload</span>
                             </button>
                          </div>
                          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-blue-500 rounded-full p-2 shadow-lg shadow-blue-500/30 pointer-events-none border-4 border-white">
                             <Plus className="w-5 h-5 text-white" />
                          </div>
                       </div>
                    </div>
                  )}

                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment"
                    className="hidden" 
                    ref={cameraInputRef}
                    onChange={(e) => { if (e.target.files?.[0]) handleImageLoad(e.target.files[0]); e.target.value = ""; }} 
                  />
                  <input 
                    type="file" 
                    accept="image/png, image/jpeg, image/jpg, image/webp" 
                    multiple
                    className="hidden" 
                    ref={uploadInputRef}
                    onChange={(e) => { if (e.target.files && e.target.files.length > 0) handleImagesLoad(e.target.files); e.target.value = ""; }} 
                  />
                </div>
              </div>


              {/* Formats Section */}
              <div className="space-y-4">
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wide block">
                  Export Format
                </label>
                <div className="grid grid-cols-4 gap-2">
                   {(["pdf", "png", "jpg", "webp"] as const).map(f => (
                     <button
                        key={f}
                        onClick={() => setFormat(f)}
                        className={`py-3 rounded-xl font-bold text-sm transition-all focus:outline-none ${format === f ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105' : 'bg-white border-2 border-gray-100 text-gray-500 hover:border-gray-200'}`}
                     >
                       {f.toUpperCase()}
                     </button>
                   ))}
                </div>
              </div>
            </div>

            <div className="p-6 bg-white border-t border-gray-100 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)] z-10 shrink-0">
              <button
                onClick={triggerSaveWithAd}
                disabled={pages.length === 0 || isExporting}
                className={`w-full py-4 rounded-2xl font-black text-lg flex justify-center items-center gap-2 transition-all shadow-xl active:scale-[0.98] ${
                  pages.length === 0 
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none" 
                    : exportSuccess
                    ? "bg-green-500 text-white shadow-green-500/25"
                    : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/25"
                }`}
              >
                {isExporting ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                    <div className="w-6 h-6 border-4 border-current border-t-transparent rounded-full" />
                  </motion.div>
                ) : exportSuccess ? (
                  <>
                    <CheckCircle2 className="w-6 h-6" />
                    Success!
                  </>
                ) : (
                  <>
                    <Download className="w-6 h-6" />
                    Convert to {format.toUpperCase()}
                  </>
                )}
              </button>
              {pages.length === 0 && (
                <p className="text-center text-xs text-gray-500 mt-3 font-medium">Capture or upload at least one page to begin.</p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}

      {isCameraScannerOpen && (
        <CameraOverlayScanner 
          isOpen={isCameraScannerOpen}
          onClose={() => setIsCameraScannerOpen(false)}
          onCapture={handleCameraCapture}
          docTitle={selectedDocType}
          targetAspect={isIDCard(selectedDocType) ? 1.58 : (1 / 1.414)}
          pagesCount={pages.length}
        />
      )}

      {isPlayingAd && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-slate-950 flex flex-col justify-between p-6 select-none"
          style={{ paddingTop: !isPremium && isNative ? "calc(env(safe-area-inset-top) + 60px)" : undefined }}
        >
          {/* Top Info Bar */}
          <div className="flex justify-between items-center w-full">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 bg-slate-800 px-3 py-1 rounded font-mono font-bold">
              Sponsored Advertisement
            </span>
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-4 py-2 rounded-full font-mono font-bold text-xs text-white">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
              Reward in: {adCountdown}s
            </div>
          </div>

          {/* Ad Content */}
          <div className="flex flex-col items-center justify-center text-center my-auto space-y-6 max-w-md mx-auto">
            <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/20">
              <span className="text-white text-3xl font-black">P</span>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-extrabold text-white">Photy Premium</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Tired of waiting for ads? Upgrade to Photy Premium today to unlock all options, customize limitless mockups, create unlimited PDFs, and enjoy 100% ad-free lifetime exports!
              </p>
            </div>
            <button className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-full shadow-lg shadow-blue-500/25 transition-all text-xs uppercase tracking-wider">
              Upgrade For Lifetime
            </button>
          </div>

          {/* Bottom attribution/status */}
          <div className="text-center pb-safe">
            <span className="text-[11px] text-slate-500 font-mono">
              Your conversion will resume automatically when the ad completes.
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
