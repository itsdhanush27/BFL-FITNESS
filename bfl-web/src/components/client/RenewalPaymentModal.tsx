import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  Lock,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  Download,
  Calendar,
  ExternalLink,
  FileText
} from 'lucide-react';
import { CoachingPlan, TransactionRecord } from '../../types';
import { 
  createStripeCheckoutSession,
  executeDirectSubscriptionActivation,
  previewSubscriptionUpgrade
} from '../../services/stripeService';
import { calculatePlanPeriod } from '../../utils/planDurationUtils';
import { downloadReceiptPdf } from '../../services/receiptPdfService';

interface RenewalPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: CoachingPlan;
  clientName: string;
  clientEmail: string;
  clientId?: string;
  onPaymentSuccess: (paymentDetails?: { cardLast4?: string; amount?: number; transactionId?: string }) => Promise<void>;
  isUpgrade?: boolean;
}

export const RenewalPaymentModal: React.FC<RenewalPaymentModalProps> = ({
  isOpen,
  onClose,
  plan,
  clientName,
  clientEmail,
  clientId,
  onPaymentSuccess,
  isUpgrade = false,
}) => {
  const [cardholderName, setCardholderName] = useState(clientName || '');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [completedTransaction, setCompletedTransaction] = useState<TransactionRecord | null>(null);
  const [prorationPreview, setProrationPreview] = useState<{
    proratedAmount: number;
    unusedCredit: number;
  } | null>(null);

  const planPeriod = calculatePlanPeriod(plan);
  const formattedStart = planPeriod.formattedStart;
  const formattedEnd = planPeriod.formattedEnd;
  const durationDays = planPeriod.durationDays;

  // Fetch real-time Stripe proration preview if upgrading
  useEffect(() => {
    if (isOpen && isUpgrade && clientId) {
      previewSubscriptionUpgrade({
        clientId,
        currentPlanPrice: 0,
        newPlanPrice: plan.price,
        newPlanBillingCycle: planPeriod.billingCycle,
      })
        .then(res => {
          if (res) {
            setProrationPreview({
              proratedAmount: res.proratedAmount,
              unusedCredit: res.unusedCredit
            });
          }
        })
        .catch((err) => {
          console.log('[RenewalPaymentModal] Proration preview unavailable:', err.message);
        });
    }
  }, [isOpen, isUpgrade, clientId, plan.id, plan.price, planPeriod.billingCycle]);

  if (!isOpen) return null;

  /**
   * Official Hosted Stripe Checkout flow (PCI-DSS compliant)
   */
  const handleStripeHostedCheckout = async () => {
    setPaymentError(null);
    setIsProcessing(true);
    try {
      const activeClientId = clientId || (window as any)?.auth?.currentUser?.uid || 'athlete_user';
      const { url } = await createStripeCheckoutSession({
        clientId: activeClientId,
        clientName: cardholderName || clientName,
        clientEmail: clientEmail || 'athlete@bflfitness.com',
        plan,
      });
      window.location.href = url;
    } catch (err: any) {
      console.error('[RenewalPaymentModal] Hosted checkout error:', err);
      setPaymentError(err?.message || 'Could not launch secure checkout. Please try again.');
      setIsProcessing(false);
    }
  };

  /**
   * Direct card payment & immediate plan-specific activation
   */
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError(null);

    const rawCardNumber = cardNumber.replace(/\D/g, '');
    const cardLast4 = rawCardNumber.slice(-4) || '4242';

    setIsProcessing(true);

    try {
      const activeClientId = clientId || (window as any)?.auth?.currentUser?.uid || 'athlete_user';

      const txRecord = await executeDirectSubscriptionActivation({
        clientId: activeClientId,
        clientName: cardholderName || clientName,
        clientEmail: clientEmail || 'athlete@bflfitness.com',
        plan,
        cardLast4,
        cardBrand: 'Visa',
        customDurationDays: durationDays,
      });

      setCompletedTransaction(txRecord);

      await onPaymentSuccess({
        cardLast4,
        amount: prorationPreview ? prorationPreview.proratedAmount : plan.price,
        transactionId: txRecord.id,
      });

      setPaymentSuccess(true);
    } catch (err: any) {
      console.error('[RenewalPaymentModal] Error:', err);
      setPaymentError(err?.message || 'Payment processing failed. Please verify card details.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      setCardNumber('');
      setExpiry('');
      setCvc('');
      setPaymentSuccess(false);
      setPaymentError(null);
      setCompletedTransaction(null);
      onClose();
    }
  };

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 16);
    return cleaned.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 4);
    if (cleaned.length > 2) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2);
    }
    return cleaned;
  };

  const handleDownloadReceipt = () => {
    if (completedTransaction) {
      downloadReceiptPdf(completedTransaction, clientName, clientEmail, completedTransaction.billingPeriodEnd);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-neutral-900/75 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-3xl bg-white border border-neutral-200 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={handleClose}
          disabled={isProcessing}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 cursor-pointer transition-colors z-30 disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable Modal Content */}
        <div className="overflow-y-auto flex-1">
          {paymentSuccess ? (
            /* ─── Payment Success State ─── */
            <div className="text-center py-10 px-6 sm:px-8 space-y-5">
              <div className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-500 text-emerald-600 flex items-center justify-center mx-auto shadow-lg shadow-emerald-100">
                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              </div>
              <div className="space-y-1.5">
                <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                  Payment Confirmed
                </span>
                <h3 className="text-2xl font-black text-neutral-900 uppercase font-display tracking-tight">
                  1-Month Plan Activated!
                </h3>
                <p className="text-xs text-neutral-600 max-w-sm mx-auto">
                  Your payment of <strong className="text-neutral-900 font-mono">${plan.price} AUD</strong> for{' '}
                  <strong className="text-neutral-900">{plan.name}</strong> has been processed successfully.
                </p>
              </div>

              {/* 1-Month Activation Dates Box */}
              <div className="p-4 bg-gradient-to-r from-red-50 to-neutral-50 rounded-2xl border border-red-200 text-left space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-red-700 uppercase tracking-wider">
                  <Calendar className="w-4 h-4 text-red-600 shrink-0" />
                  <span>1-Month Coaching Period Activated</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-neutral-200">
                    <span className="text-[10px] text-neutral-400 block font-semibold uppercase">Activation Date</span>
                    <span className="font-bold text-neutral-900 font-mono">{formattedStart}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-neutral-200">
                    <span className="text-[10px] text-neutral-400 block font-semibold uppercase">Expiration Date</span>
                    <span className="font-bold text-red-600 font-mono">{formattedEnd}</span>
                  </div>
                </div>
                <div className="text-[11px] text-neutral-500 flex items-center justify-between pt-1">
                  <span>Duration: <strong>{durationDays} Days ({planPeriod.billingCycle === 'hourly' ? `${planPeriod.sessionCredits} Session Credit(s)` : planPeriod.billingCycle.toUpperCase()})</strong></span>
                  <span>Invoice: <strong className="font-mono">{completedTransaction?.invoiceNumber}</strong></span>
                </div>
              </div>

              {/* Action Buttons: PDF Receipt & Finish */}
              <div className="space-y-2.5 pt-2">
                <button
                  onClick={handleDownloadReceipt}
                  className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider cursor-pointer shadow-md shadow-red-200 transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Official PDF Receipt & Invoice</span>
                </button>

                <button
                  onClick={handleClose}
                  className="w-full py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider cursor-pointer transition-colors shadow-xs"
                >
                  Done • Access Coaching Portal
                </button>
              </div>
            </div>
          ) : (
            /* ─── Payment Form ─── */
            <div>
              {/* Header */}
              <div className="bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-950 p-6 sm:p-7 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 space-y-2.5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600/20 border border-red-500/40 text-red-300 text-[10px] font-bold uppercase tracking-wider">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Secure Payment Gateway</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black uppercase font-display tracking-tight">
                    {isUpgrade ? `Upgrade to ${plan.name}` : `Activate ${plan.name}`}
                  </h3>
                  <p className="text-neutral-400 text-xs">
                    Secure checkout. Your {planPeriod.billingCycle} coaching access activates immediately upon payment.
                  </p>
                </div>
              </div>

              {/* Plan Summary Card */}
              <div className="mx-6 -mt-3 relative z-20">
                <div className="bg-white border-2 border-red-200 rounded-2xl p-4 shadow-lg shadow-red-100/30 flex items-center justify-between gap-4">
                  <div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      plan.category === 'boxing' ? 'bg-amber-100 text-amber-800' :
                      plan.category === 'powerlifting' ? 'bg-purple-100 text-purple-800' :
                      plan.category === 'face_to_face' ? 'bg-blue-100 text-blue-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {plan.category ? plan.category.replace(/_/g, ' ') : 'Coaching'}
                    </span>
                    <p className="text-sm font-black text-neutral-900 uppercase font-display mt-1">{plan.name}</p>
                    <p className="text-[11px] text-neutral-500 line-clamp-1">{plan.tagline}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-2xl font-black text-neutral-900 font-mono">${plan.price}</span>
                    <span className="text-xs text-neutral-500 block">AUD {plan.period || (planPeriod.billingCycle === 'weekly' ? '/ week' : planPeriod.billingCycle === 'hourly' ? '/ session' : '/ month')}</span>
                  </div>
                </div>
              </div>

              {/* Plan Activation Banner */}
              <div className="mx-6 mt-3 p-3 bg-red-50/80 rounded-xl border border-red-200 flex items-center justify-between text-xs text-neutral-700">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-red-600 shrink-0" />
                  <div>
                    <span className="font-bold text-neutral-900 block text-[11px]">
                      {planPeriod.billingCycle.toUpperCase()} Billing Cycle
                    </span>
                    <span className="text-[10px] text-neutral-600">
                      Starts: <strong>{formattedStart}</strong> • Expires: <strong className="text-red-700">{formattedEnd}</strong>
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 text-[10px] font-bold">
                  {planPeriod.billingCycle === 'hourly' ? `${planPeriod.sessionCredits} Session Credit(s)` : `${durationDays} Days`}
                </span>
              </div>

              {/* Proration Preview Banner for Upgrades */}
              {isUpgrade && prorationPreview && (
                <div className="mx-6 mt-3 p-3 bg-emerald-50 rounded-xl border border-emerald-300 flex items-center justify-between text-xs text-emerald-900">
                  <div className="space-y-0.5">
                    <span className="font-bold block text-[11px]">Stripe Proration Applied</span>
                    <span className="text-[10px] text-emerald-800">
                      Unused credit: -${prorationPreview.unusedCredit.toFixed(2)} AUD • Immediate charge:
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-emerald-600 text-white font-mono font-bold text-xs">
                    ${prorationPreview.proratedAmount.toFixed(2)} AUD
                  </span>
                </div>
              )}

              {/* Primary: Hosted Checkout Option */}
              <div className="mx-6 mt-4 p-4 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                    Recommended Checkout
                  </span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                    PCI-DSS Compliant
                  </span>
                </div>
                <p className="text-xs text-neutral-600">
                  Pay securely with Apple Pay, Google Pay, or Card via encrypted checkout.
                </p>
                <button
                  type="button"
                  onClick={handleStripeHostedCheckout}
                  disabled={isProcessing}
                  className="w-full py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-black text-xs uppercase tracking-wider cursor-pointer shadow-md transition-colors flex items-center justify-center gap-2 group"
                >
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span>Proceed to Secure Checkout (${prorationPreview ? prorationPreview.proratedAmount.toFixed(2) : plan.price} AUD)</span>
                  <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>

              <div className="relative mx-6 my-4 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-neutral-200" />
                </div>
                <span className="relative bg-white px-3 text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                  Or Pay with Card Below
                </span>
              </div>

              {/* Payment Form */}
              <form onSubmit={handleSubmitPayment} className="p-6 sm:p-7 pt-1 space-y-4">
                {/* Client / Cardholder Info */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                      Cardholder Name
                    </label>
                    <input
                      type="text"
                      value={cardholderName}
                      onChange={(e) => setCardholderName(e.target.value)}
                      placeholder="Athlete Name"
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-neutral-300 text-neutral-900 text-xs font-medium focus:border-red-500 focus:ring-2 focus:ring-red-500/10 focus:outline-none placeholder:text-neutral-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                      Billing Email
                    </label>
                    <div className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-700 text-xs font-medium truncate">
                      {clientEmail}
                    </div>
                  </div>
                </div>

                {/* Card Number */}
                <div>
                  <label className="block text-[10px] font-bold text-neutral-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span>Card Information</span>
                    <span className="text-neutral-500 font-normal flex items-center gap-1">
                      <Lock className="w-3 h-3 text-red-600" /> 256-Bit TLS Encrypted
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      placeholder="4242 •••• •••• 4242"
                      maxLength={19}
                      className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-white border border-neutral-300 text-neutral-900 text-sm font-mono focus:border-red-500 focus:ring-2 focus:ring-red-500/10 focus:outline-none placeholder:text-neutral-400 transition-all"
                    />
                    <CreditCard className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                {/* Expiry / CVC */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                      Expiry Date
                    </label>
                    <input
                      type="text"
                      value={expiry}
                      onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                      placeholder="MM/YY"
                      maxLength={5}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-neutral-300 text-neutral-900 text-sm font-mono focus:border-red-500 focus:ring-2 focus:ring-red-500/10 focus:outline-none placeholder:text-neutral-400 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                      CVC / CVV
                    </label>
                    <input
                      type="text"
                      value={cvc}
                      onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="123"
                      maxLength={4}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-neutral-300 text-neutral-900 text-sm font-mono focus:border-red-500 focus:ring-2 focus:ring-red-500/10 focus:outline-none placeholder:text-neutral-400 transition-all"
                    />
                  </div>
                </div>

                {/* Payment Error */}
                {paymentError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                    <span>{paymentError}</span>
                  </div>
                )}

                {/* Submit Payment Button */}
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-neutral-400 text-white font-extrabold text-sm uppercase tracking-wider shadow-lg shadow-red-200 cursor-pointer flex items-center justify-center gap-2 transition-all disabled:opacity-70 border border-red-500/40 group"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Processing Payment & Activating...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Pay ${plan.price} AUD & Activate 1 Month</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>

                {/* Security Footer */}
                <div className="flex items-center justify-between text-[10px] text-neutral-500 pt-1">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Secure Encrypted Gateway
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3 text-neutral-400" />
                    Instant PDF Tax Receipt Generated
                  </span>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
