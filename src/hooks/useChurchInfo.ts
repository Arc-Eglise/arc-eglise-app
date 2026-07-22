import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface ChurchInfo {
  id: string;
  church_name: string;
  church_acronym: string;
  church_description: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
  coordinates_lat: number | null;
  coordinates_lng: number | null;
  sunday_service_time: string;
  sunday_service_location: string | null;
  wednesday_time: string | null;
  wednesday_activity: string | null;
  friday_time: string | null;
  friday_activity: string | null;
  main_phone: string | null;
  main_email: string | null;
  contact_form_email: string | null;
  facebook_url: string | null;
  youtube_url: string | null;
  instagram_url: string | null;
  whatsapp_number: string | null;
  total_members: number;
  total_nations: number;
  founded_year: number;
  pastor_name: string | null;
  pastor_title: string | null;
  pastor_quote: string | null;
  primary_color: string;
  secondary_color: string;
}

interface UseChurchInfoResult {
  data: ChurchInfo | null;
  loading: boolean;
  error: Error | null;
}

// Cache les données de l'église pendant 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;
let cachedData: ChurchInfo | null = null;
let cacheTime = 0;

export function useChurchInfo(): UseChurchInfoResult {
  const [data, setData] = useState<ChurchInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchChurchInfo = async () => {
      try {
        // Vérifier le cache
        if (cachedData && Date.now() - cacheTime < CACHE_DURATION) {
          setData(cachedData);
          setLoading(false);
          return;
        }

        const supabase = createClient();
        const { data: churchInfo, error: fetchError } = await supabase
          .from("church_info")
          .select("*")
          .single();

        if (fetchError) throw fetchError;

        cachedData = churchInfo;
        cacheTime = Date.now();
        setData(churchInfo);
        setError(null);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        console.error("[useChurchInfo]", error);
      } finally {
        setLoading(false);
      }
    };

    fetchChurchInfo();
  }, []);

  return { data, loading, error };
}
