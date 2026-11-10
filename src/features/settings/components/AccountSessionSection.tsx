import React from "react";
import { Animated, Modal, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../../../shared/ui/BrandText";
import { useWebEntrance } from "../../../shared/ui/useWebEntrance";

export interface AccountSessionSectionProps {
  styles: any;
  colors: any;
  isLofi: boolean;
  isLowFidelity?: boolean;
  logoutLocked: boolean;
  logoutCheckStatus: "loading" | "ready" | "error";
  onRetryLogoutCheck: () => void;
  loggingOut: boolean;
  showLogoutConfirm: boolean;
  setShowLogoutConfirm: (show: boolean) => void;
  onConfirmLogout: () => void;
}

export function AccountSessionSection({
  styles,
  colors,
  isLofi,
  isLowFidelity = false,
  logoutLocked,
  logoutCheckStatus,
  onRetryLogoutCheck,
  loggingOut,
  showLogoutConfirm,
  setShowLogoutConfirm,
  onConfirmLogout,
}: AccountSessionSectionProps) {
  const entrance = useWebEntrance(showLogoutConfirm, isLowFidelity);
  return (
    <View>
      {/* Logout Section */}
      <View style={styles.logoutSection}>
        {logoutCheckStatus === "loading" ? (
          <View style={styles.logoutLockBanner}>
            <Ionicons name="time-outline" size={14} color={colors.muted} />
            <Text style={styles.logoutLockText}>Checking pending remittance…</Text>
          </View>
        ) : logoutCheckStatus === "error" ? (
          <View style={styles.logoutLockBanner}>
            <Ionicons name="warning-outline" size={14} color={isLofi ? colors.warning : "#FBBF24"} />
            <View style={{ flex: 1 }}>
              <Text style={styles.logoutLockText}>Unable to verify pending remittance. Reconnect before signing out.</Text>
              <Pressable accessibilityRole="button" onPress={onRetryLogoutCheck} style={{ minHeight: 40, justifyContent: "center" }}>
                <Text style={{ color: isLofi ? colors.primary : "#99C1F1", fontSize: 12, fontWeight: "700" }}>Try again</Text>
              </Pressable>
            </View>
          </View>
        ) : logoutLocked ? (
          <View style={styles.logoutLockBanner}>
            <Ionicons name="warning-outline" size={14} color={isLofi ? colors.warning : "#FBBF24"} />
            <Text style={styles.logoutLockText}>
              Remit all pending collections before signing out.
            </Text>
          </View>
        ) : null}

        <Pressable
          disabled={logoutLocked || loggingOut}
          onPress={() => setShowLogoutConfirm(true)}
          style={[
            styles.logoutButton,
            (logoutLocked || loggingOut) && styles.logoutButtonDisabled,
          ]}
        >
          <Ionicons
            name="log-out-outline"
            size={18}
            color={isLofi ? colors.text : "rgba(255,255,255,0.5)"}
          />
          <Text style={styles.logoutButtonText}>Sign out</Text>
        </Pressable>
      </View>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutConfirm}
        transparent
        animationType="none"
        onRequestClose={() => setShowLogoutConfirm(false)}
      >
        <View style={styles.modalBackdrop}>
          <Animated.View style={[styles.modalContent, entrance]}>
            <View style={styles.logoutModalIconCircle}>
              <Ionicons name="log-out-outline" size={28} color={isLofi ? "#DC2626" : "#F87171"} />
            </View>
            <Text style={styles.logoutModalTitle}>Sign out?</Text>
            <Text style={styles.logoutModalDescription}>
              Are you sure you want to log out? You will need to sign in again to continue.
            </Text>
            <View style={styles.logoutModalButtonsRow}>
              <Pressable
                disabled={loggingOut}
                onPress={() => setShowLogoutConfirm(false)}
                style={[styles.modalButton, styles.cancelModalButton]}
              >
                <Text style={styles.cancelModalButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={loggingOut}
                onPress={onConfirmLogout}
                style={[styles.modalButton, styles.confirmLogoutButton]}
              >
                <Text style={styles.confirmLogoutButtonText}>
                  {loggingOut ? "Signing out..." : "Sign out"}
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}
