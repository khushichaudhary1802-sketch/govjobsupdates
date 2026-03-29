import { Feather } from "@expo/vector-icons";
import React, { useMemo } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import JobCard from "@/components/JobCard";
import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";
import { SAMPLE_JOBS } from "@/data/jobs";

const C = Colors.light;

export default function BookmarksScreen() {
  const { bookmarks } = useApp();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const bookmarkedJobs = useMemo(
    () => SAMPLE_JOBS.filter((job) => bookmarks.has(job.id)),
    [bookmarks]
  );

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Saved Jobs</Text>
        <Text style={styles.count}>{bookmarkedJobs.length} saved</Text>
      </View>

      <FlatList
        data={bookmarkedJobs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <JobCard job={item} />}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingBottom:
              Platform.OS === "web" ? 34 + 84 : insets.bottom + 84,
          },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!bookmarkedJobs.length}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrapper}>
              <Feather name="bookmark" size={40} color={C.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No Saved Jobs</Text>
            <Text style={styles.emptySubtitle}>
              Tap the bookmark icon on any job to save it for later
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: C.text,
  },
  count: {
    fontSize: 13,
    color: C.textSecondary,
    fontWeight: "600",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
    paddingHorizontal: 40,
  },
  emptyIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: C.chip,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: C.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: C.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
});
