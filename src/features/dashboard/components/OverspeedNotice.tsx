import { View } from "react-native";
import { Text } from "../../../shared/ui/BrandText";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../../core/theme/ThemeProvider";

export function OverspeedNotice({ speedKmh, limitKmh }: { speedKmh: number; limitKmh: number }) {
  const { colors, isLofi } = useAppTheme();
  const accent = isLofi ? "#B91C1C" : "#F87171";

  return <View
    accessibilityRole="alert"
    style={{
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: isLofi ? "#F5B7B7" : "#7B3C46",
      borderLeftWidth: 4,
      borderLeftColor: accent,
      backgroundColor: isLofi ? "#FFF2F2" : "#2B1B2B",
      shadowColor: "#000000",
      shadowOpacity: 0.22,
      shadowRadius: 9,
      shadowOffset: { width: 0, height: 4 },
      elevation: 9,
    }}
  >
    <View style={{ width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: isLofi ? "#FADADA" : "#48303C" }}>
      <Ionicons name="speedometer" size={17} color={accent} />
    </View>
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text style={{ color: colors.text, fontSize: 12, fontWeight: "800" }}>Overspeeding</Text>
      <Text style={{ color: colors.muted, fontSize: 10, marginTop: 2 }}>Slow down · Limit {limitKmh} km/h</Text>
    </View>
    <View style={{ minWidth: 58, alignItems: "center", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 9, backgroundColor: isLofi ? "#F9DCDC" : "#4A303C" }}>
      <Text style={{ color: accent, fontSize: 12, fontWeight: "800" }}>{speedKmh} km/h</Text>
    </View>
  </View>;
}
