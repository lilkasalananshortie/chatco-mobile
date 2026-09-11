import type { ReceiptSettings, Shift, Transaction } from "../domain/types";

// 58mm thermal paper has 384 dots/line -> 32 characters per line with standard 12x24 Font A
export const GOOJPRT_LINE_WIDTH = 32;

// ESC/POS Command Byte Sequences for Goojprt 58mm Belt Printers
export const ESC = 0x1b;
export const GS = 0x1d;

export const CMD = {
  INIT: new Uint8Array([ESC, 0x40]), // ESC @ - Initialize
  ALIGN_LEFT: new Uint8Array([ESC, 0x61, 0x00]), // ESC a 0
  ALIGN_CENTER: new Uint8Array([ESC, 0x61, 0x01]), // ESC a 1
  ALIGN_RIGHT: new Uint8Array([ESC, 0x61, 0x02]), // ESC a 2
  BOLD_ON: new Uint8Array([ESC, 0x45, 0x01]), // ESC E 1
  BOLD_OFF: new Uint8Array([ESC, 0x45, 0x00]), // ESC E 0
  DOUBLE_SIZE_ON: new Uint8Array([GS, 0x21, 0x11]), // GS ! 0x11 (2x width & height)
  DOUBLE_SIZE_OFF: new Uint8Array([GS, 0x21, 0x00]), // GS ! 0x00 (Normal)
  DOUBLE_HEIGHT_ON: new Uint8Array([GS, 0x21, 0x01]), // GS ! 0x01 (2x height)
  FEED_3: new Uint8Array([ESC, 0x64, 0x03]), // ESC d 3 - Feed 3 lines
  FEED_5: new Uint8Array([ESC, 0x64, 0x05]), // ESC d 5 - Feed 5 lines (clear tear bar)
};

// Known BLE Service UUIDs for Goojprt PT-210, MPT-II, JP-58H, and ESC/POS printers
export const GOOJPRT_SERVICE_UUIDS = [
  "000018f0-0000-1000-8000-00805f9b34fb", // Standard Serial/POS Printer service
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2", // Goojprt / Rongta / Xprinter service
  "0000ffe0-0000-1000-8000-00805f9b34fb", // Generic BLE UART (HMSoft / Goojprt)
  "49535343-fe7d-4ae5-8fa9-9fafd205e455", // ISSC Transparent Serial
  "0000af30-0000-1000-8000-00805f9b34fb", // Micro-printer service
];

// Fallback prefixes for Goojprt Bluetooth advertising name
export const GOOJPRT_NAME_PREFIXES = [
  "MPT",
  "PT-",
  "Goojprt",
  "GOOJPRT",
  "JP-",
  "POS",
  "Printer",
  "Bluetooth",
];

// Helper: Text encoding (ASCII / UTF-8)
export function encodeText(text: string): Uint8Array {
  // Thermal printers in CP437/PC850 don't support Unicode Peso sign (₱), replace with 'P' to prevent garbage chars
  const sanitized = text.replace(/₱/g, "P");
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(sanitized);
  }
  const bytes = new Uint8Array(sanitized.length);
  for (let i = 0; i < sanitized.length; i++) {
    bytes[i] = sanitized.charCodeAt(i) & 0xff;
  }
  return bytes;
}

// Concatenate multiple Uint8Arrays
export function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  let totalLength = 0;
  for (const arr of arrays) {
    totalLength += arr.length;
  }
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

// Format 32-character row (left-aligned label, right-aligned value)
export function formatRow(label: string, value: string, width = GOOJPRT_LINE_WIDTH): string {
  const cleanLabel = label.replace(/₱/g, "P").trim();
  const cleanValue = value.replace(/₱/g, "P").trim();
  const available = width - cleanValue.length;
  if (cleanLabel.length >= available) {
    return `${cleanLabel.slice(0, Math.max(0, available - 1))} ${cleanValue}\n`;
  }
  const spaces = " ".repeat(width - cleanLabel.length - cleanValue.length);
  return `${cleanLabel}${spaces}${cleanValue}\n`;
}

// Format centered line
export function centerText(text: string, width = GOOJPRT_LINE_WIDTH): string {
  const clean = text.replace(/₱/g, "P").trim();
  if (clean.length >= width) return `${clean.slice(0, width)}\n`;
  const padLeft = Math.floor((width - clean.length) / 2);
  const padRight = width - clean.length - padLeft;
  return `${" ".repeat(padLeft)}${clean}${" ".repeat(padRight)}\n`;
}

// Format divider line
export function dividerLine(char = "-", width = GOOJPRT_LINE_WIDTH): string {
  return `${char.repeat(width)}\n`;
}

// Build ESC/POS QR Code command sequence for Goojprt
export function buildEscPosQrCode(data: string): Uint8Array {
  const dataBytes = encodeText(data);
  const len = dataBytes.length + 3;
  const pL = len % 256;
  const pH = Math.floor(len / 256);

  return concatBytes(
    CMD.ALIGN_CENTER,
    // Model 2
    new Uint8Array([GS, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]),
    // Module size: 5 dots (ideal for 58mm paper)
    new Uint8Array([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, 0x05]),
    // Error correction Level L
    new Uint8Array([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x30]),
    // Store data
    new Uint8Array([GS, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30]),
    dataBytes,
    // Print QR
    new Uint8Array([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30]),
    encodeText("\n"),
    CMD.ALIGN_LEFT
  );
}

export interface ReceiptOptions {
  shift?: Shift | null;
  settings?: ReceiptSettings | null;
  totalPassengers?: number;
  grossFare?: number;
  passengerBreakdown?: Array<{ passengerType: string; quantity: number; subtotal: number }>;
}

// Build complete ESC/POS binary stream for Goojprt 58mm Belt Printer
export function buildGoojprtReceiptBytes(
  txns: Transaction[],
  options: ReceiptOptions = {}
): { bytes: Uint8Array; text: string } {
  const parts: Uint8Array[] = [CMD.INIT];
  let textBuffer = "";

  const appendText = (str: string, isCenter = false, isBold = false) => {
    if (isCenter) parts.push(CMD.ALIGN_CENTER);
    else parts.push(CMD.ALIGN_LEFT);

    if (isBold) parts.push(CMD.BOLD_ON);
    parts.push(encodeText(str));
    if (isBold) parts.push(CMD.BOLD_OFF);

    textBuffer += str;
  };

  const appendRow = (label: string, value: string, isBold = false) => {
    const rowStr = formatRow(label, value);
    if (isBold) parts.push(CMD.BOLD_ON);
    parts.push(CMD.ALIGN_LEFT);
    parts.push(encodeText(rowStr));
    if (isBold) parts.push(CMD.BOLD_OFF);
    textBuffer += rowStr;
  };

  const appendDivider = (char = "-") => {
    const line = dividerLine(char);
    parts.push(CMD.ALIGN_LEFT);
    parts.push(encodeText(line));
    textBuffer += line;
  };

  const firstTxn = txns[0];
  const settings = options.settings;
  const shift = options.shift;

  const businessName = settings?.businessName || "CHATCO TRANSPORT";
  const addressLine = settings?.addressLine || "";
  const footerNote = settings?.footerNote || "Thank you for riding with ChatCo!";

  // 1. HEADER
  parts.push(CMD.ALIGN_CENTER);
  parts.push(CMD.DOUBLE_SIZE_ON);
  parts.push(CMD.BOLD_ON);
  parts.push(encodeText(`${businessName.slice(0, 16)}\n`));
  parts.push(CMD.BOLD_OFF);
  parts.push(CMD.DOUBLE_SIZE_OFF);
  textBuffer += centerText(businessName);

  if (addressLine) {
    appendText(centerText(addressLine), true);
  }
  appendText(centerText("OFFICIAL FARE TICKET"), true, true);
  appendDivider("=");

  // 2. META (Date, Unit, Crew)
  const timestamp = firstTxn?.timestamp ? new Date(firstTxn.timestamp) : new Date();
  const dateStr = timestamp.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = timestamp.toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
  });
  appendRow("Date & Time:", `${dateStr} ${timeStr}`);

  const unitNum = firstTxn?.unitNumber || shift?.unitNumber || "104";
  appendRow("Unit No:", unitNum, true);

  const conductorName = firstTxn?.conductorName || shift?.conductorName || "Conductor";
  appendRow("Conductor:", conductorName);

  const driverName = firstTxn?.driverName || shift?.driverName;
  if (driverName) {
    appendRow("Driver:", driverName);
  }

  // 3. TICKET REFERENCE(S)
  if (firstTxn?.multiplePaymentReference) {
    appendRow("Group Ref:", firstTxn.multiplePaymentReference, true);
  }
  if (firstTxn?.transactionId) {
    appendRow("Ticket ID:", firstTxn.transactionId.slice(-14));
  }

  appendDivider("-");

  // 4. ROUTE INFO
  if (firstTxn?.from && firstTxn?.to) {
    appendRow("From:", firstTxn.from);
    appendRow("To:", firstTxn.to);
    if (firstTxn.distance) {
      appendRow("Barangays:", `${firstTxn.distance} traveled`);
    }
  }

  appendDivider("-");

  // 5. COMMUTER BREAKDOWN
  const isGroup = txns.length > 1 || (options.totalPassengers ?? 1) > 1;
  if (isGroup && options.passengerBreakdown && options.passengerBreakdown.length > 0) {
    for (const b of options.passengerBreakdown) {
      if (b.quantity > 0) {
        appendRow(`${b.passengerType} x${b.quantity}`, `P${b.subtotal.toFixed(2)}`);
      }
    }
  } else {
    const role = firstTxn?.passengerRole || "REGULAR";
    appendRow("Passenger:", role);
    appendRow("Base Fare:", `P${(firstTxn?.baseFare ?? firstTxn?.finalAmount ?? 0).toFixed(2)}`);
    if (firstTxn?.discountAmount && firstTxn.discountAmount > 0) {
      appendRow("Discount:", `-P${firstTxn.discountAmount.toFixed(2)}`);
    }
  }

  appendDivider("=");

  // 6. TOTAL AMOUNT (Enlarged / Bold)
  const totalAmount = txns.reduce((sum, t) => sum + (t.finalAmount || 0), 0);
  parts.push(CMD.ALIGN_LEFT);
  parts.push(CMD.BOLD_ON);
  parts.push(CMD.DOUBLE_SIZE_ON);
  parts.push(encodeText(`TOTAL: P${totalAmount.toFixed(2)}\n`));
  parts.push(CMD.DOUBLE_SIZE_OFF);
  parts.push(CMD.BOLD_OFF);
  textBuffer += formatRow("TOTAL:", `P${totalAmount.toFixed(2)}`);

  const paymentMethod = firstTxn?.paymentMethod || "Cash";
  appendRow("Payment:", paymentMethod.toUpperCase(), true);

  if (firstTxn?.voucherCode) {
    appendRow("Voucher:", firstTxn.voucherCode);
  }

  // 7. QR CODE / VERIFICATION
  const qrToken = firstTxn?.receiptQrToken || firstTxn?.qrToken || firstTxn?.transactionId;
  if (qrToken) {
    appendDivider("-");
    appendText(centerText("SCAN TO CLAIM PASSENGER REWARD"), true);
    parts.push(buildEscPosQrCode(qrToken));
    appendText(centerText(qrToken.slice(0, 32)), true);
  }

  // 8. FOOTER & FEED
  appendDivider("-");
  appendText(centerText(footerNote), true);
  appendText(centerText("Goojprt 58mm Belt Receipt"), true);
  parts.push(CMD.FEED_5); // Feed 5 lines past tear bar

  return {
    bytes: concatBytes(...parts),
    text: textBuffer,
  };
}

// Build Diagnostic Test Ticket for Goojprt
export function buildGoojprtTestTicket(unit = "UNIT-104", conductor = "Conductor"): {
  bytes: Uint8Array;
  text: string;
} {
  const parts: Uint8Array[] = [CMD.INIT];
  let textBuffer = "";

  const add = (str: string, isCenter = false, isBold = false) => {
    if (isCenter) parts.push(CMD.ALIGN_CENTER);
    else parts.push(CMD.ALIGN_LEFT);
    if (isBold) parts.push(CMD.BOLD_ON);
    parts.push(encodeText(str));
    if (isBold) parts.push(CMD.BOLD_OFF);
    textBuffer += str;
  };

  add(centerText("GOOJPRT BELT PRINTER TEST"), true, true);
  add(centerText("ESC/POS 58mm DIAGNOSTIC"), true);
  add(dividerLine("="));
  add(formatRow("Status:", "ONLINE & READY"));
  add(formatRow("Target:", "GOOJPRT PT-210 / MPT-II"));
  add(formatRow("Unit Number:", unit));
  add(formatRow("Conductor:", conductor));
  add(formatRow("Encoding:", "ASCII / ESC-POS"));
  add(dividerLine("-"));
  add("32-CHAR MARGIN BOUNDARY CHECK:\n");
  add("12345678901234567890123456789012\n");
  add(dividerLine("-"));
  add(centerText("TEST QR CODE:"));
  parts.push(buildEscPosQrCode(`GOOJPRT-TEST-${Date.now()}`));
  add(centerText("OK: BLE & MOTOR VERIFIED"), true, true);
  add(dividerLine("="));
  parts.push(CMD.FEED_5);

  return {
    bytes: concatBytes(...parts),
    text: textBuffer,
  };
}