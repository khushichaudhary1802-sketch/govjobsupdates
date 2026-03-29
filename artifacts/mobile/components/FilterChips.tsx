import * as Haptics from "expo-haptics";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import Colors from "@/constants/colors";
import { JobType } from "@/context/AppContext";
import { JOB_TYPES } from "@/data/jobs";

const C = Colors.light;

interface FilterChipsProps {
  selectedFilter: JobType | null;
  onFilterChange: (filter: JobType | null) => void;
}

export default function FilterChips({
  selectedFilter,
  onFilterChange,
}: FilterChipsProps) {
  const handlePress = async (type: JobType | null) => {
    await Haptics.selectionAsync();
    onFilterChange(type);
  };

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        <TouchableOpacity
          style={[
            styles.chip,
            selectedFilter === null && styles.chipSelected,
          ]}
          onPress={() => handlePress(null)}
        >
          <Text
            style={[
              styles.chipText,
              selectedFilter === null && styles.chipTextSelected,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        {JOB_TYPES.map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.chip,
              selectedFilter === type && styles.chipSelected,
            ]}
            onPress={() => handlePress(type)}
          >
            <Text
              style={[
                styles.chipText,
                selectedFilter === type && styles.chipTextSelected,
              ]}
            >
              {type}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  container: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    flexDirection: "row",
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: C.chip,
    borderWidth: 1,
    borderColor: C.border,
  },
  chipSelected: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: C.chipText,
  },
  chipTextSelected: {
    color: "#FFFFFF",
  },
});
