import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API } from './apiRequest';

const getAuthToken = async ({ optional = false } = {}) => {
  const token = await AsyncStorage.getItem('userToken');
  if (!token) {
    if (optional) {
      return null;
    }
    const error = new Error('Please log in to continue.');
    error.code = 'AUTH_MISSING';
    throw error;
  }
  return token;
};

const createHeaders = (token, extra = {}) => ({
  Accept: 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
  ...extra,
});

const extractErrorMessage = (error, fallbackMessage) => {
  if (error?.response?.data) {
    const { data } = error.response;
    if (typeof data === 'string') {
      return data;
    }
    if (data.message) {
      return data.message;
    }
    if (data.error) {
      return data.error;
    }
    if (data.errors && typeof data.errors === 'object') {
      const firstKey = Object.keys(data.errors)[0];
      if (firstKey) {
        const firstMessage = data.errors[firstKey];
        if (Array.isArray(firstMessage) && firstMessage.length > 0) {
          return firstMessage[0];
        }
        if (typeof firstMessage === 'string') {
          return firstMessage;
        }
      }
    }
  }

  if (error?.message) {
    return error.message;
  }

  return fallbackMessage;
};

const wrapAndThrow = (error, fallbackMessage) => {
  const message = extractErrorMessage(error, fallbackMessage);
  const wrappedError = new Error(message);
  wrappedError.original = error;
  throw wrappedError;
};

export const fetchAddresses = async () => {
  try {
    const token = await getAuthToken({ optional: true });
    if (!token) {
      return [];
    }

    const response = await axios.get(`${API}/addresses/addresses`, {
      headers: createHeaders(token),
    });

    return response.data?.data ?? [];
  } catch (error) {
    wrapAndThrow(error, 'Failed to load addresses.');
  }
};

export const createAddress = async (addressPayload) => {
  try {
    const token = await getAuthToken();
    const response = await axios.post(`${API}/addresses/add-address`, addressPayload, {
      headers: createHeaders(token, { 'Content-Type': 'application/json' }),
    });

    return response.data?.data ?? null;
  } catch (error) {
    wrapAndThrow(error, 'Failed to create address.');
  }
};

export const updateAddress = async (id, addressPayload) => {
  try {
    const token = await getAuthToken();
    const response = await axios.put(`${API}/addresses/update-address/${id}`, addressPayload, {
      headers: createHeaders(token, { 'Content-Type': 'application/json' }),
    });

    return response.data?.data ?? null;
  } catch (error) {
    wrapAndThrow(error, 'Failed to update address.');
  }
};

export const deleteAddress = async (id) => {
  try {
    const token = await getAuthToken();
    const response = await axios.delete(`${API}/addresses/delete-address/${id}`, {
      headers: createHeaders(token),
    });

    return response.data?.data ?? null;
  } catch (error) {
    wrapAndThrow(error, 'Failed to delete address.');
  }
};

export const setDefaultAddress = async (id) => {
  try {
    const token = await getAuthToken();
    const response = await axios.patch(`${API}/addresses/set-default-address/${id}`, {}, {
      headers: createHeaders(token, { 'Content-Type': 'application/json' }),
    });

    return response.data?.data ?? null;
  } catch (error) {
    wrapAndThrow(error, 'Failed to set default address.');
  }
};

