import type { ReactNode } from "react";
import { useFonts } from "expo-font";
import { ActivityIndicator, View } from "react-native";
import { BrandFontContext } from "./BrandText";

/** Bundled licensed fonts: typography works offline, without a new dependency. */
export function BrandFonts({ children }: { children: ReactNode }) {
  const [loaded, error] = useFonts({
    "Poppins-Regular": require("../../../assets/fonts/Poppins-Regular.ttf"),
    "Poppins-Medium": require("../../../assets/fonts/Poppins-Medium.ttf"),
    "Poppins-SemiBold": require("../../../assets/fonts/Poppins-SemiBold.ttf"),
    "Poppins-Bold": require("../../../assets/fonts/Poppins-Bold.ttf"),
  });
  if (!loaded && !error) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#071A2E" }}><ActivityIndicator color="#62A0EA" size="large" /></View>;
  return <BrandFontContext.Provider value={loaded}>{children}</BrandFontContext.Provider>;
}
