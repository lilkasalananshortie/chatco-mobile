import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Platform, StyleSheet } from "react-native";
import { appStorage } from "../storage/app-storage";

const MODE_KEY = "chatco_ui_mode";

const standardColors = {
  background: "#050F1A",
  surface: "#0B1E33",
  surface2: "#071A2E",
  primary: "#1A5FB4",
  primaryLight: "#62A0EA",
  text: "#FFFFFF",
  muted: "#91A0B4",
  border: "rgba(255,255,255,0.09)",
  success: "#34D399",
  warning: "#FBBF24",
  danger: "#FB7185",
  overlay: "rgba(0,0,0,0.68)",
};

const lofiColors = {
  background: "#F7F8FA",
  surface: "#FFFFFF",
  surface2: "#F1F5F9",
  primary: "#1A5FB4",
  primaryLight: "#245F9E",
  text: "#09213A",
  muted: "#526B84",
  border: "#D7E0EB",
  success: "#16705A",
  warning: "#765C10",
  danger: "#B4233C",
  overlay: "rgba(5,25,48,0.42)",
};

function makeStyles(colors: typeof standardColors, isLofi: boolean) {
  const radius = 14;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: {
      width: "100%",
      maxWidth: 760,
      alignSelf: "center",
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 126,
    },
    title: {
      color: colors.text,
      fontSize: 27,
      lineHeight: 33,
      fontWeight: "700",
      letterSpacing: -0.6,
    },
    subtitle: { color: colors.muted, fontSize: 13, marginTop: 6, lineHeight: 20 },
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius,
      padding: 17,
      marginTop: 14,
      ...(isLofi ? {} : Platform.OS === "web"
        ? { boxShadow: "0 7px 18px rgba(0,0,0,0.16)" }
        : {
            shadowColor: "#000",
            shadowOpacity: 0.16,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 7 },
            elevation: 4,
          }),
    },
    cardTitle: { color: colors.text, fontSize: 15, fontWeight: "800", lineHeight: 21 },
    label: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: "800",
      textTransform: "uppercase",
      letterSpacing: 1.2,
    },
    input: {
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.text,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 13,
      marginTop: 8,
      outlineStyle: "none",
    } as never,
    button: {
      minHeight: 48,
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 18,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 12,
      borderWidth: isLofi ? 1.5 : 0,
      borderColor: colors.border,
    },
    buttonText: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },
    secondaryButton: {
      backgroundColor: colors.surface2,
      borderWidth: isLofi ? 1.5 : 1,
      borderColor: colors.border,
    },
    secondaryButtonText: { color: colors.text },
    error: { color: colors.danger, fontSize: 12, marginTop: 12, textAlign: "center" },
  });
}

type ThemeContextValue = {
  colors: typeof standardColors;
  isLofi: boolean;
  ready: boolean;
  setLofi: (value: boolean) => Promise<void>;
  styles: ReturnType<typeof makeStyles>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isLofi, setIsLofiState] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    void appStorage.getItem(MODE_KEY)
      // Read the previous appearance key without changing existing users' choice.
      .then(value => setIsLofiState(value === "lofi" || value === "light"))
      .catch(() => setIsLofiState(false))
      .finally(() => setReady(true));
  }, []);
  const setLofi = useCallback(async (value: boolean) => {
    await appStorage.setItem(MODE_KEY, value ? "lofi" : "dark");
    setIsLofiState(value);
  }, []);
  const colors = isLofi ? lofiColors : standardColors;
  const value = useMemo(() => ({
    colors,
    isLofi,
    ready,
    setLofi,
    styles: makeStyles(colors, isLofi),
  }), [colors, isLofi, ready, setLofi]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useAppTheme must be used inside ThemeProvider.");
  return value;
}
