import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { Lock, User, Sparkles, ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { loginWithNumber, settings, language, setLanguage, t } = useStore();
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
      setErrorMsg(language === 'km' ? 'សូមបញ្ចូលលេខសម្គាល់គណនី ឬឈ្មោះបុគ្គលិក' : 'Please enter your assigned User Number or Staff ID');
      return;
    }
    if (!password) {
      setErrorMsg(language === 'km' ? 'សូមបញ្ចូលពាក្យសម្ងាត់' : 'Please enter your password');
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

  const storeTitle = settings?.StoreName || 'Puthipor Shop';

  return (
    <div className="min-h-screen bg-stone-900 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden select-none">
      {/* Language Switcher in top corner */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-stone-800/80 border border-stone-700 rounded-lg p-1 text-xs">
        <button
          type="button"
          onClick={() => setLanguage('en')}
          className={`px-2.5 py-1 rounded font-medium cursor-pointer transition-colors ${
            language === 'en' ? 'bg-pink-600 text-white font-bold' : 'text-stone-400 hover:text-white'
          }`}
        >
          English
        </button>
        <button
          type="button"
          onClick={() => setLanguage('km')}
          className={`px-2.5 py-1 rounded font-medium cursor-pointer transition-colors ${
            language === 'km' ? 'bg-pink-600 text-white font-bold' : 'text-stone-400 hover:text-white'
          }`}
        >
          ភាសាខ្មែរ
        </button>
      </div>

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
            {storeTitle}
          </h1>
          <p className="text-stone-400 text-xs sm:text-sm mt-1">
            {settings?.Tagline || (language === 'km' ? 'ហាងសម្លៀកបំពាក់ ភុទ្ធីពរ · គ្រប់គ្រងស្តុក និង POS' : 'Clothing Store & POS System')}
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
              <div className="leading-relaxed">
                <div>{errorMsg}</div>
                <div className="text-[10px] text-red-400 mt-1">
                  Tip: Check your User ID (e.g. 1001, 1002, 1003) or Staff Name, and verify uppercase/lowercase in your password.
                </div>
              </div>
            </div>
          )}

          {/* Quick Staff Account Selector */}
          <div className="mb-4">
            <span className="text-[11px] text-stone-400 font-medium block mb-1.5">
              Select Staff Account:
            </span>
            <div className="grid grid-cols-3 gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => {
                  setUserNumber('1001');
                  setErrorMsg(null);
                }}
                className={`px-2 py-1.5 rounded-lg border text-left transition-all ${
                  userNumber.trim() === '1001'
                    ? 'bg-pink-950/70 border-pink-500 text-pink-200 ring-1 ring-pink-500/50'
                    : 'bg-stone-900/60 border-stone-700 text-stone-300 hover:bg-stone-700/60 hover:text-white'
                }`}
              >
                <div className="font-mono font-bold text-[11px]">#1001</div>
                <div className="text-[10px] text-stone-400 truncate">Admin</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setUserNumber('1002');
                  setErrorMsg(null);
                }}
                className={`px-2 py-1.5 rounded-lg border text-left transition-all ${
                  userNumber.trim() === '1002'
                    ? 'bg-pink-950/70 border-pink-500 text-pink-200 ring-1 ring-pink-500/50'
                    : 'bg-stone-900/60 border-stone-700 text-stone-300 hover:bg-stone-700/60 hover:text-white'
                }`}
              >
                <div className="font-mono font-bold text-[11px]">#1002</div>
                <div className="text-[10px] text-stone-400 truncate">Much (Admin)</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setUserNumber('1003');
                  setErrorMsg(null);
                }}
                className={`px-2 py-1.5 rounded-lg border text-left transition-all ${
                  userNumber.trim() === '1003'
                    ? 'bg-pink-950/70 border-pink-500 text-pink-200 ring-1 ring-pink-500/50'
                    : 'bg-stone-900/60 border-stone-700 text-stone-300 hover:bg-stone-700/60 hover:text-white'
                }`}
              >
                <div className="font-mono font-bold text-[11px]">#1003</div>
                <div className="text-[10px] text-stone-400 truncate">May (Staff)</div>
              </button>
            </div>
          </div>

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
                  placeholder="User Number (e.g. 1001, 1002, 1003)"
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
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Validating Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Secure access notice */}
          <div className="mt-5 p-3.5 rounded-xl bg-stone-900/80 border border-stone-700/60 text-xs text-stone-400">
            <p className="text-[11px] leading-relaxed text-stone-400 text-center">
              Multi-staff authorized portal. Account credentials are validated directly with your encrypted Firestore cloud database.
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
