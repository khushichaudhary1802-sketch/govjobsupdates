import { Platform } from "react-native";
import { trackEvent } from "./firebase";

const META_PIXEL_ID = process.env["EXPO_PUBLIC_META_PIXEL_ID"] ?? "";

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
  if (document.getElementById("meta-pixel-script")) return;

  const script = document.createElement("noscript");
  script.id = "meta-pixel-script";

  const initScript = document.createElement("script");
  initScript.innerHTML = `
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${META_PIXEL_ID}');
    fbq('track', 'PageView');
  `;
  document.head.appendChild(initScript);
}

if (Platform.OS === "web") {
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
