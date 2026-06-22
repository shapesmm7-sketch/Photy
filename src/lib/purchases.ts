import { NativePurchases, PURCHASE_TYPE } from '@capgo/native-purchases';
import { Capacitor } from '@capacitor/core';

export const PRODUCT_IDS = {
  monthly: "photy_premium_monthly",
  "6months": "photy_premium_6_months",
  "12months": "photy_premium_yearly"
};

// Base plans usually default to the following if created generically,
// adjust if they differ in your play console.
export const BASE_PLANS = {
  monthly: "monthly-base",
  "6months": "6-months-base", 
  "12months": "yearly-base"
};

export const initializePurchases = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      const { isBillingSupported } = await NativePurchases.isBillingSupported();
      if (!isBillingSupported) {
        console.warn("Native purchases are not supported on this device.");
      }
    } catch (e) {
      console.warn("Failed to initialize billing", e);
    }
  } else {
    console.log("Mock Payments Initialized");
  }
};

export const checkPremiumStatus = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) return false;
  
  try {
    const { purchases } = await NativePurchases.getPurchases({
      productType: PURCHASE_TYPE.SUBS
    });
    
    // Check if any is valid
    return purchases.some(p => {
       if (Capacitor.getPlatform() === 'android') {
          return p.purchaseState === 'PURCHASED' && p.isAcknowledged === true;
       } else {
          return p.isActive === true || (p.expirationDate && new Date(p.expirationDate) > new Date());
       }
    });
  } catch (error) {
    console.warn("Failed to check premium status:", error);
    return false;
  }
};

export const purchasePremium = async (plan: "monthly" | "6months" | "12months"): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) {
    console.log("Mock purchase for plan:", plan, "Product ID:", PRODUCT_IDS[plan]);
    alert("Running in Web Preview: Simulating successful purchase. On Android this should open Google Play Billing.");
    return true;
  }

  try {
    const isAndroid = Capacitor.getPlatform() === 'android';
    
    // First confirm we can get the product
    const { products } = await NativePurchases.getProducts({
      productIdentifiers: [PRODUCT_IDS[plan]],
      productType: PURCHASE_TYPE.SUBS
    });
    
    if (products.length === 0) {
      console.warn("Could not find product details from the store.");
      // We will still try to purchase but it's risky
    }
    
    const result = await NativePurchases.purchaseProduct({
      productIdentifier: PRODUCT_IDS[plan],
      productType: PURCHASE_TYPE.SUBS,
      // For android, Google Play Billing requires planIdentifier.
      planIdentifier: isAndroid ? BASE_PLANS[plan] : undefined,
      quantity: 1
    });
    
    console.log("Purchase successful", result.transactionId);
    return true;
  } catch (error: any) {
    console.error("Purchase failed:", error);
    if (error?.message?.includes("planIdentifier")) {
       alert("Configuration mismatch: The base plan ID in code does not match Google Play Console setup. Make sure the Base Plan ID is set to " + BASE_PLANS[plan]);
    }
    return false;
  }
};

export const restorePurchases = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) {
    console.log("Mock restore purchases");
    return true;
  }
  
  try {
    await NativePurchases.restorePurchases();
    // Re-check premium status after restoring
    return await checkPremiumStatus();
  } catch (error) {
    console.error("Failed to restore purchases:", error);
    return false;
  }
};
