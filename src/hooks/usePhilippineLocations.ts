import { useState, useEffect, useMemo } from 'react';
import {
  PH_PROVINCES,
  Province,
  City,
  Barangay,
  searchProvinces,
  findProvince,
  getCitiesForProvince,
  fetchCitiesForProvinceLive,
  getBarangaysForCity,
  fetchBarangaysForCityLive,
  getZipCodeForCity,
  getShippingZoneForProvince
} from '../lib/philippineLocations';

interface UsePhilippineLocationsProps {
  initialProvince?: string;
  initialCity?: string;
  initialBarangay?: string;
  initialZipCode?: string;
  onProvinceChange?: (prov: Province) => void;
  onCityChange?: (city: City) => void;
  onBarangayChange?: (brgy: Barangay) => void;
}

export function usePhilippineLocations(props?: UsePhilippineLocationsProps) {
  const [selectedProvince, setSelectedProvince] = useState<string>(props?.initialProvince || '');
  const [selectedCity, setSelectedCity] = useState<string>(props?.initialCity || '');
  const [selectedBarangay, setSelectedBarangay] = useState<string>(props?.initialBarangay || '');
  const [zipCode, setZipCode] = useState<string>(props?.initialZipCode || '');

  // Search Filters
  const [provinceSearch, setProvinceSearch] = useState<string>('');
  const [citySearch, setCitySearch] = useState<string>('');
  const [barangaySearch, setBarangaySearch] = useState<string>('');

  // Live Location Lists
  const [cities, setCities] = useState<City[]>(() => getCitiesForProvince(props?.initialProvince || ''));
  const [barangays, setBarangays] = useState<Barangay[]>(() => getBarangaysForCity(props?.initialCity || ''));

  // Loading States
  const [isLoadingCities, setIsLoadingCities] = useState<boolean>(false);
  const [isLoadingBarangays, setIsLoadingBarangays] = useState<boolean>(false);

  // Filtered Province List
  const filteredProvinces = useMemo(() => {
    return searchProvinces(provinceSearch);
  }, [provinceSearch]);

  // Filtered City List
  const filteredCities = useMemo(() => {
    const q = citySearch.trim().toLowerCase();
    if (!q) return cities;
    return cities.filter((c) => c.name.toLowerCase().includes(q));
  }, [cities, citySearch]);

  // Filtered Barangay List
  const filteredBarangays = useMemo(() => {
    const q = barangaySearch.trim().toLowerCase();
    if (!q) return barangays;
    return barangays.filter((b) => b.name.toLowerCase().includes(q));
  }, [barangays, barangaySearch]);

  // Active Province Object & Auto Shipping Zone
  const currentProvince = useMemo(() => {
    return findProvince(selectedProvince);
  }, [selectedProvince]);

  const shippingZone = useMemo(() => {
    return getShippingZoneForProvince(selectedProvince);
  }, [selectedProvince]);

  // Fetch Cities whenever selected province changes
  useEffect(() => {
    if (!selectedProvince) {
      setCities([]);
      return;
    }

    // Immediate synchronous fallback
    const syncCities = getCitiesForProvince(selectedProvince);
    setCities(syncCities);

    let isMounted = true;
    setIsLoadingCities(true);

    fetchCitiesForProvinceLive(selectedProvince)
      .then((liveCities) => {
        if (isMounted && liveCities && liveCities.length > 0) {
          setCities(liveCities);
        }
      })
      .catch((err) => console.warn('PSGC Cities fetch error:', err))
      .finally(() => {
        if (isMounted) setIsLoadingCities(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedProvince]);

  // Fetch Barangays whenever selected city changes
  useEffect(() => {
    if (!selectedCity) {
      setBarangays([]);
      return;
    }

    // Immediate synchronous fallback
    const syncBarangays = getBarangaysForCity(selectedCity, selectedProvince);
    setBarangays(syncBarangays);

    let isMounted = true;
    setIsLoadingBarangays(true);

    fetchBarangaysForCityLive(selectedCity, selectedProvince)
      .then((liveBarangays) => {
        if (isMounted && liveBarangays && liveBarangays.length > 0) {
          setBarangays(liveBarangays);
        }
      })
      .catch((err) => console.warn('PSGC Barangays fetch error:', err))
      .finally(() => {
        if (isMounted) setIsLoadingBarangays(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCity, selectedProvince]);

  // Handler: Select Province
  const handleSelectProvince = (provinceName: string) => {
    setSelectedProvince(provinceName);
    setSelectedCity('');
    setSelectedBarangay('');
    setCitySearch('');
    setBarangaySearch('');
    setZipCode('');

    const provObj = findProvince(provinceName);
    if (provObj && props?.onProvinceChange) {
      props.onProvinceChange(provObj);
    }
  };

  // Handler: Select City
  const handleSelectCity = (cityName: string) => {
    setSelectedCity(cityName);
    setSelectedBarangay('');
    setBarangaySearch('');

    // Auto-detect ZIP code
    const detectedZip = getZipCodeForCity(cityName, selectedProvince);
    if (detectedZip) {
      setZipCode(detectedZip);
    }

    const cityObj = cities.find((c) => c.name.toLowerCase() === cityName.toLowerCase());
    if (cityObj && props?.onCityChange) {
      props.onCityChange(cityObj);
    }
  };

  // Handler: Select Barangay
  const handleSelectBarangay = (barangayName: string) => {
    setSelectedBarangay(barangayName);

    // Refine ZIP code with specific barangay resolution if applicable
    const refinedZip = getZipCodeForCity(selectedCity, selectedProvince, barangayName);
    if (refinedZip) {
      setZipCode(refinedZip);
    }

    const brgyObj = barangays.find((b) => b.name.toLowerCase() === barangayName.toLowerCase());
    if (brgyObj && props?.onBarangayChange) {
      props.onBarangayChange(brgyObj);
    }
  };

  return {
    // Selected State
    selectedProvince,
    selectedCity,
    selectedBarangay,
    zipCode,
    currentProvince,
    shippingZone,

    // Setters
    setSelectedProvince,
    setSelectedCity,
    setSelectedBarangay,
    setZipCode,

    // Handlers
    handleSelectProvince,
    handleSelectCity,
    handleSelectBarangay,

    // Lists
    provinces: PH_PROVINCES,
    cities,
    barangays,
    filteredProvinces,
    filteredCities,
    filteredBarangays,

    // Search query states
    provinceSearch,
    citySearch,
    barangaySearch,
    setProvinceSearch,
    setCitySearch,
    setBarangaySearch,

    // Loading indicators
    isLoadingCities,
    isLoadingBarangays
  };
}
