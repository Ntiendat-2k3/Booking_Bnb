import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  user: null,
  status: "idle", // idle|loading|error
  error: null,
  csrfReady: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
    },
    setStatus: (state, action) => {
      state.status = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    setCsrfReady: (state, action) => {
      state.csrfReady = action.payload;
    },
    clearAuth: (state) => {
      state.user = null;
      state.status = "idle";
      state.error = null;
      state.csrfReady = state.csrfReady; // keep
    },
  },
});

export const { setUser, setStatus, setError, setCsrfReady, clearAuth } = authSlice.actions;
export default authSlice.reducer;
