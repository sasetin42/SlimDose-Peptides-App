import { supabase } from './supabase';
import {
  PH_PROVINCES,
  PH_CITIES,
  PH_BARANGAYS,
  Province,
  City,
  Barangay
} from './philippineLocations';
import { ALL_PHILIPPINE_ZIP_CODES } from '../data/philippineZipCodes';

export interface DbProvince extends Province {
  is_active?: boolean;
  city_count?: number;
  updated_at?: string;
}

export interface DbCity extends City {
  is_active?: boolean;
  barangay_count?: number;
  updated_at?: string;
}

export interface DbBarangay extends Barangay {
  is_active?: boolean;
  zip_override?: string;
  updated_at?: string;
}

export interface DbZipCode {
  id: string; // unique key e.g. "agusan del sur_bunawan" or "ncr_qc_batasan"
  province: string;
  city: string;
  barangay?: string;
  zip_code: string;
  is_active?: boolean;
  updated_at?: string;
}

// LocalStorage Persistence Keys
const STORAGE_PROVINCES_KEY = 'slimdose_db_provinces_v1';
const STORAGE_CITIES_KEY = 'slimdose_db_cities_v1';
const STORAGE_BARANGAYS_KEY = 'slimdose_db_barangays_v1';
const STORAGE_ZIPCODES_KEY = 'slimdose_db_zipcodes_v1';

export const DISPATCH_LOCATIONS_UPDATED = 'ph_locations_database_updated';

// Helper to notify listeners across tabs & components
export function broadcastLocationUpdate() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent(DISPATCH_LOCATIONS_UPDATED));
  }
}

/* =========================================================================
   1. PROVINCES OPERATIONS
   ========================================================================= */

export function getStoredProvinces(): DbProvince[] {
  if (typeof window === 'undefined') return PH_PROVINCES;
  try {
    const raw = localStorage.getItem(STORAGE_PROVINCES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  // Default initialize with official 82+ PH Provinces
  return PH_PROVINCES.map(p => ({
    ...p,
    is_active: true,
    city_count: (PH_CITIES[p.code] || []).length
  }));
}

export async function fetchProvincesDb(): Promise<DbProvince[]> {
  try {
    const { data, error } = await supabase
      .from('ph_provinces')
      .select('*')
      .order('name', { ascending: true });

    if (!error && data && data.length > 0) {
      saveProvincesLocal(data);
      return data;
    }
  } catch (err) {
    console.warn('Supabase ph_provinces fetch notice:', err);
  }
  return getStoredProvinces();
}

export function saveProvincesLocal(provinces: DbProvince[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_PROVINCES_KEY, JSON.stringify(provinces));
  } catch {}
  broadcastLocationUpdate();
}

export async function upsertProvinceDb(province: DbProvince): Promise<DbProvince> {
  const current = getStoredProvinces();
  const existsIdx = current.findIndex(p => p.code.toUpperCase() === province.code.toUpperCase());
  const updatedItem: DbProvince = {
    ...province,
    code: province.code.toUpperCase().trim(),
    updated_at: new Date().toISOString()
  };

  let updatedList: DbProvince[];
  if (existsIdx >= 0) {
    updatedList = [...current];
    updatedList[existsIdx] = { ...updatedList[existsIdx], ...updatedItem };
  } else {
    updatedList = [updatedItem, ...current];
  }

  saveProvincesLocal(updatedList);

  try {
    await supabase.from('ph_provinces').upsert([updatedItem], { onConflict: 'code' });
  } catch (err) {
    console.warn('Supabase upsert ph_provinces warning:', err);
  }

  return updatedItem;
}

export async function deleteProvinceDb(code: string): Promise<void> {
  const current = getStoredProvinces();
  const filtered = current.filter(p => p.code.toUpperCase() !== code.toUpperCase());
  saveProvincesLocal(filtered);

  try {
    await supabase.from('ph_provinces').delete().eq('code', code);
  } catch (err) {
    console.warn('Supabase delete ph_provinces warning:', err);
  }
}

/* =========================================================================
   2. CITIES & MUNICIPALITIES OPERATIONS
   ========================================================================= */

export function getStoredCities(): Record<string, DbCity[]> {
  if (typeof window === 'undefined') return PH_CITIES;
  try {
    const raw = localStorage.getItem(STORAGE_CITIES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {}
  return PH_CITIES;
}

export async function fetchCitiesDb(): Promise<Record<string, DbCity[]>> {
  try {
    const { data, error } = await supabase
      .from('ph_cities')
      .select('*')
      .order('name', { ascending: true });

    if (!error && data && data.length > 0) {
      const grouped: Record<string, DbCity[]> = {};
      data.forEach((c: DbCity) => {
        const pCode = c.provinceCode || 'OTHER';
        if (!grouped[pCode]) grouped[pCode] = [];
        grouped[pCode].push(c);
      });
      saveCitiesLocal(grouped);
      return grouped;
    }
  } catch (err) {
    console.warn('Supabase ph_cities fetch notice:', err);
  }
  return getStoredCities();
}

export function saveCitiesLocal(cities: Record<string, DbCity[]>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_CITIES_KEY, JSON.stringify(cities));
  } catch {}
  broadcastLocationUpdate();
}

export async function upsertCityDb(city: DbCity): Promise<DbCity> {
  const allCities = getStoredCities();
  const provCode = city.provinceCode.toUpperCase().trim();
  const list = allCities[provCode] ? [...allCities[provCode]] : [];
  
  const updatedItem: DbCity = {
    ...city,
    provinceCode: provCode,
    code: city.code.toUpperCase().trim(),
    updated_at: new Date().toISOString()
  };

  const idx = list.findIndex(c => c.code.toUpperCase() === updatedItem.code);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...updatedItem };
  } else {
    list.push(updatedItem);
  }

  allCities[provCode] = list;
  saveCitiesLocal(allCities);

  try {
    await supabase.from('ph_cities').upsert([updatedItem], { onConflict: 'code' });
  } catch (err) {
    console.warn('Supabase upsert ph_cities warning:', err);
  }

  return updatedItem;
}

export async function deleteCityDb(code: string, provinceCode: string): Promise<void> {
  const allCities = getStoredCities();
  const provCode = provinceCode.toUpperCase().trim();
  if (allCities[provCode]) {
    allCities[provCode] = allCities[provCode].filter(c => c.code.toUpperCase() !== code.toUpperCase());
    saveCitiesLocal(allCities);
  }

  try {
    await supabase.from('ph_cities').delete().eq('code', code);
  } catch (err) {
    console.warn('Supabase delete ph_cities warning:', err);
  }
}

/* =========================================================================
   3. BARANGAYS OPERATIONS
   ========================================================================= */

export function getStoredBarangays(): Record<string, DbBarangay[]> {
  if (typeof window === 'undefined') return PH_BARANGAYS;
  try {
    const raw = localStorage.getItem(STORAGE_BARANGAYS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {}
  return PH_BARANGAYS;
}

export async function fetchBarangaysDb(): Promise<Record<string, DbBarangay[]>> {
  try {
    const { data, error } = await supabase
      .from('ph_barangays')
      .select('*')
      .order('name', { ascending: true });

    if (!error && data && data.length > 0) {
      const grouped: Record<string, DbBarangay[]> = {};
      data.forEach((b: DbBarangay) => {
        const cCode = b.cityCode || 'OTHER';
        if (!grouped[cCode]) grouped[cCode] = [];
        grouped[cCode].push(b);
      });
      saveBarangaysLocal(grouped);
      return grouped;
    }
  } catch (err) {
    console.warn('Supabase ph_barangays fetch notice:', err);
  }
  return getStoredBarangays();
}

export function saveBarangaysLocal(barangays: Record<string, DbBarangay[]>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_BARANGAYS_KEY, JSON.stringify(barangays));
  } catch {}
  broadcastLocationUpdate();
}

export async function upsertBarangayDb(barangay: DbBarangay): Promise<DbBarangay> {
  const allBarangays = getStoredBarangays();
  const cityCode = barangay.cityCode.toUpperCase().trim();
  const list = allBarangays[cityCode] ? [...allBarangays[cityCode]] : [];

  const updatedItem: DbBarangay = {
    ...barangay,
    cityCode,
    code: barangay.code.toUpperCase().trim(),
    updated_at: new Date().toISOString()
  };

  const idx = list.findIndex(b => b.code.toUpperCase() === updatedItem.code);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...updatedItem };
  } else {
    list.push(updatedItem);
  }

  allBarangays[cityCode] = list;
  saveBarangaysLocal(allBarangays);

  try {
    await supabase.from('ph_barangays').upsert([updatedItem], { onConflict: 'code' });
  } catch (err) {
    console.warn('Supabase upsert ph_barangays warning:', err);
  }

  return updatedItem;
}

export async function deleteBarangayDb(code: string, cityCode: string): Promise<void> {
  const allBarangays = getStoredBarangays();
  const cCode = cityCode.toUpperCase().trim();
  if (allBarangays[cCode]) {
    allBarangays[cCode] = allBarangays[cCode].filter(b => b.code.toUpperCase() !== code.toUpperCase());
    saveBarangaysLocal(allBarangays);
  }

  try {
    await supabase.from('ph_barangays').delete().eq('code', code);
  } catch (err) {
    console.warn('Supabase delete ph_barangays warning:', err);
  }
}

/* =========================================================================
   4. ZIP / POSTAL CODE REGISTRY OPERATIONS
   ========================================================================= */

export function getStoredZipCodes(): DbZipCode[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_ZIPCODES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}

  // Generate initial base registry from ALL_PHILIPPINE_ZIP_CODES
  const initial: DbZipCode[] = [];
  for (const [prov, cityMap] of Object.entries(ALL_PHILIPPINE_ZIP_CODES)) {
    for (const [cityName, zip] of Object.entries(cityMap)) {
      initial.push({
        id: `${prov}_${cityName}`.replace(/[^a-z0-9_]/gi, '_'),
        province: prov.toUpperCase(),
        city: cityName.charAt(0).toUpperCase() + cityName.slice(1),
        zip_code: zip,
        is_active: true
      });
    }
  }
  return initial;
}

export async function fetchZipCodesDb(): Promise<DbZipCode[]> {
  try {
    const { data, error } = await supabase
      .from('ph_zip_codes')
      .select('*')
      .order('province', { ascending: true });

    if (!error && data && data.length > 0) {
      saveZipCodesLocal(data);
      return data;
    }
  } catch (err) {
    console.warn('Supabase ph_zip_codes fetch notice:', err);
  }
  return getStoredZipCodes();
}

export function saveZipCodesLocal(zipCodes: DbZipCode[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_ZIPCODES_KEY, JSON.stringify(zipCodes));
  } catch {}
  broadcastLocationUpdate();
}

export async function upsertZipCodeDb(record: DbZipCode): Promise<DbZipCode> {
  const current = getStoredZipCodes();
  const id = record.id || `${record.province}_${record.city}_${record.barangay || ''}`.toLowerCase().replace(/[^a-z0-9_]/gi, '_');
  const updatedItem: DbZipCode = {
    ...record,
    id,
    updated_at: new Date().toISOString()
  };

  const idx = current.findIndex(z => z.id === id);
  let updatedList: DbZipCode[];
  if (idx >= 0) {
    updatedList = [...current];
    updatedList[idx] = { ...updatedList[idx], ...updatedItem };
  } else {
    updatedList = [updatedItem, ...current];
  }

  saveZipCodesLocal(updatedList);

  try {
    await supabase.from('ph_zip_codes').upsert([updatedItem], { onConflict: 'id' });
  } catch (err) {
    console.warn('Supabase upsert ph_zip_codes warning:', err);
  }

  return updatedItem;
}

export async function deleteZipCodeDb(id: string): Promise<void> {
  const current = getStoredZipCodes();
  const filtered = current.filter(z => z.id !== id);
  saveZipCodesLocal(filtered);

  try {
    await supabase.from('ph_zip_codes').delete().eq('id', id);
  } catch (err) {
    console.warn('Supabase delete ph_zip_codes warning:', err);
  }
}

/* =========================================================================
   5. MASTER SEEDER & RESET
   ========================================================================= */

export async function restoreOfficialPsgcDatabase(): Promise<boolean> {
  try {
    // 1. Reset provinces
    const seededProvinces = PH_PROVINCES.map(p => ({
      ...p,
      is_active: true,
      city_count: (PH_CITIES[p.code] || []).length,
      updated_at: new Date().toISOString()
    }));
    saveProvincesLocal(seededProvinces);

    // 2. Reset cities
    saveCitiesLocal(PH_CITIES);

    // 3. Reset barangays
    saveBarangaysLocal(PH_BARANGAYS);

    // 4. Reset ZIP codes
    const initialZips: DbZipCode[] = [];
    for (const [prov, cityMap] of Object.entries(ALL_PHILIPPINE_ZIP_CODES)) {
      for (const [cityName, zip] of Object.entries(cityMap)) {
        initialZips.push({
          id: `${prov}_${cityName}`.replace(/[^a-z0-9_]/gi, '_'),
          province: prov.toUpperCase(),
          city: cityName.charAt(0).toUpperCase() + cityName.slice(1),
          zip_code: zip,
          is_active: true,
          updated_at: new Date().toISOString()
        });
      }
    }
    saveZipCodesLocal(initialZips);

    broadcastLocationUpdate();
    return true;
  } catch (e) {
    console.error('Failed to restore official PSGC database:', e);
    return false;
  }
}
