import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { Text } from "../../shared/ui/BrandText";
import { useReportTheme } from "./report-styles";
import { VerificationBackButton } from "../../shared/ui";

export function ReportPage({ children, onBack }: { children: ReactNode; onBack?: () => void }) {
  const { colors, styles } = useReportTheme();
  return <View style={styles.screen}>
    <View style={styles.pageHeader}>
      {onBack && <VerificationBackButton onPress={onBack} iconOnly />}
      <Text accessibilityRole="header" style={styles.title}>End of Day Report</Text>
    </View>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" style={{ backgroundColor: colors.background }}>{children}</ScrollView>
  </View>;
}
