import { createSlice } from "@reduxjs/toolkit";

export const systemConfigSlice = createSlice({
  name: "systemConfig",
  initialState: {
    deviceType: "android",
    cachePath: "~/ta-inspector",
    deviceSerial: undefined,
    ocrType: "baidu",
  },
  reducers: {
    setSystemConfig: (state, action) => {
      state.deviceType = action.payload.deviceType;
      state.cachePath = action.payload.cachePath;
      state.deviceSerial = action.payload.deviceSerial;
      state.ocrType = action.payload.ocrType;
    },
    setCachePath: (state, action) => {
      state.cachePath = action.payload;
    },
    setDeviceSerial: (state, action) => {
      state.deviceSerial = action.payload;
      localStorage.setItem("deviceSerial", action.payload);
    },
    setDeviceType: (state, action) => {
      state.deviceType = action.payload;
    },
    setOcrType: (state, action) => {
      state.ocrType = action.payload;
    },
  },
});

export const {
  setSystemConfig,
  setCachePath,
  setDeviceSerial,
  setDeviceType,
  setOcrType,
} = systemConfigSlice.actions;
export const systemConfigReducer = systemConfigSlice.reducer;
