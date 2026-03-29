import { Platform } from "react-native";
import { trackEvent } from "./firebase";

const RAW_PIXEL_ID = process.env["EXPO_PUBLIC_META_PIXEL_ID"] ?? "";
// Guard: only activate if value is a valid numeric Meta Pixel ID
const META_PIXEL_ID = /^\d{10,20}$/.test(RAW_PIXEL_ID) ? RAW_PIXEL_ID : "";

// ---------------------------------------------------------------------------
// Internal fbq wrapper — queues safely even before fbevents.js loads
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
    // Non-fatal
  }
}

// ---------------------------------------------------------------------------
// Pixel injection — called once on module load
// ---------------------------------------------------------------------------
function injectMetaPixel() {
  if (Platform.OS !== "web" || !META_PIXEL_ID) return;
  if (document.getElementById("meta-pixel-init")) return; // idempotent

  const initScript = document.createElement("script");
  initScript.id = "meta-pixel-init";
  // Exact Meta Pixel snippet — only the init + PageView; we fire other events manually
  initScript.innerHTML = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${META_PIXEL_ID}');fbq('track','PageView');`;
  document.head.appendChild(initScript);

  // noscript fallback for browsers with JS disabled
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

// ---------------------------------------------------------------------------
// Public tracking functions
// ---------------------------------------------------------------------------

/** App opened — fires PageView (pixel already fires one on init; this covers re-opens) */
export async function trackAppOpen() {
  await trackEvent("app_open");
  // PageView already fired by pixel init; only re-fire on subsequent navigations
}

/** User tapped the subscribe / start-trial button */
export async function trackBuyPremiumClick(plan: "trial" | "monthly") {
  await trackEvent("buy_premium_click", { plan });
  fbq("track", "InitiateCheckout", {
    content_name: plan === "trial" ? "SarkariNaukri Trial" : "SarkariNaukri Monthly",
    content_ids: [plan === "trial" ? "sn_trial_1d" : "sn_monthly"],
    content_type: "product",
    num_items: 1,
    currency: "INR",
    value: plan === "trial" ? 1 : 249,
  });
}

/**
 * Payment completed successfully.
 * Fires the Meta standard `Purchase` event with full parameters,
 * plus a custom `Subscribe` event for subscription tracking.
 * Uses `transaction_id` (= Razorpay payment_id) for server-side deduplication.
 */
export async function trackBuyPremiumSuccess(params: {
  plan: "trial" | "monthly";
  paymentId: string;
  amount: number;
  orderId?: string;
}) {
  // Firebase Analytics
  await trackEvent("buy_premium_success", {
    plan: params.plan,
    payment_id: params.paymentId,
    order_id: params.orderId ?? "",
    amount: params.amount,
  });

  // ── Meta Pixel: standard Purchase event ────────────────────────────────
  fbq(
    "track",
    "Purchase",
    {
      currency: "INR",
      value: params.amount,                       // ₹ value (1 or 249)
      content_name:
        params.plan === "trial"
          ? "SarkariNaukri 1-Day Trial"
          : "SarkariNaukri Monthly Subscription",
      content_ids: [params.plan === "trial" ? "sn_trial_1d" : "sn_monthly"],
      content_type: "product",
      num_items: 1,
      order_id: params.orderId ?? "",
    },
    { eventID: params.paymentId }               // deduplication ID
  );

  // ── Meta Pixel: Subscribe custom event ─────────────────────────────────
  fbq(
    "trackCustom",
    "Subscribe",
    {
      plan: params.plan,
      currency: "INR",
      value: params.amount,
      payment_id: params.paymentId,
      order_id: params.orderId ?? "",
    },
    { eventID: `sub_${params.paymentId}` }
  );
}

/** Payment attempt failed or was abandoned */
export async function trackPaymentFailed(plan: "trial" | "monthly") {
  await trackEvent("payment_failed", { plan });
  fbq("trackCustom", "PaymentFailed", { plan });
}

/** Generic feature usage tracking */
export async function trackFeatureUsed(feature: string) {
  await trackEvent("feature_used", { feature });
}
