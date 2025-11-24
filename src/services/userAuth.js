import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API } from './apiRequest';

export const sendOTPRequest = async (phoneNumber) => {
  try {
    const response = await axios.post(`${API}/users/send-otp`, {
      phone_number: phoneNumber
    });
    return response.data;
  } catch (error) {
    console.error('Error in sendOTPRequest:', error);
    throw error;
  }
};

export const verifyOTP = async (phoneNumber, otp) => {
  try {
    const response = await axios.post(`${API}/users/verify-otp`, {
      phone_number: phoneNumber,
      otp: otp
    });
    return response.data;
  } catch (error) {
    console.error('Error in verifyOTP:', error);
    throw error;
  }
};


export const getProfile = async (token) => {
  console.log('Starting getProfile with token:', token ? 'Token exists' : 'No token');
  
  try {
    if (!token) {
      throw new Error('No authentication token provided');
    }

    console.log('Fetching authenticated user profile...');
    try {
      const response = await axios.get(`${API}/users/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        timeout: 10000,
      });

      console.log('API Response:', {
        status: response.status,
        data: response.data
      });

      if (response.data && response.data.success) {
        return response.data;
      } else {
        throw new Error(response.data?.message || 'Failed to fetch profile: Invalid response format');
      }
    } catch (apiError) {
      console.error('API Error:', {
        message: apiError.message,
        response: apiError.response?.data,
        status: apiError.response?.status,
        config: {
          url: apiError.config?.url,
          method: apiError.config?.method,
          headers: apiError.config?.headers
        }
      });
      throw apiError;
    }
  } catch (error) {
    console.error('Error in getProfile:', error);
    
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
      
      if (error.response.status === 401) {
        await AsyncStorage.removeItem('userToken');
        throw new Error('Your session has expired. Please log in again.');
      }
      
      throw new Error(error.response.data?.message || 'Failed to fetch profile');
    } else if (error.request) {
      console.error('No response received:', error.request);
      throw new Error('Could not connect to the server. Please check your internet connection.');
    } else {
      console.error('Error:', error.message);
      throw error;
    }
  }
};

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; 

export const updateProfile = async (userId, userData, token, retryCount = 0) => {
  console.log('updateProfile called with:', { 
    userId, 
    userData: { 
      ...userData, 
      image: userData.image ? 'Image present' : 'No image' 
    },
    retryCount
  });
  
  try {
    if (!token) {
      throw new Error('No authentication token provided');
    }

    const formData = new FormData();
    
    // Add user data
    if (userData.name) formData.append('name', userData.name);
    if (userData.email) formData.append('email', userData.email);
    
    // Add image if present
    if (userData.image) {
      const imageUriParts = userData.image.split('.');
      const fileType = imageUriParts[imageUriParts.length - 1];
      
      formData.append('image', {
        uri: userData.image,
        name: `photo_${Date.now()}.${fileType}`,
        type: `image/${fileType}`,
      });
    }

    console.log('Sending request to:', `${API}/users/update-profile`);
    console.log('Request data:', {
      hasToken: !!token,
      formDataFields: Array.from(formData.keys()),
      imageIncluded: !!userData.image
    });
    
    // Add timeout to the request
    const source = axios.CancelToken.source();
    const timeout = setTimeout(() => {
      source.cancel('Request timeout. Please check your internet connection.');
    }, 15000); // 15 seconds timeout

    try {
      const response = await axios({
        method: 'put',
        url: `${API}/users/update-profile`,
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        cancelToken: source.token,
        transformRequest: (data) => data, // Prevent axios from transforming form data
        timeout: 15000, // 15 seconds timeout
      });
      
      clearTimeout(timeout);
      console.log('Update profile response:', response.data);
      return response.data;
    } catch (error) {
      clearTimeout(timeout);
      
      // Check if this is a network error that might be worth retrying
      if (isNetworkError(error) && retryCount < MAX_RETRIES) {
        console.log(`Retrying request (${retryCount + 1}/${MAX_RETRIES})...`);
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
        return updateProfile(userId, userData, token, retryCount + 1);
      }
      
      throw error; // Re-throw if not a network error or max retries reached
    }
  } catch (error) {
    console.error('Error in updateProfile:', error);
    throw error;
  }
};


function isNetworkError(error) {
  return (
    !error.response && // No response from server
    error.request && // The request was made but no response was received
    (error.code === 'ECONNABORTED' || // Timeout
     error.code === 'ERR_NETWORK' || // Network error
     error.message === 'Network Error')
  );
}