import { useEffect, useRef, useState } from "react";
import { Animated, BackHandler, Easing, Keyboard, Pressable, StyleSheet } from "react-native";
import { Text, TextInput } from "../../shared/ui/BrandText";
import { api } from "../../core/api/chatco-api";
import { Header, ScreenShell } from "../../shared/ui";
import { useAppTheme } from "../../core/theme/ThemeProvider";
import { useReducedMotion, useWebEntrance } from "../../shared/ui/useWebEntrance";
import { VerificationCodeInput } from "./VerificationCodeInput";

/** Existing backend email/code recovery and mandatory temporary-password setup. */
export function PasswordScreen({ setup = false, onBack }: { setup?: boolean; onBack: () => void }) {
  const { colors, styles, isLowFidelity } = useAppTheme();
  const entranceStyle = useWebEntrance(true, setup || isLowFidelity, 18, 300);
  const reduceMotion = useReducedMotion();
  const exitOpacity = useRef(new Animated.Value(1)).current;
  const [step, setStep] = useState<"email" | "code" | "password" | "done">(setup ? "password" : "email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const [exiting, setExiting] = useState(false);
  const pending = useRef(false);
  const mounted = useRef(true);
  const leaving = useRef(false);
  const exitAnimation = useRef<Animated.CompositeAnimation | null>(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; exitAnimation.current?.stop(); }; }, []);
  const returnToLogin = () => {
    if (pending.current || leaving.current) return;
    if (setup || isLowFidelity || reduceMotion) { Keyboard.dismiss(); onBack(); return; }
    leaving.current = true;
    setExiting(true);
    const animation = Animated.timing(exitOpacity, {
      toValue: 0,
      duration: 240,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    exitAnimation.current = animation;
    animation.start(({ finished }) => {
      if (finished && mounted.current) { Keyboard.dismiss(); onBack(); }
      else if (mounted.current) { leaving.current = false; setExiting(false); exitOpacity.setValue(1); }
    });
  };
  useEffect(() => { const listener = BackHandler.addEventListener("hardwareBackPress", () => { if (!setup) returnToLogin(); return true; }); return () => listener.remove(); });
  useEffect(() => { if (resendIn <= 0) return; const timer = setTimeout(() => setResendIn(value => value - 1), 1000); return () => clearTimeout(timer); }, [resendIn]);
  const submit = async (resend = false) => {
    if (pending.current || leaving.current || (resend && resendIn > 0)) return;
    if (!setup && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError("Enter your registered email address."); return; }
    if (!resend && step === "code" && !/^\d{6}$/.test(code)) { setError("Enter the 6-digit email code."); return; }
    if (!resend && step === "password" && (Array.from(password).length < 8 || Array.from(password).length > 128 || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9\s]/.test(password))) { setError("Use 8–128 characters, an uppercase letter, a number and a symbol."); return; }
    if (!resend && step === "password" && password !== confirmation) { setError("Passwords do not match."); return; }
    pending.current = true; setBusy(true); setError("");
    try {
      if (step === "email" || resend) { await api.forgotPassword(email.trim().toLowerCase()); if (mounted.current) { setCode(""); setResendIn(60); setStep("code"); } }
      else if (step === "code") { await api.verifyResetCode(email.trim().toLowerCase(), code); if (mounted.current) setStep("password"); }
      else { if (setup) await api.setNewPassword(password, confirmation); else await api.resetPassword({ email: email.trim().toLowerCase(), code, password, passwordConfirmation: confirmation }); if (mounted.current) { setPassword(""); setConfirmation(""); setStep("done"); } }
    } catch (reason) { if (mounted.current) setError(reason instanceof Error ? reason.message : "Unable to update password. Retry."); }
    finally { pending.current = false; if (mounted.current) setBusy(false); }
  };
  return <ScreenShell contentStyle={{ flexGrow: 1, justifyContent: "center", paddingBottom: 24 }}>
    <Animated.View pointerEvents={exiting ? "none" : "auto"} style={[exiting ? { opacity: exitOpacity } : entranceStyle, local.form]}>
    <Header title={step === "done" ? "Password updated" : setup ? "Activate your account" : "Recover your account"} subtitle={step === "done" ? "Sign in again with your new password." : "Use your registered email and choose a secure password."} />
    {step === "email" && <TextInput accessibilityLabel="Registered email" placeholder="Registered email" placeholderTextColor={colors.muted} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} value={email} onChangeText={setEmail} editable={!busy} style={styles.input} />}
    {step === "code" && <><Text style={styles.subtitle}>Enter the code sent to {email}.</Text><VerificationCodeInput value={code} onChange={setCode} disabled={busy} /></>}
    {step === "password" && <><Text style={styles.subtitle}>8–128 characters, an uppercase letter, a number and a symbol.</Text><TextInput accessibilityLabel="New password" placeholder="New password" placeholderTextColor={colors.muted} secureTextEntry autoCapitalize="none" autoCorrect={false} value={password} onChangeText={setPassword} editable={!busy} style={styles.input} /><TextInput accessibilityLabel="Confirm password" placeholder="Confirm password" placeholderTextColor={colors.muted} secureTextEntry autoCapitalize="none" autoCorrect={false} value={confirmation} onChangeText={setConfirmation} editable={!busy} style={styles.input} /></>}
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    <Pressable accessibilityRole="button" disabled={busy || exiting} onPress={step === "done" ? returnToLogin : () => void submit()} style={styles.button}><Text style={styles.buttonText}>{busy ? "Please wait…" : step === "done" ? "Sign in again" : step === "email" ? "Send reset code" : step === "code" ? "Verify code" : "Save password"}</Text></Pressable>
    {step === "code" && <Pressable accessibilityRole="button" accessibilityLabel={resendIn > 0 ? `Resend code in ${resendIn} seconds` : "Resend code"} disabled={busy || resendIn > 0} onPress={() => void submit(true)} style={local.resendAction}><Text style={[local.resendText, { color: resendIn > 0 ? colors.muted : colors.primaryLight }]}>{resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}</Text></Pressable>}
    {step !== "done" && <Pressable accessibilityRole={setup ? "button" : "link"} disabled={busy || exiting} onPress={setup ? () => { void api.logout().catch(() => {}).finally(onBack); } : returnToLogin} style={setup ? styles.secondaryButton : local.backToLogin}><Text style={setup ? styles.subtitle : [local.backToLoginText, { color: colors.primaryLight }]}>{setup ? "Sign out" : "Back to login"}</Text></Pressable>}
    </Animated.View>
  </ScreenShell>;
}

const local = StyleSheet.create({
  form: { width: "100%", maxWidth: 460, alignSelf: "center" },
  resendAction: { alignSelf: "center", alignItems: "center", justifyContent: "center", minHeight: 44, marginTop: 8, paddingHorizontal: 16 },
  resendText: { fontSize: 14, fontWeight: "600", textAlign: "center" },
  backToLogin: { alignSelf: "center", alignItems: "center", justifyContent: "center", minHeight: 44, marginTop: 12, paddingHorizontal: 16 },
  backToLoginText: { fontSize: 14, fontWeight: "600", textAlign: "center", textDecorationLine: "underline" },
});
