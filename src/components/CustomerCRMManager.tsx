import { useState, useEffect, useMemo } from 'react';
import { Search, Download, RefreshCw, User, Mail, Phone, MapPin, ShoppingBag } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Customer {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  shipping_address: string;
  shipping_city: string;
  shipping_state: string;
  shipping_zip_code: string;
  created_at: string;
}

export default function CustomerCRMManager() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [custRes, ordRes] = await Promise.all([
        supabase.from('customers').select('*').order('created_at', { ascending: false }),
        supabase.from('orders').select('customer_email, total_price, shipping_fee, order_status')
      ]);

      if (custRes.error) throw custRes.error;
      if (ordRes.error) throw ordRes.error;

      setCustomers(custRes.data || []);
      setOrders(ordRes.data || []);
    } catch (err) {
      console.error('Error loading CRM data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  // Compile customer metrics (total spent & orders count)
  const customerStats = useMemo(() => {
    const statsMap: Record<string, { orderCount: number; totalSpent: number }> = {};

    // Group orders by email (case-insensitive)
    orders.forEach(order => {
      const email = String(order.customer_email || '').trim().toLowerCase();
      if (!email) return;

      const spent = Number(order.total_price || 0) + Number(order.shipping_fee || 0);
      const isPaid = order.order_status !== 'cancelled';

      if (!statsMap[email]) {
        statsMap[email] = { orderCount: 0, totalSpent: 0 };
      }

      statsMap[email].orderCount += 1;
      if (isPaid) {
        statsMap[email].totalSpent += spent;
      }
    });

    return statsMap;
  }, [orders]);

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const query = searchQuery.toLowerCase();
    return customers.filter(c =>
      c.full_name.toLowerCase().includes(query) ||
      c.email.toLowerCase().includes(query) ||
      c.phone.toLowerCase().includes(query)
    );
  }, [customers, searchQuery]);

  const handleExportCSV = () => {
    const headers = ['Customer ID', 'Full Name', 'Email', 'Phone', 'Address', 'City', 'State', 'Zip Code', 'Total Orders', 'Total Spent (PHP)'];
    const rows = filteredCustomers.map(c => {
      const stats = customerStats[c.email.toLowerCase()] || { orderCount: 0, totalSpent: 0 };
      const fullAddress = `"${c.shipping_address || ''}"`;
      return [
        c.id,
        `"${c.full_name}"`,
        c.email,
        `"${c.phone || ''}"`,
        fullAddress,
        `"${c.shipping_city || ''}"`,
        `"${c.shipping_state || ''}"`,
        c.shipping_zip_code || '',
        stats.orderCount,
        stats.totalSpent.toFixed(2)
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `customer_crm_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      {/* Action Header */}
      <div className="bg-white rounded-2xl shadow p-4 border border-slate-150 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex-1 min-w-[250px] relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search customers by name, email, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-xs text-slate-800 placeholder-slate-400"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 border border-slate-200 rounded-xl text-slate-655 hover:bg-slate-50 transition-colors flex items-center justify-center cursor-pointer"
            title="Refresh CRM"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CRM CSV
          </button>
        </div>
      </div>

      {/* CRM Card Grid / Table */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-white rounded-2xl shadow border border-slate-150 p-12 text-center">
          <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h4 className="text-lg font-bold text-slate-800">No Customers Found</h4>
          <p className="text-slate-400 text-xs mt-1">Wait for users to create accounts or register during checkout.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow border border-slate-150 overflow-hidden">
          <table className="w-full text-xs text-slate-800">
            <thead className="bg-slate-50 text-slate-400 uppercase tracking-widest text-[9px] border-b border-slate-150">
              <tr>
                <th className="py-4 px-6 text-left">Customer Profile</th>
                <th className="py-4 px-6 text-left">Contact details</th>
                <th className="py-4 px-6 text-left">Default address</th>
                <th className="py-4 px-6 text-center">Orders Placed</th>
                <th className="py-4 px-6 text-right">Total Spent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.map(c => {
                const stats = customerStats[c.email.toLowerCase()] || { orderCount: 0, totalSpent: 0 };
                return (
                  <tr key={c.id} className="hover:bg-slate-50/40">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0 border border-blue-100">
                          {c.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{c.full_name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">ID: {c.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <p className="flex items-center gap-1.5 text-slate-650 font-medium">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        {c.email}
                      </p>
                      <p className="flex items-center gap-1.5 text-slate-500 mt-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {c.phone || '—'}
                      </p>
                    </td>
                    <td className="py-4 px-6 max-w-xs truncate">
                      {c.shipping_address ? (
                        <p className="flex items-start gap-1.5 text-slate-600">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                          <span>
                            {c.shipping_address}, {c.shipping_city}, {c.shipping_state} {c.shipping_zip_code}
                          </span>
                        </p>
                      ) : (
                        <span className="text-slate-400 italic">No address saved</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold">
                        <ShoppingBag className="w-3 h-3" />
                        {stats.orderCount}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right font-black text-slate-800 text-sm">
                      ₱{stats.totalSpent.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
