import React from "react";
import { Text, View } from "react-native";
import type { ConductorProfile, Shift, User } from "../../../core/domain/types";

export interface ProfileCardProps {
  styles: any;
  user: User;
  shift?: Shift | null;
  profile: ConductorProfile | null;
}

export function ProfileCard({ styles, user, shift, profile }: ProfileCardProps) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeaderTitle}>Profile</Text>
        <View style={styles.badgeLock}>
          <Text style={styles.lockIcon}>🔒</Text>
          <Text style={styles.lockText}>Managed by Admin</Text>
        </View>
      </View>

      <View style={styles.rowsContainer}>
        <View style={styles.infoRow}>
          <Text style={styles.rowLabel}>Name</Text>
          <Text style={styles.rowValue}>
            {profile?.name ?? shift?.conductorName ?? user.name}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.rowLabel}>Username</Text>
          <Text style={styles.rowValue}>{profile?.username ?? user.email}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.rowLabel}>Phone Number</Text>
          <Text style={styles.rowValue}>{profile?.phoneNumber ?? "+63 917 123 4567"}</Text>
        </View>
      </View>
    </View>
  );
}
