/**
 * Firebase Admin SDK — singleton initializer.
 *
 * Reads FIREBASE_SERVICE_ACCOUNT env var (JSON string of the service account key).
 * Gracefully degrades when not configured so the server still starts in dev
 * without Firebase credentials.
 */
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import {
  getFirestore,
  type Firestore,
  FieldValue,
  Timestamp,
} from "firebase-admin/firestore";

export { FieldValue, Timestamp };

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------
let _app: App | null = null;
let _db: Firestore | null = null;

function init(): { app: App; db: Firestore } | null {
  if (_app && _db) return { app: _app, db: _db };

  const raw = process.env["FIREBASE_SERVICE_ACCOUNT"];
  if (!raw) {
    console.warn("[Firebase] FIREBASE_SERVICE_ACCOUNT not set — Firestore writes disabled");
    return null;
  }

  try {
    const serviceAccount = JSON.parse(raw);
    if (getApps().length === 0) {
      _app = initializeApp({ credential: cert(serviceAccount) });
    } else {
      _app = getApps()[0]!;
    }
    _db = getFirestore(_app);
    console.log("[Firebase] Admin SDK initialized ✓");
    return { app: _app, db: _db };
  } catch (err) {
    console.error("[Firebase] Failed to initialize Admin SDK:", err);
    return null;
  }
}

export function getDb(): Firestore | null {
  return init()?.db ?? null;
}

// ---------------------------------------------------------------------------
// User document shape stored in Firestore `users` collection
// ---------------------------------------------------------------------------
export interface UserRecord {
  uid: string;
  isPremium: boolean;
  subscriptionId?: string;
  trialEnd?: Timestamp;
  status: "active" | "failed" | "cancelled" | "pending";
  updatedAt: FieldValue;
}

// ---------------------------------------------------------------------------
// setUserPremium — mark a user as premium / active subscriber
// ---------------------------------------------------------------------------
export async function setUserPremium(params: {
  uid: string;
  subscriptionId: string;
  trialEndMs?: number;
  status?: "active" | "failed" | "cancelled" | "pending";
}): Promise<void> {
  const db = getDb();
  if (!db) return;
  try {
    const ref = db.collection("users").doc(params.uid);
    const data: Record<string, unknown> = {
      isPremium: true,
      subscriptionId: params.subscriptionId,
      status: params.status ?? "active",
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (params.trialEndMs) {
      data["trialEnd"] = Timestamp.fromMillis(params.trialEndMs);
    }
    await ref.set(data, { merge: true });
    console.log(`[Firebase] setUserPremium uid=${params.uid} sub=${params.subscriptionId}`);
  } catch (err) {
    console.error("[Firebase] setUserPremium error:", err);
  }
}

// ---------------------------------------------------------------------------
// setUserStatus — update subscription status (e.g. failed / cancelled)
// ---------------------------------------------------------------------------
export async function setUserStatus(params: {
  uid: string;
  status: "active" | "failed" | "cancelled" | "pending";
  isPremium: boolean;
}): Promise<void> {
  const db = getDb();
  if (!db) return;
  try {
    const ref = db.collection("users").doc(params.uid);
    await ref.set(
      {
        status: params.status,
        isPremium: params.isPremium,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    console.log(`[Firebase] setUserStatus uid=${params.uid} status=${params.status}`);
  } catch (err) {
    console.error("[Firebase] setUserStatus error:", err);
  }
}

// ---------------------------------------------------------------------------
// getUserStatus — read a user document (returns null if not found)
// ---------------------------------------------------------------------------
export async function getUserStatus(uid: string): Promise<Partial<UserRecord> | null> {
  const db = getDb();
  if (!db) return null;
  try {
    const snap = await db.collection("users").doc(uid).get();
    if (!snap.exists) return null;
    return snap.data() as Partial<UserRecord>;
  } catch (err) {
    console.error("[Firebase] getUserStatus error:", err);
    return null;
  }
}
