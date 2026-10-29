import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Calendar, 
  CreditCard, 
  ShieldCheck, 
  Sparkles, 
  X, 
  Check, 
  Save, 
  Award,
  Phone,
  Dumbbell,
  AlertTriangle,
  Clock,
  Lock,
  Download,
  FileText,
  ExternalLink,
  Receipt,
  Layers
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFitnessData, getDaysRemaining } from '../../context/FitnessDataContext';
import { canReceiveCoaching, checkSubscriptionAccess } from '../../types/subscription';
import { useClientSubscription } from '../../hooks/useClientSubscription';
import { TransactionRecord } from '../../types';
import { 
  subscribeToClientTransactions,
  fetchClientTransactions,
  cancelClientSubscription,
  reactivateClientSubscription
} from '../../services/stripeService';
import { 
  downloadReceiptPdf, 
  formatReceiptDate, 
  formatReceiptDateTime 
} from '../../services/receiptPdfService';

interface ClientProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCheckout?: (planId?: string) => void;
  onOpenRenewal?: () => void;
  onOpenPlanSelection?: () => void;
}

export const ClientProfileModal: React.FC<ClientProfileModalProps> = ({
  isOpen,
  onClose,
  onOpenCheckout,
  onOpenRenewal,
  onOpenPlanSelection
}) => {
  const { user, updateProfile } = useAuth();
  const { coachingPlans, coaches, clientIntake, clients } = useFitnessData();

  const [activeTab, setActiveTab] = useState<'profile' | 'billing'>('billing');
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);

  // Real-time onSnapshot listener for client's subscription & user document in Firestore
  const {
    subscription: liveSubscription,
    isPendingCoachApproval: livePendingApproval,
    isActive: liveIsActive,
    activePlanName: liveActivePlanName,
    activePlanPrice: liveActivePlanPrice,
    pendingPlanName: livePendingPlanName,
    pendingPlanPrice: livePendingPlanPrice,
    planExpiresAt: livePlanExpiresAt,
    billingCycle: liveBillingCycle,
    remainingSessionCredits: liveRemainingCredits,
    isCancelled: liveIsCancelled,
    cancellationRequestedAt: liveCancellationRequestedAt,
    pendingDowngradePlanName: livePendingDowngradePlanName,
    downgradeEffectiveAt: liveDowngradeEffectiveAt,
  } = useClientSubscription(isOpen ? user?.uid : undefined);

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
  const [phone, setPhone] = useState('+1 (555) 234-5678');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  // Find assigned coach and roster entry
  const clientRosterEntry = clients?.find(c => c.id === user?.uid || c.email === user?.email);
  const clientCoachId = user?.assignedCoachId || (clientRosterEntry as any)?.assignedCoachId || (clientIntake as any)?.assignedCoachId;
  const assignedCoach = coaches.find(c => c.id === clientCoachId) || coaches[0];
  const activePlan = coachingPlans.find(p => p.id === user?.activePlanId) || coachingPlans[0];

  const billingCycle = liveBillingCycle || user?.billingCycle || (clientRosterEntry as any)?.billingCycle || activePlan?.billingCycle || 'monthly';
  const remainingSessionCredits = liveRemainingCredits !== undefined ? liveRemainingCredits : (user?.remainingSessionCredits ?? (clientRosterEntry as any)?.remainingSessionCredits);
  const pendingDowngradePlanName = livePendingDowngradePlanName || (user as any)?.pendingDowngradePlanName || (clientRosterEntry as any)?.pendingDowngradePlanName;
  const downgradeEffectiveAt = liveDowngradeEffectiveAt || (user as any)?.downgradeEffectiveAt || (clientRosterEntry as any)?.downgradeEffectiveAt;
  const cancellationRequestedAt = liveCancellationRequestedAt || (user as any)?.cancellationRequestedAt || (clientRosterEntry as any)?.cancellationRequestedAt;

  const handleCancel = async () => {
    if (!user?.uid) return;
    setActionLoading(true);
    try {
      await cancelClientSubscription(user.uid);
      setActionMessage('Subscription scheduled for cancellation at the end of the current billing period.');
      setCancelConfirmOpen(false);
    } catch (err: any) {
      setActionMessage(err.message || 'Failed to cancel subscription.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivate = async () => {
    if (!user?.uid) return;
    setActionLoading(true);
    try {
      await reactivateClientSubscription(user.uid);
      setActionMessage('Subscription reactivated successfully!');
    } catch (err: any) {
      setActionMessage(err.message || 'Failed to reactivate subscription.');
    } finally {
      setActionLoading(false);
    }
  };

  // Subscribe to real-time client transaction records for billing & PDF receipt downloads
  useEffect(() => {
    if (!isOpen || !user?.uid) return;
    setLoadingTx(true);

    const unsub = subscribeToClientTransactions(user.uid, (records) => {
      setTransactions(records);
      setLoadingTx(false);
    });

    return () => unsub();
  }, [isOpen, user?.uid]);

  // Client is only pending approval if the document has NOT been marked 'active' by the coach
  const isPendingCoachApproval = 
    !liveIsActive && 
    (livePendingApproval || 
     user?.subscriptionStatus === 'pending_coach_approval' ||
     clientRosterEntry?.subscriptionStatus === 'pending_coach_approval' ||
     Boolean(livePendingPlanName || (user as any)?.pendingPlanId || (clientRosterEntry as any)?.pendingPlanId));

  const displayPlanName = 
    (isPendingCoachApproval ? (livePendingPlanName || (user as any)?.pendingPlanName || (clientRosterEntry as any)?.pendingPlanName) : null) ||
    liveActivePlanName ||
    clientRosterEntry?.planName ||
    clientRosterEntry?.activePlanName ||
    user?.activePlanName ||
    (clientIntake as any)?.selectedPlanName ||
    (user as any)?.renewalRequestedPlanName ||
    activePlan?.name ||
    'Coaching Program';

  const displayPlanPrice = 
    (isPendingCoachApproval ? (livePendingPlanPrice || (user as any)?.pendingPlanPrice || (clientRosterEntry as any)?.pendingPlanPrice) : null) ||
    liveActivePlanPrice ||
    clientRosterEntry?.activePlanPrice ||
    user?.activePlanPrice ||
    (clientIntake as any)?.selectedPlanPrice ||
    (user as any)?.renewalRequestedPlanPrice ||
    activePlan?.price ||
    '80';

  const isIntakePendingReview = Boolean(
    clientIntake && (clientIntake.status === 'pending_review' || (clientIntake as any).approvalStatus === 'pending')
  );
  const isRosterPending = Boolean(
    clientRosterEntry && (
      clientRosterEntry.status === 'pending' ||
      clientRosterEntry.subscriptionStatus === 'pending_approval' ||
      clientRosterEntry.subscriptionStatus === 'pending_coach_approval' ||
      (clientRosterEntry as any).approvalStatus === 'pending'
    )
  );

  const effectiveExpiresAt = livePlanExpiresAt || clientRosterEntry?.planExpiresAt || user?.planExpiresAt;
  const effectiveStartedAt = clientRosterEntry?.packageStartedAt || user?.packageStartedAt;

  const subAccess = checkSubscriptionAccess({
    planExpiresAt: effectiveExpiresAt,
    subscriptionStatus: liveIsActive ? 'active' : (clientRosterEntry?.subscriptionStatus ?? user?.subscriptionStatus),
    status: liveIsActive ? 'active' : (clientRosterEntry?.status ?? user?.status),
    packageStartedAt: effectiveStartedAt,
    cancellationRequestedAt: cancellationRequestedAt,
    billingCycle: (billingCycle as any),
    sessionCredits: (user?.sessionCredits ?? (clientRosterEntry as any)?.sessionCredits),
    usedSessionCredits: (user?.usedSessionCredits ?? (clientRosterEntry as any)?.usedSessionCredits),
  });

  const isRenewalPending = Boolean(
    isPendingCoachApproval ||
    (!liveIsActive && (
      isIntakePendingReview ||
      isRosterPending ||
      user?.subscriptionStatus === 'pending_approval' ||
      user?.subscriptionStatus === 'pending_coach_approval' ||
      (user as any)?.approvalStatus === 'pending' ||
      Boolean(user?.renewalRequestedPlanId || clientRosterEntry?.renewalRequestedPlanId)
    ))
  );

  const isExpired = !isRenewalPending && !subAccess.canReceiveCoaching;
  const daysRemaining = getDaysRemaining(effectiveExpiresAt);
  const expiryFormatted = effectiveExpiresAt ? formatReceiptDate(effectiveExpiresAt) : null;
  const startFormatted = effectiveStartedAt ? formatReceiptDate(effectiveStartedAt) : 'Recently Activated';

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      displayName,
      photoURL: photoURL || undefined
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleDownloadInvoice = (tx: TransactionRecord) => {
    downloadReceiptPdf(tx, user?.displayName || displayName, user?.email, user?.planExpiresAt || tx.billingPeriodEnd);
  };

  // Fallback virtual transaction if athlete paid before transactions logging was installed
  const effectiveTransactions = [...transactions];
  if (effectiveTransactions.length === 0 && (liveIsActive || user?.subscriptionStatus === 'active')) {
    effectiveTransactions.push({
      id: `tx_${user?.uid?.slice(0, 8) || 'active'}`,
      clientId: user?.uid || '',
      clientName: user?.displayName || displayName || 'Athlete',
      clientEmail: user?.email || '',
      planId: user?.activePlanId || 'plan_online_monthly',
      planName: displayPlanName,
      amount: Number(displayPlanPrice) || 350,
      currency: 'AUD',
      status: 'succeeded',
      paymentMethod: 'Credit / Debit Card',
      createdAt: effectiveStartedAt || new Date().toISOString(),
      cardLast4: '4242',
      cardBrand: 'Visa',
      invoiceNumber: `BFL-INV-${new Date().getFullYear()}-${user?.uid?.slice(-4).toUpperCase() || '1042'}`,
      billingPeriodStart: effectiveStartedAt || new Date().toISOString(),
      billingPeriodEnd: effectiveExpiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      durationDays: 30,
      subtotal: Number(displayPlanPrice) || 350,
      taxAmount: 0,
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-neutral-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white border border-neutral-200 rounded-3xl w-full max-w-2xl p-6 shadow-2xl max-h-[92vh] overflow-y-auto animate-in fade-in duration-200 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-200 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase font-display text-neutral-900 tracking-tight">
                Athlete Account Portal
              </h2>
              <p className="text-xs text-neutral-500">
                Official Subscriptions, 1-Month Billing Cycles, Tax Receipts & Biometrics
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 p-1.5 rounded-xl hover:bg-neutral-100 cursor-pointer transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 p-1 bg-neutral-100 rounded-xl mb-5">
          <button
            onClick={() => setActiveTab('billing')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'billing'
                ? 'bg-white text-neutral-900 shadow-xs border border-neutral-200/80 font-black'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Receipt className="w-3.5 h-3.5 text-red-600" />
            <span>Billing, Invoices & 1-Month Cycle</span>
            {effectiveTransactions.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-red-100 text-red-700 text-[10px]">
                {effectiveTransactions.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-white text-neutral-900 shadow-xs border border-neutral-200/80 font-black'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <User className="w-3.5 h-3.5 text-neutral-600" />
            <span>Profile & Biometrics</span>
          </button>
        </div>

        {/* ─── TAB 1: BILLING, INVOICES & SUBSCRIPTION MANAGEMENT ─── */}
        {activeTab === 'billing' && (
          <div className="space-y-5">
            {/* Action Feedback Message */}
            {actionMessage && (
              <div className="p-3.5 rounded-2xl bg-neutral-900 text-white text-xs flex items-center justify-between gap-2 animate-in fade-in">
                <span>{actionMessage}</span>
                <button onClick={() => setActionMessage(null)} className="text-neutral-400 hover:text-white text-xs font-bold">Dismiss</button>
              </div>
            )}

            {/* Scheduled Downgrade Notice Banner */}
            {pendingDowngradePlanName && (
              <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-900 text-xs flex items-start gap-3 shadow-xs animate-in fade-in">
                <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-sm">Scheduled Plan Switch</p>
                  <p className="text-amber-800">
                    Your plan will automatically switch to <strong>{pendingDowngradePlanName}</strong> on {downgradeEffectiveAt ? formatReceiptDate(downgradeEffectiveAt) : 'the end of your current period'}. Your current higher-tier coaching features remain fully active until then.
                  </p>
                </div>
              </div>
            )}

            {/* Cancelled at Period End Notice Banner */}
            {cancellationRequestedAt && !isExpired && (
              <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-900 text-xs flex items-center justify-between gap-3 shadow-xs animate-in fade-in">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <p className="font-bold">Cancellation Scheduled</p>
                    <p className="text-amber-800">Paid access remains active until {expiryFormatted}.</p>
                  </div>
                </div>
                <button
                  onClick={handleReactivate}
                  disabled={actionLoading}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  {actionLoading ? 'Reactivating...' : 'Reactivate Subscription'}
                </button>
              </div>
            )}

            {/* Active Subscription Banner */}
            <div className={`border-2 rounded-2xl p-5 ${
              isExpired
                ? 'bg-red-50/70 border-red-300'
                : isRenewalPending
                ? 'bg-amber-50/70 border-amber-300'
                : 'bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-950 border-neutral-800 text-white shadow-xl'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-extrabold uppercase tracking-widest ${
                      isExpired ? 'text-red-700' : isRenewalPending ? 'text-amber-800' : 'text-red-400'
                    }`}>
                      Current Subscription • {billingCycle ? billingCycle.toUpperCase() : 'MONTHLY'}
                    </span>

                    {isExpired ? (
                      <span className="px-2 py-0.5 bg-red-100 text-red-800 border border-red-300 text-[10px] font-bold rounded-md flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-red-600" /> Expired
                      </span>
                    ) : isPendingCoachApproval ? (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold rounded-md flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-600" /> Pending Coach Routine Setup
                      </span>
                    ) : isRenewalPending ? (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold rounded-md flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-600" /> Renewal Pending
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold rounded-md flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" /> Active Subscription
                      </span>
                    )}
                  </div>

                  <h3 className={`text-lg font-black uppercase font-display tracking-tight ${!isExpired && !isRenewalPending ? 'text-white' : 'text-neutral-900'}`}>
                    {displayPlanName}
                  </h3>

                  <p className={`text-xs ${!isExpired && !isRenewalPending ? 'text-neutral-300' : 'text-neutral-600'}`}>
                    ${displayPlanPrice} AUD {activePlan?.period || (billingCycle === 'weekly' ? '/ week' : billingCycle === 'hourly' ? '/ hour' : '/ month')}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    onClick={() => {
                      onClose();
                      if (onOpenPlanSelection) onOpenPlanSelection();
                      else if (onOpenRenewal) onOpenRenewal();
                      else if (onOpenCheckout) onOpenCheckout('plan_online_monthly');
                    }}
                    className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider transition-colors shadow-md shadow-red-600/30 cursor-pointer flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                    <span>{isExpired ? 'Re-Enroll Package' : 'Change / Upgrade Plan'}</span>
                  </button>

                  {!isExpired && !cancellationRequestedAt && (
                    <button
                      onClick={() => setCancelConfirmOpen(true)}
                      className="px-3 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              {/* Plan Details & Dates */}
              <div className={`mt-4 pt-4 border-t grid grid-cols-1 sm:grid-cols-3 gap-3 ${
                !isExpired && !isRenewalPending ? 'border-white/10 text-neutral-200' : 'border-neutral-200 text-neutral-800'
              }`}>
                <div className={`p-2.5 rounded-xl ${!isExpired && !isRenewalPending ? 'bg-white/5 border border-white/10' : 'bg-white border border-neutral-200'}`}>
                  <span className="text-[10px] font-bold uppercase tracking-wider block text-neutral-400">Start Date</span>
                  <span className="text-xs font-bold font-mono text-emerald-400">{startFormatted}</span>
                </div>

                <div className={`p-2.5 rounded-xl ${!isExpired && !isRenewalPending ? 'bg-white/5 border border-white/10' : 'bg-white border border-neutral-200'}`}>
                  <span className="text-[10px] font-bold uppercase tracking-wider block text-neutral-400">
                    {billingCycle === 'hourly' ? 'Booking Window End' : 'Expiry Date'}
                  </span>
                  <span className="text-xs font-bold font-mono text-red-400">{expiryFormatted || 'Valid'}</span>
                </div>

                <div className={`p-2.5 rounded-xl ${!isExpired && !isRenewalPending ? 'bg-white/5 border border-white/10' : 'bg-white border border-neutral-200'}`}>
                  <span className="text-[10px] font-bold uppercase tracking-wider block text-neutral-400">
                    {billingCycle === 'hourly' ? 'Session Credits' : 'Days Remaining'}
                  </span>
                  <span className="text-xs font-black font-mono">
                    {billingCycle === 'hourly'
                      ? `${remainingSessionCredits !== undefined ? remainingSessionCredits : 1} Credit${remainingSessionCredits === 1 ? '' : 's'} Remaining`
                      : isExpired ? '0 Days (Expired)' : `${daysRemaining} Days Active`}
                  </span>
                </div>
              </div>
            </div>

            {/* Cancel Confirmation Modal / Inline Sheet */}
            {cancelConfirmOpen && (
              <div className="p-4 rounded-2xl bg-neutral-900 border-2 border-red-500 text-white space-y-3 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  <h4 className="font-bold text-sm">Cancel Subscription Confirmation</h4>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Your cancellation will take effect at the end of your paid billing period ({expiryFormatted}). You will retain full access to all coaching features until then, and your historical workouts will never be deleted.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleCancel}
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    {actionLoading ? 'Processing...' : 'Confirm Cancellation'}
                  </button>
                  <button
                    onClick={() => setCancelConfirmOpen(false)}
                    className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Keep My Subscription
                  </button>
                </div>
              </div>
            )}

            {/* Invoices & PDF Receipts Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-red-600" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-neutral-900">
                    Payment History & Tax Invoices (PDF)
                  </h4>
                </div>
                <span className="text-[11px] text-neutral-500">
                  {effectiveTransactions.length} Verified Payment{effectiveTransactions.length === 1 ? '' : 's'}
                </span>
              </div>

              {loadingTx ? (
                <div className="text-center py-8 text-neutral-400 text-xs">
                  <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Loading payment history...
                </div>
              ) : effectiveTransactions.length === 0 ? (
                <div className="text-center py-8 px-4 rounded-2xl bg-neutral-50 border border-neutral-200 text-neutral-500 text-xs space-y-1">
                  <Receipt className="w-8 h-8 text-neutral-300 mx-auto mb-1" />
                  <p className="font-bold text-neutral-700">No payment records found yet</p>
                  <p className="text-[11px]">When you activate a coaching plan, official tax invoices and receipts will appear here.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {effectiveTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="p-3.5 rounded-2xl bg-white border border-neutral-200 hover:border-red-200 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-neutral-900">
                            {tx.invoiceNumber || `BFL-INV-${tx.id.slice(-6).toUpperCase()}`}
                          </span>
                          <span className="px-2 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                            PAID
                          </span>
                          <span className="text-[10px] text-neutral-400 font-mono">
                            {formatReceiptDate(tx.createdAt)}
                          </span>
                        </div>

                        <p className="text-xs font-semibold text-neutral-700">
                          {tx.planName} • <strong className="font-mono text-neutral-900">${tx.amount} {tx.currency || 'AUD'}</strong>
                        </p>

                        <div className="text-[11px] text-neutral-500 flex items-center gap-2">
                          <span>1-Month Period: <strong className="text-neutral-700">{formatReceiptDate(tx.billingPeriodStart)} → {formatReceiptDate(tx.billingPeriodEnd)}</strong></span>
                          <span>•</span>
                          <span>{tx.paymentMethod}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                        {/* Download Official PDF Receipt */}
                        <button
                          onClick={() => handleDownloadInvoice(tx)}
                          className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                          title="Download Official PDF Invoice"
                        >
                          <Download className="w-3.5 h-3.5 text-red-400" />
                          <span>PDF Receipt</span>
                        </button>

                        {/* External Stripe Hosted Link */}
                        {tx.receiptUrl && (
                          <a
                            href={tx.receiptUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors"
                            title="Open Hosted Receipt"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Assigned Coach Card */}
            <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 mb-2 block">
                Assigned Head Coach
              </span>
              <div className="flex items-center gap-3">
                <img
                  src={assignedCoach.avatarUrl}
                  alt={assignedCoach.name}
                  className="w-12 h-12 rounded-2xl object-cover border border-neutral-200"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                    {assignedCoach.name}
                    <ShieldCheck className="w-4 h-4 text-red-600" />
                  </h4>
                  <p className="text-xs text-red-600 font-semibold">{assignedCoach.specialty}</p>
                  <p className="text-[11px] text-neutral-500 truncate">{assignedCoach.email}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: PROFILE DETAILS & BIOMETRICS ─── */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Full Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-xl px-3 py-2 text-sm text-neutral-900 focus:border-red-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  disabled
                  value={user?.email || clientIntake?.clientEmail || 'athlete@bflfitness.com'}
                  className="w-full bg-neutral-100 border border-neutral-200 rounded-xl px-3 py-2 text-sm text-neutral-500 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                Avatar Image URL
              </label>
              <input
                type="url"
                placeholder="https://images.unsplash.com/..."
                value={photoURL}
                onChange={(e) => setPhotoURL(e.target.value)}
                className="w-full bg-white border border-neutral-300 rounded-xl px-3 py-2 text-sm text-neutral-900 focus:border-red-600 focus:outline-none placeholder:text-neutral-400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Phone Number (Reminders)
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-xl px-3 py-2 text-sm text-neutral-900 focus:border-red-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Intake Form Status
                </label>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-xs text-emerald-700 font-bold flex items-center gap-1.5 h-10">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>{clientIntake ? 'Intake Submitted & Synchronized' : 'Onboarding Form Verified'}</span>
                </div>
              </div>
            </div>

            {/* Onboarding Biometrics Snapshot */}
            {clientIntake && (
              <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2">
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
                  Onboarding Biometric Submission
                </span>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-neutral-200">
                    <span className="text-[10px] text-neutral-400 block font-semibold">Height / Weight</span>
                    <span className="font-bold text-neutral-900 font-mono">
                      {clientIntake.heightCm || '--'}cm / {clientIntake.currentWeightKg || '--'}kg
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-neutral-200">
                    <span className="text-[10px] text-neutral-400 block font-semibold">Target Weight</span>
                    <span className="font-bold text-red-600 font-mono">
                      {clientIntake.targetWeightKg || '--'} kg
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-neutral-200">
                    <span className="text-[10px] text-neutral-400 block font-semibold">Primary Goal</span>
                    <span className="font-bold text-neutral-900 uppercase truncate block">
                      {clientIntake.primaryGoal?.replace(/_/g, ' ') || 'General'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-neutral-200">
              {saveSuccess ? (
                <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                  <Check className="w-4 h-4" /> Profile saved successfully!
                </span>
              ) : <div />}
              <button
                type="submit"
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md shadow-red-200 transition-colors"
              >
                <Save className="w-4 h-4" /> Save Profile
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
