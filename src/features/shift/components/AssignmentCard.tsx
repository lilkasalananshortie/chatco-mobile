import { useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "../../../shared/ui/BrandText";
import { Ionicons } from "@expo/vector-icons";
import type { Driver, Unit } from "../../../core/domain/types";
import { useAppTheme } from "../../../core/theme/ThemeProvider";
import { MinibusFrontIcon } from "./MinibusFrontIcon";

export interface AssignmentCardProps {
  item: Unit | Driver;
  onSelect: (item: Unit | Driver) => void;
}

export function AssignmentCard({ item, onSelect }: AssignmentCardProps) {
  const { colors, styles, isLight, isLowFidelity } = useAppTheme();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const isUnit = "unitNumber" in item;
  const available = item.status === "available" && !item.unavailableReason;
  const title = isUnit ? item.unitNumber : item.name;
  const subtitle = isUnit
    ? item.plateNumber
    : available
      ? "Ready for dispatch"
      : item.unavailableReason || (item.status === "on-shift" ? "Driver already on active shift" : "Unavailable");
  const status = available
    ? "Available"
    : isUnit
      ? item.status === "maintenance"
        ? "Maintenance"
        : item.status === "in-use"
          ? "In use"
          : "Unavailable"
      : item.status === "on-shift"
        ? "On shift"
        : "Unavailable";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${status}${!available && item.unavailableReason ? `. ${item.unavailableReason}` : ""}`}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={() => onSelect(item)}
      style={({ pressed }) => [
        styles.card,
        {
          marginTop: 0,
          padding: 14,
          minHeight: isUnit ? 66 : undefined,
          borderWidth: 1,
          borderColor: available && (hovered || focused || pressed) ? colors.primary : colors.border,
          borderRadius: isLowFidelity ? 3 : 14,
          backgroundColor: available && (hovered || focused || pressed) ? (isLight ? "#F3F4F6" : "#10273F") : colors.surface,
          transform: [{ scale: available && pressed && !isLowFidelity ? 0.99 : 1 }],
          opacity: available ? 1 : 0.78,
        },
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        {isUnit ? (
          <MinibusFrontIcon available={available} />
        ) : (
          <Ionicons name="person-outline" size={25} color={colors.muted} />
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ color: available ? colors.text : colors.muted, fontSize: isUnit ? 16 : 14, fontWeight: isUnit ? "600" : "700" }}>
            {title}
          </Text>
          <Text numberOfLines={1} style={{ color: colors.muted, fontSize: isUnit ? 12 : 11, fontWeight: "500", marginTop: 3 }}>
            {subtitle}
          </Text>
        </View>
        <Text style={{ color: colors.muted, fontSize: isUnit ? 11 : 9, fontWeight: isUnit ? "600" : "700", textTransform: "uppercase", letterSpacing: 0.5 }}>
          {status}
        </Text>
        {available ? <Ionicons name="chevron-forward" size={16} color={colors.muted} /> : null}
      </View>
    </Pressable>
  );
}
