import axios from 'axios';
import { API } from './apiRequest'; 

export const fetchUserServices = async (token) => {
  try {
    if (!token) throw new Error('No authentication token provided');

    const response = await axios.get(`${API}/services/all`, {
      params: { audience: 'user' }, 
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      timeout: 10000,
    });

    if (response.data?.success) {
      return response.data.data; 
    }
    throw new Error(response.data?.message || 'Failed to fetch services');
  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
    throw error;
  }
};
