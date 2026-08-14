import React, { useState } from 'react';
import { X, Lock, Mail, User, Phone, Loader2, KeyRound, LogIn, UserPlus, Eye, EyeOff, ShieldCheck, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { fireToast } from './ToastNotification';

// Helper function to hash password client-side using Web Crypto API
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

interface CustomerAuthModalProps {
  onClose: () => void;
  onLoginSuccess: (customer: any) => void;
}

export const CustomerAuthModal: React.FC<CustomerAuthModalProps> = ({ onClose, onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!email.trim() || !password.trim()) {
      fireToast('Please enter your email and password.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const emailLower = email.trim().toLowerCase();
      const pwHash = await sha256(password);

      if (mode === 'register') {
        if (password !== confirmPassword) {
          fireToast('Passwords do not match.', 'error');
          setLoading(false);
          return;
        }

        if (!fullName.trim() || !phone.trim()) {
          fireToast('Please fill in your name and phone number.', 'warning');
          setLoading(false);
          return;
        }

        // Register in Supabase & Firebase Firestore/Auth
        let registeredData: any = null;

        // 1. Create account in Firebase Auth
        try {
          const { createUserWithEmailAndPassword } = await import('firebase/auth');
          const { auth } = await import('../lib/firebase');
          await createUserWithEmailAndPassword(auth, emailLower, password);
        } catch (fbAuthErr: any) {
          console.warn('Firebase Auth notice (continuing with database sync):', fbAuthErr);
        }

        // 2. Insert into Supabase / Firestore customers collection
        const customerRecord = {
          full_name: fullName.trim(),
          email: emailLower,
          phone: phone.trim(),
          password_hash: pwHash,
          created_at: new Date().toISOString()
        };

        const { data, error } = await supabase
          .from('customers')
          .insert([customerRecord])
          .select()
          .single();

        if (error) {
          if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('exists')) {
            throw new Error('An account with this email already exists.');
          }
          console.warn('Database insert notice, using created session:', error);
          registeredData = { id: `cust-${Date.now()}`, ...customerRecord };
        } else {
          registeredData = data;
        }

        // Save local session
        localStorage.setItem('slimdose_customer', JSON.stringify(registeredData));

        fireToast('Account created successfully! 🎉', 'success');
        onLoginSuccess(registeredData);
      } else {
        // Login: check credentials in Supabase / Local session
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .eq('email', emailLower)
          .eq('password_hash', pwHash)
          .maybeSingle();

        let loggedInCustomer = data;

        if (!loggedInCustomer) {
          // Check if Firebase Auth login succeeds
          try {
            const { signInWithEmailAndPassword } = await import('firebase/auth');
            const { auth } = await import('../lib/firebase');
            const userCred = await signInWithEmailAndPassword(auth, emailLower, password);
            if (userCred.user) {
              loggedInCustomer = {
                id: userCred.user.uid,
                email: userCred.user.email || emailLower,
                full_name: userCred.user.displayName || emailLower.split('@')[0],
                phone: phone || ''
              };
            }
          } catch (fbLoginErr) {
            console.warn('Firebase Auth login attempt notice:', fbLoginErr);
          }
        }

        if (!loggedInCustomer) {
          fireToast('Invalid email or password.', 'error');
          setLoading(false);
          return;
        }

        localStorage.setItem('slimdose_customer', JSON.stringify(loggedInCustomer));
        fireToast(`Welcome back, ${loggedInCustomer.full_name || loggedInCustomer.name || 'Member'}! 👋`, 'success');
        onLoginSuccess(loggedInCustomer);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      fireToast(err.message || 'Authentication failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div 
        className={`relative w-full ${mode === 'login' ? 'max-w-md' : 'max-w-xl'} bg-white dark:bg-slate-900 shadow-2xl rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800 transition-all duration-300`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Decorative Color Accent Bar */}
        <div className="h-1.5 w-full bg-[#3C6CA8]" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl overflow-hidden ring-2 ring-[#3C6CA8]/30 flex-shrink-0 shadow-sm">
              <img src="/assets/logo.jpeg" alt="SlimDose Peptides" className="w-full h-full object-cover" />
            </div>
            <div>
              <h3 className="font-heading text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-tight">
                {mode === 'login' ? 'Customer Sign In' : 'Create Account'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {mode === 'login' ? 'Access your SlimDose portal & order tracking' : 'Join SlimDose for faster checkout & lab test access'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#3C6CA8]"
            aria-label="Close modal"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleAuth} className="p-6 space-y-4 text-left">
          {mode === 'register' && (
            <div className="bg-[#3C6CA8]/5 dark:bg-slate-950 border border-[#3C6CA8]/20 dark:border-[#3C6CA8]/40 rounded-2xl p-4 mb-3 text-xs space-y-2.5 shadow-2xs">
              <div className="flex items-center gap-2 text-[#3C6CA8] dark:text-blue-300">
                <Sparkles className="w-4 h-4 text-[#3C6CA8]" />
                <p className="font-extrabold text-xs uppercase tracking-wider">Member Perks &amp; Features</p>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] text-slate-700 dark:text-slate-300 font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3C6CA8]" />
                  <span>Express 1-Click Checkout</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3C6CA8]" />
                  <span>Real-time Order Tracking</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3C6CA8]" />
                  <span>Order History Archives</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3C6CA8]" />
                  <span>Verified COA Lab Tests</span>
                </div>
              </div>
            </div>
          )}

          {mode === 'register' ? (
            <>
              <div>
                <label htmlFor="register-fullName" className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  <User className="w-3.5 h-3.5 text-[#3C6CA8]" /> Full Name
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-7 h-7 rounded-lg bg-[#3C6CA8]/10 flex items-center justify-center border border-[#3C6CA8]/20">
                    <User className="text-[#3C6CA8] w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    id="register-fullName"
                    name="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full text-xs sm:text-sm pl-12 pr-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#3C6CA8] focus:border-transparent transition-all"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="register-email" className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#3C6CA8]" /> Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-7 h-7 rounded-lg bg-[#3C6CA8]/10 flex items-center justify-center border border-[#3C6CA8]/20">
                      <Mail className="text-[#3C6CA8] w-3.5 h-3.5" />
                    </div>
                    <input
                      type="email"
                      id="register-email"
                      name="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jane.doe@example.com"
                      className="w-full text-xs sm:text-sm pl-12 pr-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#3C6CA8] focus:border-transparent transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="register-phone" className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#3C6CA8]" /> Phone Number
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-7 h-7 rounded-lg bg-[#3C6CA8]/10 flex items-center justify-center border border-[#3C6CA8]/20">
                      <Phone className="text-[#3C6CA8] w-3.5 h-3.5" />
                    </div>
                    <input
                      type="tel"
                      id="register-phone"
                      name="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 09123456789"
                      className="w-full text-xs sm:text-sm pl-12 pr-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#3C6CA8] focus:border-transparent transition-all"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="register-password" className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#3C6CA8]" /> Password
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-7 h-7 rounded-lg bg-[#3C6CA8]/10 flex items-center justify-center border border-[#3C6CA8]/20">
                      <Lock className="text-[#3C6CA8] w-3.5 h-3.5" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="register-password"
                      name="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full text-xs sm:text-sm pl-12 pr-10 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#3C6CA8] focus:border-transparent transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="register-confirmPassword" className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#3C6CA8]" /> Confirm Password
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-7 h-7 rounded-lg bg-[#3C6CA8]/10 flex items-center justify-center border border-[#3C6CA8]/20">
                      <Lock className="text-[#3C6CA8] w-3.5 h-3.5" />
                    </div>
                    <input
                      type="password"
                      id="register-confirmPassword"
                      name="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full text-xs sm:text-sm pl-12 pr-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#3C6CA8] focus:border-transparent transition-all"
                      required
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label htmlFor="login-email" className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#3C6CA8]" /> Email Address
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-7.5 h-7.5 rounded-xl bg-[#3C6CA8]/10 flex items-center justify-center border border-[#3C6CA8]/20">
                    <Mail className="text-[#3C6CA8] w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    id="login-email"
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane.doe@example.com"
                    className="w-full text-xs sm:text-sm pl-12 pr-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#3C6CA8] focus:border-transparent transition-all shadow-2xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#3C6CA8]" /> Password
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-7.5 h-7.5 rounded-xl bg-[#3C6CA8]/10 flex items-center justify-center border border-[#3C6CA8]/20">
                    <Lock className="text-[#3C6CA8] w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="login-password"
                    name="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full text-xs sm:text-sm pl-12 pr-10 py-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#3C6CA8] focus:border-transparent transition-all shadow-2xs"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Interactive Submit Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 bg-[#3C6CA8] hover:bg-[#315A8E] text-white rounded-2xl font-extrabold text-sm shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-4 group focus:outline-none focus:ring-2 focus:ring-[#3C6CA8] focus:ring-offset-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Verifying Credentials...
              </>
            ) : mode === 'login' ? (
              <>
                <span>Sign In to Account</span>
                <LogIn className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            ) : (
              <>
                <span>Create New Account</span>
                <UserPlus className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </>
            )}
          </button>

          {/* Mode Switcher Interactive Button */}
          <div className="pt-1 text-center">
            <button
              type="button"
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-extrabold text-[#3C6CA8] dark:text-blue-300 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#3C6CA8]"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#3C6CA8]" />
              <span>
                {mode === 'login'
                  ? "Don't have an account? Register here"
                  : 'Already have an account? Sign In'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
