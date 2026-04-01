import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { storePremiumStatus } from "@/services/firebase";

export type JobType =
  | "All India Govt Jobs"
  | "State Govt Jobs"
  | "Bank Jobs"
  | "Teaching Jobs"
  | "Engineering Jobs"
  | "Railway Jobs"
  | "Police/Defence Jobs";

export interface UserPreferences {
  state: string;
  district: string;
  jobTypes: JobType[];
}

export interface Job {
  id: string;
  title: string;
  organization: string;
  jobType: JobType;
  state: string;
  district: string;
  lastDate: string;
  vacancies: number;
  qualification: string;
  salaryMin: number;
  salaryMax: number;
  applyUrl: string;
  description: string;
  eligibility: string;
  isNew: boolean;
  postedDate: string;
  category: string;
}

export type SubscriptionStatus = "trial" | "active" | "expired" | "none";

export interface PaymentInfo {
  paymentId: string;
  orderId: string;
  plan: "trial" | "monthly";
  amount: number;
}

export interface AppContextType {
  preferences: UserPreferences | null;
  setPreferences: (prefs: UserPreferences) => Promise<void>;
  bookmarks: Set<string>;
  toggleBookmark: (jobId: string) => Promise<void>;
  subscriptionStatus: SubscriptionStatus;
  trialStartDate: string | null;
  trialEndDate: string | null;
  userId: string;
  activateTrialSubscription: (payment: PaymentInfo) => Promise<void>;
  activateFullSubscription: (payment: PaymentInfo) => Promise<void>;
  refreshSubscription: () => Promise<void>;
  isLoading: boolean;
  hasCompletedOnboarding: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEYS = {
  PREFERENCES: "@govtjobs_preferences",
  BOOKMARKS: "@govtjobs_bookmarks",
  SUBSCRIPTION_STATUS: "@govtjobs_subscription_status",
  TRIAL_START_DATE: "@govtjobs_trial_start",
  TRIAL_END_DATE: "@govtjobs_trial_end",
  ONBOARDING_DONE: "@govtjobs_onboarding_done",
  USER_ID: "@govtjobs_user_id",
};

const TRIAL_DAYS = 3;

function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function getApiBase(): string {
  const explicit = process.env["EXPO_PUBLIC_API_BASE"];
  if (explicit) return explicit;
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return window.location.origin;
  }
  return "http://localhost:8080";
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferencesState] = useState<UserPreferences | null>(null);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>("none");
  const [trialStartDate, setTrialStartDate] = useState<string | null>(null);
  const [trialEndDate, setTrialEndDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [userId, setUserId] = useState<string>("");

  // Keep a ref so callbacks always see current userId
  const userIdRef = useRef<string>("");

  useEffect(() => {
    loadStoredData();
  }, []);

  // ------------------------------------------------------------
  // Helper: evaluate trial window
  // ------------------------------------------------------------
  function evalTrialStatus(trialStartIso: string): SubscriptionStatus {
    const start = new Date(trialStartIso);
    const diffMs = Date.now() - start.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays > TRIAL_DAYS ? "expired" : "trial";
  }

  // ------------------------------------------------------------
  // Load from AsyncStorage — fast local cache
  // ------------------------------------------------------------
  const loadStoredData = async () => {
    try {
      const [
        prefsRaw,
        bookmarksRaw,
        subStatus,
        trialStart,
        trialEnd,
        onboardingDone,
        userIdRaw,
      ] = await AsyncStorage.multiGet([
        STORAGE_KEYS.PREFERENCES,
        STORAGE_KEYS.BOOKMARKS,
        STORAGE_KEYS.SUBSCRIPTION_STATUS,
        STORAGE_KEYS.TRIAL_START_DATE,
        STORAGE_KEYS.TRIAL_END_DATE,
        STORAGE_KEYS.ONBOARDING_DONE,
        STORAGE_KEYS.USER_ID,
      ]);

      // User ID — generate once and persist
      let uid = userIdRaw[1];
      if (!uid) {
        uid = generateUserId();
        await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, uid);
      }
      setUserId(uid);
      userIdRef.current = uid;

      if (prefsRaw[1]) setPreferencesState(JSON.parse(prefsRaw[1]));
      if (bookmarksRaw[1]) setBookmarks(new Set(JSON.parse(bookmarksRaw[1]) as string[]));
      if (trialStart[1]) setTrialStartDate(trialStart[1]);
      if (trialEnd[1]) setTrialEndDate(trialEnd[1]);
      if (onboardingDone[1] === "true") setHasCompletedOnboarding(true);

      // Evaluate subscription status from local cache
      if (subStatus[1]) {
        const cached = subStatus[1] as SubscriptionStatus;
        if (cached === "trial" && trialStart[1]) {
          setSubscriptionStatus(evalTrialStatus(trialStart[1]));
        } else {
          setSubscriptionStatus(cached);
        }
      }
    } catch {
      // Silently handle storage errors
    } finally {
      setIsLoading(false);
      // After local load finishes, sync from the server in background (non-blocking)
      // Use userIdRef.current because userId state may not be set yet here
      void syncFromServer();
    }
  };

  // ------------------------------------------------------------
  // syncFromServer — reconcile with backend (authoritative source)
  // Called on startup + after payment. Non-blocking / fail-safe.
  // ------------------------------------------------------------
  const syncFromServer = useCallback(async (uidOverride?: string) => {
    const uid = uidOverride ?? userIdRef.current;
    if (!uid) return;

    try {
      const apiBase = getApiBase();
      const resp = await fetch(
        `${apiBase}/api/user-status?uid=${encodeURIComponent(uid)}`
      );
      if (!resp.ok) return;

      const data = (await resp.json()) as {
        uid: string;
        isPremium: boolean;
        status: "active" | "failed" | "cancelled" | "pending";
        subscriptionId?: string;
        trialEnd?: number;
      };

      let serverStatus: SubscriptionStatus;
      if (data.isPremium) {
        if (data.status === "active" || data.status === "pending") {
          serverStatus = "active";
        } else {
          serverStatus = "expired";
        }
      } else if (data.status === "cancelled" || data.status === "failed") {
        serverStatus = "expired";
      } else {
        // Server doesn't know about this user yet — trust local cache
        return;
      }

      setSubscriptionStatus(serverStatus);
      await AsyncStorage.setItem(STORAGE_KEYS.SUBSCRIPTION_STATUS, serverStatus);

      if (data.trialEnd) {
        const endIso = new Date(data.trialEnd).toISOString();
        setTrialEndDate(endIso);
        await AsyncStorage.setItem(STORAGE_KEYS.TRIAL_END_DATE, endIso);
      }
    } catch {
      // Non-fatal — use local cache as fallback
    }
  }, []);

  // ------------------------------------------------------------
  // Public refresh method — callable from payment success / profile
  // ------------------------------------------------------------
  const refreshSubscription = useCallback(async () => {
    await syncFromServer(userIdRef.current);
  }, [syncFromServer]);

  // ------------------------------------------------------------
  // Preferences
  // ------------------------------------------------------------
  const setPreferences = useCallback(async (prefs: UserPreferences) => {
    setPreferencesState(prefs);
    setHasCompletedOnboarding(true);
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.PREFERENCES, JSON.stringify(prefs)],
      [STORAGE_KEYS.ONBOARDING_DONE, "true"],
    ]);
  }, []);

  // ------------------------------------------------------------
  // Bookmarks
  // ------------------------------------------------------------
  const toggleBookmark = useCallback(
    async (jobId: string) => {
      const newBookmarks = new Set(bookmarks);
      if (newBookmarks.has(jobId)) {
        newBookmarks.delete(jobId);
      } else {
        newBookmarks.add(jobId);
      }
      setBookmarks(newBookmarks);
      await AsyncStorage.setItem(
        STORAGE_KEYS.BOOKMARKS,
        JSON.stringify(Array.from(newBookmarks))
      );
    },
    [bookmarks]
  );

  // ------------------------------------------------------------
  // activateTrialSubscription
  // Called right after user completes ₹1 trial payment.
  // Stores locally + writes to Firebase client SDK immediately
  // so the app unlocks without waiting for webhook.
  // ------------------------------------------------------------
  const activateTrialSubscription = useCallback(
    async (payment: PaymentInfo) => {
      const now = new Date();
      const trialEnd = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
      const nowIso = now.toISOString();
      const trialEndIso = trialEnd.toISOString();

      setSubscriptionStatus("active"); // treat active after confirmed payment
      setTrialStartDate(nowIso);
      setTrialEndDate(trialEndIso);

      await AsyncStorage.multiSet([
        [STORAGE_KEYS.SUBSCRIPTION_STATUS, "active"],
        [STORAGE_KEYS.TRIAL_START_DATE, nowIso],
        [STORAGE_KEYS.TRIAL_END_DATE, trialEndIso],
      ]);

      // Write to Firebase (client SDK — non-blocking)
      void storePremiumStatus({
        userId: userIdRef.current,
        isPremium: true,
        paymentId: payment.paymentId,
        orderId: payment.orderId,
        plan: payment.plan,
        amount: payment.amount,
      });
    },
    []
  );

  // ------------------------------------------------------------
  // activateFullSubscription
  // Called when user subscribes to the full ₹249/month plan
  // (i.e. upgrades from trial or re-subscribes after expiry).
  // ------------------------------------------------------------
  const activateFullSubscription = useCallback(
    async (payment: PaymentInfo) => {
      setSubscriptionStatus("active");
      setTrialStartDate(null);
      setTrialEndDate(null);

      await AsyncStorage.multiSet([
        [STORAGE_KEYS.SUBSCRIPTION_STATUS, "active"],
        [STORAGE_KEYS.TRIAL_START_DATE, ""],
        [STORAGE_KEYS.TRIAL_END_DATE, ""],
      ]);

      void storePremiumStatus({
        userId: userIdRef.current,
        isPremium: true,
        paymentId: payment.paymentId,
        orderId: payment.orderId,
        plan: payment.plan,
        amount: payment.amount,
      });
    },
    []
  );

  return (
    <AppContext.Provider
      value={{
        preferences,
        setPreferences,
        bookmarks,
        toggleBookmark,
        subscriptionStatus,
        trialStartDate,
        trialEndDate,
        userId,
        activateTrialSubscription,
        activateFullSubscription,
        refreshSubscription,
        isLoading,
        hasCompletedOnboarding,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
