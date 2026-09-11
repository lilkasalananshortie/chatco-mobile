import type { useAppTheme } from "../../core/theme/ThemeProvider";
import { createConfirmationStyles } from "./styles/confirmation-styles";
import { createGcashQrStyles } from "./styles/gcash-qr-styles";
import { createLocationStyles } from "./styles/location-styles";
import { createMethodGroupStyles } from "./styles/method-group-styles";
import { createSuccessReceiptStyles } from "./styles/success-receipt-styles";

export function createPaymentStyles(colors: ReturnType<typeof useAppTheme>["colors"], isLofi: boolean) {
  return {
    ...createLocationStyles(colors, isLofi),
    ...createMethodGroupStyles(colors, isLofi),
    ...createConfirmationStyles(colors, isLofi),
    ...createGcashQrStyles(colors, isLofi),
    ...createSuccessReceiptStyles(colors, isLofi),
  };
}
