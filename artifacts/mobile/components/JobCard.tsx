import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import Colors from "@/constants/colors";
import { Job } from "@/context/AppContext";
import { useApp } from "@/context/AppContext";

const C = Colors.light;

const JOB_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  SSC: { bg: "#EDE7F6", text: "#5E35B1" },
  Banking: { bg: "#E3F2FD", text: "#1565C0" },
  Railway: { bg: "#E8F5E9", text: "#2E7D32" },
  Defence: { bg: "#FBE9E7", text: "#BF360C" },
  Teaching: { bg: "#FFF8E1", text: "#F57F17" },
  "State Govt": { bg: "#E0F2F1", text: "#00695C" },
  PSU: { bg: "#FCE4EC", text: "#880E4F" },
};

interface JobCardProps {
  job: Job;
}

function daysUntilDeadline(lastDate: string): number {
  const deadline = new Date(lastDate);
  const today = new Date();
  const diff = deadline.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatSalary(min: number, max: number): string {
  const fmt = (n: number) =>
    n >= 100000
      ? `₹${(n / 100000).toFixed(1)}L`
      : `₹${(n / 1000).toFixed(0)}K`;
  return `${fmt(min)} - ${fmt(max)}`;
}

export default function JobCard({ job }: JobCardProps) {
  const { bookmarks, toggleBookmark } = useApp();
  const isBookmarked = bookmarks.has(job.id);
  const daysLeft = daysUntilDeadline(job.lastDate);
  const typeColor = JOB_TYPE_COLORS[job.jobType] || {
    bg: C.chip,
    text: C.chipText,
  };

  const handlePress = () => {
    router.push({
      pathname: "/job/[id]",
      params: { id: job.id },
    });
  };

  const handleBookmark = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleBookmark(job.id);
  };

  const deadlineColor =
    daysLeft <= 3 ? C.danger : daysLeft <= 7 ? C.warning : C.textSecondary;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={handlePress}
      testID={`job-card-${job.id}`}
    >
      <View style={styles.header}>
        <View style={styles.typeRow}>
          <View
            style={[styles.typeBadge, { backgroundColor: typeColor.bg }]}
          >
            <Text style={[styles.typeText, { color: typeColor.text }]}>
              {job.jobType}
            </Text>
          </View>
          {job.isNew && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          onPress={handleBookmark}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          testID={`bookmark-${job.id}`}
        >
          <Feather
            name={isBookmarked ? "bookmark" : "bookmark"}
            size={20}
            color={isBookmarked ? C.primary : C.textMuted}
            style={
              isBookmarked ? styles.bookmarkActive : styles.bookmarkInactive
            }
          />
        </TouchableOpacity>
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {job.title}
      </Text>
      <Text style={styles.org} numberOfLines={1}>
        {job.organization}
      </Text>

      <View style={styles.divider} />

      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Feather name="users" size={13} color={C.textMuted} />
          <Text style={styles.infoText}>
            {job.vacancies.toLocaleString()} vacancies
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Feather name="dollar-sign" size={13} color={C.textMuted} />
          <Text style={styles.infoText}>
            {formatSalary(job.salaryMin, job.salaryMax)}
          </Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Feather name="map-pin" size={13} color={C.textMuted} />
          <Text style={styles.infoText}>{job.state}</Text>
        </View>
        <View style={styles.infoItem}>
          <Feather name="book-open" size={13} color={C.textMuted} />
          <Text style={styles.infoText} numberOfLines={1}>
            {job.qualification}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.deadlineRow}>
          <Feather name="clock" size={13} color={deadlineColor} />
          <Text style={[styles.deadlineText, { color: deadlineColor }]}>
            {daysLeft > 0
              ? `${daysLeft} days left`
              : daysLeft === 0
              ? "Last day today!"
              : "Deadline passed"}
          </Text>
        </View>
        <View style={styles.applyBtn}>
          <Text style={styles.applyBtnText}>View Details</Text>
          <Feather name="arrow-right" size={12} color={C.primary} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: C.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: C.border,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  typeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  typeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  newBadge: {
    backgroundColor: "#E53935",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  newBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  bookmarkActive: {
    color: C.primary,
  },
  bookmarkInactive: {
    color: C.textMuted,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: C.text,
    lineHeight: 21,
    marginBottom: 4,
  },
  org: {
    fontSize: 13,
    color: C.textSecondary,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 6,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flex: 1,
  },
  infoText: {
    fontSize: 12,
    color: C.textSecondary,
    flex: 1,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  deadlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  deadlineText: {
    fontSize: 12,
    fontWeight: "600",
  },
  applyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  applyBtnText: {
    fontSize: 12,
    color: C.primary,
    fontWeight: "700",
  },
});
