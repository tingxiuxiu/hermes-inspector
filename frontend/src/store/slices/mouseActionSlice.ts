import { createSlice } from "@reduxjs/toolkit";
import type { MousePosition } from "../../types/MousePosition";

export const mouseActionSlice = createSlice({
  name: "mouseAction",
  initialState: {
    mousePosition: {
      x: 0,
      y: 0,
    } as MousePosition,
    startPosition: null as MousePosition | null,
    endPosition: null as MousePosition | null,
  },
  reducers: {
    setMousePosition: (state, action) => {
      state.mousePosition = action.payload;
    },
    setMouseStartPosition: (state, action) => {
      state.startPosition = action.payload;
    },
    setMouseEndPosition: (state, action) => {
      state.endPosition = action.payload;
    },
  },
});

export const { setMousePosition, setMouseStartPosition, setMouseEndPosition } =
  mouseActionSlice.actions;
export const mouseActionReducer = mouseActionSlice.reducer;
