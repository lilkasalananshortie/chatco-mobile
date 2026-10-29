import { Modal, Pressable, View } from "react-native";
import { Text } from "../../../shared/ui/BrandText";
import { Ionicons } from "@expo/vector-icons";
import { useReportTheme } from "../report-styles";
import { money } from "../remittance-helpers";

export interface RemittanceSuccessModalProps {
  visible: boolean;
  onClose: () => void;
  accountableTotals: { all: number; cash: number; gcash: number };
  unitNumber: string;
}

export function RemittanceSuccessModal({ visible, onClose, accountableTotals, unitNumber }: RemittanceSuccessModalProps) {
  const { colors, isLofi, styles } = useReportTheme();

  return (
    <Modal visible={visible} transparent animationType={isLofi ? "none" : "fade"} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.overlay, alignItems: "center", justifyContent: "center", padding: 16 }}>
        <View accessibilityViewIsModal style={{ width: "100%", maxWidth: 384, backgroundColor: colors.dialog, borderWidth: 1, borderColor: colors.hairline, borderRadius: 12, padding: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
            <Ionicons name="checkmark-circle" size={32} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { fontSize: 18, lineHeight: 25, fontWeight: "600" }]}>Submitted to Admin</Text>
              <Text style={[styles.subtitle, { color: isLofi ? "#6B7280" : "rgba(255,255,255,0.6)", fontSize: 14, marginTop: 4, lineHeight: 23 }]}>
                Report for <Text style={{ color: colors.text, fontWeight: "700" }}>{unitNumber}</Text> submitted successfully.
              </Text>
            </View>
          </View>

          <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border, marginTop: 18 }}>
            {[
              { label: "GCash (Digital)", value: accountableTotals.gcash },
              { label: "Cash to hand over", value: accountableTotals.cash },
              { label: "Total", value: accountableTotals.all, strong: true },
            ].map((row) => (
              <View key={row.label} style={{ minHeight: 45, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: row.label === "Total" ? 0 : 1, borderColor: colors.border }}>
                <Text style={{ color: row.strong ? colors.text : isLofi ? "#6B7280" : "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: row.strong ? "600" : "400" }}>{row.label}</Text>
                <Text style={{ color: colors.text, fontSize: row.strong ? 18 : 14, fontWeight: row.strong ? "700" : "600", fontVariant: ["tabular-nums"] }}>{money(row.value)}</Text>
              </View>
            ))}
          </View>

          <Text style={[styles.subtitle, { marginTop: 16, fontSize: 12, lineHeight: 19 }]}>
            Hand the cash to the admin. They count it and record the cash declaration. Redirecting to login…
          </Text>
          <Pressable accessibilityRole="button" onPress={onClose} style={[styles.button, { minHeight: 44, paddingVertical: 10, borderRadius: 8, marginTop: 20 }]}>
            <Text style={styles.buttonText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
