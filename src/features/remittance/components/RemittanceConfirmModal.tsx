import { Modal, Pressable, ScrollView, View } from "react-native";
import { Text } from "../../../shared/ui/BrandText";
import { ConductorIcon } from "../../../shared/ui/ConductorIcon";
import { SlideToConfirm } from "../../../shared/ui/SlideToConfirm";
import { useReportTheme } from "../report-styles";
import { money } from "../remittance-helpers";

export interface RemittanceConfirmModalProps {
  visible: boolean; onClose: () => void; busy: boolean;
  shiftInfo: { driverName: string; unitNumber: string }; totalPassengers: number;
  accountableTotals: { all: number; cash: number; gcash: number };
  onConfirm: () => void | Promise<void>;
}

export function RemittanceConfirmModal({ visible, onClose, busy, shiftInfo, totalPassengers, accountableTotals, onConfirm }: RemittanceConfirmModalProps) {
  const { colors: c, isLofi } = useReportTheme();
  const muted = isLofi ? "#4B5563" : "rgba(255,255,255,0.4)";
  const divider = isLofi ? "#E5E7EB" : "rgba(255,255,255,0.04)";
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { if (!busy) onClose(); }}>
    <View style={{ flex: 1, backgroundColor: c.overlay, justifyContent: "flex-end", alignItems: "center", padding: 16 }}>
      <Pressable onPress={() => { if (!busy) onClose(); }} style={{ position: "absolute", inset: 0 }} accessibilityLabel="Close confirmation" />
      <View accessibilityViewIsModal style={{ width: "100%", maxWidth: 384, maxHeight: "90%", backgroundColor: c.dialog, borderWidth: 1, borderColor: isLofi ? "#E5E7EB" : "rgba(255,255,255,0.1)", borderRadius: 24, overflow: "hidden" }}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }} bounces={false}>
          <View style={{ alignItems: "center" }}><ConductorIcon name="cash" size={32} color={c.muted} /></View>
          <View style={{ alignItems: "center" }}>
            <Text style={{ color: c.text, fontSize: 18, lineHeight: 28, fontWeight: "700" }}>Confirm Remittance</Text>
            <Text style={{ color: c.muted, fontSize: 12, lineHeight: 16, marginTop: 4 }}>Submit shift report to admin</Text>
          </View>
          <View style={{ backgroundColor: c.surface2, borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 16, gap: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}><Text style={{ color: muted, fontSize: 14 }}>Driver / Unit</Text><Text style={{ color: c.text, fontSize: 14, fontWeight: "600", flexShrink: 1, textAlign: "right" }}>{shiftInfo.driverName} / {shiftInfo.unitNumber}</Text></View>
            <View style={{ height: 1, backgroundColor: divider }} />
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={{ color: muted, fontSize: 14 }}>Total Passengers</Text><Text style={{ color: c.text, fontSize: 14, fontWeight: "700" }}>{totalPassengers}</Text></View>
            <View style={{ height: 1, backgroundColor: divider }} />
            {[
              { label: "GCash (digital)", value: accountableTotals.gcash },
              { label: "Cash (system-tracked)", value: accountableTotals.cash },
            ].map(row => <View key={row.label} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <Text style={{ color: muted, fontSize: 14 }}>{row.label}</Text>
              <Text style={{ color: c.text, fontSize: 14, fontWeight: "700" }}>{money(row.value)}</Text>
            </View>)}
            <View style={{ height: 1, backgroundColor: isLofi ? "#E5E7EB" : "rgba(255,255,255,0.1)" }} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><Text style={{ color: muted, fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 }}>Grand Total</Text><Text style={{ color: c.text, fontSize: 18, fontWeight: "800" }}>{money(accountableTotals.all)}</Text></View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: c.surface2, borderWidth: 1, borderColor: c.border, padding: 12, borderRadius: 12 }}>
            <ConductorIcon name="info" size={16} color={c.muted} strokeWidth={2} />
            <Text style={{ flex: 1, color: c.secondary, fontSize: 11, lineHeight: 18 }}>Hand over <Text style={{ color: c.text, fontWeight: "700" }}>{money(accountableTotals.cash)}</Text> in cash to admin. They'll count it and record the official Cash Declaration for this shift.</Text>
          </View>
          <View style={{ gap: 12 }}>
            <SlideToConfirm rounded commitRatio={0.9} label="Slide to confirm remittance" disabledLabel="Processing..." disabled={busy} onComplete={onConfirm} trackColor={isLofi ? "#F3F4F6" : c.surface2} handleColor="#1A5FB4" textColor={c.muted} style={{ marginTop: 0, borderWidth: 1, borderColor: c.border }} />
            <Pressable accessibilityRole="button" disabled={busy} onPress={onClose} style={{ paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: isLofi ? "#F3F4F6" : c.surface2, alignItems: "center", opacity: busy ? 0.5 : 1 }}><Text style={{ color: c.secondary, fontSize: 14, fontWeight: "600" }}>Cancel</Text></Pressable>
          </View>
        </ScrollView>
      </View>
    </View>
  </Modal>;
}
