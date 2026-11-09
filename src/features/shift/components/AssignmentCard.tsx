import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path } from "react-native-svg";
import type { Driver, Unit } from "../../../core/domain/types";
import { useAppTheme } from "../../../core/theme/ThemeProvider";

const JEEPNEY_PATH = "M19,13V7H20V4H4V7H5V13H2C2,13.93 2.5,14.71 3.5,14.93V20A1,1 0 0,0 4.5,21H5.5A1,1 0 0,0 6.5,20V19H17.5V20A1,1 0 0,0 18.5,21H19.5A1,1 0 0,0 20.5,20V14.93C21.5,14.7 22,13.93 22,13H19M8,15A1.5,1.5 0 0,1 6.5,13.5A1.5,1.5 0 0,1 8,12A1.5,1.5 0 0,1 9.5,13.5A1.5,1.5 0 0,1 8,15M16,15A1.5,1.5 0 0,1 14.5,13.5A1.5,1.5 0 0,1 16,12A1.5,1.5 0 0,1 17.5,13.5A1.5,1.5 0 0,1 16,15M17.5,10.5C15.92,10.18 14.03,10 12,10C9.97,10 8,10.18 6.5,10.5V7H17.5V10.5Z";

export interface AssignmentCardProps {
  item: Unit | Driver;
  onSelect: (item: Unit | Driver) => void;
}

export function AssignmentCard({ item, onSelect }: AssignmentCardProps) {
  const { colors, isLofi, styles , isLowFidelity } = useAppTheme();
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
          minHeight: isUnit ? 66 : undefined,
          borderColor: colors.border,
          borderRadius: isLowFidelity ? 3 : 14,
          backgroundColor: colors.surface,
          opacity: available ? 1 : 0.78,
        },
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        {isUnit ? (
          <Svg width={36} height={36} viewBox="0 0 24 24" accessible={false}>
            <Path d={JEEPNEY_PATH} fill={available ? colors.primaryLight : colors.muted} />
          </Svg>
        ) : (
          <Ionicons name="person-outline" size={25} color={colors.muted} />
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ color: available ? colors.text : colors.muted, fontSize: 14, fontWeight: "700" }}>
            {title}
          </Text>
          <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 11, fontWeight: "500", marginTop: 3 }}>
            {subtitle}
          </Text>
        </View>
        <Text style={{ color: colors.muted, fontSize: 9, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 }}>
          {status}
        </Text>
        {available ? <Ionicons name="chevron-forward" size={16} color={colors.muted} /> : null}
      </View>
    </Pressable>
  );
}
