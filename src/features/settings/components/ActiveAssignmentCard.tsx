import React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Shift } from "../../../core/domain/types";

export interface ActiveAssignmentCardProps {
  styles: any;
  shift?: Shift | null;
  colors: any;
  isLofi: boolean;
}

export function ActiveAssignmentCard({
  styles,
  shift,
  colors,
  isLofi,
}: ActiveAssignmentCardProps) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionHeaderTitle}>Active Assignment</Text>
      {shift ? (
        <View style={[styles.rowsContainer, { marginTop: 12 }]}>
          <View style={styles.infoRow}>
            <Text style={styles.rowLabel}>Current Unit</Text>
            <Text style={styles.rowValue}>{shift.unitNumber}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.rowLabel}>Assigned Driver</Text>
            <Text style={styles.rowValue}>{shift.driverName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.rowLabel}>Route</Text>
            <Text style={styles.rowValue}>{shift.route || "Regular Route"}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.emptyShift}>
          <View style={styles.emptyIconCircle}>
            <Ionicons
              name="bus-outline"
              size={24}
              color={isLofi ? colors.muted : "rgba(255,255,255,0.15)"}
            />
          </View>
          <Text style={styles.emptyTitle}>No active shift</Text>
          <Text style={styles.emptySubtitle}>Start a shift to see assignment details</Text>
        </View>
      )}
    </View>
  );
}
