import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { getAnalytics, logEvent, isSupported } from "firebase/analytics";
import { Platform } from "react-native";

// ---------------------------------------------------------------------------
// Firebase web config (used for Firestore + web analytics)
// ---------------------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyAzOW87uc2VIa-2kdJBnEF-BwHOD5H3lzY",
  authDomain: "flutter-ai-playground-61d57.firebaseapp.com",
  projectId: "flutter-ai-playground-61d57",
  storageBucket: "flutter-ai-playground-61d57.firebasestorage.app",
  messagingSenderId: "120897220362",
  appId: "1:120897220362:android:7b1906117e26c051e2d4f3",
  measurementId: "",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]!;
const db = getFirestore(app);

// ---------------------------------------------------------------------------
// Web Analytics instance (Firebase JS SDK — browser only)
// ---------------------------------------------------------------------------
let analyticsInstance: ReturnType<typeof getAnalytics> | null = null;

async function getWebAnalytics() {
  if (Platform.OS !== "web") return null;
  if (analyticsInstance) return analyticsInstance;
  const supported = await isSupported();
  if (supported) {
    analyticsInstance = getAnalytics(app);
  }
  return analyticsInstance;
}

// ---------------------------------------------------------------------------
// Native Analytics (react-native-firebase — works after EAS Build)
// Expo Go does NOT support native modules, so this is wrapped in try/catch.
// ---------------------------------------------------------------------------
type NativeAnalytics = {
  logEvent: (name: string, params?: Record<string, unknown>) => Promise<void>;
};

let nativeAnalyticsCache: NativeAnalytics | null | "unavailable" = null;

async function getNativeAnalytics(): Promise<NativeAnalytics | null> {
  if (Platform.OS === "web") return null;
  if (nativeAnalyticsCache === "unavailable") return null;
  if (nativeAnalyticsCache !== null) return nativeAnalyticsCache;

  try {
    // Dynamic import — only resolves in native builds (EAS), not in Expo Go
    const mod = await import("@react-native-firebase/analytics");
    const analyticsModule = mod.default ?? mod;
    if (typeof analyticsModule === "function") {
      const instance = analyticsModule();
      nativeAnalyticsCache = instance as NativeAnalytics;
      return nativeAnalyticsCache;
    }
    nativeAnalyticsCache = "unavailable";
    return null;
  } catch {
    // Expected in Expo Go — native module not linked
    nativeAnalyticsCache = "unavailable";
    return null;
  }
}

// ---------------------------------------------------------------------------
// Unified trackEvent — fires to web SDK (browser) OR native SDK (Android)
// ---------------------------------------------------------------------------
export async function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>,
) {
  try {
    if (Platform.OS === "web") {
      // ── Web: Firebase JS SDK ──────────────────────────────────────────────
      const analytics = await getWebAnalytics();
      if (analytics) {
        logEvent(analytics, eventName, params);
      }
    } else {
      // ── Native (Android/iOS): @react-native-firebase/analytics ────────────
      const nativeAnalytics = await getNativeAnalytics();
      if (nativeAnalytics) {
        await nativeAnalytics.logEvent(eventName, params ?? {});
      } else if (__DEV__) {
        // In Expo Go dev mode — show in console so you can verify events fire
        console.log(`[Firebase Analytics] ${eventName}`, params ?? {});
      }
    }
  } catch {
    // Non-fatal — analytics failures must never break the app
  }
}

// ---------------------------------------------------------------------------
// Firestore helpers
// ---------------------------------------------------------------------------
export interface PremiumRecord {
  userId: string;
  isPremium: boolean;
  paymentId: string;
  orderId: string;
  plan: "trial" | "monthly";
  amount: number;
  date: ReturnType<typeof serverTimestamp> | null;
}

export async function storePremiumStatus(record: Omit<PremiumRecord, "date">) {
  try {
    const ref = doc(db, "users", record.userId);
    await setDoc(
      ref,
      {
        ...record,
        isPremium: true,
        date: serverTimestamp(),
      },
      { merge: true },
    );
    return true;
  } catch (err) {
    console.warn("[Firebase] Failed to store premium status:", err);
    return false;
  }
}

export async function getPremiumStatus(userId: string): Promise<boolean> {
  try {
    const ref = doc(db, "users", userId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data() as PremiumRecord;
      return data.isPremium === true;
    }
    return false;
  } catch {
    return false;
  }
}

export { db, app };
