import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { auth } from './services/firebase';
import { FitnessDataProvider } from './context/FitnessDataContext';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { HeroSection } from './components/marketing/HeroSection';
import { CoachingPlans } from './components/marketing/CoachingPlans';
import { ResultsGallery } from './components/marketing/ResultsGallery';
import { AboutCoach } from './components/marketing/AboutCoach';
import { FAQSection } from './components/marketing/FAQSection';
import { ContactSection } from './components/marketing/ContactSection';
import { ClientDashboard } from './components/client/ClientDashboard';
import { CoachDashboard } from './components/coach/CoachDashboard';
import { ManageCoachesPage } from './components/admin/ManageCoachesPage';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { AuthModal } from './components/auth/AuthModal';
import { CheckoutModal } from './components/onboarding/CheckoutModal';
import { IntakeFormModal } from './components/onboarding/IntakeFormModal';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AppView } from './components/common/Navbar';
import { verifyAndFulfillCheckoutSession } from './services/stripeService';
import { downloadReceiptPdf } from './services/receiptPdfService';

const MainContent: React.FC = () => {
  const navigate = useNavigate();
  const { user, currentUser, role, signOut } = useAuth();

  // Navigation views: 'marketing' | 'client_portal' | 'coach_portal' | 'admin_manage_coaches'
  const [currentView, setCurrentView] = useState<AppView>('marketing');
  const [coachDashboardTab, setCoachDashboardTab] = useState<'clients' | 'builder' | 'checkins' | 'intakes' | 'chat' | 'cms' | 'team' | 'progress'>('clients');
  const [clientDashboardTab, setClientDashboardTab] = useState<'schedule' | 'workout' | 'nutrition' | 'checkin' | 'chat' | 'progress'>('schedule');

  // Modals state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState('plan_online_monthly');
  const [intakeModalOpen, setIntakeModalOpen] = useState(false);

  // Exact 3-step sequence state: Step 1 (Register) -> Step 2 (Plan & Enroll) -> Step 3 (Athlete Onboarding)
  const [pendingRegistration, setPendingRegistration] = useState<{
    name: string;
    email: string;
    password?: string;
    goal?: string;
    isGoogleAuth?: boolean;
  } | null>(null);

  const [enrolledPlanInfo, setEnrolledPlanInfo] = useState<{
    email: string;
    name: string;
    planId: string;
    planName: string;
    planPrice: number;
    billingPeriod: string;
  } | null>(null);

  // Handle return from official Stripe Checkout Session
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');

    if (sessionId) {
      verifyAndFulfillCheckoutSession(sessionId)
        .then((tx) => {
          window.history.replaceState({}, document.title, window.location.pathname);

          setEnrolledPlanInfo({
            email: tx.clientEmail,
            name: tx.clientName,
            planId: tx.planId,
            planName: tx.planName,
            planPrice: tx.amount,
            billingPeriod: '/ month',
          });

          try {
            downloadReceiptPdf(tx, tx.clientName, tx.clientEmail, tx.billingPeriodEnd);
          } catch (e) {
            console.warn('PDF download notice:', e);
          }

          setIntakeModalOpen(true);
        })
        .catch((err) => {
          console.warn('[App] Session fulfillment error:', err);
        });
    }
  }, []);

  // Route Protection: Enforce auth guards for client, coach, and admin dashboards
  // NOTE: We check `auth.currentUser` as a fallback when the React `user` state
  // hasn't propagated yet (e.g. immediately after login closes the AuthModal and
  // sets currentView). Without this, the guard would bounce the user back to
  // marketing on the very first render tick after login.
  useEffect(() => {
    const activeRole = currentUser?.role || user?.role;
    const isAuthenticated = !!user || !!auth.currentUser;

    if (currentView === 'coach_portal') {
      if (!isAuthenticated) {
        setCurrentView('marketing');
        setAuthModalOpen(false);
      } else if (activeRole === 'client') {
        // Logged-in clients are not authorized to view the Coach dashboard
        setCurrentView('client_portal');
      }
    } else if (currentView === 'admin_manage_coaches') {
      if (!isAuthenticated) {
        setCurrentView('marketing');
        setAuthModalOpen(false);
      } else if (activeRole === 'coach') {
        // Users with coach role are automatically redirected to their dashboard if attempting to access admin routes
        setCurrentView('coach_portal');
      } else if (activeRole === 'client') {
        setCurrentView('client_portal');
      }
    } else if (currentView === 'client_portal') {
      if (!isAuthenticated) {
        setCurrentView('marketing');
        setAuthModalOpen(false);
      }
    }
  }, [currentView, user, currentUser]);

  // Handle clean sign-out routing: signs the user out and returns to the marketing page
  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Error during sign out:', err);
    }
    setCurrentView('marketing');
    navigate('/');
  };

  const handleOpenAuth = (mode: 'login' | 'signup' = 'login') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const handleOpenCheckout = (planId: string = 'plan_online_monthly') => {
    setSelectedPlanForCheckout(planId);
    if (!user) {
      // Unauthenticated users start at Step 1 (Register)
      setAuthModalMode('signup');
      setAuthModalOpen(true);
    } else {
      setCheckoutModalOpen(true);
    }
  };

  const handleCheckoutSuccess = (data: {
    email: string;
    name: string;
    planId: string;
    planName: string;
    planPrice: number;
    billingPeriod: string;
  }) => {
    setEnrolledPlanInfo(data);
    setCheckoutModalOpen(false);
    // Open Step 3 (Athlete Onboarding form) immediately
    setIntakeModalOpen(true);
  };

  const handleIntakeCompleted = () => {
    setIntakeModalOpen(false);
    setPendingRegistration(null);
    setCurrentView('client_portal');
  };

  const scrollToSection = (sectionId: string) => {
    if (currentView !== 'marketing') {
      setCurrentView('marketing');
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        el?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const el = document.getElementById(sectionId);
      el?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col selection:bg-red-600 selection:text-white">
      {/* Top Main Navigation Bar */}
      <Navbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        onOpenAuth={handleOpenAuth}
        onOpenCheckout={handleOpenCheckout}
        setIsAuthModalOpen={setAuthModalOpen}
        onSignOut={handleSignOut}
        onNavigateTab={(tab) => {
          const coachTabs = ['clients', 'builder', 'checkins', 'intakes', 'chat', 'cms', 'team', 'progress'];
          if (coachTabs.includes(tab)) {
            setCoachDashboardTab(tab as any);
          }
          const clientTabs = ['schedule', 'workout', 'nutrition', 'checkin', 'chat', 'progress'];
          if (clientTabs.includes(tab)) {
            setClientDashboardTab(tab as any);
          }
        }}
      />

      {/* Main View Router */}
      <main className="flex-1">
        <ErrorBoundary 
          fallbackTitle="Dashboard Rendering Issue"
          onReset={() => setCurrentView('marketing')}
        >
          {currentView === 'marketing' && (
            <div>
              <HeroSection
                onApply={() => handleOpenCheckout('plan_online_monthly')}
                onExplorePlans={() => scrollToSection('plans')}
              />
              <CoachingPlans
                onSelectPlan={(planId) => handleOpenCheckout(planId)}
              />
              <ResultsGallery
                onApply={() => handleOpenCheckout('plan_online_monthly')}
              />
              <AboutCoach 
                onExplorePlans={() => scrollToSection('plans')}
                onApply={() => handleOpenCheckout('plan_online_monthly')}
              />
              <FAQSection />
              <ContactSection />
            </div>
          )}

          {currentView === 'client_portal' && (
            <ProtectedRoute
              allowedRoles={['client']}
              onUnauthorizedRole={() => setCurrentView('coach_portal')}
              onUnauthenticated={() => {
                setCurrentView('marketing');
                setAuthModalMode('login');
                setAuthModalOpen(true);
                navigate('/');
              }}
            >
              <ClientDashboard onLogout={handleSignOut} initialTab={clientDashboardTab} />
            </ProtectedRoute>
          )}

          {currentView === 'coach_portal' && (
            <ProtectedRoute
              allowedRoles={['coach', 'admin']}
              onUnauthorizedRole={() => setCurrentView('client_portal')}
              onUnauthenticated={() => {
                setCurrentView('marketing');
                setAuthModalOpen(false);
                navigate('/');
              }}
            >
              <CoachDashboard 
                onNavigateToManageCoaches={() => setCurrentView('admin_manage_coaches')} 
                initialTab={coachDashboardTab}
              />
            </ProtectedRoute>
          )}

          {currentView === 'admin_manage_coaches' && (
            <ProtectedRoute
              allowedRoles={['admin']}
              onUnauthorizedRole={(role) => {
                // Ensure users with coach role are automatically redirected to their dashboard if they attempt to access Admin-only routes
                if (role === 'coach') {
                  setCurrentView('coach_portal');
                } else {
                  setCurrentView('client_portal');
                }
              }}
              onUnauthenticated={() => {
                setCurrentView('marketing');
                setAuthModalOpen(false);
                navigate('/');
              }}
            >
              <ManageCoachesPage 
                onNavigate={(v) => setCurrentView(v)} 
                onNavigateToCMS={() => {
                  setCoachDashboardTab('cms');
                  setCurrentView('coach_portal');
                }}
              />
            </ProtectedRoute>
          )}
        </ErrorBoundary>
      </main>

      {/* Footer */}
      <Footer onNavigate={(v) => setCurrentView(v)} />

      {/* Modals */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authModalMode}
        selectedPlanId={selectedPlanForCheckout}
        onProceedToPlanAndEnroll={(regData) => {
          setPendingRegistration(regData);
          setAuthModalOpen(false);
          setCheckoutModalOpen(true);
        }}
        onSuccess={(authenticatedRole, isNewClient) => {
          setAuthModalOpen(false);
          if (authenticatedRole === 'admin') {
            setCurrentView('admin_manage_coaches');
          } else if (authenticatedRole === 'coach') {
            setCurrentView('coach_portal');
          } else {
            // For clients: check if they still need to complete onboarding intake
            const needsIntake = isNewClient || currentUser?.hasCompletedIntake === false;
            if (needsIntake) {
              setIntakeModalOpen(true);
            } else {
              setCurrentView('client_portal');
            }
          }
        }}
      />

      <CheckoutModal
        isOpen={checkoutModalOpen}
        onClose={() => setCheckoutModalOpen(false)}
        selectedPlanId={selectedPlanForCheckout}
        registrationData={pendingRegistration}
        onBackToRegister={() => {
          setCheckoutModalOpen(false);
          setAuthModalMode('signup');
          setAuthModalOpen(true);
        }}
        onSuccess={handleCheckoutSuccess}
      />

      <IntakeFormModal
        isOpen={intakeModalOpen}
        onClose={() => setIntakeModalOpen(false)}
        clientInfo={enrolledPlanInfo}
        onCompleted={handleIntakeCompleted}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <FitnessDataProvider>
        <MainContent />
      </FitnessDataProvider>
    </AuthProvider>
  );
}
