import React, { useState, useEffect } from 'react';
import { Mail, Settings, RefreshCw, Send, Check, Clock, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ReminderLog {
  id: string;
  order_id: string;
  customer_email: string;
  reminded_at: string;
  created_at: string;
  orders?: {
    order_number: string;
    customer_name: string;
  } | null;
}

export default function RestockRemindersManager() {
  const [logs, setLogs] = useState<ReminderLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Template states
  const [subject, setSubject] = useState('Time to Restock Your Peptide Supplies ❄️');
  const [bodyTemplate, setBodyTemplate] = useState(
    `Hi {{customer_name}},\n\nIt has been 30 days since your order #{{order_number}} was confirmed.\n\nTo ensure your research cycle is not interrupted, we recommend restocking your peptide supplies. We have Manila and Davao stock fully ready.\n\nBest regards,\nSlimDose Peptides`
  );
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  useEffect(() => {
    loadData();
    loadTemplates();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('restock_reminders')
        .select('*, orders(order_number, customer_name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error('Error loading reminders logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const { data } = await supabase
        .from('site_settings')
        .select('*')
        .in('type', ['restock_email_subject', 'restock_email_body']);

      if (data) {
        const sub = data.find(s => s.type === 'restock_email_subject');
        const body = data.find(s => s.type === 'restock_email_body');
        if (sub) setSubject(sub.value);
        if (body) setBodyTemplate(body.value);
      }
    } catch (err) {
      console.warn('Error loading templates:', err);
    }
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingTemplate(true);
      
      const saveSetting = async (type: string, val: string) => {
        // Find if setting exists
        const { data } = await supabase.from('site_settings').select('*').eq('type', type).maybeSingle();
        if (data) {
          await supabase.from('site_settings').update({ value: val }).eq('id', data.id);
        } else {
          await supabase.from('site_settings').insert([{ type, value: val, description: 'Automated 30-day restock email template' }]);
        }
      };

      await Promise.all([
        saveSetting('restock_email_subject', subject.trim()),
        saveSetting('restock_email_body', bodyTemplate.trim())
      ]);

      alert('Email templates updated successfully!');
    } catch (err: any) {
      alert(`Failed to save template: ${err.message}`);
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const handleTriggerTestReminder = async () => {
    const email = prompt('Enter recipient test email:');
    if (!email) return;
    try {
      alert(`Test reminder email sent to ${email} (simulated)!`);
    } catch (err: any) {
      alert(err.message);
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
      {/* Template Config Form */}
      <div className="lg:col-span-1 bg-white rounded-2xl shadow border border-slate-150 p-6 flex flex-col justify-between">
        <form onSubmit={handleSaveTemplate} className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Settings className="w-5 h-5 text-blue-600" />
            <h4 className="font-bold text-slate-800 text-sm">Template Settings</h4>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Email Subject Line</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500/20"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Body Text Content Template</label>
            <textarea
              value={bodyTemplate}
              onChange={(e) => setBodyTemplate(e.target.value)}
              rows={8}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500/20 font-mono leading-relaxed"
              required
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Available tags: <code className="bg-slate-100 px-1 rounded text-red-500 font-bold">{"{{customer_name}}"}</code>, <code className="bg-slate-100 px-1 rounded text-red-500 font-bold">{"{{order_number}}"}</code>
            </span>
          </div>

          <button
            type="submit"
            disabled={isSavingTemplate}
            className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow transition-all cursor-pointer flex items-center justify-center gap-1"
          >
            <Check className="w-4 h-4" />
            {isSavingTemplate ? 'Saving...' : 'Update Templates'}
          </button>
        </form>

        <button
          onClick={handleTriggerTestReminder}
          className="w-full mt-4 py-2 border border-blue-200 bg-blue-50 text-blue-750 hover:bg-blue-100 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
        >
          <Send className="w-3.5 h-3.5" />
          Send Test Email
        </button>
      </div>

      {/* Logs Table */}
      <div className="lg:col-span-2 bg-white rounded-2xl shadow border border-slate-150 p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3 flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-650" />
              <h4 className="font-bold text-slate-800 text-sm">Automated Sent Reminders Logs</h4>
            </div>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-1.5 border border-slate-200 rounded-xl text-slate-655 hover:bg-slate-50 transition-colors flex items-center justify-center cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {logs.length === 0 ? (
            <div className="py-12 text-center">
              <Clock className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-xs">No reminder emails sent yet.</p>
              <p className="text-[10px] text-slate-400 mt-1">Sent emails are tracked here automatically when order reaches 30 days old.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto pr-1">
              {logs.map(log => (
                <div key={log.id} className="py-3 flex items-center justify-between text-xs hover:bg-slate-50/50 px-2 rounded-lg">
                  <div>
                    <p className="font-bold text-slate-800">{log.customer_email}</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">
                      Order: <span className="font-semibold text-slate-500">#{log.orders?.order_number || 'Unknown'}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1 justify-end">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {new Date(log.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
