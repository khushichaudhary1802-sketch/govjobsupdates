import { router } from "expo-router";
import React from "react";
import {
  Linking,
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
const CONTACT_EMAIL = "priyankagoswami0398@gmail.com";
const APP_NAME = "GovJobAlert – Sarkari Naukri";

export default function ContactSupportScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const handleEmailPress = () => {
    Linking.openURL(
      `mailto:${CONTACT_EMAIL}?subject=Support Request – ${APP_NAME}`
    ).catch(() => {});
  };

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Contact Support</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Platform.OS === "web" ? 40 : insets.bottom + 40 },
        ]}
      >
        <Text style={styles.emoji}>📞</Text>
        <Text style={styles.appName}>Contact Support</Text>
        <Text style={styles.subName}>{APP_NAME}</Text>
        <Text style={styles.intro}>
          If you need help or have any questions regarding the app, payments, or
          subscriptions, feel free to contact our support team.
        </Text>

        {/* Email Card */}
        <TouchableOpacity
          style={styles.emailCard}
          onPress={handleEmailPress}
          activeOpacity={0.8}
        >
          <Text style={styles.emailIcon}>📧</Text>
          <View style={styles.emailInfo}>
            <Text style={styles.emailLabel}>Email Support</Text>
            <Text style={styles.emailAddress}>{CONTACT_EMAIL}</Text>
            <Text style={styles.emailResponse}>Response within 24–48 hours</Text>
          </View>
          <Text style={styles.emailArrow}>→</Text>
        </TouchableOpacity>

        {/* Support Topics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🛠️ We Can Help With</Text>
          <View style={styles.topicList}>
            {[
              "Payment or subscription issues (via Razorpay)",
              "App not unlocking after payment",
              "Bug reports or technical issues",
              "Feedback or feature requests",
              "Account or access-related queries",
            ].map((topic, i) => (
              <View key={i} style={styles.topicRow}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.topicText}>{topic}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* How to Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📌 What to Include in Your Email</Text>
          <View style={styles.topicList}>
            {[
              "Registered email (if any)",
              "Transaction ID (for payment issues)",
              "Device details (Android version, model)",
              "Clear description of your issue",
              "Payment proof or screenshots (if payment-related)",
            ].map((item, i) => (
              <View key={i} style={styles.topicRow}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.topicText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Important Note */}
        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>⚠️ Important</Text>
          <Text style={styles.noteText}>
            Support is available only via email. Please allow up to 48 hours for
            a response. Incomplete details may delay resolution.
          </Text>
        </View>

        {/* Tap to email */}
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={handleEmailPress}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaText}>📧 Send Email to Support</Text>
        </TouchableOpacity>
      </ScrollView>
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
  content: { paddingHorizontal: 20, paddingTop: 24, gap: 20 },

  emoji: { fontSize: 40, textAlign: "center" },
  appName: {
    fontSize: 20,
    fontWeight: "800",
    color: C.primary,
    textAlign: "center",
    marginTop: -6,
  },
  subName: {
    fontSize: 13,
    color: C.textSecondary,
    textAlign: "center",
    marginTop: -4,
  },
  intro: {
    fontSize: 14,
    color: C.textSecondary,
    lineHeight: 22,
    textAlign: "center",
  },

  emailCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: C.primary,
    gap: 12,
  },
  emailIcon: { fontSize: 28 },
  emailInfo: { flex: 1 },
  emailLabel: { fontSize: 13, fontWeight: "700", color: C.textMuted },
  emailAddress: {
    fontSize: 15,
    fontWeight: "800",
    color: C.primary,
    marginTop: 2,
  },
  emailResponse: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  emailArrow: { fontSize: 20, color: C.primary, fontWeight: "700" },

  section: { gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: C.text },
  topicList: { gap: 8 },
  topicRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  bullet: { fontSize: 14, color: C.primary, fontWeight: "700", marginTop: 1 },
  topicText: { fontSize: 14, color: C.textSecondary, lineHeight: 20, flex: 1 },

  noteCard: {
    backgroundColor: "#FEF3C7",
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#F59E0B",
    gap: 6,
  },
  noteTitle: { fontSize: 14, fontWeight: "800", color: "#92400E" },
  noteText: { fontSize: 13, color: "#78350F", lineHeight: 20 },

  ctaButton: {
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  ctaText: { fontSize: 16, fontWeight: "800", color: "#fff" },
});
