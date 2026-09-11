import { Text, View } from "react-native";
import { useAppTheme } from "../../../core/theme/ThemeProvider";
import { ModalShell } from "../../../shared/ui";
import { SlideToConfirm } from "../../../shared/ui/SlideToConfirm";

const money = (value: number | string | undefined) => `₱${Number(value ?? 0).toFixed(2)}`;

export function Breakdown({ label, value }: { label: string; value: number }) {
  const { styles } = useAppTheme();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}>
      <Text style={styles.subtitle}>{label}</Text>
      <Text style={styles.cardTitle}>{money(value)}</Text>
    </View>
  );
}

export interface RemittanceConfirmModalProps {
  visible: boolean;
  onClose: () => void;
  busy: boolean;
  accountableTotals: { all: number; cash: number; gcash: number; voucher: number };
  onConfirm: () => void;
}

export function RemittanceConfirmModal({
  visible,
  onClose,
  busy,
  accountableTotals,
  onConfirm,
}: RemittanceConfirmModalProps) {
  const { styles } = useAppTheme();

  return (
    <ModalShell visible={visible} title="Confirm remittance" onClose={onClose}>
      <Text style={styles.subtitle}>
        Review these amounts carefully. Sliding submits the report and closes the active shift. Admin
        will count the physical cash separately.
      </Text>
      <View style={styles.card}>
        <Breakdown label="Total collected" value={accountableTotals.all} />
        <Breakdown label="Cash accountable" value={accountableTotals.cash} />
        <Breakdown label="GCash (digital)" value={accountableTotals.gcash} />
        <Breakdown label="Voucher" value={accountableTotals.voucher} />
      </View>
      <SlideToConfirm label="Slide to confirm remittance" disabled={busy} onComplete={onConfirm} />
    </ModalShell>
  );
}
