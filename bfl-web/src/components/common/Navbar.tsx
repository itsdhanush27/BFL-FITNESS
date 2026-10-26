import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Dumbbell, 
  User, 
  LogOut, 
  Calendar, 
  Menu, 
  X,
  CreditCard,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFitnessData } from '../../context/FitnessDataContext';
import { INITIAL_COACHING_PLANS } from '../../data/seedData';
import { NotificationDropdown } from './NotificationDropdown';

export type AppView = 'marketing' | 'client_portal' | 'coach_portal' | 'admin_manage_coaches';

interface NavbarProps {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  onOpenAuth: (mode?: 'login' | 'signup') => void;
  onOpenCheckout?: (planId?: string) => void;
  setIsAuthModalOpen?: (isOpen: boolean) => void;
  onSignOut?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  setCurrentView,
  onOpenAuth,
  onOpenCheckout,
  setIsAuthModalOpen,
  onSignOut,
  onNavigateTab
}) => {
  const navigate = useNavigate();
  const { user, currentUser, signOut } = useAuth();
  const { cmsContent, clients, clientIntake, coachingPlans } = useFitnessData();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activeRole = currentUser?.role || user?.role;

  const isClientUser = currentUser?.role === 'client' || (!['admin', 'coach', 'nutritionist'].includes(currentUser?.role || ''));
  const currentClientEntry = clients?.find(c => c.id === currentUser?.uid || (currentUser?.email && c.email && c.email.toLowerCase() === currentUser.email.toLowerCase()));
  const isClientPendingReview = Boolean(
    clientIntake && (clientIntake.status === 'pending_review' || (clientIntake as any).approvalStatus === 'pending')
  );
  const isClientPendingActivation = isClientUser && Boolean(
    isClientPendingReview ||
    currentClientEntry?.status === 'pending' ||
    currentClientEntry?.subscriptionStatus === 'pending_approval' ||
    (currentClientEntry as any)?.approvalStatus === 'pending' ||
    currentUser?.subscriptionStatus === 'pending_approval' ||
    (currentUser as any)?.approvalStatus === 'pending' ||
    (currentUser as any)?.status === 'pending' ||
    (!currentClientEntry && Boolean(clientIntake))
  ) && currentClientEntry?.status !== 'active' && clientIntake?.status !== 'active';

  const handleSignOut = async () => {
    setMobileMenuOpen(false);

    if (onSignOut) {
      onSignOut();
      return;
    }

    try {
      await signOut();
    } catch (err) {
      console.error('Error signing out:', err);
    }

    setCurrentView('marketing');
    navigate('/');
    if (setIsAuthModalOpen) {
      setIsAuthModalOpen(true);
    }
  };

  const availablePlans = (coachingPlans && coachingPlans.length > 0) ? coachingPlans : INITIAL_COACHING_PLANS;

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-neutral-200 shadow-xs">
      {/* Top Announcement Bar (Continuously Looping Marquee from Left to Right with Plans) */}
      <div 
        className="w-full bg-neutral-950 text-white overflow-hidden whitespace-nowrap border-b border-neutral-800 py-1.5 px-0 select-none text-xs font-semibold tracking-wide flex items-center relative z-20 group"
        title="BFL FITNESS • Coaching Plans & Announcements"
      >
        <div className="animate-marquee-ltr flex items-center gap-10 shrink-0">
          {[0, 1].map((idx) => (
            <div key={idx} className="flex items-center gap-8 shrink-0">
              {/* Manifesto Text */}
              <div className="flex items-center gap-3 shrink-0">
                <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-red-600 text-[10px] font-black uppercase tracking-wider text-white shadow-xs">
                  BFL
                </span>
                <span className="text-neutral-100 font-medium tracking-normal text-[11.5px] sm:text-xs">
                  BFL FITNESS • Brothers For Life • Stronger Together • Science-rooted online fitness coaching, bespoke hypertrophy programming, and precision metabolic nutrition designed for permanent physical transformation.
                </span>
                <span className="text-red-500 font-bold text-xs select-none">•</span>
              </div>

              {/* Coaching Plans Catalog */}
              <div className="flex items-center gap-2.5 shrink-0">
                <span className="text-[10px] uppercase font-extrabold tracking-widest text-neutral-400 mr-1">
                  PLANS &amp; TIERS:
                </span>
                {availablePlans.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => onOpenCheckout?.(plan.id)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-neutral-900 hover:bg-red-600 text-neutral-200 hover:text-white border border-neutral-700 hover:border-red-500 text-[11px] font-semibold transition-all cursor-pointer shadow-2xs"
                    title={`View & Enroll: ${plan.name}`}
                  >
                    <span className="font-bold">{plan.name}</span>
                    <span className="text-red-400 group-hover:text-white font-mono font-bold">${plan.price}{plan.period}</span>
                  </button>
                ))}
                <span className="text-red-500 font-bold text-xs select-none">•</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Brand Logo */}
          <div 
            onClick={() => setCurrentView('marketing')}
            className="flex items-center gap-3.5 cursor-pointer group select-none"
          >
            <div className="relative w-12 h-12 rounded-xl bg-neutral-950 flex items-center justify-center shadow-md shadow-neutral-900/10 group-hover:scale-105 transition-transform border border-neutral-800 p-1 overflow-hidden shrink-0">
              <img 
                src="/assets/bfl-emblem-transparent.png" 
                alt="BFL Fitness Logo" 
                className="w-full h-full object-contain filter drop-shadow-[0_2px_4px_rgba(220,38,38,0.4)]" 
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-red-600 font-extrabold text-2xl tracking-tighter font-display">BFL</span>
                <span className="font-extrabold text-2xl tracking-tighter text-neutral-900 font-display">FITNESS</span>
              </div>
              <p className="text-[10px] tracking-widest text-neutral-500 uppercase font-semibold -mt-1">
                Brothers For Life &bull; Stronger Together
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          {(activeRole === 'client' || activeRole === 'admin' || activeRole === 'coach') && (
            <nav className="hidden md:flex items-center gap-1.5">
              {activeRole === 'client' && (
                <button
                  onClick={() => setCurrentView('client_portal')}
                  className={`px-3 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                    currentView === 'client_portal' 
                      ? 'text-neutral-900 bg-neutral-100 border border-neutral-300/80 shadow-xs' 
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/70'
                  }`}
                >
                  <Calendar className="w-4 h-4 text-red-600" />
                  <span>Client Portal</span>
                </button>
              )}

              {(activeRole === 'coach' || activeRole === 'admin') && (
                <button
                  onClick={() => setCurrentView('coach_portal')}
                  className={`px-3 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                    currentView === 'coach_portal' 
                      ? 'text-neutral-900 bg-neutral-100 border border-neutral-300/80 shadow-xs' 
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/70'
                  }`}
                >
                  <Dumbbell className="w-4 h-4 text-red-600" />
                  <span>Coach Portal</span>
                </button>
              )}

              {activeRole === 'admin' && (
                <button
                  onClick={() => setCurrentView('admin_manage_coaches')}
                  className={`px-3 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                    currentView === 'admin_manage_coaches' 
                      ? 'text-neutral-900 bg-neutral-100 border border-neutral-300/80 shadow-xs' 
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/70'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-red-600" />
                  <span>Admin Dashboard</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-50 text-red-700 border border-red-200 font-mono font-bold">
                    Admin
                  </span>
                </button>
              )}
            </nav>
          )}

          {/* User Controls & Profile */}
          <div className="hidden md:flex items-center gap-3">

            {user ? (
              <div className="flex items-center gap-3">
                {/* Notification Dropdown */}
                <NotificationDropdown
                  onNavigate={(tab) => {
                    if (currentUser?.role === 'coach' || currentUser?.role === 'admin') {
                      if (onNavigateTab && tab) {
                        onNavigateTab(tab);
                      }
                      setCurrentView('coach_portal');
                    } else {
                      if (onNavigateTab && tab) {
                        onNavigateTab(tab);
                      }
                      setCurrentView('client_portal');
                    }
                  }}
                />

                <div className="flex items-center gap-2 pl-2 border-l border-neutral-200">
                  <div className="w-8 h-8 rounded-full bg-neutral-100 border border-neutral-300 overflow-hidden flex items-center justify-center">
                    {currentUser?.photoURL ? (
                      <img src={currentUser.photoURL} alt={currentUser.displayName} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-4 h-4 text-neutral-500" />
                    )}
                  </div>
                  <div className="text-left leading-tight hidden lg:block">
                    <p className="text-xs font-bold text-neutral-900">{currentUser?.displayName}</p>
                    <span className={`text-[10px] uppercase font-bold ${
                      isClientPendingActivation ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {currentUser?.role === 'admin' 
                        ? 'Founder & Admin' 
                        : currentUser?.role === 'coach' 
                        ? 'Coach' 
                        : isClientPendingActivation
                        ? 'Pending Activation'
                        : 'Active Client'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleSignOut}
                  className="px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 border border-neutral-300 hover:border-neutral-400 rounded-lg cursor-pointer transition-colors flex items-center gap-1.5"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenAuth('login')}
                  className="px-3.5 py-2 text-sm font-bold text-neutral-700 hover:text-neutral-900 transition-colors cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  onClick={() => onOpenAuth('signup')}
                  className="px-3.5 py-2 text-sm font-bold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 rounded-lg transition-colors cursor-pointer"
                >
                  Register
                </button>
                <button
                  onClick={() => onOpenCheckout?.('plan_online_monthly')}
                  className="px-4 py-2 text-sm font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-sm shadow-red-200 transition-all cursor-pointer flex items-center gap-1.5 border border-red-500/30"
                >
                  <CreditCard className="w-4 h-4" />
                  Join Coaching
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu trigger */}
          <div className="flex items-center gap-2 md:hidden">
            {user && (
              <NotificationDropdown
                onNavigate={(tab) => {
                  if (currentUser?.role === 'coach' || currentUser?.role === 'admin') {
                    if (onNavigateTab && tab) {
                      onNavigateTab(tab);
                    }
                    setCurrentView('coach_portal');
                  } else {
                    if (onNavigateTab && tab) {
                      onNavigateTab(tab);
                    }
                    setCurrentView('client_portal');
                  }
                }}
              />
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-neutral-700 hover:text-neutral-900 cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-neutral-200 px-4 pt-2 pb-6 space-y-3">
          {activeRole === 'client' && (
            <button
              onClick={() => {
                setCurrentView('client_portal');
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 cursor-pointer ${
                currentView === 'client_portal' ? 'bg-neutral-100 text-neutral-900 border border-neutral-300' : 'text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              <Calendar className="w-4 h-4 text-red-600" />
              Client Coaching Portal
            </button>
          )}

          {(activeRole === 'coach' || activeRole === 'admin') && (
            <button
              onClick={() => {
                setCurrentView('coach_portal');
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 cursor-pointer ${
                currentView === 'coach_portal' ? 'bg-neutral-100 text-neutral-900 border border-neutral-300' : 'text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              <Dumbbell className="w-4 h-4 text-red-600" />
              Coach Portal
            </button>
          )}

          {activeRole === 'admin' && (
            <button
              onClick={() => {
                setCurrentView('admin_manage_coaches');
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 cursor-pointer ${
                currentView === 'admin_manage_coaches' ? 'bg-neutral-100 text-neutral-900 border border-neutral-300' : 'text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-red-600" />
              Manage Coaches (Admin Dashboard)
            </button>
          )}

          {user ? (
            <div className="pt-3 border-t border-neutral-200 space-y-2">
              <div className="flex items-center justify-between px-3 py-2 bg-neutral-50 rounded-xl border border-neutral-200">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-neutral-200 border border-neutral-300 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-neutral-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-neutral-900">{currentUser?.displayName}</p>
                    <p className={`text-[10px] uppercase font-bold ${
                      isClientPendingActivation ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {currentUser?.role === 'admin' 
                        ? 'Founder & Admin' 
                        : currentUser?.role === 'coach' 
                        ? 'Coach' 
                        : isClientPendingActivation
                        ? 'Pending Activation'
                        : 'Active Client'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="px-2.5 py-1 text-xs font-semibold text-neutral-700 hover:text-neutral-900 bg-white border border-neutral-300 rounded-lg cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <div className="pt-3 border-t border-neutral-200 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    onOpenAuth('login');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 font-bold rounded-lg text-xs text-center border border-neutral-300 cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    onOpenAuth('signup');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 bg-white hover:bg-neutral-50 text-neutral-900 font-bold rounded-lg text-xs text-center border border-neutral-300 cursor-pointer"
                >
                  Register Client
                </button>
              </div>
              <button
                onClick={() => {
                  onOpenCheckout?.('plan_online_monthly');
                  setMobileMenuOpen(false);
                }}
                className="w-full py-2.5 bg-red-600 hover:bg-red-700 font-bold text-white rounded-lg text-xs uppercase tracking-wider text-center shadow-md shadow-red-200 cursor-pointer border border-red-500/40"
              >
                Join BFL Coaching
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
