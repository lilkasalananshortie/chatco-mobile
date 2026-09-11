import { Pressable, Text, View } from "react-native";
import type { Remittance, Shift } from "../../../core/domain/types";
import { useAppTheme } from "../../../core/theme/ThemeProvider";
import { ModalShell } from "../../../shared/ui";

const money = (value: number | string | undefined) => `₱${Number(value ?? 0).toFixed(2)}`;

function ReportLine({ label, value }: { label: string; value: string | number }) {
  const { styles } = useAppTheme();
  return (
    <View style={{ marginBottom: 13 }}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.cardTitle}>{String(value)}</Text>
    </View>
  );
}

export interface RemittanceReportSlipModalProps {
  selected: Remittance | null;
  onClose: () => void;
  shift: Shift;
  onShare: (item: Remittance) => void;
}

export function RemittanceReportSlipModal({
  selected,
  onClose,
  shift,
  onShare,
}: RemittanceReportSlipModalProps) {
  const { colors, styles } = useAppTheme();

  return (
    <ModalShell visible={selected !== null} title="Official remittance report" onClose={onClose}>
      {selected ? (
        <>
          <View style={{ alignItems: "center", marginVertical: 8 }}>
            <Text style={[styles.title, { fontSize: 20, letterSpacing: 1 }]}>CHATCO</Text>
            <Text style={[styles.label, { fontSize: 9, letterSpacing: 1.5, marginTop: 2 }]}>
              End of Day Remittance Report
            </Text>
          </View>
          <View style={{ height: 1, backgroundColor: colors.border, marginBottom: 12 }} />
          <View style={styles.card}>
            <ReportLine label="Date" value={selected.date ?? selected.remitted_at ?? "—"} />
            <ReportLine label="Shift ID" value={selected.shift_id ?? "—"} />
            <ReportLine label="Conductor" value={selected.conductor_name ?? shift.conductorName} />
            <ReportLine label="Driver" value={selected.driver_name ?? shift.driverName} />
            <ReportLine label="Unit Number" value={selected.unit_number ?? shift.unitNumber} />
            <ReportLine label="Passengers" value={Number(selected.total_passengers ?? 0)} />
            <ReportLine label="Cash Accountable" value={money(selected.cash_total)} />
            <ReportLine label="GCash (Digital)" value={money(selected.gcash_total)} />
            <ReportLine label="Voucher" value={money(selected.voucher_total)} />
            <ReportLine label="Total Cashless" value={money(selected.total_cashless)} />
            <ReportLine
              label="Grand Total"
              value={money(selected.declared_amount ?? selected.total_collected)}
            />
            <ReportLine
              label="Status"
              value={selected.remittance_status ?? selected.status ?? "Submitted"}
            />
          </View>
          <Pressable style={styles.button} onPress={() => onShare(selected)}>
            <Text style={styles.buttonText}>Share official report</Text>
          </Pressable>
        </>
      ) : null}
    </ModalShell>
  );
}
