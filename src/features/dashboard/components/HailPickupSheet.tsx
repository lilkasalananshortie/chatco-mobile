import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import type { HailRequest } from "../../../core/domain/types";
import { useAppTheme } from "../../../core/theme/ThemeProvider";
import { Text } from "../../../shared/ui/BrandText";
import { ConductorIcon } from "../../../shared/ui/ConductorIcon";
import { formatHailCountdown, hailExpiresAtMs, isAcceptedHail } from "../hail-state";
import { HAIL_ACCEPTED_COLOR, HAIL_PENDING_COLOR } from "../map-presentation";

function HailCountdown({ endsAt }: { endsAt: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return <>{formatHailCountdown(endsAt - now)}</>;
}

export interface HailPickupSheetProps {
  hail: HailRequest;
  bottom: number;
  canOperate: boolean;
  busy: boolean;
  onAccept: () => void;
  onClose: () => void;
}

/** Non-blocking card over the map, so the road and any error stay visible. */
export function HailPickupSheet({ hail, bottom, canOperate, busy, onAccept, onClose }: HailPickupSheetProps) {
  const { colors, isLofi } = useAppTheme();
  const accepted = isAcceptedHail(hail);
  const endsAt = hailExpiresAtMs(hail);
  const titleColor = accepted ? (isLofi ? HAIL_ACCEPTED_COLOR : "#62A0EA") : HAIL_PENDING_COLOR;
  const disabled = !canOperate || busy;

  return <View accessibilityLabel="Pickup request" style={{ position: "absolute", left: 16, right: 16, bottom, zIndex: 16, elevation: 16, alignSelf: "center", maxWidth: 420, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, shadowColor: "#000000", shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } }}>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: titleColor, fontSize: 14, lineHeight: 20, fontWeight: "700" }}>Commuter</Text>
        <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18, fontVariant: ["tabular-nums"] }}>
          {accepted
            ? Number.isFinite(endsAt) ? <>Accepted · pin hides in <HailCountdown endsAt={endsAt} /></> : "Accepted"
            : "Waiting for pickup"}
        </Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Close pickup request" hitSlop={6} onPress={onClose} style={{ width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" }}>
        <ConductorIcon name="close" size={16} color={colors.muted} strokeWidth={2} />
      </Pressable>
    </View>
    {!accepted ? <Pressable accessibilityRole="button" accessibilityState={{ disabled, busy }} disabled={disabled} onPress={onAccept} style={{ minHeight: 44, marginTop: 10, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: HAIL_ACCEPTED_COLOR, opacity: disabled ? 0.5 : 1 }}>
      <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "600" }}>{busy ? "Accepting…" : "Accept"}</Text>
    </Pressable> : null}
    {!accepted && !canOperate ? <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 8 }}>Claim this shift on this device to respond.</Text> : null}
  </View>;
}
