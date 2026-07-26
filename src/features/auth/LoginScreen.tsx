import { useState } from "react";
import { Pressable, Text, TextInput } from "react-native";
import { api } from "../../core/api/chatco-api";
import { Header, ScreenShell } from "../../shared/ui";
import { useAppTheme } from "../../core/theme/ThemeProvider";
import type { User } from "../../core/domain/types";

export function LoginScreen({ onLogin }: { onLogin: (user: User) => void }) {
  const { styles } = useAppTheme();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async () => {
    setBusy(true); setError("");
    try { onLogin(await api.login(login.trim(), password)); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to sign in."); }
    finally { setBusy(false); }
  };
  return (
    <ScreenShell>
      <Text style={[styles.title, { textAlign: "center", marginTop: 60 }]}>CHATCO.</Text>
      <Text style={[styles.label, { textAlign: "center", marginTop: 5 }]}>Conductor Portal</Text>
      <Header title="Welcome back" subtitle="Sign in with your existing ChatCo conductor account." />
      <Text style={[styles.label, { marginTop: 28 }]}>Username or email</Text>
      <TextInput value={login} onChangeText={setLogin} style={styles.input} autoCapitalize="none" />
      <Text style={[styles.label, { marginTop: 16 }]}>Password</Text>
      <TextInput value={password} onChangeText={setPassword} style={styles.input} secureTextEntry />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable disabled={busy || !login || !password} onPress={submit} style={[styles.button, (busy || !login || !password) && { opacity: 0.45 }]}>
        <Text style={styles.buttonText}>{busy ? "Signing in…" : "Sign in"}</Text>
      </Pressable>
    </ScreenShell>
  );
}
