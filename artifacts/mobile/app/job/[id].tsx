import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { WebBrowserPresentationStyle } from "expo-web-browser";
import * as WebBrowser from "expo-web-browser";
import React from "react";
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
import { useApp } from "@/context/AppContext";
import { SAMPLE_JOBS } from "@/data/jobs";

const C = Colors.light;

function formatSalary(min: number, max: number): string {
  if (!min && !max) return "As per Government norms";
  return `₹${min.toLocaleString("en-IN")} – ₹${max.toLocaleString("en-IN")} per month`;
}

function daysUntilDeadline(lastDate: string): number {
  const deadline = new Date(lastDate);
  const today = new Date();
  return Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

const STAT_ICONS: Record<string, string> = {
  users:         "users",
  "map-pin":     "map-pin",
  "dollar-sign": "dollar-sign",
  "book-open":   "book-open",
};

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { bookmarks, toggleBookmark, subscriptionStatus } = useApp();
  const insets = useSafeAreaInsets();

  const job = SAMPLE_JOBS.find((j) => j.id === id);
  const isBookmarked = job ? bookmarks.has(job.id) : false;

  if (!job) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Job not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.goBackText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const daysLeft = daysUntilDeadline(job.lastDate);
  const deadlineColor =
    daysLeft <= 3 ? C.danger : daysLeft <= 7 ? C.warning : C.success;

  const handleApply = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (subscriptionStatus === "none" || subscriptionStatus === "expired") {
      Alert.alert(
        "Subscription Required",
        "Subscribe to access the apply feature and view full job details.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Subscribe Now", onPress: () => router.push("/payment") },
        ]
      );
      return;
    }
    try {
      await WebBrowser.openBrowserAsync(job.applyUrl, {
        presentationStyle: WebBrowserPresentationStyle.PAGE_SHEET,
        toolbarColor: C.primary,
      });
    } catch {
      Alert.alert("Error", "Could not open the application URL.");
    }
  };

  const handleBookmark = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleBookmark(job.id);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const stats = [
    { icon: "users",         label: "Vacancies", value: job.vacancies.toLocaleString("en-IN") },
    { icon: "map-pin",       label: "Location",  value: job.state },
    { icon: "dollar-sign",   label: "Pay Scale",
      value: job.salaryMin
        ? `₹${(job.salaryMin / 1000).toFixed(0)}K – ₹${(job.salaryMax / 1000).toFixed(0)}K`
        : "As per norms" },
    { icon: "book-open",     label: "Education", value: job.qualification },
  ];

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      {/* Nav bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="arrow-left" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>
          Job Details
        </Text>
        <TouchableOpacity
          style={styles.navBtn}
          onPress={handleBookmark}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[styles.bookmarkIcon, isBookmarked && styles.bookmarkActive]}>
            🔖
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 100 }]}
      >
        {/* Hero card */}
        <View style={styles.heroCard}>
          <View style={styles.orgLogoPlaceholder}>
            <Text style={styles.orgEmoji}>💼</Text>
          </View>
          <View style={styles.heroInfo}>
            <Text style={styles.heroTitle}>{job.title}</Text>
            <Text style={styles.heroOrg}>{job.organization}</Text>
            <View style={styles.heroBadgeRow}>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>{job.jobType}</Text>
              </View>
              {job.isNew && (
                <View style={[styles.heroBadge, styles.newBadge]}>
                  <Text style={[styles.heroBadgeText, { color: "#fff" }]}>NEW</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          {stats.map((stat) => (
            <View key={stat.label} style={styles.statBox}>
              <Icon name={stat.icon} size={16} color={C.primary} />
              <Text style={styles.statBoxLabel}>{stat.label}</Text>
              <Text style={styles.statBoxValue} numberOfLines={2}>
                {stat.value}
              </Text>
            </View>
          ))}
        </View>

        {/* Deadline banner */}
        <View style={[styles.deadlineBanner, { backgroundColor: deadlineColor + "18" }]}>
          <Icon name="clock" size={18} color={deadlineColor} />
          <View>
            <Text style={[styles.deadlineLabel, { color: deadlineColor }]}>
              {daysLeft > 0
                ? `${daysLeft} days remaining`
                : daysLeft === 0
                ? "Last day today!"
                : "Deadline passed"}
            </Text>
            <Text style={styles.deadlineDate}>Last Date: {job.lastDate}</Text>
          </View>
        </View>

        {/* Sections */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About this Role</Text>
          <Text style={styles.sectionBody}>{job.description}</Text>
        </View>

        {job.eligibility ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Eligibility</Text>
            <Text style={styles.sectionBody}>{job.eligibility}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Salary</Text>
          <Text style={styles.sectionBody}>{formatSalary(job.salaryMin, job.salaryMax)}</Text>
        </View>
      </ScrollView>

      {/* Apply bar */}
      <View style={[styles.applyBar, { paddingBottom: bottomPad + 12 }]}>
        <TouchableOpacity
          style={styles.shareBtn}
          onPress={() => {
            Haptics.selectionAsync();
            Alert.alert("Share", "Sharing feature coming soon!");
          }}
        >
          <Text style={styles.shareEmoji}>📤</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.applyButton}
          onPress={handleApply}
          activeOpacity={0.85}
        >
          <Text style={styles.applyEmoji}>🌐</Text>
          <Text style={styles.applyButtonText}>Apply Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 12,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.chip,
    justifyContent: "center",
    alignItems: "center",
  },
  navTitle: { flex: 1, fontSize: 17, fontWeight: "700", color: C.text, textAlign: "center" },
  bookmarkIcon: { fontSize: 22, opacity: 0.35 },
  bookmarkActive: { opacity: 1 },
  scrollContent: { padding: 16, gap: 16 },
  heroCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: "row",
    gap: 14,
  },
  orgLogoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: C.chip,
    justifyContent: "center",
    alignItems: "center",
  },
  orgEmoji: { fontSize: 28 },
  heroInfo: { flex: 1, gap: 6 },
  heroTitle: { fontSize: 16, fontWeight: "800", color: C.text, lineHeight: 22 },
  heroOrg: { fontSize: 13, color: C.textSecondary },
  heroBadgeRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  heroBadge: {
    backgroundColor: C.chip,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  newBadge: { backgroundColor: "#E53935" },
  heroBadgeText: { fontSize: 11, color: C.primary, fontWeight: "700" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statBox: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    gap: 6,
  },
  statBoxLabel: {
    fontSize: 11,
    color: C.textMuted,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statBoxValue: { fontSize: 13, fontWeight: "700", color: C.text, lineHeight: 18 },
  deadlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
  },
  deadlineLabel: { fontSize: 15, fontWeight: "800" },
  deadlineDate: { fontSize: 12, color: C.textSecondary, marginTop: 2 },
  section: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    gap: 10,
  },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: C.text },
  sectionBody: { fontSize: 14, color: C.textSecondary, lineHeight: 22 },
  applyBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.surface,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  shareBtn: {
    width: 50,
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.border,
    justifyContent: "center",
    alignItems: "center",
  },
  shareEmoji: { fontSize: 22 },
  applyButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingVertical: 15,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  applyEmoji: { fontSize: 18 },
  applyButtonText: { fontSize: 16, fontWeight: "800", color: "#fff" },
  notFound: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16 },
  notFoundText: { fontSize: 18, fontWeight: "700", color: C.text },
  goBackText: { fontSize: 15, color: C.primary, fontWeight: "700" },
});
