import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

// 设置状态接口
export interface SettingsState {
  apiKey: string;
  secretKey: string;
  openai: string;
  gemini: string;
}

// 初始状态
const initialState: SettingsState = {
  apiKey: "",
  secretKey: "",
  openai: "",
  gemini: "",
};

// 创建设置切片
const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    setApiKey: (state, action: PayloadAction<string>) => {
      state.apiKey = action.payload;
    },
    setSecretKey: (state, action: PayloadAction<string>) => {
      state.secretKey = action.payload;
    },
    setOpenAIConfig: (state, action: PayloadAction<string>) => {
      state.openai = action.payload;
    },
    setGeminiConfig: (state, action: PayloadAction<string>) => {
      state.gemini = action.payload;
    },
    clearAllConfigs: (state) => {
      state.apiKey = "";
      state.secretKey = "";
      state.openai = "";
      state.gemini = "";
    },
  },
});

// 导出 actions 和 reducer
export const {
  setApiKey,
  setSecretKey,
  setOpenAIConfig,
  setGeminiConfig,
  clearAllConfigs,
} = settingsSlice.actions;

export const settingsReducer = settingsSlice.reducer;
