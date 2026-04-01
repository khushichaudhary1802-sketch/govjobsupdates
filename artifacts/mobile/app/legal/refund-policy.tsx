import { router } from "expo-router";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";

const C = Colors.light;
const LAST_UPDATED = "April 1, 2026";
const APP_NAME = "GovJobAlert – Sarkari Naukri";
const CONTACT_EMAIL = "priyankagoswami0398@gmail.com";

export default function RefundPolicyScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Refund & Cancellation</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Platform.OS === "web" ? 40 : insets.bottom + 40 },
        ]}
      >
        <Text style={styles.emoji}>💳</Text>
        <Text style={styles.appName}>Refund & Cancellation Policy</Text>
        <Text style={styles.subName}>{APP_NAME}</Text>
        <Text style={styles.lastUpdated}>Effective Date: {LAST_UPDATED}</Text>
        <Text style={styles.intro}>
          This Refund & Cancellation Policy outlines the terms for payments made in {APP_NAME}.
        </Text>

        <Section title="1. Payments">
          {`• All payments in the app are processed securely via Razorpay\n• By purchasing a plan or subscription, you agree to this Refund Policy`}
        </Section>

        <Section title="2. No Refund Policy">
          {`• All payments are final and non-refundable, except where required by applicable law\n• Once a subscription or plan is activated, no refunds will be issued`}
        </Section>

        <Section title="3. Exceptions (If Applicable)">
          {`Refunds may be considered only in the following cases:\n\n• Duplicate payment made by mistake\n• Payment deducted but service not activated\n• Technical error caused by the app\n\n👉 In such cases, users must contact support within 3–5 days of payment`}
        </Section>

        <Section title="4. Subscription Cancellation">
          {`Users can request cancellation by contacting support.\n\nCancellation will:\n• Stop future billing (if applicable)\n• Not affect current active subscription period`}
        </Section>

        <Section title="5. Processing of Refunds">
          {`• Approved refunds (if any) will be processed via Razorpay\n• Refunds may take 5–10 business days to reflect in the original payment method`}
        </Section>

        <Section title="6. Contact for Refunds">
          {`To request a refund or report an issue, contact:\n\n📧 Email: ${CONTACT_EMAIL}\n\nInclude:\n• Payment details (Transaction ID)\n• Issue description\n• Date of transaction`}
        </Section>

        <Section title="7. Important Notes">
          {`• We reserve the right to approve or reject refund requests based on verification\n• Abuse of refund policy may result in account suspension`}
        </Section>

        <Text style={styles.disclaimer}>
          ⚠️ Disclaimer{"\n"}
          {APP_NAME} is not affiliated with any government organization.{"\n"}
          All job data is sourced from publicly available platforms.
        </Text>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>📌 {title}</Text>
      <Text style={styles.body}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: { width: 40, alignItems: "flex-start" },
  backIcon: { fontSize: 22, color: C.primary, fontWeight: "700" },
  title: { fontSize: 18, fontWeight: "800", color: C.text },
  content: { paddingHorizontal: 20, paddingTop: 20, gap: 20 },
  emoji: { fontSize: 36, textAlign: "center" },
  appName: { fontSize: 17, fontWeight: "800", color: C.primary, textAlign: "center" },
  subName: { fontSize: 13, color: C.textSecondary, textAlign: "center", marginTop: -8 },
  lastUpdated: { fontSize: 12, color: C.textMuted, textAlign: "center" },
  intro: { fontSize: 14, color: C.textSecondary, lineHeight: 22 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: C.text },
  body: { fontSize: 14, color: C.textSecondary, lineHeight: 22 },
  disclaimer: {
    fontSize: 13,
    color: C.textMuted,
    lineHeight: 20,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 16,
    fontStyle: "italic",
  },
});
