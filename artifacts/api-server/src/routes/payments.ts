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
      amount: 24900,
      currency: "INR",
      description: "Monthly access to all government job listings",
    },
  });

  cachedPlanId = plan.id as string;
  console.log(`[Payments] Created Razorpay plan: ${cachedPlanId}`);
  return cachedPlanId;
}

// ---------------------------------------------------------------------------
// Session store — tracks native checkout payment results
// Sessions expire after 10 minutes
// ---------------------------------------------------------------------------
interface PaymentSession {
  status: "pending" | "completed" | "failed";
  paymentId?: string;
  orderId?: string;
  signature?: string;
  createdAt: number;
}

const sessions = new Map<string, PaymentSession>();

function cleanExpiredSessions() {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [id, session] of sessions) {
    if (session.createdAt < cutoff) sessions.delete(id);
  }
}

// ---------------------------------------------------------------------------
// POST /create-payment-link
// Creates a Razorpay Payment Link (hosted on rzp.io — no domain restriction).
// ---------------------------------------------------------------------------
router.post("/create-payment-link", async (req, res) => {
  try {
    const { amount, description, sessionId, callbackUrl } = req.body as {
      amount: number;
      description?: string;
      sessionId: string;
      callbackUrl: string;
    };

    if (!amount || !sessionId || !callbackUrl) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    cleanExpiredSessions();
    sessions.set(sessionId, { status: "pending", createdAt: Date.now() });

    const razorpay = getRazorpay();
    const link = await (razorpay as any).paymentLink.create({
      amount: Math.round(amount),
      currency: "INR",
      description: description ?? "SarkariNaukri Premium",
      callback_url: callbackUrl,
      callback_method: "get",
      reference_id: sessionId,
      notes: { sessionId },
    });

    console.log(`[Payments] Payment link created: ${link.id} session=${sessionId}`);
    res.json({ shortUrl: link.short_url, linkId: link.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create payment link";
    console.error("[Payments] create-payment-link error:", msg);
    res.status(500).json({ error: msg });
  }
});

// ---------------------------------------------------------------------------
// GET /payment-link-callback
// Razorpay redirects here after payment link is paid.
// Records the session and shows a success page.
// ---------------------------------------------------------------------------
router.get("/payment-link-callback", (req, res) => {
  const {
    razorpay_payment_id,
    razorpay_payment_link_id,
    razorpay_payment_link_reference_id,
    razorpay_payment_link_status,
    razorpay_signature,
  } = req.query as Record<string, string>;

  const sessionId = razorpay_payment_link_reference_id;
  const paid = razorpay_payment_link_status === "paid";

  if (sessionId && razorpay_payment_id && paid) {
    sessions.set(sessionId, {
      status: "completed",
      paymentId: razorpay_payment_id,
      orderId: razorpay_payment_link_id,
      signature: razorpay_signature,
      createdAt: Date.now(),
    });
    console.log(`[Payments] Payment link callback: session=${sessionId} payment=${razorpay_payment_id}`);
  }

  const successHtml = `<!DOCTYPE html>
<html lang="en"><head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Payment Successful</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#F4F6FA;display:flex;align-items:center;justify-content:center;min-height:100vh}
    .card{background:#fff;border-radius:20px;padding:48px 28px;text-align:center;max-width:360px;width:100%;box-shadow:0 8px 32px rgba(26,58,107,.12)}
    .icon{font-size:64px;margin-bottom:16px}
    h1{color:#166534;font-size:22px;font-weight:700;margin-bottom:10px}
    p{color:#555;font-size:15px;margin-bottom:28px;line-height:1.5}
    .btn{display:block;background:#1A3A6B;color:#fff;border:none;padding:15px 24px;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;text-decoration:none;width:100%}
    .note{color:#999;font-size:12px;margin-top:20px}
  </style>
</head><body>
<div class="card">
  <div class="icon">${paid ? "✅" : "❌"}</div>
  <h1>${paid ? "Payment Successful!" : "Payment Not Completed"}</h1>
  <p>${paid
    ? "Your SarkariNaukri Premium access is being activated. Please return to the app."
    : "The payment was not completed. Please return to the app and try again."
  }</p>
  <a class="btn" href="javascript:window.close()">Return to App</a>
  <p class="note">You can also close this window manually.</p>
</div>
</body></html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(successHtml);
});

// ---------------------------------------------------------------------------
// GET /checkout-page  — hosted Razorpay checkout page for native devices
// Query params: amount (paise), description, sessionId, userId
// ---------------------------------------------------------------------------
router.get("/checkout-page", async (req, res) => {
  const { amount, description, sessionId, userId, recordUrl: customRecordUrl } = req.query as Record<string, string>;

  if (!sessionId) {
    res.status(400).send("Missing sessionId");
    return;
  }

  // Register session as pending
  cleanExpiredSessions();
  sessions.set(sessionId, { status: "pending", createdAt: Date.now() });

  const keyId = process.env["RAZORPAY_KEY_ID"] ?? "";
  const amountNum = parseInt(amount ?? "100", 10);
  const desc = description ?? "SarkariNaukri Premium";

  let orderId = "";
  try {
    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: amountNum,
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
      notes: { userId: userId ?? "", sessionId },
    });
    orderId = order.id as string;
  } catch (e) {
    console.error("[Payments] checkout-page order error:", e);
  }

  const origin = `${req.protocol}://${req.get("host")}`;
  const recordUrl = customRecordUrl || `${origin}/api/payments/record-payment`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>SarkariNaukri — Secure Payment</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#F4F6FA;display:flex;align-items:center;justify-content:center;min-height:100vh}
    .card{background:#fff;border-radius:20px;padding:40px 28px;text-align:center;max-width:380px;width:100%;box-shadow:0 8px 32px rgba(26,58,107,.12)}
    .logo{font-size:52px;margin-bottom:12px}
    h1{color:#1A3A6B;font-size:22px;font-weight:700;margin-bottom:6px}
    .sub{color:#666;font-size:14px;margin-bottom:28px}
    .amount{background:#F4F6FA;border-radius:12px;padding:16px;margin-bottom:24px}
    .amount-label{color:#999;font-size:12px;text-transform:uppercase;letter-spacing:.5px}
    .amount-value{color:#1A3A6B;font-size:32px;font-weight:800;margin-top:4px}
    .spinner{width:36px;height:36px;border:3px solid #e0e8f5;border-top-color:#1A3A6B;border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 16px}
    @keyframes spin{to{transform:rotate(360deg)}}
    .status{color:#1A3A6B;font-size:14px;font-weight:500;min-height:20px}
    .btn{display:none;background:#D4A017;color:#fff;border:none;padding:14px 32px;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;width:100%;margin-top:20px}
    .btn:active{background:#b88800}
    .success{display:none;color:#22c55e;font-size:40px;margin-bottom:12px}
    .success-text{display:none;color:#166534;font-weight:600;font-size:16px}
    .error-text{display:none;color:#dc2626;font-size:14px;margin-top:12px}
    .secure{color:#999;font-size:11px;margin-top:20px}
  </style>
</head>
<body>
<div class="card">
  <div class="logo">🏛️</div>
  <h1>SarkariNaukri</h1>
  <p class="sub">Government Jobs — Premium Access</p>
  <div class="amount">
    <div class="amount-label">Amount to Pay</div>
    <div class="amount-value">₹${(amountNum / 100).toFixed(0)}</div>
  </div>
  <div class="spinner" id="spinner"></div>
  <div class="status" id="status">Opening secure payment...</div>
  <button class="btn" id="payBtn" onclick="openCheckout()">Pay Now</button>
  <div class="success" id="successIcon">✅</div>
  <div class="success-text" id="successText">Payment successful! You can close this window and return to the app.</div>
  <div class="error-text" id="errorText"></div>
  <p class="secure">🔒 Secured by Razorpay</p>
</div>
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
<script>
var KEY_ID = ${JSON.stringify(keyId)};
var ORDER_ID = ${JSON.stringify(orderId)};
var AMOUNT = ${amountNum};
var DESC = ${JSON.stringify(desc)};
var SESSION_ID = ${JSON.stringify(sessionId)};
var RECORD_URL = ${JSON.stringify(recordUrl)};

function show(id){ document.getElementById(id).style.display = id === 'spinner' ? 'inline-block' : 'block'; }
function hide(id){ document.getElementById(id).style.display = 'none'; }
function setStatus(msg){ document.getElementById('status').textContent = msg; }

async function recordPayment(paymentId, ordId, sig){
  try {
    await fetch(RECORD_URL, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ sessionId: SESSION_ID, paymentId, orderId: ordId, signature: sig })
    });
  } catch(e){ console.warn('record failed', e); }
}

function openCheckout(){
  hide('payBtn');
  show('spinner');
  setStatus('Opening secure payment...');
  hide('errorText');

  var options = {
    key: KEY_ID,
    amount: AMOUNT,
    currency: 'INR',
    name: 'SarkariNaukri',
    description: DESC,
    handler: async function(response){
      setStatus('Recording payment...');
      await recordPayment(
        response.razorpay_payment_id,
        response.razorpay_order_id || '',
        response.razorpay_signature || ''
      );
      hide('spinner');
      setStatus('');
      show('successIcon');
      show('successText');
    },
    modal: {
      ondismiss: function(){
        hide('spinner');
        setStatus('Payment was cancelled.');
        show('payBtn');
        document.getElementById('payBtn').textContent = 'Try Again';
      }
    },
    theme: { color: '#1A3A6B' }
  };
  if(ORDER_ID) options.order_id = ORDER_ID;

  try {
    var rzp = new Razorpay(options);
    rzp.open();
    hide('spinner');
    setStatus('Complete payment in the window above');
  } catch(e) {
    hide('spinner');
    setStatus('');
    document.getElementById('errorText').textContent = 'Could not open payment. Please tap Pay Now.';
    show('errorText');
    show('payBtn');
  }
}

window.addEventListener('load', function(){ setTimeout(openCheckout, 600); });
</script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.send(html);
});

// ---------------------------------------------------------------------------
// POST /record-payment — called by checkout page after successful payment
// ---------------------------------------------------------------------------
router.post("/record-payment", (req, res) => {
  const { sessionId, paymentId, orderId, signature } = req.body as Record<string, string>;
  if (!sessionId || !paymentId) {
    res.status(400).json({ error: "Missing sessionId or paymentId" });
    return;
  }
  sessions.set(sessionId, {
    status: "completed",
    paymentId,
    orderId,
    signature,
    createdAt: Date.now(),
  });
  console.log(`[Payments] Session ${sessionId} completed: ${paymentId}`);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// GET /check-session?sessionId=xxx — polled by native app
// ---------------------------------------------------------------------------
router.get("/check-session", (req, res) => {
  const { sessionId } = req.query as Record<string, string>;
  if (!sessionId) {
    res.status(400).json({ error: "Missing sessionId" });
    return;
  }
  const session = sessions.get(sessionId);
  if (!session) {
    res.json({ status: "pending" });
    return;
  }
  res.json({
    status: session.status,
    paymentId: session.paymentId,
    orderId: session.orderId,
    signature: session.signature,
  });
});

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
      amount: Math.round(amount * 100),
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
// POST /create-subscription-link
// Creates a Razorpay Subscription with ₹1 addon on rzp.io — shows both
// the trial fee AND the ₹249/month recurring mandate in one screen.
// ---------------------------------------------------------------------------
router.post("/create-subscription-link", async (req, res) => {
  try {
    const { userId, sessionId } = req.body as { userId?: string; sessionId: string };

    if (!sessionId) {
      res.status(400).json({ error: "Missing sessionId" });
      return;
    }

    cleanExpiredSessions();
    sessions.set(sessionId, { status: "pending", createdAt: Date.now() });

    const razorpay = getRazorpay();
    const planId = await getOrCreatePlan(razorpay);
    // First ₹249 charge happens 3 days after trial
    const startAt = Math.floor(Date.now() / 1000) + 3 * 24 * 60 * 60;

    const subscription = await (razorpay.subscriptions as any).create({
      plan_id: planId,
      total_count: 12,
      quantity: 1,
      start_at: startAt,
      customer_notify: 1,
      addons: [
        {
          item: {
            amount: 100, // ₹1 trial fee in paise
            currency: "INR",
            name: "3-Day Trial",
          },
        },
      ],
      notes: { userId: userId ?? "", sessionId },
    });

    console.log(
      `[Payments] Subscription link created: ${subscription.id} session=${sessionId} url=${subscription.short_url}`
    );

    res.json({
      subscriptionId: subscription.id,
      shortUrl: subscription.short_url,
      planId,
      startAt,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create subscription link";
    console.error("[Payments] create-subscription-link error:", msg);
    res.status(500).json({ error: msg });
  }
});

// ---------------------------------------------------------------------------
// GET /check-subscription?subscriptionId=xxx
// Polls Razorpay for subscription status. "authenticated" or "active" = done.
// ---------------------------------------------------------------------------
router.get("/check-subscription", async (req, res) => {
  try {
    const { subscriptionId } = req.query as Record<string, string>;
    if (!subscriptionId) {
      res.status(400).json({ error: "Missing subscriptionId" });
      return;
    }

    const razorpay = getRazorpay();
    const sub = await razorpay.subscriptions.fetch(subscriptionId);

    const status = sub.status as string;
    const activated = status === "authenticated" || status === "active";

    // Try to get payment ID from subscription payments
    let paymentId: string | undefined;
    if (activated) {
      try {
        const payments = await (razorpay.subscriptions as any).fetchAllPayments(subscriptionId, {});
        const items = payments?.items ?? [];
        if (items.length > 0) {
          paymentId = items[0].id;
        }
      } catch { /* non-fatal */ }
    }

    res.json({
      status,
      activated,
      subscriptionId: sub.id,
      planId: sub.plan_id,
      startAt: sub.start_at,
      paymentId,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to check subscription";
    res.status(500).json({ error: msg });
  }
});

// ---------------------------------------------------------------------------
// POST /create-subscription  (kept for backward compatibility)
// ---------------------------------------------------------------------------
router.post("/create-subscription", async (req, res) => {
  try {
    const { userId, paymentId } = req.body as {
      userId?: string;
      paymentId?: string;
    };

    const razorpay = getRazorpay();
    const planId = await getOrCreatePlan(razorpay);
    const startAt = Math.floor(Date.now() / 1000) + 3 * 24 * 60 * 60;

    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      customer_notify: 1,
      total_count: 12,
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
