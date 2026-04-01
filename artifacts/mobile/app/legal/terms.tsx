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
const PACKAGE = "enhancore.fix.ai.skin.enhancer.photo.editor";
const CONTACT_EMAIL = "priyankagoswami0398@gmail.com";

export default function TermsOfServiceScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Terms & Conditions</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Platform.OS === "web" ? 40 : insets.bottom + 40 },
        ]}
      >
        <Text style={styles.appName}>{APP_NAME}</Text>
        <Text style={styles.lastUpdated}>Effective Date: {LAST_UPDATED}</Text>
        <Text style={styles.intro}>
          {`Welcome to ${APP_NAME} (package name: ${PACKAGE}). By downloading, installing, or using this application, you agree to comply with and be bound by the following Terms & Conditions.`}
        </Text>

        <Section title="1. Acceptance of Terms">
          {`By accessing or using this app, you agree to be legally bound by these Terms. If you do not agree, please do not use the app.`}
        </Section>

        <Section title="2. App Description">
          {`${APP_NAME} provides users with:\n\n• Government job notifications\n• Job-related information\n• Redirects to official websites for application\n\n⚠️ This app is not affiliated with any government organization.`}
        </Section>

        <Section title="3. User Responsibilities">
          {`You agree to:\n\n• Use the app only for lawful purposes\n• Not misuse or attempt to hack the app\n• Provide accurate information when required\n• Not copy, modify, or distribute app content without permission`}
        </Section>

        <Section title="4. Subscription & Payments">
          {`The app may require payment to unlock features.\nPayments are securely processed via Razorpay.\n\nBy purchasing, you agree to:\n• Pay applicable charges\n• Subscription terms (if applicable)\n\nImportant:\n• All payments are final and non-refundable, unless required by law\n• Subscription validity depends on the selected plan`}
        </Section>

        <Section title="5. Access & Restrictions">
          {`• The app is locked by default\n• Access is granted only after successful payment\n\nWe reserve the right to:\n• Modify or discontinue features\n• Restrict access in case of misuse`}
        </Section>

        <Section title="6. External Links">
          {`The app may redirect users to third-party or government websites.\nWe are not responsible for:\n\n• Content accuracy on external sites\n• Any loss or damage caused by third-party services`}
        </Section>

        <Section title="7. Intellectual Property">
          {`All app content (design, logo, text) is owned by us.\nUnauthorized use, copying, or reproduction is strictly prohibited.`}
        </Section>

        <Section title="8. Limitation of Liability">
          {`We are not responsible for:\n\n• Any errors or outdated job information\n• Losses arising from reliance on app content\n• Technical issues, downtime, or interruptions`}
        </Section>

        <Section title="9. Termination">
          {`We may suspend or terminate access if:\n\n• Terms are violated\n• Fraud or misuse is detected`}
        </Section>

        <Section title="10. Privacy">
          {`Your use of the app is also governed by our Privacy Policy.`}
        </Section>

        <Section title="11. Changes to Terms">
          {`We reserve the right to update these Terms at any time.\nContinued use of the app means you accept the updated terms.`}
        </Section>

        <Section title="12. Governing Law">
          {`These Terms shall be governed by the laws of India.`}
        </Section>

        <Section title="13. Contact Information">
          {`For any questions or concerns:\n\n📧 Email: ${CONTACT_EMAIL}`}
        </Section>

        <Text style={styles.disclaimer}>
          ⚠️ Disclaimer{"\n"}
          This app is not a government app.{"\n"}
          All job information is collected from publicly available sources.{"\n"}
          Users should always verify details on official websites.
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
  appName: { fontSize: 17, fontWeight: "800", color: C.primary },
  lastUpdated: { fontSize: 12, color: C.textMuted, marginTop: -8 },
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
