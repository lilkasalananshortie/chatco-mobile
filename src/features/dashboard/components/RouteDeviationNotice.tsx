import { View } from "react-native";
import { Text } from "../../../shared/ui/BrandText";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../../core/theme/ThemeProvider";
import { CORRIDOR_DEVIATION_THRESHOLD_METERS } from "../../../core/utils/corridor-guard";

export function RouteDeviationNotice({ distanceMeters }: { distanceMeters: number }) {
  const { colors, isLofi } = useAppTheme();
  if (distanceMeters <= CORRIDOR_DEVIATION_THRESHOLD_METERS) return null;

  const accent = isLofi ? "#A16207" : "#D4AA4C";
  return (
    <View
      accessibilityRole="alert"
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: isLofi ? "#E8C979" : "#705A2D",
        borderLeftWidth: 4,
        borderLeftColor: accent,
        backgroundColor: isLofi ? "#FFFAE9" : "#122235",
        shadowColor: "#000000",
        shadowOpacity: 0.22,
        shadowRadius: 9,
        shadowOffset: { width: 0, height: 4 },
        elevation: 9,
      }}
    >
      <View style={{ width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: isLofi ? "#F5E7BE" : "#253448" }}>
        <Ionicons name="warning" size={17} color={accent} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: colors.text, fontSize: 12, fontWeight: "800" }}>Route deviation</Text>
        <Text style={{ color: colors.muted, fontSize: 10, marginTop: 2 }}>Vehicle is outside the authorized route.</Text>
      </View>
      <View style={{ minWidth: 58, alignItems: "center", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 9, backgroundColor: isLofi ? "#F3E4B8" : "#29394A" }}>
        <Text style={{ color: accent, fontSize: 12, fontWeight: "800" }}>{Math.round(distanceMeters)} m</Text>
      </View>
    </View>
  );
}
