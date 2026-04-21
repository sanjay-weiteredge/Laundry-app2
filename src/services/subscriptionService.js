import apiClient from './apiRequest';

/**
 * Lists available subscription plans.
 * 
 * @returns {Promise<Object>} - The list of subscription packages.
 */
export const listSubscriptionPlans = async () => {
  try {
    const response = await apiClient.get('assetProducts/searching.json', {
      params: {
        query: 'itemType:CI,tags-publish'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error listing subscription plans:', error);
    throw error;
  }
};

/**
 * Retrieves the subscription plans owned by a user.
 * 
 * @param {string|number} userInfoId - The user's ID.
 * @returns {Promise<Object>} - List of user's active packages.
 */
export const getUserSubscriptions = async (userInfoId) => {
  try {
    const response = await apiClient.get(`userInfos/${userInfoId}/packages`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user subscriptions:', error);
    throw error;
  }
};

/**
 * Assigns a subscription to a user.
 * 
 * @param {Object} subscriptionData - Details for subscription assignment.
 * @returns {Promise<Object>} - Confirmation response.
 */
export const assignSubscription = async (subscriptionData) => {
  try {
    const response = await apiClient.post('salesInvoices/create.json', subscriptionData);
    return response.data;
  } catch (error) {
    console.error('Error assigning subscription:', error);
    throw error;
  }
};
