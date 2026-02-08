import { createSlice } from "@reduxjs/toolkit";

export const drawingBoardSlice = createSlice({
  name: "drawingBoard",
  initialState: {
    imageFilename: "wait-image.png",
  },
  reducers: {
    setImageFilename: (state, action) => {
      state.imageFilename = action.payload;
    },
  },
});

export const { setImageFilename } = drawingBoardSlice.actions;
export const drawingBoardReducer = drawingBoardSlice.reducer;
