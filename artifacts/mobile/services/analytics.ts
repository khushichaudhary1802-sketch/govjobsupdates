import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { trackEvent } from "./firebase";

const RAW_PIXEL_ID = process.env["EXPO_PUBLIC_META_PIXEL_ID"] ?? "";
const META_PIXEL_ID = /^\d{10,20}$/.test(RAW_PIXEL_ID) ? RAW_PIXEL_ID : "";

const FIRST_OPEN_KEY = "@sarkari_first_open_fired";

// ---------------------------------------------------------------------------
// Internal fbq wrapper
// ---------------------------------------------------------------------------
function fbq(
  eventType: "track" | "trackCustom",
  eventName: string,
  params?: Record<string, unknown>,
  options?: { eventID?: string }
) {
  if (Platform.OS !== "web") return;
  try {
    const w = window as unknown as { fbq?: (...args: unknown[]) => void };
    if (typeof w.fbq === "function") {
      if (options?.eventID) {
        w.fbq(eventType, eventName, params ?? {}, { eventID: options.eventID });
      } else {
        w.fbq(eventType, eventName, params ?? {});
      }
    }
  } catch {
    // non-fatal
  }
}

// ---------------------------------------------------------------------------
// Pixel injection
// ---------------------------------------------------------------------------
function injectMetaPixel() {
  if (Platform.OS !== "web" || !META_PIXEL_ID) return;
  if (document.getElementById("meta-pixel-init")) return;

  const initScript = document.createElement("script");
  initScript.id = "meta-pixel-init";
  initScript.innerHTML = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${META_PIXEL_ID}');fbq('track','PageView');`;
  document.head.appendChild(initScript);

  const noscript = document.createElement("noscript");
  const img = document.createElement("img");
  img.height = 1;
  img.width = 1;
  img.style.display = "none";
  img.src = `https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`;
  noscript.appendChild(img);
  document.head.appendChild(noscript);
}

if (Platform.OS === "web" && typeof document !== "undefined") {
  injectMetaPixel();
}

// ===========================================================================
// 🔥 GOOGLE ADS CONVERSION EVENTS
// These three events are linked in Firebase → Google Ads as conversions.
// ===========================================================================

/**
 * FIRST_APP_OPEN
 * Fires ONCE per install. Google Ads uses this to measure new user acquisition.
 * Call from the root layout on every app start — the AsyncStorage guard
 * ensures Firebase only receives this once.
 */
export async function trackFirstAppOpen(): Promise<void> {
  try {
    const alreadyFired = await AsyncStorage.getItem(FIRST_OPEN_KEY);
    if (alreadyFired === "1") return;

    // Fire before marking — if Firebase fails, we try again next time
    await trackEvent("first_open", {
      engagement_time_msec: 1,
    });

    // Also fire our custom name so you can use either in Google Ads
    await trackEvent("first_app_open", {
      platform: Platform.OS,
    });

    fbq("trackCustom", "FirstAppOpen");

    await AsyncStorage.setItem(FIRST_OPEN_KEY, "1");
  } catch {
    // Non-fatal
  }
}

/**
 * IN_APP_PURCHASE_INITIATED
 * Fires when the user taps "Start Trial" — before the Razorpay sheet opens.
 * Google Ads uses this to measure intent and optimize top-of-funnel targeting.
 */
export async function trackInAppPurchaseInitiated(params: {
  plan: "trial" | "monthly";
  value: number;
  currency?: string;
}): Promise<void> {
  const currency = params.currency ?? "INR";
  const itemName =
    params.plan === "trial"
      ? "GovJobAlert 3-Day Trial"
      : "GovJobAlert Monthly";

  await trackEvent("in_app_purchase_initiated", {
    item_id: params.plan === "trial" ? "trial_1_inr" : "monthly_249_inr",
    item_name: itemName,
    currency,
    value: params.value,
  });

  // Standard Google Analytics ecommerce event — Google Ads can import this
  await trackEvent("begin_checkout", {
    currency,
    value: params.value,
    item_id: params.plan === "trial" ? "trial_1_inr" : "monthly_249_inr",
    item_name: itemName,
  });

  // Meta Pixel
  fbq("track", "InitiateCheckout", {
    content_name: itemName,
    content_ids: [params.plan === "trial" ? "trial_1_inr" : "monthly_249_inr"],
    content_type: "product",
    num_items: 1,
    currency,
    value: params.value,
  });
}

/**
 * IN_APP_PURCHASE_SUCCESS
 * Fires after Razorpay confirms payment. This is the primary Google Ads
 * conversion event — import it into Google Ads as a "Purchase" conversion.
 * Uses `transaction_id` for deduplication so the same payment is never counted twice.
 */
export async function trackInAppPurchaseSuccess(params: {
  plan: "trial" | "monthly";
  transactionId: string;
  value: number;
  orderId?: string;
  currency?: string;
}): Promise<void> {
  const currency = params.currency ?? "INR";
  const itemName =
    params.plan === "trial"
      ? "GovJobAlert 3-Day Trial"
      : "GovJobAlert Monthly";

  // ── Primary Google Ads conversion event ────────────────────────────────────
  await trackEvent("in_app_purchase_success", {
    transaction_id: params.transactionId,
    value: params.value,
    currency,
    item_id: params.plan === "trial" ? "trial_1_inr" : "monthly_249_inr",
    item_name: itemName,
    plan: params.plan,
  });

  // ── Standard GA4 `purchase` event (Google Ads can import this too) ─────────
  await trackEvent("purchase", {
    transaction_id: params.transactionId,
    value: params.value,
    currency,
    affiliation: "Razorpay",
    item_id: params.plan === "trial" ? "trial_1_inr" : "monthly_249_inr",
    item_name: itemName,
    quantity: 1,
    price: params.value,
  });

  // ── Meta Pixel ─────────────────────────────────────────────────────────────
  fbq(
    "track",
    "Purchase",
    {
      currency,
      value: params.value,
      content_name: itemName,
      content_ids: [params.plan === "trial" ? "trial_1_inr" : "monthly_249_inr"],
      content_type: "product",
      num_items: 1,
      order_id: params.orderId ?? "",
    },
    { eventID: params.transactionId }
  );

  fbq(
    "trackCustom",
    "Subscribe",
    {
      plan: params.plan,
      currency,
      value: params.value,
      payment_id: params.transactionId,
    },
    { eventID: `sub_${params.transactionId}` }
  );
}

// ===========================================================================
// Legacy / supporting events (kept for backward compat)
// ===========================================================================

export async function trackAppOpen() {
  await trackEvent("app_open");
}

/** @deprecated Use trackInAppPurchaseInitiated */
export async function trackBuyPremiumClick(plan: "trial" | "monthly") {
  return trackInAppPurchaseInitiated({
    plan,
    value: plan === "trial" ? 1 : 249,
  });
}

/** @deprecated Use trackInAppPurchaseSuccess */
export async function trackBuyPremiumSuccess(params: {
  plan: "trial" | "monthly";
  paymentId: string;
  amount: number;
  orderId?: string;
}) {
  return trackInAppPurchaseSuccess({
    plan: params.plan,
    transactionId: params.paymentId,
    value: params.amount,
    orderId: params.orderId,
  });
}

export async function trackPaymentFailed(plan: "trial" | "monthly") {
  await trackEvent("payment_failed", { plan });
  fbq("trackCustom", "PaymentFailed", { plan });
}

export async function trackFeatureUsed(feature: string) {
  await trackEvent("feature_used", { feature });
}
