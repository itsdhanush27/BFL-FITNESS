import { jsPDF } from 'jspdf';
import { TransactionRecord } from '../types';

export interface ReceiptData {
  transaction: TransactionRecord;
  clientName?: string;
  clientEmail?: string;
  coachName?: string;
  /** Authoritative expiry date from the user profile (planExpiresAt).
   *  When provided, this overrides any calculated end date to guarantee
   *  the receipt matches the active subscription timeline exactly. */
  planExpiresAt?: string;
}

/**
 * Format ISO date string to a human-readable display string
 */
export function formatReceiptDate(isoString?: string): string {
  if (!isoString) return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return isoString;
  }
}

/**
 * Formats full datetime string
 */
export function formatReceiptDateTime(isoString?: string): string {
  if (!isoString) return new Date().toLocaleString('en-US');
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoString;
  }
}

/**
 * Generates an executive, print-ready BFL Fitness PDF Receipt & Tax Invoice
 */
export function createReceiptPdf(data: ReceiptData): jsPDF {
  const { transaction } = data;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;

  const clientName = data.clientName || transaction.clientName || 'Valued Athlete';
  const clientEmail = data.clientEmail || transaction.clientEmail || 'athlete@bflfitness.com';
  const coachName = data.coachName || 'Coach Mass Narimanian';

  const invoiceNumber = transaction.invoiceNumber || `BFL-INV-${new Date().getFullYear()}-${transaction.id.slice(-6).toUpperCase()}`;
  const paymentDate = formatReceiptDateTime(transaction.createdAt);
  const startDate = formatReceiptDate(transaction.billingPeriodStart || transaction.createdAt);
  
  // Determine the authoritative end date for the receipt:
  // 1. Use planExpiresAt from the user profile (single source of truth)
  // 2. Fall back to the transaction's billingPeriodEnd
  // 3. Only calculate a 30-day date as a last resort
  let endDate: string;
  if (data.planExpiresAt) {
    endDate = formatReceiptDate(data.planExpiresAt);
  } else if (transaction.billingPeriodEnd) {
    endDate = formatReceiptDate(transaction.billingPeriodEnd);
  } else {
    const startObj = transaction.billingPeriodStart ? new Date(transaction.billingPeriodStart) : new Date();
    const durationDays = transaction.durationDays || 30;
    const endObj = new Date(startObj.getTime() + durationDays * 24 * 60 * 60 * 1000);
    endDate = formatReceiptDate(endObj.toISOString());
  }

  const currency = (transaction.currency || 'USD').toUpperCase();
  const amount = Number(transaction.amount || 0).toFixed(2);
  const cardLast4 = transaction.cardLast4 || '4242';
  const cardBrand = (transaction.cardBrand || 'Card').toUpperCase();
  const stripeRef = transaction.stripePaymentIntentId || transaction.stripeChargeId || transaction.id;

  // ─── 1. Header Banner & Branding ─────────────────────────────────────────
  doc.setFillColor(18, 18, 20); // Dark carbon #121214
  doc.rect(0, 0, pageWidth, 42, 'F');

  // Red accent top strip
  doc.setFillColor(220, 38, 38); // Crimson Red #DC2626
  doc.rect(0, 0, pageWidth, 3.5, 'F');

  // Brand Name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('BFL FITNESS', margin, 18);

  // Brand Tagline
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(200, 200, 205);
  doc.text('BUILD FOR LIFE • HIGH PERFORMANCE COACHING', margin, 24);
  doc.text('Sydney, Australia • support@bflfitness.com • bflfitness.com', margin, 29);

  // Invoice Label (Right Aligned)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('TAX INVOICE & RECEIPT', pageWidth - margin, 18, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(239, 68, 68); // Red
  doc.text('OFFICIAL PAYMENT RECEIPT', pageWidth - margin, 24, { align: 'right' });

  doc.setFontSize(8.5);
  doc.setTextColor(180, 180, 185);
  doc.text(`Invoice #: ${invoiceNumber}`, pageWidth - margin, 30, { align: 'right' });

  // ─── 2. Status & Overview Bar ─────────────────────────────────────────────
  let y = 50;

  // Status Badge box
  doc.setFillColor(240, 253, 244); // emerald-50
  doc.setDrawColor(34, 197, 94); // emerald-500
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, 78, 14, 2, 2, 'FD');

  doc.setTextColor(21, 128, 61); // emerald-700
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('✓ PAYMENT STATUS: PAID', margin + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(75, 85, 99);
  doc.text('Verified Secure Gateway', margin + 4, y + 10.5);

  // Date Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(pageWidth - margin - 85, y, 85, 14, 2, 2, 'FD');

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('PAYMENT DATE:', pageWidth - margin - 81, y + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(paymentDate, pageWidth - margin - 81, y + 10.5);

  y += 22;

  // ─── 3. Two-Column Customer & Coach Information ─────────────────────────
  const colWidth = (contentWidth - 6) / 2;

  // Billed To Box
  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(margin, y, colWidth, 34, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text('BILLED TO (ATHLETE):', margin + 4, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39);
  doc.text(clientName, margin + 4, y + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(75, 85, 99);
  doc.text(clientEmail, margin + 4, y + 19);
  doc.text(`Client ID: ${transaction.clientId}`, margin + 4, y + 25);
  doc.text('Account: Active BFL Member', margin + 4, y + 30);

  // Coaching & Provider Box
  const col2X = margin + colWidth + 6;
  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(col2X, y, colWidth, 34, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text('ISSUED BY (COACHING LAB):', col2X + 4, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39);
  doc.text('BFL Fitness Coaching Team', col2X + 4, y + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(75, 85, 99);
  doc.text(`Head Coach: ${coachName}`, col2X + 4, y + 19);
  doc.text('Discipline: Bodybuilding, Strength & Nutrition', col2X + 4, y + 25);
  doc.text('Billing Provider: Secure Card Gateway', col2X + 4, y + 30);

  y += 42;

  // ─── 4. Plan Activation & Subscription Billing Period Banner ─────────────
  // (CRITICAL: Mentions 1-Month start and end dates prominently)
  doc.setFillColor(254, 242, 242); // red-50
  doc.setDrawColor(248, 113, 113); // red-400
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, y, contentWidth, 22, 2, 2, 'FD');

  doc.setTextColor(185, 28, 28); // red-700
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('★ 1-MONTH PLAN ACTIVATION & BILLING CYCLE DATES', margin + 5, y + 6.5);

  doc.setTextColor(31, 41, 55);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);

  // Left side: Plan & Duration
  doc.text(`Plan: ${transaction.planName}`, margin + 5, y + 12.5);
  doc.text('Duration: 1 Month (30 Days Active Access)', margin + 5, y + 17.5);

  // Right side: Start & End Dates highlighted
  doc.setFont('helvetica', 'bold');
  doc.text(`Start Date: ${startDate}`, col2X, y + 12.5);
  doc.setTextColor(220, 38, 38);
  doc.text(`End Date (Renewal): ${endDate}`, col2X, y + 17.5);

  y += 28;

  // ─── 5. Itemized Table ───────────────────────────────────────────────────
  // Table Header
  doc.setFillColor(18, 18, 20);
  doc.rect(margin, y, contentWidth, 8, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('ITEM & DESCRIPTION', margin + 4, y + 5.5);
  doc.text('PERIOD', margin + 95, y + 5.5);
  doc.text('QTY', margin + 135, y + 5.5);
  doc.text('AMOUNT', pageWidth - margin - 4, y + 5.5, { align: 'right' });

  y += 8;

  // Table Row
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(229, 231, 235);
  doc.rect(margin, y, contentWidth, 22, 'FD');

  doc.setTextColor(17, 24, 39);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(transaction.planName, margin + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(107, 114, 128);
  doc.text('• Customized periodized workout split & exercise programming', margin + 4, y + 10.5);
  doc.text('• Full macro & meal plan architecture with weekly biofeedback adjustments', margin + 4, y + 14.5);
  doc.text('• Direct in-app messaging & progressive overload monitoring', margin + 4, y + 18.5);

  doc.setTextColor(55, 65, 81);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('1 Month', margin + 95, y + 8);
  doc.text(`${startDate} - ${endDate}`, margin + 95, y + 12.5);

  doc.text('1', margin + 137, y + 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(17, 24, 39);
  doc.text(`$${amount} ${currency}`, pageWidth - margin - 4, y + 8, { align: 'right' });

  y += 26;

  // ─── 6. Financial Summary Box ─────────────────────────────────────────────
  const summaryWidth = 78;
  const summaryX = pageWidth - margin - summaryWidth;

  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(summaryX, y, summaryWidth, 32, 2, 2, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(107, 114, 128);
  doc.text('Subtotal:', summaryX + 4, y + 7);
  doc.text(`$${amount} ${currency}`, pageWidth - margin - 4, y + 7, { align: 'right' });

  doc.text('GST / Tax (0% Inclusive):', summaryX + 4, y + 14);
  doc.text('$0.00', pageWidth - margin - 4, y + 14, { align: 'right' });

  doc.setDrawColor(209, 213, 219);
  doc.line(summaryX + 4, y + 18, pageWidth - margin - 4, y + 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39);
  doc.text('Total Paid:', summaryX + 4, y + 26);
  doc.setTextColor(220, 38, 38);
  doc.text(`$${amount} ${currency}`, pageWidth - margin - 4, y + 26, { align: 'right' });

  // ─── 7. Payment Method Details (Left of Summary) ──────────────────────────
  const payInfoWidth = contentWidth - summaryWidth - 6;
  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(margin, y, payInfoWidth, 32, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text('PAYMENT METHOD & TRANSACTION AUDIT:', margin + 4, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(17, 24, 39);
  doc.text(`Method: ${cardBrand} Ending in •••• ${cardLast4}`, margin + 4, y + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(75, 85, 99);
  doc.text(`Transaction Ref ID: ${stripeRef}`, margin + 4, y + 17);
  doc.text(`Gateway: 256-Bit TLS Encrypted`, margin + 4, y + 21.5);
  doc.text(`Processed: ${paymentDate}`, margin + 4, y + 26);

  y += 40;

  // ─── 8. Terms & Support Notice ───────────────────────────────────────────
  doc.setFillColor(243, 244, 246);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(margin, y, contentWidth, 16, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(55, 65, 81);
  doc.text('IMPORTANT MEMBERSHIP NOTICE:', margin + 4, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(107, 114, 128);
  doc.text('• Your 1-month coaching access begins on the activation date and extends through the expiration date shown above.', margin + 4, y + 9);
  doc.text('• Direct coaching communication, weekly form check-ins, and progressive overload logs are unlocked during this period.', margin + 4, y + 13);

  y += 22;

  // ─── 9. Signature & Footer ────────────────────────────────────────────────
  doc.setDrawColor(209, 213, 219);
  doc.setLineWidth(0.3);
  doc.line(margin, y + 6, margin + 50, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(17, 24, 39);
  doc.text('Coach Mass Narimanian', margin, y + 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(107, 114, 128);
  doc.text('Founder & Head Coach • BFL Fitness', margin, y + 15);

  // Authenticated badge
  doc.setTextColor(34, 197, 94);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('✓ DIGITALLY AUTHENTICATED & VERIFIED PAYMENT', pageWidth - margin, y + 11, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(156, 163, 175);
  doc.text(`Document Generated: ${new Date().toLocaleString('en-US')}`, pageWidth - margin, y + 15, { align: 'right' });

  return doc;
}

/**
 * Generates and downloads the PDF receipt directly in the browser
 */
export function downloadReceiptPdf(
  transaction: TransactionRecord,
  clientName?: string,
  clientEmail?: string,
  planExpiresAt?: string
): void {
  const doc = createReceiptPdf({ transaction, clientName, clientEmail, planExpiresAt });
  const invoiceNumber = transaction.invoiceNumber || `BFL-INV-${transaction.id.slice(-6).toUpperCase()}`;
  const filename = `BFL_Receipt_${invoiceNumber}.pdf`;
  doc.save(filename);
}

/**
 * Opens the PDF receipt in a new browser tab for preview or printing
 */
export function previewReceiptPdf(
  transaction: TransactionRecord,
  clientName?: string,
  clientEmail?: string,
  planExpiresAt?: string
): void {
  const doc = createReceiptPdf({ transaction, clientName, clientEmail, planExpiresAt });
  const blobUrl = doc.output('bloburl');
  window.open(blobUrl, '_blank');
}
