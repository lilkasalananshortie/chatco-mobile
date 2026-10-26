import { Pressable, Text, View } from "react-native";
import { useAppTheme } from "../../core/theme/ThemeProvider";
import { openLegalLink } from "./legal-links";

export function LegalSupportCard({ compact = false }: { compact?: boolean }) {
  const { colors } = useAppTheme();
  if (compact) return <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", columnGap: 20, paddingVertical: 8 }}>
    {([["terms", "Terms"], ["privacy", "Privacy"], ["support", "Help"]] as const).map(([kind, label]) =>
      <Pressable key={kind} accessibilityRole="link" accessibilityLabel={`${label}, opens another app`} onPress={() => void openLegalLink(kind)} style={{ minHeight: 48, justifyContent: "center", paddingHorizontal: 6 }}>
        <Text style={{ color: colors.muted, fontSize: 13 }}>{label}</Text>
      </Pressable>)}
  </View>;
  return <View style={{ padding: 18, marginVertical: 16, gap: 8, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 16 }}>
    <Text accessibilityRole="header" style={{ color: colors.text, fontWeight: "700", fontSize: 18 }}>Legal & Support</Text>
    {([["terms", "Terms of Service"], ["privacy", "Privacy Policy"], ["support", "Contact support"]] as const).map(([kind, label]) =>
      <Pressable key={kind} accessibilityRole="link" accessibilityLabel={`${label}, opens another app`} onPress={() => void openLegalLink(kind)} style={{ minHeight: 48, justifyContent: "center" }}>
        <Text style={{ color: colors.primaryLight, fontSize: 16 }}>{label}</Text>
      </Pressable>)}
    <Text style={{ color: colors.muted, lineHeight: 21 }}>Contact your operator for assignment or cash-remittance questions. For app issues, describe what happened without sharing passwords, verification codes, or passenger documents.</Text>
  </View>;
}
