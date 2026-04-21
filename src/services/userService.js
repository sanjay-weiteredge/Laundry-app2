import apiClient from './apiRequest';

/**
 * Fetches the user profile details.
 * 
 * @param {string|number} userInfoId - The unique ID of the user profile.
 * @returns {Promise<Object>} - The API response containing userInfo.
 */
export const getUserProfile = async (userInfoId) => {
  try {
    const response = await apiClient.get(`userInfos/${userInfoId}.json`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
};

/**
 * Updates the user profile details.
 * 
 * @param {string|number} userInfoId - The unique ID of the user profile.
 * @param {Object} profileData - The data to update (firstName, email, etc.).
 * @returns {Promise<Object>} - The API response confirming success.
 */
export const updateUserProfile = async (userInfoId, profileData) => {
  try {
    // URL: .../userInfos/{userInfoId}.json?contextId={storeID}&ts={timeStamp}
    // contextId and ts are added by interceptor in apiRequest.js
    const response = await apiClient.put(`userInfos/${userInfoId}.json`, {
      ...profileData,
      id: userInfoId
    });
    return response.data;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

/**
 * Fetches user notifications.
 * @param {string|number} userInfoId 
 */
export const getUserNotifications = async (userInfoId) => {
  try {
    const response = await apiClient.get(`userInfos/${userInfoId}/notifications`);
    return response.data;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
};

/**
 * Marks a single notification as read.
 */
export const markNotificationAsRead = async (userInfoId, notificationId) => {
  try {
    const response = await apiClient.put(`userInfos/${userInfoId}/notifications/${notificationId}/read`);
    return response.data;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

/**
 * Marks all notifications as read for a user.
 */
export const markAllNotificationsAsRead = async (userInfoId) => {
  try {
    const response = await apiClient.put(`userInfos/${userInfoId}/notifications/readAll`);
    return response.data;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};
