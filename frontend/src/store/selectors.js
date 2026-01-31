import { createSelector } from "@reduxjs/toolkit";

export const selectAuthUser = (state) => state.auth.user;

export const selectFavoriteIds = (state) => state.favorites.ids || [];

export const selectFavoriteIdsSet = createSelector(
  [selectFavoriteIds],
  (ids) => new Set(ids),
);

export const selectIsFavorite = (listingId) =>
  createSelector([selectFavoriteIdsSet], (set) =>
    listingId ? set.has(listingId) : false,
  );
