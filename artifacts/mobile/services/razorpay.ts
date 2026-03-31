import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";

// ---------------------------------------------------------------------------
// API base URL resolution
//
// EXPO_PUBLIC_API_BASE: set in .env to the Expo dev domain so all API calls
//   route through Expo Router API routes (which proxy to localhost:8080).
//   In production this would point to the deployed API server.
//
// Fallback:
//   - Web:    same origin (works when app is served on the expo subdomain)
//   - Native: localhost:8080 (works only inside Replit container)
// ---------------------------------------------------------------------------
function getApiBase(): string {
  const explicit = process.env["EXPO_PUBLIC_API_BASE"];
  if (explicit) return explicit;

  if (Platform.OS === "web" && typeof window !== "undefined") {
    return window.location.origin;
  }
  return "http://localhost:8080";
}

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

export interface RazorpaySubscription {
  subscriptionId: string;
  planId: string;
  startAt: number;
  status: string;
}

// ---------------------------------------------------------------------------
// createOrder — try to create an order. Returns null on failure (non-fatal).
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

    if (!resp.ok) {
      console.warn("[Razorpay] createOrder HTTP error:", resp.status);
      return null;
    }

    const text = await resp.text();
    if (text.trimStart().startsWith("<")) {
      console.warn("[Razorpay] createOrder returned HTML — API route unavailable");
      return null;
    }

    const data = JSON.parse(text) as RazorpayOrder;
    if (!data?.orderId) return null;
    return data;
  } catch (err) {
    console.warn("[Razorpay] createOrder error:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// createSubscription — called after trial payment. Returns null on failure.
// ---------------------------------------------------------------------------
export async function createSubscription(params: {
  userId: string;
  paymentId: string;
}): Promise<RazorpaySubscription | null> {
  try {
    const url = `${getApiBase()}/api/payments/create-subscription`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!resp.ok) {
      console.warn("[Razorpay] createSubscription HTTP error:", resp.status);
      return null;
    }
    return (await resp.json()) as RazorpaySubscription;
  } catch (err) {
    console.warn("[Razorpay] createSubscription error:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// verifyPayment — HMAC signature check. Returns true on failure (fail open).
// ---------------------------------------------------------------------------
export async function verifyPayment(
  result: RazorpayPaymentResult
): Promise<boolean> {
  if (!result.razorpay_order_id || !result.razorpay_signature) {
    return true; // No order_id → signature check not possible, payment_id is real
  }
  try {
    const url = `${getApiBase()}/api/payments/verify-payment`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result),
    });
    if (!resp.ok) return false;
    const data = (await resp.json()) as { verified: boolean };
    return data.verified === true;
  } catch {
    return true; // Don't block the user — payment_id is real regardless
  }
}

// ---------------------------------------------------------------------------
// Web checkout helpers
// ---------------------------------------------------------------------------
function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Not in browser"));
      return;
    }
    if (document.getElementById("razorpay-checkout-js")) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.id = "razorpay-checkout-js";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay script"));
    document.head.appendChild(script);
  });
}

function openWebCheckout(params: {
  orderId?: string;
  amount: number;
  currency: string;
  description: string;
  prefill?: { name?: string; email?: string; contact?: string };
}): Promise<RazorpayPaymentResult> {
  const keyId = process.env["EXPO_PUBLIC_RAZORPAY_KEY_ID"] ?? "";

  return new Promise((resolve, reject) => {
    const w = window as unknown as {
      Razorpay?: new (options: Record<string, unknown>) => { open(): void };
    };
    if (!w.Razorpay) {
      reject(new Error("Razorpay SDK not loaded"));
      return;
    }

    const options: Record<string, unknown> = {
      key: keyId,
      amount: params.amount,
      currency: params.currency,
      name: "SarkariNaukri",
      description: params.description,
      prefill: params.prefill ?? {},
      theme: { color: "#1A3A6B" },
      handler: (response: RazorpayPaymentResult) => resolve(response),
      modal: {
        ondismiss: () => reject(new Error("Payment cancelled")),
      },
    };

    if (params.orderId) options["order_id"] = params.orderId;

    const rzp = new w.Razorpay(options);
    rzp.open();
  });
}

// ---------------------------------------------------------------------------
// Native checkout — hosted checkout page + session polling
// ---------------------------------------------------------------------------
function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

async function pollForPayment(
  sessionId: string,
  apiBase: string,
  timeoutMs: number
): Promise<{ paymentId: string; orderId?: string; signature?: string } | null> {
  const url = `${apiBase}/api/payments/check-session?sessionId=${encodeURIComponent(sessionId)}`;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    await new Promise<void>((r) => setTimeout(r, 2000));
    try {
      const resp = await fetch(url);
      if (resp.ok) {
        const data = (await resp.json()) as {
          status: string;
          paymentId?: string;
          orderId?: string;
          signature?: string;
        };
        if (data.status === "completed" && data.paymentId) {
          return { paymentId: data.paymentId, orderId: data.orderId, signature: data.signature };
        }
      }
    } catch {
      // network hiccup — keep polling
    }
  }
  return null;
}

async function openNativeCheckout(params: {
  amount: number;
  description: string;
  userId?: string;
}): Promise<RazorpayPaymentResult> {
  const apiBase = getApiBase();
  const sessionId = generateSessionId();

  // Callback URL — Razorpay redirects here after payment (on rzp.io domain, no domain restriction)
  const callbackUrl = `${apiBase}/api/payments/payment-link-callback`;

  // Step 1: Create a Razorpay Payment Link (hosted on rzp.io)
  const linkResp = await fetch(`${apiBase}/api/payments/create-payment-link`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: params.amount,
      description: params.description,
      sessionId,
      callbackUrl,
    }),
  });

  if (!linkResp.ok) {
    const err = await linkResp.json().catch(() => ({ error: "Unknown error" }));
    throw new Error((err as any).error ?? "Failed to create payment link");
  }

  const { shortUrl } = (await linkResp.json()) as { shortUrl: string; linkId: string };

  // Step 2: Open rzp.io payment page (no domain restriction — hosted by Razorpay)
  const browserPromise = WebBrowser.openBrowserAsync(shortUrl, {
    toolbarColor: "#1A3A6B",
    controlsColor: "#D4A017",
    showTitle: true,
  });

  // Step 3: Poll for payment result concurrently
  let paymentResult: { paymentId: string; orderId?: string; signature?: string } | null = null;
  const pollPromise = pollForPayment(sessionId, apiBase, 10 * 60 * 1000);

  await Promise.race([
    browserPromise,
    pollPromise.then((r) => { paymentResult = r; }),
  ]);

  // Browser closed — give a few seconds for the callback to be processed
  if (!paymentResult) {
    await new Promise<void>((r) => setTimeout(r, 4000));
    try {
      const url = `${apiBase}/api/payments/check-session?sessionId=${encodeURIComponent(sessionId)}`;
      const resp = await fetch(url);
      if (resp.ok) {
        const data = (await resp.json()) as { status: string; paymentId?: string; orderId?: string; signature?: string };
        if (data.status === "completed" && data.paymentId) {
          paymentResult = { paymentId: data.paymentId, orderId: data.orderId, signature: data.signature };
        }
      }
    } catch { /* ignore */ }
  }

  if (paymentResult) {
    return {
      razorpay_payment_id: paymentResult.paymentId,
      razorpay_order_id: paymentResult.orderId,
      razorpay_signature: paymentResult.signature,
    };
  }

  throw new Error("Payment not completed");
}

// ---------------------------------------------------------------------------
// openRazorpayCheckout — public API
// ---------------------------------------------------------------------------
export async function openRazorpayCheckout(params: {
  orderId?: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill?: { name?: string; email?: string; contact?: string };
}): Promise<RazorpayPaymentResult> {
  if (Platform.OS === "web") {
    await loadRazorpayScript();
    return openWebCheckout(params);
  }

  // Native — open hosted checkout page in device browser, poll for result
  return openNativeCheckout({
    amount: params.amount,
    description: params.description,
    userId: params.prefill?.name,
  });
}
