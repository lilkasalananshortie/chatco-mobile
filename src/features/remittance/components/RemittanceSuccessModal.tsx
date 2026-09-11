import { Pressable, Text, View } from "react-native";
import { useAppTheme } from "../../../core/theme/ThemeProvider";
import { ModalShell } from "../../../shared/ui";
import { Breakdown } from "./RemittanceConfirmModal";

export interface RemittanceSuccessModalProps {
  visible: boolean;
  onClose: () => void;
  accountableTotals: { all: number; cash: number; gcash: number };
  onShareReport: () => void;
  onReturn: () => void;
}

export function RemittanceSuccessModal({
  visible,
  onClose,
  accountableTotals,
  onShareReport,
  onReturn,
}: RemittanceSuccessModalProps) {
  const { colors, styles } = useAppTheme();

  return (
    <ModalShell visible={visible} title="Remittance complete" onClose={onClose}>
      <Text style={[styles.title, { color: colors.success }]}>Shift successfully closed</Text>
      <Text style={styles.subtitle}>
        The official end-of-day report was submitted to the existing ChatCo backend.
      </Text>
      <View style={styles.card}>
        <Breakdown label="Grand total" value={accountableTotals.all} />
        <Breakdown label="Cash to hand over" value={accountableTotals.cash} />
        <Breakdown label="GCash (digital)" value={accountableTotals.gcash} />
      </View>
      <Pressable style={[styles.button, styles.secondaryButton]} onPress={onShareReport}>
        <Text style={[styles.buttonText, styles.secondaryButtonText]}>Share report copy</Text>
      </Pressable>
      <Pressable style={styles.button} onPress={onReturn}>
        <Text style={styles.buttonText}>Return to unit verification</Text>
      </Pressable>
    </ModalShell>
  );
}
