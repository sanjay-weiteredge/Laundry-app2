import axios from 'axios';
import { API } from './apiRequest';

export const updateDeviceToken = async (token, deviceToken) => {
  try {
    await axios.put(`${API}/users/device-token`, 
      { deviceToken }, 
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
  } catch (error) {
    console.error('Error updating device token:', error);
  }
};

export const sendNotification = async (token, deviceToken, messagePayload) => {
  try {
    await axios.post(`${API}/notifications/send-notification`, 
      { deviceToken, messagePayload }, 
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};