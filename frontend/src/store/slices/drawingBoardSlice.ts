import { createSlice } from "@reduxjs/toolkit";
import type { MarkingBox } from "../../types/DraingScreen";

export const drawingBoardSlice = createSlice({
  name: "drawingBoard",
  initialState: {
    markingBoxes: [] as MarkingBox[],
  },
  reducers: {
    setMarkingBoxes: (state, action) => {
      state.markingBoxes = action.payload;
    },
  },
});

export const { setMarkingBoxes } = drawingBoardSlice.actions;
export const drawingBoardReducer = drawingBoardSlice.reducer;
