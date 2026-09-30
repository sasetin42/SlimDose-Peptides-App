import React, { useState } from 'react';
import {
  Globe,
  Navigation,
  Building2,
  FileText,
  Search,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  Sparkles,
  X,
  ArrowLeft,
  MapPin,
  Database,
} from 'lucide-react';
import { usePhilippineLocationsAdmin } from '../hooks/usePhilippineLocationsAdmin';
import { DbProvince, DbCity, DbBarangay, DbZipCode } from '../lib/philippineLocationsDb';
import { fireToast } from './ToastNotification';

interface PhilippineLocationsManagerProps {
  onBack?: () => void;
  onNavigateToShipping?: () => void;
}

export default function PhilippineLocationsManager({
  onBack,
  onNavigateToShipping
}: PhilippineLocationsManagerProps) {
  const {
    isRefreshing,
    stats,
    provinces,
    filteredProvinces,
    citiesMap,
    filteredCities,
    barangaysMap,
    filteredBarangays,
    filteredZipCodes,
    selectedProvinceFilter,
    setSelectedProvinceFilter,
    selectedCityFilter,
    setSelectedCityFilter,
    searchQuery,
    setSearchQuery,
    refreshAll,
    handleSaveProvince,
    handleDeleteProvince,
    handleSaveCity,
    handleDeleteCity,
    handleSaveBarangay,
    handleDeleteBarangay,
    handleSaveZipCode,
    handleDeleteZipCode,
    handleRestoreDefaults
  } = usePhilippineLocationsAdmin();

  // Active Tab: 'provinces' | 'cities' | 'barangays' | 'zipcodes'
  const [activeTab, setActiveTab] = useState<'provinces' | 'cities' | 'barangays' | 'zipcodes'>('provinces');

  // Modals for Create / Edit
  const [editingProvince, setEditingProvince] = useState<DbProvince | null>(null);
  const [isAddingProvince, setIsAddingProvince] = useState<boolean>(false);

  const [editingCity, setEditingCity] = useState<DbCity | null>(null);
  const [isAddingCity, setIsAddingCity] = useState<boolean>(false);

  const [editingBarangay, setEditingBarangay] = useState<DbBarangay | null>(null);
  const [isAddingBarangay, setIsAddingBarangay] = useState<boolean>(false);

  const [editingZipCode, setEditingZipCode] = useState<DbZipCode | null>(null);
  const [isAddingZipCode, setIsAddingZipCode] = useState<boolean>(false);

  // Form State Containers
  const [provinceForm, setProvinceForm] = useState<Partial<DbProvince>>({
    code: '',
    name: '',
    region: '',
    shippingZone: 'LUZON',
    is_active: true
  });

  const [cityForm, setCityForm] = useState<Partial<DbCity>>({
    code: '',
    name: '',
    provinceCode: '',
    zipCode: '',
    isCity: true,
    is_active: true
  });

  const [barangayForm, setBarangayForm] = useState<Partial<DbBarangay>>({
    code: '',
    name: '',
    cityCode: '',
    zip_override: '',
    is_active: true
  });

  const [zipForm, setZipForm] = useState<Partial<DbZipCode>>({
    province: '',
    city: '',
    barangay: '',
    zip_code: '',
    is_active: true
  });

  // Simulator Test Box State

  // Manual Refresh
  const onManualRefresh = async () => {
    await refreshAll();
    fireToast('Philippine Locations Database synchronized!', 'success', 2000);
  };

  // Restore Default Official PSGC Data
  const onRestoreDefaults = async () => {
    if (!confirm('Would you like to restore/update all 82+ PH Provinces, official PSGC cities, and postal codes to official standard?')) return;
    const ok = await handleRestoreDefaults();
    if (ok) {
      fireToast('Official Philippine PSGC Database restored successfully!', 'success');
    } else {
      fireToast('Failed to reset database', 'error');
    }
  };

  // Open Edit Province
  const startEditProvince = (p: DbProvince) => {
    setProvinceForm({ ...p });
    setEditingProvince(p);
    setIsAddingProvince(false);
  };

  // Open Add Province
  const startAddProvince = () => {
    setProvinceForm({
      code: '',
      name: '',
      region: 'Region IV-A (CALABARZON)',
      shippingZone: 'LUZON',
      is_active: true
    });
    setEditingProvince(null);
    setIsAddingProvince(true);
  };

  // Submit Province
  const submitProvince = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provinceForm.code?.trim() || !provinceForm.name?.trim()) {
      fireToast('Province Code and Name are required', 'warning');
      return;
    }
    try {
      await handleSaveProvince({
        code: provinceForm.code.trim().toUpperCase(),
        name: provinceForm.name.trim(),
        region: provinceForm.region?.trim() || 'Other Region',
        shippingZone: provinceForm.shippingZone || 'LUZON',
        is_active: provinceForm.is_active ?? true
      });
      setIsAddingProvince(false);
      setEditingProvince(null);
      fireToast(`Province "${provinceForm.name}" saved successfully`, 'success');
    } catch (err: any) {
      fireToast(`Error: ${err.message}`, 'error');
    }
  };

  // Submit City
  const submitCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cityForm.code?.trim() || !cityForm.name?.trim() || !cityForm.provinceCode?.trim()) {
      fireToast('City Code, Name, and Province are required', 'warning');
      return;
    }
    try {
      await handleSaveCity({
        code: cityForm.code.trim().toUpperCase(),
        name: cityForm.name.trim(),
        provinceCode: cityForm.provinceCode.trim().toUpperCase(),
        zipCode: cityForm.zipCode?.trim() || undefined,
        isCity: cityForm.isCity ?? true,
        is_active: cityForm.is_active ?? true
      });
      setIsAddingCity(false);
      setEditingCity(null);
      fireToast(`City "${cityForm.name}" saved successfully`, 'success');
    } catch (err: any) {
      fireToast(`Error: ${err.message}`, 'error');
    }
  };

  // Submit Barangay
  const submitBarangay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barangayForm.name?.trim() || !barangayForm.cityCode?.trim()) {
      fireToast('Barangay Name and City are required', 'warning');
      return;
    }
    const generatedCode = barangayForm.code?.trim() || `${barangayForm.cityCode}_${barangayForm.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    try {
      await handleSaveBarangay({
        code: generatedCode.toUpperCase(),
        name: barangayForm.name.trim(),
        cityCode: barangayForm.cityCode.trim().toUpperCase(),
        zip_override: barangayForm.zip_override?.trim() || undefined,
        is_active: barangayForm.is_active ?? true
      });
      setIsAddingBarangay(false);
      setEditingBarangay(null);
      fireToast(`Barangay "${barangayForm.name}" saved successfully`, 'success');
    } catch (err: any) {
      fireToast(`Error: ${err.message}`, 'error');
    }
  };

  // Submit ZIP Code
  const submitZipCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zipForm.province?.trim() || !zipForm.city?.trim() || !zipForm.zip_code?.trim()) {
      fireToast('Province, City, and ZIP code are required', 'warning');
      return;
    }
    try {
      await handleSaveZipCode({
        id: zipForm.id || `${zipForm.province}_${zipForm.city}_${zipForm.barangay || ''}`.toLowerCase().replace(/[^a-z0-9_]/gi, '_'),
        province: zipForm.province.trim().toUpperCase(),
        city: zipForm.city.trim(),
        barangay: zipForm.barangay?.trim() || undefined,
        zip_code: zipForm.zip_code.trim(),
        is_active: zipForm.is_active ?? true
      });
      setIsAddingZipCode(false);
      setEditingZipCode(null);
      fireToast(`Postal Code ${zipForm.zip_code} saved successfully`, 'success');
    } catch (err: any) {
      fireToast(`Error: ${err.message}`, 'error');
    }
  };

  return (
    <div className="space-y-5 text-left max-w-7xl mx-auto pb-12 font-sans">
      {/* ── Top Navigation & Live Header ── */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer mr-1"
                title="Back to Dashboard"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="w-9 h-9 rounded-xl bg-[#3C6CA8]/10 border border-[#3C6CA8]/20 flex items-center justify-center text-[#3C6CA8] shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Philippine Geographic &amp; ZIP Database
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Synced with Checkout
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage 82+ PH Provinces, Municipalities, Barangays, and Postal ZIP Codes with live checkout cascade linkage.
              </p>
            </div>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          {onNavigateToShipping && (
            <button
              onClick={onNavigateToShipping}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-200 cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5 text-[#3C6CA8]" />
              <span>Courier Rates</span>
            </button>
          )}

          <button
            onClick={onManualRefresh}
            disabled={isRefreshing}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-200 cursor-pointer disabled:opacity-50"
            title="Refresh database records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#3C6CA8]' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={onRestoreDefaults}
            className="px-3.5 py-2 rounded-xl bg-[#3C6CA8] hover:bg-[#315A8E] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-blue-500/20 cursor-pointer"
            title="Restore official Philippine PSGC data"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Restore Standard PSGC</span>
          </button>
        </div>
      </div>

      {/* ── KPI Metrics Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Provinces */}
        <div
          onClick={() => setActiveTab('provinces')}
          className={`cursor-pointer bg-white rounded-2xl p-4 border transition-all shadow-xs ${
            activeTab === 'provinces' ? 'border-[#3C6CA8] ring-2 ring-[#3C6CA8]/20 bg-blue-50/20' : 'border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Provinces</span>
            <div className="w-8 h-8 rounded-xl bg-blue-100/70 text-[#3C6CA8] flex items-center justify-center font-bold">
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">{stats.totalProvinces}</span>
            <span className="text-[11px] font-bold text-emerald-600">{stats.activeProvinces} Active</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate">82+ PH Provinces &amp; NCR</p>
        </div>

        {/* Cities & Municipalities */}
        <div
          onClick={() => setActiveTab('cities')}
          className={`cursor-pointer bg-white rounded-2xl p-4 border transition-all shadow-xs ${
            activeTab === 'cities' ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20' : 'border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Cities &amp; Towns</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100/70 text-emerald-600 flex items-center justify-center font-bold">
              <Navigation className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">{stats.totalCities}</span>
            <span className="text-[11px] font-bold text-emerald-600">{stats.activeCities} Active</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate">148+ Cities &amp; 1,486+ Towns</p>
        </div>

        {/* Barangays */}
        <div
          onClick={() => setActiveTab('barangays')}
          className={`cursor-pointer bg-white rounded-2xl p-4 border transition-all shadow-xs ${
            activeTab === 'barangays' ? 'border-teal-500 ring-2 ring-teal-500/20 bg-teal-50/20' : 'border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Barangays</span>
            <div className="w-8 h-8 rounded-xl bg-teal-100/70 text-teal-600 flex items-center justify-center font-bold">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">{stats.totalBarangays}</span>
            <span className="text-[11px] font-bold text-teal-600">Cascaded to City</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate">Multi-zone Sub-districts</p>
        </div>

        {/* Postal ZIP Codes */}
        <div
          onClick={() => setActiveTab('zipcodes')}
          className={`cursor-pointer bg-white rounded-2xl p-4 border transition-all shadow-xs ${
            activeTab === 'zipcodes' ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/20' : 'border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">ZIP Codes</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100/70 text-amber-600 flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">{stats.totalZipCodes}</span>
            <span className="text-[11px] font-bold text-amber-600">Auto-Filled</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate">PH Postal Reference Matrix</p>
        </div>
      </div>

      {/* ── Sub-Navigation Tabs & Search Bar ── */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-4 space-y-3">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setActiveTab('provinces')}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-all ${
                activeTab === 'provinces' ? 'bg-[#3C6CA8] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>1. Provinces ({stats.totalProvinces})</span>
            </button>

            <button
              onClick={() => setActiveTab('cities')}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-all ${
                activeTab === 'cities' ? 'bg-[#3C6CA8] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>2. Cities &amp; Municipalities ({stats.totalCities})</span>
            </button>

            <button
              onClick={() => setActiveTab('barangays')}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-all ${
                activeTab === 'barangays' ? 'bg-[#3C6CA8] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>3. Barangays ({stats.totalBarangays})</span>
            </button>

            <button
              onClick={() => setActiveTab('zipcodes')}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-all ${
                activeTab === 'zipcodes' ? 'bg-[#3C6CA8] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>4. Postal ZIP Codes ({stats.totalZipCodes})</span>
            </button>
          </div>

          {/* Add Item Trigger */}
          <div>
            {activeTab === 'provinces' && (
              <button
                onClick={startAddProvince}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Add Province</span>
              </button>
            )}

            {activeTab === 'cities' && (
              <button
                onClick={() => {
                  setCityForm({
                    code: '',
                    name: '',
                    provinceCode: selectedProvinceFilter || 'NCR',
                    zipCode: '',
                    isCity: true,
                    is_active: true
                  });
                  setEditingCity(null);
                  setIsAddingCity(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Add City/Town</span>
              </button>
            )}

            {activeTab === 'barangays' && (
              <button
                onClick={() => {
                  setBarangayForm({
                    code: '',
                    name: '',
                    cityCode: selectedCityFilter || 'NCR_MNL',
                    zip_override: '',
                    is_active: true
                  });
                  setEditingBarangay(null);
                  setIsAddingBarangay(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Add Barangay</span>
              </button>
            )}

            {activeTab === 'zipcodes' && (
              <button
                onClick={() => {
                  setZipForm({
                    province: '',
                    city: '',
                    barangay: '',
                    zip_code: '',
                    is_active: true
                  });
                  setEditingZipCode(null);
                  setIsAddingZipCode(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Add ZIP Code</span>
              </button>
            )}
          </div>
        </div>

        {/* Search & Cascaded Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Main Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab}...`}
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3C6CA8]/20 focus:border-[#3C6CA8] transition-all text-slate-800 placeholder-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Cascaded Filter: Province selector for Cities/Barangays */}
          {(activeTab === 'cities' || activeTab === 'barangays') && (
            <div className="flex items-center gap-2">
              <select
                value={selectedProvinceFilter}
                onChange={(e) => {
                  setSelectedProvinceFilter(e.target.value);
                  setSelectedCityFilter('');
                }}
                className="px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3C6CA8]/20 text-slate-700 cursor-pointer"
              >
                <option value="">All Provinces ({provinces.length})</option>
                {provinces.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Cascaded Filter: City selector for Barangays */}
          {activeTab === 'barangays' && (
            <div className="flex items-center gap-2">
              <select
                value={selectedCityFilter}
                onChange={(e) => setSelectedCityFilter(e.target.value)}
                className="px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3C6CA8]/20 text-slate-700 cursor-pointer max-w-[200px]"
              >
                <option value="">All Cities / Municipalities</option>
                {(selectedProvinceFilter ? citiesMap[selectedProvinceFilter] || [] : filteredCities).map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ── TAB 1: PROVINCES TABLE ── */}
      {activeTab === 'provinces' && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/90 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Province Name</th>
                  <th className="py-3 px-4">Region</th>
                  <th className="py-3 px-4">Shipping Zone</th>
                  <th className="py-3 px-4 text-center">Cities/Towns</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProvinces.slice(0, 100).map((prov) => {
                  const cityCount = (citiesMap[prov.code] || []).length;
                  return (
                    <tr key={prov.code} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-black text-[#3C6CA8]">{prov.code}</td>
                      <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5 text-slate-400" />
                        <span>{prov.name}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{prov.region}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          prov.shippingZone === 'MAXIM'
                            ? 'bg-amber-100 text-amber-800'
                            : prov.shippingZone === 'VISAYAS'
                            ? 'bg-purple-100 text-purple-800'
                            : prov.shippingZone === 'MINDANAO'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {prov.shippingZone || 'LUZON'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => {
                            setSelectedProvinceFilter(prov.code);
                            setActiveTab('cities');
                          }}
                          className="font-bold text-blue-600 hover:underline cursor-pointer"
                        >
                          {cityCount > 0 ? `${cityCount} Cities` : 'Inspect'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          prov.is_active !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {prov.is_active !== false ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => startEditProvince(prov)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Edit Province"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Remove province ${prov.name}?`)) {
                                handleDeleteProvince(prov.code);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 2: CITIES & MUNICIPALITIES TABLE ── */}
      {activeTab === 'cities' && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/90 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">City / Municipality</th>
                  <th className="py-3 px-4">Province</th>
                  <th className="py-3 px-4">Default ZIP</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-center">Barangays</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCities.slice(0, 100).map((city) => {
                  const bCount = (barangaysMap[city.code] || []).length;
                  return (
                    <tr key={city.code} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-600">{city.code}</td>
                      <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                        <Navigation className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{city.name}</span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">{city.provinceCode}</td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          {city.zipCode || '—'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[11px] text-slate-500 font-medium">
                          {city.isCity ? 'City' : 'Municipality'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => {
                            setSelectedCityFilter(city.code);
                            setActiveTab('barangays');
                          }}
                          className="font-bold text-teal-600 hover:underline cursor-pointer"
                        >
                          {bCount > 0 ? `${bCount} Brgys` : 'View'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          city.is_active !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {city.is_active !== false ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setCityForm({ ...city });
                              setEditingCity(city);
                              setIsAddingCity(false);
                            }}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Edit City"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Remove city ${city.name}?`)) {
                                handleDeleteCity(city.code, city.provinceCode);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3: BARANGAYS TABLE ── */}
      {activeTab === 'barangays' && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/90 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Barangay Name</th>
                  <th className="py-3 px-4">City / Municipality Code</th>
                  <th className="py-3 px-4">Postal Code Override</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBarangays.slice(0, 100).map((brgy) => (
                  <tr key={brgy.code} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-600">{brgy.code}</td>
                    <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-teal-500" />
                      <span>{brgy.name}</span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">{brgy.cityCode}</td>
                    <td className="py-3 px-4">
                      {brgy.zip_override ? (
                        <span className="font-mono font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          {brgy.zip_override}
                        </span>
                      ) : (
                        <span className="text-slate-400">Inherits City ZIP</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        brgy.is_active !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {brgy.is_active !== false ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setBarangayForm({ ...brgy });
                            setEditingBarangay(brgy);
                            setIsAddingBarangay(false);
                          }}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Edit Barangay"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Remove barangay ${brgy.name}?`)) {
                              handleDeleteBarangay(brgy.code, brgy.cityCode);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 4: POSTAL ZIP CODES TABLE ── */}
      {activeTab === 'zipcodes' && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/90 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">ZIP Code</th>
                  <th className="py-3 px-4">Province</th>
                  <th className="py-3 px-4">City / Municipality</th>
                  <th className="py-3 px-4">Specific Barangay / District</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredZipCodes.slice(0, 100).map((zip) => (
                  <tr key={zip.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-black text-amber-600">
                      <span className="bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                        {zip.zip_code}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">{zip.province}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{zip.city}</td>
                    <td className="py-3 px-4 text-slate-600">{zip.barangay || 'Entire Town / City'}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700">
                        Active
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setZipForm({ ...zip });
                            setEditingZipCode(zip);
                            setIsAddingZipCode(false);
                          }}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Edit ZIP Code"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Remove ZIP code ${zip.zip_code} for ${zip.city}?`)) {
                              handleDeleteZipCode(zip.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODALS FOR CREATE & EDIT ── */}

      {/* 1. Province Modal */}
      {(isAddingProvince || editingProvince) && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#3C6CA8]" />
                <span>{editingProvince ? 'Edit Province' : 'Add New Province'}</span>
              </h3>
              <button
                onClick={() => { setIsAddingProvince(false); setEditingProvince(null); }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={submitProvince} className="space-y-3 pt-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Province Code *</label>
                <input
                  type="text"
                  required
                  disabled={!!editingProvince}
                  value={provinceForm.code || ''}
                  onChange={(e) => setProvinceForm({ ...provinceForm, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. AGU_SUR"
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#3C6CA8]/30 uppercase font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Province Name *</label>
                <input
                  type="text"
                  required
                  value={provinceForm.name || ''}
                  onChange={(e) => setProvinceForm({ ...provinceForm, name: e.target.value })}
                  placeholder="e.g. Agusan del Sur"
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#3C6CA8]/30 font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Region</label>
                <input
                  type="text"
                  value={provinceForm.region || ''}
                  onChange={(e) => setProvinceForm({ ...provinceForm, region: e.target.value })}
                  placeholder="e.g. Region XIII (Caraga)"
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#3C6CA8]/30"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Logistics Shipping Zone</label>
                <select
                  value={provinceForm.shippingZone || 'LUZON'}
                  onChange={(e) => setProvinceForm({ ...provinceForm, shippingZone: e.target.value as any })}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#3C6CA8]/30 font-bold"
                >
                  <option value="MAXIM">MAXIM / Express (NCR, Cavite, Laguna, Rizal)</option>
                  <option value="LUZON">LUZON (J&T Courier)</option>
                  <option value="VISAYAS">VISAYAS (J&T Courier)</option>
                  <option value="MINDANAO">MINDANAO (J&T Courier)</option>
                </select>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => { setIsAddingProvince(false); setEditingProvince(null); }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#3C6CA8] hover:bg-[#315A8E] text-white font-bold text-xs cursor-pointer shadow-xs"
                >
                  Save Province
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. City Modal */}
      {(isAddingCity || editingCity) && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Navigation className="w-4 h-4 text-emerald-600" />
                <span>{editingCity ? 'Edit City / Municipality' : 'Add New City / Town'}</span>
              </h3>
              <button
                onClick={() => { setIsAddingCity(false); setEditingCity(null); }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={submitCity} className="space-y-3 pt-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Province *</label>
                <select
                  required
                  value={cityForm.provinceCode || ''}
                  onChange={(e) => setCityForm({ ...cityForm, provinceCode: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-bold"
                >
                  <option value="">Select Parent Province</option>
                  {provinces.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">City Code *</label>
                <input
                  type="text"
                  required
                  disabled={!!editingCity}
                  value={cityForm.code || ''}
                  onChange={(e) => setCityForm({ ...cityForm, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. AGU_BUN"
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/30 uppercase font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">City / Municipality Name *</label>
                <input
                  type="text"
                  required
                  value={cityForm.name || ''}
                  onChange={(e) => setCityForm({ ...cityForm, name: e.target.value })}
                  placeholder="e.g. Bunawan"
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Default Postal ZIP Code</label>
                <input
                  type="text"
                  value={cityForm.zipCode || ''}
                  onChange={(e) => setCityForm({ ...cityForm, zipCode: e.target.value.replace(/[^\d]/g, '').slice(0, 4) })}
                  placeholder="e.g. 8506"
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-mono font-black"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => { setIsAddingCity(false); setEditingCity(null); }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                >
                  Save City
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Barangay Modal */}
      {(isAddingBarangay || editingBarangay) && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-teal-600" />
                <span>{editingBarangay ? 'Edit Barangay' : 'Add New Barangay'}</span>
              </h3>
              <button
                onClick={() => { setIsAddingBarangay(false); setEditingBarangay(null); }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={submitBarangay} className="space-y-3 pt-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Parent City / Town *</label>
                <select
                  required
                  value={barangayForm.cityCode || ''}
                  onChange={(e) => setBarangayForm({ ...barangayForm, cityCode: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500/30 font-bold"
                >
                  <option value="">Select City/Municipality</option>
                  {filteredCities.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name} ({c.provinceCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Barangay Name *</label>
                <input
                  type="text"
                  required
                  value={barangayForm.name || ''}
                  onChange={(e) => setBarangayForm({ ...barangayForm, name: e.target.value })}
                  placeholder="e.g. Brgy. Libertad"
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500/30 font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Specific Postal ZIP Override (Optional)</label>
                <input
                  type="text"
                  value={barangayForm.zip_override || ''}
                  onChange={(e) => setBarangayForm({ ...barangayForm, zip_override: e.target.value.replace(/[^\d]/g, '').slice(0, 4) })}
                  placeholder="e.g. 8506"
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500/30 font-mono font-bold"
                />
                <p className="text-[10px] text-slate-400 mt-1">Leave empty to inherit city default ZIP code.</p>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => { setIsAddingBarangay(false); setEditingBarangay(null); }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                >
                  Save Barangay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. ZIP Code Modal */}
      {(isAddingZipCode || editingZipCode) && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-600" />
                <span>{editingZipCode ? 'Edit Postal ZIP Code' : 'Add New Postal Code'}</span>
              </h3>
              <button
                onClick={() => { setIsAddingZipCode(false); setEditingZipCode(null); }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={submitZipCode} className="space-y-3 pt-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Province *</label>
                <input
                  type="text"
                  required
                  value={zipForm.province || ''}
                  onChange={(e) => setZipForm({ ...zipForm, province: e.target.value.toUpperCase() })}
                  placeholder="e.g. AGUSAN DEL SUR"
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500/30 uppercase font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">City / Municipality *</label>
                <input
                  type="text"
                  required
                  value={zipForm.city || ''}
                  onChange={(e) => setZipForm({ ...zipForm, city: e.target.value })}
                  placeholder="e.g. Bunawan"
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500/30 font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Specific Barangay / District (Optional)</label>
                <input
                  type="text"
                  value={zipForm.barangay || ''}
                  onChange={(e) => setZipForm({ ...zipForm, barangay: e.target.value })}
                  placeholder="e.g. Brgy. Libertad"
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500/30"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">4-Digit Postal ZIP Code *</label>
                <input
                  type="text"
                  required
                  value={zipForm.zip_code || ''}
                  onChange={(e) => setZipForm({ ...zipForm, zip_code: e.target.value.replace(/[^\d]/g, '').slice(0, 4) })}
                  placeholder="e.g. 8506"
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500/30 font-mono font-black"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => { setIsAddingZipCode(false); setEditingZipCode(null); }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                >
                  Save ZIP Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
