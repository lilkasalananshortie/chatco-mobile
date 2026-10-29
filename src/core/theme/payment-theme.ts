import { useAppTheme } from "./ThemeProvider";

/** Payment controls use the same dark/light semantic tokens as the rest of the app. */
export function paymentColors(colors: ReturnType<typeof useAppTheme>["colors"]) {
  return colors;
}

export function usePaymentTheme() {
  const theme = useAppTheme();
  return { ...theme, colors: paymentColors(theme.colors) };
}
