import { createSlice } from "@reduxjs/toolkit";

export const harmonyComponentSlice = createSlice({
  name: "harmonyComponent",
  initialState: {
    tree: {},
    imageSource: "",
  },
  reducers: {
    setHarmonyComponent: (state, action) => {
      if (typeof action.payload.pageSource === "string") {
        try {
          state.tree = JSON.parse(action.payload.pageSource);
        } catch (error) {
          console.error("解析JSON字符串失败:", error);
          state.tree = {};
        }
      } else {
        state.tree = {};
      }
      state.imageSource = action.payload.imageSource;
    },
    setHMImageSource: (state, action) => {
      state.imageSource = action.payload;
    },
    setHMTree: (state, action) => {
      if (typeof action.payload === "string") {
        try {
          action.payload = JSON.parse(action.payload);
        } catch (error) {
          console.error("解析JSON字符串失败:", error);
          action.payload = {};
        }
      }
      state.tree = action.payload;
    },
  },
});

export const { setHarmonyComponent, setHMImageSource, setHMTree } =
  harmonyComponentSlice.actions;
export const harmonyComponentReducer = harmonyComponentSlice.reducer;
