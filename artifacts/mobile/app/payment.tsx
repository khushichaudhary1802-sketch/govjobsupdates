import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp, type PaymentInfo } from "@/context/AppContext";
import {
  trackInAppPurchaseInitiated,
  trackInAppPurchaseSuccess,
  trackPaymentFailed,
} from "@/services/analytics";
import { openSubscriptionCheckout } from "@/services/razorpay";

const PERKS = [
  "Real-time government job alerts",
  "Advanced filtering by state & category",
  "Unlimited bookmarks",
  "Apply via official website",
  "10,000+ jobs updated daily",
  "Verified & authentic listings only",
];

export default function PaymentScreen() {
  const { activateTrialSubscription, refreshSubscription, userId, skipPayment } = useApp();
  const insets = useSafeAreaInsets();
  const [isProcessing, setIsProcessing] = useState(false);

  const topPadding = Platform.OS === "web" ? 16 : insets.top + 8;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom + 24;

  const handleLater = () => {
    skipPayment();
    router.replace("/(tabs)/");
  };

  const handleSubscribe = async () => {
    if (isProcessing) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await trackInAppPurchaseInitiated({ plan: "trial", value: 1 });
    setIsProcessing(true);

    try {
      const subscription = await openSubscriptionCheckout({ userId });

      const paymentInfo: PaymentInfo = {
        paymentId: subscription.paymentId ?? subscription.subscriptionId,
        orderId: subscription.subscriptionId,
        plan: "trial",
        amount: 1,
      };

      // Activate locally immediately for instant UI unlock
      await activateTrialSubscription(paymentInfo);

      // Sync with server to confirm and get accurate trialEnd from backend
      void refreshSubscription();

      await trackInAppPurchaseSuccess({
        plan: "trial",
        transactionId: subscription.paymentId ?? subscription.subscriptionId,
        value: 1,
        orderId: subscription.subscriptionId,
      });

      const nextChargeDate = new Date(subscription.startAt * 1000).toLocaleDateString(
        "en-IN",
        { day: "numeric", month: "long", year: "numeric" }
      );

      Alert.alert(
        "Trial Activated! 🎉",
        `Your 3-day trial has started.\n\n₹249 will be auto-debited on ${nextChargeDate} and every month after. Cancel anytime via Razorpay.`,
        [{ text: "Explore Jobs", onPress: () => router.replace("/(tabs)/") }]
      );
    } catch (err: unknown) {
      // Handle both Error objects and Razorpay native SDK error objects { code, description }
      const rzpErr = err as { code?: number; description?: string } | null;
      const msg =
        err instanceof Error
          ? err.message
          : typeof rzpErr?.description === "string"
          ? rzpErr.description
          : "Payment failed";

      // User cancelled — silent, just re-enable the button
      const userCancelled =
        msg === "Payment cancelled" ||
        msg === "Payment not completed" ||
        msg === "Subscription not activated" ||
        msg.toLowerCase().includes("cancel") ||
        rzpErr?.code === 0;

      if (userCancelled) {
        setIsProcessing(false);
        return;
      }

      await trackPaymentFailed("trial");
      Alert.alert(
        "Payment Failed",
        `Something went wrong. Please try again.\n\n${msg}`,
        [{ text: "OK" }]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      {/* ✕ Close / Later button */}
      <View style={styles.topBar}>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          onPress={handleLater}
          style={styles.closeBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
      >
        {/* Lock icon */}
        <View style={styles.lockBadge}>
          <Text style={styles.lockIcon}>🔒</Text>
          <Text style={styles.lockLabel}>PREMIUM ACCESS</Text>
        </View>

        {/* Hero pricing */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Try 3 days for</Text>
          <Text style={styles.heroPrice}>₹1</Text>
          <Text style={styles.heroSub}>Then ₹249/month</Text>
          <Text style={styles.cancelText}>Cancel Anytime</Text>
        </View>

        {/* Perks */}
        <View style={styles.perksSection}>
          {PERKS.map((perk, i) => (
            <View key={i} style={styles.perkRow}>
              <View style={styles.checkCircle}>
                <Text style={styles.checkMark}>✓</Text>
              </View>
              <Text style={styles.perkText}>{perk}</Text>
            </View>
          ))}
        </View>

        {/* Footer CTA */}
        <Text style={styles.trialNote}>
          Try for 3 days and{" "}
          <Text style={styles.trialNoteLink}>cancel anytime</Text>
        </Text>

        <TouchableOpacity
          onPress={handleSubscribe}
          disabled={isProcessing}
          activeOpacity={0.88}
        >
          <LinearGradient
            colors={["#4F46E5", "#7C3AED", "#DB2777", "#F97316"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.ctaButton, isProcessing && styles.ctaDisabled]}
          >
            <Text style={styles.ctaPrice}>₹1</Text>
            <Text style={styles.ctaLabel}>
              {isProcessing ? "Processing..." : "START TRIAL  →"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Secured by Razorpay · 256-bit SSL. Subscription auto-renews at ₹249/month
          after the 3-day trial unless cancelled.
        </Text>

        <TouchableOpacity onPress={handleLater} activeOpacity={0.7} style={styles.laterBtn}>
          <Text style={styles.laterText}>Maybe Later</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1E293B",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  closeIcon: {
    fontSize: 16,
    color: "#94A3B8",
    fontWeight: "600",
    lineHeight: 18,
  },
  content: {
    paddingHorizontal: 24,
    alignItems: "center",
  },
  laterBtn: {
    marginTop: 16,
    paddingVertical: 8,
  },
  laterText: {
    fontSize: 14,
    color: "#475569",
    textDecorationLine: "underline",
    textAlign: "center",
  },

  lockBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1E293B",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#334155",
  },
  lockIcon: { fontSize: 16 },
  lockLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 1.5,
  },

  heroSection: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 8,
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  heroPrice: {
    fontSize: 110,
    fontWeight: "900",
    color: "#fff",
    textAlign: "center",
    lineHeight: 120,
    letterSpacing: -4,
  },
  heroSub: {
    fontSize: 26,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    marginTop: 4,
  },
  cancelText: {
    fontSize: 16,
    color: "#60A5FA",
    fontWeight: "600",
    marginTop: 6,
    textDecorationLine: "underline",
  },

  perksSection: {
    width: "100%",
    marginTop: 24,
    marginBottom: 8,
    gap: 14,
  },
  perkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#1E293B",
    borderWidth: 1.5,
    borderColor: "#475569",
    justifyContent: "center",
    alignItems: "center",
  },
  checkMark: {
    fontSize: 14,
    color: "#94A3B8",
    fontWeight: "700",
    lineHeight: 16,
  },
  perkText: {
    fontSize: 16,
    color: "#E2E8F0",
    fontWeight: "500",
    flex: 1,
  },

  trialNote: {
    color: "#64748B",
    fontSize: 13,
    textAlign: "center",
    marginTop: 24,
    marginBottom: 14,
  },
  trialNoteLink: {
    color: "#60A5FA",
    textDecorationLine: "underline",
  },

  ctaButton: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 50,
    paddingVertical: 20,
    paddingHorizontal: 28,
    minWidth: 320,
  },
  ctaDisabled: { opacity: 0.6 },
  ctaPrice: {
    fontSize: 22,
    fontWeight: "900",
    color: "#fff",
  },
  ctaLabel: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.5,
  },

  disclaimer: {
    fontSize: 11,
    color: "#475569",
    textAlign: "center",
    lineHeight: 16,
    marginTop: 20,
    paddingHorizontal: 8,
  },
});
