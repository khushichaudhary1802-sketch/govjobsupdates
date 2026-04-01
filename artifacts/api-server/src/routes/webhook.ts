/**
 * POST /api/webhook
 *
 * Handles Razorpay webhook events.  Must receive the RAW request body
 * (before JSON parsing) so the HMAC signature can be verified.
 *
 * Supported events:
 *   subscription.activated  → mark user premium in Firebase
 *   subscription.charged    → confirm monthly payment success
 *   payment.failed          → mark subscription inactive
 */
import crypto from "node:crypto";
import { Router } from "express";
import { setUserPremium, setUserStatus } from "../services/firebase-admin.js";

const router = Router();

// ---------------------------------------------------------------------------
// Signature verification
// ---------------------------------------------------------------------------
function verifyWebhookSignature(rawBody: Buffer, signature: string, secret: string): boolean {
  try {
    const expected = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"));
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Extract user UID from subscription notes
// Razorpay lets you store arbitrary notes on subscriptions.
// We store userId there during subscription creation.
// ---------------------------------------------------------------------------
function extractUid(entity: Record<string, unknown>): string | null {
  const notes = entity["notes"] as Record<string, string> | undefined;
  return notes?.["userId"] ?? notes?.["uid"] ?? null;
}

// ---------------------------------------------------------------------------
// POST /api/webhook
// Raw body is captured by the verify callback in app.ts (express.json verify).
// ---------------------------------------------------------------------------
router.post("/webhook", async (req, res) => {
    const secret = process.env["WEBHOOK_SECRET"];
    const signature = req.headers["x-razorpay-signature"] as string | undefined;
    // rawBody is attached by the express.json verify callback in app.ts
    const rawBody: Buffer | undefined = (req as unknown as { rawBody?: Buffer }).rawBody;

    // --- Signature check ---
    if (!secret) {
      console.warn("[Webhook] WEBHOOK_SECRET not set — skipping signature check");
    } else if (!signature) {
      console.warn("[Webhook] Missing X-Razorpay-Signature header");
      res.status(400).json({ error: "Missing signature" });
      return;
    } else if (!rawBody || !verifyWebhookSignature(rawBody, signature, secret)) {
      console.warn("[Webhook] Invalid signature — rejected");
      res.status(400).json({ error: "Invalid signature" });
      return;
    }

    // body is already parsed by express.json middleware
    const payload = req.body as {
      event: string;
      payload: Record<string, { entity: Record<string, unknown> }>;
    };

    if (!payload?.event) {
      res.status(400).json({ error: "Missing event" });
      return;
    }

    const { event } = payload;
    console.log(`[Webhook] Received event: ${event}`);

    // --- Dispatch event ---
    try {
      switch (event) {
        // ---------------------------------------------------------------
        // subscription.activated
        // Fires when customer authenticates the mandate for a subscription.
        // ---------------------------------------------------------------
        case "subscription.activated": {
          const sub = payload.payload?.["subscription"]?.entity ?? {};
          const uid = extractUid(sub);
          const subscriptionId = sub["id"] as string;
          const startAt = sub["start_at"] as number | undefined;

          console.log(`[Webhook] subscription.activated subId=${subscriptionId} uid=${uid}`);

          if (uid && subscriptionId) {
            await setUserPremium({
              uid,
              subscriptionId,
              trialEndMs: startAt ? startAt * 1000 : undefined,
              status: "active",
            });
          }
          break;
        }

        // ---------------------------------------------------------------
        // subscription.charged
        // Fires on every successful recurring charge (monthly ₹249).
        // ---------------------------------------------------------------
        case "subscription.charged": {
          const sub = payload.payload?.["subscription"]?.entity ?? {};
          const uid = extractUid(sub);
          const subscriptionId = sub["id"] as string;

          console.log(`[Webhook] subscription.charged subId=${subscriptionId} uid=${uid}`);

          if (uid && subscriptionId) {
            await setUserPremium({ uid, subscriptionId, status: "active" });
          }
          break;
        }

        // ---------------------------------------------------------------
        // payment.failed
        // Fires when a payment attempt (trial or recurring) fails.
        // ---------------------------------------------------------------
        case "payment.failed": {
          const payment = payload.payload?.["payment"]?.entity ?? {};
          const notes = payment["notes"] as Record<string, string> | undefined;
          const uid = notes?.["userId"] ?? notes?.["uid"] ?? null;

          console.log(`[Webhook] payment.failed uid=${uid}`);

          if (uid) {
            await setUserStatus({ uid, status: "failed", isPremium: false });
          }
          break;
        }

        // ---------------------------------------------------------------
        // subscription.cancelled / subscription.halted
        // ---------------------------------------------------------------
        case "subscription.cancelled":
        case "subscription.halted": {
          const sub = payload.payload?.["subscription"]?.entity ?? {};
          const uid = extractUid(sub);
          console.log(`[Webhook] ${event} uid=${uid}`);
          if (uid) {
            await setUserStatus({ uid, status: "cancelled", isPremium: false });
          }
          break;
        }

        default:
          console.log(`[Webhook] Unhandled event: ${event}`);
      }
    } catch (err) {
      console.error(`[Webhook] Error processing ${event}:`, err);
      // Still return 200 so Razorpay doesn't retry indefinitely
    }

    // Always acknowledge receipt
    res.json({ received: true, event });
  }
);

export default router;
