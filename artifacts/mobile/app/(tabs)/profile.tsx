import * as Haptics from "expo-haptics";
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

import Icon from "@/components/Icon";
import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";

const C = Colors.light;

const JOB_TYPE_COLORS: Record<string, string> = {
  "All India Govt Jobs":  "#5E35B1",
  "State Govt Jobs":      "#00695C",
  "Bank Jobs":            "#1565C0",
  "Teaching Jobs":        "#F57F17",
  "Engineering Jobs":     "#880E4F",
  "Railway Jobs":         "#2E7D32",
  "Police/Defence Jobs":  "#BF360C",
};

export default function ProfileScreen() {
  const {
    preferences,
    bookmarks,
    subscriptionStatus,
    trialEndDate,
    refreshSubscription,
  } = useApp();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  // Calculate time remaining in the trial (from trialEndDate)
  const getTrialTimeLeft = () => {
    if (!trialEndDate) return "";
    const end = new Date(trialEndDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    if (diff <= 0) return "Trial ended";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (days > 0) return `${days}d ${hours}h remaining`;
    return `${hours}h ${minutes}m remaining`;
  };

  const statusLabel: Record<string, string> = {
    trial:   "Trial Active",
    active:  "Premium Active",
    expired: "Trial Expired",
    none:    "Not Subscribed",
  };

  const statusColor: Record<string, string> = {
    trial:   C.warning,
    active:  C.success,
    expired: C.danger,
    none:    C.textMuted,
  };

  const subIcon: Record<string, string> = {
    active:  "crown",
    trial:   "clock",
    expired: "lock",
    none:    "lock",
  };

  const handleUpgradePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/payment");
  };

  const handleRefresh = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refreshSubscription();
  };

  const infoItems: Array<{
    icon: string;
    label: string;
    onPress: () => void;
  }> = [
    {
      icon: "file-text",
      label: "Privacy Policy",
      onPress: () => router.push("/legal/privacy-policy"),
    },
    {
      icon: "file",
      label: "Terms of Service",
      onPress: () => router.push("/legal/terms"),
    },
    {
      icon: "refresh-cw",
      label: "Refund Policy",
      onPress: () => router.push("/legal/refund-policy"),
    },
    {
      icon: "mail",
      label: "Contact Support",
      onPress: () => router.push("/legal/contact-support"),
    },
  ];

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshBtn}>
          <Icon name="refresh-cw" size={18} color={C.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: Platform.OS === "web" ? 34 + 84 : insets.bottom + 84,
          },
        ]}
      >
        {/* Subscription Card */}
        <View style={styles.subscriptionCard}>
          <View style={styles.subCardTop}>
            <View
              style={[
                styles.subIconWrapper,
                { backgroundColor: statusColor[subscriptionStatus] + "18" },
              ]}
            >
              <Icon
                name={subIcon[subscriptionStatus]}
                size={26}
                color={statusColor[subscriptionStatus]}
              />
            </View>
            <View style={styles.subInfo}>
              <Text
                style={[styles.subStatusLabel, { color: statusColor[subscriptionStatus] }]}
              >
                {statusLabel[subscriptionStatus]}
              </Text>
              {subscriptionStatus === "trial" && (
                <Text style={styles.subTimer}>{getTrialTimeLeft()}</Text>
              )}
              {subscriptionStatus === "active" && (
                <Text style={styles.subDesc}>₹249/month · Auto-renews</Text>
              )}
              {(subscriptionStatus === "expired" || subscriptionStatus === "none") && (
                <Text style={styles.subDesc}>Subscribe to access all features</Text>
              )}
            </View>
          </View>

          {subscriptionStatus !== "active" && (
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={handleUpgradePress}
            >
              <Text style={styles.upgradeText}>
                {subscriptionStatus === "trial"
                  ? "Manage Subscription"
                  : subscriptionStatus === "expired"
                  ? "Renew — ₹1 for 3 days"
                  : "Start Trial — ₹1 for 3 days"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Preferences */}
        {preferences && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Preferences</Text>
            <View style={styles.prefCard}>
              <View style={styles.prefRow}>
                <Icon name="map-pin" size={16} color={C.primary} />
                <Text style={styles.prefLabel}>State</Text>
                <Text style={styles.prefValue}>{preferences.state}</Text>
              </View>
              <View style={[styles.prefRow, styles.prefBorder]}>
                <Icon name="navigation" size={16} color={C.primary} />
                <Text style={styles.prefLabel}>District</Text>
                <Text style={styles.prefValue}>{preferences.district}</Text>
              </View>
              <View style={[styles.prefRow, styles.prefBorder]}>
                <Icon name="briefcase" size={16} color={C.primary} />
                <Text style={styles.prefLabel}>Categories</Text>
              </View>
              <View style={styles.tagsWrapper}>
                {preferences.jobTypes.map((type) => (
                  <View
                    key={type}
                    style={[
                      styles.tag,
                      { backgroundColor: JOB_TYPE_COLORS[type] + "20" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tagText,
                        { color: JOB_TYPE_COLORS[type] },
                      ]}
                    >
                      {type}
                    </Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity
                style={styles.editPrefBtn}
                onPress={() => router.push("/preferences")}
              >
                <Icon name="edit-2" size={14} color={C.primary} />
                <Text style={styles.editPrefText}>Edit Preferences</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stats</Text>
          <View style={styles.statsRow}>
            {[
              { number: bookmarks.size.toString(), label: "Saved Jobs" },
              { number: "12K+", label: "Jobs Listed" },
              { number: "Daily", label: "Updates" },
            ].map((stat) => (
              <View key={stat.label} style={styles.statCard}>
                <Text style={styles.statNumber}>{stat.number}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Information</Text>
          <View style={styles.infoCard}>
            {infoItems.map((item, i) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.infoRow, i < infoItems.length - 1 && styles.infoBorder]}
                onPress={item.onPress}
              >
                <Icon name={item.icon} size={16} color={C.primary} />
                <Text style={styles.infoLabel}>{item.label}</Text>
                <Icon name="chevron-right" size={16} color={C.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: 22, fontWeight: "800", color: C.text },
  refreshBtn: { padding: 4 },
  content: { paddingHorizontal: 16, paddingTop: 16, gap: 20 },
  subscriptionCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    gap: 14,
  },
  subCardTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  subIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  subInfo: { flex: 1 },
  subStatusLabel: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
  },
  subTimer: { fontSize: 13, color: C.warning, fontWeight: "600" },
  subDesc: { fontSize: 12, color: C.textSecondary },
  upgradeButton: {
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  upgradeText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  section: { gap: 10 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: C.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingHorizontal: 4,
  },
  prefCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    gap: 12,
  },
  prefRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  prefBorder: { paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border },
  prefLabel: { fontSize: 13, color: C.textSecondary, flex: 1 },
  prefValue: { fontSize: 13, fontWeight: "700", color: C.text },
  tagsWrapper: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingLeft: 26,
  },
  tag: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  tagText: { fontSize: 12, fontWeight: "700" },
  editPrefBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  editPrefText: { fontSize: 13, fontWeight: "700", color: C.primary },
  statsRow: { flexDirection: "row", gap: 12 },
  statCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "900",
    color: C.primary,
    marginBottom: 4,
  },
  statLabel: { fontSize: 11, color: C.textSecondary, textAlign: "center" },
  infoCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  infoBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  infoLabel: { flex: 1, fontSize: 14, color: C.text, fontWeight: "500" },
});
