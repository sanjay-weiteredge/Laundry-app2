import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API } from './apiRequest';



export const getAllServicePricing = async () => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.get(`${API}/service-pricing`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success && response.data.data) {
      return response.data.data;
    } else {
      throw new Error('Failed to fetch service pricing');
    }
  } catch (error) {
    console.error('Error fetching service pricing:', error);
    throw error;
  }
};

/**
 * Transform API data to UI-friendly format
 * @param {Array} apiData - Raw API response data
 * @returns {Array} - Transformed data for UI
 */
export const transformServiceData = (apiData) => {
  return apiData.map(item => ({
    id: item.id,
    name: item.item_type,
    price: item.price,
    duration: '2 hours', // Default duration, you can modify this if API provides duration
    serviceType: item.service_type,
    isActive: item.is_active,
    updatedAt: item.updated_at
  }));
};
