/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, Share2, Download, Edit2, Sparkles, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { autoProcessImage } from './lib/imageProcessor';
import EditorCanvas from './EditorCanvas';

type AppState = 'upload' | 'processing' | 'preview';

export default function App() {
  const [appState, setAppState] = useState<AppState>('upload');
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const result = event.target?.result as string;
      setOriginalImage(result);
      setAppState('processing');
      
      try {
        // Enforce the requested 1-second processing screen
        const [processed] = await Promise.all([
          autoProcessImage(result),
          new Promise(res => setTimeout(res, 1000))
        ]);
        
        setProcessedImage(processed);
        setAppState('preview');
      } catch (err) {
        console.error("Error processing image:", err);
        alert("Failed to process image.");
        setAppState('upload');
      }
    };
    reader.readAsDataURL(file);
  };

  const currentDisplayImage = showEditor ? null : processedImage;

  const downloadImage = () => {
    if (!processedImage) return;
    const link = document.createElement('a');
    link.href = processedImage;
    link.download = 'edited_screenshot.png';
    link.click();
  };

  const shareImage = async () => {
     if (!processedImage) return;
     try {
        const response = await fetch(processedImage);
        const blob = await response.blob();
        const file = new File([blob], "edited_screenshot.png", { type: blob.type });
        
        if (navigator.share && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'Edited Screenshot',
            files: [file]
          });
        } else {
          alert('Web Share API is not supported in this browser, or cannot share files.');
        }
     } catch (err) {
        console.error(err);
     }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-gray-900 font-sans flex items-center justify-center relative overflow-hidden">
      
      <AnimatePresence mode="wait">
        {/* UPLOAD SCREEN */}
        {appState === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md p-8 flex flex-col items-center text-center space-y-6"
          >
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-blue-200">
               <ImageIcon className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold mb-2">Snap Clean</h1>
              <p className="text-gray-500 text-sm">
                Auto-crop, enhance, and beautify your screenshots or photos instantly.
              </p>
            </div>
            
            <button
               onClick={() => fileInputRef.current?.click()}
               className="w-full py-4 bg-gray-900 text-white rounded-xl font-medium shadow-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
            >
               <Upload className="w-5 h-5" />
               Select Image
            </button>
            <input 
              type="file" 
              accept="image/png, image/jpeg" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileUpload}
            />

            <div className="bg-white/60 p-4 rounded-xl text-xs text-left text-gray-500 flex gap-3 mt-4 border border-gray-200 w-full">
              <Sparkles className="w-5 h-5 text-yellow-500 shrink-0" />
              <p>Magic tools automatically remove status bars, balance contrast, and add device-ready padding.</p>
            </div>
          </motion.div>
        )}

        {/* PROCESSING SCREEN */}
        {appState === 'processing' && (
          <motion.div
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-md flex flex-col items-center justify-center space-y-6"
          >
             <div className="relative w-20 h-20">
                <motion.div 
                  className="absolute inset-0 border-4 border-t-blue-600 border-r-transparent border-b-transparent border-l-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                />
                <motion.div 
                  className="absolute inset-2 border-4 border-t-transparent border-r-blue-400 border-b-transparent border-l-transparent rounded-full"
                  animate={{ rotate: -360 }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                />
             </div>
             <div className="text-center">
               <h2 className="text-xl font-medium mb-1">Polishing Pixels...</h2>
               <p className="text-sm text-gray-500">Applying smart crop & enhancements</p>
             </div>
          </motion.div>
        )}

        {/* PREVIEW SCREEN */}
        {appState === 'preview' && processedImage && !showEditor && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full h-full md:h-[90vh] md:w-[480px] md:rounded-3xl bg-[#0A0A0A] text-white flex flex-col shadow-2xl relative"
          >
            {/* Header */}
            <div className="flex justify-between items-center p-4 z-10 pt-safe font-medium">
               <div className="px-3 py-1 bg-white/10 rounded-full text-xs text-blue-400 flex items-center gap-1.5 border border-blue-500/20 backdrop-blur-md">
                 <Sparkles className="w-3.5 h-3.5" /> Auto-Edited
               </div>
               <button 
                 onClick={() => {
                   setAppState('upload');
                   setProcessedImage(null);
                   if (fileInputRef.current) fileInputRef.current.value = '';
                 }}
                 className="text-xs text-gray-400 hover:text-white transition-colors"
               >
                 START OVER
               </button>
            </div>

            {/* Image Container */}
            <div className="flex-1 flex items-center justify-center p-4 overflow-hidden relative">
               <motion.img 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  src={processedImage} 
                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" 
                  alt="Processed screenshot" 
               />
            </div>

            {/* Action Bar */}
            <motion.div 
               initial={{ y: 20, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               transition={{ delay: 0.2 }}
               className="p-6 pb-safe bg-gradient-to-t from-black/80 to-transparent relative z-10 flex justify-between items-center gap-4"
            >
               <button 
                 onClick={shareImage}
                 className="flex-1 py-3.5 bg-[#222] hover:bg-[#333] transition-colors rounded-2xl flex items-center justify-center gap-2 font-medium"
               >
                 <Share2 className="w-5 h-5" />
                 Share
               </button>
               
               <button 
                 onClick={() => setShowEditor(true)}
                 className="w-14 h-14 bg-[#222] hover:bg-[#333] transition-colors rounded-full flex items-center justify-center shrink-0 border border-white/5"
               >
                 <Edit2 className="w-5 h-5" />
               </button>

               <button 
                 onClick={downloadImage}
                 className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-500 text-white transition-colors rounded-2xl flex items-center justify-center gap-2 font-medium shadow-lg shadow-blue-900/50"
               >
                 <Download className="w-5 h-5" />
                 Save
               </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MANUAL EDITOR MODAL */}
      <AnimatePresence>
        {showEditor && processedImage && (
           <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute inset-0 z-50 md:rounded-3xl overflow-hidden bg-black md:inset-auto md:w-[480px] md:h-[90vh]"
           >
              <EditorCanvas 
                imageSrc={processedImage} 
                onCancel={() => setShowEditor(false)}
                onSave={(newImgDataUrl) => {
                   setProcessedImage(newImgDataUrl);
                   setShowEditor(false);
                }}
              />
           </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
