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
  const available = item.status === "available";

  if (isUnit) {
    const u = item as Unit;
    return (
      <Pressable
        disabled={!available}
        style={[
          styles.card,
          {
            marginTop: 0,
            padding: 14,
            borderColor: available ? colors.border : isLofi ? colors.border : "rgba(255,255,255,0.03)",
            borderRadius: isLofi ? 3 : 18,
            opacity: available ? 1 : 0.5,
          },
        ]}
        onPress={() => onSelect(u)}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: isLofi ? 2 : 12,
                backgroundColor: available
                  ? isLofi
                    ? colors.surface2
                    : "rgba(26, 95, 180, 0.15)"
                  : isLofi
                  ? colors.surface2
                  : "rgba(255,255,255,0.05)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name="bus-outline"
                size={22}
                color={available ? (isLofi ? colors.primary : "#62A0EA") : colors.muted}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: available ? colors.text : colors.muted, fontSize: 14, fontWeight: "800" }}>
                {u.unitNumber}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "500", marginTop: 2 }} numberOfLines={1}>
                {u.route}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "500", marginTop: 2 }}>
                {u.plateNumber}
              </Text>
            </View>
          </View>

          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: isLofi ? 2 : 999,
              borderWidth: isLofi ? 1.5 : 1,
              backgroundColor: available
                ? isLofi
                  ? "rgba(22, 112, 90, 0.12)"
                  : "rgba(52, 211, 153, 0.15)"
                : u.status === "maintenance"
                ? isLofi
                  ? "#FEF3C7"
                  : "rgba(245, 158, 11, 0.15)"
                : isLofi
                ? colors.surface2
                : "rgba(255,255,255,0.05)",
              borderColor: available
                ? isLofi
                  ? colors.success
                  : "rgba(52, 211, 153, 0.25)"
                : u.status === "maintenance"
                ? isLofi
                  ? colors.warning
                  : "rgba(245, 158, 11, 0.25)"
                : isLofi
                ? colors.border
                : "rgba(255,255,255,0.1)",
            }}
          >
            <Text
              style={{
                fontSize: 9,
                fontWeight: "800",
                textTransform: "uppercase",
                letterSpacing: 0.8,
                color: available
                  ? isLofi
                    ? colors.success
                    : "#34D399"
                  : u.status === "maintenance"
                  ? isLofi
                    ? colors.warning
                    : "#FBBF24"
                  : colors.muted,
              }}
            >
              {available ? "Available" : u.status === "maintenance" ? "Maintenance" : "In Use"}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  }

  const d = item as Driver;
  return (
    <Pressable
      disabled={!available}
      style={[
        styles.card,
        {
          marginTop: 0,
          padding: 14,
          borderColor: available ? colors.border : isLofi ? colors.border : "rgba(255,255,255,0.03)",
          borderRadius: isLofi ? 3 : 18,
          opacity: available ? 1 : 0.5,
        },
      ]}
      onPress={() => onSelect(d)}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: isLofi ? 2 : 21,
              backgroundColor: available
                ? isLofi
                  ? colors.surface2
                  : "rgba(26, 95, 180, 0.15)"
                : isLofi
                ? colors.surface2
                : "rgba(255,255,255,0.05)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "800",
                color: available ? (isLofi ? colors.primary : "#62A0EA") : colors.muted,
              }}
            >
              {d.name[0]?.toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: available ? colors.text : colors.muted, fontSize: 14, fontWeight: "800" }}>
              {d.name}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "500", marginTop: 2 }}>
              {available ? "Ready for dispatch" : "Currently on shift"}
            </Text>
          </View>
        </View>

        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: isLofi ? 2 : 999,
            borderWidth: isLofi ? 1.5 : 1,
            backgroundColor: available
              ? isLofi
                ? "rgba(22, 112, 90, 0.12)"
                : "rgba(52, 211, 153, 0.15)"
              : isLofi
              ? colors.surface2
              : "rgba(255,255,255,0.05)",
            borderColor: available
              ? isLofi
                ? colors.success
                : "rgba(52, 211, 153, 0.25)"
              : isLofi
              ? colors.border
              : "rgba(255,255,255,0.1)",
          }}
        >
          <Text
            style={{
              fontSize: 9,
              fontWeight: "800",
              textTransform: "uppercase",
              letterSpacing: 0.8,
              color: available ? (isLofi ? colors.success : "#34D399") : colors.muted,
            }}
          >
            {available ? "Available" : "On Shift"}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
