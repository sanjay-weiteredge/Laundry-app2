import axios from 'axios';
import { FABKLEAN_BASE_URL, API_TOKEN, getSelectedStoreId } from './apiConfig';

/**
 * Create a centralized Axios instance for Fabklean API
 */
const apiClient = axios.create({
  baseURL: FABKLEAN_BASE_URL,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

/**
 * Request Interceptor:
 * 1. Injects the current storeId (contextId) into the URL parameters.
 * 2. Adds the Fabklean ApiToken to the Authorization header.
 */
apiClient.interceptors.request.use(
  async (config) => {
    const storeId = await getSelectedStoreId();

    // Inject Authorization header
    config.headers['Authorization'] = `ApiToken ${API_TOKEN}`;

    // Automatically append storeId/contextId to params
    if (!config.params) {
      config.params = {};
    }

    if (config.url.includes('otp')) {
      if (!config.params.storeId) {
        config.params.storeId = storeId;
      }
    } else if (!config.params.contextId) {
      config.params.contextId = storeId;
    }

    // Add timestamp for cache busting or as required by profile endpoints
    if (config.method === 'get') {
      config.params.ts = new Date().getTime();
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor for centralized error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
    });
    return Promise.reject(error);
  }
);

export const API = apiClient;
export default apiClient;
