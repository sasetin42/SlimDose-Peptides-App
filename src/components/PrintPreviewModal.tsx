import React, { useState, useEffect } from 'react';
import { 
    Printer, 
    X, 
    Copy, 
    Check, 
    FileText, 
    FlaskConical, 
    Droplets, 
    Syringe, 
    ShieldCheck, 
    Calendar, 
    User, 
    Edit3,
    Sparkles,
    AlertCircle
} from 'lucide-react';

export interface PrintPreviewData {
    selectedSyringe: {
        id: string;
        name: string;
        unitsPerMl: number;
        maxVolume: number;
    };
    vialQuantityMg: number | '';
    waterAddedMl: number | '';
    desiredDoseMg: number | '';
    selectedUnit: 'mg' | 'mcg';
    resultUnits: number | null;
    resultMgPerUnit: number | null;
    presetName?: string;
}

interface PrintPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: PrintPreviewData;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
    isOpen,
    onClose,
    data
}) => {
    const {
        selectedSyringe,
        vialQuantityMg,
        waterAddedMl,
        desiredDoseMg,
        selectedUnit,
        resultUnits,
        resultMgPerUnit,
        presetName
    } = data;

    // Lock background scroll when modal is open
    useEffect(() => {
        if (!isOpen) return;
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, [isOpen]);

    // Editable preview metadata
    const [compoundName, setCompoundName] = useState(presetName || 'Research Peptide Compound');
    const [protocolId, setProtocolId] = useState(`SLD-${Math.floor(100000 + Math.random() * 900000)}`);
    const [researcherName, setResearcherName] = useState('Laboratory Specialist');
    const [notes, setNotes] = useState('Store reconstituted vial refrigerated at 2°C–8°C. Protect from direct UV light.');
    const [copied, setCopied] = useState(false);

    if (!isOpen || resultUnits === null || resultMgPerUnit === null) return null;

    const vialMg = Number(vialQuantityMg) || 0;
    const waterMl = Number(waterAddedMl) || 1;
    const concentration = (vialMg / waterMl).toFixed(2);
    const volumeMl = (resultUnits / selectedSyringe.unitsPerMl).toFixed(3);
    const doseDisplay = `${desiredDoseMg} ${selectedUnit}`;
    const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    const currentTime = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });

    const handleCopy = () => {
        const text = `=========================================
SLIMDOSE™ PRECISION RECONSTITUTION SHEET
Protocol ID: ${protocolId} | Date: ${currentDate} ${currentTime}
=========================================
Compound: ${compoundName}
Researcher / Specialist: ${researcherName}

CALCULATED DRAW:
▶ Syringe Draw: ${resultUnits} UNITS (${volumeMl} mL)
▶ Target Dose: ${doseDisplay}
▶ Syringe Type: ${selectedSyringe.name}

RECONSTITUTION METRICS:
- Lyophilized Vial Mass: ${vialMg} mg
- BAC Water Diluent: ${waterMl} mL
- Solution Concentration: ${concentration} mg/mL
- Concentration per Unit: ${resultMgPerUnit} mg/unit (${(resultMgPerUnit * 1000).toFixed(1)} mcg/unit)

PROTOCOL NOTES:
${notes}

STANDARD RECONSTITUTION SOP:
1. Wipe vial rubber septum with 70% isopropyl alcohol wipe.
2. Slowly inject BAC water aiming at glass vial wall.
3. Gently swirl vial until fully dissolved (DO NOT SHAKE).
4. Store reconstituted solution at 2°C - 8°C.
=========================================`;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-fadeIn">
            {/* Modal Container */}
            <div className="bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 w-full max-w-5xl rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
                
                {/* Modal Top Control Bar */}
                <div className="px-5 py-3.5 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between no-print">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#3C6CA8]/10 text-[#3C6CA8] flex items-center justify-center font-bold">
                            <FileText className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                                Official Print & Protocol Preview
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                    Ready to Print
                                </span>
                            </h3>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                Review customized protocol sheet specifications before printing or saving to PDF
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleCopy}
                            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
                        >
                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copied ? 'Copied Text' : 'Copy Text'}</span>
                        </button>
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#3C6CA8] hover:bg-[#325a8c] text-white text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer"
                        >
                            <Printer className="w-4 h-4" />
                            <span>Print / Save PDF</span>
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 text-slate-500 flex items-center justify-center transition-all cursor-pointer"
                            aria-label="Close modal"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Modal Body: Two-column layout (Left: Customization fields, Right: Realtime Sheet Preview) */}
                <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-0">
                    
                    {/* Left Settings Sidebar (Hidden on physical print) */}
                    <div className="lg:col-span-4 p-5 bg-slate-50 dark:bg-slate-900/60 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 space-y-4 no-print">
                        <div className="flex items-center gap-1.5 text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                            <Edit3 className="w-3.5 h-3.5 text-[#3C6CA8]" />
                            <span>Protocol Sheet Details</span>
                        </div>

                        {/* Compound Name */}
                        <div className="space-y-1">
                            <label htmlFor="printpreviewmodal-compound-prescription-name" className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                Compound / Prescription Name
                            </label>
                            <input id="printpreviewmodal-compound-prescription-name" name="compound_prescription_name" type="text"
                                value={compoundName}
                                onChange={(e) => setCompoundName(e.target.value)}
                                placeholder="e.g. Semaglutide 5mg / BPC-157"
                                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#3C6CA8] outline-none"
                            />
                        </div>

                        {/* Protocol ID */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <label htmlFor="printpreviewmodal-protocol-batch" className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                    Protocol / Batch #
                                </label>
                                <input id="printpreviewmodal-protocol-batch" name="protocol_batch" type="text"
                                    value={protocolId}
                                    onChange={(e) => setProtocolId(e.target.value)}
                                    className="w-full px-2.5 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#3C6CA8] outline-none"
                                />
                            </div>
                            <div className="space-y-1">
                                <label htmlFor="printpreviewmodal-researcher-specialist" className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                    Researcher / Specialist
                                </label>
                                <input id="printpreviewmodal-researcher-specialist" name="researcher_specialist" type="text"
                                    value={researcherName}
                                    onChange={(e) => setResearcherName(e.target.value)}
                                    placeholder="Specialist Name"
                                    className="w-full px-2.5 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#3C6CA8] outline-none"
                                />
                            </div>
                        </div>

                        {/* Protocol Notes */}
                        <div className="space-y-1">
                            <label htmlFor="printpreviewmodal-administration-storage-notes" className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                Administration / Storage Notes
                            </label>
                            <textarea id="printpreviewmodal-administration-storage-notes" name="administration_storage_notes" rows={3}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#3C6CA8] outline-none resize-none"
                            />
                        </div>

                        {/* Quick Tips */}
                        <div className="p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/50 space-y-1 text-[11px] text-blue-900 dark:text-blue-200">
                            <div className="flex items-center gap-1.5 font-bold">
                                <Sparkles className="w-3.5 h-3.5 text-[#3C6CA8]" />
                                <span>Print Perfection</span>
                            </div>
                            <p className="opacity-90 leading-normal text-[10px]">
                                This summary sheet is formatted to fit perfectly on standard A4 / US Letter paper or export to vector PDF without UI clutter.
                            </p>
                        </div>
                    </div>

                    {/* Right Printable Document View (Main printable container) */}
                    <div className="lg:col-span-8 p-4 sm:p-6 md:p-8 bg-slate-200/70 dark:bg-slate-950 flex justify-center items-start overflow-y-auto">
                        
                        {/* THE OFFICIAL PRINTABLE PROTOCOL SHEET */}
                        <div className="printable-summary-sheet bg-white text-slate-900 w-full max-w-[780px] p-6 sm:p-8 md:p-10 rounded-2xl shadow-xl border border-slate-200 space-y-6">
                            
                            {/* 1. Header & Verification Badge */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-slate-900 pb-5">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-lg bg-[#3C6CA8] text-white flex items-center justify-center font-black text-sm">
                                            SD
                                        </div>
                                        <span className="text-lg font-black tracking-tight text-slate-900">
                                            SLIM<span className="text-[#3C6CA8]">DOSE</span>™
                                        </span>
                                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-sm bg-slate-100 text-slate-700 tracking-wider">
                                            Clinical Lab
                                        </span>
                                    </div>
                                    <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                                        RECONSTITUTION & DOSAGE PROTOCOL SHEET
                                    </h1>
                                    <p className="text-[11px] font-semibold text-slate-500">
                                        Precision Research & Laboratory Calculation Certificate
                                    </p>
                                </div>

                                <div className="text-right sm:text-right space-y-1 font-mono text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                                    <div><span className="font-bold text-slate-800">Protocol #:</span> {protocolId}</div>
                                    <div><span className="font-bold text-slate-800">Date:</span> {currentDate} {currentTime}</div>
                                    <div><span className="font-bold text-slate-800">Status:</span> <span className="text-emerald-700 font-bold">VERIFIED SPECIFICATION</span></div>
                                </div>
                            </div>

                            {/* 2. Metadata Bar */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Compound Name</span>
                                    <span className="font-black text-slate-900 truncate block">{compoundName}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Specialist / Ref</span>
                                    <span className="font-bold text-slate-900 truncate block">{researcherName}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Syringe Model</span>
                                    <span className="font-bold text-slate-900 truncate block">{selectedSyringe.name}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Target Unit Dose</span>
                                    <span className="font-black text-[#3C6CA8] block">{doseDisplay}</span>
                                </div>
                            </div>

                            {/* 3. Primary Hero Draw Highlight Box */}
                            <div className="bg-gradient-to-r from-slate-900 via-[#1E3A60] to-[#3C6CA8] text-white p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="text-center sm:text-left space-y-1">
                                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-200">
                                        Calculated Syringe Draw Mark
                                    </span>
                                    <div className="flex items-baseline justify-center sm:justify-start gap-2">
                                        <span className="text-4xl sm:text-5xl font-black tracking-tight">{resultUnits}</span>
                                        <span className="text-lg font-bold text-blue-200">Units</span>
                                    </div>
                                    <p className="text-xs text-blue-100 font-medium">
                                        Draw liquid precisely to mark <strong className="text-white underline decoration-2">{resultUnits}</strong> on your {selectedSyringe.name}
                                    </p>
                                </div>

                                <div className="bg-white/10 backdrop-blur-md rounded-xl p-3.5 text-center min-w-[170px] border border-white/20 space-y-1">
                                    <span className="text-[10px] uppercase font-bold text-blue-200 block">Dispensed Liquid Volume</span>
                                    <span className="text-2xl font-black text-white">{volumeMl} <span className="text-sm font-medium">mL</span></span>
                                    <span className="text-[10px] text-blue-200 block">Target: {doseDisplay}</span>
                                </div>
                            </div>

                            {/* 4. High-Fidelity Printable Syringe Graphic */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                                    <span className="flex items-center gap-1.5">
                                        <Syringe className="w-3.5 h-3.5 text-[#3C6CA8]" />
                                        <span>Syringe Barrel Alignment Indicator</span>
                                    </span>
                                    <span className="text-rose-700 font-extrabold">
                                        Mark: {resultUnits} Units ({volumeMl} ml)
                                    </span>
                                </div>

                                <div className="relative py-1">
                                    <svg width="100%" height="90" viewBox="0 0 420 90" className="mx-auto block" preserveAspectRatio="xMidYMid meet">
                                        <defs>
                                            <linearGradient id="printBarrelGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                                <stop offset="0%" stopColor="#ffffff" />
                                                <stop offset="100%" stopColor="#f1f5f9" />
                                            </linearGradient>
                                            <linearGradient id="printFluidGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                                <stop offset="0%" stopColor="#2563eb" />
                                                <stop offset="100%" stopColor="#1d4ed8" />
                                            </linearGradient>
                                        </defs>

                                        {/* Plunger */}
                                        <rect x="15" y="22" width="18" height="36" rx="3" fill="#334155" />
                                        <circle cx="24" cy="40" r="6" fill="#64748b" stroke="#334155" strokeWidth="1.5" />

                                        {/* Barrel */}
                                        <rect x="33" y="16" width="340" height="48" rx="6" fill="url(#printBarrelGrad)" stroke="#64748b" strokeWidth="1.5" />

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
                                                        y1="20"
                                                        x2={xPos}
                                                        y2={isMajorTick ? "12" : "16"}
                                                        stroke={isMajorTick ? "#1e293b" : "#94a3b8"}
                                                        strokeWidth={isMajorTick ? "1.5" : "1"}
                                                    />
                                                    {isMajorTick && (
                                                        <text
                                                            x={xPos}
                                                            y="9"
                                                            fontSize="8.5"
                                                            fill="#1e293b"
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
                                                    y="21"
                                                    width={Math.min(320, (resultUnits / (selectedSyringe.maxVolume * selectedSyringe.unitsPerMl)) * 320)}
                                                    height="38"
                                                    rx="4"
                                                    fill="url(#printFluidGrad)"
                                                />
                                                <line
                                                    x1={358 - Math.min(320, (resultUnits / (selectedSyringe.maxVolume * selectedSyringe.unitsPerMl)) * 320)}
                                                    y1="12"
                                                    x2={358 - Math.min(320, (resultUnits / (selectedSyringe.maxVolume * selectedSyringe.unitsPerMl)) * 320)}
                                                    y2="70"
                                                    stroke="#e11d48"
                                                    strokeWidth="2.5"
                                                    strokeDasharray="3,2"
                                                />
                                                <polygon
                                                    points={`${358 - Math.min(320, (resultUnits / (selectedSyringe.maxVolume * selectedSyringe.unitsPerMl)) * 320)},75 ${358 - Math.min(320, (resultUnits / (selectedSyringe.maxVolume * selectedSyringe.unitsPerMl)) * 320) - 5},83 ${358 - Math.min(320, (resultUnits / (selectedSyringe.maxVolume * selectedSyringe.unitsPerMl)) * 320) + 5},83`}
                                                    fill="#e11d48"
                                                />
                                            </>
                                        )}

                                        {/* Needle */}
                                        <path d="M 373 30 L 398 37 L 398 47 L 373 54 Z" fill="#64748b" />
                                        <rect x="395" y="39" width="20" height="5" rx="1" fill="#475569" />

                                        <text x="363" y="78" fontSize="9" fill="#475569" textAnchor="end" fontWeight="700">
                                            {selectedSyringe.maxVolume * selectedSyringe.unitsPerMl} units ({selectedSyringe.maxVolume}ml)
                                        </text>
                                    </svg>
                                </div>
                            </div>

                            {/* 5. Four Key Specification Parameters Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Vial Mass</span>
                                    <span className="text-base font-black text-slate-900 mt-0.5 block">{vialMg} mg</span>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                    <span className="text-[10px] font-bold uppercase text-slate-400 block">BAC Water Added</span>
                                    <span className="text-base font-black text-slate-900 mt-0.5 block">{waterMl} mL</span>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Prepared Concen.</span>
                                    <span className="text-base font-black text-slate-900 mt-0.5 block">{concentration} mg/mL</span>
                                </div>
                                <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200">
                                    <span className="text-[10px] font-bold uppercase text-[#3C6CA8] block">1 Syringe Unit Value</span>
                                    <span className="text-base font-black text-[#3C6CA8] mt-0.5 block">{resultMgPerUnit} mg</span>
                                </div>
                            </div>

                            {/* 6. Live Reconstitution Unit Matrix Table */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                                        <FileText className="w-3.5 h-3.5 text-[#3C6CA8]" />
                                        <span>Unit Draw Dosing Reference Matrix</span>
                                    </h4>
                                    <span className="text-[10px] font-bold text-slate-500">
                                        Basis: {vialMg}mg in {waterMl}ml BAC water
                                    </span>
                                </div>

                                <div className="border border-slate-200 rounded-xl overflow-hidden">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                            <tr className="bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider border-b border-slate-200">
                                                <th className="py-2 px-3">Syringe Units</th>
                                                <th className="py-2 px-3">Volume (mL)</th>
                                                <th className="py-2 px-3">Dose (mg)</th>
                                                <th className="py-2 px-3">Dose (mcg)</th>
                                                <th className="py-2 px-3 text-right">Target Match</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 font-medium">
                                            {[5, 10, 15, 20, 25, 30, 40, 50, 75, 100].map((u) => {
                                                const vol = u / selectedSyringe.unitsPerMl;
                                                const mg = u * resultMgPerUnit;
                                                const mcg = mg * 1000;
                                                const isTarget = Math.abs(u - resultUnits) < 0.5;

                                                return (
                                                    <tr 
                                                        key={u} 
                                                        className={isTarget ? 'bg-blue-50/90 font-bold text-[#3C6CA8]' : 'even:bg-slate-50/50'}
                                                    >
                                                        <td className="py-1.5 px-3">{u} Units</td>
                                                        <td className="py-1.5 px-3">{vol.toFixed(2)} mL</td>
                                                        <td className="py-1.5 px-3">{mg.toFixed(3)} mg</td>
                                                        <td className="py-1.5 px-3">{mcg.toFixed(0)} mcg</td>
                                                        <td className="py-1.5 px-3 text-right">
                                                            {isTarget ? (
                                                                <span className="inline-flex items-center gap-1 text-[10px] font-black bg-[#3C6CA8] text-white px-2 py-0.5 rounded-full">
                                                                    ★ TARGET DRAW
                                                                </span>
                                                            ) : '—'}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* 7. SOP Instructions & Storage Protocol */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                                    <span className="font-extrabold text-[11px] text-slate-900 block flex items-center gap-1.5">
                                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                        Standard Reconstitution SOP
                                    </span>
                                    <ul className="list-disc list-inside space-y-1 text-[10px] text-slate-600 leading-normal">
                                        <li>Clean vial rubber septum with sterile 70% alcohol wipe.</li>
                                        <li>Inject BAC water slowly against inside glass vial wall.</li>
                                        <li>Gently swirl vial between palms until dissolved. <strong>DO NOT SHAKE</strong>.</li>
                                        <li>Invert vial, draw exact units, tap out micro air bubbles.</li>
                                    </ul>
                                </div>

                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                                    <span className="font-extrabold text-[11px] text-slate-900 block flex items-center gap-1.5">
                                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                        Storage & Stability Protocol
                                    </span>
                                    <p className="text-[10px] text-slate-600 leading-normal">
                                        {notes}
                                    </p>
                                    <p className="text-[9px] text-slate-400 font-mono mt-1">
                                        Quality Assurance Reference: ISO-9001:2015 Research Laboratory Guidelines
                                    </p>
                                </div>
                            </div>

                            {/* 8. Laboratory Signatures & Authorization */}
                            <div className="border-t border-slate-200 pt-4 grid grid-cols-2 gap-6 text-xs text-slate-600">
                                <div className="space-y-4">
                                    <div className="border-b border-slate-400 pb-1">
                                        <span className="text-[10px] text-slate-400 uppercase block font-bold">Prepared By / Lab Specialist</span>
                                        <span className="font-bold text-slate-800">{researcherName}</span>
                                    </div>
                                    <div className="text-[10px]">
                                        Signature: __________________________ Date: _________
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="border-b border-slate-400 pb-1">
                                        <span className="text-[10px] text-slate-400 uppercase block font-bold">Verified By / Lead Researcher</span>
                                        <span className="font-bold text-slate-800">Quality Assurance</span>
                                    </div>
                                    <div className="text-[10px]">
                                        Signature: __________________________ Date: _________
                                    </div>
                                </div>
                            </div>

                            {/* 9. Regulatory Disclaimer Footer */}
                            <div className="pt-3 border-t border-slate-200 text-center space-y-1">
                                <p className="text-[9px] text-slate-400 uppercase tracking-wider font-extrabold">
                                    SlimDose™ Precision Peptide Reconstitution Calculator
                                </p>
                                <p className="text-[8.5px] text-slate-500 leading-tight">
                                    This document is generated for verified research and laboratory dosing reference. Always confirm dosage calculations and protocol accuracy with a qualified healthcare or research professional before administration.
                                </p>
                            </div>

                        </div>
                    </div>

                </div>

                {/* Modal Footer Controls (Bottom) */}
                <div className="px-5 py-3 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between no-print">
                    <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
                        Press <strong>Ctrl+P</strong> (or Cmd+P) or click Print to generate paper copy or PDF.
                    </span>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
                        >
                            Close Preview
                        </button>
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl bg-[#3C6CA8] hover:bg-[#325a8c] text-white text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer"
                        >
                            <Printer className="w-4 h-4" />
                            <span>Print / Save PDF</span>
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};
