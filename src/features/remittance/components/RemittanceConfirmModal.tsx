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
          <View style={{ alignItems: "center" }}><View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: isLofi ? "#F3F4F6" : "rgba(26,95,180,0.15)", alignItems: "center", justifyContent: "center" }}><ConductorIcon name="cash" size={28} color={c.primary} /></View></View>
          <View style={{ alignItems: "center" }}>
            <Text style={{ color: c.text, fontSize: 18, lineHeight: 28, fontWeight: "700" }}>Confirm Remittance</Text>
            <Text style={{ color: c.muted, fontSize: 12, lineHeight: 16, marginTop: 4 }}>Submit shift report to admin</Text>
          </View>
          <View style={{ backgroundColor: isLofi ? "#F9FAFB" : "rgba(255,255,255,0.03)", borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 16, gap: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}><Text style={{ color: muted, fontSize: 14 }}>Driver / Unit</Text><Text style={{ color: c.text, fontSize: 14, fontWeight: "600", flexShrink: 1, textAlign: "right" }}>{shiftInfo.driverName} / {shiftInfo.unitNumber}</Text></View>
            <View style={{ height: 1, backgroundColor: divider }} />
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={{ color: muted, fontSize: 14 }}>Total Passengers</Text><Text style={{ color: c.text, fontSize: 14, fontWeight: "700" }}>{totalPassengers}</Text></View>
            <View style={{ height: 1, backgroundColor: divider }} />
            {[
              { label: "GCash (digital)", value: accountableTotals.gcash, color: "#60A5FA" },
              { label: "Cash (system-tracked)", value: accountableTotals.cash, color: "#34D399" },
            ].map(row => <View key={row.label} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isLofi ? c.action : row.color }} /><Text style={{ color: muted, fontSize: 14 }}>{row.label}</Text></View>
              <Text style={{ color: isLofi ? c.text : row.color, fontSize: 14, fontWeight: "700" }}>{money(row.value)}</Text>
            </View>)}
            <View style={{ height: 1, backgroundColor: isLofi ? "#E5E7EB" : "rgba(255,255,255,0.1)" }} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><Text style={{ color: muted, fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 }}>Grand Total</Text><Text style={{ color: c.text, fontSize: 18, fontWeight: "800" }}>{money(accountableTotals.all)}</Text></View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: isLofi ? "#F9FAFB" : "rgba(59,130,246,0.08)", borderWidth: 1, borderColor: isLofi ? "#E5E7EB" : "rgba(59,130,246,0.15)", padding: 12, borderRadius: 12 }}>
            <ConductorIcon name="info" size={16} color={isLofi ? c.action : "#60A5FA"} strokeWidth={2} />
            <Text style={{ flex: 1, color: isLofi ? "#374151" : "rgba(96,165,250,0.7)", fontSize: 11, lineHeight: 18 }}>Hand over <Text style={{ color: isLofi ? c.text : "#60A5FA", fontWeight: "700" }}>{money(accountableTotals.cash)}</Text> in cash to admin. They'll count it and record the official Cash Declaration for this shift.</Text>
          </View>
          <View style={{ gap: 12 }}>
            <SlideToConfirm rounded commitRatio={0.9} label="Slide to confirm remittance" disabledLabel="Processing..." disabled={busy} onComplete={onConfirm} trackColor={isLofi ? "#F3F4F6" : "rgba(26,95,180,0.12)"} handleColor="#1A5FB4" textColor={isLofi ? "#374151" : "#9DCCFF"} style={{ marginTop: 0, borderWidth: 1, borderColor: isLofi ? "#D1D5DB" : "rgba(98,160,234,0.25)" }} />
            <Pressable accessibilityRole="button" disabled={busy} onPress={onClose} style={{ paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: isLofi ? "#D1D5DB" : "rgba(255,255,255,0.1)", backgroundColor: isLofi ? "#F3F4F6" : "rgba(255,255,255,0.05)", alignItems: "center", opacity: busy ? 0.5 : 1 }}><Text style={{ color: isLofi ? "#374151" : "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: "600" }}>Cancel</Text></Pressable>
          </View>
        </ScrollView>
      </View>
    </View>
  </Modal>;
}
