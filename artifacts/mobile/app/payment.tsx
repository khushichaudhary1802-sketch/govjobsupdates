import * as Haptics from "expo-haptics";
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

import Icon from "@/components/Icon";
import Colors from "@/constants/colors";
import { useApp, type PaymentInfo } from "@/context/AppContext";
import {
  trackBuyPremiumClick,
  trackBuyPremiumSuccess,
  trackPaymentFailed,
} from "@/services/analytics";
import {
  createSubscription,
  verifyPayment,
  openRazorpayCheckout,
} from "@/services/razorpay";

const C = Colors.light;

const PERKS = [
  { emoji: "🔔", text: "Real-time job alerts" },
  { emoji: "🎯", text: "Advanced filtering by state & category" },
  { emoji: "🔖", text: "Unlimited bookmarks" },
  { emoji: "🌐", text: "Apply via official website" },
  { emoji: "📈", text: "10,000+ government jobs updated daily" },
  { emoji: "✅", text: "Verified & authentic listings only" },
];

const PLAN_AMOUNT = { trial: 1, monthly: 249 };

export default function PaymentScreen() {
  const { activateTrialSubscription, activateFullSubscription, userId } = useApp();
  const insets = useSafeAreaInsets();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"trial" | "monthly">("trial");

  const topPadding = Platform.OS === "web" ? 67 : insets.top + 20;

  const handleSubscribe = async () => {
    if (isProcessing) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    await trackBuyPremiumClick(selectedPlan);
    setIsProcessing(true);

    try {
      const amount = PLAN_AMOUNT[selectedPlan];
      const description =
        selectedPlan === "trial"
          ? "1-Day Trial – Full Access (₹249/mo after)"
          : "Monthly Subscription – Full Access";

      // All platforms use Razorpay Payment Links (hosted on rzp.io — no domain restriction)
      const paymentResult = await openRazorpayCheckout({
        amount: amount * 100, // paise
        currency: "INR",
        name: "SarkariNaukri Premium",
        description,
        prefill: {},
      });

      // Verify payment signature (non-fatal)
      await verifyPayment(paymentResult);

      const paymentInfo: PaymentInfo = {
        paymentId: paymentResult.razorpay_payment_id,
        orderId: paymentResult.razorpay_order_id ?? "",
        plan: selectedPlan,
        amount,
      };

      if (selectedPlan === "trial") {
        // After ₹1 payment — create the ₹249/month recurring subscription
        const subscription = await createSubscription({
          userId,
          paymentId: paymentResult.razorpay_payment_id,
        });

        await activateTrialSubscription(paymentInfo);

        await trackBuyPremiumSuccess({
          plan: selectedPlan,
          paymentId: paymentResult.razorpay_payment_id,
          orderId: paymentResult.razorpay_order_id ?? "",
          amount,
        });

        const nextChargeDate = subscription
          ? new Date(subscription.startAt * 1000).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })
          : "tomorrow";

        Alert.alert(
          "Trial Activated! 🎉",
          `Your 24-hour free trial starts now.\n\n₹249/month subscription begins on ${nextChargeDate} and renews automatically. Cancel anytime from Razorpay.`,
          [{ text: "Start Exploring", onPress: () => router.replace("/(tabs)/") }]
        );
      } else {
        // 4b. Direct ₹249 monthly payment — activate immediately
        await activateFullSubscription(paymentInfo);

        await trackBuyPremiumSuccess({
          plan: selectedPlan,
          paymentId: paymentResult.razorpay_payment_id,
          orderId: paymentResult.razorpay_order_id ?? "",
          amount,
        });

        Alert.alert(
          "Subscription Active! 👑",
          "Welcome to SarkariNaukri Premium! You have full access to all features.",
          [{ text: "Start Exploring", onPress: () => router.replace("/(tabs)/") }]
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Payment failed";

      if (msg === "Payment cancelled" || msg === "Payment not completed") {
        // User dismissed payment — don't show error
        setIsProcessing(false);
        return;
      }

      await trackPaymentFailed(selectedPlan);
      Alert.alert(
        "Payment Failed",
        `Something went wrong: ${msg}. Please try again.`,
        [{ text: "OK" }]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 24 },
        ]}
      >
        <View style={styles.headerSection}>
          <View style={styles.crownContainer}>
            <Text style={styles.crownEmoji}>👑</Text>
          </View>
          <Text style={styles.title}>Unlock Full Access</Text>
          <Text style={styles.subtitle}>
            India's most comprehensive government job platform. Never miss an
            opportunity again.
          </Text>
        </View>

        <View style={styles.perksCard}>
          {PERKS.map((perk, i) => (
            <View key={i} style={styles.perkRow}>
              <View style={styles.perkIcon}>
                <Text style={styles.perkEmoji}>{perk.emoji}</Text>
              </View>
              <Text style={styles.perkText}>{perk.text}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.plansLabel}>Choose Your Plan</Text>

        <TouchableOpacity
          style={[styles.planCard, selectedPlan === "trial" && styles.planCardSelected]}
          onPress={() => { setSelectedPlan("trial"); Haptics.selectionAsync(); }}
        >
          <View style={styles.planHeader}>
            <View>
              <Text style={styles.planName}>1-Day Trial</Text>
              <Text style={styles.planDesc}>Then ₹249/month</Text>
            </View>
            <View style={styles.planPriceBox}>
              <Text style={styles.planPrice}>₹1</Text>
              <Text style={styles.planPricePer}>/ day</Text>
            </View>
          </View>
          {selectedPlan === "trial" && (
            <View style={styles.bestValueBadge}>
              <Text style={styles.bestValueText}>BEST START</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.planCard, selectedPlan === "monthly" && styles.planCardSelected]}
          onPress={() => { setSelectedPlan("monthly"); Haptics.selectionAsync(); }}
        >
          <View style={styles.planHeader}>
            <View>
              <Text style={styles.planName}>Monthly Plan</Text>
              <Text style={styles.planDesc}>Auto-renews every month</Text>
            </View>
            <View style={styles.planPriceBox}>
              <Text style={styles.planPrice}>₹249</Text>
              <Text style={styles.planPricePer}>/ month</Text>
            </View>
          </View>
          {selectedPlan === "monthly" && (
            <View style={styles.bestValueBadge}>
              <Text style={styles.bestValueText}>FULL ACCESS</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.securityRow}>
          <Text style={styles.securityIcon}>🔒</Text>
          <Text style={styles.securityText}>Secured by Razorpay · 256-bit SSL</Text>
        </View>

        <TouchableOpacity
          style={[styles.subscribeButton, isProcessing && styles.buttonDisabled]}
          onPress={handleSubscribe}
          disabled={isProcessing}
          activeOpacity={0.85}
        >
          <Text style={styles.subscribeText}>
            {isProcessing
              ? "Processing..."
              : selectedPlan === "trial"
              ? "Pay ₹1 & Start Trial"
              : "Subscribe for ₹249/month"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.replace("/(tabs)/")}
          style={styles.skipButton}
        >
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Secure payment powered by Razorpay. Cancel anytime. By subscribing, you agree
          to our Terms of Service and Privacy Policy. Subscription auto-renews unless
          cancelled 24 hours before the renewal date.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  content: { paddingHorizontal: 20 },
  headerSection: { alignItems: "center", marginBottom: 24 },
  crownContainer: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: "#FFF8E1",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: C.accent,
  },
  crownEmoji: { fontSize: 36 },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: C.text,
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: C.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  perksCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: C.border,
    gap: 12,
  },
  perkRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  perkIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.chip,
    justifyContent: "center",
    alignItems: "center",
  },
  perkEmoji: { fontSize: 18 },
  perkText: { fontSize: 14, color: C.text, flex: 1, fontWeight: "500" },
  plansLabel: { fontSize: 16, fontWeight: "700", color: C.text, marginBottom: 12 },
  planCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: C.border,
    position: "relative",
    overflow: "hidden",
  },
  planCardSelected: { borderColor: C.primary, backgroundColor: "#EAF0FB" },
  planHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  planName: { fontSize: 17, fontWeight: "800", color: C.text, marginBottom: 4 },
  planDesc: { fontSize: 12, color: C.textSecondary },
  planPriceBox: { alignItems: "flex-end" },
  planPrice: { fontSize: 28, fontWeight: "900", color: C.primary },
  planPricePer: { fontSize: 12, color: C.textSecondary },
  bestValueBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: C.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomLeftRadius: 10,
  },
  bestValueText: { color: "#fff", fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
  securityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 16,
    marginTop: 4,
  },
  securityIcon: { fontSize: 14 },
  securityText: { fontSize: 12, color: C.textSecondary, fontWeight: "500" },
  subscribeButton: {
    backgroundColor: C.primary,
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: "center",
    marginBottom: 12,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonDisabled: { opacity: 0.6 },
  subscribeText: { fontSize: 17, fontWeight: "800", color: "#fff" },
  skipButton: { alignItems: "center", paddingVertical: 12, marginBottom: 16 },
  skipText: { fontSize: 14, color: C.textSecondary, fontWeight: "600" },
  disclaimer: { fontSize: 11, color: C.textMuted, textAlign: "center", lineHeight: 16 },
});
