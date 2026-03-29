import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import FilterChips from "@/components/FilterChips";
import Icon from "@/components/Icon";
import JobCard from "@/components/JobCard";
import Colors from "@/constants/colors";
import { JobType, useApp } from "@/context/AppContext";
import { SAMPLE_JOBS, getFilteredJobs } from "@/data/jobs";

const C = Colors.light;

export default function HomeScreen() {
  const { preferences, isLoading } = useApp();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<JobType | null>(null);

  const filteredJobs = useMemo(() => {
    if (!preferences) return SAMPLE_JOBS;
    return getFilteredJobs(
      SAMPLE_JOBS,
      preferences.state,
      preferences.jobTypes,
      searchQuery,
      selectedFilter
    );
  }, [preferences, searchQuery, selectedFilter]);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  const headerComponent = (
    <>
      <View style={styles.searchBar}>
        <Icon name="search" size={18} color={C.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search jobs, organizations..."
          placeholderTextColor={C.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          testID="search-input"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Icon name="x" size={18} color={C.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      <FilterChips
        selectedFilter={selectedFilter}
        onFilterChange={setSelectedFilter}
      />
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {filteredJobs.length} Jobs Found
        </Text>
        {preferences && (
          <View style={styles.locationRow}>
            <Icon name="map-pin" size={12} color={C.textSecondary} />
            <Text style={styles.locationLabel}>{preferences.state}</Text>
          </View>
        )}
      </View>
    </>
  );

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.greeting}>
            {preferences ? "Hi there!" : "Welcome"}
          </Text>
          <Text style={styles.headline}>Government Jobs</Text>
        </View>
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => router.push("/preferences")}
          testID="preferences-button"
        >
          <Icon name="sliders" size={20} color={C.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredJobs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <JobCard job={item} />}
        ListHeaderComponent={headerComponent}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingBottom: Platform.OS === "web" ? 34 + 84 : insets.bottom + 84,
          },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={filteredJobs.length > 0}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>No Jobs Found</Text>
            <Text style={styles.emptySubtitle}>
              Try adjusting your filters or search query
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: C.background,
  },
  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  greeting: { fontSize: 12, color: C.textSecondary, fontWeight: "500" },
  headline: { fontSize: 22, fontWeight: "800", color: C.text },
  settingsBtn: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: C.chip,
    justifyContent: "center",
    alignItems: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: C.text,
    paddingVertical: 6,
  },
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  resultsCount: { fontSize: 13, fontWeight: "700", color: C.text },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  locationLabel: { fontSize: 12, color: C.textSecondary },
  listContent: { paddingHorizontal: 16 },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: C.text },
  emptySubtitle: {
    fontSize: 14,
    color: C.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
});
