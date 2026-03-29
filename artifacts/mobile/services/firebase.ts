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

let analyticsInstance: ReturnType<typeof getAnalytics> | null = null;

async function getAnalyticsInstance() {
  if (Platform.OS !== "web") return null;
  if (analyticsInstance) return analyticsInstance;
  const supported = await isSupported();
  if (supported) {
    analyticsInstance = getAnalytics(app);
  }
  return analyticsInstance;
}

export async function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>,
) {
  try {
    const analytics = await getAnalyticsInstance();
    if (analytics) {
      logEvent(analytics, eventName, params);
    }
  } catch {
    // Non-fatal — analytics failures should never break the app
  }
}

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
