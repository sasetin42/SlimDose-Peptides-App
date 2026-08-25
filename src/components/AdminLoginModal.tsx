import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Mail, Eye, EyeOff, ShieldAlert, Check, Loader2, Key } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LOCAL_ADMINS = [
  { email: 'admin@gmail.com', password: '123456#', role: 'super_admin', name: 'Super Admin' },
  { email: 'superadmin@slimdose.ph', password: 'superadmin2026', role: 'super_admin', name: 'Super Admin' },
  { email: 'admin@slimdose.ph', password: 'admin2026', role: 'admin', name: 'Store Admin' },
  { email: 'editor@slimdose.ph', password: 'editor2026', role: 'content_editor', name: 'Content Editor' },
  { email: 'ordermanager@slimdose.ph', password: 'orders2026', role: 'order_manager', name: 'Order Manager' }
];

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [shouldShake, setShouldShake] = useState(false);

  // Load lockout state on mount
  useEffect(() => {
    const lockout = localStorage.getItem('admin_lockout_until');
    if (lockout) {
      const lockTime = parseInt(lockout, 10);
      if (lockTime > Date.now()) {
        setLockoutTime(lockTime);
        setTimeLeft(Math.ceil((lockTime - Date.now()) / 1000));
      } else {
        localStorage.removeItem('admin_lockout_until');
      }
    }
  }, []);

  // Lock background scrolling when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Lockout countdown timer
  useEffect(() => {
    if (!lockoutTime) return;
    const interval = setInterval(() => {
      const remaining = Math.ceil((lockoutTime - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockoutTime(null);
        setFailedAttempts(0);
        localStorage.removeItem('admin_lockout_until');
        clearInterval(interval);
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutTime]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutTime) return;

    setStatus('loading');
    setErrorMsg('');

    // Simulate delay for biotech auth feel
    await new Promise((resolve) => setTimeout(resolve, 1200));

    let authedUser: { email: string; role: string; name: string } | null = null;

    try {
      // 1. Try Supabase
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      if (!error && data) {
        if (data.password_hash === password) {
          authedUser = {
            email: data.email,
            role: data.role,
            name: data.name || 'Store Admin',
          };
        }
      }
    } catch (err) {
      console.warn('Supabase auth error, falling back to local seed accounts:', err);
    }

    // 2. Local fallback if Supabase fails or not configured
    if (!authedUser) {
      const match = LOCAL_ADMINS.find(
        (u) => u.email === email.toLowerCase().trim() && u.password === password
      );
      if (match) {
        authedUser = {
          email: match.email,
          role: match.role,
          name: match.name,
        };
      }
    }

    if (authedUser) {
      // Success flow
      setStatus('success');
      setFailedAttempts(0);
      
      // Save session
      const sessionData = {
        ...authedUser,
        token: 'authenticated_v1',
        loginTime: Date.now()
      };
      
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem('admin_session', JSON.stringify(sessionData));

      // Log action to audit trail
      try {
        await supabase.from('audit_logs').insert([{
          actor_email: authedUser.email,
          actor_role: authedUser.role,
          action: 'LOGIN',
          details: `Admin user logged in successfully via ${rememberMe ? 'remembered session' : 'standard session'}`
        }]);
      } catch (logErr) {
        console.warn('Failed to save login audit log:', logErr);
      }

      // Delay to show success checkmark, then redirect
      setTimeout(() => {
        window.location.href = '/admin';
      }, 1500);

    } else {
      // Fail flow
      setStatus('error');
      setShouldShake(true);
      setTimeout(() => setShouldShake(false), 500);

      const nextAttempts = failedAttempts + 1;
      setFailedAttempts(nextAttempts);

      if (nextAttempts >= 5) {
        const lockoutUntil = Date.now() + 15 * 60 * 1000; // 15 minutes
        localStorage.setItem('admin_lockout_until', lockoutUntil.toString());
        setLockoutTime(lockoutUntil);
        setTimeLeft(15 * 60);
        setErrorMsg('Too many login attempts. Please try again later.');
      } else {
        setErrorMsg(`Invalid credentials. ${5 - nextAttempts} attempts remaining.`);
      }
    }
  };

  const shakeVariants = {
    shake: {
      x: [0, -10, 10, -10, 10, -5, 5, 0],
      transition: { duration: 0.4 }
    },
    idle: { x: 0 }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-navy-950/60 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={status === 'loading' || status === 'success' ? undefined : onClose}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="relative w-full max-w-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl md:rounded-3xl border border-white/20 dark:border-slate-800 shadow-2xl overflow-hidden z-10"
          >
            <motion.div
              variants={shakeVariants}
              animate={shouldShake ? 'shake' : 'idle'}
              className="w-full h-full"
            >
            {/* Success Overlay overlay */}
            <AnimatePresence>
              {status === 'success' && (
                <motion.div
                  className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 z-20 flex flex-col items-center justify-center p-6 text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.div
                    className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center text-white mb-4 shadow-lg shadow-emerald-500/20"
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.2, 1] }}
                    transition={{ duration: 0.5 }}
                  >
                    <Check className="w-8 h-8" strokeWidth={3} />
                  </motion.div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                    Authentication Granted
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Loading dashboard secure resources...
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Header */}
            <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-gray-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 dark:bg-blue-950/50 rounded-xl">
                  <Key className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-none">
                    Admin Dashboard Access
                  </h2>
                  <p className="text-xs text-red-500 dark:text-red-400 font-semibold mt-1">
                    Authorized Personnel Only
                  </p>
                </div>
              </div>
              {status !== 'loading' && status !== 'success' && (
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Body */}
            <div className="p-6">
              {/* Logo block */}
              <div className="flex flex-col items-center mb-6">
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-blue-500/20 shadow-md">
                  <img
                    src="/assets/logo.jpeg"
                    alt="SlimDose Peptides"
                    className="w-full h-full object-cover"
                  />
                </div>
                <h1 className="text-base font-extrabold text-blue-700 dark:text-blue-400 mt-2">
                  SlimDose Peptides
                </h1>
              </div>

              {lockoutTime ? (
                /* Lockout View */
                <div className="text-center py-4 px-3 bg-red-50/50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/30 rounded-2xl mb-4">
                  <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-2 animate-pulse" />
                  <h3 className="text-sm font-bold text-red-800 dark:text-red-400 mb-1">
                    Temporary Lockout Active
                  </h3>
                  <p className="text-xs text-red-600 dark:text-red-300">
                    Too many failed login attempts.
                  </p>
                  <p className="text-sm font-extrabold text-red-700 dark:text-red-400 mt-3">
                    Try again in {Math.floor(timeLeft / 60)}m {timeLeft % 60}s
                  </p>
                </div>
              ) : (
                /* Standard Login Form */
                <form onSubmit={handleLogin} className="space-y-4">
                  {errorMsg && (
                    <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-xl text-xs flex items-center gap-2 font-medium">
                      <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {/* Email Field */}
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-gray-400" />
                    <label htmlFor="admin-email" className="sr-only">Email Address</label>
                    <input
                      type="email"
                      id="admin-email"
                      name="email"
                      value={email}
                      autoComplete="email" onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email Address"
                      required
                      disabled={status === 'loading'}
                      className="w-full pl-11 pr-4 py-3 bg-gray-50/50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl outline-none transition-all text-sm text-gray-900 dark:text-white"
                    />
                  </div>

                  {/* Password Field */}
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-gray-400" />
                    <label htmlFor="admin-password" className="sr-only">Password</label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="admin-password"
                      name="password"
                      value={password}
                      autoComplete="current-password" onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      required
                      disabled={status === 'loading'}
                      className="w-full pl-11 pr-11 py-3 bg-gray-50/50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl outline-none transition-all text-sm text-gray-900 dark:text-white"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                    </button>
                  </div>

                  {/* Options */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <label htmlFor="admin-rememberMe" className="flex items-center gap-2 text-gray-600 dark:text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        id="admin-rememberMe"
                        name="rememberMe"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4.5 h-4.5 rounded border-gray-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 dark:bg-slate-800"
                      />
                      <span>Remember Me</span>
                    </label>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        alert('Please contact your lead administrator to recover or reset your secure access credentials.');
                      }}
                      className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                    >
                      Forgot Password?
                    </a>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-3 pt-3">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={status === 'loading'}
                      className="py-3 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-350 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-xl font-bold transition-all text-sm focus:outline-none"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={status === 'loading'}
                      className="py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all text-sm flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/10 hover:shadow-lg hover:-translate-y-0.5 focus:outline-none disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {status === 'loading' ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <span>Access Dashboard</span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
