import React, { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import type { ConductorProfile, Shift, User } from "../../../core/domain/types";

export interface ProfileCardProps {
  styles: any;
  user: User;
  shift?: Shift | null;
  profile: ConductorProfile | null;
  photoBusy?: boolean;
  photoError?: string;
  onChangePhoto?: () => void;
}

export function ProfileCard({ styles, user, shift, profile, photoBusy, photoError, onChangePhoto }: ProfileCardProps) {
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
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
        {profile?.profilePictureUrl && failedPhoto !== profile.profilePictureUrl && <Image source={{ uri: profile.profilePictureUrl }} onError={() => setFailedPhoto(profile.profilePictureUrl ?? null)} accessibilityLabel="Your profile photo" style={{ width: 72, height: 72, borderRadius: 36 }} />}
        {onChangePhoto && <Pressable accessibilityRole="button" disabled={photoBusy} onPress={onChangePhoto} style={{ minHeight: 44, justifyContent: "center" }}><Text style={styles.rowValue}>{photoBusy ? "Uploading…" : "Change profile photo"}</Text></Pressable>}
        {!!photoError && <Text accessibilityRole="alert" style={styles.rowValue}>{photoError}</Text>}
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
          <Text style={styles.rowValue}>{profile?.phoneNumber || "Not provided"}</Text>
        </View>
      </View>
    </View>
  );
}
