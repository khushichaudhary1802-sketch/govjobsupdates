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

export default function PrivacyPolicyScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Privacy Policy</Text>
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

        <Section title="1. Introduction">
          {`${APP_NAME} ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application.\n\nPlease read this policy carefully. If you disagree with its terms, please discontinue use of the application.`}
        </Section>

        <Section title="2. Information We Collect">
          {`We collect the following types of information:\n\n• Device Information: Device type, operating system version, and unique device identifiers used to provide app functionality.\n\n• Usage Data: Information about how you use the app, including screens viewed, features used, and actions taken within the app.\n\n• Payment Information: We do NOT store your payment card details. Payments are processed by Razorpay, a PCI-DSS compliant payment processor. We only store payment confirmation IDs and subscription status.\n\n• Preferences: Your selected state, district, and job category preferences stored locally on your device.\n\n• Firebase Analytics: Anonymous usage analytics to improve app performance (web only).`}
        </Section>

        <Section title="3. How We Use Your Information">
          {`We use your information to:\n\n• Provide and maintain the app's functionality\n• Process and verify payments through Razorpay\n• Manage your subscription status\n• Show personalized government job listings based on your preferences\n• Improve app performance and fix bugs\n• Send important service notifications\n• Comply with legal obligations`}
        </Section>

        <Section title="4. Data Storage & Security">
          {`• Preferences and subscription status are stored locally on your device using AsyncStorage.\n\n• Subscription verification data is stored in Google Firebase Firestore with industry-standard security rules.\n\n• We use HTTPS/TLS encryption for all data transmission.\n\n• Payment processing is handled entirely by Razorpay and is PCI-DSS Level 1 compliant. We never see or store your full payment card information.\n\n• We implement appropriate technical and organizational measures to protect your personal information.`}
        </Section>

        <Section title="5. Third-Party Services">
          {`We use the following third-party services:\n\n• Razorpay: Payment processing. Their privacy policy is available at https://razorpay.com/privacy/\n\n• Google Firebase: Backend database and analytics. Their privacy policy is available at https://firebase.google.com/support/privacy\n\n• Meta Pixel (web only): Advertising analytics on the web version.`}
        </Section>

        <Section title="6. Data Sharing">
          {`We do not sell, trade, or rent your personal information to third parties. We may share data with:\n\n• Service providers who assist in operating the app (Razorpay, Firebase)\n• Law enforcement when required by applicable law\n• Successors in a merger, acquisition, or sale of assets`}
        </Section>

        <Section title="7. Your Rights">
          {`You have the right to:\n\n• Access the personal data we hold about you\n• Request correction of inaccurate data\n• Request deletion of your data\n• Withdraw consent for data processing\n• Cancel your subscription at any time\n\nTo exercise these rights, contact us at ${CONTACT_EMAIL}`}
        </Section>

        <Section title="8. Children's Privacy">
          {`${APP_NAME} is not directed to children under 18 years of age. We do not knowingly collect personal information from children under 18. If you become aware that a child has provided us with personal information, please contact us.`}
        </Section>

        <Section title="9. Changes to This Policy">
          {`We may update this Privacy Policy from time to time. We will notify you of any changes by updating the "Last updated" date at the top of this policy. Your continued use of the app after changes are posted constitutes acceptance of the new policy.`}
        </Section>

        <Section title="10. Contact Us">
          {`If you have questions about this Privacy Policy, please contact us:\n\nEmail: ${CONTACT_EMAIL}\nWebsite: https://creatorflo.app`}
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
