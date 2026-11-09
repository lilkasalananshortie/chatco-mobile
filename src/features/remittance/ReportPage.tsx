import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "../../shared/ui/BrandText";
import { useReportTheme } from "./report-styles";

export function ReportPage({ children }: { children: ReactNode; onBack?: () => void }) {
  const { colors, styles } = useReportTheme();
  return <SafeAreaView edges={["top"]} style={styles.screen}>
    <View style={styles.pageHeader}>
      <Text accessibilityRole="header" style={styles.title}>End of Day Report</Text>
    </View>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" style={{ backgroundColor: colors.background }}>{children}</ScrollView>
  </SafeAreaView>;
}
