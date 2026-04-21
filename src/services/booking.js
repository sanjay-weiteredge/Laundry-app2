import axios from 'axios';
import apiClient, { API } from './apiRequest';

export const getTimeSlots = async (dateStr, serviceId, token) => {
  try {
    const payload = {
      "Keys": "PREFIX,PICKUP_RANGE,REFER_FREND_ENABLE,REFER_ORDER_DISCOUNT,DELVERYDATE_SLOTS,PICKUP_SLOTS,LOYALTY_POINT_ENABLE,DEFAULT_DELIVERYDATE,EXPRESS_DELIVERYDATE,DEFAULT_PICKUPDATE,ENABLE_EXPRESS_MODE,EXPRESS_PRICELIST"
    };

    // The interceptor automatically attaches the current contextId and token
    const response = await apiClient.post(`appConfigProperties/properties`, payload, {
      params: { type: 'SALESORDER' }
    });

    console.log('Time slots API Response:', response.data);

    if (response.data && response.data.PICKUP_SLOTS) {
      // Convert the comma-separated string "09:00 AM - 10:00 AM,..." into the array format expected by the frontend
      const slotsString = response.data.PICKUP_SLOTS;
      const parsedSlots = slotsString.split(',').map(slotStr => {
        const trimmed = slotStr.trim();
        const parts = trimmed.split('-');

        return {
          start: parts[0] ? parts[0].trim() : trimmed,
          end: parts[1] ? parts[1].trim() : trimmed,
          display: trimmed,
          isAvailable: true // Assuming all listed slots are generally available for now
        };
      }).filter(s => s.display.length > 0);

      return parsedSlots;
    } else {
      console.warn('PICKUP_SLOTS missing from config properties');
      return [];
    }
  } catch (error) {
    console.error('Error calling config properties for slots:', error?.response?.data || error.message);
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

    throw error;
  }
};
