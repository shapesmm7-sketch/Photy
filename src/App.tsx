/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, Share2, Download, Edit2, Sparkles, Shield, Palette, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { applyStyle, SensitiveArea, Styles, PhoneLayouts } from './lib/imageProcessor';
import EditorCanvas from './EditorCanvas';

type AppState = 'upload' | 'processing' | 'preview';

export default function App() {
  const [appState, setAppState] = useState<AppState>('upload');
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  
  // NEW STATES
  const [selectedStyle, setSelectedStyle] = useState('Minimal');
  const [selectedLayout, setSelectedLayout] = useState('None');
  const [isPrivacyScanning, setIsPrivacyScanning] = useState(false);
  const [blurStrength, setBlurStrength] = useState(15);
  const [sensitiveAreas, setSensitiveAreas] = useState<SensitiveArea[]>([]);
  const [memeTopText, setMemeTopText] = useState('TOP TEXT');
  const [memeBottomText, setMemeBottomText] = useState('BOTTOM TEXT');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync processed image when any parameter changes
  React.useEffect(() => {
    if (originalImage) {
      applyStyle(originalImage, selectedStyle, selectedLayout, sensitiveAreas, blurStrength, memeTopText, memeBottomText)
        .then(setProcessedImage)
        .catch(console.error);
    }
  }, [originalImage, selectedStyle, selectedLayout, sensitiveAreas, blurStrength, memeTopText, memeBottomText]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1600;
        const MAX_HEIGHT = 1600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        const resizedResult = canvas.toDataURL('image/jpeg', 0.9);
        setOriginalImage(resizedResult);
        setAppState('processing');
        
        setTimeout(() => {
          setAppState('preview');
        }, 800);
      };
      img.src = event.target?.result as string;
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
    <div className="min-h-screen bg-blue-600 text-gray-900 font-sans flex items-center justify-center relative overflow-hidden">
      
      <AnimatePresence mode="wait">
        {/* ... upload and processing screens same ... */}
        {appState === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md p-8 flex flex-col items-center text-center space-y-6 bg-white/10 backdrop-blur-xl rounded-[40px] border border-white/20 shadow-2xl m-4"
          >
            <div className="w-16 h-16 bg-white text-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-xl">
               <ImageIcon className="w-8 h-8" />
            </div>
            <div className="text-white">
              <h1 className="text-4xl font-black mb-2 tracking-tighter">SnapClean</h1>
              <p className="text-blue-100 text-sm font-medium">
                Viral screenshots, one tap away. Professional styles and memes.
              </p>
            </div>
            
            <button
               onClick={() => fileInputRef.current?.click()}
               className="w-full py-5 bg-white text-blue-600 rounded-2xl font-black shadow-2xl hover:bg-blue-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-lg"
            >
               <Upload className="w-6 h-6" />
               Upload Screenshot
            </button>
            <input 
              type="file" 
              accept="image/png, image/jpeg" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileUpload}
            />

            <div className="grid grid-cols-1 gap-3 w-full">
              <div className="p-4 bg-white/10 rounded-2xl border border-white/10 text-center">
                <Palette className="w-5 h-5 text-blue-200 mb-2 mx-auto" />
                <h3 className="text-xs font-bold text-white uppercase tracking-widest">Viral Styles</h3>
                <p className="text-[10px] text-blue-100/60">Professional Card & Meme Layouts</p>
              </div>
            </div>
          </motion.div>
        )}

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
                   transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                />
             </div>
             <div className="text-center">
                <h2 className="text-xl font-bold">Enhancing screenshot...</h2>
                <p className="text-sm text-gray-400">Perfecting your layout</p>
             </div>
          </motion.div>
        )}

        {/* PREVIEW SCREEN */}
        {appState === 'preview' && processedImage && !showEditor && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full h-full md:h-[95vh] md:w-[420px] md:rounded-[40px] bg-white flex flex-col shadow-2xl relative overflow-hidden ring-8 ring-gray-900/5"
          >
            {/* Top Toolbar */}
            <div className="p-4 flex justify-between items-center bg-white z-20">
              <button 
                onClick={() => setAppState('upload')}
                className="p-2 bg-gray-100 rounded-full text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex gap-2">
                 {/* Secondary actions can go here */}
              </div>
            </div>

            {/* Main Preview Area */}
            <div className="flex-1 bg-[#F1F5F9] p-4 flex items-center justify-center overflow-hidden">
               <div className="relative group cursor-zoom-in">
                  <img 
                    src={processedImage} 
                    className="max-h-[60vh] rounded-xl shadow-2xl transition-transform duration-300 group-hover:scale-[1.02]" 
                    alt="Preview" 
                  />
                </div>
             </div>

            {/* Style & Layout Selectors */}
            <div className="bg-white p-4 border-t border-gray-50 flex flex-col gap-4">
              {/* Viral Styles */}
              <div>
                <div className="flex items-center gap-2 mb-3 px-2">
                  <Palette className="w-4 h-4 text-gray-400" />
                  <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">Viral Styles</span>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-1 no-scrollbar">
                  {Object.keys(Styles).map(style => {
                    const isSelected = selectedStyle === style;
                    const config = Styles[style];
                    const bgStyle = config.bgGradient 
                      ? { background: `linear-gradient(135deg, ${config.bgGradient.join(', ')})` }
                      : { backgroundColor: config.bgColor };

                    return (
                      <button 
                        key={style}
                        onClick={() => setSelectedStyle(style)}
                        className="flex flex-col items-center gap-2 shrink-0 group"
                      >
                        <div 
                          style={bgStyle}
                          className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black transition-all border-2 ${isSelected ? 'border-blue-600 scale-110 shadow-lg shadow-blue-100' : 'border-gray-100'}`}
                        >
                          <span className={`${(style === 'Dark' || style === 'Money' || style === 'Focus' || style === 'Instagram' || style === 'Meme') ? 'text-white' : 'text-gray-900'}`}>{style[0]}</span>
                        </div>
                        <span className={`text-[9px] ${isSelected ? 'text-blue-600 font-bold' : 'text-gray-400 font-medium'}`}>{style}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Phone Layouts */}
              <div>
                <div className="flex items-center gap-2 mb-3 px-2">
                  <ImageIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">Phone Layouts</span>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-1 no-scrollbar">
                  {Object.keys(PhoneLayouts).map(layoutName => {
                    const isSelected = selectedLayout === layoutName;
                    const config = PhoneLayouts[layoutName];

                    return (
                      <button 
                        key={layoutName}
                        onClick={() => setSelectedLayout(layoutName)}
                        className="flex flex-col items-center gap-2 shrink-0 group relative"
                      >
                        <div 
                          className={`w-12 h-20 rounded-lg flex flex-col items-center justify-center transition-all border-2 overflow-hidden bg-gray-50 ${isSelected ? 'border-blue-600 scale-105 shadow-md' : 'border-gray-100'}`}
                        >
                           {layoutName === 'None' ? (
                             <X className="w-4 h-4 text-gray-300" />
                           ) : (
                             <div className="w-8 h-14 border border-gray-300 rounded-sm bg-white relative">
                               <div className="absolute top-1 left-1 right-1 h-2 bg-gray-100 rounded-full" />
                               <div className="absolute bottom-1 left-1 right-1 h-3 bg-blue-50 rounded-xs" />
                             </div>
                           )}
                           {config.premium && (
                             <div className="absolute top-0 right-0 bg-amber-400 text-white text-[8px] px-1 font-bold">PRO</div>
                           )}
                        </div>
                        <span className={`text-[9px] max-w-[50px] text-center truncate ${isSelected ? 'text-blue-600 font-bold' : 'text-gray-400 font-medium'}`}>{layoutName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="p-6 bg-white border-t border-gray-100 flex flex-col gap-3">
               <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      setShowEditor(true);
                    }}
                    className="flex-1 py-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-100"
                  >
                    <Edit2 className="w-5 h-5" /> Edit
                  </button>
                  <button 
                    onClick={shareImage}
                    className="flex-[2] py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-100"
                  >
                    <Share2 className="w-5 h-5" /> Share to Viral
                  </button>
               </div>
               <div className="flex gap-3">
                  <button 
                    onClick={downloadImage}
                    className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-100"
                  >
                    <Download className="w-5 h-5" /> Save
                  </button>
                  <button 
                    onClick={() => setAppState('upload')}
                    className="flex-1 py-4 bg-red-400 hover:bg-red-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-100"
                  >
                    <X className="w-5 h-5" /> Start Over
                  </button>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MANUAL EDITOR MODAL */}
      <AnimatePresence>
        {showEditor && (originalImage || processedImage) && (
           <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute inset-0 z-50 md:rounded-3xl overflow-hidden bg-black md:inset-auto md:w-[480px] md:h-[90vh]"
           >
              <EditorCanvas 
                imageSrc={processedImage || originalImage!} 
                onCancel={() => setShowEditor(false)}
                onSave={(newImgDataUrl) => {
                   setOriginalImage(newImgDataUrl);
                   setSelectedStyle('Original');
                   setShowEditor(false);
                }}
              />
           </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
