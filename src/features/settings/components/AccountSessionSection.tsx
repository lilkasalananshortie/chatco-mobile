import React from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export interface AccountSessionSectionProps {
  styles: any;
  colors: any;
  isLofi: boolean;
  onOpenSOS: () => void;
  onClearCache: () => void;
  logoutLocked: boolean;
  loggingOut: boolean;
  showLogoutConfirm: boolean;
  setShowLogoutConfirm: (show: boolean) => void;
  onConfirmLogout: () => void;
}

export function AccountSessionSection({
  styles,
  colors,
  isLofi,
  onOpenSOS,
  onClearCache,
  logoutLocked,
  loggingOut,
  showLogoutConfirm,
  setShowLogoutConfirm,
  onConfirmLogout,
}: AccountSessionSectionProps) {
  return (
    <View>
      {/* Emergency SOS */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionHeaderTitle}>Emergency</Text>
        <Pressable onPress={onOpenSOS} style={styles.sosCardButton}>
          <View style={styles.sosIconBox}>
            <Ionicons name="warning-outline" size={28} color={isLofi ? "#DC2626" : "#F87171"} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sosButtonTitle}>Emergency SOS</Text>
            <Text style={styles.sosButtonSubtitle}>Send an emergency alert to dispatch</Text>
          </View>
        </Pressable>
      </View>

      {/* Data & Storage */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionHeaderTitle}>Data & Storage</Text>
        <Pressable onPress={onClearCache} style={styles.clearCacheButton}>
          <Ionicons name="trash-outline" size={18} color={colors.text} />
          <Text style={styles.clearCacheButtonText}>Clear App Cache</Text>
        </Pressable>
        <Text style={styles.clearCacheSubtitle}>
          Removes local tile & temporary offline caches. Active shift, transactions, and authentication are not affected.
        </Text>
      </View>

      {/* Logout Section */}
      <View style={styles.logoutSection}>
        {logoutLocked ? (
          <View style={styles.logoutLockBanner}>
            <Ionicons name="warning-outline" size={14} color={isLofi ? colors.warning : "#FBBF24"} />
            <Text style={styles.logoutLockText}>
              Remit all pending collections before logging out.
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
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </Pressable>
      </View>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutConfirm}
        transparent
        animationType={isLofi ? "none" : "fade"}
        onRequestClose={() => setShowLogoutConfirm(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.logoutModalIconCircle}>
              <Ionicons name="log-out-outline" size={28} color={isLofi ? "#DC2626" : "#F87171"} />
            </View>
            <Text style={styles.logoutModalTitle}>Log Out?</Text>
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
                  {loggingOut ? "Signing out..." : "Log Out"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
