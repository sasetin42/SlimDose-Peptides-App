import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const useCOAPageSetting = () => {
  const [coaPageEnabled, setCoaPageEnabled] = useState<boolean>(() => {
    try {
      const cached = localStorage.getItem('slimdose_coa_page_enabled');
      if (cached !== null) {
        return cached === 'true';
      }
    } catch {}
    return true;
  });
  const [loading, setLoading] = useState<boolean>(() => {
    try {
      return localStorage.getItem('slimdose_coa_page_enabled') === null;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    fetchCOAPageSetting();
    
    // Subscribe to changes in site_settings — use a unique channel name per
    // hook instance, since this hook is mounted in multiple components and
    // Supabase rejects re-adding callbacks to a channel after subscribe().
    const channel = supabase
      .channel(`coa-page-setting-changes-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'site_settings',
          filter: `id=eq.coa_page_enabled`
        },
        (payload) => {
          const value = payload.new?.value;
          const isEnabled = value === 'true' || value === true;
          setCoaPageEnabled(isEnabled);
          try {
            localStorage.setItem('slimdose_coa_page_enabled', String(isEnabled));
          } catch {}
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchCOAPageSetting = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('id', 'coa_page_enabled')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching COA page setting:', error);
        return;
      }
      
      const isEnabled = data?.value === 'true' || data?.value === true || !data;
      setCoaPageEnabled(isEnabled);
      try {
        localStorage.setItem('slimdose_coa_page_enabled', String(isEnabled));
      } catch {}
    } catch (error) {
      console.error('Error fetching COA page setting:', error);
    } finally {
      setLoading(false);
    }
  };

  return { coaPageEnabled, loading };
};

