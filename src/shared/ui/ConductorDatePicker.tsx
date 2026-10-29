import { useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { Text } from "./BrandText";
import { ConductorIcon } from "./ConductorIcon";
import { useAppTheme } from "../../core/theme/ThemeProvider";

const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export function ConductorDatePicker({ value, onChange, min, max, placeholder = "Select date", label }: {
  value: string; onChange: (value: string) => void; min?: string; max?: string; placeholder?: string; label: string;
}) {
  const { isLofi } = useAppTheme();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const text = isLofi ? "#111827" : "#FFFFFF", muted = isLofi ? "#6B7280" : "rgba(255,255,255,0.5)", surface = isLofi ? "#FFFFFF" : "#071A2E", border = isLofi ? "#D1D5DB" : "rgba(255,255,255,0.1)";
  const selected = value ? new Date(`${value}T00:00:00`) : null;
  const cells = [...Array.from({ length: month.getDay() }, () => 0), ...Array.from({ length: new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate() }, (_, index) => index + 1)];
  const navigate = (months: number) => setMonth(current => new Date(current.getFullYear(), current.getMonth() + months, 1));
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => { const date = selected && !Number.isNaN(selected.getTime()) ? selected : new Date(); setMonth(new Date(date.getFullYear(), date.getMonth(), 1)); setOpen(true); }} style={{ minHeight: 32, borderWidth: 1, borderColor: border, borderRadius: 8, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6, backgroundColor: surface }}>
      <Text numberOfLines={1} style={{ color: selected ? text : muted, fontSize: 11, fontWeight: "600", flexShrink: 1 }}>{selected ? selected.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : placeholder}</Text>
      <ConductorIcon name="down" size={12} color={muted} />
    </Pressable>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 20, backgroundColor: "rgba(0,0,0,0.6)" }}>
        <Pressable accessibilityLabel="Close calendar" onPress={() => setOpen(false)} style={{ position: "absolute", inset: 0 }} />
        <View style={{ width: "100%", maxWidth: 360, padding: 16, borderRadius: 12, backgroundColor: surface, borderWidth: 1, borderColor: border }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            {[-12, -1].map(offset => <Pressable key={offset} accessibilityLabel={offset === -12 ? "Previous year" : "Previous month"} onPress={() => navigate(offset)} style={{ width: 30, height: 36, alignItems: "center", justifyContent: "center" }}><Text style={{ color: text, fontSize: 20 }}>{offset === -12 ? "«" : "‹"}</Text></Pressable>)}
            <Text style={{ color: text, fontSize: 13, fontWeight: "600", textAlign: "center", flex: 1 }}>{month.toLocaleDateString("en-PH", { month: "long", year: "numeric" })}</Text>
            {[1, 12].map(offset => <Pressable key={offset} accessibilityLabel={offset === 12 ? "Next year" : "Next month"} onPress={() => navigate(offset)} style={{ width: 30, height: 36, alignItems: "center", justifyContent: "center" }}><Text style={{ color: text, fontSize: 20 }}>{offset === 12 ? "»" : "›"}</Text></Pressable>)}
          </View>
          <View style={{ flexDirection: "row" }}>{["S", "M", "T", "W", "T", "F", "S"].map((day, index) => <Text key={index} style={{ width: `${100 / 7}%`, textAlign: "center", color: muted, fontSize: 10, paddingVertical: 8 }}>{day}</Text>)}</View>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>{cells.map((day, index) => {
            if (!day) return <View key={`empty-${index}`} style={{ width: `${100 / 7}%`, height: 40 }} />;
            const date = new Date(month.getFullYear(), month.getMonth(), day), key = dateKey(date);
            const disabled = Boolean((min && key < min) || (max && key > max));
            return <Pressable key={key} disabled={disabled} accessibilityRole="button" accessibilityLabel={date.toLocaleDateString("en-PH", { dateStyle: "full" })} accessibilityState={{ selected: key === value, disabled }} onPress={() => { onChange(key); setOpen(false); }} style={{ width: `${100 / 7}%`, height: 40, alignItems: "center", justifyContent: "center", opacity: disabled ? 0.3 : 1 }}><View style={{ width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: key === value ? "#1A5FB4" : "transparent" }}><Text style={{ color: key === value ? "#FFFFFF" : text, fontSize: 12 }}>{day}</Text></View></Pressable>;
          })}</View>
          <Pressable accessibilityRole="button" onPress={() => { onChange(""); setOpen(false); }} style={{ padding: 12, alignItems: "center", marginTop: 8, borderTopWidth: 1, borderColor: border }}><Text style={{ color: muted, fontSize: 12 }}>Clear date</Text></Pressable>
        </View>
      </View>
    </Modal>
  </>;
}
