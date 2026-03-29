import { Platform } from "react-native";
import { trackEvent } from "./firebase";

const RAW_PIXEL_ID = process.env["EXPO_PUBLIC_META_PIXEL_ID"] ?? "";
// Only use it if it looks like a valid numeric Meta Pixel ID
const META_PIXEL_ID = /^\d{10,20}$/.test(RAW_PIXEL_ID) ? RAW_PIXEL_ID : "";

function fbq(eventType: "track" | "trackCustom", eventName: string, params?: Record<string, unknown>) {
  if (Platform.OS !== "web") return;
  try {
    const w = window as unknown as { fbq?: (...args: unknown[]) => void };
    if (typeof w.fbq === "function") {
      w.fbq(eventType, eventName, params);
    }
  } catch {
    // Non-fatal
  }
}

function injectMetaPixel() {
  if (Platform.OS !== "web" || !META_PIXEL_ID) return;
  if (document.getElementById("meta-pixel-init")) return; // idempotent guard

  // Exact Meta Pixel base script
  const initScript = document.createElement("script");
  initScript.id = "meta-pixel-init";
  initScript.innerHTML = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${META_PIXEL_ID}');fbq('track','PageView');`;
  document.head.appendChild(initScript);

  // noscript fallback image pixel
  const noscript = document.createElement("noscript");
  const img = document.createElement("img");
  img.height = 1;
  img.width = 1;
  img.style.display = "none";
  img.src = `https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`;
  noscript.appendChild(img);
  document.head.appendChild(noscript);
}

// Inject on module load (web only)
if (Platform.OS === "web" && typeof document !== "undefined") {
  injectMetaPixel();
}

export async function trackAppOpen() {
  await trackEvent("app_open");
  fbq("track", "PageView");
}

export async function trackBuyPremiumClick(plan: "trial" | "monthly") {
  await trackEvent("buy_premium_click", { plan });
  fbq("track", "InitiateCheckout", {
    content_name: `SarkariNaukri ${plan === "trial" ? "Trial" : "Monthly"}`,
    currency: "INR",
    value: plan === "trial" ? 1 : 249,
  });
}

export async function trackBuyPremiumSuccess(params: {
  plan: "trial" | "monthly";
  paymentId: string;
  amount: number;
}) {
  await trackEvent("buy_premium_success", {
    plan: params.plan,
    payment_id: params.paymentId,
    amount: params.amount,
  });
  fbq("track", "Purchase", {
    currency: "INR",
    value: params.amount,
    content_name: `SarkariNaukri ${params.plan === "trial" ? "Trial" : "Monthly"}`,
  });
  fbq("trackCustom", "buy_premium_success", {
    plan: params.plan,
    payment_id: params.paymentId,
  });
}

export async function trackPaymentFailed(plan: "trial" | "monthly") {
  await trackEvent("payment_failed", { plan });
}

export async function trackFeatureUsed(feature: string) {
  await trackEvent("feature_used", { feature });
}
