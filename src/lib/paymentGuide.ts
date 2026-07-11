import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const PAYMENT_GUIDE_STORAGE_KEY = "duelacred_payment_guide_content";

export const getDefaultPaymentGuideContent = () => [
  "Duela Cred Manual Payment Guide",
  "",
  "Please use one of the payment methods below to fund your wallet.",
  "",
  "Bank Transfer",
  "Bank: First National Bank Botswana",
  "Account Name: Duela Cred (Pty) Ltd",
  "Account Number: 62812345678",
  "Reference: Your full name",
  "",
  "Orange Money",
  "Phone: +267 71 000 000",
  "Reference: Your full name",
  "",
  "MyZaka",
  "Phone: +267 72 000 000",
  "Reference: Your full name",
  "",
  "Upload proof of payment and the amount transferred for verification.",
].join("\n");

export const buildPaymentGuideLines = (content?: string) => {
  const rawContent = content?.trim() ? content : getDefaultPaymentGuideContent();
  return rawContent.split(/\r?\n/);
};

export const getStoredPaymentGuideContent = () => {
  if (typeof window === "undefined") {
    return getDefaultPaymentGuideContent();
  }

  const saved = window.localStorage.getItem(PAYMENT_GUIDE_STORAGE_KEY);
  return saved && saved.trim() ? saved : getDefaultPaymentGuideContent();
};

export const savePaymentGuideContent = (content: string) => {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedContent = content && content.trim() ? content : getDefaultPaymentGuideContent();
  window.localStorage.setItem(PAYMENT_GUIDE_STORAGE_KEY, normalizedContent);
};

export const generatePaymentGuideBlob = async (name: string, content?: string) => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const lines = buildPaymentGuideLines(content).map((line) => line.replace(/\{name\}/g, name || "Your full name"));

  page.drawText(lines[0] || "Duela Cred Manual Payment Guide", {
    x: 50,
    y: 740,
    size: 20,
    font,
    color: rgb(0.12, 0.2, 0.31),
  });

  lines.slice(1).forEach((line, index) => {
    page.drawText(line, {
      x: 50,
      y: 700 - index * 20,
      size: 12,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
  });

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: "application/pdf" });
};
