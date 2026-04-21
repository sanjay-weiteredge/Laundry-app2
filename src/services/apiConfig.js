export const STORES = [
  { id: '11473', name: 'The LaundryGuyz - Tellapur' },
  { id: '11476', name: 'West Maredpally' },
  { id: '11477', name: 'Padma Rao Nagar' },
  { id: '11478', name: 'Yapral' },
  { id: '11479', name: 'Saket' },
  { id: '11480', name: 'AS Rao Nagar' }
];

export const FABKLEAN_BASE_URL = 'https://support.fabklean.com/api/';
export const FABKLEAN_OUTLET_URL = 'https://support.fabklean.com/outlet/';

// Placeholder for the API token - update this when you have the token from the Fabklean team
export const API_TOKEN = 'YTk4N2Y1MDdkNmRlNzFlMTk0MzE2M2FhMmM5NGQxZWNiYTAyNTcyNDoxMTQ3MjoxNDY3OTM1';

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Retrieves the currently selected store ID from AsyncStorage.
 * This should be set during the login or store selection flow.
 */
export const getSelectedStoreId = async () => {
  try {
    const storeId = await AsyncStorage.getItem('selectedStoreId');
    return storeId || STORES[0].id; // Default to the first store if none selected
  } catch (error) {
    console.error('Error retrieving store ID:', error);
    return STORES[0].id;
  }
};

/**
 * Saves the selected store ID to AsyncStorage.
 */
export const saveSelectedStoreId = async (storeId) => {
  try {
    await AsyncStorage.setItem('selectedStoreId', storeId);
  } catch (error) {
    console.error('Error saving store ID:', error);
  }
};

/**
 * Retrieves the org details that were saved after login from AsyncStorage.
 * These are fetched from the getOrgDetails API during OTP verification.
 * Returns null if no org details have been saved yet.
 */
export const getStoredOrgDetails = async () => {
  try {
    const raw = await AsyncStorage.getItem('orgDetails');
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error('Error retrieving org details:', error);
    return null;
  }
};
