import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

// 百度 OCR 配置接口
export interface BaiduOcrConfig {
  apiKey: string;
  secretKey: string;
}

// 阿里云 OCR 配置接口
export interface AliOcrConfig {
  appKey: string;
  apiKey: string;
  secretKey: string;
}

// 腾讯 OCR 配置接口
export interface TencentOcrConfig {
  apiKey: string;
  secretKey: string;
}

// OpenAI 配置接口
export interface OpenAIConfig {
  apiKey: string;
  baseUrl?: string;
}

// Gemini 配置接口
export interface GeminiConfig {
  apiKey: string;
}

// 设置状态接口
export interface SettingsState {
  baiduOcr: BaiduOcrConfig;
  aliOcr: AliOcrConfig;
  tencentOcr: TencentOcrConfig;
  openai: OpenAIConfig;
  gemini: GeminiConfig;
}

// 初始状态
const initialState: SettingsState = {
  baiduOcr: { apiKey: "", secretKey: "" },
  aliOcr: { appKey: "", apiKey: "", secretKey: "" },
  tencentOcr: { apiKey: "", secretKey: "" },
  openai: { apiKey: "", baseUrl: "" },
  gemini: { apiKey: "" },
};

// 创建设置切片
const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    // 更新百度 OCR 配置
    setBaiduOcrConfig: (state, action: PayloadAction<BaiduOcrConfig>) => {
      state.baiduOcr = action.payload;
    },
    // 更新阿里云 OCR 配置
    setAliOcrConfig: (state, action: PayloadAction<AliOcrConfig>) => {
      state.aliOcr = action.payload;
    },
    // 更新腾讯 OCR 配置
    setTencentOcrConfig: (state, action: PayloadAction<TencentOcrConfig>) => {
      state.tencentOcr = action.payload;
    },
    // 更新 OpenAI 配置
    setOpenAIConfig: (state, action: PayloadAction<OpenAIConfig>) => {
      state.openai = action.payload;
    },
    // 更新 Gemini 配置
    setGeminiConfig: (state, action: PayloadAction<GeminiConfig>) => {
      state.gemini = action.payload;
    },
    // 清空所有配置
    clearAllConfigs: (state) => {
      state.baiduOcr = { apiKey: "", secretKey: "" };
      state.aliOcr = { appKey: "", apiKey: "", secretKey: "" };
      state.tencentOcr = { apiKey: "", secretKey: "" };
      state.openai = { apiKey: "", baseUrl: "" };
      state.gemini = { apiKey: "" };
    },
  },
});

// 导出 actions 和 reducer
export const {
  setBaiduOcrConfig,
  setAliOcrConfig,
  setTencentOcrConfig,
  setOpenAIConfig,
  setGeminiConfig,
  clearAllConfigs,
} = settingsSlice.actions;

export const settingsReducer = settingsSlice.reducer;
