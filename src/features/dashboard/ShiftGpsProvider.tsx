import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Shift } from "../../core/domain/types";
import { useDashboardGps } from "./hooks/useDashboardGps";
import { useAppTheme } from "../../core/theme/ThemeProvider";
import { acknowledgeLocationNotice, hasLocationNotice, LOCATION_NOTICE_TEXT } from "./location-notice";
import { openLegalLink } from "../../shared/legal/legal-links";

const GpsContext = createContext<ReturnType<typeof useDashboardGps> | null>(null);

/** One tracking owner per authenticated shift, independent of the selected tab. */
export function ShiftGpsProvider({ userId, shift, canOperate, refreshKey, children }: {
  userId: string; shift: Shift; canOperate: boolean; refreshKey: number; children: ReactNode;
}) {
  const { colors } = useAppTheme();
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
      {canOperate && acceptedFor !== userId && !showNotice ? <SafeAreaView edges={["top"]} style={{ backgroundColor: colors.surface }}>
        <Pressable accessibilityRole="button" onPress={() => setShowNotice(true)} style={{ padding: 14 }}>
          <Text style={{ color: colors.warning }}>Vehicle tracking is paused. Review location sharing to enable it.</Text>
        </Pressable>
      </SafeAreaView> : null}
      {children}
    </View>
    <Modal visible={canOperate && showNotice && acceptedFor !== userId} animationType="slide" onRequestClose={() => { if (!saving) setShowNotice(false); }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }}>
          <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 24, fontWeight: "700" }}>Vehicle location sharing</Text>
          <Text style={{ color: colors.text, fontSize: 16, lineHeight: 25 }}>{LOCATION_NOTICE_TEXT}</Text>
          <Pressable accessibilityRole="link" onPress={() => void openLegalLink("privacy")} style={{ minHeight: 48, justifyContent: "center" }}><Text style={{ color: colors.primaryLight }}>Read the Privacy Policy</Text></Pressable>
          {noticeError ? <Text accessibilityRole="alert" style={{ color: colors.danger }}>{noticeError}</Text> : null}
          <Pressable accessibilityRole="button" disabled={saving} onPress={() => void accept()} style={{ minHeight: 52, justifyContent: "center", padding: 16, backgroundColor: colors.primary, borderRadius: 12 }}><Text style={{ color: "white", fontWeight: "700" }}>{saving ? "Saving…" : "Continue to location permissions"}</Text></Pressable>
          <Pressable accessibilityRole="button" disabled={saving} onPress={() => setShowNotice(false)} style={{ minHeight: 48, justifyContent: "center" }}><Text style={{ color: colors.text }}>Not now — keep tracking off</Text></Pressable>
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
