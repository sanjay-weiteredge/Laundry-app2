import apiClient from './apiRequest';

/**
 * Lists public promo codes for the store.
 * 
 * @returns {Promise<Object>} - The list of promo codes.
 */
export const listPromoCodes = async () => {
  try {
    const response = await apiClient.get('discounts/searching.json', {
      params: {
        query: 'tags-PUBLIC'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error listing promo codes:', error);
    throw error;
  }
};

/**
 * Validates a promo code for a specific user.
 * 
 * @param {string|number} discountId - The ID of the discount/promo.
 * @param {string|number} userInfoId - The ID of the user.
 * @returns {Promise<Object>} - Validation status.
 */
export const validatePromoCode = async (discountId, userInfoId) => {
  try {
    const response = await apiClient.get(`discount/${discountId}/validatePromo`, {
      params: {
        userInfoId: userInfoId
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error validating promo code:', error);
    throw error;
  }
};

/**
 * Fetches wallet add-ons for a user.
 * 
 * @param {string} phoneNumber - User's phone number.
 * @param {number} pageNo - Page number (default: 0).
 * @param {number} pageSize - Page size (default: 20).
 * @returns {Promise<Object>} - Paginated wallet add-ons.
 */
export const fetchWalletAddOns = async (phoneNumber, pageNo = 0, pageSize = 20) => {
  try {
    const response = await apiClient.get('paymentReceiveds/pageSearching.json', {
      params: {
        query: `consumerInfo.phoneNumber-${phoneNumber},paidAgainst:USERCREDITS`,
        pageNo,
        pageSize,
        orderByCal: 'id',
        orderBy: true
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching wallet add-ons:', error);
    throw error;
  }
};

/**
 * Fetches wallet payments made against orders.
 * 
 * @param {string} phoneNumber - User's phone number.
 * @param {number} pageNo - Page number (default: 0).
 * @param {number} pageSize - Page size (default: 20).
 * @returns {Promise<Object>} - Paginated wallet payments.
 */
export const fetchWalletPayments = async (phoneNumber, pageNo = 0, pageSize = 20) => {
  try {
    const response = await apiClient.get('paymentReceiveds/pageSearching.json', {
      params: {
        query: `consumerInfo.phoneNumber-${phoneNumber},tags:Credit,paidAgainst:ORDERS`,
        pageNo,
        pageSize,
        orderByCal: 'id',
        orderBy: true
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching wallet payments:', error);
    throw error;
  }
};

/**
 * Initiates payment via Easebuzz for an order.
 * 
 * @param {string|number} orderId - The order ID.
 * @returns {Promise<Object>} - The payment link initiation response.
 */
export const initiateEasebuzzOrderPayment = async (orderId) => {
  try {
    const response = await apiClient.get('payments/easebuzz/initiateLink.json', {
      params: {
        orderId,
        instance: 'prod'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error initiating order payment:', error);
    throw error;
  }
};
