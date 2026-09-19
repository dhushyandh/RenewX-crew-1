import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { RefreshCw, Mail, Lock, ArrowRight, ShieldCheck } from 'lucide-react';

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters. Use a mix of letters, numbers, and symbols.');
      return;
    }

    setLoading(true);
    setError(null);

    const fn = mode === 'login' ? signIn : signUp;
    const { error: err } = await fn(email.trim(), password);

    if (err) {
      if (err.includes('weak_password') || err.includes('pwned')) {
        setError('That password is too common or easily guessed. Please use a stronger password with a mix of letters, numbers, and symbols.');
      } else if (err.includes('Invalid login credentials')) {
        setError('Incorrect email or password. Please try again.');
      } else if (err.includes('already registered') || err.includes('User already registered')) {
        setError('An account with this email already exists. Try logging in.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-900 to-slate-800 px-6 pt-16 pb-8 overflow-y-auto">
      <div className="flex items-center gap-3 mb-10">
        <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/30">
          <RefreshCw className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">
            Renew<span className="text-emerald-500">X</span>
          </h1>
          <p className="text-xs text-gray-400">Certified Refurbished Tech</p>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">
          {mode === 'login' ? 'Welcome back' : 'Create your account'}
        </h2>
        <p className="text-sm text-gray-400">
          {mode === 'login'
            ? 'Sign in to shop renewed electronics and track orders.'
            : 'Join RenewX to shop premium refurbished tech with warranty.'}
        </p>
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <label className="text-xs font-medium text-gray-400 mb-1.5 block">Email</label>
          <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-white/5 border border-white/10">
            <Mail className="w-4 h-4 text-gray-500" />
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none"
              autoCapitalize="none"
              autoComplete="email"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-400 mb-1.5 block">Password</label>
          <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-white/5 border border-white/10">
            <Lock className="w-4 h-4 text-gray-500" />
            <input
              type="password"
              placeholder={mode === 'login' ? 'Enter password' : 'Min. 8 characters, mix of letters & numbers'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="flex items-center justify-center gap-2 bg-emerald-600 text-white py-4 rounded-xl font-semibold text-sm active:scale-[0.98] transition-transform disabled:opacity-50 mb-4"
      >
        {loading ? (
          <RefreshCw className="w-4 h-4 animate-spin" />
        ) : (
          <>
            {mode === 'login' ? 'Sign In' : 'Create Account'}
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      <button
        onClick={() => {
          setMode(mode === 'login' ? 'signup' : 'login');
          setError(null);
        }}
        className="text-center text-sm text-gray-400"
      >
        {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
        <span className="text-emerald-500 font-semibold">
          {mode === 'login' ? 'Sign up' : 'Sign in'}
        </span>
      </button>

      {mode === 'signup' && (
        <div className="mt-8 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-gray-500" />
          <span className="text-[11px] text-gray-500">The first account created becomes the admin</span>
        </div>
      )}
    </div>
  );
}
