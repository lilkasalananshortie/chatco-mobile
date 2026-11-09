import type { useAppTheme } from "../../core/theme/ThemeProvider";
import { createConfirmationStyles } from "./styles/confirmation-styles";
import { createGcashQrStyles } from "./styles/gcash-qr-styles";
import { createLocationStyles } from "./styles/location-styles";
import { createMethodGroupStyles } from "./styles/method-group-styles";
import { createSuccessReceiptStyles } from "./styles/success-receipt-styles";

export function createPaymentStyles(colors: ReturnType<typeof useAppTheme>["colors"], isLofi: boolean, isLowFidelity = false) {
  return {
    ...createLocationStyles(colors, isLofi, isLowFidelity),
    ...createMethodGroupStyles(colors, isLofi, isLowFidelity),
    ...createConfirmationStyles(colors, isLofi, isLowFidelity),
    ...createGcashQrStyles(colors, isLofi, isLowFidelity),
    ...createSuccessReceiptStyles(colors, isLofi, isLowFidelity),
  };
}
