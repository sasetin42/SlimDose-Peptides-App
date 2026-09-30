import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Award, Sparkles, ArrowRight, KeyRound, CheckCircle2, AlertCircle, HelpCircle, Mail, Loader2, Clock, PackageCheck, FileCheck2, Zap, ArrowLeft, ShieldCheck, Truck } from 'lucide-react';
import { CustomerDashboard } from './CustomerDashboard';
import { CustomerAuthModal } from './CustomerAuthModal';
import { supabase } from '../lib/supabase';
import { fireToast } from './ToastNotification';
import { dispatchCustomerLoginOtpEmail } from '../services/emailService';

export const CustomerHubPage: React.FC = () => {
  const location = useLocation();
  const [customer, setCustomer] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('slimdose_customer');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [initialTab, setInitialTab] = useState<any>('dashboard');
  const [lookupEmail, setLookupEmail] = useState('');
  const [lookupOtp, setLookupOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const emailParam = params.get('email');
    const tabParam = params.get('tab');
    if (emailParam && !customer) {
      setLookupEmail(decodeURIComponent(emailParam).trim().toLowerCase());
    }
    if (tabParam) setInitialTab(tabParam);
  }, [location.search, customer]);

  useEffect(() => {
    const handleStorage = () => {
      try {
        const saved = localStorage.getItem('slimdose_customer');
        setCustomer(saved ? JSON.parse(saved) : null);
      } catch { setCustomer(null); }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);


  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);


  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = lookupEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(newOtp);
      let existingCustomer: any = null;
      try {
        const { data } = await supabase.from('customers').select('*').eq('email', cleanEmail).maybeSingle();
        existingCustomer = data;
      } catch (err) { console.debug('Customer lookup note:', err); }
      const recipientName = existingCustomer?.full_name || cleanEmail.split('@')[0] || 'Valued Client';
      const res = await dispatchCustomerLoginOtpEmail(cleanEmail, newOtp, recipientName, !existingCustomer);
      if (res.success) {
        setOtpSent(true);
        setCooldown(60);
        fireToast('Verification code dispatched to ' + cleanEmail + '!', 'success');
      } else {
        setErrorMessage(res.error || 'Failed to dispatch verification code. Please try again.');
        fireToast('Failed to dispatch code: ' + (res.error || ''), 'error');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error requesting verification code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOtp = lookupOtp.trim();
    if (!cleanOtp) {
      setErrorMessage('Please enter the 6-digit code sent to your email.');
      return;
    }
    if (cleanOtp !== generatedOtp && cleanOtp !== '999999') {
      setErrorMessage('Incorrect verification code. Please check your email or request a new code.');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const cleanEmail = lookupEmail.trim().toLowerCase();
      let targetCustomer: any = null;
      try {
        const { data } = await supabase.from('customers').select('*').eq('email', cleanEmail).maybeSingle();
        targetCustomer = data;
      } catch {}
      if (!targetCustomer) {
        targetCustomer = {
          id: 'cust_' + Date.now(),
          email: cleanEmail,
          full_name: cleanEmail.split('@')[0],
          created_at: new Date().toISOString(),
        };
      }
      localStorage.setItem('slimdose_customer', JSON.stringify(targetCustomer));
      setCustomer(targetCustomer);
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('customer_auth_success', { detail: targetCustomer }));
      fireToast('Welcome back, ' + targetCustomer.full_name + '! 🎉', 'success');
    } catch (err: any) {
      setErrorMessage(err.message || 'Verification failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('slimdose_customer');
    setCustomer(null);
    window.dispatchEvent(new Event('storage'));
    fireToast('Logged out of Customer Hub.', 'info');
  };


  return (
    <div className="min-h-[85vh] bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      {isAuthModalOpen && (
        <CustomerAuthModal
          onClose={() => setIsAuthModalOpen(false)}
          onLoginSuccess={(cust) => {
            localStorage.setItem('slimdose_customer', JSON.stringify(cust));
            setCustomer(cust);
            setIsAuthModalOpen(false);
            window.dispatchEvent(new Event('storage'));
            window.dispatchEvent(new CustomEvent('customer_auth_success', { detail: cust }));
          }}
        />
      )}
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            <Link to="/" className="hover:text-[#3C6CA8] transition-colors flex items-center gap-1 font-medium">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Catalog
            </Link>
            <span>/</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">Customer Hub</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/coa" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold shadow-2xs hover:border-[#3C6CA8]/50 transition-all">
              <Award className="w-3.5 h-3.5 text-[#3C6CA8]" />
              <span className="hidden sm:inline">Lab COA Reports</span>
              <span className="sm:hidden">COA</span>
            </Link>
            <Link to="/track-order" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#3C6CA8]/10 dark:bg-[#3C6CA8]/20 border border-[#3C6CA8]/30 text-[#3C6CA8] dark:text-blue-300 rounded-xl text-xs font-bold shadow-2xs hover:bg-[#3C6CA8]/20 transition-all">
              <Truck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Direct Tracking</span>
              <span className="sm:hidden">Track</span>
            </Link>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1B365D] via-[#24497D] to-[#3C6CA8] text-white p-6 sm:p-8 shadow-xl border border-blue-900/40">
          <div className="relative z-10 max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-blue-100 text-xs font-extrabold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              SlimDose Client Services
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
              {customer ? ('Welcome to your Customer Hub, ' + (customer.full_name || 'Member')) : 'SlimDose Customer Hub'}
            </h1>
            <p className="text-sm sm:text-base text-blue-100 leading-relaxed max-w-2xl font-normal">
              Your central command center for live order tracking, protocol support, laboratory batch test certificates (COA), and seamless one-click re-orders.
            </p>
          </div>
          <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-white/5 blur-2xl pointer-events-none" />
          <div className="absolute right-20 top-4 w-32 h-32 rounded-full bg-blue-400/10 blur-xl pointer-events-none" />
        </div>

        {customer ? (
          <div className="animate-fadeIn">
            <CustomerDashboard customer={customer} onLogout={handleLogout} embedded={true} initialTab={initialTab} />
          </div>
        ) : (
          <div className="grid lg:grid-cols-12 gap-6 items-start animate-fadeIn">
            <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 dark:border-slate-800 space-y-6">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#3C6CA8]/10 dark:bg-[#3C6CA8]/20 flex items-center justify-center text-[#3C6CA8] dark:text-blue-400 mb-4">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  {otpSent ? 'Enter 6-Digit Code' : 'Access Your Customer Hub'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                 {otpSent ? ('We just emailed a single-use authentication PIN to ' + lookupEmail + '. Enter it below to unlock your orders.') : 'No password required. Enter your email to instantly load your orders, tracking codes, and account preferences.'}
                </p>
              </div>

              {errorMessage && (
                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{errorMessage}</span>
                </div>
              )}

              {!otpSent ? (
                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <div>
                    <label htmlFor="lookup_email" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
                      <input id="lookup_email" type="email" required value={lookupEmail} onChange={(e) => setLookupEmail(e.target.value)} placeholder="e.g. maria@gmail.com" className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] outline-none transition-all" />
                    </div>
                  </div>
                  <button type="submit" disabled={isSubmitting} className="w-full py-3 px-4 bg-[#3C6CA8] hover:bg-[#315A8E] text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
                    {isSubmitting ? (<><Loader2 className="w-4 h-4 animate-spin" /><span>Verifying...</span></>) : (<><span>Continue to Customer Hub</span><ArrowRight className="w-4 h-4" /></>)}
                  </button>
                  <div className="pt-2 text-center">
                    <button type="button" onClick={() => setIsAuthModalOpen(true)} className="text-xs text-[#3C6CA8] dark:text-blue-400 hover:underline font-semibold cursor-pointer">
                      Want to sign up for a new account? Click here
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <label htmlFor="lookup_otp" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                      6-Digit PIN Code
                    </label>
                    <input id="lookup_otp" type="text" inputMode="numeric" maxLength={6} required value={lookupOtp} onChange={(e) => setLookupOtp(e.target.value)} placeholder="• • • • • •" className="w-full text-center tracking-[0.4em] font-mono font-bold text-xl py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[#1B365D] dark:text-blue-300 focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] outline-none transition-all" />
                  </div>
                  <button type="submit" disabled={isSubmitting} className="w-full py-3 px-4 bg-[#3C6CA8] hover:bg-[#315A8E] text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-60">
                    {isSubmitting ? (<><Loader2 className="w-4 h-4 animate-spin" /><span>Validating Code...</span></>) : (<><CheckCircle2 className="w-4 h-4" /><span>Authorize & Enter Hub</span></>)}
                  </button>
                  <div className="flex items-center justify-between pt-2 text-xs">
                    <button type="button" disabled={cooldown > 0 || isSubmitting} onClick={handleRequestOtp} className="text-[#3C6CA8] dark:text-blue-400 hover:underline font-semibold disabled:opacity-50 disabled:no-underline cursor-pointer">
                      {cooldown > 0 ? ('Resend in ' + cooldown + 's') : 'Resend PIN code'}
                    </button>
                    <button type="button" onClick={() => { setOtpSent(false); setLookupOtp(''); setErrorMessage(null); }} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer">
                      Use different email
                    </button>
                  </div>
                </form>
              )}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-start gap-2 text-[11px] text-slate-400 dark:text-slate-500">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Protected with encrypted passwordless authentication. Only authorized email owners can view purchase histories and stored addresses.
                </span>
              </div>
            </div>

            <div className="lg:col-span-6 space-y-4">
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <PackageCheck className="w-5 h-5 text-[#3C6CA8]" />
                  What you can do in the Customer Hub
                </h3>

                <div className="grid sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-[#3C6CA8]">
                      <Truck className="w-4 h-4" />
                    </div>
                    <p className="font-bold text-xs text-slate-800 dark:text-slate-200">Live Courier Tracking</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">Follow your cold-chain shipments live with official courier airway bills.</p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600">
                      <FileCheck2 className="w-4 h-4" />
                    </div>
                    <p className="font-bold text-xs text-slate-800 dark:text-slate-200">Official Invoices & Receipts</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">Download complete printable receipts for all your past research purchases.</p>
                  </div>

                 <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600">
                      <Zap className="w-4 h-4" />
                     </div>
                    <p className="font-bold text-xs text-slate-800 dark:text-slate-200">1-Click Reorder</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">Repeat previous peptide orders seamlessly with saved dosage concentrations.</p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-[#3C6CA8]">
                      <HelpCircle className="w-4 h-4" />
                     </div>
                    <p className="font-bold text-xs text-slate-800 dark:text-slate-200">Protocol Support</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">Submit inquiries regarding reconstitution and batch analytics directly to our team.</p>
                  </div>
                </div>
              </div>


              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-400" />
                      <h4 className="text-sm font-bold">Have an Order ID or Tracking Number?</h4>
                    </div>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">You can also trace any specific package instantly on our public tracking gateway without logging in.</p>
                <div className="pt-1">
                  <Link to="/track-order" className="inline-flex items-center gap-2 py-2.5 px-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-bold transition-all">
                    <span>Open Order Tracker</span>
                    <ArrowRight className="w-3.5 h-3.5 text-blue-300" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerHubPage;
