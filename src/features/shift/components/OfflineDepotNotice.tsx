import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Remittance } from "../../../core/domain/types";
import { useAppTheme } from "../../../core/theme/ThemeProvider";

export interface OfflineDepotNoticeProps {
  isOfflineDepot: boolean;
  pendingRemittances: Remittance[];
  onCompleteRemittance?: (remittance: Remittance) => void;
}

export function OfflineDepotNotice({
  isOfflineDepot,
  pendingRemittances,
  onCompleteRemittance,
}: OfflineDepotNoticeProps) {
  const { colors, isLofi, styles } = useAppTheme();

  return (
    <>
      {isOfflineDepot ? (
        <View
          style={[
            styles.card,
            {
              borderColor: isLofi ? "#D97706" : "rgba(245, 158, 11, 0.35)",
              backgroundColor: isLofi ? "#FEF3C7" : "rgba(245, 158, 11, 0.08)",
              marginTop: 10,
              borderRadius: isLofi ? 3 : 14,
              padding: 12,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            },
          ]}
        >
          <Ionicons name="cloud-offline-outline" size={20} color={isLofi ? "#B45309" : "#FBBF24"} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: isLofi ? "#92400E" : "#FBBF24", fontSize: 12, fontWeight: "800" }}>
              Offline Depot Mode (Cached Assignments)
            </Text>
            <Text
              style={{
                color: isLofi ? "#78350F" : colors.muted,
                fontSize: 11,
                marginTop: 2,
                lineHeight: 15,
              }}
            >
              Duty can be started locally without internet. Cash ticketing is immediately functional and
              will auto-sync once connected.
            </Text>
          </View>
        </View>
      ) : null}

      {pendingRemittances.length ? (
        <View
          style={[
            styles.card,
            {
              borderColor: isLofi ? "#F59E0B" : "rgba(245, 158, 11, 0.3)",
              backgroundColor: isLofi ? "#FEF3C7" : "rgba(245, 158, 11, 0.08)",
              marginTop: 12,
              borderRadius: isLofi ? 3 : 18,
            },
          ]}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="warning-outline" size={18} color={isLofi ? "#B45309" : "#FBBF24"} />
            <Text style={{ color: isLofi ? "#92400E" : "#FBBF24", fontSize: 13, fontWeight: "800" }}>
              Pending Cash Declaration
            </Text>
          </View>
          <Text
            style={[
              styles.subtitle,
              { fontSize: 11, marginTop: 4, color: isLofi ? "#92400E" : colors.muted },
            ]}
          >
            A previous shift was submitted. Admin will count the physical cash and record the official
            declaration.
          </Text>
          {pendingRemittances.map((item) => {
            const id = String(item.shift_id ?? "");
            return (
              <View
                key={id}
                style={{
                  backgroundColor: isLofi ? colors.surface : "rgba(0,0,0,0.25)",
                  borderRadius: isLofi ? 3 : 12,
                  padding: 12,
                  marginTop: 10,
                  borderWidth: 1,
                  borderColor: isLofi ? colors.border : "rgba(245, 158, 11, 0.15)",
                }}
              >
                <Text style={{ color: colors.text, fontSize: 12, fontWeight: "700" }}>
                  Unit {item.unit_number ?? "—"} · {item.date ?? "Previous shift"}
                </Text>
                <Text style={[styles.subtitle, { fontSize: 11, marginTop: 2 }]}>
                  Expected cash: ₱{Number(item.cash_total ?? 0).toFixed(2)}
                </Text>
                <Text
                  style={[
                    styles.label,
                    { fontSize: 9, marginTop: 4, color: isLofi ? "#B45309" : "#FBBF24" },
                  ]}
                >
                  STATUS: {String(item.remittance_status ?? item.status ?? "PENDING")}
                </Text>
                {onCompleteRemittance ? (
                  <Pressable
                    style={[
                      styles.button,
                      {
                        marginTop: 10,
                        backgroundColor: "#D97706",
                        minHeight: 38,
                        paddingVertical: 8,
                        borderRadius: isLofi ? 2 : 14,
                      },
                    ]}
                    onPress={() => onCompleteRemittance(item)}
                  >
                    <Text style={[styles.buttonText, { color: "#fff", fontWeight: "700", fontSize: 12 }]}>
                      Complete Remittance
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}
    </>
  );
}
