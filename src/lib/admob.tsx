import React, { useState, useEffect, useRef } from "react";
import { X, Info, ExternalLink, Star, ShieldAlert, Sparkles, Award } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Check if we are running in native environment
export const isNative = false;

// Initialize AdMob (No-op stub for simulation, easily extensible for Capacitor AdMob)
export async function initializeAdMob() {
  console.log("AdMob: Initialized mock AdMob platform module");
}

// Simple legacy function to support backward-compatibility
export function showBannerAd() {
  console.log("AdMob: Show native banner requested");
}

export function hideBannerAd() {
  console.log("AdMob: Hide native banner requested");
}

export function playRewardedAds(callback: () => void) {
  console.log("AdMob: Playing rewarded video ad...");
  admobManager.showInterstitial(callback);
}

// -------------------------------------------------------------
// ADMOB LISTENER & STATE MANAGER (SINGLETON OBSERVER)
// -------------------------------------------------------------
type InterstitialListener = (visible: boolean, onClose?: () => void) => void;

class AdMobManager {
  private interactionCount = 0;
  private listeners: InterstitialListener[] = [];
  private currentOnClose: (() => void) | null = null;

  subscribe(listener: InterstitialListener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  getInteractionCount() {
    return this.interactionCount;
  }

  resetInteractionCount() {
    this.interactionCount = 0;
  }

  incrementInteractions(onTriggerInterstitial?: () => void) {
    this.interactionCount++;
    console.log(`AdMob interactions: ${this.interactionCount}/10`);
    if (this.interactionCount >= 10) {
      this.interactionCount = 0;
      this.showInterstitial(() => {
        if (onTriggerInterstitial) onTriggerInterstitial();
      });
      return true; // triggered interstitial
    }
    return false;
  }

  showInterstitial(onClose: () => void) {
    this.currentOnClose = onClose;
    this.listeners.forEach((l) => l(true, () => this.handleClose()));
  }

  private handleClose() {
    if (this.currentOnClose) {
      const cb = this.currentOnClose;
      this.currentOnClose = null;
      cb();
    }
    this.listeners.forEach((l) => l(false));
  }
}

export const admobManager = new AdMobManager();

// -------------------------------------------------------------
// BEAUTIFUL GOOGLE ADMOB TEST BANNER COMPONENT
// -------------------------------------------------------------
interface AdMobBannerProps {
  unitId?: string;
  className?: string;
}

const SHOWN_MOCK_ADS = [
  {
    title: "Brawl Stars Arena",
    desc: "Epic 3v3 multiplayer shooter! Play with friends worldwide.",
    cta: "INSTALL",
    rating: "4.7",
    tagline: "Sponsored",
    themeColor: "from-amber-500 to-orange-600",
  },
  {
    title: "SnapCraft AI",
    desc: "Remove photo backgrounds automatically in just 0.5s with neural AI models.",
    cta: "TRY NOW",
    rating: "4.9",
    tagline: "Top Free App",
    themeColor: "from-blue-600 to-indigo-700",
  },
  {
    title: "Apex VPN Client",
    desc: "Hyperfast unlimited proxy proxy. Over 100+ locations secure private connection.",
    cta: "SECURE",
    rating: "4.8",
    tagline: "Ad Unit Sponsored",
    themeColor: "from-emerald-600 to-teal-500",
  },
];

export function AdMobBanner({
  unitId = "ca-app-pub-394025609942544/9214589741",
  className = "",
}: AdMobBannerProps) {
  const [adIndex, setAdIndex] = useState(0);

  useEffect(() => {
    // Keep it fresh, change banner ad every 15 seconds
    const interval = setInterval(() => {
      setAdIndex((prev) => (prev + 1) % SHOWN_MOCK_ADS.length);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const activeAd = SHOWN_MOCK_ADS[adIndex];

  return (
    <div
      className={`w-full bg-neutral-900 border-b border-white/10 select-none pb-0 px-2 lg:px-4 py-1.5 overflow-hidden flex flex-col items-center justify-center relative font-sans ${className}`}
    >
      {/* Test Ad Indicator Strip */}
      <div className="w-full flex items-center justify-between text-[9px] text-gray-400 font-mono tracking-tight pb-1 mb-1 border-b border-neutral-800">
        <span className="flex items-center gap-1 text-amber-500">
          <Info className="w-2.5 h-2.5" /> Google Test Banner Ad
        </span>
        <span className="opacity-70 truncate max-w-[200px] md:max-w-none">
          Ad ID: {unitId}
        </span>
      </div>

      {/* Main Banner Body */}
      <div className="w-full max-w-[468px] mx-auto h-[48px] bg-black/45 rounded-lg flex items-center justify-between px-2 py-1 gap-2.5 relative border border-white/5 shadow-inner">
        {/* Ad Badge */}
        <div className="absolute top-1 left-1 px-1 bg-amber-500 text-black font-extrabold text-[7px] leading-none rounded uppercase tracking-wider scale-90">
          Ad
        </div>

        {/* Ad Content */}
        <div className="flex items-center gap-2 overflow-hidden flex-1 pl-4">
          <div className={`w-8 h-8 rounded-md bg-gradient-to-br ${activeAd.themeColor} flex items-center justify-center font-black text-white text-xs select-none shadow shrink-0 border border-white/10`}>
            {activeAd.title[0]}
          </div>
          <div className="flex flex-col overflow-hidden text-left">
            <div className="flex items-center gap-1.5">
              <h4 className="text-white text-[11px] font-bold truncate leading-tight">
                {activeAd.title}
              </h4>
              <span className="text-[9px] text-amber-400 font-bold flex items-center gap-0.5 whitespace-nowrap shrink-0">
                ★ {activeAd.rating}
              </span>
            </div>
            <p className="text-gray-300 text-[10px] leading-tight truncate">
              {activeAd.desc}
            </p>
          </div>
        </div>

        {/* CTA Button */}
        <button
          onClick={() => alert(`Redirecting to Google Play for "${activeAd.title}" test ad click.`)}
          className={`px-3 py-1 bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all text-white font-extrabold text-[10px] tracking-wide rounded-md shrink-0 shadow-lg shadow-blue-900/30 font-sans cursor-pointer`}
        >
          {activeAd.cta}
        </button>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// FULL-SCREEN PREMIUM INTERACTIVE ADMOB INTERSTITIAL AD OVERLAY
// -------------------------------------------------------------
export function AdMobInterstitialContainer() {
  const [visible, setVisible] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [canClose, setCanClose] = useState(false);
  const [adInstance, setAdInstance] = useState(0);
  const onDismissRef = useRef<(() => void) | null>(null);

  // Define some rich full-screen interstitial campaigns!
  const campaigns = [
    {
      title: "Clash Master 3D",
      developer: "SuperPlay Interactive",
      downloads: "50M+",
      rating: "4.8",
      cta: "INSTALL FREE NOW",
      desc: "Assemble the ultimate army, customize powerful heroes, and dominate in strategic PvP war arenas! Join millions of players online today.",
      image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=800",
      theme: "from-violet-950 via-slate-900 to-indigo-950",
      primaryAccent: "bg-violet-600 hover:bg-violet-500 text-white",
      highlightIcon: <Sparkles className="w-5 h-5 text-violet-400 animate-bounce" />,
    },
    {
      title: "Neon Horizon: Outrun",
      developer: "RetroPulse Studios",
      downloads: "10M+",
      rating: "4.9",
      cta: "RACE & COMPETE",
      desc: "Super charged synthwave high-octane cyber race! Drift past beautiful sunset vistas, collect retro tokens, and upgrade your customized hypercars.",
      image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=800",
      theme: "from-pink-950 via-neutral-900 to-fuchsia-950",
      primaryAccent: "bg-fuchsia-600 hover:bg-fuchsia-500 text-white",
      highlightIcon: <Award className="w-5 h-5 text-fuchsia-400 animate-pulse" />,
    },
  ];

  const currentCampaign = campaigns[adInstance % campaigns.length];

  useEffect(() => {
    const unsubscribe = admobManager.subscribe((isVisible, onClose) => {
      setVisible(isVisible);
      if (isVisible) {
        setCountdown(5);
        setCanClose(false);
        setAdInstance((prev) => prev + 1);
        onDismissRef.current = onClose || null;
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!visible) return;
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setCanClose(true);
    }
  }, [visible, countdown]);

  const handleCloseAd = () => {
    if (onDismissRef.current) {
      onDismissRef.current();
    }
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/95 z-[99999] flex flex-col items-center justify-center font-sans select-none overflow-hidden"
        >
          {/* Ad Header Bar */}
          <div className="absolute top-0 left-0 right-0 h-14 bg-black/40 backdrop-blur px-4 flex items-center justify-between text-white border-b border-white/5 z-50">
            <div className="flex items-center gap-2">
              <span className="bg-amber-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded leading-none uppercase tracking-wider">
                Ad
              </span>
              <span className="text-[11px] text-gray-300 font-mono">
                Google Interstitial Test Ad | ID: ca-app-pub-394025609942544/1033173712
              </span>
            </div>

            {/* Countdown or Close Button */}
            <div>
              {canClose ? (
                <button
                  onClick={handleCloseAd}
                  className="px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 active:scale-95 transition-all text-white text-xs font-bold rounded-full flex items-center gap-1 border border-white/10 shadow-lg cursor-pointer"
                >
                  Close <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <div className="px-3.5 py-1.5 bg-neutral-900 text-gray-300 text-xs font-medium rounded-full border border-white/5">
                  Reward in <span className="font-bold text-amber-400 font-mono">{countdown}</span>s
                </div>
              )}
            </div>
          </div>

          {/* Ad Campaign Canvas Panel */}
          <div className={`w-full h-full bg-gradient-to-b ${currentCampaign.theme} pt-16 pb-safe flex flex-col justify-between items-center text-center p-6 relative gap-4`}>
            
            {/* Background artwork decorative glow */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-blue-500/15 blur-[80px] pointer-events-none" />

            {/* Brand Logo & Name */}
            <div className="flex flex-col items-center mt-6 gap-2">
              <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3/1 text-center font-bold font-mono tracking-widest uppercase rounded-full py-1">
                {currentCampaign.highlightIcon}
                <span>RECOMMENDED GAME</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight mt-1">
                {currentCampaign.title}
              </h1>
              <p className="text-sm text-gray-400">
                by {currentCampaign.developer} • {currentCampaign.downloads} downloads
              </p>
            </div>

            {/* Simulated Dynamic Game Graphics Trailer/Illustration */}
            <div className="w-full max-w-[320px] aspect-video rounded-2xl overflow-hidden shadow-2xl shadow-black/80 border border-white/15 relative group">
              <img
                src={currentCampaign.image}
                alt="App Spotlight"
                className="w-full h-full object-cover group-hover:scale-105 transition-all duration-[8000ms]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center text-left">
                <div>
                  <p className="text-[10px] text-gray-300 uppercase font-black tracking-wider">Gameplay Action</p>
                  <p className="text-xs text-white font-bold">Ultra Realistic 60FPS Physics</p>
                </div>
                <div className="flex items-center gap-0.5 text-amber-400 text-xs font-bold bg-black/60 px-2 py-0.5 rounded-md">
                  ★ {currentCampaign.rating}
                </div>
              </div>
            </div>

            {/* Game Long Description & Stats card */}
            <div className="w-full max-w-[420px] bg-black/55 backdrop-blur-md rounded-2xl p-5 border border-white/10 shadow-xl flex flex-col items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Verified Safe via Play Protect
              </div>
              <p className="text-xs text-gray-200 leading-relaxed text-center px-2">
                "{currentCampaign.desc}"
              </p>
              
              <div className="w-full grid grid-cols-3 gap-2 border-t border-white/10 pt-3 mt-1 text-[10px] font-medium text-gray-400">
                <div className="flex flex-col items-center">
                  <span className="text-white font-bold text-sm">#1 Top</span>
                  <span>Arcade Category</span>
                </div>
                <div className="flex flex-col items-center border-x border-white/10">
                  <span className="text-white font-bold text-sm">4.8 ★</span>
                  <span>Out of 1.2M Reviews</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-emerald-400 font-bold text-sm">FREE</span>
                  <span>Ad Supported Play</span>
                </div>
              </div>
            </div>

            {/* Install Call to Action Area */}
            <div className="w-full max-w-[340px] flex flex-col gap-2 pb-6 z-10">
              <button
                onClick={() => alert(`Redirecting mock install flow for: "${currentCampaign.title}"`)}
                className={`w-full py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider text-center cursor-pointer transform hover:scale-[1.02] active:scale-[0.98] transition-all bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2`}
              >
                {currentCampaign.cta} <ExternalLink className="w-4 h-4 ml-1" />
              </button>
              <span className="text-[10px] text-gray-500 font-mono tracking-tight text-center">
                Interactive Google Test Ad experience. Closes to trigger callback.
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
