import { useState, useEffect } from 'react';
import { Check, X, FileText, Link as LinkIcon, RefreshCw, ShoppingBag, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Verification {
  id: string;
  order_id: string;
  payment_proof_url: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  orders?: {
    order_number: string;
    customer_name: string;
    total_price: number;
    shipping_fee: number;
    payment_method_name: string;
  } | null;
}

export default function InvoiceVerificationsManager() {
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('invoice_verifications')
        .select('*, orders(order_number, customer_name, total_price, shipping_fee, payment_method_name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVerifications(data || []);
    } catch (err) {
      console.error('Error loading verifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const handleApprove = async (v: Verification) => {
    if (!confirm('Are you sure you want to approve this receipt and confirm this order?')) return;
    try {
      // 1. Update verification record status
      const { error: vErr } = await supabase
        .from('invoice_verifications')
        .update({ status: 'approved' })
        .eq('id', v.id);
      if (vErr) throw vErr;

      // 2. Update order record to Paid and Confirmed
      const { error: oErr } = await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          order_status: 'confirmed',
          payment_proof_url: v.payment_proof_url
        })
        .eq('id', v.order_id);
      if (oErr) throw oErr;

      // 3. Fire Telegram notify edge function
      await fetch(`${supabase.supabaseUrl}/functions/v1/telegram-notify-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: v.order_id }),
      }).catch((e) => console.warn('Telegram notify error:', e));

      alert('Receipt approved and order confirmed!');
      await loadData();
    } catch (err: any) {
      console.error(err);
      alert(`Approval error: ${err.message}`);
    }
  };

  const handleReject = async (v: Verification) => {
    if (!confirm('Are you sure you want to reject this receipt?')) return;
    try {
      const { error } = await supabase
        .from('invoice_verifications')
        .update({ status: 'rejected' })
        .eq('id', v.id);
      if (error) throw error;

      alert('Receipt rejected.');
      await loadData();
    } catch (err: any) {
      alert(`Rejection error: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      {/* Header Panel */}
      <div className="bg-white rounded-2xl shadow p-4 border border-slate-150 flex justify-between items-center">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-blue-650" />
          GCash &amp; Bank Receipt Verification Panel
        </h3>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-2 border border-slate-200 rounded-xl text-slate-655 hover:bg-slate-50 transition-colors flex items-center justify-center cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Verification Cards */}
      {verifications.length === 0 ? (
        <div className="bg-white rounded-2xl shadow border border-slate-150 p-12 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h4 className="text-lg font-bold text-slate-800">No Payment Proofs Uploaded Yet</h4>
          <p className="text-slate-400 text-xs mt-1">Proof uploads from GCash/bank transfers will appear here for verification.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {verifications.map(v => {
            const orderInfo = v.orders;
            const isPending = v.status === 'pending';
            const fileIsPdf = v.payment_proof_url.toLowerCase().endsWith('.pdf');

            return (
              <div key={v.id} className="bg-white rounded-2xl shadow border border-slate-150 p-5 flex flex-col md:flex-row gap-5 items-stretch hover:border-slate-350 transition-all">
                {/* Proof Visual Thumbnail */}
                <div className="w-full md:w-48 h-48 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center overflow-hidden shrink-0 relative">
                  {fileIsPdf ? (
                    <div className="text-center p-4">
                      <FileText className="w-12 h-12 text-rose-500 mx-auto mb-2" />
                      <span className="text-[10px] font-bold text-slate-500">PDF RECEIPT FILE</span>
                    </div>
                  ) : (
                    <img src={v.payment_proof_url} alt="Receipt proof" className="w-full h-full object-cover" />
                  )}
                  <a
                    href={v.payment_proof_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute bottom-2 right-2 p-1.5 bg-black/60 hover:bg-black text-white rounded-lg transition-colors"
                    title="Open receipt in new tab"
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                  </a>
                </div>

                {/* Details info */}
                <div className="flex-1 flex flex-col justify-between py-1">
                  <div>
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                      <h4 className="font-black text-slate-800 text-sm flex items-center gap-1">
                        <ShoppingBag className="w-4 h-4 text-slate-400" />
                        Order: {orderInfo?.order_number || `ID: ${v.order_id.slice(0, 8)}`}
                      </h4>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        v.status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' :
                        v.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                      }`}>
                        {v.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs mt-3">
                      <div>
                        <span className="text-slate-400 font-bold block text-[9px] uppercase tracking-wider">Customer Name</span>
                        <p className="font-semibold text-slate-700 mt-0.5">{orderInfo?.customer_name || '—'}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold block text-[9px] uppercase tracking-wider">Method Selected</span>
                        <p className="font-semibold text-slate-700 mt-0.5">{orderInfo?.payment_method_name || 'Manual Bank'}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold block text-[9px] uppercase tracking-wider">Upload Timestamp</span>
                        <p className="font-semibold text-slate-700 mt-0.5 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {new Date(v.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-t border-slate-100 pt-4 mt-4">
                    <div className="text-xs">
                      <span className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">Total order value</span>
                      <p className="font-black text-slate-800 text-sm">
                        ₱{((orderInfo?.total_price || 0) + (orderInfo?.shipping_fee || 0)).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    {isPending && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(v)}
                          className="px-3.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Confirm Receipt
                        </button>
                        <button
                          onClick={() => handleReject(v)}
                          className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-650 rounded-xl text-xs font-bold flex items-center gap-1 border border-red-200 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          Reject Proof
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
