import { Pressable, Text, View } from "react-native";
import type { Remittance } from "../../../core/domain/types";
import { useAppTheme } from "../../../core/theme/ThemeProvider";
import { ModalShell } from "../../../shared/ui";

const money = (value: number | string | undefined) => `₱${Number(value ?? 0).toFixed(2)}`;

export interface RemittanceHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  historyError: string;
  filter: "ALL" | "WEEK" | "MONTH";
  setFilter: (filter: "ALL" | "WEEK" | "MONTH") => void;
  page: number;
  setPage: (update: number | ((prev: number) => number)) => void;
  totalPages: number;
  totalFiltered: number;
  pageSize: number;
  visibleHistory: Remittance[];
  onSelect: (item: Remittance) => void;
}

export function RemittanceHistoryModal({
  visible,
  onClose,
  historyError,
  filter,
  setFilter,
  page,
  setPage,
  totalPages,
  totalFiltered,
  pageSize,
  visibleHistory,
  onSelect,
}: RemittanceHistoryModalProps) {
  const { colors, styles } = useAppTheme();

  return (
    <ModalShell visible={visible} title="Remittance history" onClose={onClose}>
      {historyError ? <Text style={[styles.error, { marginBottom: 12 }]}>{historyError}</Text> : null}
      <View style={{ flexDirection: "row", gap: 8 }}>
        {(["ALL", "WEEK", "MONTH"] as const).map((value) => (
          <Pressable
            key={value}
            onPress={() => {
              setFilter(value);
              setPage(1);
            }}
            style={[
              styles.button,
              styles.secondaryButton,
              {
                flex: 1,
                minHeight: 38,
                paddingHorizontal: 5,
                backgroundColor: filter === value ? colors.primary : colors.surface2,
              },
            ]}
          >
            <Text
              style={[
                styles.buttonText,
                filter === value ? { color: "#FFFFFF" } : styles.secondaryButtonText,
                { fontSize: 11 },
              ]}
            >
              {value === "ALL" ? "All" : value === "WEEK" ? "This Week" : "This Month"}
            </Text>
          </Pressable>
        ))}
      </View>
      {visibleHistory.map((item, index) => (
        <Pressable
          key={item.id ?? `${item.shift_id}-${index}`}
          style={styles.card}
          onPress={() => onSelect(item)}
        >
          <Text style={styles.cardTitle}>{item.date ?? item.remitted_at ?? "Previous shift"}</Text>
          <Text style={styles.subtitle}>
            {money(item.cash_total)} cash · {money(item.gcash_total)} GCash
          </Text>
          <Text style={[styles.label, { marginTop: 10 }]}>
            {item.remittance_status ?? item.status ?? "Submitted"} · View official report
          </Text>
        </Pressable>
      ))}
      {!visibleHistory.length ? <Text style={styles.subtitle}>No remittance reports match this filter.</Text> : null}
      {totalFiltered > pageSize ? (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16 }}>
          <Pressable disabled={page === 1} onPress={() => setPage((v) => v - 1)}>
            <Text style={styles.cardTitle}>Previous</Text>
          </Pressable>
          <Text style={styles.subtitle}>
            Page {page} of {totalPages}
          </Text>
          <Pressable disabled={page === totalPages} onPress={() => setPage((v) => v + 1)}>
            <Text style={styles.cardTitle}>Next</Text>
          </Pressable>
        </View>
      ) : null}
    </ModalShell>
  );
}
