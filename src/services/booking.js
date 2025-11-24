import axios from 'axios';
import { API } from './apiRequest';

export const getTimeSlots = async (date, serviceId, token) => {
  try {
    console.log('Fetching time slots for date:', date, 'serviceId:', serviceId);
    
    if (!token) {
      throw new Error('No authentication token provided');
    }
    
    const response = await axios.get(`${API}/booking/time-slots`, {
      params: { date, serviceId },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      timeout: 10000,
    });
    
    console.log('Time slots API Response:', response.data);
    
    if (response.data && response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data?.message || 'Failed to fetch time slots');
    }
  } catch (error) {
    console.error('Time slots API Error:', error);
    console.error('Time slots Error Response:', error.response?.data);
    console.error('Time slots Error Status:', error.response?.status);
    console.error('Time slots Error Message:', error.message);
    throw error;
  }
};

export const bookService = async (bookingData, token) => {
  try {
    console.log('Booking service with data:', bookingData);
    
    if (!token) {
      throw new Error('No authentication token provided');
    }
    
    const response = await axios.post(`${API}/booking/book`, bookingData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 15000,
    });
    
    console.log('Booking API Response:', response.data);
    
    if (response.data && response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data?.message || 'Failed to book service');
    }
  } catch (error) {
    console.error('Booking API Error:', error);
    console.error('Booking Error Response:', error.response?.data);
    console.error('Booking Error Status:', error.response?.status);
    console.error('Booking Error Message:', error.message);
    throw error;
  }
};
