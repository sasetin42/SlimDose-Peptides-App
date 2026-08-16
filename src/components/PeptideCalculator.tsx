import React, { useState, useEffect } from 'react';
import { Calculator, RotateCcw, Syringe, Droplets, FlaskConical, AlertTriangle, Sparkles, Check, Bookmark, Printer, Copy, FileText, Info, Plus, Pencil, Trash2, Settings, ShieldCheck, X, ArrowLeft, ArrowRight } from 'lucide-react';
import { useCart } from '../hooks/useCart';
import { supabase } from '../lib/supabase';
import { fireToast } from './ToastNotification';
import { PrintPreviewModal } from './PrintPreviewModal';

interface SyringeOption {
    id: string;
    name: string;
    unitsPerMl: number;
    maxVolume: number;
}

export interface PeptidePreset {
    id?: string;
    name: string;
    vialMg: number;
    waterMl: number;
    doseMg: number;
    unit: 'mg' | 'mcg';
    description: string;
    badgeColor: string;
}

const SYRINGE_OPTIONS: SyringeOption[] = [
    { id: 'u100-1ml', name: 'U-100 Standard (1ml)', unitsPerMl: 100, maxVolume: 1.0 },
    { id: 'u100-0.5ml', name: 'U-100 Small (0.5ml)', unitsPerMl: 100, maxVolume: 0.5 },
    { id: 'u100-0.3ml', name: 'U-100 Micro (0.3ml)', unitsPerMl: 100, maxVolume: 0.3 },
    { id: 'u40-1ml', name: 'U-40 (1ml)', unitsPerMl: 40, maxVolume: 1.0 },
];

const DEFAULT_PRESETS: PeptidePreset[] = [
    { name: 'Semaglutide 5mg', vialMg: 5, waterMl: 2, doseMg: 0.25, unit: 'mg', description: 'Standard 5mg vial w/ 2ml BAC water (0.25mg start dose)', badgeColor: 'bg-blue-50 text-blue-700 border-blue-200' },
    { name: 'Tirzepatide 10mg', vialMg: 10, waterMl: 2, doseMg: 2.5, unit: 'mg', description: 'Standard 10mg vial w/ 2ml BAC water (2.5mg start dose)', badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { name: 'Retatrutide 10mg', vialMg: 10, waterMl: 2, doseMg: 2.0, unit: 'mg', description: 'Triple agonist 10mg vial w/ 2ml BAC water (2mg start dose)', badgeColor: 'bg-purple-50 text-purple-700 border-purple-200' },
    { name: 'BPC-157 5mg', vialMg: 5, waterMl: 2.5, doseMg: 250, unit: 'mcg', description: 'Recovery peptide 5mg vial w/ 2.5ml water (250mcg dose)', badgeColor: 'bg-amber-50 text-amber-700 border-amber-200' },
    { name: 'NAD+ 500mg', vialMg: 500, waterMl: 5, doseMg: 50, unit: 'mg', description: 'Cellular energy 500mg vial w/ 5ml water (50mg dose)', badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { name: 'CJC / Ipamorelin 10mg', vialMg: 10, waterMl: 3, doseMg: 300, unit: 'mcg', description: 'Growth peptide blend 10mg vial w/ 3ml water (300mcg dose)', badgeColor: 'bg-teal-50 text-teal-700 border-teal-200' },
];

const COLOR_THEMES = [
    { name: 'Blue', colorClass: 'bg-blue-50 text-blue-700 border-blue-200' },
    { name: 'Emerald', colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { name: 'Purple', colorClass: 'bg-purple-50 text-purple-700 border-purple-200' },
    { name: 'Amber', colorClass: 'bg-amber-50 text-amber-700 border-amber-200' },
    { name: 'Indigo', colorClass: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { name: 'Teal', colorClass: 'bg-teal-50 text-teal-700 border-teal-200' },
    { name: 'Rose', colorClass: 'bg-rose-50 text-rose-700 border-rose-200' },
    { name: 'Sky', colorClass: 'bg-sky-50 text-sky-700 border-sky-200' },
];

const PRESETS_STORAGE_KEY = 'slimdose_peptide_presets';

const PeptideCalculator: React.FC = () => {
    const [selectedSyringe, setSelectedSyringe] = useState<SyringeOption>(SYRINGE_OPTIONS[0]);
    const [selectedUnit, setSelectedUnit] = useState<'mg' | 'mcg'>('mg');
    const [vialQuantityMg, setVialQuantityMg] = useState<number | ''>(5);
    const [waterAddedMl, setWaterAddedMl] = useState<number | ''>(2);
    const [desiredDoseMg, setDesiredDoseMg] = useState<number | ''>(0.25);

    const [resultUnits, setResultUnits] = useState<number | null>(null);
    const [resultMgPerUnit, setResultMgPerUnit] = useState<number | null>(null);
    const [copied, setCopied] = useState(false);
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [currentPresetName, setCurrentPresetName] = useState<string>('Semaglutide 5mg');

    // Admin & Presets state
    const [isAdmin, setIsAdmin] = useState(false);
    const [adminSession, setAdminSession] = useState<{ email?: string; role?: string } | null>(null);
    const [presets, setPresets] = useState<PeptidePreset[]>(() => {
        try {
            const saved = localStorage.getItem(PRESETS_STORAGE_KEY);
            if (saved) return JSON.parse(saved);
        } catch {}
        return DEFAULT_PRESETS;
    });

    // Preset Editor Modal state
    const [editingPresetIndex, setEditingPresetIndex] = useState<number | null>(null);
    const [isAddMode, setIsAddMode] = useState(false);
    const [presetFormData, setPresetFormData] = useState<PeptidePreset>({
        name: '',
        vialMg: 5,
        waterMl: 2,
        doseMg: 0.25,
        unit: 'mg',
        description: '',
        badgeColor: COLOR_THEMES[0].colorClass,
    });
    const [isSavingRemote, setIsSavingRemote] = useState(false);

    // Check admin authentication
    useEffect(() => {
        const verifyAdmin = () => {
            try {
                const sessionRaw = sessionStorage.getItem('admin_session') || localStorage.getItem('admin_session');
                if (sessionRaw) {
                    const session = JSON.parse(sessionRaw);
                    if (session.token === 'authenticated_v1' && session.email) {
                        setIsAdmin(true);
                        setAdminSession(session);
                        return;
                    }
                }
            } catch {}
            setIsAdmin(false);
            setAdminSession(null);
        };

        verifyAdmin();
        window.addEventListener('storage', verifyAdmin);
        return () => window.removeEventListener('storage', verifyAdmin);
    }, []);

    // Load Presets from Remote Database (Supabase page_contents)
    useEffect(() => {
        const fetchRemotePresets = async () => {
            try {
                const { data, error } = await supabase
                    .from('page_contents')
                    .select('*')
                    .eq('page_id', 'peptide_presets')
                    .maybeSingle();

                if (!error && data && data.content && Array.isArray(data.content.presets) && data.content.presets.length > 0) {
                    setPresets(data.content.presets);
                    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(data.content.presets));
                }
            } catch (err) {
                console.warn('Could not load remote presets, using cached/default:', err);
            }
        };

        fetchRemotePresets();
    }, []);

    useEffect(() => {
        calculate();
    }, [vialQuantityMg, waterAddedMl, desiredDoseMg, selectedSyringe, selectedUnit]);

    const calculate = () => {
        if (vialQuantityMg && waterAddedMl && desiredDoseMg) {
            const vialMg = Number(vialQuantityMg);
            const doseMg = selectedUnit === 'mcg' ? Number(desiredDoseMg) / 1000 : Number(desiredDoseMg);

            const concentrationMgPerMl = vialMg / Number(waterAddedMl);
            const volumeToInjectMl = doseMg / concentrationMgPerMl;
            const units = volumeToInjectMl * selectedSyringe.unitsPerMl;

            const totalMg = vialMg;
            const totalUnits = Number(waterAddedMl) * selectedSyringe.unitsPerMl;
            const mgPerUnit = totalMg / totalUnits;

            setResultUnits(Number(units.toFixed(1)));
            setResultMgPerUnit(Number(mgPerUnit.toFixed(4)));
        } else {
            setResultUnits(null);
            setResultMgPerUnit(null);
        }
    };

    const handleApplyPreset = (preset: PeptidePreset) => {
        setVialQuantityMg(preset.vialMg);
        setWaterAddedMl(preset.waterMl);
        setDesiredDoseMg(preset.doseMg);
        setSelectedUnit(preset.unit);
        setCurrentPresetName(preset.name);
    };

    const handleReset = () => {
        setVialQuantityMg('');
        setWaterAddedMl('');
        setDesiredDoseMg('');
        setResultUnits(null);
        setResultMgPerUnit(null);
        setCurrentPresetName('Custom Research Compound');
    };

    // Save Presets (Local + Supabase)
    const persistPresets = async (updatedPresets: PeptidePreset[]) => {
        setPresets(updatedPresets);
        localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(updatedPresets));

        if (isAdmin) {
            setIsSavingRemote(true);
            try {
                await supabase
                    .from('page_contents')
                    .upsert({
                        page_id: 'peptide_presets',
                        content: { presets: updatedPresets },
                        updated_at: new Date().toISOString()
                    });

                // Audit log
                try {
                    await supabase.from('audit_logs').insert([{
                        actor_email: adminSession?.email || 'admin@slimdose.ph',
                        actor_role: adminSession?.role || 'admin',
                        action: 'UPDATE_PEPTIDE_PRESETS',
                        details: `Updated ${updatedPresets.length} peptide presets`
                    }]);
                } catch {}
            } catch (err) {
                console.error('Error syncing presets to remote:', err);
            } finally {
                setIsSavingRemote(false);
            }
        }
    };

    // Open Modal for Editing an existing Preset
    const handleOpenEdit = (index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isAdmin) return;
        setEditingPresetIndex(index);
        setIsAddMode(false);
        setPresetFormData({ ...presets[index] });
    };

    // Open Modal to Add a new Preset
    const handleOpenAdd = () => {
        if (!isAdmin) return;
        setEditingPresetIndex(null);
        setIsAddMode(true);
        setPresetFormData({
            name: '',
            vialMg: 10,
            waterMl: 2,
            doseMg: 1.0,
            unit: 'mg',
            description: '',
            badgeColor: COLOR_THEMES[0].colorClass,
        });
    };

    // Save current form data
    const handleSavePresetForm = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAdmin) {
            fireToast('Admin privileges required to modify presets', 'error');
            return;
        }
        if (!presetFormData.name.trim()) {
            fireToast('Preset name is required', 'error');
            return;
        }

        let updated: PeptidePreset[];
        if (isAddMode) {
            updated = [...presets, { ...presetFormData }];
            fireToast(`Added "${presetFormData.name}" to presets!`, 'success');
        } else if (editingPresetIndex !== null) {
            updated = presets.map((p, idx) => (idx === editingPresetIndex ? { ...presetFormData } : p));
            fireToast(`Updated "${presetFormData.name}" preset!`, 'success');
        } else {
            return;
        }

        await persistPresets(updated);
        setEditingPresetIndex(null);
        setIsAddMode(false);
    };

    // Delete a preset
    const handleDeletePreset = async (index: number, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!isAdmin) return;
        const target = presets[index];
        if (!window.confirm(`Are you sure you want to delete "${target?.name}"?`)) return;

        const updated = presets.filter((_, idx) => idx !== index);
        await persistPresets(updated);
        fireToast(`Deleted "${target?.name}"`, 'info');
        if (editingPresetIndex === index) {
            setEditingPresetIndex(null);
            setIsAddMode(false);
        }
    };

    // Move Preset (Reordering)
    const handleMovePreset = async (index: number, direction: 'left' | 'right', e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!isAdmin) return;
        const targetIndex = direction === 'left' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= presets.length) return;

        const updated = [...presets];
        const [movedItem] = updated.splice(index, 1);
        updated.splice(targetIndex, 0, movedItem);

        await persistPresets(updated);
        if (editingPresetIndex === index) {
            setEditingPresetIndex(targetIndex);
        }
    };

    // Restore Default Presets
    const handleRestoreDefaults = async () => {
        if (!isAdmin) return;
        if (!window.confirm('Reset all presets back to the default factory list? This will overwrite your custom presets.')) return;
        await persistPresets(DEFAULT_PRESETS);
        fireToast('Restored default presets', 'success');
    };

    const handleCopySummary = () => {
        if (!resultUnits || !resultMgPerUnit) return;
        const volumeMl = (resultUnits / selectedSyringe.unitsPerMl).toFixed(2);
        const concentration = (Number(vialQuantityMg) / Number(waterAddedMl)).toFixed(2);
        const text = `=========================================
SLIMDOSE™ PRECISION RECONSTITUTION SHEET
Compound: ${currentPresetName}
=========================================
CALCULATED SYRINGE DRAW:
▶ Syringe Draw: ${resultUnits} Units (${volumeMl} ml)
▶ Target Dose: ${desiredDoseMg} ${selectedUnit}
▶ Syringe: ${selectedSyringe.name}

RECONSTITUTION METRICS:
- Vial Size: ${vialQuantityMg} mg
- BAC Water Added: ${waterAddedMl} ml
- Concentration: ${concentration} mg/ml
- Potency per Unit: ${resultMgPerUnit} mg/unit (${(resultMgPerUnit * 1000).toFixed(1)} mcg/unit)

STORAGE & HANDLING:
- Store refrigerated at 2°C–8°C. Protect from direct light.
- Gently swirl to dissolve. DO NOT SHAKE.
=========================================`;
        navigator.clipboard.writeText(text);
        setCopied(true);
        fireToast('Summary protocol sheet copied to clipboard', 'success');
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-slate-50 dark:bg-slate-950 font-inter min-h-screen py-6 md:py-10 transition-colors">
            <main className="container-global mx-auto px-4 sm:px-6 lg:px-8">
                <div className="max-w-6xl mx-auto space-y-6">
                    {/* Header Section - Compact */}
                    <div className="text-center max-w-2xl mx-auto space-y-2">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#3C6CA8]/10 text-[#3C6CA8] font-bold text-[11px] border border-[#3C6CA8]/20 shadow-xs">
                            <Calculator className="w-3.5 h-3.5" />
                            <span>Precision Research Tool</span>
                        </div>
                        <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
                            Peptide Dosage Calculator
                        </h1>
                        <p className="text-xs md:text-sm text-gray-500 dark:text-slate-400 font-medium">
                            Accurately calculate your peptide reconstitution, concentration, and exact syringe unit draw.
                        </p>
                    </div>

                    {/* Quick Presets Bar with Custom Editable Controls (Admin Only) */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-slate-800 space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-slate-400 flex items-center gap-1.5">
                                    <Bookmark className="w-3.5 h-3.5 text-[#3C6CA8]" /> Quick Peptide Presets
                                </h3>
                                {isAdmin && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#3C6CA8]/10 text-[#3C6CA8] font-bold text-[10px] border border-[#3C6CA8]/20 shadow-xs">
                                        <Pencil className="w-2.5 h-2.5" /> Editable (Admin)
                                    </span>
                                )}
                            </div>

                            {/* Preset Controls: Add Preset, Reset (Admin Only) */}
                            {isAdmin && (
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={handleOpenAdd}
                                        className="px-2.5 py-1 rounded-lg bg-[#3C6CA8] hover:bg-[#325a8c] text-white text-[11px] font-bold flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                                        title="Add New Custom Preset"
                                    >
                                        <Plus className="w-3 h-3" />
                                        <span>Add Preset</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleRestoreDefaults}
                                        className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 text-[10px] font-bold transition-all cursor-pointer"
                                        title="Reset to factory preset list"
                                    >
                                        <RotateCcw className="w-3 h-3 inline mr-1" />
                                        Reset
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Presets Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                            {presets.map((p, idx) => (
                                <div
                                    key={idx}
                                    className="relative group/preset rounded-xl"
                                >
                                    <button
                                        type="button"
                                        onClick={() => handleApplyPreset(p)}
                                        className={`w-full p-2.5 rounded-xl border text-left transition-all hover:scale-[1.02] active:scale-95 cursor-pointer shadow-xs ${p.badgeColor}`}
                                        title={p.description || `Click to load ${p.name}`}
                                    >
                                        <p className="font-extrabold text-xs leading-tight truncate">{p.name}</p>
                                        <p className="text-[10px] opacity-80 mt-0.5 truncate">{p.vialMg}mg · {p.waterMl}ml</p>
                                    </button>

                                    {/* Direct In-Card Action Buttons (Admin Only) */}
                                    {isAdmin && (
                                        <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover/preset:opacity-100 focus-within:opacity-100 transition-opacity z-10">
                                            <button
                                                type="button"
                                                onClick={(e) => handleOpenEdit(idx, e)}
                                                className="p-1 rounded-md bg-white/95 dark:bg-slate-800/95 text-gray-700 dark:text-slate-200 hover:text-[#3C6CA8] hover:bg-white shadow-xs border border-gray-200 dark:border-slate-700 transition-all cursor-pointer"
                                                title="Edit this preset"
                                            >
                                                <Pencil className="w-2.5 h-2.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => handleDeletePreset(idx, e)}
                                                className="p-1 rounded-md bg-white/95 dark:bg-slate-800/95 text-gray-700 dark:text-slate-200 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 shadow-xs border border-gray-200 dark:border-slate-700 transition-all cursor-pointer"
                                                title="Delete this preset"
                                            >
                                                <Trash2 className="w-2.5 h-2.5" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Direct Preset Edit/Add Modal (Admin Only) */}
                    {(isAddMode || editingPresetIndex !== null) && isAdmin && (
                        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
                            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl max-w-lg w-full space-y-4 my-auto">
                                <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-xl bg-[#3C6CA8]/10 text-[#3C6CA8] flex items-center justify-center">
                                            {isAddMode ? <Plus className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                                        </div>
                                        <div>
                                            <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">
                                                {isAddMode ? 'Add New Quick Peptide Preset' : 'Edit Peptide Preset'}
                                            </h3>
                                            <p className="text-[10px] text-gray-400">
                                                Updates live presets for all visitors immediately
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditingPresetIndex(null);
                                            setIsAddMode(false);
                                        }}
                                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                <form onSubmit={handleSavePresetForm} className="space-y-3.5">
                                    {/* Preset Name */}
                                    <div>
                                        <label htmlFor="peptidecalculator-preset-title-compound-name" className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                                            Preset Title / Compound Name *
                                        </label>
                                        <input id="peptidecalculator-preset-title-compound-name" name="preset_title_compound_name" type="text"
                                            required
                                            value={presetFormData.name}
                                            onChange={(e) => setPresetFormData({ ...presetFormData, name: e.target.value })}
                                            placeholder="e.g., Tirzepatide 15mg"
                                            className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none"
                                        />
                                    </div>

                                    {/* Numbers Grid: Vial Mg, Water Ml, Dose */}
                                    <div className="grid grid-cols-3 gap-2.5">
                                        <div>
                                            <label htmlFor="peptidecalculator-vial-size-mg" className="block text-[10px] font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                                                Vial Size (mg)
                                            </label>
                                            <input id="peptidecalculator-vial-size-mg" name="vial_size_mg" type="number"
                                                step="any"
                                                min="0.01"
                                                required
                                                value={presetFormData.vialMg}
                                                onChange={(e) => setPresetFormData({ ...presetFormData, vialMg: parseFloat(e.target.value) || 0 })}
                                                className="w-full px-2.5 py-2 border border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="peptidecalculator-bac-water-ml" className="block text-[10px] font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                                                BAC Water (ml)
                                            </label>
                                            <input id="peptidecalculator-bac-water-ml" name="bac_water_ml" type="number"
                                                step="any"
                                                min="0.1"
                                                required
                                                value={presetFormData.waterMl}
                                                onChange={(e) => setPresetFormData({ ...presetFormData, waterMl: parseFloat(e.target.value) || 0 })}
                                                className="w-full px-2.5 py-2 border border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="peptidecalculator-starting-dose" className="block text-[10px] font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                                                Starting Dose
                                            </label>
                                            <input id="peptidecalculator-starting-dose" name="starting_dose" type="number"
                                                step="any"
                                                min="0.001"
                                                required
                                                value={presetFormData.doseMg}
                                                onChange={(e) => setPresetFormData({ ...presetFormData, doseMg: parseFloat(e.target.value) || 0 })}
                                                className="w-full px-2.5 py-2 border border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none"
                                            />
                                        </div>
                                    </div>

                                    {/* Unit Selector */}
                                    <div>
                                        <label htmlFor="peptidecalculator-dose-unit-mg-mcg-as-const-map-" className="block text-[10px] font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                                            Dose Unit
                                        </label>
                                        <div className="flex gap-2">
                                            {(['mg', 'mcg'] as const).map((unit) => (
                                                <button
                                                    key={unit}
                                                    type="button"
                                                    onClick={() => setPresetFormData({ ...presetFormData, unit })}
                                                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                                        presetFormData.unit === unit
                                                            ? 'bg-[#3C6CA8] text-white shadow-xs'
                                                            : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200'
                                                    }`}
                                                >
                                                    {unit.toUpperCase()}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <label htmlFor="peptidecalculator-dose-unit-mg-mcg-as-const-map-" className="block text-[10px] font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                                            Notes / Subtext (Optional)
                                        </label>
                                        <input id="peptidecalculator-dose-unit-mg-mcg-as-const-map-" name="dose_unit_mg_mcg_as_const_map_" type="text"
                                            value={presetFormData.description}
                                            onChange={(e) => setPresetFormData({ ...presetFormData, description: e.target.value })}
                                            placeholder="e.g. Standard 15mg vial w/ 3ml BAC water (2.5mg start dose)"
                                            className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-[#3C6CA8]/30 outline-none"
                                        />
                                    </div>

                                    {/* Color Theme Selector */}
                                    <div>
                                        <label htmlFor="peptidecalculator-card-color-theme-color-themes-" className="block text-[10px] font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                                            Card Color Theme
                                        </label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {COLOR_THEMES.map((theme) => (
                                                <button
                                                    key={theme.name}
                                                    type="button"
                                                    onClick={() => setPresetFormData({ ...presetFormData, badgeColor: theme.colorClass })}
                                                    className={`p-2 rounded-xl border text-center text-[10px] font-bold transition-all cursor-pointer ${theme.colorClass} ${
                                                        presetFormData.badgeColor === theme.colorClass ? 'ring-2 ring-[#3C6CA8] scale-[1.03]' : 'opacity-70 hover:opacity-100'
                                                    }`}
                                                >
                                                    {theme.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Position Reordering Controls (Only when editing) */}
                                    {editingPresetIndex !== null && (
                                        <div className="pt-2 flex items-center justify-between text-xs text-gray-500 border-t border-gray-100 dark:border-slate-800">
                                            <span className="text-[11px] font-bold">Position #{editingPresetIndex + 1} of {presets.length}</span>
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    type="button"
                                                    disabled={editingPresetIndex === 0}
                                                    onClick={() => handleMovePreset(editingPresetIndex, 'left')}
                                                    className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-slate-300 disabled:opacity-30 text-[10px] font-bold cursor-pointer"
                                                >
                                                    <ArrowLeft className="w-3 h-3 inline mr-0.5" /> Move Left
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={editingPresetIndex === presets.length - 1}
                                                    onClick={() => handleMovePreset(editingPresetIndex, 'right')}
                                                    className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-slate-300 disabled:opacity-30 text-[10px] font-bold cursor-pointer"
                                                >
                                                    Move Right <ArrowRight className="w-3 h-3 inline ml-0.5" />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-slate-800 gap-2">
                                        {editingPresetIndex !== null ? (
                                            <button
                                                type="button"
                                                onClick={() => handleDeletePreset(editingPresetIndex)}
                                                className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" /> Delete
                                            </button>
                                        ) : <div />}

                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditingPresetIndex(null);
                                                    setIsAddMode(false);
                                                }}
                                                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={isSavingRemote}
                                                className="px-5 py-2 rounded-xl bg-[#3C6CA8] hover:bg-[#325a8c] text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                            >
                                                <Check className="w-3.5 h-3.5" />
                                                <span>{isSavingRemote ? 'Saving...' : 'Save Changes'}</span>
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Top Row: Balanced 2 Equal Columns (Controls & Draw Results) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                        {/* Card 1: Input Controls */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-md border border-gray-200 dark:border-slate-800 overflow-hidden flex flex-col justify-between">
                            <div className="bg-[#3C6CA8] px-5 py-3 flex items-center justify-between text-white">
                                <h2 className="font-extrabold text-sm flex items-center gap-2">
                                    <Calculator className="w-4 h-4" />
                                    <span>Calculator Controls</span>
                                </h2>
                                <button
                                    onClick={handleReset}
                                    className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center gap-1 transition-all cursor-pointer"
                                >
                                    <RotateCcw className="w-3 h-3" />
                                    <span>Reset</span>
                                </button>
                            </div>

                            <div className="p-5 md:p-6 space-y-4 flex-1">
                                {/* Syringe Type Selection */}
                                <div className="space-y-1">
                                    <label htmlFor="peptidecalculator-card-color-theme-color-themes-" className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                        <Syringe className="w-3.5 h-3.5 text-purple-500" />
                                        Syringe Type
                                    </label>
                                    <select id="peptidecalculator-card-color-theme-color-themes-" name="card_color_theme_color_themes_" value={selectedSyringe.id}
                                        onChange={(e) => {
                                            const syringe = SYRINGE_OPTIONS.find(s => s.id === e.target.value);
                                            if (syringe) setSelectedSyringe(syringe);
                                        }}
                                        className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] outline-none bg-gray-50 dark:bg-slate-800 text-gray-800 dark:text-slate-100 font-bold text-xs cursor-pointer"
                                    >
                                        {SYRINGE_OPTIONS.map((option) => (
                                            <option key={option.id} value={option.id}>
                                                {option.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Vial Quantity */}
                                <div className="space-y-1">
                                    <label htmlFor="peptidecalculator-vial-size-quantity" className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                        <FlaskConical className="w-3.5 h-3.5 text-amber-500" />
                                        Vial Size (Quantity)
                                    </label>
                                    <div className="relative">
                                        <input id="peptidecalculator-vial-size-quantity" name="vial_size_quantity" type="number"
                                            value={vialQuantityMg}
                                            onChange={(e) => setVialQuantityMg(e.target.value === '' ? '' : Number(e.target.value))}
                                            placeholder="e.g. 5, 10"
                                            className="w-full pl-3 pr-12 py-2 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] outline-none bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 font-bold text-xs"
                                        />
                                        <div className="absolute inset-y-0 right-0 flex items-center px-3 bg-gray-100 dark:bg-slate-700 border-l border-gray-200 dark:border-slate-600 rounded-r-xl text-gray-600 dark:text-slate-300 text-[11px] font-black">
                                            mg
                                        </div>
                                    </div>
                                </div>

                                {/* Water Added */}
                                <div className="space-y-1">
                                    <label htmlFor="peptidecalculator-bacteriostatic-water-added" className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                        <Droplets className="w-3.5 h-3.5 text-blue-500" />
                                        Bacteriostatic Water Added
                                    </label>
                                    <div className="relative">
                                        <input id="peptidecalculator-bacteriostatic-water-added" name="bacteriostatic_water_added" type="number"
                                            value={waterAddedMl}
                                            onChange={(e) => setWaterAddedMl(e.target.value === '' ? '' : Number(e.target.value))}
                                            placeholder="e.g. 1, 2"
                                            className="w-full pl-3 pr-12 py-2 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] outline-none bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 font-bold text-xs"
                                        />
                                        <div className="absolute inset-y-0 right-0 flex items-center px-3 bg-gray-100 dark:bg-slate-700 border-l border-gray-200 dark:border-slate-600 rounded-r-xl text-gray-600 dark:text-slate-300 text-[11px] font-black">
                                            ml
                                        </div>
                                    </div>
                                </div>

                                {/* Desired Dose */}
                                <div className="space-y-1">
                                    <label htmlFor="peptidecalculator-desired-dose" className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                        <Syringe className="w-3.5 h-3.5 text-rose-500" />
                                        Desired Dose
                                    </label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <input id="peptidecalculator-desired-dose" name="desired_dose" type="number"
                                                value={desiredDoseMg}
                                                onChange={(e) => setDesiredDoseMg(e.target.value === '' ? '' : Number(e.target.value))}
                                                placeholder={selectedUnit === 'mg' ? 'e.g. 0.25' : 'e.g. 250'}
                                                className="w-full pl-3 pr-14 py-2 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] outline-none bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 font-bold text-xs"
                                            />
                                            <div className="absolute inset-y-0 right-0 flex items-center px-3 bg-gray-100 dark:bg-slate-700 border-l border-gray-200 dark:border-slate-600 rounded-r-xl text-gray-600 dark:text-slate-300 text-[11px] font-black">
                                                {selectedUnit}
                                            </div>
                                        </div>
                                        <div className="flex gap-1 bg-gray-100 dark:bg-slate-800 p-0.5 rounded-xl border border-gray-200 dark:border-slate-700">
                                            <button
                                                type="button"
                                                onClick={() => setSelectedUnit('mg')}
                                                className={`px-2.5 py-1 rounded-lg font-bold transition-all text-xs cursor-pointer ${selectedUnit === 'mg'
                                                    ? 'bg-[#3C6CA8] text-white'
                                                    : 'text-gray-600 dark:text-slate-400 hover:text-gray-900'
                                                    }`}
                                            >
                                                mg
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedUnit('mcg')}
                                                className={`px-2.5 py-1 rounded-lg font-bold transition-all text-xs cursor-pointer ${selectedUnit === 'mcg'
                                                    ? 'bg-[#3C6CA8] text-white'
                                                    : 'text-gray-600 dark:text-slate-400 hover:text-gray-900'
                                                    }`}
                                            >
                                                mcg
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Card 2: Syringe Draw Results */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-md border border-gray-200 dark:border-slate-800 overflow-hidden flex flex-col justify-between">
                            <div className="px-5 py-5 bg-gradient-to-br from-[#3C6CA8] to-blue-700 text-white text-center relative">
                                <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-100">Calculated Syringe Draw</span>
                                <p className="text-4xl md:text-5xl font-black tracking-tight">{resultUnits !== null ? resultUnits : '0'}</p>
                                <p className="text-sm font-extrabold text-blue-100">Units</p>
                                <p className="text-[11px] text-blue-200 font-medium mt-1">
                                    Draw liquid to mark <span className="font-bold text-white">{resultUnits !== null ? resultUnits : '0'}</span> on your {selectedSyringe.name}
                                </p>
                            </div>

                            <div className="p-5 md:p-6 space-y-4 flex-1 flex flex-col justify-between">
                                {resultUnits !== null && (
                                    <>
                                        {resultUnits > (selectedSyringe.maxVolume * selectedSyringe.unitsPerMl) && (
                                            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl flex items-center gap-2 text-rose-700 dark:text-rose-300">
                                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                                <p className="text-[10px] font-bold">
                                                    Warning: Dose ({resultUnits} units) exceeds syringe capacity ({selectedSyringe.maxVolume * selectedSyringe.unitsPerMl} units).
                                                </p>
                                            </div>
                                        )}

                                        {/* Interactive Syringe Graphic - Compact */}
                                        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                                            <svg width="100%" height="100" viewBox="0 0 420 100" className="mx-auto" preserveAspectRatio="xMidYMid meet">
                                                <defs>
                                                    <linearGradient id="barrelGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                                        <stop offset="0%" style={{ stopColor: '#f8fafc', stopOpacity: 1 }} />
                                                        <stop offset="50%" style={{ stopColor: '#ffffff', stopOpacity: 1 }} />
                                                        <stop offset="100%" style={{ stopColor: '#f1f5f9', stopOpacity: 1 }} />
                                                    </linearGradient>
                                                    <linearGradient id="fluidGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                                        <stop offset="0%" style={{ stopColor: '#3C6CA8', stopOpacity: 0.9 }} />
                                                        <stop offset="50%" style={{ stopColor: '#2563eb', stopOpacity: 0.95 }} />
                                                        <stop offset="100%" style={{ stopColor: '#1d4ed8', stopOpacity: 0.9 }} />
                                                    </linearGradient>
                                                </defs>

                                                {/* Plunger */}
                                                <g>
                                                    <rect x="15" y="25" width="18" height="40" rx="3" fill="#334155" />
                                                    <circle cx="24" cy="45" r="7" fill="#475569" stroke="#334155" strokeWidth="1.5" />
                                                </g>

                                                {/* Barrel */}
                                                <g>
                                                    <rect x="33" y="20" width="340" height="50" rx="8" fill="url(#barrelGradient)" stroke="#94a3b8" strokeWidth="2" />
                                                </g>

                                                {/* Scale Markings */}
                                                {Array.from({ length: 11 }, (_, i) => {
                                                    const maxUnits = selectedSyringe.maxVolume * selectedSyringe.unitsPerMl;
                                                    const unitValue = (maxUnits / 10) * (10 - i);
                                                    const xPos = 43 + (320 * i / 10);
                                                    const isMajorTick = i % 2 === 0;
                                                    return (
                                                        <g key={i}>
                                                            <line
                                                                x1={xPos}
                                                                y1="23"
                                                                x2={xPos}
                                                                y2={isMajorTick ? "15" : "19"}
                                                                stroke={isMajorTick ? "#3C6CA8" : "#94a3b8"}
                                                                strokeWidth={isMajorTick ? "1.5" : "1"}
                                                            />
                                                            {isMajorTick && (
                                                                <text
                                                                    x={xPos}
                                                                    y="11"
                                                                    fontSize="9"
                                                                    fill="#3C6CA8"
                                                                    textAnchor="middle"
                                                                    fontWeight="800"
                                                                >
                                                                    {Math.round(unitValue)}
                                                                </text>
                                                            )}
                                                        </g>
                                                    );
                                                })}

                                                {/* Fluid Level */}
                                                {resultUnits && (
                                                    <>
                                                        <rect
                                                            x={358 - Math.min(320, (resultUnits / (selectedSyringe.maxVolume * selectedSyringe.unitsPerMl)) * 320)}
                                                            y="25"
                                                            width={Math.min(320, (resultUnits / (selectedSyringe.maxVolume * selectedSyringe.unitsPerMl)) * 320)}
                                                            height="40"
                                                            rx="5"
                                                            fill="url(#fluidGradient)"
                                                        />
                                                        <line
                                                            x1={358 - Math.min(320, (resultUnits / (selectedSyringe.maxVolume * selectedSyringe.unitsPerMl)) * 320)}
                                                            y1="18"
                                                            x2={358 - Math.min(320, (resultUnits / (selectedSyringe.maxVolume * selectedSyringe.unitsPerMl)) * 320)}
                                                            y2="77"
                                                            stroke="#e11d48"
                                                            strokeWidth="2"
                                                            strokeDasharray="3,2"
                                                        />
                                                    </>
                                                )}

                                                {/* Needle */}
                                                <g>
                                                    <path d="M 373 35 L 398 42 L 398 54 L 373 61 Z" fill="#64748b" />
                                                    <rect x="395" y="45" width="20" height="6" rx="1" fill="#475569" />
                                                </g>

                                                <text x="363" y="88" fontSize="10" fill="#64748b" textAnchor="end" fontWeight="700">
                                                    {selectedSyringe.maxVolume * selectedSyringe.unitsPerMl} units ({selectedSyringe.maxVolume}ml)
                                                </text>
                                            </svg>
                                        </div>

                                        {/* Metrics Breakdown Grid */}
                                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                            <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
                                                <p className="text-gray-400 font-bold uppercase text-[9px]">Volume</p>
                                                <p className="text-sm font-black text-gray-900 dark:text-white mt-0.5">{(resultUnits / selectedSyringe.unitsPerMl).toFixed(2)} ml</p>
                                            </div>
                                            <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
                                                <p className="text-gray-400 font-bold uppercase text-[9px]">Concentration</p>
                                                <p className="text-sm font-black text-gray-900 dark:text-white mt-0.5">{resultMgPerUnit && (resultMgPerUnit * selectedSyringe.unitsPerMl).toFixed(2)} mg/ml</p>
                                            </div>
                                            <div className="p-2.5 rounded-xl bg-[#3C6CA8]/10 border border-[#3C6CA8]/20">
                                                <p className="text-[#3C6CA8] font-bold uppercase text-[9px]">1 Unit Mark</p>
                                                <p className="text-sm font-black text-[#3C6CA8] mt-0.5">{resultMgPerUnit} mg</p>
                                            </div>
                                        </div>

                                        {/* Action Bar: Copy & Print */}
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={handleCopySummary}
                                                className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                                            >
                                                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                                <span>{copied ? 'Copied!' : 'Copy Summary Sheet'}</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setIsPrintModalOpen(true)}
                                                className="px-4 py-2.5 rounded-xl bg-[#3C6CA8] hover:bg-[#325a8c] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                                                title="Open professional Print Preview & Protocol Sheet"
                                            >
                                                <Printer className="w-3.5 h-3.5" />
                                                <span>Print Preview</span>
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Full-Width Section: Live Reconstitution Unit Matrix Table */}
                    {resultMgPerUnit !== null && (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-gray-200 dark:border-slate-800 space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="font-extrabold text-xs uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-1.5">
                                    <FileText className="w-4 h-4 text-[#3C6CA8]" />
                                    <span>Live Reconstitution Unit Matrix Table</span>
                                </h3>
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#3C6CA8]/10 text-[#3C6CA8]">
                                    {vialQuantityMg}mg in {waterAddedMl}ml BAC Water
                                </span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="border-b border-gray-200 dark:border-slate-800 text-gray-400 uppercase text-[10px]">
                                            <th className="py-2 px-3 font-extrabold">Syringe Draw Units</th>
                                            <th className="py-2 px-3 font-extrabold">Volume (ml)</th>
                                            <th className="py-2 px-3 font-extrabold">Dose (mg)</th>
                                            <th className="py-2 px-3 font-extrabold">Dose (mcg)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60 font-medium">
                                        {[5, 10, 20, 25, 50, 75, 100].map((u) => {
                                            const vol = u / selectedSyringe.unitsPerMl;
                                            const mg = u * resultMgPerUnit;
                                            const mcg = mg * 1000;
                                            const isMatch = Math.abs(u - (resultUnits || 0)) < 0.5;

                                            return (
                                                <tr key={u} className={isMatch ? 'bg-[#3C6CA8]/10 font-bold text-[#3C6CA8]' : 'hover:bg-gray-50 dark:hover:bg-slate-800/50'}>
                                                    <td className="py-2 px-3">{u} Units {isMatch && '⭐ Target'}</td>
                                                    <td className="py-2 px-3">{vol.toFixed(2)} ml</td>
                                                    <td className="py-2 px-3">{mg.toFixed(3)} mg</td>
                                                    <td className="py-2 px-3">{mcg.toFixed(0)} mcg</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Disclaimer Box - Full Width */}
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-100 dark:border-blue-900/50 flex gap-2.5 items-start text-xs text-blue-900 dark:text-blue-200">
                        <Info className="w-4 h-4 shrink-0 text-[#3C6CA8] mt-0.5" />
                        <div className="space-y-0.5">
                            <p className="font-extrabold">Research & Educational Disclaimer</p>
                            <p className="leading-relaxed opacity-90 text-[11px]">
                                This calculator is provided strictly for educational laboratory calculations. Always verify calculations with qualified healthcare or research professionals before administering any peptide compound.
                            </p>
                        </div>
                    </div>
                </div>
            </main>

            {/* Official Print Preview & Reconstitution Protocol Sheet Modal */}
            <PrintPreviewModal
                isOpen={isPrintModalOpen}
                onClose={() => setIsPrintModalOpen(false)}
                data={{
                    selectedSyringe,
                    vialQuantityMg,
                    waterAddedMl,
                    desiredDoseMg,
                    selectedUnit,
                    resultUnits,
                    resultMgPerUnit,
                    presetName: currentPresetName
                }}
            />
        </div>
    );
};

export default PeptideCalculator;
