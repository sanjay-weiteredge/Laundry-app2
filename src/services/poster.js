import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API } from './apiRequest';

export const getActivePosters = async () => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    const headers = {
      Accept: 'application/json',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await axios.get(`${API}/admin/posters`, {
      headers,
      timeout: 8000,
    });

    if (response.data && response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data?.message || 'Failed to fetch posters');
    }
  } catch (error) {
    console.error('Error fetching active posters:', error.response?.data || error.message);
    throw error;
  }
};