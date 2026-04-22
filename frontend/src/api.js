import axios from 'axios';

const LOCAL_API = 'http://127.0.0.1:8000';
const PRODUCTION_API = 'https://service-marketplace-16.onrender.com';

function resolveApiBase() {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  if (typeof window === 'undefined') {
    return LOCAL_API;
  }

  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return LOCAL_API;
  }

  return PRODUCTION_API;
}

export const API = resolveApiBase();
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

export function resolveAssetUrl(path) {
  if (!path) {
    return '';
  }

  const trimmedPath = String(path).trim();
  if (!trimmedPath) {
    return '';
  }

  if (/^https?:\/\//i.test(trimmedPath)) {
    return trimmedPath;
  }

  if (trimmedPath.startsWith('//')) {
    return `https:${trimmedPath}`;
  }

  return `${apiClient.defaults.baseURL}${trimmedPath}`;
}

export function handleAssetImageError(event) {
  if (!event?.currentTarget) {
    return;
  }

  const img = event.currentTarget;
  const fallbackLabel =
    img.getAttribute('data-fallback-label') ||
    img.getAttribute('alt') ||
    'Service Marketplace';

  if (img.dataset.fallbackApplied === 'true') {
    img.style.display = 'none';
    return;
  }

  const safeLabel = String(fallbackLabel)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .slice(0, 48);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#eff6ff" />
          <stop offset="55%" stop-color="#dbeafe" />
          <stop offset="100%" stop-color="#ffedd5" />
        </linearGradient>
      </defs>
      <rect width="1200" height="800" rx="48" fill="url(#bg)" />
      <circle cx="210" cy="170" r="78" fill="rgba(37,99,235,0.12)" />
      <circle cx="980" cy="620" r="120" fill="rgba(249,115,22,0.12)" />
      <rect x="130" y="170" width="940" height="460" rx="36" fill="rgba(255,255,255,0.72)" stroke="rgba(37,99,235,0.12)" />
      <rect x="200" y="260" width="240" height="180" rx="24" fill="rgba(37,99,235,0.12)" />
      <path d="M240 400l55-58 60 68 72-88 118 138H240z" fill="#2563eb" opacity="0.72" />
      <circle cx="372" cy="304" r="24" fill="#f97316" opacity="0.85" />
      <text x="520" y="335" fill="#0f172a" font-family="Arial, sans-serif" font-size="52" font-weight="700">Photo unavailable</text>
      <text x="520" y="402" fill="#475569" font-family="Arial, sans-serif" font-size="34">${safeLabel}</text>
      <text x="520" y="455" fill="#64748b" font-family="Arial, sans-serif" font-size="28">The original uploaded image could not be loaded.</text>
    </svg>
  `;

  img.dataset.fallbackApplied = 'true';
  img.src = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
