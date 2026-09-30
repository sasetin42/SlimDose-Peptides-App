import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  DbProvince,
  DbCity,
  DbBarangay,
  DbZipCode,
  getStoredProvinces,
  fetchProvincesDb,
  upsertProvinceDb,
  deleteProvinceDb,
  getStoredCities,
  fetchCitiesDb,
  upsertCityDb,
  deleteCityDb,
  getStoredBarangays,
  fetchBarangaysDb,
  upsertBarangayDb,
  deleteBarangayDb,
  getStoredZipCodes,
  fetchZipCodesDb,
  upsertZipCodeDb,
  deleteZipCodeDb,
  restoreOfficialPsgcDatabase,
  DISPATCH_LOCATIONS_UPDATED
} from '../lib/philippineLocationsDb';

export function usePhilippineLocationsAdmin() {
  const [provinces, setProvinces] = useState<DbProvince[]>(getStoredProvinces);
  const [citiesMap, setCitiesMap] = useState<Record<string, DbCity[]>>(getStoredCities);
  const [barangaysMap, setBarangaysMap] = useState<Record<string, DbBarangay[]>>(getStoredBarangays);
  const [zipCodes, setZipCodes] = useState<DbZipCode[]>(getStoredZipCodes);

  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Active filters
  const [selectedProvinceFilter, setSelectedProvinceFilter] = useState<string>('');
  const [selectedCityFilter, setSelectedCityFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Refresh and load all data from database
  const refreshAll = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const [pData, cData, bData, zData] = await Promise.all([
        fetchProvincesDb(),
        fetchCitiesDb(),
        fetchBarangaysDb(),
        fetchZipCodesDb()
      ]);
      setProvinces(pData);
      setCitiesMap(cData);
      setBarangaysMap(bData);
      setZipCodes(zData);
    } catch (err) {
      console.warn('Error refreshing Philippine locations DB:', err);
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  }, []);

  // Initial fetch and event sync listener
  useEffect(() => {
    refreshAll();

    const handleSync = () => {
      setProvinces(getStoredProvinces());
      setCitiesMap(getStoredCities());
      setBarangaysMap(getStoredBarangays());
      setZipCodes(getStoredZipCodes());
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener(DISPATCH_LOCATIONS_UPDATED, handleSync);

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener(DISPATCH_LOCATIONS_UPDATED, handleSync);
    };
  }, [refreshAll]);

  // Flattened active cities
  const allCities = useMemo(() => {
    const list: DbCity[] = [];
    Object.values(citiesMap).forEach(cArr => {
      if (Array.isArray(cArr)) list.push(...cArr);
    });
    return list;
  }, [citiesMap]);

  // Flattened active barangays
  const allBarangays = useMemo(() => {
    const list: DbBarangay[] = [];
    Object.values(barangaysMap).forEach(bArr => {
      if (Array.isArray(bArr)) list.push(...bArr);
    });
    return list;
  }, [barangaysMap]);

  // Filtered Provinces List
  const filteredProvinces = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return provinces.filter(p => {
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.region && p.region.toLowerCase().includes(q)) ||
        (p.shippingZone && p.shippingZone.toLowerCase().includes(q))
      );
    });
  }, [provinces, searchQuery]);

  // Filtered Cities List
  const filteredCities = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let list = allCities;

    if (selectedProvinceFilter) {
      list = citiesMap[selectedProvinceFilter] || [];
    }

    if (q) {
      list = list.filter(c => 
        c.name.toLowerCase().includes(q) || 
        c.code.toLowerCase().includes(q) ||
        (c.zipCode && c.zipCode.includes(q))
      );
    }
    return list;
  }, [allCities, citiesMap, selectedProvinceFilter, searchQuery]);

  // Filtered Barangays List
  const filteredBarangays = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let list = allBarangays;

    if (selectedCityFilter) {
      list = barangaysMap[selectedCityFilter] || [];
    }

    if (q) {
      list = list.filter(b => 
        b.name.toLowerCase().includes(q) || 
        b.code.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allBarangays, barangaysMap, selectedCityFilter, searchQuery]);

  // Filtered ZIP Codes List
  const filteredZipCodes = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return zipCodes;
    return zipCodes.filter(z => 
      z.zip_code.includes(q) ||
      z.city.toLowerCase().includes(q) ||
      z.province.toLowerCase().includes(q) ||
      (z.barangay && z.barangay.toLowerCase().includes(q))
    );
  }, [zipCodes, searchQuery]);

  // KPI Metrics
  const stats = useMemo(() => {
    const activeProvinces = provinces.filter(p => p.is_active !== false).length;
    const activeCities = allCities.filter(c => c.is_active !== false).length;
    const activeBarangays = allBarangays.filter(b => b.is_active !== false).length;
    const totalZips = zipCodes.length;

    return {
      totalProvinces: provinces.length,
      activeProvinces,
      totalCities: allCities.length,
      activeCities,
      totalBarangays: allBarangays.length,
      activeBarangays,
      totalZipCodes: totalZips
    };
  }, [provinces, allCities, allBarangays, zipCodes]);

  // Mutations
  const handleSaveProvince = async (prov: DbProvince) => {
    const saved = await upsertProvinceDb(prov);
    setProvinces(getStoredProvinces());
    return saved;
  };

  const handleDeleteProvince = async (code: string) => {
    await deleteProvinceDb(code);
    setProvinces(getStoredProvinces());
  };

  const handleSaveCity = async (city: DbCity) => {
    const saved = await upsertCityDb(city);
    setCitiesMap(getStoredCities());
    return saved;
  };

  const handleDeleteCity = async (code: string, provinceCode: string) => {
    await deleteCityDb(code, provinceCode);
    setCitiesMap(getStoredCities());
  };

  const handleSaveBarangay = async (brgy: DbBarangay) => {
    const saved = await upsertBarangayDb(brgy);
    setBarangaysMap(getStoredBarangays());
    return saved;
  };

  const handleDeleteBarangay = async (code: string, cityCode: string) => {
    await deleteBarangayDb(code, cityCode);
    setBarangaysMap(getStoredBarangays());
  };

  const handleSaveZipCode = async (zip: DbZipCode) => {
    const saved = await upsertZipCodeDb(zip);
    setZipCodes(getStoredZipCodes());
    return saved;
  };

  const handleDeleteZipCode = async (id: string) => {
    await deleteZipCodeDb(id);
    setZipCodes(getStoredZipCodes());
  };

  const handleRestoreDefaults = async () => {
    const ok = await restoreOfficialPsgcDatabase();
    if (ok) {
      setProvinces(getStoredProvinces());
      setCitiesMap(getStoredCities());
      setBarangaysMap(getStoredBarangays());
      setZipCodes(getStoredZipCodes());
    }
    return ok;
  };

  return {
    loading,
    isRefreshing,
    stats,
    // Data
    provinces,
    filteredProvinces,
    citiesMap,
    allCities,
    filteredCities,
    barangaysMap,
    allBarangays,
    filteredBarangays,
    zipCodes,
    filteredZipCodes,
    // Filter controls
    selectedProvinceFilter,
    setSelectedProvinceFilter,
    selectedCityFilter,
    setSelectedCityFilter,
    searchQuery,
    setSearchQuery,
    // Operations
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
  };
}
