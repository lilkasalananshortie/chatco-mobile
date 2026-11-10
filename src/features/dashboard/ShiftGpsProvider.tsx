import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Text } from "../../shared/ui/BrandText";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Shift } from "../../core/domain/types";
import { useDashboardGps } from "./hooks/useDashboardGps";
import { useAppTheme } from "../../core/theme/ThemeProvider";
import { acknowledgeLocationNotice, hasLocationNotice, LOCATION_NOTICE_SECTIONS, LOCATION_NOTICE_AUTHORIZATION } from "./location-notice";
import { openLegalLink } from "../../shared/legal/legal-links";

const GpsContext = createContext<ReturnType<typeof useDashboardGps> | null>(null);

/** One tracking owner per authenticated shift, independent of the selected tab. */
export function ShiftGpsProvider({ userId, shift, canOperate, refreshKey, children }: {
  userId: string; shift: Shift; canOperate: boolean; refreshKey: number; children: ReactNode;
}) {
  const { colors, isLowFidelity } = useAppTheme();
  const [acceptedFor, setAcceptedFor] = useState<string | null>(null);
  const [showNotice, setShowNotice] = useState(false);
  const [noticeError, setNoticeError] = useState("");
  const [saving, setSaving] = useState(false);
  const owner = useRef(userId);
  owner.current = userId;
  const savePending = useRef<string | null>(null);
  useEffect(() => {
    let active = true;
    owner.current = userId;
    setAcceptedFor(null); setShowNotice(false); setNoticeError(""); setSaving(false);
    void hasLocationNotice(userId).then(accepted => {
      if (!active) return;
      setAcceptedFor(accepted ? userId : null);
      setShowNotice(!accepted);
    }).catch(() => { if (active) { setShowNotice(true); setNoticeError("The saved location notice could not be read. Please review it again."); } });
    return () => { active = false; owner.current = ""; };
  }, [userId]);
  const accept = async () => {
    if (savePending.current === userId) return;
    savePending.current = userId; setSaving(true); setNoticeError("");
    const acceptingUser = userId;
    try {
      await acknowledgeLocationNotice(acceptingUser);
      if (owner.current === acceptingUser) { setAcceptedFor(acceptingUser); setShowNotice(false); }
    } catch { if (owner.current === acceptingUser) setNoticeError("Unable to save this acknowledgement. Tracking has not started. Please retry."); }
    finally { if (savePending.current === acceptingUser) savePending.current = null; if (owner.current === acceptingUser) setSaving(false); }
  };
  const gps = useDashboardGps({ shift, canOperate: canOperate && acceptedFor === userId, refreshKey });
  return <GpsContext.Provider value={gps}>
    <View style={{ flex: 1 }}>
      {canOperate && acceptedFor !== userId && !showNotice ? <View style={{ backgroundColor: colors.surface }}>
        <Pressable accessibilityRole="button" onPress={() => setShowNotice(true)} style={{ padding: 14 }}>
          <Text style={{ color: colors.warning }}>Vehicle tracking is paused. Review location sharing to enable it.</Text>
        </Pressable>
      </View> : null}
      {children}
    </View>
    <Modal visible={canOperate && showNotice && acceptedFor !== userId} animationType="slide" onRequestClose={() => { if (!saving) setShowNotice(false); }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20, justifyContent: "center" }} showsHorizontalScrollIndicator={false}>
          <View style={{ width: "100%", maxWidth: 460, alignSelf: "center", gap: 24, paddingVertical: 12 }}>
            <View style={{ alignItems: "center", gap: 12 }}>
              <View style={{ width: 56, height: 56, borderRadius: isLowFidelity ? 6 : 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="location-outline" size={28} color={colors.primaryLight} accessible={false} />
              </View>
              <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 24, lineHeight: 32, fontWeight: "700", textAlign: "center" }}>Vehicle location sharing</Text>
              <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 20, textAlign: "center", paddingHorizontal: 8 }}>Review how location is used before continuing to device permissions.</Text>
            </View>

            <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: isLowFidelity ? 6 : 16, paddingHorizontal: 18 }}>
              {LOCATION_NOTICE_SECTIONS.map((section, index) => <View key={section.title} style={{ paddingVertical: 16, borderTopWidth: index ? 1 : 0, borderTopColor: colors.border, gap: 6 }}>
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: "600" }}>{section.title}</Text>
                <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 21 }}>{section.text}</Text>
              </View>)}
            </View>

            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
              <Ionicons name="information-circle-outline" size={18} color={colors.muted} accessible={false} />
              <Text style={{ flex: 1, color: colors.muted, fontSize: 12, lineHeight: 19 }}>{LOCATION_NOTICE_AUTHORIZATION}</Text>
            </View>

            <View style={{ gap: 8 }}>
              <Pressable accessibilityRole="link" onPress={() => void openLegalLink("privacy")} style={{ minHeight: 44, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 }}>
                <Text style={{ color: colors.primaryLight, fontSize: 13, fontWeight: "500" }}>Read the Privacy Policy</Text>
                <Ionicons name="open-outline" size={14} color={colors.primaryLight} accessible={false} />
              </Pressable>
              {noticeError ? <Text accessibilityRole="alert" style={{ color: colors.danger, fontSize: 13, lineHeight: 20 }}>{noticeError}</Text> : null}
              <Pressable accessibilityRole="button" accessibilityState={{ disabled: saving, busy: saving }} disabled={saving} onPress={() => void accept()} style={({ pressed }) => ({ minHeight: 52, alignItems: "center", justifyContent: "center", padding: 14, backgroundColor: colors.primary, borderRadius: isLowFidelity ? 6 : 12, opacity: saving ? 0.6 : pressed ? 0.85 : 1 })}><Text style={{ color: "white", fontWeight: "700", fontSize: 13, textAlign: "center" }}>{saving ? "Saving…" : "Continue to location permissions"}</Text></Pressable>
              <Pressable accessibilityRole="button" disabled={saving} onPress={() => setShowNotice(false)} style={({ pressed }) => ({ minHeight: 48, alignItems: "center", justifyContent: "center", padding: 10, opacity: saving ? 0.6 : pressed ? 0.7 : 1 })}><Text style={{ color: colors.muted, fontSize: 13, textAlign: "center" }}>Not now — keep tracking off</Text></Pressable>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  </GpsContext.Provider>;
}

export function useShiftGps() {
  const gps = useContext(GpsContext);
  if (!gps) throw new Error("Shift GPS requires an active shift provider.");
  return gps;
}
