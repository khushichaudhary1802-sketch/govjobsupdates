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
const APP_NAME = "SarkariNaukri";
const CONTACT_EMAIL = "support@creatorflo.app";

export default function TermsOfServiceScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Terms of Service</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Platform.OS === "web" ? 40 : insets.bottom + 40 },
        ]}
      >
        <Text style={styles.lastUpdated}>Last updated: {LAST_UPDATED}</Text>

        <Section title="1. Acceptance of Terms">
          {`By downloading, installing, or using ${APP_NAME}, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the application.`}
        </Section>

        <Section title="2. Description of Service">
          {`${APP_NAME} is a mobile application that aggregates and displays government job listings from publicly available sources in India. We provide:\n\n• Curated government job listings\n• Search and filter by state, district, and category\n• Job alerts and notifications\n• Bookmark functionality\n• Direct links to official government job application portals`}
        </Section>

        <Section title="3. Subscription & Billing">
          {`3.1 Trial Period: New users may access the app for ₹1 for a 3-day trial period.\n\n3.2 Subscription: After the trial, your subscription automatically renews at ₹249 per month unless cancelled.\n\n3.3 Payment: All payments are processed securely by Razorpay. By subscribing, you authorize us to charge your payment method on a recurring basis.\n\n3.4 Cancellation: You may cancel your subscription at any time through Razorpay. Cancellation takes effect at the end of the current billing period. No refunds are issued for partial months.\n\n3.5 Price Changes: We reserve the right to modify subscription prices with 30 days' advance notice.`}
        </Section>

        <Section title="4. Refund Policy">
          {`4.1 The ₹1 trial charge is non-refundable.\n\n4.2 Monthly subscription charges are non-refundable once processed, except where required by applicable law.\n\n4.3 If you believe you have been charged incorrectly, contact us at ${CONTACT_EMAIL} within 7 days of the charge.`}
        </Section>

        <Section title="5. Content Disclaimer">
          {`5.1 ${APP_NAME} aggregates job listings from government portals and third-party sources. We do not guarantee the accuracy, completeness, or timeliness of the information.\n\n5.2 Always verify job details from the official government website before applying.\n\n5.3 We are not affiliated with any government organization or department.\n\n5.4 We are not responsible for any actions taken based on information in the app.`}
        </Section>

        <Section title="6. User Responsibilities">
          {`You agree to:\n\n• Use the app only for lawful purposes\n• Not attempt to reverse engineer, copy, or redistribute the app\n• Not use automated tools to scrape or extract content\n• Provide accurate information when required\n• Keep your account information secure`}
        </Section>

        <Section title="7. Intellectual Property">
          {`All content, features, and functionality of ${APP_NAME} are owned by CreatorFlo and protected by Indian and international intellectual property laws. You may not reproduce, distribute, or create derivative works without express written permission.`}
        </Section>

        <Section title="8. Limitation of Liability">
          {`To the maximum extent permitted by applicable law, ${APP_NAME} and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or goodwill, arising from your use of the service.`}
        </Section>

        <Section title="9. Governing Law">
          {`These Terms are governed by the laws of India. Any disputes arising from these terms shall be subject to the exclusive jurisdiction of the courts in India.`}
        </Section>

        <Section title="10. Changes to Terms">
          {`We reserve the right to update these Terms at any time. We will provide notice of significant changes within the app. Continued use after changes constitutes acceptance.`}
        </Section>

        <Section title="11. Contact">
          {`For questions about these Terms:\n\nEmail: ${CONTACT_EMAIL}\nWebsite: https://creatorflo.app`}
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
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
  content: { paddingHorizontal: 20, paddingTop: 20, gap: 24 },
  lastUpdated: { fontSize: 12, color: C.textMuted, marginBottom: 4 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: C.text },
  body: { fontSize: 14, color: C.textSecondary, lineHeight: 22 },
});
