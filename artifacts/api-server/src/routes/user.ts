/**
 * GET /api/user-status?uid=USER_ID
 *
 * Returns the premium/subscription status for a given Firebase UID.
 * Used by the React Native app on launch to check whether the user
 * still has an active subscription.
 */
import { Router } from "express";
import { getUserStatus } from "../services/firebase-admin.js";

const router = Router();

router.get("/user-status", async (req, res) => {
  const uid = req.query["uid"] as string | undefined;

  if (!uid) {
    res.status(400).json({ error: "Missing uid query parameter" });
    return;
  }

  try {
    const user = await getUserStatus(uid);

    if (!user) {
      // Unknown user — treat as free tier
      res.json({ uid, isPremium: false, status: "pending" });
      return;
    }

    res.json({
      uid,
      isPremium: user.isPremium ?? false,
      status: user.status ?? "pending",
      subscriptionId: user.subscriptionId ?? null,
      trialEnd: user.trialEnd ?? null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to fetch user status";
    console.error("[User] user-status error:", msg);
    res.status(500).json({ error: msg });
  }
});

export default router;
