export const PRODUCT_IDS = {
  monthly: "photy_premium_monthly",
  "6months": "photy_premium_6_months",
  "12months": "photy_premium_yearly"
};

export const initializePurchases = async () => {
  console.log("Mock Payments Initialized");
};

export const checkPremiumStatus = async (): Promise<boolean> => {
  return false;
};

export const purchasePremium = async (plan: "monthly" | "6months" | "12months"): Promise<boolean> => {
  console.log("Mock purchase for plan:", plan, "Product ID:", PRODUCT_IDS[plan]);
  // Returning true will simulate a successful purchase
  return true;
};

export const restorePurchases = async (): Promise<boolean> => {
  console.log("Mock restore purchases");
  return false;
};
