import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  ids: [], // listing ids
  status: "idle",
  error: null,
};

const favoritesSlice = createSlice({
  name: "favorites",
  initialState,
  reducers: {
    setFavorites: (state, action) => {
      state.ids = action.payload || [];
    },
    addFavorite: (state, action) => {
      const id = action.payload;
      if (!state.ids.includes(id)) state.ids.push(id);
    },
    removeFavorite: (state, action) => {
      const id = action.payload;
      state.ids = state.ids.filter((x) => x !== id);
    },
    setFavStatus: (state, action) => {
      state.status = action.payload;
    },
    setFavError: (state, action) => {
      state.error = action.payload;
    },
    clearFavorites: (state) => {
      state.ids = [];
      state.status = "idle";
      state.error = null;
    },
  },
});

export const { setFavorites, addFavorite, removeFavorite, setFavStatus, setFavError, clearFavorites } =
  favoritesSlice.actions;

export default favoritesSlice.reducer;
