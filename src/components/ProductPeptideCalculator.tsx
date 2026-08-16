import React, { useState, useEffect } from 'react';
import { Calculator, Syringe, Droplets, FlaskConical, AlertTriangle, RotateCcw } from 'lucide-react';

interface SyringeOption {
  id: string;
  name: string;
  unitsPerMl: number;
  maxVolume: number;
}

const SYRINGE_OPTIONS: SyringeOption[] = [
  { id: 'u100-1ml', name: 'U-100 Standard (1ml)', unitsPerMl: 100, maxVolume: 1.0 },
  { id: 'u100-0.5ml', name: 'U-100 Small (0.5ml)', unitsPerMl: 100, maxVolume: 0.5 },
  { id: 'u100-0.3ml', name: 'U-100 Micro (0.3ml)', unitsPerMl: 100, maxVolume: 0.3 },
  { id: 'u40-1ml', name: 'U-40 (1ml)', unitsPerMl: 40, maxVolume: 1.0 },
];

interface ProductPeptideCalculatorProps {
  initialVialSizeMg?: number;
}

export const ProductPeptideCalculator: React.FC<ProductPeptideCalculatorProps> = ({ initialVialSizeMg }) => {
  const [selectedSyringe, setSelectedSyringe] = useState<SyringeOption>(SYRINGE_OPTIONS[0]);
  const [selectedUnit, setSelectedUnit] = useState<'mg' | 'mcg'>('mg');
  const [vialQuantityMg, setVialQuantityMg] = useState<number | ''>(initialVialSizeMg || '');
  const [waterAddedMl, setWaterAddedMl] = useState<number | ''>('2');
  const [desiredDoseMg, setDesiredDoseMg] = useState<number | ''>('0.25');
  const [resultUnits, setResultUnits] = useState<number | null>(null);
  const [resultMgPerUnit, setResultMgPerUnit] = useState<number | null>(null);

  useEffect(() => {
    if (initialVialSizeMg) setVialQuantityMg(initialVialSizeMg);
  }, [initialVialSizeMg]);

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
      const totalUnits = Number(waterAddedMl) * selectedSyringe.unitsPerMl;
      const mgPerUnit = vialMg / totalUnits;
      setResultUnits(Number(units.toFixed(1)));
      setResultMgPerUnit(Number(mgPerUnit.toFixed(4)));
    } else {
      setResultUnits(null);
      setResultMgPerUnit(null);
    }
  };

  const handleReset = () => {
    setVialQuantityMg(initialVialSizeMg || '');
    setWaterAddedMl('2');
    setDesiredDoseMg('0.25');
    setSelectedUnit('mg');
    setResultUnits(null);
    setResultMgPerUnit(null);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-gray-300 dark:border-slate-800 shadow-md overflow-hidden">

      {/* ── Header Bar ── */}
      <div className="flex items-center justify-between px-3 py-2.5 sm:px-5 sm:py-3.5 bg-gradient-to-r from-[#3C6CA8] via-[#315A8E] to-[#274873]">
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
            <Calculator className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
          </div>
          <h4 className="text-xs sm:text-sm font-bold text-white tracking-wide truncate">Peptide Dosage Calculator</h4>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 sm:px-3.5 sm:py-1.5 bg-white/20 hover:bg-white/30 active:bg-white/40 border border-white/40 text-white text-[11px] sm:text-xs font-bold rounded-lg transition-all active:scale-95 cursor-pointer shrink-0 focus:outline-none focus:ring-2 focus:ring-white/80"
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>
      </div>

      {/* ── Main Content Grid — equal-height columns ── */}
      <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200 dark:divide-slate-800">

        {/* ── LEFT: Input Fields ── */}
        <div className="p-3 sm:p-5 flex flex-col gap-2.5 sm:gap-3.5">

          {/* Row 1: Syringe Type | Vial Strength */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {/* Syringe Type */}
            <div>
              <label htmlFor="productpeptidecalculator-syringe-type" className="flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1 truncate">
                <Syringe className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#3C6CA8] dark:text-[#6A9BE0] shrink-0" />
                <span className="truncate">Syringe Type</span>
              </label>
              <select id="productpeptidecalculator-syringe-type" name="syringe_type" value={selectedSyringe.id}
                onChange={(e) => {
                  const s = SYRINGE_OPTIONS.find(o => o.id === e.target.value);
                  if (s) setSelectedSyringe(s);
                }}
                className="w-full text-xs sm:text-sm px-2 py-1.5 sm:px-3 sm:py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-[#3C6CA8] focus:border-[#3C6CA8] outline-none bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-slate-100 font-medium cursor-pointer appearance-none transition-all truncate"
                style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%233C6CA8\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'/%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.4rem center', backgroundSize: '0.9em' }}
              >
                {SYRINGE_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>

            {/* Vial Strength */}
            <div>
              <label htmlFor="productpeptidecalculator-vial-strength" className="flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1 truncate">
                <FlaskConical className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="truncate">Vial Strength</span>
              </label>
              <div className="relative">
                <input id="productpeptidecalculator-vial-strength" name="vial_strength" type="number"
                  value={vialQuantityMg}
                  onChange={e => setVialQuantityMg(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. 10"
                  className="w-full text-xs sm:text-sm pl-2 pr-8 sm:pl-3 sm:pr-12 py-1.5 sm:py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-[#3C6CA8] focus:border-[#3C6CA8] outline-none bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-slate-100 font-medium transition-all"
                />
                <div className="absolute inset-y-0 right-0 flex items-center px-1.5 sm:px-3 bg-amber-100/70 dark:bg-amber-950/50 border-l border-gray-300 dark:border-slate-700 rounded-r-lg sm:rounded-r-xl text-amber-800 dark:text-amber-300 text-[10px] sm:text-xs font-extrabold">
                  mg
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Desired Dose | Bac. Water */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {/* Desired Dose */}
            <div>
              <label htmlFor="productpeptidecalculator-desired-dose" className="flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1 truncate">
                <Syringe className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-rose-600 dark:text-rose-400 shrink-0" />
                <span className="truncate">Desired Dose</span>
              </label>
              <div className="flex gap-0.5 sm:gap-1">
                <div className="relative flex-1 min-w-0">
                  <input id="productpeptidecalculator-desired-dose" name="desired_dose" type="number"
                    value={desiredDoseMg}
                    onChange={e => setDesiredDoseMg(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder={selectedUnit === 'mg' ? '0.25' : '250'}
                    className="w-full text-xs sm:text-sm pl-2 pr-7 sm:pl-3 sm:pr-10 py-1.5 sm:py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-[#3C6CA8] focus:border-[#3C6CA8] outline-none bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-slate-100 font-medium transition-all"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center px-1 sm:px-2 bg-rose-100/70 dark:bg-rose-950/50 border-l border-gray-300 dark:border-slate-700 rounded-r-lg sm:rounded-r-xl text-rose-800 dark:text-rose-300 text-[9px] sm:text-[10px] font-extrabold">
                    {selectedUnit}
                  </div>
                </div>
                <div className="flex gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedUnit('mg')}
                    className={`px-1.5 py-1 sm:px-2 sm:py-1.5 border rounded-md sm:rounded-lg font-bold text-[9px] sm:text-[10px] transition-all cursor-pointer ${selectedUnit === 'mg'
                      ? 'bg-[#3C6CA8] border-[#3C6CA8] text-white shadow-sm'
                      : 'bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-300 dark:border-slate-700 hover:border-[#3C6CA8]'}`}
                  >mg</button>
                  <button
                    type="button"
                    onClick={() => setSelectedUnit('mcg')}
                    className={`px-1 py-1 sm:px-1.5 sm:py-1.5 border rounded-md sm:rounded-lg font-bold text-[9px] sm:text-[10px] transition-all cursor-pointer ${selectedUnit === 'mcg'
                      ? 'bg-[#3C6CA8] border-[#3C6CA8] text-white shadow-sm'
                      : 'bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-300 dark:border-slate-700 hover:border-[#3C6CA8]'}`}
                  >mcg</button>
                </div>
              </div>
            </div>

            {/* Bacteriostatic Water */}
            <div>
              <label htmlFor="productpeptidecalculator-bac-water" className="flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1 truncate">
                <Droplets className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#3C6CA8] dark:text-[#6A9BE0] shrink-0" />
                <span className="truncate">Bac. Water</span>
              </label>
              <div className="relative">
                <input id="productpeptidecalculator-bac-water" name="bac_water" type="number"
                  value={waterAddedMl}
                  onChange={e => setWaterAddedMl(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. 2"
                  className="w-full text-xs sm:text-sm pl-2 pr-7 sm:pl-3 sm:pr-10 py-1.5 sm:py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-[#3C6CA8] focus:border-[#3C6CA8] outline-none bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-slate-100 font-medium transition-all"
                />
                <div className="absolute inset-y-0 right-0 flex items-center px-1.5 sm:px-3 bg-[#3C6CA8]/15 dark:bg-[#3C6CA8]/30 border-l border-gray-300 dark:border-slate-700 rounded-r-lg sm:rounded-r-xl text-[#3C6CA8] dark:text-[#94BBE9] text-[10px] sm:text-xs font-extrabold">
                  ml
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Output Results ── */}
        <div className="p-3 sm:p-5 flex flex-col gap-2.5 sm:gap-3">

          {/* 2-col result cards — equal height */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 flex-1">
            {/* Syringe Units card */}
            <div className="bg-gradient-to-br from-[#3C6CA8] via-[#315A8E] to-[#274873] rounded-xl sm:rounded-2xl p-2.5 sm:p-4 text-white text-center shadow-md flex flex-col items-center justify-center min-h-[90px] sm:min-h-[110px]">
              <p className="text-2xl sm:text-4xl font-black leading-none mb-0.5">{resultUnits !== null ? resultUnits : '—'}</p>
              <p className="text-[8px] sm:text-[10px] font-extrabold opacity-95 uppercase tracking-wider mt-0.5 sm:mt-1">Syringe Units</p>
              {resultUnits !== null && (
                <p className="text-[8px] sm:text-[9px] font-bold opacity-80 mt-1 leading-tight hidden sm:block">Draw to the {resultUnits} mark</p>
              )}
            </div>

            {/* Stats card */}
            {resultUnits !== null ? (
              <div className="bg-slate-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl sm:rounded-2xl p-2 sm:p-3.5 flex flex-col justify-center gap-1.5 sm:gap-2.5 min-h-[90px] sm:min-h-[110px]">
                <div className="flex justify-between items-center gap-1">
                  <span className="text-[8px] sm:text-[10px] font-bold text-gray-600 dark:text-slate-400 truncate">Total Vol.</span>
                  <span className="text-[10px] sm:text-xs font-extrabold text-gray-900 dark:text-slate-100 shrink-0">{(resultUnits / selectedSyringe.unitsPerMl).toFixed(2)} ml</span>
                </div>
                <div className="flex justify-between items-center gap-1">
                  <span className="text-[8px] sm:text-[10px] font-bold text-gray-600 dark:text-slate-400 truncate">Concen.</span>
                  <span className="text-[10px] sm:text-xs font-extrabold text-gray-900 dark:text-slate-100 shrink-0">{(resultMgPerUnit && (resultMgPerUnit * selectedSyringe.unitsPerMl).toFixed(2)) || '0'} mg/ml</span>
                </div>
                <div className="flex justify-between items-center pt-1.5 sm:pt-2 border-t border-gray-300 dark:border-slate-700 gap-1">
                  <span className="text-[8px] sm:text-[10px] font-bold text-gray-600 dark:text-slate-400 truncate">Per Unit</span>
                  <span className="text-[10px] sm:text-xs font-black text-amber-700 dark:text-amber-400 shrink-0">{resultMgPerUnit} mg</span>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl sm:rounded-2xl p-2 sm:p-3.5 flex flex-col items-center justify-center text-center text-gray-500 dark:text-slate-400 min-h-[90px] sm:min-h-[110px]">
                <Calculator className="w-5 h-5 sm:w-7 sm:h-7 mb-1 opacity-40 text-[#3C6CA8]" />
                <p className="text-[9px] sm:text-[10px] font-bold">Enter values</p>
              </div>
            )}
          </div>

          {/* Overflow warning */}
          {resultUnits !== null && resultUnits > (selectedSyringe.maxVolume * selectedSyringe.unitsPerMl) && (
            <div className="p-2 sm:p-2.5 bg-rose-100/80 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-lg sm:rounded-xl flex items-start gap-1.5 animate-pulse">
              <AlertTriangle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-700 dark:text-rose-300 mt-0.5 flex-shrink-0" />
              <p className="text-[9px] sm:text-[10px] text-rose-900 dark:text-rose-200 font-bold leading-normal">
                Exceeds syringe capacity ({selectedSyringe.maxVolume * selectedSyringe.unitsPerMl} units). Multiple injections needed.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
