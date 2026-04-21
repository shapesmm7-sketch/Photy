/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, Share2, Download, Edit2, Sparkles, Shield, Palette, X, Smartphone, PaintBucket, Settings, Star, Moon, Sun, Globe, Crown, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { applyStyle, SensitiveArea, Styles, PhoneLayouts } from './lib/imageProcessor';
import EditorCanvas from './EditorCanvas';
import { translations, LanguageKey } from './i18n';
import { initializeAdMob, showBannerAd, hideBannerAd, playRewardedAds, isNative } from './lib/admob';

type AppState = 'upload' | 'processing' | 'preview';

const EXTENDED_PALETTE = [
  '#FFFFFF', // White
  '#F1F5F9', // Light Slate
  '#94A3B8', // Medium Gray
  '#475569', // Dark Slate
  '#000000', // Black
  '#FEF2F2', // Very Light Red
  '#EF4444', // Red
  '#991B1B', // Dark Red
  '#FFF7ED', // Very Light Orange
  '#F97316', // Orange
  '#9A3412', // Dark Orange
  '#FCD34D', // Yellow
  '#B45309', // Dark Yellow/Brown
  '#ECFCCB', // Very Light Lime
  '#84CC16', // Lime Green
  '#4D7C0F', // Dark Lime
  '#22C55E', // Green
  '#15803D', // Dark Green
  '#10B981', // Emerald
  '#14B8A6', // Teal
  '#06B6D4', // Cyan
  '#0EA5E9', // Sky Blue
  '#3B82F6', // Blue
  '#1D4ED8', // Dark Blue
  '#6366F1', // Indigo
  '#312E81', // Dark Indigo
  '#8B5CF6', // Violet
  '#A855F7', // Purple
  '#6B21A8', // Dark Purple
  '#D946EF', // Fuchsia
  '#EC4899', // Pink
  '#BE185D', // Dark Pink
  '#F43F5E', // Rose
  '#FFD700', // Gold
  '#FF7F50', // Coral
  '#40E0D0', // Turquoise
  '#8B4513', // SaddleBrown
  '#000080'  // Navy
];

export default function App() {
  const [appState, setAppState] = useState<AppState>('upload');
  const [originalImage, setOriginalImage] = useState<string | null>(null); // Baked version for style
  const [cleanImage, setCleanImage] = useState<string | null>(null); // Clean version for editor (un-baked)
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  
  // NEW STATES
  const [editorPaths, setEditorPaths] = useState<any[]>([]);
  const [editorTexts, setEditorTexts] = useState<any[]>([]);
  const [selectedStyle, setSelectedStyle] = useState('Money');
  const [selectedLayout, setSelectedLayout] = useState('None');
  const [isPrivacyScanning, setIsPrivacyScanning] = useState(false);
  const [blurStrength, setBlurStrength] = useState(15);
  const [sensitiveAreas, setSensitiveAreas] = useState<SensitiveArea[]>([]);
  const [memeTopText, setMemeTopText] = useState('TOP TEXT');
  const [memeBottomText, setMemeBottomText] = useState('BOTTOM TEXT');
  const [customBgColor, setCustomBgColor] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [language, setLanguage] = useState<LanguageKey>('en');
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [selectedPremiumPlan, setSelectedPremiumPlan] = useState<'monthly' | '6months' | '12months'>('12months');
  const [isPremium, setIsPremium] = useState(false);
  
  const t = (key: keyof typeof translations['en']) => translations[language]?.[key] || translations['en'][key];
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Capacitor AdMob Initialization
  React.useEffect(() => {
    if (!isPremium) {
      initializeAdMob().then(() => {
        showBannerAd();
      });
    } else {
      hideBannerAd();
    }
  }, [isPremium]);

  // Sync processed image when any parameter changes
  React.useEffect(() => {
    if (originalImage) {
      applyStyle(originalImage, selectedStyle, selectedLayout, sensitiveAreas, blurStrength, memeTopText, memeBottomText, customBgColor)
        .then((res) => {
          setProcessedImage(res);
          // Clear any manual edits on the new base style
          setCleanImage(null);
          setEditorPaths([]);
          setEditorTexts([]);
        })
        .catch(console.error);
    }
  }, [originalImage, selectedStyle, selectedLayout, sensitiveAreas, blurStrength, memeTopText, memeBottomText, customBgColor]);

  // Deselect custom color if style or layout changes, EXCEPT when changing the custom color itself
  // Actually, we don't necessarily want to unset it. Let's let the user keep it if they explicitly set it.

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
        setCleanImage(resizedResult);
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

  const executeDownload = () => {
    if (!processedImage) return;
    const link = document.createElement('a');
    link.href = processedImage;
    link.download = 'edited_screenshot.png';
    link.click();
  };

  const downloadImage = () => {
    if (!isPremium) {
       playRewardedAds(executeDownload);
       return;
    }
    executeDownload();
  };

  const executeShare = async () => {
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

  const shareImage = () => {
     if (!isPremium) {
        playRewardedAds(executeShare);
        return;
     }
     executeShare();
  };

  const handleShareSystem = async () => {
     if (navigator.share) {
        try {
           await navigator.share({
              title: t('appName'),
              text: t('shareText'),
              url: window.location.origin
           });
        } catch (e) {
           console.log('User cancelled web share');
        }
     } else {
        alert(t('shareError'));
     }
  };

  const handleRateUs = () => {
     alert(t('rateUsAlert'));
  };

  return (
    <div className={`min-h-screen font-sans flex items-center justify-center relative overflow-hidden transition-colors duration-500 flex-col ${isNative ? '' : 'pt-safe'} ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-blue-600 text-gray-900'}`}>
      
      {!isNative && !isPremium && (
        <div className={`w-full ${isDarkMode ? 'bg-slate-800 text-slate-400 border-slate-700/50' : 'bg-yellow-50 text-yellow-800 border-yellow-200'} text-xs text-center border-b shadow-sm flex items-center justify-center p-2 z-[40] relative`}>
            <strong>Note:</strong> AdMob requires native iOS/Android to render. In this browser view, ads are skipped automatically.
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* ... upload and processing screens same ... */}
        {appState === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`w-full max-w-md p-8 flex flex-col items-center text-center space-y-6 backdrop-blur-xl rounded-[40px] shadow-2xl m-4 relative ${isDarkMode ? 'bg-slate-800/80 border border-slate-700' : 'bg-white/10 border border-white/20'}`}
          >
            {/* Settings Button */}
            <button 
              onClick={() => setShowSettings(true)}
              className={`absolute top-6 right-6 p-2 rounded-full transition-colors ${isDarkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-white/20 text-white hover:bg-white/30'}`}
            >
               <Settings className="w-5 h-5" />
            </button>

            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-xl ${isDarkMode ? 'bg-slate-700 text-blue-400' : 'bg-white text-blue-600'}`}>
               <ImageIcon className="w-8 h-8" />
            </div>
            <div className={isDarkMode ? 'text-white' : 'text-white'}>
              <h1 className="text-4xl font-black mb-2 tracking-tighter">{t('appName')}</h1>
              <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-blue-100'}`}>
                {t('subtitle')}
              </p>
            </div>
            
            <button
               onClick={() => fileInputRef.current?.click()}
               className={`w-full py-5 rounded-2xl font-black shadow-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-lg ${isDarkMode ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-white text-blue-600 hover:bg-blue-50'}`}
            >
               <Upload className="w-6 h-6" />
               {t('uploadBtn')}
            </button>
            <input 
              type="file" 
              accept="image/png, image/jpeg" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileUpload}
            />

            <div className="grid grid-cols-1 gap-3 w-full">
              <div className={`p-4 rounded-2xl border text-center ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white/10 border-white/10'}`}>
                <Palette className={`w-5 h-5 mb-2 mx-auto ${isDarkMode ? 'text-blue-400' : 'text-blue-200'}`} />
                <h3 className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-200' : 'text-white'}`}>{t('viralStylesTitle')}</h3>
                <p className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-blue-100/60'}`}>{t('viralStylesDesc')}</p>
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
                <h2 className="text-xl font-bold">{t('enhancing')}</h2>
                <p className="text-sm text-gray-400">{t('perfecting')}</p>
             </div>
          </motion.div>
        )}

        {/* PREVIEW SCREEN */}
        {appState === 'preview' && processedImage && !showEditor && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full h-[100dvh] md:h-[95vh] md:w-[420px] md:rounded-[40px] bg-white flex flex-col shadow-2xl relative overflow-hidden ring-8 ring-gray-900/5"
          >
            {/* Top Toolbar */}
            <div className="p-3 md:p-4 flex justify-between items-center bg-white z-20 shrink-0">
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
            <div className="flex-1 bg-[#F1F5F9] p-4 flex items-center justify-center overflow-hidden min-h-0">
               <div className="relative group cursor-zoom-in h-full w-full flex items-center justify-center">
                  <img 
                    src={processedImage} 
                    className="max-h-full max-w-full object-contain rounded-xl shadow-2xl transition-transform duration-300 group-hover:scale-[1.02]" 
                    alt="Preview" 
                  />
                </div>
             </div>

            {/* Style & Layout Selectors */}
            <div className="bg-white p-2 md:p-4 border-t border-gray-50 flex flex-col gap-2 shrink-0">
              {/* Viral Styles */}
              <div>
                <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3 px-2">
                  <Palette className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400" />
                  <span className="text-[9px] md:text-[10px] font-bold text-gray-400 tracking-widest uppercase">{t('viralStylesTitle')}</span>
                </div>
                <div className="flex gap-3 md:gap-4 overflow-x-auto pb-1 no-scrollbar items-center">
                  {Object.keys(Styles).map(style => {
                    const isSelected = selectedStyle === style;

                    return (
                      <button 
                        key={style}
                        onClick={() => setSelectedStyle(style)}
                        className="flex flex-col items-center gap-2 shrink-0 group"
                      >
                        <div 
                          className={`w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center text-sm md:text-lg font-black transition-[transform,border-color,box-shadow] duration-200 border-2 ${isSelected ? 'border-blue-600 scale-110 shadow-lg shadow-blue-100' : 'border-gray-100'} ${
                             style === 'Original' ? 'bg-white' :
                             style === 'Minimal' ? 'bg-[#F8FAFC]' :
                             style === 'Dark' ? 'bg-[#0F172A]' :
                             style === 'Instagram' ? 'bg-gradient-to-br from-[#f09433] via-[#dc2743] to-[#bc1888]' :
                             style === 'Shadow' ? 'bg-[#E2E8F0]' :
                             style === 'Meme' ? 'bg-black' :
                             style === 'Money' ? 'bg-[#065F46]' :
                             style === 'Focus' ? 'bg-[#1F2937]' :
                             style === 'Viral' ? 'bg-red-500' :
                             style === 'Chat' ? 'bg-[#ECFDF5]' :
                             'bg-[#F1F5F9]'
                          }`}
                        >
                          <span className={`${(style === 'Dark' || style === 'Money' || style === 'Focus' || style === 'Instagram' || style === 'Meme' || style === 'Viral') ? 'text-white' : 'text-gray-900'}`}>{style[0]}</span>
                        </div>
                        <span className={`text-[9px] ${isSelected ? 'text-blue-600 font-bold' : 'text-gray-400 font-medium'}`}>{style}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Phone Layouts */}
              <div>
                <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3 px-2">
                  <Smartphone className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400" />
                  <span className="text-[9px] md:text-[10px] font-bold text-gray-400 tracking-widest uppercase">{t('phoneLayouts')}</span>
                </div>
                <div className="flex gap-3 md:gap-4 overflow-x-auto pb-1 no-scrollbar px-2 items-center">
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
                          style={{ backgroundColor: config.themeColor }}
                          className={`w-10 h-16 md:w-12 md:h-20 rounded-xl flex flex-col items-center justify-center transition-all border-2 overflow-hidden ${isSelected ? 'border-white ring-2 ring-blue-600 ring-offset-2 scale-105 shadow-xl' : 'border-black/5 hover:border-black/20 shadow-sm opacity-90 hover:opacity-100'}`}
                        >
                           {layoutName === 'None' ? (
                             <X className={`w-4 h-4 ${layoutName === 'None' && config.themeColor === '#f3f4f6' ? 'text-gray-400' : 'text-white'}`} />
                           ) : (
                             <div 
                              style={{ 
                                transform: config.rotation ? `rotate(${config.rotation}deg)` : 'none',
                                aspectRatio: config.isLandscape ? '16/9' : '9/16'
                              }}
                              className={`bg-slate-900 rounded-[3px] border border-white/20 shadow-2xl relative flex flex-col items-center justify-center ${config.isLandscape ? 'w-8 h-5' : 'w-6 h-10'}`}
                             >
                               {/* Screen Content Mockup */}
                               <div className="w-[85%] h-[85%] bg-blue-500/20 rounded-[2px] flex items-center justify-center">
                                  <div className="w-[60%] h-[10%] bg-blue-400/40 rounded-full" />
                               </div>
                               {/* Notch */}
                               {!config.isLandscape && <div className="absolute top-[2px] w-[30%] h-[2px] bg-black rounded-full" />}
                             </div>
                           )}
                        </div>
                        <span className={`text-[8px] uppercase tracking-tighter ${isSelected ? 'text-blue-600 font-black' : 'text-gray-400 font-bold'}`}>{layoutName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Background Colors */}
              <div>
                <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3 px-2">
                  <PaintBucket className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400" />
                  <span className="text-[9px] md:text-[10px] font-bold text-gray-400 tracking-widest uppercase">{t('canvasColor')}</span>
                </div>
                <div className="flex gap-2.5 md:gap-3 overflow-x-auto pb-1 no-scrollbar px-2 items-center">
                  <button
                    onClick={() => setCustomBgColor(null)}
                    className="flex flex-col items-center gap-1.5 shrink-0 group relative"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all border-2 overflow-hidden bg-gray-100 ${customBgColor === null ? 'border-blue-600 ring-2 ring-blue-600 ring-offset-1 scale-110 shadow-md' : 'border-gray-200'}`}>
                      <X className="w-4 h-4 text-gray-500" />
                    </div>
                  </button>

                  {/* Native Color Picker for ALL infinite colors */}
                  <div className="flex flex-col items-center gap-1.5 shrink-0 group relative">
                    <div 
                      className={`w-8 h-8 rounded-full transition-all border-2 overflow-hidden shadow-sm relative flex items-center justify-center cursor-pointer hover:scale-105 ${
                        customBgColor && !EXTENDED_PALETTE.includes(customBgColor.toUpperCase()) 
                        ? 'border-white ring-2 ring-blue-600 ring-offset-1 scale-110 shadow-md' 
                        : 'border-white'
                      }`}
                      style={{ background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)' }}
                    >
                      <input 
                        type="color" 
                        title="Pick custom color"
                        value={customBgColor || '#FFFFFF'}
                        onChange={(e) => setCustomBgColor(e.target.value)}
                        className="absolute inset-[-10px] w-12 h-12 opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Extended Palette */}
                  {EXTENDED_PALETTE.map(hex => (
                    <button
                      key={hex}
                      onClick={() => setCustomBgColor(hex)}
                      className="flex flex-col items-center gap-1.5 shrink-0 group relative"
                    >
                      <div 
                        style={{ backgroundColor: hex }}
                        className={`w-8 h-8 rounded-full transition-all border-2 overflow-hidden shadow-sm ${customBgColor?.toUpperCase() === hex.toUpperCase() ? 'border-white ring-2 ring-blue-600 ring-offset-1 scale-110 shadow-md' : 'border-black/5 hover:scale-105'}`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="p-4 bg-white border-t border-gray-100 flex flex-col gap-3 shrink-0 pb-6 md:pb-4">
                <div className="flex gap-2 md:gap-3">
                  <button 
                    onClick={() => {
                      setShowEditor(true);
                    }}
                    className="flex-1 py-2.5 md:py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl md:rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-100"
                  >
                    <Edit2 className="w-4 h-4 md:w-5 md:h-5" /> {t('editBtn')}
                  </button>
                  <button 
                    onClick={shareImage}
                    className="flex-[2] py-2.5 md:py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl md:rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-100"
                  >
                    <Share2 className="w-5 h-5" /> {t('shareBtn')}
                  </button>
               </div>
               <div className="flex gap-3">
                  <button 
                    onClick={downloadImage}
                    className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-100"
                  >
                    <Download className="w-5 h-5" /> {t('saveBtn')}
                  </button>
                  <button 
                    onClick={() => setAppState('upload')}
                    className="flex-1 py-3 bg-red-400 hover:bg-red-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-100"
                  >
                    <X className="w-5 h-5" /> {t('startOverBtn')}
                  </button>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SETTINGS MODAL */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div 
               key="settings-backdrop"
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setShowSettings(false)}
               className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
               key="settings-sheet"
               initial={{ y: '100%' }}
               animate={{ y: 0 }}
               exit={{ y: '100%' }}
               transition={{ type: 'spring', damping: 25, stiffness: 200 }}
               className={`absolute bottom-0 left-0 right-0 z-50 rounded-t-[32px] p-6 pb-12 shadow-2xl ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}
            >
               <div className="flex justify-between items-center mb-6">
                 <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t('settings')}</h2>
                 <button onClick={() => setShowSettings(false)} className={`p-2 rounded-full ${isDarkMode ? 'bg-slate-700 text-gray-300' : 'bg-gray-100 text-gray-500'}`}>
                   <X className="w-5 h-5" />
                 </button>
               </div>

               <div className="space-y-3">
                 {/* Language Selector */}
                 <div className={`w-full flex items-center justify-between p-4 rounded-2xl transition-colors ${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'}`}>
                    <div className="flex items-center gap-3">
                       <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-slate-600 text-blue-400' : 'bg-white text-blue-600 shadow-sm'}`}>
                          <Globe className="w-5 h-5" />
                       </div>
                       <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t('language')}</span>
                    </div>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as LanguageKey)}
                      className={`bg-transparent p-1 outline-none font-semibold cursor-pointer ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}
                    >
                      <option value="en" className={isDarkMode ? 'bg-slate-800 text-white' : 'bg-white text-gray-900'}>English</option>
                      <option value="es" className={isDarkMode ? 'bg-slate-800 text-white' : 'bg-white text-gray-900'}>Español</option>
                      <option value="fr" className={isDarkMode ? 'bg-slate-800 text-white' : 'bg-white text-gray-900'}>Français</option>
                      <option value="de" className={isDarkMode ? 'bg-slate-800 text-white' : 'bg-white text-gray-900'}>Deutsch</option>
                      <option value="hi" className={isDarkMode ? 'bg-slate-800 text-white' : 'bg-white text-gray-900'}>हिन्दी</option>
                      <option value="zh" className={isDarkMode ? 'bg-slate-800 text-white' : 'bg-white text-gray-900'}>中文</option>
                    </select>
                 </div>

                 {/* Upgrade App */}
                 <button 
                    onClick={() => {
                        setShowSettings(false);
                        setTimeout(() => setShowPremiumModal(true), 300);
                    }}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl transition-colors bg-gradient-to-r from-amber-200 via-yellow-400 to-orange-400 hover:from-amber-300 hover:to-orange-500 shadow-lg`}
                 >
                    <div className="flex items-center gap-3">
                       <div className={`p-2 rounded-xl bg-white/20 text-white backdrop-blur-sm`}>
                          <Crown className="w-5 h-5 drop-shadow" />
                       </div>
                       <span className={`font-bold text-white drop-shadow-sm`}>{t('upgradePremium')}</span>
                    </div>
                 </button>

                 {/* Dark Mode Toggle */}
                 <button 
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl transition-colors ${isDarkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-50 hover:bg-gray-100'}`}
                 >
                    <div className="flex items-center gap-3">
                       <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-slate-600 text-blue-400' : 'bg-white text-blue-600 shadow-sm'}`}>
                          {isDarkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                       </div>
                       <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t('darkMode')}</span>
                    </div>
                    <div className={`w-12 h-6 rounded-full transition-colors relative ${isDarkMode ? 'bg-blue-600' : 'bg-gray-300'}`}>
                       <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isDarkMode ? 'left-7' : 'left-1'}`} />
                    </div>
                 </button>

                 {/* Share App */}
                 <button 
                    onClick={handleShareSystem}
                    className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-colors ${isDarkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-50 hover:bg-gray-100'}`}
                 >
                    <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-slate-600 text-blue-400' : 'bg-white text-blue-600 shadow-sm'}`}>
                       <Share2 className="w-5 h-5" />
                    </div>
                    <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t('shareApp')}</span>
                 </button>

                 {/* Rate Us */}
                 <button 
                    onClick={handleRateUs}
                    className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-colors ${isDarkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-50 hover:bg-gray-100'}`}
                 >
                    <div className={`p-2 rounded-xl text-yellow-500 ${isDarkMode ? 'bg-slate-600' : 'bg-white shadow-sm'}`}>
                       <Star className="w-5 h-5 fill-current" />
                    </div>
                    <div className="flex flex-col items-start">
                       <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t('rateUs')}</span>
                       <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{t('rateUsSubtitle')}</span>
                    </div>
                 </button>
               </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* PREMIUM UPGRADE MODAL */}
      <AnimatePresence>
        {showPremiumModal && (
          <>
            <motion.div 
               key="premium-backdrop"
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setShowPremiumModal(false)}
               className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            >
               <motion.div
                  key="premium-modal"
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: 20 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  onClick={e => e.stopPropagation()}
                  className={`w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl relative ${isDarkMode ? 'bg-slate-900 border border-slate-700' : 'bg-white'}`}
               >
                  <button 
                     onClick={() => setShowPremiumModal(false)} 
                     className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors"
                  >
                     <X className="w-5 h-5" />
                  </button>

                  {/* Header */}
                  <div className="bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 px-6 py-10 text-center relative overflow-hidden">
                     <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
                     <Crown className="w-16 h-16 text-white drop-shadow-lg mx-auto mb-4" />
                     <h2 className="text-3xl font-black text-white drop-shadow-md mb-2">{t('upgradePremium')}</h2>
                     <p className="text-white/90 font-medium text-sm px-4">
                        {t('premiumSubtitle')}
                     </p>
                  </div>

                  {/* Plans */}
                  <div className="p-6 space-y-4">
                     {/* 12 Months */}
                     <button
                        onClick={() => setSelectedPremiumPlan('12months')}
                        className={`w-full text-left p-4 rounded-2xl border-2 transition-all relative ${selectedPremiumPlan === '12months' ? 'border-orange-500 bg-orange-50' : (isDarkMode ? 'border-slate-700 hover:border-slate-600' : 'border-gray-200 hover:border-gray-300')}`}
                     >
                        {selectedPremiumPlan === '12months' && (
                           <div className="absolute top-0 right-0 bg-gradient-to-r from-orange-500 to-rose-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-xl rounded-tr-xl">
                              {t('bestValue')}
                           </div>
                        )}
                        <div className="flex justify-between items-center">
                           <div>
                              <h3 className={`font-bold ${isDarkMode && selectedPremiumPlan !== '12months' ? 'text-white' : 'text-gray-900'}`}>{t('yearly')}</h3>
                              <p className={`text-sm ${selectedPremiumPlan === '12months' ? 'text-orange-700' : 'text-gray-500'}`}>{t('billedTotal')} $18.00</p>
                           </div>
                           <div className="text-right">
                              <span className={`text-xl font-black ${selectedPremiumPlan === '12months' ? 'text-orange-600' : (isDarkMode ? 'text-white' : 'text-gray-900')}`}>$1.50</span>
                              <span className={`text-xs font-semibold ${selectedPremiumPlan === '12months' ? 'text-orange-600/70' : 'text-gray-500'}`}>{t('perMonth')}</span>
                           </div>
                        </div>
                     </button>

                     {/* 6 Months */}
                     <button
                        onClick={() => setSelectedPremiumPlan('6months')}
                        className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${selectedPremiumPlan === '6months' ? 'border-orange-500 bg-orange-50' : (isDarkMode ? 'border-slate-700 hover:border-slate-600' : 'border-gray-200 hover:border-gray-300')}`}
                     >
                        <div className="flex justify-between items-center">
                           <div>
                              <h3 className={`font-bold ${isDarkMode && selectedPremiumPlan !== '6months' ? 'text-white' : 'text-gray-900'}`}>{t('sixMonths')}</h3>
                              <p className={`text-sm ${selectedPremiumPlan === '6months' ? 'text-orange-700' : 'text-gray-500'}`}>{t('billedTotal')} $10.80</p>
                           </div>
                           <div className="text-right">
                              <span className={`text-xl font-black ${selectedPremiumPlan === '6months' ? 'text-orange-600' : (isDarkMode ? 'text-white' : 'text-gray-900')}`}>$1.80</span>
                              <span className={`text-xs font-semibold ${selectedPremiumPlan === '6months' ? 'text-orange-600/70' : 'text-gray-500'}`}>{t('perMonth')}</span>
                           </div>
                        </div>
                     </button>

                     {/* Monthly */}
                     <button
                        onClick={() => setSelectedPremiumPlan('monthly')}
                        className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${selectedPremiumPlan === 'monthly' ? 'border-orange-500 bg-orange-50' : (isDarkMode ? 'border-slate-700 hover:border-slate-600' : 'border-gray-200 hover:border-gray-300')}`}
                     >
                        <div className="flex justify-between items-center">
                           <div>
                              <h3 className={`font-bold ${isDarkMode && selectedPremiumPlan !== 'monthly' ? 'text-white' : 'text-gray-900'}`}>{t('monthly')}</h3>
                           </div>
                           <div className="text-right">
                              <span className={`text-xl font-black ${selectedPremiumPlan === 'monthly' ? 'text-orange-600' : (isDarkMode ? 'text-white' : 'text-gray-900')}`}>$2.70</span>
                              <span className={`text-xs font-semibold ${selectedPremiumPlan === 'monthly' ? 'text-orange-600/70' : 'text-gray-500'}`}>{t('perMonth')}</span>
                           </div>
                        </div>
                     </button>

                     <button 
                        onClick={() => {
                           setIsPremium(true);
                           alert('Processing upgrade simulation via App Store / Play Store... Thanks for subscribing! You are now Premium and Ads are disabled.');
                           setShowPremiumModal(false);
                        }}
                        className="w-full mt-6 py-4 bg-gray-900 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-gray-800 hover:-translate-y-0.5 transition-all"
                     >
                        {t('subscribeBtn')}
                     </button>
                     <p className="text-center text-[10px] text-gray-400 mt-3 px-4 leading-tight">
                        Subscriptions auto-renew. Cancel anytime in your device settings. 
                     </p>
                  </div>
               </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* MANUAL EDITOR MODAL */}
      <AnimatePresence>
        {showEditor && (originalImage || processedImage) && (
           <motion.div
              key="editor-modal"
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute inset-0 z-50 md:rounded-3xl overflow-hidden bg-black md:inset-auto md:w-[480px] md:h-[90vh]"
           >
              <EditorCanvas 
                imageSrc={cleanImage || processedImage!} 
                initialPaths={editorPaths}
                initialTexts={editorTexts}
                onCancel={() => setShowEditor(false)}
                onSave={(newImgDataUrl, finalCleanSrc, finalPaths, finalTexts) => {
                   setProcessedImage(newImgDataUrl);
                   setCleanImage(finalCleanSrc);
                   setEditorPaths(finalPaths);
                   setEditorTexts(finalTexts);
                   setShowEditor(false);
                }}
              />
           </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
