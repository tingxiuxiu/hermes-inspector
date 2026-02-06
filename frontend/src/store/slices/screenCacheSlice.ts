import { createSlice } from "@reduxjs/toolkit";
import type { TreeObject, Bounds } from "../../types/ComponentInspector";

export const screenCacheSlice = createSlice({
  name: "screenCache",
  initialState: {
    imageFileName: "wait-image.png",
    width: 960,
    height: 540,
    scale: 1,
    selectedBounds: null as Bounds | null,
    selectedNode: null as TreeObject | null,
    selectedNodeKey: null as string | null,
    focusNode: null as TreeObject | null,
    focusNodeKey: null as string | null,
  },
  reducers: {
    setImageFileName: (state, action) => {
      state.imageFileName = action.payload;
    },
    setSelectedBounds: (state, action) => {
      state.selectedBounds = action.payload;
    },
    setScreenSize: (state, action) => {
      state.width = action.payload.width;
      state.height = action.payload.height;
    },
    setScreenScale: (state, action) => {
      state.scale = action.payload;
    },
    setSelectedNode: (state, action) => {
      state.selectedNode = action.payload;
    },
    setSelectedNodeKey: (state, action) => {
      state.selectedNodeKey = action.payload;
    },
    setFocusNode: (state, action) => {
      state.focusNode = action.payload;
    },
    setFocusNodeKey: (state, action) => {
      state.focusNodeKey = action.payload;
    },
    resetNodeState: (state) => {
      state.selectedNode = null;
      state.selectedNodeKey = null;
      state.focusNode = null;
      state.focusNodeKey = null;
    },
  },
});

export const {
  setImageFileName,
  setScreenSize,
  setScreenScale,
  setSelectedNode,
  setSelectedNodeKey,
  setFocusNode,
  setFocusNodeKey,
  resetNodeState,
  setSelectedBounds,
} = screenCacheSlice.actions;
export const screenCacheReducer = screenCacheSlice.reducer;
