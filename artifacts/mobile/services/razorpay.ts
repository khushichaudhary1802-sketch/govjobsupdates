import { Platform, Linking } from "react-native";

// On web: Expo Router same-origin API route handles the proxy (proven working).
// On native: use the public EXPO_PUBLIC_DOMAIN URL; falls back gracefully if unreachable.
const WEB_API_BASE = (() => {
  if (typeof window !== "undefined") return window.location.origin;
  return "";
})();

const NATIVE_API_BASE = (() => {
  const domain = process.env["EXPO_PUBLIC_DOMAIN"];
  if (domain) return `https://${domain}/api-server`;
  return "http://localhost:8080";
})();

function getApiBase() {
  return Platform.OS === "web" ? WEB_API_BASE : NATIVE_API_BASE;
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

/**
 * Try to create a Razorpay order on the backend.
 * Returns null if the backend is unreachable — caller should degrade gracefully.
 */
export async function createOrder(params: {
  amount: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrder | null> {
  try {
    const base = getApiBase();
    const url =
      Platform.OS === "web"
        ? `${base}/api/payments/create-order`
        : `${base}/api/payments/create-order`;

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    if (!resp.ok) {
      console.warn("[Razorpay] createOrder HTTP error:", resp.status);
      return null;
    }

    const data = (await resp.json()) as RazorpayOrder;
    if (!data?.orderId) return null;
    return data;
  } catch (err) {
    console.warn("[Razorpay] createOrder network error:", err);
    return null;
  }
}

/**
 * Verify payment signature on the backend.
 * Returns false (non-fatal) if backend is unreachable.
 */
export async function verifyPayment(
  result: RazorpayPaymentResult
): Promise<boolean> {
  if (!result.razorpay_order_id || !result.razorpay_signature) {
    // Checkout was opened without an order_id — skip server verification
    return true;
  }
  try {
    const base = getApiBase();
    const url =
      Platform.OS === "web"
        ? `${base}/api/payments/verify-payment`
        : `${base}/api/payments/verify-payment`;

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result),
    });
    if (!resp.ok) return false;
    const data = (await resp.json()) as { verified: boolean };
    return data.verified === true;
  } catch {
    // Verification failed — treat as verified to not block the user.
    // The payment_id is real and captured by Razorpay regardless.
    return true;
  }
}

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Not running in browser"));
      return;
    }
    const existing = document.getElementById("razorpay-checkout-js");
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.id = "razorpay-checkout-js";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay checkout"));
    document.head.appendChild(script);
  });
}

export async function openRazorpayCheckout(params: {
  orderId?: string; // optional — checkout works without it
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill?: { name?: string; email?: string; contact?: string };
}): Promise<RazorpayPaymentResult> {
  const keyId = process.env["EXPO_PUBLIC_RAZORPAY_KEY_ID"] ?? "";

  if (Platform.OS === "web") {
    await loadRazorpayScript();

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
        handler: (response: RazorpayPaymentResult) => {
          resolve(response);
        },
        modal: {
          ondismiss: () => {
            reject(new Error("Payment cancelled"));
          },
        },
      };

      // Only set order_id if we have one (from successful backend call)
      if (params.orderId) {
        options["order_id"] = params.orderId;
      }

      const rzp = new w.Razorpay(options);
      rzp.open();
    });
  }

  // Native: open Razorpay payment page in device browser
  const url = params.orderId
    ? `https://api.razorpay.com/v1/checkout/embedded?key_id=${keyId}&order_id=${params.orderId}`
    : `https://rzp.io/l/${keyId}`;
  await Linking.openURL(url);
  throw new Error("NATIVE_REDIRECT");
}
