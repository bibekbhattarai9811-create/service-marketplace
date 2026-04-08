import axios from 'axios';

const defaultApi = 'http://127.0.0.1:8000';

export const API = process.env.REACT_APP_API_URL || defaultApi;
export const WS_API = process.env.REACT_APP_WS_URL || API.replace(/^http/i, 'ws') + '/ws';

export const apiClient = axios.create({
  baseURL: API,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('user_id');
  localStorage.removeItem('role');
}
