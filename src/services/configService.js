import apiClient from './apiRequest';
import axios from 'axios';
import { FABKLEAN_BASE_URL, API_TOKEN } from './apiConfig';

/**
 * Fetches application configuration properties.
 * 
 * @param {string} type - The property type (e.g., 'SALESORDER').
 * @returns {Promise<Object>} - The metadata and properties.
 */
export const getAppProperties = async (type = 'SALESORDER') => {
  try {
    const response = await apiClient.post('appConfigProperties/properties', {}, {
      params: { type }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching app properties:', error);
    throw error;
  }
};

/**
 * Fetches serviceable pincodes for the current store.
 * 
 * @param {string} pincode - The pincode to check.
 * @returns {Promise<Object>} - The list of serviceable pincodes.
 */
export const getPincodeStatus = async (pincode) => {
  try {
    const { getSelectedStoreId } = await import('./apiConfig');
    const storeId = await getSelectedStoreId();
    const fullUrl = `${FABKLEAN_BASE_URL}appConfigProperties/pincodesList?contextId=${storeId}&pinCode=${pincode}`;

    console.log('[getPincodeStatus] Fetching:', fullUrl);

    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `ApiToken ${API_TOKEN}`
      }
    });

    if (!response.ok) {
      console.warn(`[getPincodeStatus] API fail: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching pincode status:', error.message);
    throw error;
  }
};

/**
 * Fetches full org/store details including address, plants, branding, contact info.
 * API: GET /api/organizations/getOrgDetails?fromBS=true&fromPlant=false&contextId={storeID}
 * Note: contextId is automatically injected by the apiClient request interceptor.
 *
 * @returns {Promise<Object>} - Full org details: orgName, phoneNumber, address, lat, lng,
 *   plants[], branding, state, installedApps[], etc.
 */
export const getStoreData = async () => {
  try {
    const response = await apiClient.get('organizations/getOrgDetails', {
      params: {
        fromBS: true,
        fromPlant: false,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching store data:', error);
    throw error;
  }
};

/**
 * Fetches full org/store details for a specific storeId.
 * Uses a direct axios call (NOT the interceptor-enhanced apiClient) so we can
 * explicitly control contextId — useful during login before AsyncStorage is set.
 *
 * @param {string} storeId - The store/context ID to fetch details for.
 * @returns {Promise<Object>} - Full org details: orgId, orgName, plants[], address,
 *   branding, installedApps[], token, lat, lng, etc.
 */
export const getOrgDetails = async (storeId) => {
  try {
    const response = await axios.get(
      `${FABKLEAN_BASE_URL}organizations/getOrgDetails`,
      {
        params: {
          fromBS: true,
          fromPlant: false,
          contextId: storeId,
        },
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `ApiToken ${API_TOKEN}`,
        },
        timeout: 15000,
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching org details for storeId', storeId, ':', error);
    throw error;
  }
};

/**
 * Fetches active payment methods for the store.
 * 
 * @returns {Promise<Object>} - The payment properties.
 */
export const getPaymentMethods = async () => {
  try {
    const response = await apiClient.get('property/paymentProperties');
    return response.data;
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    throw error;
  }
};
