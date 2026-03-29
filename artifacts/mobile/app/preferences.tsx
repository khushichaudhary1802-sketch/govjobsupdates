import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
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

import Colors from "@/constants/colors";
import { JobType, useApp } from "@/context/AppContext";
import { DISTRICTS_BY_STATE, INDIAN_STATES, JOB_TYPES } from "@/data/jobs";

const C = Colors.light;

export default function PreferencesScreen() {
  const { preferences, setPreferences } = useApp();
  const insets = useSafeAreaInsets();
  const [selectedState, setSelectedState] = useState(
    preferences?.state || ""
  );
  const [selectedDistrict, setSelectedDistrict] = useState(
    preferences?.district || ""
  );
  const [selectedJobTypes, setSelectedJobTypes] = useState<JobType[]>(
    preferences?.jobTypes || []
  );
  const [showStateList, setShowStateList] = useState(false);
  const [showDistrictList, setShowDistrictList] = useState(false);

  const districts = selectedState
    ? DISTRICTS_BY_STATE[selectedState] || ["All Districts"]
    : [];

  const toggleJobType = async (type: JobType) => {
    await Haptics.selectionAsync();
    setSelectedJobTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleSave = async () => {
    if (!selectedState || !selectedDistrict || selectedJobTypes.length === 0) {
      Alert.alert(
        "Incomplete",
        "Please fill in all fields before saving."
      );
      return;
    }
    await setPreferences({
      state: selectedState,
      district: selectedDistrict,
      jobTypes: selectedJobTypes,
    });
    Alert.alert("Saved", "Your preferences have been updated.", [
      { text: "OK", onPress: () => router.back() },
    ]);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.navBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Preferences</Text>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: bottomPad + 24 },
        ]}
      >
        <Text style={styles.label}>State</Text>
        <TouchableOpacity
          style={styles.pickerButton}
          onPress={() => {
            setShowStateList(!showStateList);
            setShowDistrictList(false);
          }}
        >
          <Text
            style={[
              styles.pickerText,
              selectedState ? styles.pickerTextSelected : {},
            ]}
          >
            {selectedState || "Select State"}
          </Text>
          <Feather
            name={showStateList ? "chevron-up" : "chevron-down"}
            size={20}
            color={C.textSecondary}
          />
        </TouchableOpacity>
        {showStateList && (
          <ScrollView
            style={styles.dropdownList}
            nestedScrollEnabled
            showsVerticalScrollIndicator
          >
            {INDIAN_STATES.map((state) => (
              <TouchableOpacity
                key={state}
                style={[
                  styles.dropdownItem,
                  selectedState === state && styles.dropdownItemSelected,
                ]}
                onPress={() => {
                  setSelectedState(state);
                  setSelectedDistrict("");
                  setShowStateList(false);
                  Haptics.selectionAsync();
                }}
              >
                <Text
                  style={[
                    styles.dropdownItemText,
                    selectedState === state && styles.dropdownItemTextSelected,
                  ]}
                >
                  {state}
                </Text>
                {selectedState === state && (
                  <Feather name="check" size={16} color={C.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <Text style={[styles.label, { marginTop: 16 }]}>District</Text>
        <TouchableOpacity
          style={styles.pickerButton}
          onPress={() => {
            setShowDistrictList(!showDistrictList);
            setShowStateList(false);
          }}
        >
          <Text
            style={[
              styles.pickerText,
              selectedDistrict ? styles.pickerTextSelected : {},
            ]}
          >
            {selectedDistrict || "Select District"}
          </Text>
          <Feather
            name={showDistrictList ? "chevron-up" : "chevron-down"}
            size={20}
            color={C.textSecondary}
          />
        </TouchableOpacity>
        {showDistrictList && (
          <ScrollView
            style={styles.dropdownList}
            nestedScrollEnabled
            showsVerticalScrollIndicator
          >
            {[...districts, "All Districts"].map((district) => (
              <TouchableOpacity
                key={district}
                style={[
                  styles.dropdownItem,
                  selectedDistrict === district && styles.dropdownItemSelected,
                ]}
                onPress={() => {
                  setSelectedDistrict(district);
                  setShowDistrictList(false);
                  Haptics.selectionAsync();
                }}
              >
                <Text
                  style={[
                    styles.dropdownItemText,
                    selectedDistrict === district &&
                      styles.dropdownItemTextSelected,
                  ]}
                >
                  {district}
                </Text>
                {selectedDistrict === district && (
                  <Feather name="check" size={16} color={C.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <Text style={[styles.label, { marginTop: 16 }]}>Job Categories</Text>
        <View style={styles.jobTypesGrid}>
          {JOB_TYPES.map((type) => {
            const selected = selectedJobTypes.includes(type);
            return (
              <TouchableOpacity
                key={type}
                style={[styles.typeChip, selected && styles.typeChipSelected]}
                onPress={() => toggleJobType(type)}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    selected && styles.typeChipTextSelected,
                  ]}
                >
                  {type}
                </Text>
                {selected && (
                  <Feather name="check" size={14} color="#fff" />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },
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
  navTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    color: C.text,
  },
  saveBtn: {
    backgroundColor: C.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  content: {
    padding: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: C.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: C.border,
    marginBottom: 8,
  },
  pickerText: {
    fontSize: 15,
    color: C.textMuted,
    fontWeight: "500",
  },
  pickerTextSelected: {
    color: C.text,
  },
  dropdownList: {
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    maxHeight: 220,
    marginBottom: 8,
  },
  dropdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  dropdownItemSelected: {
    backgroundColor: C.chip,
  },
  dropdownItemText: {
    fontSize: 14,
    color: C.text,
  },
  dropdownItemTextSelected: {
    color: C.primary,
    fontWeight: "700",
  },
  jobTypesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: C.surface,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  typeChipSelected: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: C.textSecondary,
  },
  typeChipTextSelected: {
    color: "#fff",
  },
});
