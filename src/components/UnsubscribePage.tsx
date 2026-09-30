import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MailCheck, Loader2, ShieldOff } from 'lucide-react';
import { suppressEmail, isSuppressed } from '../lib/marketing';

/**
 * One-click marketing unsubscribe page (/#/unsubscribe?email=…).
 * Adds the email to the suppression list so every marketing surface
 * (bulk sender, campaigns, follow-ups) skips it permanently.
 */
const UnsubscribePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  // Accept both path query (/unsubscribe?email=) and hash query (/#/unsubscribe?email=)
  const hashQuery = typeof window !== 'undefined' && window.location.hash.includes('?')
    ? new URLSearchParams(window.location.hash.slice(window.location.hash.indexOf('?') + 1))
    : null;
  const email = (searchParams.get('email') || hashQuery?.get('email') || '').trim().toLowerCase();

  const [state, setState] = useState<'working' | 'done' | 'error' | 'invalid'>(email ? 'working' : 'invalid');
  const [alreadySuppressed, setAlreadySuppressed] = useState(false);

  useEffect(() => {
    if (!email) return;
    let cancelled = false;
    (async () => {
      try {
        await suppressEmail(email, 'unsubscribed', 'unsubscribe_page');
        if (!cancelled) {
          setAlreadySuppressed(isSuppressed(email));
          setState('done');
        }
      } catch (e) {
        console.warn('Unsubscribe failed:', e);
        if (!cancelled) setState('error');
      }
    })();
    return () => { cancelled = true; };
  }, [email]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4 font-inter">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl p-8 text-center space-y-4">
        {state === 'working' && (
          <>
            <Loader2 className="w-12 h-12 text-[#3C6CA8] animate-spin mx-auto" />
            <h1 className="text-lg font-black text-slate-900 dark:text-white">Processing your request…</h1>
            <p className="text-sm text-slate-500">Updating your email preferences.</p>
          </>
        )}
        {state === 'done' && (
          <>
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center mx-auto">
              <MailCheck className="w-8 h-8 text-emerald-600" />
            </div>
            <h1 className="text-lg font-black text-slate-900 dark:text-white">
              {alreadySuppressed ? 'You are already unsubscribed' : 'You have been unsubscribed'}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              <strong className="text-slate-700 dark:text-slate-200">{email}</strong> will no longer receive
              marketing emails from SlimDose Peptides. Order confirmations and delivery updates will still be sent.
            </p>
            <p className="text-[11px] text-slate-400">
              Changed your mind? Contact <a className="text-[#3C6CA8] font-bold" href="mailto:support@slimdoseph.com">support@slimdoseph.com</a> to resubscribe.
            </p>
          </>
        )}
        {state === 'error' && (
          <>
            <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center mx-auto">
              <ShieldOff className="w-8 h-8 text-rose-600" />
            </div>
            <h1 className="text-lg font-black text-slate-900 dark:text-white">Something went wrong</h1>
            <p className="text-sm text-slate-500">We couldn't process your unsubscribe request. Please try again or email support@slimdoseph.com.</p>
          </>
        )}
        {state === 'invalid' && (
          <>
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto">
              <MailCheck className="w-8 h-8 text-slate-400" />
            </div>
            <h1 className="text-lg font-black text-slate-900 dark:text-white">Unsubscribe</h1>
            <p className="text-sm text-slate-500">This link is missing a valid email address. Please use the unsubscribe link from the email footer.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default UnsubscribePage;
