import React, { useState, useEffect, useRef } from "react";
import { X, Sparkles, Award } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Capacitor } from "@capacitor/core";
import { 
  AdMob, 
  BannerAdSize, 
  BannerAdPosition, 
  AdOptions, 
  BannerAdOptions,
  InterstitialAdPluginEvents,
  AdMobBannerSize
} from "@capacitor-community/admob";

// Check if we are running in a native mobile app environment (like iOS / Android)
export const isNative = Capacitor.isNativePlatform();

// Real Ad IDs provided by user
const BANNER_ID = "ca-app-pub-8582659585800553/2899259565";
const INTERSTITIAL_ID = "ca-app-pub-8582659585800553/8313192172";

// Initialize AdMob
export async function initializeAdMob() {
  if (isNative) {
    try {
      await AdMob.initialize({
        testingDevices: [],
        initializeForTesting: false,
      });
      console.log("AdMob: Native AdMob initialized successfully");
    } catch (e) {
      console.error("AdMob: Failed to initialize native AdMob", e);
    }
  } else {
    console.log("AdMob: Web environment detected. Live ads disabled in preview.");
  }
}

// Simple legacy function to support backward-compatibility
export async function showBannerAd() {
  if (isNative) {
    const options: BannerAdOptions = {
      adId: BANNER_ID,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.TOP_CENTER,
      margin: 0,
    };
    try {
      await AdMob.showBanner(options);
      console.log("AdMob: Native banner shown");
    } catch (e) {
      console.error("AdMob: Failed to show banner", e);
    }
  }
}

export async function hideBannerAd() {
  if (isNative) {
    try {
      await AdMob.hideBanner();
      console.log("AdMob: Native banner hidden");
    } catch (e) {
      console.error("AdMob: Failed to hide banner", e);
    }
  }
}

export async function removeBannerAd() {
  if (isNative) {
    try {
      await AdMob.removeBanner();
    } catch (e) {
      console.error("AdMob: Failed to remove banner", e);
    }
  }
}

export function playRewardedAds(callback: () => void) {
  if (!isNative) {
    callback();
    return;
  }
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
  private isInterstitialLoading = false;

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
    if (this.interactionCount >= 10) {
      this.interactionCount = 0;
      this.showInterstitial(() => {
        if (onTriggerInterstitial) onTriggerInterstitial();
      });
      return true;
    }
    return false;
  }

  async showInterstitial(onClose: () => void) {
    if (!isNative) {
      onClose();
      return;
    }

    if (this.isInterstitialLoading) return;
    this.isInterstitialLoading = true;

    try {
      const options: AdOptions = {
        adId: INTERSTITIAL_ID,
        isTesting: false
      };
      
      await AdMob.prepareInterstitial(options);
      await AdMob.showInterstitial();
      
      this.currentOnClose = onClose;
      this.listeners.forEach((l) => l(true, () => this.handleClose()));
    } catch (e) {
      console.error("AdMob: Failed to show interstitial", e);
      onClose();
    } finally {
      this.isInterstitialLoading = false;
    }
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
// ADMOB BANNER COMPONENT
// -------------------------------------------------------------
interface AdMobBannerProps {
  unitId?: string;
  className?: string;
}

export function AdMobBanner({
  unitId = BANNER_ID,
  className = "",
}: AdMobBannerProps) {
  // HIDDEN IN WEB PREVIEW AS PER USER REQUEST TO STOP "FOOLING" WITH TEST ADS
  if (!isNative) {
    return null;
  }

  useEffect(() => {
    // On native, we show the real AdMob banner which is rendered over the webview
    showBannerAd();
    return () => {
      hideBannerAd();
    };
  }, []);

  return (
    <div className={`w-full min-h-[50px] bg-black ${className}`}>
      {/* 
        This div acts as a placeholder space for the native banner 
        which is rendered on top by the Capacitor plugin.
      */}
    </div>
  );
}

// -------------------------------------------------------------
// ADMOB INTERSTITIAL CONTAINER
// -------------------------------------------------------------
export function AdMobInterstitialContainer() {
  if (!isNative) {
    return null;
  }

  const [visible, setVisible] = useState(false);
  const onDismissRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const unsubscribe = admobManager.subscribe((isVisible, onClose) => {
      setVisible(isVisible);
      if (isVisible) {
        onDismissRef.current = onClose || null;
      }
    });

    let dismissListener: any;
    let failedListener: any;

    const setupListeners = async () => {
      dismissListener = await AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
        if (onDismissRef.current) {
          onDismissRef.current();
        }
        setVisible(false);
      });

      failedListener = await AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, () => {
        if (onDismissRef.current) {
          onDismissRef.current();
        }
        setVisible(false);
      });
    };

    setupListeners();

    return () => {
      unsubscribe();
      if (dismissListener) dismissListener.remove();
      if (failedListener) failedListener.remove();
    };
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 z-[99999] pointer-events-none"
        />
      )}
    </AnimatePresence>
  );
}


