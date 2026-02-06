import { configureStore } from "@reduxjs/toolkit";
import { mouseActionReducer } from "./slices/mouseActionSlice";
import { harmonyComponentReducer } from "./slices/harmonyComponentSlice";
import { androidComponentReducer } from "./slices/androidComponentSlice";
import { systemConfigReducer } from "./slices/systemConfigSlice";
import { connectionStateReducer } from "./slices/connectionStateSlice";
import { screenCacheReducer } from "./slices/screenCacheSlice";
import { controlTabReducer } from "./slices/controlTabSlice";
import { drawingBoardReducer } from "./slices/drawingBoardSlice";
import { settingsReducer } from "./slices/settingsSlice"; // 添加

import type { Middleware } from "@reduxjs/toolkit";

// 从localStorage加载保存的系统配置
const loadSystemConfigFromStorage = () => {
  try {
    const serializedConfig = localStorage.getItem("systemConfig");
    if (serializedConfig === null) {
      return undefined; // 如果没有保存的配置，返回undefined
    }
    return JSON.parse(serializedConfig);
  } catch (error) {
    console.error("Failed to load system config from localStorage:", error);
    return undefined;
  }
};

// 创建系统配置本地存储中间件
const systemConfigStorageMiddleware: Middleware =
  (store) => (next) => (action: any) => {
    // 先执行action
    const result = next(action);

    // 检查是否是systemConfig相关的action
    if (action.type.startsWith("systemConfig/")) {
      try {
        // 获取当前的systemConfig状态
        const systemConfig = store.getState().systemConfig;
        // 保存到localStorage
        localStorage.setItem("systemConfig", JSON.stringify(systemConfig));
      } catch (error) {
        console.error("Failed to save system config to localStorage:", error);
      }
    }

    return result;
  };

// 加载初始状态
const preloadedState = {
  systemConfig: loadSystemConfigFromStorage() || {
    // 如果没有保存的配置，使用默认值
    deviceType: "android",
    driverType: "appium",
    cachePath: "~/ta-inspector",
    deviceSerial: undefined,
    appiumUrl: "http://localhost:4723",
    ocrType: "baidu",
  },
};

export const store = configureStore({
  reducer: {
    mouseAction: mouseActionReducer,
    systemConfig: systemConfigReducer,
    connectionState: connectionStateReducer,
    androidComponent: androidComponentReducer,
    harmonyComponent: harmonyComponentReducer,
    screenCache: screenCacheReducer,
    controlTab: controlTabReducer,
    drawingBoard: drawingBoardReducer,
    settings: settingsReducer,
  },
  preloadedState,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(systemConfigStorageMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
