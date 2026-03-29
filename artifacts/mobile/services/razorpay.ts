import { Platform, Linking } from "react-native";

// In Replit the API server is routed under /api-server on the same domain
// On web we can use a relative path; on native we need the full domain
const API_BASE = (() => {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    // Use same-origin relative URL on web
    return `${window.location.origin}/api-server`;
  }
  const domain = process.env["EXPO_PUBLIC_DOMAIN"];
  if (domain) return `https://${domain}/api-server`;
  return "http://localhost:8080";
})();

export interface RazorpayOrder {
  orderId: string;
  amount: number;
  currency: string;
}

export interface RazorpayPaymentResult {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export async function createOrder(params: {
  amount: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrder> {
  const resp = await fetch(`${API_BASE}/api/payments/create-order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: "Network error" })) as { error?: string };
    throw new Error(err.error ?? "Failed to create payment order");
  }
  return resp.json() as Promise<RazorpayOrder>;
}

export async function verifyPayment(
  result: RazorpayPaymentResult
): Promise<boolean> {
  const resp = await fetch(`${API_BASE}/api/payments/verify-payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(result),
  });
  if (!resp.ok) return false;
  const data = await resp.json() as { verified: boolean };
  return data.verified === true;
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
    script.onerror = () => reject(new Error("Failed to load Razorpay"));
    document.body.appendChild(script);
  });
}

export async function openRazorpayCheckout(params: {
  orderId: string;
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

      const rzp = new w.Razorpay({
        key: keyId,
        amount: params.amount,
        currency: params.currency,
        name: "SarkariNaukri",
        description: params.description,
        order_id: params.orderId,
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
      });
      rzp.open();
    });
  }

  // On native: open Razorpay payment page in the device browser
  // This is a simplified flow — for production, use react-native-razorpay
  const url =
    `https://api.razorpay.com/v1/checkout/embedded?` +
    `key_id=${keyId}&order_id=${params.orderId}`;
  await Linking.openURL(url);
  throw new Error("NATIVE_REDIRECT"); // caller should handle native redirect
}
