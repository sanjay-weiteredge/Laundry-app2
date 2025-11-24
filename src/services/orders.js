import axios from 'axios';
import { API } from './apiRequest';

export const getUserOrders = async (token) => {
  try {
    console.log('Fetching user orders');
    
    if (!token) {
      throw new Error('No authentication token provided');
    }
    
    const response = await axios.get(`${API}/orders/`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      timeout: 10000,
    });
    
  
    
    if (response.data && response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data?.message || 'Failed to fetch orders');
    }
  } catch (error) {
    console.error('Orders API Error:', error);
    console.error('Orders Error Response:', error.response?.data);
    console.error('Orders Error Status:', error.response?.status);
    console.error('Orders Error Message:', error.message);
    throw error;
  }
};

export const cancelOrder = async (orderId, token) => {
  try {
    console.log('Cancelling order:', orderId);
    
    if (!token) {
      throw new Error('No authentication token provided');
    }
    
    const response = await axios.post(`${API}/orders/${orderId}/cancel`, {}, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      timeout: 10000,
    });
    
    console.log('Cancel Order API Response:', response.data);
    
    if (response.data && response.data.success) {
      return response.data;
    } else {
      throw new Error(response.data?.message || 'Failed to cancel order');
    }
  } catch (error) {
    console.error('Cancel Order API Error:', error);
    console.error('Cancel Order Error Response:', error.response?.data);
    console.error('Cancel Order Error Status:', error.response?.status);
    console.error('Cancel Order Error Message:', error.message);
    throw error;
  }
};

export const rescheduleOrder = async (orderId, pickupSlotStart, pickupSlotEnd, token) => {
  try {
    console.log('Rescheduling order:', orderId, 'with slot:', pickupSlotStart, 'to', pickupSlotEnd);
    
    if (!token) {
      throw new Error('No authentication token provided');
    }
    
    const response = await axios.put(`${API}/orders/${orderId}/reschedule`, {
      pickupSlotStart,
      pickupSlotEnd
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
    
    console.log('Reschedule Order API Response:', response.data);
    
    if (response.data && response.data.success) {
      return response.data;
    } else {
      throw new Error(response.data?.message || 'Failed to reschedule order');
    }
  } catch (error) {
    console.error('Reschedule Order API Error:', error);
    console.error('Reschedule Order Error Response:', error.response?.data);
    console.error('Reschedule Order Error Status:', error.response?.status);
    console.error('Reschedule Order Error Message:', error.message);
    throw error;
  }
};
