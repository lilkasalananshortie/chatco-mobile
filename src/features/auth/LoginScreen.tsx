import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { api } from "../../core/api/chatco-api";
import { useAppTheme } from "../../core/theme/ThemeProvider";
import type { User } from "../../core/domain/types";
import { PasswordScreen } from "./PasswordScreen";
import { LegalSupportCard } from "../../shared/legal/LegalSupportCard";

export function LoginScreen({ onLogin }: { onLogin: (user: User) => void | Promise<void> }) {
  const { colors, isLofi } = useAppTheme();
  const { height } = useWindowDimensions();
  const compact = height < 720;
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [focused, setFocused] = useState<"login" | "password" | null>(null);
  const passwordInput = useRef<TextInput>(null);
  const submitting = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
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
    <SafeAreaView style={[s.screen, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={[s.scroll, { paddingVertical: compact ? 20 : 36 }]}>
          <View style={s.content}>
            <View style={s.brandRow}>
              <View>
                <Text style={[s.wordmark, { color: colors.text }]}>CHATCO<Text style={{ color: colors.primaryLight }}>.</Text></Text>
                <Text style={[s.brandLabel, { color: colors.muted }]}>CONDUCTOR</Text>
              </View>
              <Ionicons name="bus-outline" size={34} color={colors.primaryLight} accessible={false} />
            </View>

            <View style={{ paddingTop: compact ? 28 : 48, paddingBottom: compact ? 24 : 32 }}>
              <View accessible={false} style={[s.accent, { backgroundColor: colors.primaryLight }]} />
              <Text accessibilityRole="header" style={[s.hero, { color: colors.text, fontSize: compact ? 34 : 40 }]}>Your next shift{"\n"}starts here.</Text>
              <Text style={[s.subtitle, { color: colors.muted }]}>Welcome back. Sign in to get on the road.</Text>
            </View>

            <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: isLofi ? 6 : 24 }]}>
              <View style={s.formHeading}>
                <Text accessibilityRole="header" style={[s.cardTitle, { color: colors.text }]}>Sign in</Text>
                <Text style={[s.cardHint, { color: colors.muted }]}>Use your assigned conductor account.</Text>
              </View>

              <Text nativeID="conductor-login-label" style={[s.label, { color: colors.text }]}>Username or email</Text>
              <View style={[s.field, { backgroundColor: colors.surface2, borderColor: focused === "login" ? colors.primaryLight : colors.border }]}>
                <Ionicons name="person-outline" size={19} color={colors.muted} accessible={false} />
                <TextInput
                  accessibilityLabel="Username or email" accessibilityLabelledBy="conductor-login-label"
                  value={login} onChangeText={setLogin} placeholder="Enter your username or email"
                  placeholderTextColor={colors.muted} style={[s.input, { color: colors.text }]}
                  autoCapitalize="none" autoCorrect={false} autoComplete="username" textContentType="username"
                  editable={!busy} returnKeyType="next" onSubmitEditing={() => passwordInput.current?.focus()}
                  onFocus={() => setFocused("login")} onBlur={() => setFocused(null)}
                />
              </View>

              <View style={s.passwordLabelRow}>
                <Text nativeID="conductor-password-label" style={[s.label, { color: colors.text }]}>Password</Text>
                <Pressable accessibilityRole="button" disabled={busy} onPress={() => setRecovering(true)} style={s.recovery}>
                  <Text style={{ color: colors.primaryLight, fontSize: 13, fontWeight: "600" }}>Forgot password?</Text>
                </Pressable>
              </View>
              <View style={[s.field, { backgroundColor: colors.surface2, borderColor: focused === "password" ? colors.primaryLight : colors.border }]}>
                <Ionicons name="lock-closed-outline" size={19} color={colors.muted} accessible={false} />
                <TextInput
                  ref={passwordInput} accessibilityLabel="Password" accessibilityLabelledBy="conductor-password-label"
                  value={password} onChangeText={setPassword} placeholder="Enter your password"
                  placeholderTextColor={colors.muted} style={[s.input, { color: colors.text }]}
                  secureTextEntry={!passwordVisible} autoCapitalize="none" autoCorrect={false}
                  autoComplete="current-password" textContentType="password" editable={!busy}
                  returnKeyType="go" onSubmitEditing={() => void submit()}
                  onFocus={() => setFocused("password")} onBlur={() => setFocused(null)}
                />
                <Pressable accessibilityRole="button" disabled={busy} accessibilityLabel={passwordVisible ? "Hide password" : "Show password"} onPress={() => setPasswordVisible(value => !value)} style={s.eye}>
                  <Ionicons name={passwordVisible ? "eye-off-outline" : "eye-outline"} size={21} color={colors.muted} />
                </Pressable>
              </View>

              {error ? <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={[s.error, { borderColor: colors.danger }]}>
                <Text style={{ color: colors.danger, fontSize: 14, lineHeight: 21 }}>{error}</Text>
              </View> : null}
              <Pressable
                accessibilityRole="button" accessibilityLabel={busy ? "Signing in" : "Sign in"}
                accessibilityState={{ disabled: busy || !login.trim() || !password, busy }}
                disabled={busy || !login.trim() || !password} onPress={() => void submit()}
                style={({ pressed }) => [s.submit, { backgroundColor: colors.primary, opacity: busy || !login.trim() || !password ? 0.5 : pressed ? 0.85 : 1 }]}
              >
                {busy ? <ActivityIndicator color="#FFFFFF" size="small" /> : null}
                <Text style={s.submitText}>{busy ? "Signing in…" : "Sign in"}</Text>
                {!busy ? <Ionicons name="arrow-forward" size={19} color="#FFFFFF" /> : null}
              </Pressable>
            </View>

            <Text style={[s.footerNote, { color: colors.muted }]}>Need an account or assignment? Contact your operator.</Text>
            <LegalSupportCard compact />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 22 },
  content: { width: "100%", maxWidth: 460, alignSelf: "center" },
  brandRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  wordmark: { fontSize: 27, fontWeight: "900", letterSpacing: -1 },
  brandLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 3, marginTop: 4 },
  accent: { width: 36, height: 4, borderRadius: 2, marginBottom: 18 },
  hero: { fontWeight: "800", letterSpacing: -1.2, lineHeight: 46 },
  subtitle: { fontSize: 14, lineHeight: 22, marginTop: 12 },
  card: { borderWidth: 1, padding: 22 },
  formHeading: { gap: 6, marginBottom: 26 },
  cardTitle: { fontSize: 22, fontWeight: "700", letterSpacing: -0.4 },
  cardHint: { fontSize: 13, lineHeight: 20 },
  label: { fontSize: 13, fontWeight: "600" },
  field: { borderWidth: 1, borderRadius: 12, flexDirection: "row", alignItems: "center", paddingLeft: 14, marginTop: 10, minHeight: 56 },
  input: { flex: 1, minWidth: 0, paddingHorizontal: 12, paddingVertical: 16, fontSize: 14 },
  passwordLabelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", marginTop: 10 },
  recovery: { minHeight: 44, justifyContent: "center" },
  eye: { minHeight: 48, minWidth: 44, alignItems: "center", justifyContent: "center" },
  error: { borderLeftWidth: 3, paddingLeft: 12, marginTop: 18 },
  submit: { minHeight: 56, flexDirection: "row", gap: 10, alignItems: "center", justifyContent: "center", borderRadius: 12, padding: 16, marginTop: 24 },
  submitText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  footerNote: { textAlign: "center", fontSize: 12, lineHeight: 20, marginTop: 24, paddingHorizontal: 12 },
});
