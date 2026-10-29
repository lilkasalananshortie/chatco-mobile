import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "../../../shared/ui/BrandText";
import { ConductorIcon } from "../../../shared/ui/ConductorIcon";
import { SlideToConfirm } from "../../../shared/ui/SlideToConfirm";
import { useAppTheme } from "../../../core/theme/ThemeProvider";

export interface BreakConfirmModalProps {
  visible: boolean; isOnBreak: boolean; breakPending: boolean; error?: string;
  onClose: () => void; onConfirm: () => Promise<boolean>;
}

export function BreakConfirmModal({ visible, isOnBreak, breakPending, error, onClose, onConfirm }: BreakConfirmModalProps) {
  const { isLofi } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const centered = width >= 640;
  const wasOnBreak = useRef(isOnBreak).current;
  const actionColor = wasOnBreak ? (isLofi ? "#1A5FB4" : "#62A0EA") : (isLofi ? "#F59E0B" : "#FBBF24");
  const actionTextColor = wasOnBreak ? (isLofi ? "#154C90" : "#111111") : (isLofi ? "#C57A09" : "#FCC945");
  const handleContentColor = wasOnBreak && isLofi ? "#FFFFFF" : "#111111";
  const confirming = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [completed, setCompleted] = useState(false);
  const locked = breakPending || completed;

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  const confirm = async () => {
    if (locked || confirming.current) return false;
    confirming.current = true;
    try { return await onConfirm(); } finally { confirming.current = false; }
  };
  const finish = () => {
    setCompleted(true);
    closeTimer.current = setTimeout(onClose, 1200);
  };

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { if (!locked) onClose(); }}>
    <View style={{ flex: 1, justifyContent: centered ? "center" : "flex-end", alignItems: "center", paddingHorizontal: centered ? 16 : 0, paddingVertical: centered ? 16 : 0, backgroundColor: "rgba(0,0,0,0.6)" }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close modal" disabled={locked} onPress={onClose} style={{ position: "absolute", inset: 0 }} />
      <View accessibilityViewIsModal style={{ width: "100%", maxWidth: centered ? 384 : undefined, backgroundColor: isLofi ? "#FFFFFF" : "#071A2E", borderWidth: 1, borderColor: isLofi ? "#E5E7EB" : "rgba(255,255,255,0.1)", borderTopLeftRadius: 16, borderTopRightRadius: 16, borderBottomLeftRadius: centered ? 16 : 0, borderBottomRightRadius: centered ? 16 : 0, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24 + (centered ? 0 : insets.bottom), shadowColor: "#000000", shadowOpacity: isLofi ? 0.1 : 0.35, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 16 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close modal" disabled={locked} onPress={onClose} style={{ position: "absolute", right: 12, top: 12, width: 32, height: 32, zIndex: 1, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: isLofi ? "#F3F4F6" : "rgba(255,255,255,0.05)", opacity: locked ? 0.3 : 1 }}><ConductorIcon name="close" size={16} color={isLofi ? "#6B7280" : "rgba(255,255,255,0.4)"} strokeWidth={2} /></Pressable>
        <Text style={{ paddingRight: 40, color: isLofi ? "#6B7280" : "rgba(255,255,255,0.4)", fontSize: 10, lineHeight: 15, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.8 }}>{wasOnBreak ? "On break" : "On duty"}</Text>
        <Text style={{ color: isLofi ? "#111827" : "#FFFFFF", fontSize: 18, lineHeight: 28, fontWeight: "700", marginTop: 6 }}>{wasOnBreak ? "Resume Duty?" : "Take a Break?"}</Text>
        <Text style={{ color: isLofi ? "#6B7280" : "rgba(255,255,255,0.55)", fontSize: 14, lineHeight: 23, marginTop: 4, marginBottom: 24 }}>{wasOnBreak ? "You'll be marked back on duty and visible to commuters and hails again." : "Your unit pauses from the live map while on break, and won't be flagged as inactive."}</Text>
        <SlideToConfirm rounded commitRatio={0.9} label={wasOnBreak ? "Slide to resume duty" : "Slide to start break"} disabledLabel="Updating..." successLabel="Done" successColor={actionColor} successTextColor={handleContentColor} uppercaseLabel={false} labelFontSize={14} labelFontWeight="600" handleContentColor={handleContentColor} onSuccess={finish} disabled={breakPending || completed} onComplete={confirm} trackColor={wasOnBreak ? isLofi ? "#EEF2F7" : "#1A2540" : isLofi ? "#FEF3C7" : "#34312D"} handleColor={actionColor} textColor={actionTextColor} style={{ marginTop: 0, borderWidth: 0 }} />
        {error ? <Text accessibilityRole="alert" style={{ backgroundColor: isLofi ? "#FEF2F2" : "#450A0A", color: isLofi ? "#B91C1C" : "#FCA5A5", fontSize: 12, lineHeight: 18, padding: 12, marginTop: 12, borderRadius: 8 }}>{error}</Text> : null}
      </View>
    </View>
  </Modal>;
}
