import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Driver, Unit } from "../../../core/domain/types";
import { useAppTheme } from "../../../core/theme/ThemeProvider";

export interface AssignmentCardProps {
  item: Unit | Driver;
  onSelect: (item: Unit | Driver) => void;
}

export function AssignmentCard({ item, onSelect }: AssignmentCardProps) {
  const { colors, isLofi, styles } = useAppTheme();
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
      onPress={() => onSelect(item)}
      style={[
        styles.card,
        {
          marginTop: 0,
          padding: 14,
          borderColor: colors.border,
          borderRadius: isLofi ? 3 : 14,
          backgroundColor: colors.surface,
          opacity: available ? 1 : 0.78,
        },
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Ionicons
          name={isUnit ? "bus-outline" : "person-outline"}
          size={isUnit ? 27 : 25}
          color={colors.muted}
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ color: available ? colors.text : colors.muted, fontSize: 14, fontWeight: "700" }}>
            {title}
          </Text>
          <Text numberOfLines={2} style={{ color: colors.muted, fontSize: 11, fontWeight: "500", marginTop: 3 }}>
            {subtitle}
          </Text>
        </View>
        <Text style={{ color: colors.muted, fontSize: 9, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 }}>
          {status}
        </Text>
        {available ? <Ionicons name="chevron-forward" size={16} color={colors.muted} /> : null}
      </View>
      {!available && isUnit && item.unavailableReason ? (
        <Text style={{ color: colors.muted, fontSize: 11, marginTop: 6, marginLeft: 39 }}>
          {item.unavailableReason}
        </Text>
      ) : null}
    </Pressable>
  );
}
