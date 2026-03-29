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

import Icon from "@/components/Icon";
import Colors from "@/constants/colors";
import { JobType, useApp } from "@/context/AppContext";
import { DISTRICTS_BY_STATE, INDIAN_STATES, JOB_TYPES } from "@/data/jobs";

const C = Colors.light;

const JOB_TYPE_ICONS: Record<JobType, string> = {
  "All India Govt Jobs":  "award",
  "State Govt Jobs":      "flag",
  "Bank Jobs":            "credit-card",
  "Teaching Jobs":        "book-open",
  "Engineering Jobs":     "tool",
  "Railway Jobs":         "map",
  "Police/Defence Jobs":  "shield",
};

export default function OnboardingScreen() {
  const { setPreferences } = useApp();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");
  const [selectedJobTypes, setSelectedJobTypes] = useState<JobType[]>([]);
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

  const handleContinue = async () => {
    if (step === 1) {
      if (!selectedState) {
        Alert.alert("Select State", "Please select your state to continue.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!selectedDistrict) {
        Alert.alert("Select District", "Please select your district to continue.");
        return;
      }
      setStep(3);
    } else {
      if (selectedJobTypes.length === 0) {
        Alert.alert("Select Job Types", "Please select at least one job type.");
        return;
      }
      await setPreferences({
        state: selectedState,
        district: selectedDistrict,
        jobTypes: selectedJobTypes,
      });
      router.replace("/payment");
    }
  };

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.progressBar}>
        {[1, 2, 3].map((s) => (
          <View
            key={s}
            style={[styles.progressSegment, step >= s && styles.progressActive]}
          />
        ))}
      </View>

      <View style={styles.headerSection}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoEmoji}>🏛️</Text>
        </View>
        <Text style={styles.appName}>SarkariNaukri</Text>
        <Text style={styles.stepTitle}>
          {step === 1
            ? "Select Your State"
            : step === 2
            ? "Select Your District"
            : "Select Job Categories"}
        </Text>
        <Text style={styles.stepSubtitle}>
          {step === 1
            ? "We'll show jobs available in your state"
            : step === 2
            ? "Get hyper-local job notifications"
            : "Choose the categories you're interested in"}
        </Text>
      </View>

      {step === 1 && (
        <View style={styles.pickerSection}>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowStateList(!showStateList)}
          >
            <Text
              style={[
                styles.pickerButtonText,
                selectedState ? styles.pickerSelected : {},
              ]}
            >
              {selectedState || "Select State"}
            </Text>
            <Icon
              name={showStateList ? "chevron-up" : "chevron-down"}
              size={18}
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
                    <Icon name="check" size={14} color={C.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {step === 2 && (
        <View style={styles.pickerSection}>
          <Text style={styles.selectedStateLabel}>
            State:{" "}
            <Text style={styles.selectedStateName}>{selectedState}</Text>
          </Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowDistrictList(!showDistrictList)}
          >
            <Text
              style={[
                styles.pickerButtonText,
                selectedDistrict ? styles.pickerSelected : {},
              ]}
            >
              {selectedDistrict || "Select District"}
            </Text>
            <Icon
              name={showDistrictList ? "chevron-up" : "chevron-down"}
              size={18}
              color={C.textSecondary}
            />
          </TouchableOpacity>
          {showDistrictList && (
            <ScrollView
              style={styles.dropdownList}
              nestedScrollEnabled
              showsVerticalScrollIndicator
            >
              {districts.map((district) => (
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
                    <Icon name="check" size={14} color={C.primary} />
                  )}
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[
                  styles.dropdownItem,
                  selectedDistrict === "All Districts" &&
                    styles.dropdownItemSelected,
                ]}
                onPress={() => {
                  setSelectedDistrict("All Districts");
                  setShowDistrictList(false);
                  Haptics.selectionAsync();
                }}
              >
                <Text
                  style={[
                    styles.dropdownItemText,
                    selectedDistrict === "All Districts" &&
                      styles.dropdownItemTextSelected,
                  ]}
                >
                  All Districts
                </Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      )}

      {step === 3 && (
        <View style={styles.jobTypesSection}>
          <View style={styles.jobTypesGrid}>
            {JOB_TYPES.map((type) => {
              const selected = selectedJobTypes.includes(type);
              return (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.jobTypeCard,
                    selected && styles.jobTypeCardSelected,
                  ]}
                  onPress={() => toggleJobType(type)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.jobTypeIcon,
                      selected && styles.jobTypeIconSelected,
                    ]}
                  >
                    <Icon
                      name={JOB_TYPE_ICONS[type]}
                      size={24}
                      color={selected ? "#fff" : C.primary}
                    />
                  </View>
                  <Text
                    style={[
                      styles.jobTypeLabel,
                      selected && styles.jobTypeLabelSelected,
                    ]}
                  >
                    {type}
                  </Text>
                  {selected && (
                    <View style={styles.checkMark}>
                      <Icon name="check" size={10} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          {selectedJobTypes.length > 0 && (
            <Text style={styles.selectedCount}>
              {selectedJobTypes.length} categor
              {selectedJobTypes.length > 1 ? "ies" : "y"} selected
            </Text>
          )}
        </View>
      )}

      <View
        style={[
          styles.footer,
          {
            paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 16,
          },
        ]}
      >
        {step > 1 && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setStep((s) => (s === 3 ? 2 : 1) as 1 | 2 | 3)}
          >
            <Icon name="arrow-left" size={20} color={C.primary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.continueButton, step === 1 && { flex: 1 }]}
          onPress={handleContinue}
          activeOpacity={0.85}
        >
          <Text style={styles.continueButtonText}>
            {step === 3 ? "Get Started" : "Continue"}
          </Text>
          <Icon name="arrow-right" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  progressBar: {
    flexDirection: "row",
    paddingHorizontal: 24,
    gap: 6,
    marginBottom: 24,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
  },
  progressActive: { backgroundColor: C.primary },
  headerSection: {
    paddingHorizontal: 24,
    marginBottom: 28,
    alignItems: "center",
  },
  logoContainer: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: C.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  logoEmoji: { fontSize: 28 },
  appName: {
    fontSize: 15,
    fontWeight: "700",
    color: C.primary,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: C.text,
    textAlign: "center",
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: C.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  pickerSection: { flex: 1, paddingHorizontal: 24 },
  selectedStateLabel: { fontSize: 13, color: C.textSecondary, marginBottom: 12 },
  selectedStateName: { color: C.primary, fontWeight: "700" },
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
  pickerButtonText: { fontSize: 15, color: C.textMuted, fontWeight: "500" },
  pickerSelected: { color: C.text },
  dropdownList: {
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    maxHeight: 300,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  dropdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  dropdownItemSelected: { backgroundColor: C.chip },
  dropdownItemText: { fontSize: 14, color: C.text },
  dropdownItemTextSelected: { color: C.primary, fontWeight: "700" },
  jobTypesSection: { flex: 1, paddingHorizontal: 16 },
  jobTypesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  jobTypeCard: {
    width: "30%",
    aspectRatio: 1,
    backgroundColor: C.surface,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: C.border,
    position: "relative",
    shadowColor: C.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  jobTypeCardSelected: {
    borderColor: C.primary,
    backgroundColor: "#EAF0FB",
  },
  jobTypeIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: C.chip,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  jobTypeIconSelected: { backgroundColor: C.primary },
  jobTypeLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: C.textSecondary,
    textAlign: "center",
    paddingHorizontal: 4,
  },
  jobTypeLabelSelected: { color: C.primary },
  checkMark: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: C.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  selectedCount: {
    marginTop: 16,
    textAlign: "center",
    color: C.primary,
    fontWeight: "700",
    fontSize: 13,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.surface,
  },
  backButton: {
    width: 50,
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.border,
    justifyContent: "center",
    alignItems: "center",
  },
  continueButton: {
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
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#fff",
  },
});
