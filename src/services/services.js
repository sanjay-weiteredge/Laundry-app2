import axios from 'axios';
import { API } from './apiRequest';

export const fetchAllServices = async (token) => {
  try {
    console.log('Fetching services from:', `${API}/services/all`);
    
    if (!token) {
      throw new Error('No authentication token provided');
    }
    
    const response = await axios.get(`${API}/services/all`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      timeout: 10000,
    });
    
    console.log('API Response:', response.data);
    
    if (response.data && response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data?.message || 'Failed to fetch services');
    }
  } catch (error) {
    console.error('API Error:', error);
    console.error('API Error Response:', error.response?.data);
    console.error('API Error Status:', error.response?.status);
    console.error('API Error Message:', error.message);
    throw error;
  }
};
