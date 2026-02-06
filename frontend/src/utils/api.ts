import axios from "axios";

// 统一响应类型定义
export interface ApiResponse<T = any> {
  success: boolean;
  msg: string;
  code: number;
  result: T;
}

// 创建 axios 实例
const api = axios.create({
  baseURL: "/api", // 设置基础 URL
  timeout: 10000, // 请求超时时间
  headers: {
    "Content-Type": "application/json",
  },
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 在这里可以添加认证信息，例如 token
    // const token = localStorage.getItem('token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    // 确保响应数据符合统一格式
    const data = response.data;
    const formattedData: ApiResponse = {
      success: data.success ?? true,
      msg: data.msg ?? "请求成功",
      code: data.code ?? 200,
      result: data.result ?? data,
    };
    return formattedData as any;
  },
  (error) => {
    // 处理响应错误，统一格式返回
    console.error("API Error:", error);
    const errorResponse: ApiResponse = {
      success: false,
      msg: error.response?.data?.msg ?? error.message ?? "请求失败",
      code: error.response?.data?.code ?? error.response?.status ?? 500,
      result: null,
    };
    return Promise.reject(errorResponse);
  }
);

// GET 请求封装
const get = <T = any>(
  url: string,
  params?: any,
  config?: any
): Promise<ApiResponse<T>> => {
  return api.get(url, { params, ...config }) as Promise<ApiResponse<T>>;
};

// POST 请求封装
const post = <T = any>(
  url: string,
  data?: any,
  config?: any
): Promise<ApiResponse<T>> => {
  return api.post(url, data, config) as Promise<ApiResponse<T>>;
};

// PUT 请求封装
const put = <T = any>(
  url: string,
  data?: any,
  config?: any
): Promise<ApiResponse<T>> => {
  return api.put(url, data, config) as Promise<ApiResponse<T>>;
};

// DELETE 请求封装
const del = <T = any>(
  url: string,
  params?: any,
  config?: any
): Promise<ApiResponse<T>> => {
  return api.delete(url, { params, ...config }) as Promise<ApiResponse<T>>;
};

export { api as default, get, post, put, del as delete };
