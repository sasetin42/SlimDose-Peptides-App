import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Shield, ExternalLink, Sparkles, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ImageUpload from './ImageUpload';
import {
  mirrorCoaReportCreate,
  mirrorCoaReportDelete,
  mirrorCoaReportUpdate,
  mirrorSiteSettingUpsert,
} from '../lib/convexMirror';

interface COAManagerProps {
  onBack?: () => void;
}

interface COAReport {
  id: string;
  product_name: string;
  batch: string;
  test_date: string;
  purity_percentage: number;
  quantity: string;
  task_number: string;
  verification_key: string;
  image_url: string;
  featured: boolean;
  manufacturer: string;
  laboratory: string;
}

const COAManager: React.FC<COAManagerProps> = ({ onBack }) => {
  const [coaReports, setCOAReports] = useState<COAReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [coaPageEnabled, setCoaPageEnabled] = useState<boolean>(true);
  const [formData, setFormData] = useState<Partial<COAReport>>({
    product_name: '',
    batch: 'Unknown',
    test_date: new Date().toISOString().split('T')[0],
    purity_percentage: 99.0,
    quantity: '',
    task_number: '',
    verification_key: '',
    image_url: '',
    featured: false,
    manufacturer: 'SlimDose Peptides',
    laboratory: 'Janoshik + Chromate',
  });

  useEffect(() => {
    fetchCOAReports();
    fetchCOAPageSetting();
  }, []);

  const fetchCOAPageSetting = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('id', 'coa_page_enabled')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setCoaPageEnabled(data?.value === 'true' || data?.value === true || !data);
    } catch (error) {
      console.error('Error fetching COA page setting:', error);
      // Default to enabled if setting doesn't exist
      setCoaPageEnabled(true);
    }
  };

  const toggleCOAPage = async (enabled: boolean) => {
    try {
      // First, check if the setting exists
      const { data: _existing, error: checkError } = await supabase
        .from('site_settings')
        .select('id')
        .eq('id', 'coa_page_enabled')
        .single();

      let error;

      if (checkError && checkError.code === 'PGRST116') {
        // Setting doesn't exist, insert it
        const { error: insertError } = await supabase
          .from('site_settings')
          .insert({
            id: 'coa_page_enabled',
            value: enabled ? 'true' : 'false',
            type: 'boolean',
            description: 'Enable or disable the COA page on the website',
            updated_at: new Date().toISOString()
          });
        error = insertError;
      } else if (checkError) {
        // Some other error checking
        throw checkError;
      } else {
        // Setting exists, update it
        const { error: updateError } = await supabase
          .from('site_settings')
          .update({
            value: enabled ? 'true' : 'false',
            updated_at: new Date().toISOString()
          })
          .eq('id', 'coa_page_enabled');
        error = updateError;
      }

      if (error) {
        console.error('Error updating COA page setting:', error);
        throw error;
      }

      mirrorSiteSettingUpsert('coa_page_enabled', enabled ? 'true' : 'false', 'boolean');

      setCoaPageEnabled(enabled);
      alert(enabled ? '✅ COA page is now visible on the website' : '❌ COA page is now hidden from the website');
    } catch (error: any) {
      console.error('Error updating COA page setting:', error);
      const errorMessage = error?.message || 'Unknown error';
      alert(`❌ Failed to update COA page setting: ${errorMessage}\n\nThis might be a permissions issue. Please check your database RLS policies.`);
    }
  };

  const fetchCOAReports = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('coa_reports')
        .select('*')
        .order('test_date', { ascending: false });

      if (error) {
        console.error('Error fetching COA reports:', error);

        // Check if table doesn't exist
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          alert('❌ COA reports table not found. Please run the database migration to create the table.');
        } else if (error.code === '42501' || error.message?.includes('permission')) {
          alert('❌ Permission denied. Please check your database permissions.');
        } else {
          alert(`❌ Failed to load COA reports: ${error.message || 'Unknown error'}`);
        }
        throw error;
      }

      setCOAReports(data || []);
    } catch (error) {
      console.error('Error fetching COA reports:', error);
      // Don't show alert here if we already showed it above
      setCOAReports([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingId) {
        // Update existing report
        const { error } = await supabase
          .from('coa_reports')
          .update(formData)
          .eq('id', editingId);

        if (error) throw error;
        mirrorCoaReportUpdate(editingId, formData);
        alert('✅ COA report updated successfully!');
      } else {
        // Create new report
        const { error } = await supabase
          .from('coa_reports')
          .insert([formData]);

        if (error) throw error;
        mirrorCoaReportCreate(formData);
        alert('✅ COA report added successfully!');
      }

      setEditingId(null);
      setIsAdding(false);
      resetForm();
      fetchCOAReports();
    } catch (error) {
      console.error('Error saving COA report:', error);
      alert('❌ Failed to save COA report');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this COA report?')) return;

    try {
      const { error } = await supabase
        .from('coa_reports')
        .delete()
        .eq('id', id);

      if (error) throw error;
      mirrorCoaReportDelete(id);
      alert('✅ COA report deleted successfully!');
      fetchCOAReports();
    } catch (error) {
      console.error('Error deleting COA report:', error);
      alert('❌ Failed to delete COA report');
    }
  };

  const handleEdit = (report: COAReport) => {
    setFormData(report);
    setEditingId(report.id);
    setIsAdding(false);
  };

  const handleAdd = () => {
    resetForm();
    setEditingId(null);
    setIsAdding(true);
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsAdding(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      product_name: '',
      batch: 'Unknown',
      test_date: new Date().toISOString().split('T')[0],
      purity_percentage: 99.0,
      quantity: '',
      task_number: '',
      verification_key: '',
      image_url: '',
      featured: false,
      manufacturer: 'SlimDose Peptides',
      laboratory: 'Janoshik + Chromate',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 font-inter">
      {/* Top Header Bar */}
      <div className="bg-white dark:bg-slate-900 shadow-xs border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-3 sm:px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-3.5 sm:py-4">
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              {onBack && (
                <button
                  onClick={onBack}
                  className="flex items-center gap-1 text-slate-600 dark:text-slate-400 hover:text-[#3C6CA8] dark:hover:text-[#6A9BE0] transition-colors shrink-0 cursor-pointer font-bold text-xs sm:text-sm px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Go Back"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Dashboard</span>
                </button>
              )}
              {onBack && <div className="h-4 w-[1px] bg-slate-300 dark:bg-slate-700 hidden sm:block" />}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#3C6CA8]/10 dark:bg-[#3C6CA8]/20 flex items-center justify-center text-[#3C6CA8] dark:text-[#94BBE9]">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h1 className="text-base sm:text-xl font-extrabold text-[#232323] dark:text-white tracking-tight truncate">
                    COA Lab Reports
                  </h1>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                    Manage certificates of analysis and third-party laboratory reports
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
              {/* COA Page Toggle */}
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Show Page:</span>
                <label htmlFor="coamanager-togglecoapage-e-target-checked" className="relative inline-flex items-center cursor-pointer">
                  <input id="coamanager-checkbox-2" name="checkbox_2" type="checkbox"
                    checked={coaPageEnabled}
                    onChange={(e) => toggleCOAPage(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 dark:bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#3C6CA8]"></div>
                </label>
                <span className={`text-[10px] font-extrabold ${coaPageEnabled ? 'text-[#3C6CA8] dark:text-[#94BBE9]' : 'text-slate-400'}`}>
                  {coaPageEnabled ? 'ON' : 'OFF'}
                </span>
              </div>

              <button
                onClick={handleAdd}
                className="flex items-center justify-center gap-1.5 bg-[#3C6CA8] hover:bg-[#315A8E] text-white px-3.5 sm:px-4 py-2 rounded-xl font-extrabold text-xs sm:text-sm transition-all shadow-sm hover:shadow-md cursor-pointer active:scale-95 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add COA Report</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-5">
        {/* Add/Edit Form */}
        {(isAdding || editingId) && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base sm:text-lg font-extrabold text-[#232323] dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#3C6CA8]" />
                {editingId ? 'Edit COA Report' : 'Add New COA Report'}
              </h3>
              <button
                onClick={handleCancel}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <label htmlFor="coamanager-togglecoapage-e-target-checked" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Product Name *
                  </label>
                  <input id="coamanager-togglecoapage-e-target-checked" name="togglecoapage_e_target_checked" type="text"
                    required
                    value={formData.product_name}
                    onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-[#232323] dark:text-white focus:ring-2 focus:ring-[#3C6CA8] focus:border-[#3C6CA8]"
                    placeholder="e.g., Tirzepatide 15mg"
                  />
                </div>

                <div>
                  <label htmlFor="coamanager-batch-number" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Batch Number
                  </label>
                  <input id="coamanager-batch-number" name="batch_number" type="text"
                    value={formData.batch}
                    onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-[#232323] dark:text-white focus:ring-2 focus:ring-[#3C6CA8] focus:border-[#3C6CA8]"
                    placeholder="Unknown"
                  />
                </div>

                <div>
                  <label htmlFor="coamanager-test-date" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Test Date *
                  </label>
                  <input id="coamanager-test-date" name="test_date" type="date"
                    required
                    value={formData.test_date}
                    onChange={(e) => setFormData({ ...formData, test_date: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-[#232323] dark:text-white focus:ring-2 focus:ring-[#3C6CA8] focus:border-[#3C6CA8]"
                  />
                </div>

                <div>
                  <label htmlFor="coamanager-purity" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Purity (%) *
                  </label>
                  <input id="coamanager-purity" name="purity" type="number"
                    step="0.001"
                    required
                    value={formData.purity_percentage}
                    onChange={(e) => setFormData({ ...formData, purity_percentage: parseFloat(e.target.value) })}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-[#232323] dark:text-white focus:ring-2 focus:ring-[#3C6CA8] focus:border-[#3C6CA8]"
                    placeholder="99.658"
                  />
                </div>

                <div>
                  <label htmlFor="coamanager-quantity" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Quantity *
                  </label>
                  <input id="coamanager-quantity" name="quantity" type="text"
                    required
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-[#232323] dark:text-white focus:ring-2 focus:ring-[#3C6CA8] focus:border-[#3C6CA8]"
                    placeholder="e.g., 16.80 mg"
                  />
                </div>

                <div>
                  <label htmlFor="coamanager-task-number" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Task Number *
                  </label>
                  <input id="coamanager-task-number" name="task_number" type="text"
                    required
                    value={formData.task_number}
                    onChange={(e) => setFormData({ ...formData, task_number: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-[#232323] dark:text-white focus:ring-2 focus:ring-[#3C6CA8] focus:border-[#3C6CA8]"
                    placeholder="#68396"
                  />
                </div>

                <div>
                  <label htmlFor="coamanager-verification-key" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Verification Key *
                  </label>
                  <input id="coamanager-verification-key" name="verification_key" type="text"
                    required
                    value={formData.verification_key}
                    onChange={(e) => setFormData({ ...formData, verification_key: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-[#232323] dark:text-white focus:ring-2 focus:ring-[#3C6CA8] focus:border-[#3C6CA8]"
                    placeholder="9AUYT3EZV9Y9"
                  />
                </div>

                <div>
                  <label htmlFor="coamanager-manufacturer" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Manufacturer
                  </label>
                  <input id="coamanager-manufacturer" name="manufacturer" type="text"
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-[#232323] dark:text-white focus:ring-2 focus:ring-[#3C6CA8] focus:border-[#3C6CA8]"
                  />
                </div>

                <div>
                  <label htmlFor="coamanager-laboratory" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Laboratory
                  </label>
                  <input id="coamanager-laboratory" name="laboratory" type="text"
                    value={formData.laboratory}
                    onChange={(e) => setFormData({ ...formData, laboratory: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-[#232323] dark:text-white focus:ring-2 focus:ring-[#3C6CA8] focus:border-[#3C6CA8]"
                  />
                </div>

                <div className="sm:col-span-2 md:col-span-3">
                  <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                    COA Report Image *
                  </span>
                  <ImageUpload
                    currentImage={formData.image_url}
                    onImageChange={(url) => setFormData({ ...formData, image_url: url || '' })}
                    folder="coa-images"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="featured"
                  checked={formData.featured}
                  onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                  className="w-4 h-4 text-[#3C6CA8] rounded border-slate-300 focus:ring-[#3C6CA8] cursor-pointer"
                />
                <label htmlFor="featured" className="text-xs sm:text-sm font-bold text-[#232323] dark:text-white cursor-pointer">
                  Featured Report (show prominently on COA index)
                </label>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 bg-[#3C6CA8] hover:bg-[#315A8E] text-white px-5 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all shadow-sm cursor-pointer active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingId ? 'Update Report' : 'Save Report'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex items-center gap-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>Cancel</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* COA Reports List */}
        <div className="space-y-3">
          {coaReports.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
              <div className="w-14 h-14 rounded-2xl bg-[#3C6CA8]/10 dark:bg-[#3C6CA8]/20 flex items-center justify-center text-[#3C6CA8] dark:text-[#94BBE9] mx-auto mb-3">
                <Shield className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-extrabold text-[#232323] dark:text-white mb-1">No COA reports yet</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Add your first third-party verified laboratory report!</p>
              <button
                onClick={handleAdd}
                className="bg-[#3C6CA8] hover:bg-[#315A8E] text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm"
              >
                Add First Report
              </button>
            </div>
          ) : (
            coaReports.map((report) => (
              <div
                key={report.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 hover:border-[#3C6CA8]/50 transition-all shadow-2xs text-left group"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="text-sm sm:text-base font-extrabold text-[#232323] dark:text-white truncate">
                        {report.product_name}
                      </h3>
                      {report.featured && (
                        <span className="bg-[#3C6CA8]/10 text-[#3C6CA8] dark:bg-[#3C6CA8]/20 dark:text-[#94BBE9] border border-[#3C6CA8]/30 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase">
                          ★ Featured
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-slate-400">
                        Batch: {report.batch}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-xs mb-2">
                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Purity</span>
                        <p className="font-extrabold text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm">{report.purity_percentage}%</p>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Quantity</span>
                        <p className="font-bold text-[#3C6CA8] dark:text-[#94BBE9] text-xs sm:text-sm">{report.quantity}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Task Number</span>
                        <p className="font-mono font-bold text-[#232323] dark:text-white text-xs truncate">{report.task_number}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Test Date</span>
                        <p className="font-semibold text-slate-700 dark:text-slate-300 text-xs">{new Date(report.test_date).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs flex-wrap">
                      <a
                        href={`https://www.janoshik.com/verify/?key=${report.verification_key}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[#3C6CA8] dark:text-[#94BBE9] hover:underline font-bold text-[11px]"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Verify on Janoshik
                      </a>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px]">Lab: <strong className="text-slate-700 dark:text-slate-300">{report.laboratory}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-800 shrink-0">
                    <button
                      onClick={() => handleEdit(report)}
                      className="p-2 text-[#3C6CA8] hover:bg-blue-50 dark:hover:bg-slate-800 rounded-xl transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(report.id)}
                      className="p-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all border border-rose-200 dark:border-rose-900/40 cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default COAManager;

