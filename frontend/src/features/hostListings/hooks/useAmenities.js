import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { groupAmenities } from "../utils/amenities";

export function useAmenities() {
  const [amenities, setAmenities] = useState([]);
  const [loadingAmenities, setLoadingAmenities] = useState(true);
  const [amenitiesError, setAmenitiesError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    apiFetch("/api/v1/amenities")
      .then(res => { if (active) { setAmenities(res.data?.items || res.data || []); setAmenitiesError(false); } })
      .catch(() => { if (active) setAmenitiesError(true); })
      .finally(() => { if (active) setLoadingAmenities(false); });
    return () => { active = false; };
  }, [attempt]);
  const grouped = useMemo(() => groupAmenities(amenities), [amenities]);
  const retryAmenities = () => { setLoadingAmenities(true); setAttempt(value => value + 1); };
  return { amenities, grouped, loadingAmenities, amenitiesError, retryAmenities };
}
