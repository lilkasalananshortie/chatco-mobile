import { useEffect, useRef, useState } from "react";
import { Text } from "../../shared/ui/BrandText";
import { AppState, Modal, Pressable, View } from "react-native";
import { api } from "../../core/api/chatco-api";
import type { Announcement } from "../../core/domain/types";
import { useAppTheme } from "../../core/theme/ThemeProvider";
import { unreadReminders } from "./reminder-state";

/** Uses existing personal notices. This never creates or completes a remittance. */
export function RemittanceReminder({ suspended = false, dismissedIds, onViewReport }: { suspended?: boolean; dismissedIds?: Set<string>; onViewReport: () => void }) {
  const { colors, styles } = useAppTheme();
  const [items, setItems] = useState<Announcement[]>([]);
  const dismissed = useRef(dismissedIds ?? new Set<string>());
  useEffect(() => {
    let active = true;
    let running = false;
    const check = async () => {
      if (running || AppState.currentState === "background") return;
      running = true;
      try {
        const notices = await api.announcements(true);
        if (active) setItems(unreadReminders(notices, dismissed.current));
      } catch { /* Keep notices unchanged during an outage; retry next minute. */ }
      finally { running = false; }
    };
    void check();
    const timer = setInterval(() => void check(), 60_000);
    const sub = AppState.addEventListener("change", state => { if (state === "active") void check(); });
    return () => { active = false; clearInterval(timer); sub.remove(); };
  }, []);
  const dismiss = () => {
    items.forEach(item => {
      dismissed.current.add(item.id);
      void api.markAnnouncementRead(item.id).catch(() => {});
    });
    setItems([]);
  };
  const latest = items[0];
  return <Modal visible={Boolean(latest) && !suspended} transparent animationType="fade" onRequestClose={dismiss}>
    <View style={{ flex: 1, justifyContent: "center", padding: 24, backgroundColor: colors.overlay }}>
      <View style={[styles.card, { width: "100%", maxWidth: 440, alignSelf: "center" }]} accessibilityViewIsModal>
        <Text style={styles.label}>Remittance reminder</Text>
        <Text style={[styles.title, { marginTop: 10 }]}>{latest?.title}</Text>
        <Text style={[styles.subtitle, { marginTop: 12 }]}>{latest?.body} Hand the cash to the office so an admin can record it.</Text>
        <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
          <Pressable accessibilityRole="button" onPress={dismiss} style={[styles.button, styles.secondaryButton, { flex: 1 }]}>
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>Got it</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => { dismiss(); onViewReport(); }} style={[styles.button, { flex: 1 }]}>
            <Text style={styles.buttonText}>View report</Text>
          </Pressable>
        </View>
      </View>
    </View>
  </Modal>;
}
