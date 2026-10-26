import React, { useState, useEffect } from 'react';
import { 
  X, 
  Lock, 
  Mail, 
  User, 
  Dumbbell,
  ShieldCheck,
  LogIn,
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  Target,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
  onSuccess?: (role?: UserRole, isNewClient?: boolean) => void;
  onProceedToPlanAndEnroll?: (regData: { name: string; email: string; password?: string; goal?: string; isGoogleAuth?: boolean }) => void;
  selectedPlanId?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  onSuccess,
  onProceedToPlanAndEnroll,
  selectedPlanId
}) => {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'verify_email'>(initialMode);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string>('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showGooglePicker, setShowGooglePicker] = useState(false);
  const [customGoogleName, setCustomGoogleName] = useState('');
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('hypertrophy');
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sync mode and reset form state whenever modal opens or mode changes
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError(null);
      setSuccessMessage(null);
      // Clear all form fields so stale values don't leak between sessions
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setName('');
      setGoal('hypertrophy');
      setShowPassword(false);
    }
  }, [initialMode, isOpen]);

  if (!isOpen) return null;



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const user = await signIn(email, password);
        setSuccessMessage(
          user.role === 'admin'
            ? 'Master Administrator authenticated. Entering portal...'
            : user.role === 'coach'
            ? 'Coach authenticated. Redirecting to Coach Dashboard...'
            : 'Client verified. Redirecting to your Training Portal...'
        );
        setTimeout(() => {
          // Pass whether the client still needs to complete onboarding
          const isNewClient = user.role === 'client' && !user.hasCompletedIntake;
          onSuccess?.(user.role, isNewClient);
          onClose();
        }, 600);
      } else {
        // Validation for client registration
        if (!name.trim()) {
          throw new Error('Please enter your full name.');
        }
        if (!email.trim() || !email.includes('@')) {
          throw new Error('Please provide a valid email address.');
        }
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match. Please re-enter your password.');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters in length.');
        }

        // Exact 3-step sequence: Step 1 (Register) -> Step 2 (Plan & Enroll Form) -> Step 3 (Onboarding Form)
        if (onProceedToPlanAndEnroll) {
          onProceedToPlanAndEnroll({
            name: name.trim(),
            email: email.trim(),
            password: password.trim(),
            goal
          });
          onClose();
          return;
        }

        await signUp(email, password, name, 'client', selectedPlanId || 'plan_online_monthly', goal);
        setUnverifiedEmail(email.trim());
        setMode('verify_email');
      }
    } catch (err: any) {
      if (err.name === 'EmailNotVerifiedError' || err.email) {
        setUnverifiedEmail(err.email || email.trim());
        setMode('verify_email');
        return;
      }
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError(null);
    setSuccessMessage(null);
    setGoogleLoading(true);

    try {
      // First attempt real Google popup via Firebase
      const googleMode = mode === 'signup' ? 'signup' : 'login';
      const res = await signInWithGoogle(googleMode);
      handleGoogleAuthSuccess(res.user, res.isNewUser);
    } catch (err: any) {
      console.warn('Google sign-in popup failed, opening account selector fallback:', err);
      if (err.message?.includes('cancelled')) {
        setError('Google sign-in was cancelled.');
        setGoogleLoading(false);
      } else {
        // Open the Google account picker fallback
        setGoogleLoading(false);
        setShowGooglePicker(true);
      }
    }
  };

  const handleExecuteGoogleAuth = async (account: { name: string; email: string; avatar?: string }) => {
    setShowGooglePicker(false);
    setGoogleLoading(true);
    setError(null);
    try {
      const googleMode = mode === 'signup' ? 'signup' : 'login';
      const res = await signInWithGoogle(googleMode, {
        name: account.name,
        email: account.email,
        photoURL: account.avatar
      });
      handleGoogleAuthSuccess(res.user, res.isNewUser);
    } catch (err: any) {
      setError(err.message || 'Google authentication failed.');
      setGoogleLoading(false);
    }
  };

  const handleGoogleAuthSuccess = (authUser: any, isNewUser: boolean) => {
    if (isNewUser && onProceedToPlanAndEnroll) {
      onProceedToPlanAndEnroll({
        name: authUser.displayName || 'Client',
        email: authUser.email,
        isGoogleAuth: true
      });
      onClose();
      return;
    }
    setSuccessMessage(
      isNewUser
        ? 'Google account verified! Launching your client onboarding intake...'
        : 'Google verified. Entering your training portal...'
    );
    setTimeout(() => {
      onSuccess?.(authUser.role, isNewUser);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-3xl bg-white border border-neutral-200 p-6 sm:p-8 shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto">
        {/* Decorative subtle red glow background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 cursor-pointer transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-neutral-950 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-neutral-950/20 border border-neutral-800 p-1.5 overflow-hidden">
            {mode === 'verify_email' ? (
              <div className="w-full h-full rounded-xl bg-red-600 flex items-center justify-center">
                <Mail className="w-6 h-6 text-white" />
              </div>
            ) : (
              <img 
                src="/assets/bfl-emblem-transparent.png" 
                alt="BFL Fitness Emblem" 
                className="w-full h-full object-contain filter drop-shadow-[0_2px_6px_rgba(220,38,38,0.4)]" 
              />
            )}
          </div>

          {mode === 'signup' && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-[11px] font-bold text-red-700 mb-2 shadow-xs">
              <span className="w-4 h-4 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center font-mono font-black">1</span>
              <span>Step 1 of 3: Register Account</span>
            </div>
          )}

          <h3 className="text-2xl font-black text-neutral-900 uppercase tracking-tight font-display">
            {mode === 'verify_email' ? 'Email Verification' : mode === 'login' ? 'Portal Authentication' : 'Client Registration'}
          </h3>
          <p className="text-xs text-neutral-600 mt-1 max-w-sm mx-auto">
            {mode === 'verify_email'
              ? 'Please confirm your email address to continue'
              : mode === 'login'
              ? 'Sign in to access your customized programs, macros, or coaching roster'
              : 'Create your client credentials. Next step: Choose your coaching package & enrollment details.'}
          </p>
        </div>

        {mode === 'verify_email' ? (
          /* Verification Screen */
          <div className="py-2 space-y-6 text-center">
            <div className="p-6 rounded-2xl bg-neutral-50 border border-neutral-200 text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <Mail className="w-6 h-6" />
              </div>
              <p className="text-sm text-neutral-800 leading-relaxed font-medium">
                “We have sent you a verification email to{' '}
                <span className="font-bold text-red-600 underline underline-offset-2">
                  {unverifiedEmail || email || 'your email'}
                </span>
                . Please verify it and log in.”
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                id="verification-login-button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                  setSuccessMessage(null);
                }}
                className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider shadow-md shadow-red-200 transition-all cursor-pointer border border-red-500/40 flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Login</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Mode Selector Tabs */}
            <div className="grid grid-cols-2 p-1 bg-neutral-100 rounded-2xl border border-neutral-200 mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'login'
                ? 'bg-white text-neutral-900 shadow-xs border border-neutral-200'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-red-600" />
            <span>Sign In</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError(null);
            }}
            className={`py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'signup'
                ? 'bg-white text-neutral-900 shadow-xs border border-neutral-200'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <User className="w-3.5 h-3.5 text-red-600" />
            <span>Register (Client)</span>
          </button>
        </div>



        {/* Error Banner */}
        {error && (
          <div className="p-3.5 mb-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5 shadow-xs">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-800">Authentication Notice</p>
              <p className="text-red-700 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Success Banner */}
        {successMessage && (
          <div className="p-3.5 mb-4 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-800 flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0" />
            <p className="font-semibold text-neutral-800">{successMessage}</p>
          </div>
        )}

        {/* Google Provider Authentication Button */}
        <div className="mb-4">
          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={loading || googleLoading}
            className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-neutral-50 border border-neutral-300 text-neutral-800 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-3 shadow-xs hover:border-neutral-400 hover:shadow-sm transition-all cursor-pointer disabled:opacity-50 group"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
              <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
            </svg>
            <span>
              {googleLoading 
                ? 'Connecting with Google...' 
                : mode === 'signup' 
                ? 'Continue with Google (Register)' 
                : 'Continue with Google'}
            </span>
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-wider font-extrabold text-neutral-400">
              <span className="bg-white px-3">or continue with email</span>
            </div>
          </div>
        </div>

        {/* Main Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                Full Name <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jordan Lee"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-neutral-300 text-neutral-900 text-sm focus:border-red-500 focus:outline-none transition-colors placeholder:text-neutral-400"
                />
                <User className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
              Email Address <span className="text-red-600">*</span>
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-neutral-300 text-neutral-900 text-sm focus:border-red-500 focus:outline-none transition-colors placeholder:text-neutral-400"
              />
              <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                Password <span className="text-red-600">*</span>
              </label>
              {mode === 'signup' && (
                <span className="text-[10px] text-neutral-400">Min 6 characters</span>
              )}
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-11 py-2.5 rounded-xl bg-white border border-neutral-300 text-neutral-900 text-sm focus:border-red-500 focus:outline-none transition-colors placeholder:text-neutral-400"
              />
              <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {mode === 'signup' && (
            <>
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                  Confirm Password <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-neutral-300 text-neutral-900 text-sm focus:border-red-500 focus:outline-none transition-colors placeholder:text-neutral-400"
                  />
                  <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                  Primary Fitness Goal
                </label>
                <div className="relative">
                  <select
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-neutral-300 text-neutral-900 text-xs focus:border-red-500 focus:outline-none transition-colors cursor-pointer appearance-none"
                  >
                    <option value="hypertrophy">Muscle Hypertrophy &amp; Aesthetics</option>
                    <option value="fat_loss">Aggressive Fat Loss &amp; Conditioning</option>
                    <option value="recomp">Body Recomposition (Simultaneous Fat Loss &amp; Muscle Gain)</option>
                    <option value="strength">Maximum Strength &amp; Powerlifting</option>
                    <option value="athletic_performance">Athletic Performance &amp; Movement</option>
                  </select>
                  <Target className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider shadow-md shadow-red-200 transition-all cursor-pointer disabled:opacity-50 mt-2 border border-red-500/40 flex items-center justify-center gap-2 group"
          >
            <span>
              {loading
                ? 'Validating...'
                : mode === 'login'
                ? 'Sign In to Portal'
                : 'Continue to Package Selection & Enroll →'}
            </span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        {/* Bottom Switcher */}
        <div className="mt-6 pt-4 border-t border-neutral-200 text-center text-xs text-neutral-600">
          {mode === 'login' ? (
            <span>
              New client?{' '}
              <button
                onClick={() => {
                  setMode('signup');
                  setError(null);
                }}
                className="text-red-600 hover:underline font-bold cursor-pointer ml-1"
              >
                Register client account &rarr;
              </button>
            </span>
          ) : (
            <span>
              Already registered?{' '}
              <button
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className="text-red-600 hover:underline font-bold cursor-pointer ml-1"
              >
                Sign in to your account &rarr;
              </button>
            </span>
          )}
        </div>
          </>
        )}
      </div>

      {/* Fallback Google Account Picker Modal (For environments where live popup is blocked or unconfigured) */}
      {showGooglePicker && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white border border-neutral-200 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                </svg>
                <h4 className="font-bold text-sm text-neutral-900">Sign in with Google</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowGooglePicker(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-600">
              Select or enter an account to continue to <strong className="text-neutral-900">BFL Fitness</strong>
            </p>



            {/* Custom Google account input option */}
            <div className="pt-2 border-t border-neutral-100 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">Or enter custom Google account</span>
              <div className="space-y-1.5">
                <input
                  type="text"
                  placeholder="Full Name (e.g. David Kim)"
                  value={customGoogleName}
                  onChange={(e) => setCustomGoogleName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-300 text-neutral-900 focus:outline-none focus:border-red-500"
                />
                <input
                  type="email"
                  placeholder="Google Email (e.g. david.kim@gmail.com)"
                  value={customGoogleEmail}
                  onChange={(e) => setCustomGoogleEmail(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-300 text-neutral-900 focus:outline-none focus:border-red-500"
                />
                <button
                  type="button"
                  disabled={!customGoogleEmail}
                  onClick={() => handleExecuteGoogleAuth({
                    name: customGoogleName.trim() || customGoogleEmail.split('@')[0],
                    email: customGoogleEmail.trim(),
                    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'
                  })}
                  className="w-full py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold disabled:opacity-40 cursor-pointer transition-colors shadow-sm"
                >
                  Continue as this Google User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

