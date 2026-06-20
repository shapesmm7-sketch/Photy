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

let bannerStatus: "none" | "created" = "none";

// Simple legacy function to support backward-compatibility
export async function showBannerAd() {
  if (isNative) {
    try {
      if (bannerStatus === "created") {
        await AdMob.resumeBanner();
        console.log("AdMob: Native banner resumed");
      } else {
        const options: BannerAdOptions = {
          adId: BANNER_ID,
          adSize: BannerAdSize.ADAPTIVE_BANNER,
          position: BannerAdPosition.TOP_CENTER,
          margin: 0,
        };
        await AdMob.showBanner(options);
        bannerStatus = "created";
        console.log("AdMob: Native banner shown");
      }
    } catch (e) {
      console.error("AdMob: Failed to show/resume banner", e);
      // Try to recreate if it failed
      try {
        const options: BannerAdOptions = {
          adId: BANNER_ID,
          adSize: BannerAdSize.ADAPTIVE_BANNER,
          position: BannerAdPosition.TOP_CENTER,
          margin: 0,
        };
        await AdMob.showBanner(options);
        bannerStatus = "created";
      } catch (err) {
        console.error("AdMob: Recovery failed", err);
      }
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
  private isListenerSetup = false;
  private isAdReady = false;
  private safetyTimeoutRef: any = null;

  async setupListeners() {
    if (!isNative || this.isListenerSetup) return;
    this.isListenerSetup = true;
    try {
      await AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
        console.log("AdMob: Interstitial dismissed event");
        this.handleClose();
      });
      await AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, () => {
        console.log("AdMob: Interstitial failed to load event");
        this.handleClose();
      });
      const failedToShowEvent = (InterstitialAdPluginEvents as any).FailedToShow || "interstitialAdFailedToShow";
      await AdMob.addListener(failedToShowEvent, () => {
        console.log("AdMob: Interstitial failed to show event");
        this.handleClose();
      });
    } catch (e) {
      console.error("AdMob: Failed to register native listeners", e);
    }
  }

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

  async preloadInterstitial() {
    if (!isNative) return;
    if (this.isInterstitialLoading || this.isAdReady) return;
    
    this.isInterstitialLoading = true;
    await this.setupListeners();
    
    try {
      console.log("AdMob: Starting background preloading of Interstitial...");
      const options: AdOptions = {
        adId: INTERSTITIAL_ID,
        isTesting: false
      };
      
      const preloadPromise = AdMob.prepareInterstitial(options);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Preload timeout")), 6000)
      );

      await Promise.race([preloadPromise, timeoutPromise]);
      this.isAdReady = true;
      console.log("AdMob: Interstitial preloaded successfully and ready to show instantly");
    } catch (e) {
      console.error("AdMob: Failed to preload interstitial", e);
      this.isAdReady = false;
    } finally {
      this.isInterstitialLoading = false;
    }
  }

  incrementInteractions(onTriggerInterstitial?: () => void) {
    this.interactionCount++;
    
    // Periodically make sure an ad is loaded when interaction count is close to threshold
    if (this.interactionCount >= 6) {
      this.preloadInterstitial();
    }

    if (this.interactionCount >= 15) {
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

    if (this.safetyTimeoutRef) {
      clearTimeout(this.safetyTimeoutRef);
    }

    this.currentOnClose = onClose;

    // Safety timeout: if the ad sequence gets stuck or native window remains black,
    // we MUST resume/unfreeze the app after 5 seconds of no dismiss event.
    this.safetyTimeoutRef = setTimeout(() => {
      console.warn("AdMob: Interstitial show safety timeout triggered!");
      this.handleClose();
    }, 5000);

    try {
      await this.setupListeners();

      if (!this.isAdReady) {
        console.log("AdMob: Ad not preloaded. Preparing now with short timeout...");
        const options: AdOptions = {
          adId: INTERSTITIAL_ID,
          isTesting: false
        };
        
        const preparePromise = AdMob.prepareInterstitial(options);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Sync prepare timeout")), 1500)
        );
        await Promise.race([preparePromise, timeoutPromise]);
        this.isAdReady = true;
      }

      console.log("AdMob: Showing interstitial now...");
      await AdMob.showInterstitial();
      this.isAdReady = false; // Consumed
      
      // AD SUCCESSFULLY SHOWING!
      // Clear the timeout so we don't interrupt the user while they watch the ad
      // or trigger another preload while this ad is playing.
      if (this.safetyTimeoutRef) {
        clearTimeout(this.safetyTimeoutRef);
        this.safetyTimeoutRef = null;
      }
      
      this.listeners.forEach((l) => l(false, () => this.handleClose()));
    } catch (e) {
      console.error("AdMob: Failed in showInterstitial sequence", e);
      this.handleClose();
    }
  }

  private handleClose() {
    if (this.safetyTimeoutRef) {
      clearTimeout(this.safetyTimeoutRef);
      this.safetyTimeoutRef = null;
    }

    if (this.currentOnClose) {
      const cb = this.currentOnClose;
      this.currentOnClose = null;
      // Delay callback execution to allow Capacitor Activity to fully resume.
      // Calling native Capacitor plugins immediately after ad dismissal can fail
      // because the main Activity might not be fully active yet.
      setTimeout(() => {
        cb();
      }, 750);
    }
    this.listeners.forEach((l) => l(false));

    // Preload again in background after a short delay so the next ad is ready in advance
    setTimeout(() => {
      this.preloadInterstitial();
    }, 1500);
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

let activeBannerCount = 0;

export function AdMobBanner({
  unitId = BANNER_ID,
  className = "",
}: AdMobBannerProps) {
  // HIDDEN IN WEB PREVIEW
  if (!isNative) {
    return null;
  }

  useEffect(() => {
    activeBannerCount++;
    showBannerAd();
    return () => {
      activeBannerCount--;
      if (activeBannerCount <= 0) {
        hideBannerAd();
      }
    };
  }, []);

  return null;
}

// -------------------------------------------------------------
// ADMOB INTERSTITIAL CONTAINER
// -------------------------------------------------------------
export function AdMobInterstitialContainer() {
  return null;
}


