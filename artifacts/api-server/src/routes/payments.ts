import crypto from "node:crypto";
import { Router } from "express";
import Razorpay from "razorpay";

const router = Router();

function getRazorpay() {
  const keyId = process.env["RAZORPAY_KEY_ID"];
  const keySecret = process.env["RAZORPAY_KEY_SECRET"];
  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials not configured");
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

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
      amount: Math.round(amount * 100),
      currency,
      receipt: receipt ?? `rcpt_${Date.now()}`,
      notes: notes ?? {},
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create order";
    res.status(500).json({ error: msg });
  }
});

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
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(body)
      .digest("hex");

    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "hex"),
      Buffer.from(razorpay_signature, "hex"),
    );

    if (!isValid) {
      res.status(400).json({ error: "Invalid payment signature" });
      return;
    }

    res.json({
      verified: true,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Verification failed";
    res.status(500).json({ error: msg });
  }
});

export default router;
