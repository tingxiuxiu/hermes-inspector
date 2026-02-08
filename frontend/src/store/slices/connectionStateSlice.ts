import { createSlice } from "@reduxjs/toolkit";

export const connectionStateSlice = createSlice({
  name: "connectionState",
  initialState: {
    connected: false,
  },
  reducers: {
    setConnectionState: (state, action) => {
      state.connected = action.payload;
    },
  },
});

export const { setConnectionState } = connectionStateSlice.actions;
export const connectionStateReducer = connectionStateSlice.reducer;
