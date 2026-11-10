import { Pressable, View } from "react-native";
import { Text } from "../../../shared/ui/BrandText";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../../core/theme/ThemeProvider";

export interface OfflineDepotNoticeProps {
  isOfflineDepot: boolean;
  onRetry: () => void;
}

export function OfflineDepotNotice({ isOfflineDepot, onRetry }: OfflineDepotNoticeProps) {
  const { colors, isLofi, styles , isLowFidelity } = useAppTheme();

  if (!isOfflineDepot) return null;

  return (
    <View
      style={[
        styles.card,
        {
          borderColor: colors.border,
          backgroundColor: colors.surface,
          marginTop: 10,
          borderRadius: isLowFidelity ? 3 : 14,
          padding: 12,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        },
      ]}
    >
      <Ionicons name="cloud-offline-outline" size={20} color={colors.muted} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: 12, fontWeight: "800" }}>
          Connection required to start a shift
        </Text>
        <Text
          style={{
            color: colors.muted,
            fontSize: 11,
            marginTop: 2,
            lineHeight: 15,
          }}
        >
          Cached assignments cannot authorize a shift. Reconnect to verify the assignment with CHATCO.
        </Text>
        <Pressable accessibilityRole="button" onPress={onRetry} style={{ alignSelf: "flex-start", marginTop: 8 }}>
          <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "700" }}>Retry connection</Text>
        </Pressable>
      </View>
    </View>
  );
}
