import { createSlice } from "@reduxjs/toolkit";
import type { TreeObject, TreeMap } from "../../types/ComponentInspector";

export const androidComponentSlice = createSlice({
  name: "androidComponent",
  initialState: {
    // 只存储可序列化的JavaScript对象
    treeObject: {
      attributes: {
        index: "0",
        class: "hierarchy",
        height: "960",
        width: "540",
      },
      boundsArray: [0, 0],
      center: [0, 0],
      children: [],
      key: "0",
      tagName: "hierarchy",
      xpath: null,
    } as TreeObject,
    // 保存tree map
    treeMap: {
      "0": {
        attributes: { index: "0", class: "view", id: "box" },
        boundsArray: [309, 80, 458, 245],
        center: [433.5, 251],
        children: [],
        key: "0",
        tagName: "box",
        xpath: null as string | null,
      },
      "1": {
        attributes: { index: "1", class: "view", id: "22" },
        boundsArray: [477, 53, 677, 246],
        center: [577, 149.5],
        children: [],
        key: "1",
        tagName: "22",
        xpath: null,
      },
      "2": {
        attributes: { index: "2", class: "view", id: "33" },
        boundsArray: [425, 262, 575, 289],
        center: [667.5, 264],
        children: [],
        key: "2",
        tagName: "33",
        xpath: null,
      },
      "3": {
        attributes: { index: "3", class: "view", id: "data" },
        boundsArray: [448, 481, 545, 516],
        center: [648.5, 386.5],
        children: [],
        key: "3",
        tagName: "data",
        xpath: null,
      },
      "4": {
        attributes: { index: "4", class: "view", id: "bilibili" },
        boundsArray: [296, 22, 692, 251],
        center: [604, 610],
        children: [],
        key: "4",
        tagName: "bilibili",
        xpath: null,
      },
    } as TreeMap,
    imageSource:
      "http://" +
      window.location.host +
      "/api/v1/system/resource/?image=" +
      "wait-data.png",
  },
  reducers: {
    setAdComponent: (state, action) => {
      state.treeObject = action.payload.treeObject;
      state.treeMap = action.payload.treeMap;
      // 将imageSource转换为当前地址 + payload
      state.imageSource =
        window.location.origin +
        "/api/v1/system/resource/?image=" +
        action.payload.imageSource;
    },
    setAdImageSource: (state, action) => {
      state.imageSource =
        window.location.origin +
        "/api/v1/system/resource/?image=" +
        action.payload;
    },
    setAdTreeObject: (state, action) => {
      state.treeObject = action.payload;
    },
    setAdTreeMap: (state, action) => {
      state.treeMap = action.payload;
    },
  },
});

export const {
  setAdComponent,
  setAdImageSource,
  setAdTreeObject,
  setAdTreeMap,
} = androidComponentSlice.actions;
export const androidComponentReducer = androidComponentSlice.reducer;
