import React, { useState, useEffect } from 'react';
import { Calculator, RotateCcw, Syringe, Droplets, FlaskConical, AlertTriangle, Sparkles, Check, Bookmark, Printer, Copy, FileText, Info } from 'lucide-react';
import { useCart } from '../hooks/useCart';

interface SyringeOption {
    id: string;
    name: string;
    unitsPerMl: number;
    maxVolume: number;
}

interface PeptidePreset {
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

const PRESETS: PeptidePreset[] = [
    { name: 'Semaglutide 5mg', vialMg: 5, waterMl: 2, doseMg: 0.25, unit: 'mg', description: 'Standard 5mg vial w/ 2ml BAC water (0.25mg start dose)', badgeColor: 'bg-blue-50 text-blue-700 border-blue-200' },
    { name: 'Tirzepatide 10mg', vialMg: 10, waterMl: 2, doseMg: 2.5, unit: 'mg', description: 'Standard 10mg vial w/ 2ml BAC water (2.5mg start dose)', badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { name: 'Retatrutide 10mg', vialMg: 10, waterMl: 2, doseMg: 2.0, unit: 'mg', description: 'Triple agonist 10mg vial w/ 2ml BAC water (2mg start dose)', badgeColor: 'bg-purple-50 text-purple-700 border-purple-200' },
    { name: 'BPC-157 5mg', vialMg: 5, waterMl: 2.5, doseMg: 250, unit: 'mcg', description: 'Recovery peptide 5mg vial w/ 2.5ml water (250mcg dose)', badgeColor: 'bg-amber-50 text-amber-700 border-amber-200' },
    { name: 'NAD+ 500mg', vialMg: 500, waterMl: 5, doseMg: 50, unit: 'mg', description: 'Cellular energy 500mg vial w/ 5ml water (50mg dose)', badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { name: 'CJC / Ipamorelin 10mg', vialMg: 10, waterMl: 3, doseMg: 300, unit: 'mcg', description: 'Growth peptide blend 10mg vial w/ 3ml water (300mcg dose)', badgeColor: 'bg-teal-50 text-teal-700 border-teal-200' },
];

const PeptideCalculator: React.FC = () => {
    const [selectedSyringe, setSelectedSyringe] = useState<SyringeOption>(SYRINGE_OPTIONS[0]);
    const [selectedUnit, setSelectedUnit] = useState<'mg' | 'mcg'>('mg');
    const [vialQuantityMg, setVialQuantityMg] = useState<number | ''>(5);
    const [waterAddedMl, setWaterAddedMl] = useState<number | ''>(2);
    const [desiredDoseMg, setDesiredDoseMg] = useState<number | ''>(0.25);

    const [resultUnits, setResultUnits] = useState<number | null>(null);
    const [resultMgPerUnit, setResultMgPerUnit] = useState<number | null>(null);
    const [copied, setCopied] = useState(false);

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
    };

    const handleReset = () => {
        setVialQuantityMg('');
        setWaterAddedMl('');
        setDesiredDoseMg('');
        setResultUnits(null);
        setResultMgPerUnit(null);
    };

    const handleCopySummary = () => {
        if (!resultUnits || !resultMgPerUnit) return;
        const text = `SlimDose Peptide Calculation Sheet:
- Syringe: ${selectedSyringe.name}
- Vial Size: ${vialQuantityMg} mg
- BAC Water Added: ${waterAddedMl} ml
- Desired Dose: ${desiredDoseMg} ${selectedUnit}
- RESULT: ${resultUnits} Units (${(resultUnits / selectedSyringe.unitsPerMl).toFixed(2)} ml)
- Concentration: ${(resultMgPerUnit * selectedSyringe.unitsPerMl).toFixed(2)} mg/ml (${resultMgPerUnit} mg/unit)`;
        navigator.clipboard.writeText(text);
        setCopied(true);
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

                    {/* Quick Presets Bar - Compact */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-slate-800 space-y-2.5">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-slate-400 flex items-center gap-1.5">
                                <Bookmark className="w-3.5 h-3.5 text-[#3C6CA8]" /> Quick Peptide Presets
                            </h3>
                            <span className="text-[10px] font-medium text-gray-400">Tap to pre-fill inputs</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                            {PRESETS.map((p, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => handleApplyPreset(p)}
                                    className={`p-2.5 rounded-xl border text-left transition-all hover:scale-[1.02] active:scale-95 cursor-pointer shadow-xs ${p.badgeColor}`}
                                >
                                    <p className="font-extrabold text-xs leading-tight truncate">{p.name}</p>
                                    <p className="text-[10px] opacity-80 mt-0.5 truncate">{p.vialMg}mg · {p.waterMl}ml</p>
                                </button>
                            ))}
                        </div>
                    </div>

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
                                    <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                        <Syringe className="w-3.5 h-3.5 text-purple-500" />
                                        Syringe Type
                                    </label>
                                    <select
                                        value={selectedSyringe.id}
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
                                    <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                        <FlaskConical className="w-3.5 h-3.5 text-amber-500" />
                                        Vial Size (Quantity)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
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
                                    <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                        <Droplets className="w-3.5 h-3.5 text-blue-500" />
                                        Bacteriostatic Water Added
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
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
                                    <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                        <Syringe className="w-3.5 h-3.5 text-rose-500" />
                                        Desired Dose
                                    </label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <input
                                                type="number"
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
                                                onClick={handleCopySummary}
                                                className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                            >
                                                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                                <span>{copied ? 'Copied!' : 'Copy Summary Sheet'}</span>
                                            </button>
                                            <button
                                                onClick={() => window.print()}
                                                className="px-4 py-2.5 rounded-xl bg-[#3C6CA8] hover:bg-[#325a8c] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                                            >
                                                <Printer className="w-3.5 h-3.5" />
                                                <span>Print</span>
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
        </div>
    );
};

export default PeptideCalculator;
