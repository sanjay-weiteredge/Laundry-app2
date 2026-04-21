import axios from 'axios';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_TOKEN } from './apiConfig';
import apiClient from './apiRequest';

export const updateDeviceToken = async (deviceToken) => {
  try {
    // Note: Fabklean uses ApiToken in Authorization header for this
    // If the endpoint /users/device-token doesn't exist, we skip it
    // await apiClient.put('/users/device-token', { deviceToken });
    console.log('Skipping device token update (endpoint not verified):', deviceToken);
  } catch (error) {
    console.error('Error updating device token:', error);
  }
};

export const registerForPushNotificationsAsync = async () => {
  let token;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default Notifications',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.log('Failed to get push token for push notification!');
    return;
  }
  try {
    token = (await Notifications.getDevicePushTokenAsync()).data;
    if (token) {
      await updateDeviceToken(token);
    }
  } catch (e) {
    console.error("Failed to get device token", e);
  }

  return token;
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