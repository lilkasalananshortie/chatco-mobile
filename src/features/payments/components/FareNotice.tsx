import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../../../shared/ui/BrandText";
import { usePaymentTheme } from "../../../core/theme/payment-theme";

export function FareNotice({ message }: { message: string }) {
  const { isLofi } = usePaymentTheme();
  const offline = message.startsWith("Offline:");
  const color = offline ? (isLofi ? "#1D4ED8" : "#93C5FD") : (isLofi ? "#B91C1C" : "#FCA5A5");
  const borderColor = offline ? (isLofi ? "#BFDBFE" : "#1E4D7A") : (isLofi ? "#FECACA" : "#7F1D1D");
  const backgroundColor = offline ? (isLofi ? "#EFF6FF" : "#0B2845") : (isLofi ? "#FEF2F2" : "#3B171C");

  return <View accessibilityLiveRegion="polite" style={{ flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 16, marginVertical: 8, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderRadius: 8, borderColor, backgroundColor }}>
    <Ionicons name={offline ? "information-circle-outline" : "alert-circle-outline"} size={16} color={color} />
    <Text style={{ flex: 1, color, fontSize: 12, lineHeight: 17 }}>{message}</Text>
  </View>;
}
