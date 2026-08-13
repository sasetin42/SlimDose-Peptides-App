import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const useCOAPageSetting = () => {
  const [coaPageEnabled, setCoaPageEnabled] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);

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
          setCoaPageEnabled(value === 'true' || value === true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchCOAPageSetting = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('id', 'coa_page_enabled')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching COA page setting:', error);
        // Default to enabled if setting doesn't exist
        setCoaPageEnabled(true);
        return;
      }
      
      // Default to enabled if setting doesn't exist
      setCoaPageEnabled(data?.value === 'true' || data?.value === true || !data);
    } catch (error) {
      console.error('Error fetching COA page setting:', error);
      // Default to enabled on error
      setCoaPageEnabled(true);
    } finally {
      setLoading(false);
    }
  };

  return { coaPageEnabled, loading };
};

