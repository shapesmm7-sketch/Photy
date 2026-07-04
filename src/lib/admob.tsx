import { Capacitor } from '@capacitor/core';
import { isNative } from './isNative';
import React, { useEffect, useState } from 'react';
import { AdMob, BannerAdOptions, BannerAdSize, BannerAdPosition, RewardAdPluginEvents, InterstitialAdPluginEvents } from '@capacitor-community/admob';

// Real AdMob IDs provided by the user (only active on native Android)
const bannerAdId = Capacitor.getPlatform() === 'ios'
  ? 'ca-app-pub-3940256099942544/2934735716'
  : 'ca-app-pub-8582659585800553/2899259565';

const interstitialAdId = Capacitor.getPlatform() === 'ios'
  ? 'ca-app-pub-3940256099942544/4411468910'
  : 'ca-app-pub-8582659585800553/8313192172';

const rewardedAdId = Capacitor.getPlatform() === 'ios'
  ? 'ca-app-pub-3940256099942544/1712485313'
  : 'ca-app-pub-3940256099942544/5224354917';

// Determine if we should run in testing mode (disabled to use live AdMob IDs provided by the user)
const isTestingMode = () => {
  return false;
};

let _isPremium = false;
let isAdActive = false;

export const setAdMobPremium = (premium: boolean) => {
  _isPremium = premium;
  if (premium) {
    hideBannerAd().catch(console.error);
  }
};

export const initializeAdMob = async () => {
  if (!isNative) return;
  try {
    await AdMob.initialize();
  } catch (e) {
    console.error('Failed to initialize AdMob', e);
  }
};

export const showBannerAd = async () => {
  if (!isNative || _isPremium) return;
  // Android natively hosts the banner inside a LinearLayout to prevent jumping when keyboard opens
  if (Capacitor.getPlatform() === 'android') return;
  
  try {
    const options: BannerAdOptions = {
      adId: bannerAdId,
      adSize: BannerAdSize.BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: 0,
      isTesting: isTestingMode(),
    };
    await AdMob.showBanner(options);
  } catch (e) {
    console.error('Failed to show banner', e);
  }
};

export const hideBannerAd = async () => {
  if (!isNative) return;
  if (Capacitor.getPlatform() === 'android') return; // Cannot hide native XML banner yet
  try {
    await AdMob.hideBanner();
  } catch (e) {
    console.error('Failed to hide banner', e);
  }
};

let rewardCallback: (() => void) | null = null;
if (isNative) {
  AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
    if (rewardCallback) rewardCallback();
    rewardCallback = null;
  });
  AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
    if (rewardCallback) {
      rewardCallback();
      rewardCallback = null;
    }
  });
  AdMob.addListener(RewardAdPluginEvents.FailedToLoad, () => {
    if (rewardCallback) rewardCallback();
    rewardCallback = null;
  });
}

export const playRewardedAds = async (onSuccess: () => void) => {
  if (!isNative || _isPremium) {
    onSuccess();
    return;
  }
  if (isAdActive) {
    onSuccess();
    return;
  }
  isAdActive = true;
  try {
    rewardCallback = () => {
      isAdActive = false;
      onSuccess();
    };
    await AdMob.prepareRewardVideoAd({
      adId: rewardedAdId,
      isTesting: isTestingMode(),
    });
    await AdMob.showRewardVideoAd();
  } catch (e) {
    console.error('Failed to play rewarded ad', e);
    isAdActive = false;
    onSuccess(); // fallback
  }
};

let interstitialInteractions = 0;
const INTERSTITIAL_INTERVAL = 15; // Popup an ad every 15 clicks/interactions inside the app

export const admobManager = {
  preloadInterstitial: async () => {
    if (!isNative || _isPremium) return;
    try {
      await AdMob.prepareInterstitial({
        adId: interstitialAdId,
        isTesting: isTestingMode(),
      });
    } catch (e) {
      console.error('Failed to prepare interstitial', e);
    }
  },
  incrementInteractions: async () => {
    if (!isNative || _isPremium || isAdActive) return;
    interstitialInteractions++;
    if (interstitialInteractions >= INTERSTITIAL_INTERVAL) {
      interstitialInteractions = 0;
      try {
        isAdActive = true;

        const dismissListener = await AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
          isAdActive = false;
          dismissListener.remove();
        });

        const failedListener = await AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, () => {
          isAdActive = false;
          failedListener.remove();
        });

        await AdMob.showInterstitial();
        // After showing, prepare the next one
        await admobManager.preloadInterstitial();
      } catch (e) {
        console.error('Failed to show interstitial', e);
        isAdActive = false;
      }
    }
  },
  showInterstitialBeforeAction: async (action: () => void | Promise<void>) => {
    if (!isNative || _isPremium) {
      await action();
      return;
    }

    if (isAdActive) {
      // If an ad is already actively showing, just run the action directly to avoid freezing or duplicate calling
      await action();
      return;
    }

    isAdActive = true;
    let completed = false;
    const runActionOnce = async () => {
      if (completed) return;
      completed = true;
      isAdActive = false;
      await action();
    };

    // Listeners to resume after interstitial dismissal or failure
    const dismissListener = await AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
      runActionOnce();
      dismissListener.remove();
    });

    const failedListener = await AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, () => {
      runActionOnce();
      failedListener.remove();
    });

    try {
      await AdMob.showInterstitial();
      // Preload next one
      setTimeout(() => {
        admobManager.preloadInterstitial().catch(console.error);
      }, 1000);
    } catch (e) {
      console.error('Failed to show interstitial, executing action directly:', e);
      runActionOnce();
    }

    // Safety fallback: increased to 60 seconds so it never interrupts or overlaps with live ad playback
    setTimeout(() => {
      runActionOnce();
      try { dismissListener.remove(); } catch {}
      try { failedListener.remove(); } catch {}
    }, 60000);
  }
};

// This component reserves space for the banner ad so it doesn't overlap content
export const AdMobBanner: React.FC<{ className?: string }> = ({ className }) => {
  if (Capacitor.getPlatform() === 'android') {
    return null; // Android uses native LinearLayout which automatically constrains the WebView
  }
  return (
    <div 
      className={`w-full shrink-0 flex items-center justify-center bg-gray-100 dark:bg-zinc-800 border-t border-gray-200 dark:border-zinc-700 ${className || ''}`}
      style={{
        height: 'calc(50px + env(safe-area-inset-bottom))',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Empty space reserved for banner */}
    </div>
  );
};

export const AdMobInterstitialContainer: React.FC = () => {
  return null;
};
