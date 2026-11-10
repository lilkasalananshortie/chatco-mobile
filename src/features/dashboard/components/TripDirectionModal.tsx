import { useEffect, useRef, useState } from "react";
import { Animated, Modal, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "../../../shared/ui/BrandText";
import { ConductorIcon } from "../../../shared/ui/ConductorIcon";
import { SlideToConfirm } from "../../../shared/ui/SlideToConfirm";
import { useAppTheme } from "../../../core/theme/ThemeProvider";
import { useWebEntrance } from "../../../shared/ui/useWebEntrance";
import type { TripDirection } from "../../../core/utils/trip-cycle-tracker";

export function TripDirectionModal({ direction, onClose, onSave }: {
  direction: TripDirection;
  onClose: () => void;
  onSave: (direction: TripDirection) => Promise<void>;
}) {
  const { colors, isLofi, isLowFidelity } = useAppTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const centered = width >= 640;
  const [draft, setDraft] = useState(direction);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [sliderRound, setSliderRound] = useState(0);
  const entrance = useWebEntrance(true, isLowFidelity);
  const confirmationEntrance = useWebEntrance(confirming, isLowFidelity);
  const savingRef = useRef(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (resetTimer.current) clearTimeout(resetTimer.current); }, []);
  const from = draft === "SOUTHBOUND" ? "Calumpit" : "Meycauayan";
  const to = draft === "SOUTHBOUND" ? "Meycauayan" : "Calumpit";
  const accent = isLofi ? "#1A5FB4" : "#62A0EA";
  const panel = isLofi ? "#FFFFFF" : "#071A2E";
  const border = isLofi ? "#E5E7EB" : "rgba(255,255,255,0.1)";
  const muted = isLofi ? "#6B7280" : "rgba(255,255,255,0.55)";
  const close = () => { if (!savingRef.current) onClose(); };
  const closeConfirmation = () => { if (!savingRef.current) setConfirming(false); };
  const save = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError("");
    try { await onSave(draft); onClose(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to update trip direction."); }
    finally { savingRef.current = false; setSaving(false); }
  };

  return <Modal visible transparent animationType="none" onRequestClose={confirming ? closeConfirmation : close}>
    <View style={{ flex: 1, alignItems: "center", justifyContent: centered ? "center" : "flex-end", padding: centered ? 16 : 0 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close trip direction" onPress={close} style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.6)" }]} />
      <Animated.View pointerEvents={confirming ? "none" : "auto"} accessibilityViewIsModal={!confirming} accessibilityElementsHidden={confirming} importantForAccessibility={confirming ? "no-hide-descendants" : "auto"} style={[{ width: "100%", maxWidth: centered ? 384 : undefined, overflow: "hidden", borderTopLeftRadius: 16, borderTopRightRadius: 16, borderBottomLeftRadius: centered ? 16 : 0, borderBottomRightRadius: centered ? 16 : 0, borderWidth: 1, borderColor: border, backgroundColor: panel, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24 + (centered ? 0 : insets.bottom), shadowColor: "#000000", shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 12 }, entrance]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close trip direction" disabled={saving} hitSlop={6} onPress={close} style={{ position: "absolute", right: 12, top: 12, width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: border, backgroundColor: isLofi ? "#FFFFFF" : "#131C2E", alignItems: "center", justifyContent: "center" }}><ConductorIcon name="close" size={16} strokeWidth={2} color={muted} /></Pressable>
        <Text style={{ paddingRight: 40, color: isLofi ? "#6B7280" : "rgba(255,255,255,0.4)", fontSize: 10, lineHeight: 15, fontWeight: "600", letterSpacing: 0.8 }}>TRIP DIRECTION</Text>
        <Text accessibilityRole="header" style={{ marginTop: 6, color: colors.text, fontSize: 18, lineHeight: 28, fontWeight: "700" }}>{from} → {to}</Text>
        <Text style={{ color: muted, fontSize: 14, lineHeight: 22, marginTop: 4, marginBottom: 20 }}>Slide to switch the direction, then save.</Text>
        <SlideToConfirm key={sliderRound} rounded expandHandle reverse={draft === "NORTHBOUND"} commitRatio={0.9} label="Slide to switch direction" uppercaseLabel={false} labelFontSize={14} labelFontWeight="600" successLabel="Switched" trackColor={isLofi ? "#EEF2F7" : "#1A2540"} handleColor={accent} textColor={isLofi ? "#154C90" : "#7AACEA"} successColor={accent} successTextColor={isLofi ? "#FFFFFF" : "#111111"} handleContentColor={isLofi ? "#FFFFFF" : "#111111"} onComplete={() => true} onSuccess={() => {
          setDraft(value => value === "SOUTHBOUND" ? "NORTHBOUND" : "SOUTHBOUND");
          resetTimer.current = setTimeout(() => setSliderRound(value => value + 1), 900);
        }} style={{ marginTop: 0, borderWidth: 0 }} />
        {draft !== direction ? <Pressable accessibilityRole="button" onPress={() => { setError(""); setConfirming(true); }} style={{ marginTop: 16, minHeight: 44, borderRadius: 12, backgroundColor: "#1A5FB4", alignItems: "center", justifyContent: "center", paddingHorizontal: 16, paddingVertical: 10 }}><Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "700" }}>Save</Text></Pressable> : null}
      </Animated.View>

      {confirming ? <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center", padding: 16 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss direction confirmation" onPress={closeConfirmation} style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.6)" }]} />
        <Animated.View accessibilityViewIsModal style={[{ width: "100%", maxWidth: 384, padding: 24, borderRadius: 16, borderWidth: 1, borderColor: border, backgroundColor: panel, elevation: 20 }, confirmationEntrance]}>
          <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 18, lineHeight: 28, fontWeight: "700" }}>Change trip direction?</Text>
          <Text style={{ color: muted, fontSize: 14, lineHeight: 22, marginTop: 4 }}>The unit will be set to {from} → {to}.</Text>
          {error ? <Text accessibilityRole="alert" style={{ marginTop: 12, padding: 12, borderRadius: 8, backgroundColor: isLofi ? "#FEF2F2" : "#450A0A", color: isLofi ? "#B91C1C" : "#FCA5A5", fontSize: 12 }}>{error}</Text> : null}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 20 }}>
            <Pressable accessibilityRole="button" disabled={saving} onPress={closeConfirmation} style={{ flex: 1, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: border, backgroundColor: isLofi ? "#FFFFFF" : "#131C2E", alignItems: "center", justifyContent: "center", opacity: saving ? 0.5 : 1 }}><Text style={{ color: colors.text, fontSize: 14, fontWeight: "700" }}>Cancel</Text></Pressable>
            <Pressable accessibilityRole="button" disabled={saving} onPress={() => void save()} style={{ flex: 1, minHeight: 44, borderRadius: 12, backgroundColor: "#1A5FB4", alignItems: "center", justifyContent: "center", opacity: saving ? 0.6 : 1 }}><Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "700" }}>{saving ? "Saving..." : "Confirm"}</Text></Pressable>
          </View>
        </Animated.View>
      </View> : null}
    </View>
  </Modal>;
}
