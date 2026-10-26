import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { ShieldAlert, ArrowRight, Loader2 } from 'lucide-react';

export interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  onUnauthorizedRole?: (role: UserRole) => void;
  onUnauthenticated?: () => void;
  fallbackView?: React.ReactNode;
}

/**
 * Route Guard wrapper to enforce Role-Based Access Control (RBAC).
 * Automatically redirects unauthorized users (e.g. coaches attempting to access Admin-only routes)
 * to their respective dashboard.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  onUnauthorizedRole,
  onUnauthenticated,
  fallbackView
}) => {
  const { currentUser, role, loading } = useAuth();

  const isRoleAllowed = !allowedRoles || (currentUser && allowedRoles.includes(currentUser.role));

  useEffect(() => {
    if (loading) return;

    if (!currentUser) {
      if (onUnauthenticated) {
        onUnauthenticated();
      }
      return;
    }

    if (!isRoleAllowed) {
      if (onUnauthorizedRole) {
        onUnauthorizedRole(currentUser.role);
      }
    }
  }, [currentUser, isRoleAllowed, loading, onUnauthorizedRole, onUnauthenticated]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
        <Loader2 className="w-8 h-8 text-red-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-neutral-600">Verifying session permissions...</p>
      </div>
    );
  }

  // Not authenticated
  if (!currentUser) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 mb-4 shadow-sm">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-neutral-900 uppercase font-display mb-2">
          Authentication Required
        </h2>
        <p className="text-sm text-neutral-600 max-w-md mb-6">
          You must be signed in to access this secured portal view.
        </p>
        <button
          onClick={() => onUnauthenticated?.()}
          className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm flex items-center gap-2 cursor-pointer"
        >
          <span>Sign In</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Role Unauthorized
  if (!isRoleAllowed) {
    if (fallbackView) {
      return <>{fallbackView}</>;
    }

    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-4 shadow-sm">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-neutral-900 uppercase font-display mb-2">
          Access Restricted &bull; {currentUser.role.toUpperCase()}
        </h2>
        <p className="text-sm text-neutral-600 max-w-md mb-6">
          This area is restricted to {allowedRoles?.map(r => r.toUpperCase()).join(' or ')} accounts.
          {currentUser.role === 'coach' ? ' Redirecting you to your Coach Dashboard...' : ''}
        </p>
        {onUnauthorizedRole && (
          <button
            onClick={() => onUnauthorizedRole(currentUser.role)}
            className="px-6 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <span>Return to {currentUser.role === 'coach' ? 'Coach Dashboard' : 'Client Dashboard'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  return <>{children}</>;
};
