import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { groupAmenities } from "../utils/amenities";

export function useAmenities() {
  const [amenities, setAmenities] = useState([]);
  const [loadingAmenities, setLoadingAmenities] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoadingAmenities(true);
    apiFetch("/api/v1/amenities")
      .then((res) => {
        if (!alive) return;
        setAmenities(res.data?.items || res.data || []);
      })
      .catch(() => {
        // ignore; caller can handle empty state
      })
      .finally(() => {
        if (!alive) return;
        setLoadingAmenities(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const grouped = useMemo(() => groupAmenities(amenities), [amenities]);
  return { amenities, grouped, loadingAmenities };
}
