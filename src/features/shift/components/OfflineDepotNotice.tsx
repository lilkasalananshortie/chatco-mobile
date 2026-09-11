import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Remittance } from "../../../core/domain/types";
import { useAppTheme } from "../../../core/theme/ThemeProvider";

export interface OfflineDepotNoticeProps {
  isOfflineDepot: boolean;
}

export function OfflineDepotNotice({ isOfflineDepot }: OfflineDepotNoticeProps) {
  const { colors, isLofi, styles } = useAppTheme();

  if (!isOfflineDepot) return null;

  return (
    <View
      style={[
        styles.card,
        {
          borderColor: isLofi ? "#D97706" : "rgba(245, 158, 11, 0.35)",
          backgroundColor: isLofi ? "#FEF3C7" : "rgba(245, 158, 11, 0.08)",
          marginTop: 10,
          borderRadius: isLofi ? 3 : 14,
          padding: 12,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        },
      ]}
    >
      <Ionicons name="cloud-offline-outline" size={20} color={isLofi ? "#B45309" : "#FBBF24"} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: isLofi ? "#92400E" : "#FBBF24", fontSize: 12, fontWeight: "800" }}>
          Offline Depot Mode (Cached Assignments)
        </Text>
        <Text
          style={{
            color: isLofi ? "#78350F" : colors.muted,
            fontSize: 11,
            marginTop: 2,
            lineHeight: 15,
          }}
        >
          Duty can be started locally without internet. Cash ticketing is immediately functional and
          will auto-sync once connected.
        </Text>
      </View>
    </View>
  );
}
