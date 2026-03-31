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

import Colors from "@/constants/colors";
import { useApp, type PaymentInfo } from "@/context/AppContext";
import {
  trackBuyPremiumClick,
  trackBuyPremiumSuccess,
  trackPaymentFailed,
} from "@/services/analytics";
import { openSubscriptionCheckout } from "@/services/razorpay";

const C = Colors.light;

const PERKS = [
  { emoji: "🔔", text: "Real-time job alerts" },
  { emoji: "🎯", text: "Advanced filtering by state & category" },
  { emoji: "🔖", text: "Unlimited bookmarks" },
  { emoji: "🌐", text: "Apply via official website" },
  { emoji: "📈", text: "10,000+ government jobs updated daily" },
  { emoji: "✅", text: "Verified & authentic listings only" },
];

export default function PaymentScreen() {
  const { activateTrialSubscription, userId } = useApp();
  const insets = useSafeAreaInsets();
  const [isProcessing, setIsProcessing] = useState(false);

  const topPadding = Platform.OS === "web" ? 67 : insets.top + 20;

  const handleSubscribe = async () => {
    if (isProcessing) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await trackBuyPremiumClick("trial");
    setIsProcessing(true);

    try {
      // Opens Razorpay-hosted subscription page on rzp.io:
      // - Shows ₹1 trial fee charged today
      // - Shows ₹249/month recurring mandate starting after 3 days
      // - User approves both in one screen (UPI AutoPay / card mandate)
      const subscription = await openSubscriptionCheckout({ userId });

      const paymentInfo: PaymentInfo = {
        paymentId: subscription.paymentId ?? subscription.subscriptionId,
        orderId: subscription.subscriptionId,
        plan: "trial",
        amount: 1,
      };

      await activateTrialSubscription(paymentInfo);

      await trackBuyPremiumSuccess({
        plan: "trial",
        paymentId: subscription.paymentId ?? subscription.subscriptionId,
        orderId: subscription.subscriptionId,
        amount: 1,
      });

      const nextChargeDate = new Date(subscription.startAt * 1000).toLocaleDateString(
        "en-IN",
        { day: "numeric", month: "long", year: "numeric" }
      );

      Alert.alert(
        "Trial Activated! 🎉",
        `Your 3-day free trial has started.\n\n₹249 will be auto-debited on ${nextChargeDate} and every month after. Cancel anytime via Razorpay.`,
        [{ text: "Explore Jobs", onPress: () => router.replace("/(tabs)/") }]
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Payment failed";

      if (
        msg === "Payment cancelled" ||
        msg === "Payment not completed" ||
        msg === "Subscription not activated"
      ) {
        setIsProcessing(false);
        return;
      }

      await trackPaymentFailed("trial");
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
        {/* Header */}
        <View style={styles.headerSection}>
          <View style={styles.crownContainer}>
            <Text style={styles.crownEmoji}>👑</Text>
          </View>
          <Text style={styles.title}>Unlock Full Access</Text>
          <Text style={styles.subtitle}>
            India's most comprehensive government job platform.{"\n"}Never miss
            an opportunity again.
          </Text>
        </View>

        {/* Pricing highlight */}
        <View style={styles.pricingCard}>
          <View style={styles.pricingRow}>
            <View>
              <Text style={styles.trialLabel}>3-Day Free Trial</Text>
              <Text style={styles.thenText}>Then ₹249/month — cancel anytime</Text>
            </View>
            <View style={styles.priceBox}>
              <Text style={styles.priceAmount}>₹1</Text>
              <Text style={styles.priceNote}>today</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.recurringRow}>
            <Text style={styles.recurringIcon}>🔄</Text>
            <Text style={styles.recurringText}>
              Auto-renews at ₹249/month after trial · Charged to your UPI / card
            </Text>
          </View>
        </View>

        {/* Perks */}
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

        {/* CTA */}
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
            {isProcessing ? "Processing..." : "Start 3-Day Trial for ₹1"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.subCta}>
          After 3 days, ₹249 is auto-debited every month
        </Text>

        <TouchableOpacity
          onPress={() => router.replace("/(tabs)/")}
          style={styles.skipButton}
        >
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Secure payment powered by Razorpay. By subscribing, you agree to our
          Terms of Service. Subscription auto-renews monthly unless cancelled at
          least 24 hours before the next renewal date.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  content: { paddingHorizontal: 20 },

  headerSection: { alignItems: "center", marginBottom: 20 },
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

  pricingCard: {
    backgroundColor: "#EAF0FB",
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: C.primary,
  },
  pricingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  trialLabel: { fontSize: 18, fontWeight: "800", color: C.primary },
  thenText: { fontSize: 12, color: C.textSecondary, marginTop: 3 },
  priceBox: { alignItems: "flex-end" },
  priceAmount: { fontSize: 36, fontWeight: "900", color: C.primary },
  priceNote: { fontSize: 12, color: C.textSecondary },
  divider: { height: 1, backgroundColor: "#C5D5EE", marginBottom: 12 },
  recurringRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  recurringIcon: { fontSize: 14, marginTop: 1 },
  recurringText: { fontSize: 12, color: C.text, flex: 1, lineHeight: 17 },

  perksCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
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

  securityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 12,
  },
  securityIcon: { fontSize: 14 },
  securityText: { fontSize: 12, color: C.textSecondary, fontWeight: "500" },

  subscribeButton: {
    backgroundColor: C.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    marginBottom: 8,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonDisabled: { opacity: 0.6 },
  subscribeText: { fontSize: 18, fontWeight: "800", color: "#fff" },

  subCta: {
    textAlign: "center",
    fontSize: 12,
    color: C.textSecondary,
    marginBottom: 16,
  },

  skipButton: { alignItems: "center", paddingVertical: 10, marginBottom: 16 },
  skipText: { fontSize: 14, color: C.textSecondary, fontWeight: "600" },
  disclaimer: { fontSize: 11, color: C.textMuted, textAlign: "center", lineHeight: 16 },
});
