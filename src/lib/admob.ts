import { AdMob, BannerAdSize, BannerAdPosition, RewardAdPluginEvents } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

export const isNative = Capacitor.isNativePlatform();

let isAdMobInitialized = false;

export async function initializeAdMob() {
  if (!isNative) return;
  if (isAdMobInitialized) return;
  
  try {
    await AdMob.initialize({
      requestTrackingAuthorization: true,
      initializeForTesting: true,
    });
    isAdMobInitialized = true;
  } catch (error) {
    console.error("AdMob initialization failed", error);
  }
}

export async function showBannerAd() {
  if (!isNative) return;
  try {
    await AdMob.showBanner({
      adId: 'ca-app-pub-3940256099942544/6300978111', // Google Test AdUnit
      adSize: BannerAdSize.BANNER,
      position: BannerAdPosition.TOP_CENTER,
      margin: 0,
      isTesting: true,
    });
  } catch (error) {
    console.error("AdMob showBanner failed", error);
  }
}

export async function hideBannerAd() {
  if (!isNative) return;
  try {
    await AdMob.hideBanner();
  } catch (error) {
    console.error("AdMob hideBanner failed", error);
  }
}

export async function playRewardedAds(onComplete: () => void) {
  if (!isNative) {
    console.log("Mock AdMob: Simulating rewarded ad completion because environment is web.");
    onComplete();
    return;
  }

  let watchedCount = 0;

  const showNextAd = async () => {
    try {
      const listener = AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
        watchedCount++;
        listener.remove();
        
        if (watchedCount < 2) {
           if (confirm(`1 / 2 Ads Watched. Watch the next ad to unlock?`)) {
              showNextAd();
           }
        } else {
           onComplete();
        }
      });

      await AdMob.prepareRewardVideoAd({
        adId: 'ca-app-pub-3940256099942544/5224354917', // Google Test AdUnit
        isTesting: true,
      });

      await AdMob.showRewardVideoAd();
    } catch (error) {
      console.error("AdMob rewarded video failed", error);
      // Fallback for test issues: let user skip if ads are broken
      if (confirm("Ad failed to load. Grant access anyway (Dev Mode)?")) {
        onComplete();
      }
    }
  };

  showNextAd();
}
