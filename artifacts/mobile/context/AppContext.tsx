import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
  userId: string;
  activateTrialSubscription: (payment: PaymentInfo) => Promise<void>;
  activateFullSubscription: (payment: PaymentInfo) => Promise<void>;
  isLoading: boolean;
  hasCompletedOnboarding: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEYS = {
  PREFERENCES: "@govtjobs_preferences",
  BOOKMARKS: "@govtjobs_bookmarks",
  SUBSCRIPTION_STATUS: "@govtjobs_subscription_status",
  TRIAL_START_DATE: "@govtjobs_trial_start",
  ONBOARDING_DONE: "@govtjobs_onboarding_done",
  USER_ID: "@govtjobs_user_id",
};

function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferencesState] = useState<UserPreferences | null>(null);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>("none");
  const [trialStartDate, setTrialStartDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    loadStoredData();
  }, []);

  const loadStoredData = async () => {
    try {
      const [prefsRaw, bookmarksRaw, subStatus, trialStart, onboardingDone, userIdRaw] =
        await AsyncStorage.multiGet([
          STORAGE_KEYS.PREFERENCES,
          STORAGE_KEYS.BOOKMARKS,
          STORAGE_KEYS.SUBSCRIPTION_STATUS,
          STORAGE_KEYS.TRIAL_START_DATE,
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

      if (prefsRaw[1]) setPreferencesState(JSON.parse(prefsRaw[1]));
      if (bookmarksRaw[1]) setBookmarks(new Set(JSON.parse(bookmarksRaw[1]) as string[]));

      if (subStatus[1]) {
        const status = subStatus[1] as SubscriptionStatus;
        if (status === "trial" && trialStart[1]) {
          const start = new Date(trialStart[1]);
          const now = new Date();
          const diffMs = now.getTime() - start.getTime();
          const diffDays = diffMs / (1000 * 60 * 60 * 24);
          if (diffDays > 1) {
            setSubscriptionStatus("expired");
          } else {
            setSubscriptionStatus("trial");
          }
        } else {
          setSubscriptionStatus(status);
        }
      }
      if (trialStart[1]) setTrialStartDate(trialStart[1]);
      if (onboardingDone[1] === "true") setHasCompletedOnboarding(true);
    } catch {
      // Silently handle storage errors
    } finally {
      setIsLoading(false);
    }
  };

  const setPreferences = useCallback(async (prefs: UserPreferences) => {
    setPreferencesState(prefs);
    setHasCompletedOnboarding(true);
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.PREFERENCES, JSON.stringify(prefs)],
      [STORAGE_KEYS.ONBOARDING_DONE, "true"],
    ]);
  }, []);

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

  const activateTrialSubscription = useCallback(
    async (payment: PaymentInfo) => {
      const now = new Date().toISOString();
      setSubscriptionStatus("trial");
      setTrialStartDate(now);
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.SUBSCRIPTION_STATUS, "trial"],
        [STORAGE_KEYS.TRIAL_START_DATE, now],
      ]);
      // Store to Firebase
      await storePremiumStatus({
        userId,
        isPremium: true,
        paymentId: payment.paymentId,
        orderId: payment.orderId,
        plan: payment.plan,
        amount: payment.amount,
      });
    },
    [userId]
  );

  const activateFullSubscription = useCallback(
    async (payment: PaymentInfo) => {
      setSubscriptionStatus("active");
      await AsyncStorage.setItem(STORAGE_KEYS.SUBSCRIPTION_STATUS, "active");
      // Store to Firebase
      await storePremiumStatus({
        userId,
        isPremium: true,
        paymentId: payment.paymentId,
        orderId: payment.orderId,
        plan: payment.plan,
        amount: payment.amount,
      });
    },
    [userId]
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
        userId,
        activateTrialSubscription,
        activateFullSubscription,
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
