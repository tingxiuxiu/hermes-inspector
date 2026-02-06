import { createSlice } from "@reduxjs/toolkit";

export const controlTabSlice = createSlice({
  name: "controlTab",
  initialState: {
    activeTab: "1",
  },
  reducers: {
    setActiveTab: (state, action) => {
      state.activeTab = action.payload;
    },
  },
});

export const { setActiveTab } = controlTabSlice.actions;
export const controlTabReducer = controlTabSlice.reducer;
