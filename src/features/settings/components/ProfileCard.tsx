import React, { useState } from "react";
import { Image, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../../../shared/ui/BrandText";
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
  const name = profile?.name?.trim() || shift?.conductorName?.trim() || user.name || "Conductor";
  const username = profile?.username?.trim();
  const hasPhoto = Boolean(profile?.profilePictureUrl && failedPhoto !== profile.profilePictureUrl);
  return (
      <View style={styles.profileHero}>
        <View style={styles.profileHeroRow}>
          <View style={styles.profilePhotoColumn}>
            <Pressable accessibilityRole="button" accessibilityLabel="Change profile photo" disabled={photoBusy} onPress={onChangePhoto} style={styles.profileAvatar}>
              {hasPhoto ? (
                <Image
                  source={{ uri: profile?.profilePictureUrl ?? undefined }}
                  onError={() => setFailedPhoto(profile?.profilePictureUrl ?? null)}
                  accessibilityLabel="Your profile photo"
                  style={{ width: "100%", height: "100%", borderRadius: 15 }}
                />
              ) : (
                <Ionicons name="person-outline" size={38} color="#FFFFFF" />
              )}
              <View pointerEvents="none" style={styles.profilePhotoCameraBadge}>
                <Ionicons name="camera-outline" size={14} color="#071A2E" />
              </View>
            </Pressable>
            {onChangePhoto ? (
              <Pressable accessibilityRole="button" disabled={photoBusy} onPress={onChangePhoto} style={styles.profilePhotoAction}>
                <Text style={{ color: styles.profileEyebrow.color, fontSize: 11, fontWeight: "600" }}>{photoBusy ? "Uploading…" : "Change photo"}</Text>
              </Pressable>
            ) : null}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.profileEyebrow}>Conductor account</Text>
            <Text style={styles.profileName}>{name}</Text>
            {username ? <Text style={styles.profileUsername}>@{username}</Text> : null}
            <View style={styles.profileBadgeRow}>
              <View style={styles.profileBadge}><Text style={styles.profileBadgeText}>Conductor</Text></View>
              <View style={styles.managedBadge}>
                <Ionicons name="lock-closed-outline" size={12} color={styles.managedBadgeText.color} />
                <Text style={styles.managedBadgeText}>Managed by admin</Text>
              </View>
            </View>
          </View>
        </View>

        {!!photoError && <Text accessibilityRole="alert" style={[styles.rowValue, { marginTop: 4 }]}>{photoError}</Text>}
      </View>
  );
}

export function PersonalDetailsCard({ styles, user, shift, profile }: Pick<ProfileCardProps, "styles" | "user" | "shift" | "profile">) {
  const name = profile?.name?.trim() || shift?.conductorName?.trim() || user.name || "Conductor";
  const username = profile?.username?.trim();

  return (
    <View style={styles.sectionCard}>
      <View style={[styles.sectionHeaderRow, { justifyContent: "flex-start", gap: 8 }]}>
        <Ionicons name="person-outline" size={17} color={styles.profileEyebrow.color} />
        <Text style={styles.profileDetailsTitle}>Personal details</Text>
      </View>
      <View style={{ marginTop: 16, gap: 20 }}>
        <View>
          <Text style={[styles.rowLabel, { fontWeight: "400" }]}>Full name</Text>
          <Text style={[styles.rowValue, { marginTop: 4, fontSize: 14, fontWeight: "400" }]}>{name}</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 16 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.rowLabel, { fontWeight: "400" }]}>Username</Text>
            <Text style={[styles.rowValue, { marginTop: 4, fontSize: 14, fontWeight: "400" }]}>{username || "Not provided"}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.rowLabel, { fontWeight: "400" }]}>Account type</Text>
            <Text style={[styles.rowValue, { marginTop: 4, fontSize: 14, fontWeight: "400" }]}>Conductor</Text>
          </View>
        </View>
        <View style={{ borderTopWidth: 1, borderColor: styles.sectionCard.borderColor, paddingTop: 16 }}>
          <Text style={[styles.rowLabel, { fontWeight: "400" }]}>Email address</Text>
          <Text style={[styles.rowValue, { marginTop: 4, fontSize: 14, fontWeight: "400" }]}>{user.email || "Not provided"}</Text>
        </View>
      </View>
    </View>
  );
}
