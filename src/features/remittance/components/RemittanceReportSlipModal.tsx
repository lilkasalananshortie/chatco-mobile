import { Modal, Pressable, ScrollView, View } from "react-native";
import { Text } from "../../../shared/ui/BrandText";
import { Ionicons } from "@expo/vector-icons";
import type { Remittance, Shift } from "../../../core/domain/types";
import { useReportTheme } from "../report-styles";
import { money, remittanceStatusLabel } from "../remittance-helpers";

function timeLabel(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", hour12: true });
}

function dateLabel(value?: string) {
  if (!value) return "—";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

function ReportDetail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  const { colors, styles } = useReportTheme();
  return (
    <View style={{ flex: 1, minWidth: "45%", gap: 3 }}>
      <Text style={styles.label}>{label}</Text>
      <Text selectable style={{ color: colors.text, fontSize: mono ? 12 : 14, lineHeight: 20, fontWeight: "500", fontFamily: mono ? "monospace" : undefined }}>{value}</Text>
    </View>
  );
}

export interface RemittanceReportSlipModalProps {
  selected: Remittance | null;
  onClose: () => void;
  shift: Shift;
}

export function RemittanceReportSlipModal({ selected, onClose, shift }: RemittanceReportSlipModalProps) {
  const { colors, isLofi, styles } = useReportTheme();
  const total = selected ? (Number(selected.cash_total) || 0) + (Number(selected.gcash_total) || 0) : 0;

  return (
    <Modal visible={selected !== null} transparent animationType={isLofi ? "none" : "fade"} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.overlay, alignItems: "center", justifyContent: "center", padding: 16 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close official report" onPress={onClose} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} />
        <View accessibilityViewIsModal style={{ width: "100%", maxWidth: 448, maxHeight: "94%", backgroundColor: colors.dialog, borderWidth: 1, borderColor: colors.hairline, borderRadius: 12, overflow: "hidden" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderColor: colors.border }}>
            <Ionicons name="document-text-outline" size={22} color={colors.primary} />
            <Text style={{ flex: 1, color: colors.text, fontSize: 16, fontWeight: "700" }}>Official report</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close official report" onPress={onClose} style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="close" size={20} color={colors.muted} />
            </Pressable>
          </View>

          {selected ? (
            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 20 }}>
              <View style={{ alignItems: "center", marginBottom: 4 }}>
                <Text style={{ color: colors.text, fontSize: 20, fontWeight: "800", letterSpacing: 1.5 }}>CHATCO</Text>
                <Text style={[styles.label, { marginTop: 3 }]}>End-of-day remittance report</Text>
              </View>
              <View style={{ height: 1, backgroundColor: colors.border, marginTop: 16, marginBottom: 15 }} />
              <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 12, rowGap: 15 }}>
                <ReportDetail label="Date" value={dateLabel(selected.date ?? selected.remitted_at)} />
                <ReportDetail label="Shift ID" value={selected.shift_id ?? "—"} mono />
                <ReportDetail label="Conductor" value={selected.conductor_name || shift.conductorName} />
                <ReportDetail label="Driver" value={selected.driver_name || shift.driverName} />
                <ReportDetail label="Time in" value={timeLabel(selected.time_in)} />
                <ReportDetail label="Time out" value={timeLabel(selected.time_out)} />
                <ReportDetail label="Unit" value={selected.unit_number || shift.unitNumber} />
                <ReportDetail label="Route" value={selected.route || shift.route || "—"} />
              </View>

              <View style={{ marginTop: 22 }}>
                <Text style={styles.label}>Payment breakdown</Text>
                <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border, marginTop: 7 }}>
                  {[
                    { label: "GCash", value: money(selected.gcash_total) },
                    { label: "Cash", value: money(selected.cash_total) },
                    { label: "Grand total", value: money(total), strong: true },
                  ].map((row) => (
                    <View key={row.label} style={{ minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: row.label === "Grand total" ? 0 : 1, borderColor: colors.border }}>
                      <Text style={{ color: row.strong ? colors.text : colors.muted, fontSize: 13, fontWeight: row.strong ? "700" : "500" }}>{row.label}</Text>
                      <Text style={{ color: colors.text, fontSize: row.strong ? 17 : 13, fontWeight: row.strong ? "800" : "500", fontVariant: ["tabular-nums"] }}>{row.value}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 18 }}>
                <Text style={[styles.subtitle, { fontSize: 12 }]}>Remittance status</Text>
                <Text style={{ color: colors.text, fontSize: 12, fontWeight: "700", textAlign: "right", flexShrink: 1 }}>{remittanceStatusLabel(selected)}</Text>
              </View>
              <Text style={{ color: colors.muted, textAlign: "center", fontFamily: "monospace", fontSize: 10, marginTop: 18 }}>
                Generated {new Date().toLocaleString("en-PH", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true })}
              </Text>
            </ScrollView>
          ) : null}

          <View style={{ paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1, borderColor: colors.border }}>
            <Pressable accessibilityRole="button" onPress={onClose} style={[styles.button, styles.secondaryButton]}>
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>Close</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
