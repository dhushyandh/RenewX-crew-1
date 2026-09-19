import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { ShieldAlert, Lock, ArrowLeft, Store, LogOut, Loader2 } from 'lucide-react';

export interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
  requireAuth?: boolean;
  title?: string;
  message?: string;
}

export default function ProtectedRoute({
  children,
  adminOnly = false,
  requireAuth = true,
  title,
  message,
}: ProtectedRouteProps) {
  const navigate = useNavigate();
  const { user, isAdmin, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <p className="text-sm font-medium">Verifying access permissions…</p>
      </div>
    );
  }

  // Check 1: Must be authenticated
  if (requireAuth && !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh] px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-4 shadow-sm">
          <Lock className="w-8 h-8 text-slate-800" />
        </div>
        <span className="inline-block px-3 py-1 rounded-full text-xs font-black tracking-wider bg-slate-100 text-slate-700 mb-3 uppercase">
          Authentication Required
        </span>
        <h2 className="text-2xl font-black text-slate-900 mb-2">
          {title || 'Sign In to RenewX'}
        </h2>
        <p className="text-sm text-slate-500 max-w-sm mb-6 leading-relaxed">
          {message || 'You must be signed in to your RenewX account to access this secure area.'}
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs">
          <button
            onClick={() => navigate('/account')}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-500 font-bold text-slate-950 transition shadow-sm"
          >
            Sign In to Continue
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // Check 2: Must have admin role if adminOnly
  if (adminOnly && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh] px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center mb-4 shadow-sm">
          <ShieldAlert className="w-8 h-8 text-amber-700" />
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black tracking-wider bg-amber-100 text-amber-900 mb-3 uppercase">
          <span className="w-2 h-2 rounded-full bg-amber-600" />
          Admin Privileges Required
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2">
          {title || 'Access Restricted'}
        </h2>
        <p className="text-sm text-slate-500 max-w-md mb-6 leading-relaxed">
          {message ||
            `The RenewX Admin Control Center is restricted to authorized store administrators. Your account (${user?.email || 'current user'}) does not have administrative permissions.`}
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs">
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-500 font-bold text-slate-950 transition shadow-sm"
          >
            <Store className="w-4 h-4" />
            Return to Store
          </button>
          <button
            onClick={async () => {
              await signOut();
              navigate('/');
            }}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold transition"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
