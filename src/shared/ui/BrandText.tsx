import { createContext, forwardRef, useContext } from "react";
import { Text as NativeText, TextInput as NativeTextInput, Platform, StyleSheet, type TextProps, type TextInputProps } from "react-native";
import { brandFontFamily } from "./brand-font";

export const BrandFontContext = createContext(false);

/** Preserve explicit receipt/monospace fonts and native fallback if loading fails. */
export function Text({ style, ...props }: TextProps) {
  const loaded = useContext(BrandFontContext);
  const resolved = StyleSheet.flatten(style);
  return <NativeText {...props} style={[style, loaded && !resolved?.fontFamily
    ? { fontFamily: brandFontFamily(resolved?.fontWeight, Platform?.OS ?? "native"), fontWeight: "normal" } : undefined]} />;
}

export const TextInput = forwardRef<NativeTextInput, TextInputProps>(function TextInput({ style, ...props }, ref) {
  const loaded = useContext(BrandFontContext);
  const resolved = StyleSheet.flatten(style);
  return <NativeTextInput {...props} ref={ref} style={[style, loaded && !resolved?.fontFamily
    ? { fontFamily: brandFontFamily(resolved?.fontWeight, Platform?.OS ?? "native"), fontWeight: "normal" } : undefined]} />;
});
