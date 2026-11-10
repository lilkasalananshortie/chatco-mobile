import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Image, Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, useWindowDimensions, View, type TextInput as NativeTextInput } from "react-native";
import { Text, TextInput } from "../../shared/ui/BrandText";
import Ionicons from "@expo/vector-icons/Ionicons";
import { api } from "../../core/api/chatco-api";
import { useAppTheme } from "../../core/theme/ThemeProvider";
import type { User } from "../../core/domain/types";
import { PasswordScreen } from "./PasswordScreen";
import { LegalSupportCard } from "../../shared/legal/LegalSupportCard";
import { useAnimatedColor } from "../../shared/ui/useAnimatedFeedback";
import { useReducedMotion } from "../../shared/ui/useWebEntrance";

export function LoginScreen({ onLogin }: { onLogin: (user: User) => void | Promise<void> }) {
  const { colors, isLofi , isLowFidelity } = useAppTheme();
  const { height } = useWindowDimensions();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardTop, setKeyboardTop] = useState<number | null>(null);
  const compact = keyboardVisible || height < 760;
  // Some Android keyboards overlay the app instead of resizing its window.
  // Only reserve the covered area when the window still extends beneath it.
  const keyboardInset = Platform.OS === "android" && keyboardTop !== null
    ? Math.max(0, height - keyboardTop) : 0;
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [focused, setFocused] = useState<"login" | "password" | null>(null);
  const reduceMotion = useReducedMotion();
  const loginBorder = useAnimatedColor(focused === "login" ? colors.primaryLight : colors.border, 160, isLowFidelity || reduceMotion);
  const passwordBorder = useAnimatedColor(focused === "password" ? colors.primaryLight : colors.border, 160, isLowFidelity || reduceMotion);
  const passwordInput = useRef<NativeTextInput>(null);
  const submitting = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    const shown = Keyboard.addListener("keyboardDidShow", event => {
      setKeyboardTop(event.endCoordinates.screenY);
      setKeyboardVisible(true);
    });
    const hidden = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardTop(null);
      setKeyboardVisible(false);
    });
    return () => { shown.remove(); hidden.remove(); };
  }, []);
  const submit = async () => {
    if (submitting.current || !login.trim() || !password) return;
    submitting.current = true;
    Keyboard.dismiss();
    setBusy(true); setError("");
    try { await onLogin(await api.login(login.trim(), password)); }
    catch (e) { if (mounted.current) setError(e instanceof Error ? e.message : "Unable to sign in."); }
    finally { submitting.current = false; if (mounted.current) setBusy(false); }
  };
  if (recovering) return <PasswordScreen onBack={() => setRecovering(false)} />;
  return (
    <View style={[s.screen, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[s.contentFrame, { paddingTop: compact ? 8 : 24, paddingBottom: (compact ? 8 : 24) + keyboardInset }]}>
          <View style={s.content}>
            {!keyboardVisible ? <>
              <View style={s.brandRow}>
                <View style={s.brandLockup} accessible accessibilityLabel="Chatco logo">
                  <Image source={require("../../../assets/logo-transparent.png")} style={s.logoMark} resizeMode="contain" accessible={false} />
                  <View>
                    <Text style={[s.wordmark, { color: colors.text }]}>CHATCO<Text style={{ color: colors.primaryLight }}>.</Text></Text>
                    <Text style={[s.brandLabel, { color: colors.muted }]}>CONDUCTOR PORTAL</Text>
                  </View>
                </View>
              </View>

              <View style={{ paddingTop: compact ? 14 : 36, paddingBottom: compact ? 12 : 24 }}>
                <View accessible={false} style={[s.accent, { backgroundColor: colors.primaryLight, marginBottom: compact ? 10 : 18 }]} />
                <Text accessibilityRole="header" style={[s.hero, { color: colors.text, fontSize: compact ? 30 : 40, lineHeight: compact ? 36 : 46 }]}>Your next shift{"\n"}starts here.</Text>
              </View>
            </> : null}

            <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: isLowFidelity ? 6 : 24, padding: compact ? 16 : 22 }]}>
              <Text nativeID="conductor-login-label" style={[s.label, { color: colors.text }]}>Username or email</Text>
              <Animated.View style={[s.field, { minHeight: compact ? 48 : 56, marginTop: compact ? 7 : 10, backgroundColor: colors.surface2, borderColor: loginBorder }]}>
                <Ionicons name="person-outline" size={19} color={colors.muted} accessible={false} />
                <TextInput
                  accessibilityLabel="Username or email" accessibilityLabelledBy="conductor-login-label"
                  value={login} onChangeText={setLogin} placeholder="Enter your username or email"
                  placeholderTextColor={colors.muted} style={[s.input, { color: colors.text, paddingVertical: compact ? 10 : 16 }]}
                  autoCapitalize="none" autoCorrect={false} autoComplete="username" textContentType="username"
                  editable={!busy} returnKeyType="next" onSubmitEditing={() => passwordInput.current?.focus()}
                  onFocus={() => setFocused("login")} onBlur={() => setFocused(null)}
                />
              </Animated.View>

              <Text nativeID="conductor-password-label" style={[s.label, { color: colors.text, marginTop: compact ? 6 : 10 }]}>Password</Text>
              <Animated.View style={[s.field, { minHeight: compact ? 48 : 56, marginTop: compact ? 7 : 10, backgroundColor: colors.surface2, borderColor: passwordBorder }]}>
                <Ionicons name="lock-closed-outline" size={19} color={colors.muted} accessible={false} />
                <TextInput
                  ref={passwordInput} accessibilityLabel="Password" accessibilityLabelledBy="conductor-password-label"
                  value={password} onChangeText={setPassword} placeholder="Enter your password"
                  placeholderTextColor={colors.muted} style={[s.input, { color: colors.text, paddingVertical: compact ? 10 : 16 }]}
                  secureTextEntry={!passwordVisible} autoCapitalize="none" autoCorrect={false}
                  autoComplete="current-password" textContentType="password" editable={!busy}
                  returnKeyType="go" onSubmitEditing={() => void submit()}
                  onFocus={() => setFocused("password")} onBlur={() => setFocused(null)}
                />
                <Pressable accessibilityRole="button" disabled={busy} accessibilityLabel={passwordVisible ? "Hide password" : "Show password"} onPress={() => setPasswordVisible(value => !value)} style={s.eye}>
                  <Ionicons name={passwordVisible ? "eye-off-outline" : "eye-outline"} size={21} color={colors.muted} />
                </Pressable>
              </Animated.View>
              <Pressable accessibilityRole="button" disabled={busy} onPress={() => { Keyboard.dismiss(); setRecovering(true); }} style={[s.recovery, { minHeight: compact ? 40 : 44 }]}>
                <Text style={{ color: colors.primaryLight, fontSize: 13, fontWeight: "600" }}>Forgot password?</Text>
              </Pressable>

              {error ? <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={[s.error, { borderColor: colors.danger, marginTop: compact ? 10 : 18 }]}>
                <Text style={{ color: colors.danger, fontSize: compact ? 12 : 14, lineHeight: compact ? 18 : 21 }}>{error}</Text>
              </View> : null}
              <Pressable
                accessibilityRole="button" accessibilityLabel={busy ? "Signing in" : "Sign in"}
                accessibilityState={{ disabled: busy || !login.trim() || !password, busy }}
                disabled={busy || !login.trim() || !password} onPress={() => void submit()}
                style={({ pressed }) => [s.submit, { minHeight: compact ? 48 : 56, padding: compact ? 12 : 16, marginTop: compact ? 14 : 24, backgroundColor: colors.primary, opacity: busy || !login.trim() || !password ? 0.5 : pressed ? 0.85 : 1 }]}
              >
                {busy ? <ActivityIndicator color="#FFFFFF" size="small" /> : null}
                <Text style={s.submitText}>{busy ? "Signing in…" : "Sign in"}</Text>
                {!busy ? <Ionicons name="arrow-forward" size={19} color="#FFFFFF" /> : null}
              </Pressable>
            </View>

            {!keyboardVisible ? <>
              <Text style={[s.footerNote, { color: colors.muted, marginTop: compact ? 12 : 24 }]}>Need an account or assignment? Contact your operator.</Text>
              <LegalSupportCard compact />
            </> : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  contentFrame: { flex: 1, justifyContent: "center", paddingHorizontal: 22 },
  content: { width: "100%", maxWidth: 460, alignSelf: "center" },
  brandRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brandLockup: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoMark: { width: 40, height: 40 },
  wordmark: { fontSize: 24, fontWeight: "800", letterSpacing: -0.6 },
  brandLabel: { fontSize: 10, fontWeight: "600", letterSpacing: 2, marginTop: 4 },
  accent: { width: 36, height: 4, borderRadius: 2 },
  hero: { fontWeight: "800", letterSpacing: -1.2, lineHeight: 46 },
  card: { borderWidth: 1, padding: 22 },
  label: { fontSize: 13, fontWeight: "600" },
  field: { borderWidth: 1, borderRadius: 12, flexDirection: "row", alignItems: "center", paddingLeft: 14, marginTop: 10, minHeight: 56 },
  input: { flex: 1, minWidth: 0, paddingHorizontal: 12, paddingVertical: 16, fontSize: 14 },
  recovery: { minHeight: 44, justifyContent: "center", alignSelf: "flex-end" },
  eye: { minHeight: 48, minWidth: 44, alignItems: "center", justifyContent: "center" },
  error: { borderLeftWidth: 3, paddingLeft: 12, marginTop: 18 },
  submit: { minHeight: 56, flexDirection: "row", gap: 10, alignItems: "center", justifyContent: "center", borderRadius: 12, padding: 16, marginTop: 24 },
  submitText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  footerNote: { textAlign: "center", fontSize: 12, lineHeight: 17, marginTop: 24, paddingHorizontal: 12 },
});
