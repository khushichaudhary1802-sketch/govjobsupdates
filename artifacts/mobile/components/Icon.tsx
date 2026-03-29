import React from "react";
import { Text, type TextStyle } from "react-native";

const ICONS: Record<string, string> = {
  // Category icons (onboarding grid + filter chips)
  award:          "🏛️",
  flag:           "🏢",
  "credit-card":  "🏦",
  "book-open":    "📚",
  tool:           "⚙️",
  map:            "🚂",
  shield:         "🛡️",

  // Tab bar
  briefcase:  "💼",
  bookmark:   "🔖",
  user:       "👤",

  // Job card & home screen
  search:         "🔍",
  "map-pin":      "📍",
  clock:          "⏱",
  users:          "👥",
  "dollar-sign":  "₹",
  inbox:          "📭",
  sliders:        "⚙️",
  navigation:     "🧭",

  // Navigation arrows
  "arrow-right": "→",
  "arrow-left":  "←",
  "chevron-right": "›",
  "chevron-down":  "▾",
  "chevron-up":    "▴",
  x: "✕",

  // Profile screen
  "edit-2":     "✏️",
  lock:         "🔒",
  "file-text":  "📋",
  file:         "📄",
  "refresh-cw": "↺",
  mail:         "✉️",
  check:        "✓",

  // Subscription states
  crown: "👑",
};

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: TextStyle;
}

export default function Icon({ name, size = 16, color, style }: IconProps) {
  return (
    <Text
      style={[
        {
          fontSize: size,
          color: color ?? undefined,
          lineHeight: size * 1.2,
          textAlign: "center",
          includeFontPadding: false,
        },
        style,
      ]}
      allowFontScaling={false}
    >
      {ICONS[name] ?? "●"}
    </Text>
  );
}
