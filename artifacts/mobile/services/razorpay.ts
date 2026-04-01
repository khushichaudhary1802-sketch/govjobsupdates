import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";

// ---------------------------------------------------------------------------
// API base URL resolution
// ---------------------------------------------------------------------------
export function getApiBase(): string {
  const explicit = process.env["EXPO_PUBLIC_API_BASE"];
  if (explicit) return explicit;
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return window.location.origin;
  }
  return "http://localhost:8080";
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface RazorpayOrder {
  orderId: string;
  amount: number;
  currency: string;
}

export interface RazorpayPaymentResult {
  razorpay_order_id?: string;
  razorpay_payment_id: string;
  razorpay_signature?: string;
}

export interface SubscriptionResult {
  subscriptionId: string;
  planId: string;
  startAt: number;
  status: string;
  paymentId?: string;
  verified?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers — session ID for web polling
// ---------------------------------------------------------------------------
function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ---------------------------------------------------------------------------
// Backend: create a Razorpay subscription
// Returns subscriptionId + shortUrl (rzp.io hosted page)
// ---------------------------------------------------------------------------
async function createSubscriptionOnBackend(params: {
  userId: string;
  sessionId: string;
}): Promise<{
  subscriptionId: string;
  shortUrl: string;
  planId: string;
  startAt: number;
}> {
  const apiBase = getApiBase();
  const resp = await fetch(`${apiBase}/api/payments/create-subscription-link`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: params.userId, sessionId: params.sessionId }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: "Unknown error" }));
    throw new Error((err as any).error ?? "Failed to create subscription");
  }

  return resp.json() as Promise<{
    subscriptionId: string;
    shortUrl: string;
    planId: string;
    startAt: number;
  }>;
}

// ---------------------------------------------------------------------------
// Backend: verify subscription signature (after native SDK returns)
// ---------------------------------------------------------------------------
async function verifySubscriptionOnBackend(params: {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
  userId: string;
}): Promise<{ verified: boolean; planId: string; startAt: number }> {
  const apiBase = getApiBase();
  const resp = await fetch(`${apiBase}/api/payments/verify-subscription`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: "Verification failed" }));
    throw new Error((err as any).error ?? "Payment verification failed");
  }

  return resp.json() as Promise<{ verified: boolean; planId: string; startAt: number }>;
}

// ---------------------------------------------------------------------------
// Native mobile checkout — uses react-native-razorpay SDK
// Shows Razorpay payment sheet natively (no browser, no WebView redirect)
// ---------------------------------------------------------------------------
async function openNativeCheckout(params: {
  subscriptionId: string;
  planId: string;
  startAt: number;
  userId: string;
}): Promise<SubscriptionResult> {
  const keyId = process.env["EXPO_PUBLIC_RAZORPAY_KEY_ID"] ?? "";

  // Dynamic import so Web builds don't include native module
  const { default: RazorpayCheckout } = await import("react-native-razorpay");

  const result = await RazorpayCheckout.open({
    key: keyId,
    name: "SarkariNaukri",
    description: "3-day trial · then ₹249/month",
    currency: "INR",
    subscription_id: params.subscriptionId,
    prefill: { name: "", email: "", contact: "" },
    theme: { color: "#4F46E5" },
    modal: { backdropclose: false, handleback: true },
    retry: { enabled: true, max_count: 2 },
  });

  // Verify the payment signature on the backend
  const verification = await verifySubscriptionOnBackend({
    razorpay_payment_id: result.razorpay_payment_id,
    razorpay_subscription_id: result.razorpay_subscription_id ?? params.subscriptionId,
    razorpay_signature: result.razorpay_signature ?? "",
    userId: params.userId,
  });

  if (!verification.verified) {
    throw new Error("Payment verification failed — please contact support");
  }

  return {
    subscriptionId: result.razorpay_subscription_id ?? params.subscriptionId,
    planId: verification.planId ?? params.planId,
    startAt: verification.startAt ?? params.startAt,
    status: "authenticated",
    paymentId: result.razorpay_payment_id,
    verified: true,
  };
}

// ---------------------------------------------------------------------------
// Web checkout — opens rzp.io payment page and polls for completion
// ---------------------------------------------------------------------------
async function pollForSubscription(
  subscriptionId: string,
  apiBase: string,
  timeoutMs: number
): Promise<SubscriptionResult | null> {
  const url = `${apiBase}/api/payments/check-subscription?subscriptionId=${encodeURIComponent(subscriptionId)}`;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    await new Promise<void>((r) => setTimeout(r, 3000));
    try {
      const resp = await fetch(url);
      if (resp.ok) {
        const data = (await resp.json()) as {
          activated: boolean;
          status: string;
          subscriptionId: string;
          planId: string;
          startAt: number;
          paymentId?: string;
        };
        if (data.activated) {
          return {
            subscriptionId: data.subscriptionId,
            planId: data.planId,
            startAt: data.startAt,
            status: data.status,
            paymentId: data.paymentId,
          };
        }
      }
    } catch { /* network hiccup — keep polling */ }
  }
  return null;
}

async function openWebCheckout(params: {
  shortUrl: string;
  subscriptionId: string;
  planId: string;
  startAt: number;
}): Promise<SubscriptionResult> {
  const apiBase = getApiBase();

  if (typeof window !== "undefined") {
    window.open(params.shortUrl, "_blank", "noopener,noreferrer");
  }

  // Poll for up to 15 minutes
  const result = await pollForSubscription(params.subscriptionId, apiBase, 15 * 60 * 1000);
  if (result) return result;
  throw new Error("Payment not completed. Please try again.");
}

// ---------------------------------------------------------------------------
// openSubscriptionCheckout — public API
//
// Mobile (Android/iOS): uses react-native-razorpay native payment sheet
//   → shows Razorpay bottom sheet natively → verifies signature on backend
//
// Web: opens rzp.io payment page in browser → polls backend for activation
// ---------------------------------------------------------------------------
export async function openSubscriptionCheckout(params: {
  userId: string;
}): Promise<SubscriptionResult> {
  const sessionId = generateSessionId();

  // Create subscription on backend (both mobile + web need this)
  const { subscriptionId, shortUrl, planId, startAt } = await createSubscriptionOnBackend({
    userId: params.userId,
    sessionId,
  });

  if (Platform.OS === "web") {
    // Web: open rzp.io hosted payment page + poll
    return openWebCheckout({ shortUrl, subscriptionId, planId, startAt });
  } else {
    // Mobile: use native Razorpay SDK payment sheet
    return openNativeCheckout({ subscriptionId, planId, startAt, userId: params.userId });
  }
}

// ---------------------------------------------------------------------------
// createOrder — used by legacy order-based payments (kept for compatibility)
// ---------------------------------------------------------------------------
export async function createOrder(params: {
  amount: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrder | null> {
  try {
    const url = `${getApiBase()}/api/payments/create-order`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!resp.ok) return null;
    const text = await resp.text();
    if (text.trimStart().startsWith("<")) return null;
    const data = JSON.parse(text) as RazorpayOrder;
    return data?.orderId ? data : null;
  } catch {
    return null;
  }
}
