import apiClient from './apiRequest';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

/**
 * Sends an OTP to the user's phone number.
 * 
 * @param {string} phoneNumber - The 10-digit phone number.
 * @param {string} countryCode - The country code (default: +91).
 * @returns {Promise<Object>} - The API response containing storeId and verificationCode (for dev).
 */
export const sendOTPRequest = async (phoneNumber, countryCode = '+91') => {
  try {
    const response = await apiClient.post('userInfos/otp/receive', {
      countryCode,
      phoneNumber,
      source: 'APP'
    });
    return response.data;
  } catch (error) {
    console.error('Error in sendOTPRequest:', error);
    throw error;
  }
};

/**
 * Verifies the OTP sent to the user.
 * 
 * @param {string} phoneNumber - The user's phone number.
 * @param {string} otp - The OTP entered by the user.
 * @param {string} fcmToken - The FCM push token (if available).
 * @returns {Promise<Object>} - The API response containing userInfo.
 */
export const verifyOTP = async (phoneNumber, otp, fcmToken = '') => {
  try {
    // Construct deviceData as required by Fabklean API documentation
    const deviceData = {
      deviceId: Device.osBuildId || 'unknown_device_id',
      deviceType: Device.osName || (Platform.OS === 'android' ? 'Android' : 'iOS'),
      fcmToken: fcmToken
    };

    // URL: .../userInfos/otp/verify/{OTP}.json?phnNumber={phoneNumber}&storeId={storeID}
    // storeId is automatically added by the request interceptor in apiRequest.js
    const response = await apiClient.post(`userInfos/otp/verify/${otp}.json`, deviceData, {
      params: {
        phnNumber: phoneNumber
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error in verifyOTP:', error);
    throw error;
  }
};
