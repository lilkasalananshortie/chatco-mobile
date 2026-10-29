import type { ReactNode } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "../../shared/ui/BrandText";
import { ConductorIcon } from "../../shared/ui/ConductorIcon";
import { useReportTheme } from "./report-styles";

export function ReportPage({ children, onBack }: { children: ReactNode; onBack?: () => void }) {
  const { colors, styles, isLofi } = useReportTheme();
  return <SafeAreaView edges={["top"]} style={styles.screen}>
    <View style={styles.pageHeader}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} style={styles.back}>
        <ConductorIcon name="back" size={20} color={isLofi ? "#4B5563" : "rgba(255,255,255,0.6)"} strokeWidth={2} />
      </Pressable>
      <Text accessibilityRole="header" style={styles.title}>End of Day Report</Text>
    </View>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" style={{ backgroundColor: colors.background }}>{children}</ScrollView>
  </SafeAreaView>;
}
