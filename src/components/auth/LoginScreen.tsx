import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { Lock, User, Sparkles, ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { loginWithNumber } = useStore();
  const [userNumber, setUserNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedNumber = userNumber.trim();
    if (!trimmedNumber) {
      setErrorMsg('Please enter your assigned User Number or Staff ID');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your password');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await loginWithNumber(trimmedNumber, password);
      if (!res.success) {
        setErrorMsg(res.error || 'Authentication failed. Please verify your credentials.');
      }
    } catch {
      setErrorMsg('An unexpected error occurred while validating credentials with the cloud database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-900 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden select-none">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(#ec4899_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-pink-600 to-rose-400 text-white shadow-xl shadow-pink-600/30 mb-4 ring-4 ring-pink-500/20">
            <Sparkles className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-serif font-bold text-white tracking-tight">
            Girl Dress Shop
          </h1>
          <p className="text-stone-400 text-xs sm:text-sm mt-1">
            Boutique Staff & Administrator Portal
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-stone-800/90 backdrop-blur-xl border border-stone-700/80 rounded-2xl shadow-2xl p-6 sm:p-8">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Sign In</h2>
              <span className="text-[11px] text-pink-400 font-medium px-2 py-0.5 rounded-full bg-pink-950/60 border border-pink-800/50">
                Authorized Access
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-1">
              Enter your assigned User Number and Password to access the inventory and sales terminal.
            </p>
          </div>

          {/* Validation Error Banner */}
          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl bg-red-950/70 border border-red-800 text-red-300 text-xs flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-300 uppercase tracking-wider mb-1.5">
                User Number / Staff ID
              </label>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={userNumber}
                  onChange={(e) => {
                    setUserNumber(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="Enter User Number or ID"
                  className="w-full pl-10 pr-4 py-2.5 bg-stone-900/80 border border-stone-700 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all font-mono-numbers text-sm"
                  autoFocus
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="Enter password"
                  className="w-full pl-10 pr-11 py-2.5 bg-stone-900/80 border border-stone-700 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-200 transition-colors cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-5 py-3 px-4 bg-gradient-to-r from-pink-600 to-rose-500 hover:from-pink-500 hover:to-rose-400 text-white font-medium rounded-xl shadow-lg shadow-pink-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 text-sm"
            >
              <span>{isSubmitting ? 'Validating Credentials...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Secure access notice - completely free of any credential leaks */}
          <div className="mt-5 p-3.5 rounded-xl bg-stone-900/80 border border-stone-700/60 text-xs text-stone-400">
            <p className="text-[11px] leading-relaxed text-stone-400 text-center">
              Authorized personnel only. New user accounts must be created by the store administrator inside Admin Settings.
            </p>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center mt-6 text-xs text-stone-500">
          Girl Dress Shop • Multi-Session Firestore Cloud Persistence
        </div>
      </div>
    </div>
  );
};
