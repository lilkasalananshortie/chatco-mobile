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

const ACCENTED = "ÁÀÂÄÃÉÈÊËÍÌÎÏÓÒÔÖÕÚÙÛÜÑáàâäãéèêëíìîïóòôöõúùûüñ";
const UNACCENTED = "AAAAAEEEEIIIIOOOOOUUUUNaaaaaeeeeiiiiooooouuuun";
const PRINTER_SYMBOLS: Record<string, string> = {
  "₱": "P", "·": "-", "•": "-", "–": "-", "—": "-", "−": "-", "→": ">",
  "‘": "'", "’": "'", "“": '"', "”": '"', "…": "...",
};

/** These printers use a single-byte code page, so anything outside ASCII prints as garbage. */
export function printableText(text: string): string {
  return text.replace(/[^\x20-\x7E\n]/gu, character => {
    const accented = ACCENTED.indexOf(character);
    return accented >= 0 ? UNACCENTED[accented]! : PRINTER_SYMBOLS[character] ?? "?";
  });
}

// Helper: Text encoding (ASCII)
export function encodeText(text: string): Uint8Array {
  const sanitized = printableText(text);
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
  const cleanLabel = printableText(label).trim();
  const cleanValue = printableText(value).trim();
  const gap = cleanLabel ? 1 : 0;
  if (cleanLabel.length + gap + cleanValue.length <= width) {
    const spaces = " ".repeat(width - cleanLabel.length - cleanValue.length);
    return `${cleanLabel}${spaces}${cleanValue}\n`;
  }
  // Too long for one row: keep the label and wrap the value under it.
  const lines = wrapWords(cleanValue, width).map(line => line.padStart(width));
  return `${[...(cleanLabel ? [cleanLabel.slice(0, width)] : []), ...lines].join("\n")}\n`;
}

function wrapWords(text: string, width: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    if (line && line.length + 1 + word.length > width) {
      lines.push(line);
      line = "";
    }
    let rest = word;
    while (rest.length > width) {
      lines.push(rest.slice(0, width));
      rest = rest.slice(width);
    }
    line = line ? `${line} ${rest}` : rest;
  }
  if (line) lines.push(line);
  return lines;
}

// Format centered line
export function centerText(text: string, width = GOOJPRT_LINE_WIDTH): string {
  const clean = printableText(text).trim();
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

// Build one passenger's ESC/POS fare receipt using the saved web receipt settings.
export function buildGoojprtReceiptBytes(
  txns: Transaction[],
  options: ReceiptOptions = {}
): { bytes: Uint8Array; text: string } {
  const parts: Uint8Array[] = [CMD.INIT];
  let textBuffer = "";
  const settings = options.settings;
  const lineWidth = settings?.paperWidth === "80" ? 48 : GOOJPRT_LINE_WIDTH;

  const appendText = (str: string, isCenter = false, isBold = false) => {
    if (isCenter) parts.push(CMD.ALIGN_CENTER);
    else parts.push(CMD.ALIGN_LEFT);

    if (isBold) parts.push(CMD.BOLD_ON);
    parts.push(encodeText(str));
    if (isBold) parts.push(CMD.BOLD_OFF);

    textBuffer += str;
  };

  const appendCenteredWrapped = (value: string) => {
    let line = "";
    for (const word of value.trim().split(/\s+/)) {
      if (line && line.length + word.length + 1 > lineWidth) {
        appendText(centerText(line, lineWidth), true);
        line = "";
      }
      if (word.length > lineWidth) {
        for (let offset = 0; offset < word.length; offset += lineWidth) {
          if (line) { appendText(centerText(line, lineWidth), true); line = ""; }
          appendText(centerText(word.slice(offset, offset + lineWidth), lineWidth), true);
        }
      } else line = line ? `${line} ${word}` : word;
    }
    if (line) appendText(centerText(line, lineWidth), true);
  };

  const appendRow = (label: string, value: string, isBold = false) => {
    const rowStr = formatRow(label, value, lineWidth);
    if (isBold) parts.push(CMD.BOLD_ON);
    parts.push(CMD.ALIGN_LEFT);
    parts.push(encodeText(rowStr));
    if (isBold) parts.push(CMD.BOLD_OFF);
    textBuffer += rowStr;
  };

  const appendDivider = (char = "-") => {
    const line = dividerLine(char, lineWidth);
    parts.push(CMD.ALIGN_LEFT);
    parts.push(encodeText(line));
    textBuffer += line;
  };

  const firstTxn = txns[0];
  const shift = options.shift;

  const businessName = settings?.businessName || "E-CHATCO";
  const addressLine = settings?.addressLine || "";
  const footerNote = settings?.footerNote ?? "Thank you for riding with E-CHATCO!";

  // 1. HEADER
  if (businessName.length <= lineWidth / 2) {
    parts.push(CMD.ALIGN_CENTER, CMD.DOUBLE_SIZE_ON, CMD.BOLD_ON, encodeText(`${businessName}\n`), CMD.BOLD_OFF, CMD.DOUBLE_SIZE_OFF);
    textBuffer += centerText(businessName, lineWidth);
  } else appendCenteredWrapped(businessName);

  if (addressLine) {
    appendCenteredWrapped(addressLine);
  }
  appendText(centerText("FARE RECEIPT", lineWidth), true, true);
  appendDivider("-");

  // 2. META (Date, Unit, Crew)
  const timestamp = firstTxn?.timestamp ? new Date(firstTxn.timestamp) : new Date();
  const dateStr = timestamp.toLocaleString("en-PH", { timeZone: "Asia/Manila", month: "numeric", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true });
  if (settings?.showDateTime !== false) appendRow("Date", dateStr);

  if (settings?.showTransactionId !== false && firstTxn?.transactionId) appendRow("Ref", firstTxn.transactionId, true);
  if (settings?.showTransactionId !== false && firstTxn?.offlineTicketRef) appendRow("Offline ref", firstTxn.offlineTicketRef);
  if (firstTxn?.multiplePaymentReference) appendRow("Group ref", firstTxn.multiplePaymentReference);

  const unitNum = firstTxn?.unitNumber || shift?.unitNumber || "-";
  if (settings?.showUnit !== false) appendRow("Unit", unitNum, true);

  const conductorName = firstTxn?.conductorName || shift?.conductorName || "Conductor";
  if (settings?.showConductor !== false) appendRow("Conductor", conductorName);

  const driverName = firstTxn?.driverName || shift?.driverName;
  if (driverName) {
    appendRow("Driver", driverName);
  }

  const role = firstTxn?.passengerRole || "REGULAR";
  if (settings?.showPassenger !== false) {
    const groupPosition = firstTxn?.groupPosition ?? 0;
    // Like the web, a cash receipt never prints the name of whoever claimed it.
    const commuterName = groupPosition > 1 || firstTxn?.paymentMethod === "Cash"
      ? "Passenger"
      : firstTxn?.passengerName || firstTxn?.payerName || "Passenger";
    appendRow("Commuter", commuterName);
    appendRow("", role === "SENIOR_CITIZEN" ? "Senior Citizen" : role.charAt(0) + role.slice(1).toLowerCase());
    if (groupPosition > 1 && firstTxn?.payerName) appendRow("", `Paid by: ${firstTxn.payerName}`);
  }

  // 4. ROUTE INFO
  if (settings?.showRoute !== false && firstTxn?.from && firstTxn?.to) {
    appendDivider("-");
    appendRow("From", firstTxn.from);
    appendRow("To", firstTxn.to);
  }

  // Same fare lines as the web receipt, from the transaction's saved values.
  if (settings?.showFareBreakdown !== false) {
    appendDivider("-");
    const baseFare = firstTxn?.baseFare ?? firstTxn?.finalAmount ?? 0;
    const fareLines = (firstTxn?.passengerBreakdown ?? []).filter(line => line.quantity > 0);
    if (fareLines.length) {
      for (const line of fareLines) {
        const type = line.passengerType === "SENIOR" || line.passengerType === "SENIOR_CITIZEN"
          ? "Senior Citizen"
          : line.passengerType.charAt(0) + line.passengerType.slice(1).toLowerCase();
        appendRow(`${type} x ${line.quantity}`, `P${line.subtotal.toFixed(2)}`);
      }
    } else appendRow("Base fare", `P${baseFare.toFixed(2)}`);
    appendRow("Passengers", String(firstTxn?.totalPassengers ?? options.totalPassengers ?? 1));
    appendRow("Gross fare", `P${(firstTxn?.grossAmount ?? options.grossFare ?? baseFare).toFixed(2)}`);
    if (firstTxn?.discountAmount && firstTxn.discountAmount > 0) appendRow("Discount", `-P${firstTxn.discountAmount.toFixed(2)}`);
  }

  appendDivider("=");

  // 6. TOTAL AMOUNT (Enlarged / Bold)
  const totalAmount = firstTxn?.finalAmount ?? 0;
  parts.push(CMD.ALIGN_LEFT);
  parts.push(CMD.BOLD_ON);
  parts.push(CMD.DOUBLE_SIZE_ON);
  parts.push(encodeText(`TOTAL: P${totalAmount.toFixed(2)}\n`));
  parts.push(CMD.DOUBLE_SIZE_OFF);
  parts.push(CMD.BOLD_OFF);
  textBuffer += formatRow("TOTAL", `P${totalAmount.toFixed(2)}`, lineWidth);

  const paymentMethod = firstTxn?.paymentMethod || "Cash";
  appendRow("Paid via", paymentMethod, true);

  if (firstTxn?.voucherCode) {
    appendRow("Voucher:", firstTxn.voucherCode);
  }

  // 7. QR CODE / VERIFICATION
  const qrToken = firstTxn?.receiptQrToken;
  const showQr = settings?.showQrCode !== false;
  const showCode = settings?.showManualCode !== false;
  if (qrToken && (showQr || showCode)) {
    appendDivider("-");
    if (showQr) {
      parts.push(buildEscPosQrCode(qrToken));
    }
    if (showCode) {
      appendText(centerText("Receipt code", lineWidth), true);
      for (let offset = 0; offset < qrToken.length; offset += lineWidth) {
        appendText(centerText(qrToken.slice(offset, offset + lineWidth), lineWidth), true);
      }
    }
    appendCenteredWrapped(showQr && showCode ? "Scan or enter code in Rewards: +1 ride." : showQr ? "Scan in Rewards: +1 ride." : "Enter code in Rewards: +1 ride.");
  } else if (firstTxn?.offlinePending && (showQr || showCode)) {
    // The server issues the reward code, so an offline receipt can't carry one yet.
    appendDivider("-");
    appendCenteredWrapped("Offline ticket. Reward code is available on a reprint after it syncs.");
  }

  // 8. FOOTER & FEED
  appendDivider("-");
  if (footerNote) appendCenteredWrapped(footerNote);
  appendText(centerText("Visit E-CHATCO at chatco.online", lineWidth), true);
  parts.push(CMD.FEED_5); // Feed 5 lines past tear bar

  return {
    bytes: concatBytes(...parts),
    text: textBuffer,
  };
}

/** One print dispatch, with a complete receipt and tear gap for each passenger. */
export function buildGoojprtReceiptBatchBytes(txns: Transaction[], options: ReceiptOptions = {}): { bytes: Uint8Array; text: string } {
  const receipts = txns.map(transaction => buildGoojprtReceiptBytes([transaction], options));
  return { bytes: concatBytes(...receipts.map(receipt => receipt.bytes)), text: receipts.map(receipt => receipt.text).join("") };
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
