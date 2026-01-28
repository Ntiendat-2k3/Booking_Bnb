import { apiFetch } from "@/lib/api";
import { addFavorite, removeFavorite, setFavError, setFavStatus, setFavorites } from "./favoritesSlice";

export const fetchFavorites = () => async (dispatch) => {
  try {
    dispatch(setFavStatus("loading"));
    const res = await apiFetch("/api/v1/favorites", { method: "GET" });
    const ids = (res.data || []).map((x) => x.id);
    dispatch(setFavorites(ids));
    dispatch(setFavStatus("idle"));
  } catch (e) {
    dispatch(setFavError(e?.message || "Fetch favorites failed"));
    dispatch(setFavStatus("error"));
  }
};

export const toggleFavorite = (listingId) => async (dispatch) => {
  try {
    const res = await apiFetch(`/api/v1/favorites/${listingId}`, { method: "POST", body: JSON.stringify({}) });
    const favorited = res.data?.favorited;
    if (favorited) dispatch(addFavorite(listingId));
    else dispatch(removeFavorite(listingId));
    return { ok: true, favorited: !!favorited };
  } catch (e) {
    return { ok: false, message: e?.message || "Favorite failed" };
  }
};
