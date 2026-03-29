import crypto from "node:crypto";
import { Router } from "express";
import Razorpay from "razorpay";

const router = Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getRazorpay() {
  const keyId = process.env["RAZORPAY_KEY_ID"];
  const keySecret = process.env["RAZORPAY_KEY_SECRET"];
  if (!keyId || !keySecret) throw new Error("Razorpay credentials not configured");
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

// In-memory plan cache — plan is created once per server lifetime
let cachedPlanId: string | null = process.env["RAZORPAY_PLAN_ID"] ?? null;

async function getOrCreatePlan(razorpay: Razorpay): Promise<string> {
  if (cachedPlanId) return cachedPlanId;

  const plan = await razorpay.plans.create({
    period: "monthly",
    interval: 1,
    item: {
      name: "SarkariNaukri Premium",
      amount: 24900,        // ₹249 in paise
      currency: "INR",
      description: "Monthly access to all government job listings",
    },
  });

  cachedPlanId = plan.id as string;
  console.log(`[Payments] Created Razorpay plan: ${cachedPlanId}`);
  return cachedPlanId;
}

// ---------------------------------------------------------------------------
// POST /create-order  (₹1 trial charge or direct ₹249)
// ---------------------------------------------------------------------------
router.post("/create-order", async (req, res) => {
  try {
    const { amount, currency = "INR", receipt, notes } = req.body as {
      amount: number;
      currency?: string;
      receipt?: string;
      notes?: Record<string, string>;
    };

    if (!amount || amount <= 0) {
      res.status(400).json({ error: "Invalid amount" });
      return;
    }

    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),   // ₹ → paise
      currency,
      receipt: receipt ?? `rcpt_${Date.now()}`,
      notes: notes ?? {},
    });

    res.json({ orderId: order.id, amount: order.amount, currency: order.currency });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create order";
    res.status(500).json({ error: msg });
  }
});

// ---------------------------------------------------------------------------
// POST /verify-payment  (HMAC-SHA256 signature check)
// ---------------------------------------------------------------------------
router.post("/verify-payment", (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body as {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      };

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      res.status(400).json({ error: "Missing payment fields" });
      return;
    }

    const keySecret = process.env["RAZORPAY_KEY_SECRET"];
    if (!keySecret) {
      res.status(500).json({ error: "Server configuration error" });
      return;
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSig = crypto
      .createHmac("sha256", keySecret)
      .update(body)
      .digest("hex");

    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSig, "hex"),
      Buffer.from(razorpay_signature, "hex"),
    );

    if (!isValid) {
      res.status(400).json({ error: "Invalid payment signature" });
      return;
    }

    res.json({ verified: true, paymentId: razorpay_payment_id, orderId: razorpay_order_id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Verification failed";
    res.status(500).json({ error: msg });
  }
});

// ---------------------------------------------------------------------------
// POST /create-subscription
//   Called after the ₹1 trial payment succeeds.
//   1. Gets or creates the ₹249/month plan.
//   2. Creates a subscription starting 24 hours from now.
// ---------------------------------------------------------------------------
router.post("/create-subscription", async (req, res) => {
  try {
    const { userId, paymentId } = req.body as {
      userId?: string;
      paymentId?: string;
    };

    const razorpay = getRazorpay();

    // Step 1 — ensure plan exists
    const planId = await getOrCreatePlan(razorpay);

    // Step 2 — subscription starts 1 day from now (trial period)
    const startAt = Math.floor(Date.now() / 1000) + 24 * 60 * 60;

    // Step 3 — create subscription
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      customer_notify: 1,
      total_count: 12,          // 12 months
      start_at: startAt,
      notes: {
        userId: userId ?? "",
        trialPaymentId: paymentId ?? "",
      },
    });

    console.log(
      `[Payments] Subscription created: ${subscription.id} for user ${userId ?? "unknown"}`
    );

    res.json({
      subscriptionId: subscription.id,
      planId,
      startAt,
      status: subscription.status,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create subscription";
    console.error("[Payments] create-subscription error:", msg);
    res.status(500).json({ error: msg });
  }
});

export default router;
