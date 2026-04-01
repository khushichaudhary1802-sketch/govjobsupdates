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
        <Text style={styles.appName}>{APP_NAME}</Text>
        <Text style={styles.lastUpdated}>Effective Date: {LAST_UPDATED}</Text>
        <Text style={styles.intro}>
          {`${APP_NAME} ("we", "our", "us") operates the mobile application ${APP_NAME} (package name: ${PACKAGE}). This Privacy Policy explains how we collect, use, and protect your information when you use our app.`}
        </Text>

        <Section title="1. Information We Collect">
          {`a) Personal Information\n• Email address (if provided by user)\n• Contact details (if user contacts support)\n\nb) Non-Personal Information\n• Device information (model, OS version)\n• App usage data (pages visited, features used)\n• Log data (crash logs, performance data)\n\nc) Payment Information\nPayments are securely processed via Razorpay.\nWe do not store your card details, UPI credentials, or banking information.`}
        </Section>

        <Section title="2. How We Use Your Information">
          {`We use collected data to:\n\n• Provide and improve app functionality\n• Process payments and subscriptions\n• Respond to user queries and support requests\n• Monitor performance and fix issues\n• Ensure security and prevent fraud`}
        </Section>

        <Section title="3. Data Sharing & Disclosure">
          {`We do not sell, trade, or rent your personal data.\n\nWe may share data only with:\n\n• Trusted services like Razorpay (for payments)\n• Analytics or backend services (e.g., Firebase)\n• Legal authorities if required by law`}
        </Section>

        <Section title="4. Data Security">
          {`We implement appropriate security measures to protect your data, including:\n\n• Secure API communication (HTTPS)\n• Limited access to user data\n• Regular monitoring and updates\n\nHowever, no method of transmission over the internet is 100% secure.`}
        </Section>

        <Section title="5. Third-Party Services">
          {`The app may use third-party services such as:\n\n• Payment gateways (Razorpay)\n• Backend/analytics services (Firebase)\n\nThese services have their own privacy policies.`}
        </Section>

        <Section title="6. User Rights">
          {`You have the right to:\n\n• Access your data\n• Request deletion of your data\n• Contact us for any privacy-related concerns`}
        </Section>

        <Section title="7. Children's Privacy">
          {`This app is not intended for children under 13 years of age.\nWe do not knowingly collect data from children.`}
        </Section>

        <Section title="8. External Links Disclaimer">
          {`Our app may contain links to external government or third-party websites.\nWe are not responsible for the privacy practices of those websites.`}
        </Section>

        <Section title="9. Changes to This Policy">
          {`We may update this Privacy Policy from time to time.\nUsers will be notified of any major changes through the app or update.`}
        </Section>

        <Section title="10. Contact Us">
          {`If you have any questions about this Privacy Policy, you can contact us:\n\n📧 Email: ${CONTACT_EMAIL}`}
        </Section>

        <Text style={styles.disclaimer}>
          ⚠️ Disclaimer{"\n"}
          {APP_NAME} is not affiliated with any government entity.{"\n"}
          All job information is sourced from publicly available official websites.
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
