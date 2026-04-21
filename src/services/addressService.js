import apiClient from './apiRequest';

/**
 * Fetches all saved addresses for a user.
 * 
 * @param {string|number} userInfoId - The user's ID.
 * @returns {Promise<Object>} - The API response containing address information.
 */
export const fetchUserAddresses = async (userInfoId) => {
  try {
    // URL: .../userInfos/{userInfoID}/addresses.json?contextId={storeID}
    const response = await apiClient.get(`userInfos/${userInfoId}/addresses.json`);
    return response.data;
  } catch (error) {
    console.error('Error fetching addresses:', error);
    throw error;
  }
};

/**
 * Adds a new address for the user.
 * 
 * @param {string|number} userInfoId - The user's ID.
 * @param {Object} addressData - The address details.
 * @param {string} addressType - 'address' or 'address2'.
 * @returns {Promise<Object>} - The API response.
 */
export const addUserAddress = async (userInfoId, addressData, addressType = 'address') => {
  try {
    console.log(`[AddressService] Adding address for user ${userInfoId} with type: ${addressType}`);
    console.log(`[AddressService] Payload:`, JSON.stringify(addressData, null, 2));

    // URL: .../userInfos/{userInfoID}/addresses.json?addressType={addressType}&contextId={storeID}
    const response = await apiClient.post(`userInfos/${userInfoId}/addresses.json`, addressData, {
      params: { addressType }
    });

    console.log(`[AddressService] Response:`, JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('[AddressService] Error adding address:', error?.response?.data || error.message);
    throw error;
  }
};

/**
 * Updates an existing address.
 */
export const updateUserAddress = async (userInfoId, addressId, addressData, addressType = 'address') => {
  try {
    const response = await apiClient.put(`userInfos/${userInfoId}/addresses/${addressId}.json`, addressData, {
      params: { addressType }
    });
    return response.data;
  } catch (error) {
    console.error('Error updating address:', error);
    throw error;
  }
};

/**
 * Deletes an address.
 */
export const deleteUserAddress = async (userInfoId, addressId) => {
  try {
    const response = await apiClient.delete(`userInfos/${userInfoId}/addresses/${addressId}.json`);
    return response.data;
  } catch (error) {
    console.error('Error deleting address:', error);
    throw error;
  }
};
/**
 * Marks an address as default.
 */
export const setDefaultUserAddress = async (userInfoId, addressId) => {
  try {
    const response = await apiClient.put(`userInfos/${userInfoId}/addresses/${addressId}/setDefault.json`);
    return response.data;
  } catch (error) {
    console.error('Error setting default address:', error);
    throw error;
  }
};
