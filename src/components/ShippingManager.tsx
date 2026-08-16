import React, { useState, useMemo } from 'react';
import {
  MapPin,
  Edit2,
  Save,
  X,
  Plus,
  Trash2,
  AlertCircle,
  RefreshCw,
  Search,
  CheckCircle2,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Truck,
  Sparkles,
  DollarSign,
  Layers,
  Copy,
  Info,
  Sliders,
  Calculator,
  ShieldCheck
} from 'lucide-react';
import { useShippingLocationsAdmin, ShippingLocation, defaultShippingLocations } from '../hooks/useShippingLocations';
import { fireToast } from './ToastNotification';

interface ShippingManagerProps {
  onBack?: () => void;
}

export default function ShippingManager({ onBack }: ShippingManagerProps) {
  const {
    locations,
    loading,
    error,
    isLiveConnected,
    updateLocation,
    addLocation,
    deleteLocation,
    seedDefaultLocations,
    reorderLocation,
    refetch
  } = useShippingLocationsAdmin();

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'disabled'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Inline Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFee, setEditFee] = useState<number>(0);
  const [editName, setEditName] = useState<string>('');
  const [editNote, setEditNote] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Add New Modal/Drawer State
  const [isAdding, setIsAdding] = useState(false);
  const [newLocation, setNewLocation] = useState({
    id: '',
    name: '',
    fee: 0,
    note: '',
    is_active: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Simulator State
  const [simWeightKg, setSimWeightKg] = useState<number>(1);
  const [simSubtotal, setSimSubtotal] = useState<number>(3500);

  // Manual Refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
    fireToast('Shipping rates refreshed live from database', 'success', 2000);
  };

  // Seed Default Locations
  const handleSeedDefaults = async () => {
    if (!confirm('Would you like to initialize/restore standard Philippine cold-chain shipping presets?')) return;
    const ok = await seedDefaultLocations();
    if (ok) {
      fireToast('Standard Philippine shipping rates initialized!', 'success');
    } else {
      fireToast('Initialized local defaults successfully', 'info');
    }
  };

  // Start Edit
  const handleEdit = (location: ShippingLocation) => {
    setEditingId(location.id);
    setEditFee(location.fee);
    setEditName(location.name);
    setEditNote(location.note || (location.fee === 0 ? 'Customer Pays Rider' : ''));
  };

  // Save Edit
  const handleSave = async (id: string) => {
    if (!editName.trim()) {
      fireToast('Location name cannot be empty', 'warning');
      return;
    }
    try {
      setIsSaving(true);
      const parsedFee = Math.max(0, Number(editFee));
      await updateLocation(id, {
        fee: parsedFee,
        name: editName.trim(),
        note: parsedFee === 0 ? (editNote.trim() || 'Customer Pays Rider') : undefined
      });
      setEditingId(null);
      fireToast('Shipping rate updated successfully', 'success');
    } catch (err: any) {
      fireToast(`Failed to update shipping location: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel Edit
  const handleCancel = () => {
    setEditingId(null);
  };

  // Quick Toggle Active Status
  const handleToggleActive = async (location: ShippingLocation) => {
    try {
      const nextStatus = !location.is_active;
      await updateLocation(location.id, { is_active: nextStatus });
      fireToast(
        `${location.name} is now ${nextStatus ? 'Active & visible in checkout' : 'Disabled'}`,
        nextStatus ? 'success' : 'info'
      );
    } catch (err: any) {
      fireToast(`Failed to toggle status: ${err.message}`, 'error');
    }
  };

  // Add New Location
  const handleAddNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocation.id.trim() || !newLocation.name.trim()) {
      fireToast('Location ID and Name are required', 'warning');
      return;
    }

    try {
      setIsSubmitting(true);
      const parsedFee = Math.max(0, Number(newLocation.fee));
      await addLocation({
        id: newLocation.id.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_'),
        name: newLocation.name.trim(),
        fee: parsedFee,
        note: parsedFee === 0 ? (newLocation.note.trim() || 'Customer Pays Rider') : undefined,
        is_active: newLocation.is_active
      });

      setIsAdding(false);
      setNewLocation({ id: '', name: '', fee: 0, note: '', is_active: true });
      fireToast('New shipping location added successfully', 'success');
    } catch (err: any) {
      fireToast(`Failed to add location: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Location
  const handleDelete = async (location: ShippingLocation) => {
    if (!confirm(`Are you sure you want to remove "${location.name}"?`)) return;
    try {
      await deleteLocation(location.id);
      fireToast(`Shipping location "${location.name}" deleted.`, 'info');
    } catch (err: any) {
      fireToast(`Failed to delete location: ${err.message}`, 'error');
    }
  };

  // Copy helper
  const copyText = (txt: string, label = 'Copied') => {
    navigator.clipboard.writeText(txt);
    fireToast(`${label} copied to clipboard`, 'success', 1800);
  };

  // Presets Helper for Quick Add
  const applyPreset = (preset: { id: string; name: string; fee: number; note?: string }) => {
    setNewLocation({
      id: preset.id,
      name: preset.name,
      fee: preset.fee,
      note: preset.note || (preset.fee === 0 ? 'Customer Pays Rider' : ''),
      is_active: true
    });
  };

  // Format Currency (PHP)
  const formatPHP = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // KPI Metrics
  const stats = useMemo(() => {
    const total = locations.length;
    const active = locations.filter(l => l.is_active);
    const disabled = locations.filter(l => !l.is_active);
    const freeDeliveryCount = active.filter(l => l.fee === 0).length;

    const fees = active.map(l => l.fee).filter(f => f > 0);
    const avgFee = fees.length > 0 ? fees.reduce((a, b) => a + b, 0) / fees.length : 0;

    return {
      total,
      activeCount: active.length,
      disabledCount: disabled.length,
      freeDeliveryCount,
      avgFee
    };
  }, [locations]);

  // Filtered & Searched Locations
  const filteredLocations = useMemo(() => {
    return locations
      .filter(loc => {
        if (filterStatus === 'active' && !loc.is_active) return false;
        if (filterStatus === 'disabled' && loc.is_active) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const nameMatch = loc.name.toLowerCase().includes(q);
          const idMatch = loc.id.toLowerCase().includes(q);
          return nameMatch || idMatch;
        }
        return true;
      })
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
  }, [locations, filterStatus, searchQuery]);

  if (loading && locations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] p-8 space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-[#3C6CA8]/10 border border-[#3C6CA8]/20 flex items-center justify-center animate-pulse">
          <RefreshCw className="w-6 h-6 text-[#3C6CA8] animate-spin" />
        </div>
        <p className="text-sm font-semibold text-slate-600">Loading Shipping Locations &amp; Rates...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-left max-w-7xl mx-auto pb-10">
      {/* ── Top Header & Live Sync Bar ── */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-9 h-9 rounded-xl bg-[#3C6CA8]/10 border border-[#3C6CA8]/20 flex items-center justify-center text-[#3C6CA8] shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Shipping Locations &amp; Courier Fees
                </h1>
                {/* Live Realtime Pulse Badge */}
                <div
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-all ${
                    isLiveConnected
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                  title={isLiveConnected ? 'Realtime sync connected to Supabase' : 'Reconnecting...'}
                >
                  <span className={`w-2 h-2 rounded-full ${isLiveConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  <span className="hidden xs:inline">{isLiveConnected ? 'Live Sync Active' : 'Connecting'}</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage Philippine delivery regions, cold-chain packaging fees &amp; same-day rider logistics.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 active:bg-slate-300 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-200 shadow-xs cursor-pointer disabled:opacity-50"
            title="Refresh Live Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#3C6CA8]' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setIsAdding(true)}
            className="px-3.5 py-2 rounded-xl bg-[#3C6CA8] hover:bg-[#315A8E] active:bg-[#264874] text-white text-xs font-black transition-all flex items-center gap-1.5 shadow-sm shadow-blue-500/20 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Location</span>
          </button>
        </div>
      </div>

      {/* ── KPI Metric Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Active Locations Card */}
        <div
          onClick={() => setFilterStatus('active')}
          className={`cursor-pointer bg-white rounded-2xl p-4 border transition-all relative overflow-hidden group shadow-xs ${
            filterStatus === 'active'
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20'
              : 'border-slate-200/80 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Active Regions</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">{stats.activeCount}</span>
            <span className="text-[11px] font-semibold text-emerald-600">Available at Checkout</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate">
            Active Philippine delivery zones
          </p>
        </div>

        {/* Average Standard Fee Card */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Average Base Fee</span>
            <div className="w-8 h-8 rounded-xl bg-blue-100/70 text-[#3C6CA8] flex items-center justify-center font-bold">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">{formatPHP(stats.avgFee)}</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate">
            Across standard courier routes
          </p>
        </div>

        {/* Free / Same-Day Courier Card */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Local / Rider Zones</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-100/70 text-indigo-700 flex items-center justify-center font-bold">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">{stats.freeDeliveryCount}</span>
            <span className="text-[11px] font-semibold text-indigo-600">₱0 Initial Fee (Maxim)</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate">
            Customer pays rider on drop-off
          </p>
        </div>

        {/* Total Registered Zones Card */}
        <div
          onClick={() => setFilterStatus('all')}
          className={`cursor-pointer bg-white rounded-2xl p-4 border transition-all relative overflow-hidden group shadow-xs ${
            filterStatus === 'all'
              ? 'border-[#3C6CA8] ring-2 ring-[#3C6CA8]/20 bg-blue-50/20'
              : 'border-slate-200/80 hover:border-[#3C6CA8]/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Configured</span>
            <div className="w-8 h-8 rounded-xl bg-[#3C6CA8]/10 text-[#3C6CA8] flex items-center justify-center font-bold">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">{stats.total}</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate">
            {stats.disabledCount > 0 ? `${stats.disabledCount} disabled` : 'All locations live'}
          </p>
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-3 sm:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input id="shippingmanager-search" name="search" type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Location ID (e.g. NCR, LUZON) or Display Name..."
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-50/80 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3C6CA8]/20 focus:border-[#3C6CA8] transition-all text-slate-800 placeholder-slate-400"
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

          {/* Quick Preset Seeder / Reset */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleSeedDefaults}
              className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all border border-slate-200 flex items-center gap-1.5 cursor-pointer"
              title="Reset to standard Philippine logistics presets"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Load PH Presets</span>
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-t border-slate-100 pt-3 custom-scrollbar">
          {(
            [
              { id: 'all', label: 'All Regions', count: stats.total },
              { id: 'active', label: 'Active', count: stats.activeCount },
              { id: 'disabled', label: 'Disabled', count: stats.disabledCount }
            ] as const
          ).map((tab) => {
            const active = filterStatus === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-[#3C6CA8] text-white shadow-sm'
                    : 'bg-slate-100/70 hover:bg-slate-100 text-slate-600'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    active ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Add New Location Modal Form ── */}
      {isAdding && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setIsAdding(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-5 sm:p-6 border border-slate-100 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#3C6CA8]/10 text-[#3C6CA8] flex items-center justify-center">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Add New Shipping Location</h3>
                  <p className="text-xs text-slate-500">Configure new Philippine delivery zone and fee</p>
                </div>
              </div>
              <button
                onClick={() => setIsAdding(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Presets Chips */}
            <div className="mb-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Quick Carrier / Region Presets:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'NCR', name: 'NCR / Metro Manila (1-2 Days)', fee: 80 },
                  { id: 'LUZON_PROV', name: 'Luzon Provincial (J&T Express 2-3 Days)', fee: 150 },
                  { id: 'VISAYAS', name: 'Visayas Regional (J&T Express 3-4 Days)', fee: 180 },
                  { id: 'MINDANAO', name: 'Mindanao Regional (J&T Express 3-5 Days)', fee: 200 },
                  { id: 'MAXIM_DAVAO', name: 'Maxim Same-Day Express (Booking fee on delivery)', fee: 0 },
                  { id: 'LALAMOVE_NCR', name: 'Lalamove / Grab Same-Day (Metro Manila)', fee: 0 },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="text-[11px] px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 text-slate-700 font-medium transition-colors cursor-pointer"
                  >
                    + {preset.name.split(' ')[0]} ({formatPHP(preset.fee)})
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleAddNew} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="shippingmanager-internal-location-id" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Internal Location ID *
                  </label>
                  <input id="shippingmanager-internal-location-id" name="internal_location_id" type="text"
                    required
                    value={newLocation.id}
                    onChange={(e) =>
                      setNewLocation({
                        ...newLocation,
                        id: e.target.value.toUpperCase().replace(/\s+/g, '_')
                      })
                    }
                    placeholder="e.g. CEBU_CITY"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#3C6CA8]/20 focus:border-[#3C6CA8] outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Unique uppercase identifier</span>
                </div>

                <div>
                  <label htmlFor="shippingmanager-shipping-fee" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Shipping Fee (₱) *
                  </label>
                  <input id="shippingmanager-shipping-fee" name="shipping_fee" type="number"
                    min={0}
                    required
                    value={newLocation.fee}
                    onChange={(e) => setNewLocation({ ...newLocation, fee: Number(e.target.value) })}
                    placeholder="0"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#3C6CA8]/20 focus:border-[#3C6CA8] outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Use ₱0 for customer-booked couriers</span>
                </div>
              </div>

              <div>
                <label htmlFor="shippingmanager-customer-display-name" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Customer Display Name *
                </label>
                <input id="shippingmanager-customer-display-name" name="customer_display_name" type="text"
                  required
                  value={newLocation.name}
                  autoComplete="name" onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                  placeholder="e.g. Metro Cebu (J&T Express 2-3 Business Days)"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#3C6CA8]/20 focus:border-[#3C6CA8] outline-none"
                />
              </div>

              {Number(newLocation.fee) === 0 && (
                <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-1">
                  <label htmlFor="shippingmanager-delivery-details-note-0-rate" className="block text-[11px] font-bold text-indigo-900 uppercase tracking-wider">
                    Delivery Details / Note (₱0 Rate)
                  </label>
                  <input id="shippingmanager-delivery-details-note-0-rate" name="delivery_details_note_0_rate" type="text"
                    value={newLocation.note}
                    onChange={(e) => setNewLocation({ ...newLocation, note: e.target.value })}
                    placeholder="e.g. Customer Pays Rider / Free Delivery"
                    className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                  <span className="text-[10px] text-indigo-600 block">
                    Custom label shown next to ₱0.00 (e.g. "Customer Pays Rider" or "Free Shipping")
                  </span>
                </div>
              )}

              {/* Status Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Active Status</span>
                  <span className="text-[11px] text-slate-500">Enable immediately in checkout delivery dropdown</span>
                </div>
                <button
                  type="button"
                  onClick={() => setNewLocation({ ...newLocation, is_active: !newLocation.is_active })}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    newLocation.is_active ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      newLocation.is_active ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-[#3C6CA8] hover:bg-[#315A8E] text-white font-bold text-xs transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 stroke-[3]" />}
                  <span>Save Location</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Shipping Locations List ── */}
      {filteredLocations.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <MapPin className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Shipping Locations Found</h3>
          <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `No shipping records matching "${searchQuery}".`
              : 'Add custom shipping locations or initialize default Philippine delivery regions.'}
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <button
              onClick={handleSeedDefaults}
              className="px-4 py-2 bg-[#3C6CA8] hover:bg-[#315A8E] text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-sm flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Initialize Standard Rates</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLocations.map((location, index) => {
            const isEditing = editingId === location.id;

            return (
              <div
                key={location.id}
                className={`bg-white rounded-2xl shadow-xs border transition-all duration-200 overflow-hidden ${
                  !location.is_active
                    ? 'border-slate-200 bg-slate-50/50 opacity-75'
                    : isEditing
                    ? 'border-[#3C6CA8] ring-2 ring-[#3C6CA8]/15'
                    : 'border-slate-200/90 hover:border-slate-300 hover:shadow-md'
                }`}
              >
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  {/* Left Column: Reorder Controls + ID & Name */}
                  <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                    {/* Order Index & Up/Down Arrows */}
                    <div className="flex flex-col items-center justify-center shrink-0 bg-slate-50 border border-slate-200 rounded-xl p-1">
                      <button
                        onClick={() => reorderLocation(location.id, 'up')}
                        disabled={index === 0}
                        className="p-1 text-slate-400 hover:text-[#3C6CA8] disabled:opacity-20 disabled:hover:text-slate-400 transition-colors cursor-pointer"
                        title="Move Up in Checkout Dropdown"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[10px] font-mono font-extrabold text-slate-500 px-1">
                        {index + 1}
                      </span>
                      <button
                        onClick={() => reorderLocation(location.id, 'down')}
                        disabled={index === filteredLocations.length - 1}
                        className="p-1 text-slate-400 hover:text-[#3C6CA8] disabled:opacity-20 disabled:hover:text-slate-400 transition-colors cursor-pointer"
                        title="Move Down in Checkout Dropdown"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Info / Editing Block */}
                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold">
                              {location.id}
                            </span>
                            <span className="text-[10px] text-slate-400">Editing Region</span>
                          </div>
                          <input id="shippingmanager-input-2" name="input_2" type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Location Display Name"
                            className="w-full px-3 py-1.5 text-xs font-bold text-slate-800 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3C6CA8]/20 focus:border-[#3C6CA8] outline-none"
                          />
                          {Number(editFee) === 0 && (
                            <div className="mt-1">
                              <label htmlFor="shippingmanager-delivery-details-note-0-rate" className="block text-[10px] font-extrabold text-indigo-700 uppercase tracking-wider mb-0.5">
                                Delivery Details / Note (₱0 Rate)
                              </label>
                              <input id="shippingmanager-delivery-details-note-0-rate" name="delivery_details_note_0_rate" type="text"
                                value={editNote}
                                onChange={(e) => setEditNote(e.target.value)}
                                placeholder="e.g. Customer Pays Rider / Free Delivery / Rider on Drop-off"
                                className="w-full px-3 py-1.5 text-xs font-semibold text-indigo-900 bg-indigo-50/50 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-extrabold border border-slate-200">
                              {location.id}
                            </span>
                            <button
                              onClick={() => copyText(location.id, 'Location ID')}
                              className="text-slate-300 hover:text-slate-500 p-0.5"
                              title="Copy ID"
                            >
                              <Copy className="w-3 h-3" />
                            </button>

                            {!location.is_active && (
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                                Disabled
                              </span>
                            )}
                            {location.is_active && location.fee === 0 && (
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                                {location.note || 'Rider / Same-Day'}
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-sm sm:text-base text-slate-900 mt-1 truncate">
                            {location.name}
                          </h4>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Fee, Toggle & Action Buttons */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                    {/* Fee display / edit */}
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Delivery Rate
                      </span>
                      {isEditing ? (
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-xs font-bold text-slate-500">₱</span>
                          <input id="shippingmanager-input-3" name="input_3" type="number"
                            min={0}
                            value={editFee}
                            onChange={(e) => setEditFee(Number(e.target.value))}
                            className="w-24 px-2 py-1 text-xs font-bold text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3C6CA8]/20 focus:border-[#3C6CA8] outline-none"
                          />
                        </div>
                      ) : (
                        <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                          {location.fee === 0 ? (
                            <span className="text-indigo-600 font-extrabold text-sm">₱0.00 ({location.note || 'Customer Pays Rider'})</span>
                          ) : (
                            formatPHP(location.fee)
                          )}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => handleSave(location.id)}
                            disabled={isSaving}
                            className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
                            title="Save Changes"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span className="hidden xs:inline">Save</span>
                          </button>
                          <button
                            onClick={handleCancel}
                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors cursor-pointer"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          {/* Active Toggle Switch */}
                          <button
                            onClick={() => handleToggleActive(location)}
                            className={`p-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold ${
                              location.is_active
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                            }`}
                            title={location.is_active ? 'Click to Disable' : 'Click to Enable'}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span className="text-[11px] hidden sm:inline">
                              {location.is_active ? 'Active' : 'Disabled'}
                            </span>
                          </button>

                          {/* Quick Edit */}
                          <button
                            onClick={() => handleEdit(location)}
                            className="p-2 text-[#3C6CA8] bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors cursor-pointer"
                            title="Edit Location & Fee"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(location)}
                            className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer"
                            title="Delete Location"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Interactive Live Shipping Calculator Simulator ── */}
      <div className="bg-gradient-to-br from-slate-900 to-[#131D2D] text-white rounded-2xl shadow-md p-4 sm:p-6 border border-slate-800">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-[#3C6CA8] flex items-center justify-center border border-blue-500/30">
              <Calculator className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">Live Checkout Shipping Fee Simulator</h3>
              <p className="text-xs text-slate-400">Preview how shipping calculation renders in the customer checkout modal</p>
            </div>
          </div>
          <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Realtime Preview
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          {locations
            .filter(l => l.is_active)
            .map((loc) => {
              const estimatedTotal = simSubtotal + loc.fee;
              return (
                <div key={loc.id} className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 hover:border-blue-500/40 transition-colors">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-slate-200 truncate">{loc.name.split('(')[0]}</span>
                    <span className="font-mono font-black text-blue-400">{loc.fee === 0 ? '₱0 (Rider)' : formatPHP(loc.fee)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-700/50 mt-2">
                    <span>Simulated Total (₱3.5k cart):</span>
                    <span className="font-bold text-white">{formatPHP(estimatedTotal)}</span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* ── Guidance / Policy Note ── */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 flex items-start gap-3 text-xs text-slate-600">
        <Info className="w-4 h-4 text-[#3C6CA8] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-bold text-slate-800">Cold-Chain &amp; Shipping Policy Guidelines</h4>
          <p className="leading-relaxed">
            • Changes to shipping fees update instantly in real-time on customer cart and checkout pages without needing server restarts.<br />
            • Disabled delivery zones are automatically hidden from checkout destination select menus.<br />
            • Maxim and Same-Day express riders calculate booking fees dynamically on collection in Davao / Metro hubs.
          </p>
        </div>
      </div>
    </div>
  );
}
