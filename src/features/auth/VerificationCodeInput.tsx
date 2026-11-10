import { useRef, useState } from "react";
import { View, type TextInput as NativeTextInput } from "react-native";
import { TextInput } from "../../shared/ui/BrandText";
import { useAppTheme } from "../../core/theme/ThemeProvider";

export function VerificationCodeInput({ value, onChange, disabled = false }: {
  value: string; onChange: (code: string) => void; disabled?: boolean;
}) {
  const { colors } = useAppTheme();
  const inputs = useRef<Array<NativeTextInput | null>>([]);
  const [focused, setFocused] = useState<number | null>(null);

  const update = (index: number, text: string) => {
    if (disabled) return;
    const digits = text.replace(/\D/g, "");
    if (text && !digits) return;
    const start = digits.length === 6 ? 0 : index;
    const next = value.padEnd(6, " ").split("");
    if (!digits) next[index] = " ";
    else digits.slice(0, 6 - start).split("").forEach((digit, offset) => { next[start + offset] = digit; });
    onChange(next.join("").trimEnd());
    if (digits) inputs.current[Math.min(start + digits.length, 5)]?.focus();
  };

  return <View accessibilityLabel="6-digit reset code" style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
    {Array.from({ length: 6 }, (_, index) => <TextInput
      key={index}
      ref={input => { inputs.current[index] = input; }}
      accessibilityLabel={`Reset code digit ${index + 1} of 6`}
      value={value[index]?.trim() ?? ""}
      onChangeText={text => update(index, text)}
      onFocus={() => setFocused(index)} onBlur={() => setFocused(null)}
      onKeyPress={({ nativeEvent }) => {
        if (!disabled && nativeEvent.key === "Backspace" && !value[index]?.trim() && index > 0) {
          update(index - 1, ""); inputs.current[index - 1]?.focus();
        }
      }}
      keyboardType="number-pad" inputMode="numeric" maxLength={6} editable={!disabled}
      autoComplete={index === 0 ? "one-time-code" : "off"}
      textContentType={index === 0 ? "oneTimeCode" : "none"}
      autoCapitalize="none" autoCorrect={false} selectTextOnFocus selectionColor={colors.primaryLight}
      style={{ flex: 1, minWidth: 0, height: 50, paddingHorizontal: 0, paddingVertical: 0, borderRadius: 10,
        backgroundColor: colors.surface2, borderWidth: focused === index ? 2 : 1,
        borderColor: focused === index ? colors.primaryLight : colors.border, color: colors.text,
        textAlign: "center", fontSize: 22, fontWeight: "600", opacity: disabled ? 0.6 : 1 }}
    />)}
  </View>;
}
