// src/utils/api.js
import axios from 'axios';

// Prefer .env value so different environments can override easily.
// Default uses relative path so Vite proxy can avoid CORS in dev.
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || '/';

const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true, // important for cookies/auth headers
});

export default {
  get: (url, config) => api.get(url, config),
  post: (url, data, config) => api.post(url, data, config),
  put: (url, data, config) => api.put(url, data, config),
  patch: (url, data, config) => api.patch(url, data, config),
  delete: (url, config) => api.delete(url, config),
  instance: api, // export the raw axios instance if needed
};
