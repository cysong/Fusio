import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 自动添加 Token
apiClient.interceptors.request.use(
  (config) => {
    const authData = localStorage.getItem('auth-storage');
    if (authData) {
      try {
        const { state } = JSON.parse(authData);
        if (state?.token) {
          config.headers.Authorization = `Bearer ${state.token}`;
        }
      } catch (error) {
        console.error('Failed to parse auth token:', error);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器 - 统一数据格式处理
apiClient.interceptors.response.use(
  (response) => {
    // 如果后端返回 { success: true, data: xxx } 格式
    if (response.data?.success && response.data?.data !== undefined) {
      return response.data.data;
    }
    return response.data;
  },
  (error) => {
    // 401 错误自动登出
    if (error.response?.status === 401) {
      localStorage.removeItem('auth-storage');
      window.location.href = '/login';
    }

    // 提取错误消息
    const errorMessage =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'Request failed';

    return Promise.reject(new Error(errorMessage));
  }
);

export default apiClient;
