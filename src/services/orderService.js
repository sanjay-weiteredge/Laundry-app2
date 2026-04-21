import apiClient from './apiRequest';

import { STORES, getStoredOrgDetails, getSelectedStoreId } from './apiConfig';

const ORDER_PAYLOAD_FIELDS =
  'id,orderId,workflowStatus,orderDate,dueDate,organization,invoiceStatus,invoiceTotal,pcsCount,transportType,supplyDate,balanceAmount,tags';

/**
 * Initiates order creation.
 */
export const createOrder = async (orderData) => {
  try {
    const response = await apiClient.post('salesOrders.json', orderData);
    return response.data;
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
};

/**
 * Schedules a pickup for an order.
 */
export const schedulePickup = async (pickupData) => {
  try {
    const response = await apiClient.post('salesOrders/schedulePickup.json', pickupData);
    return response.data;
  } catch (error) {
    console.error('Error scheduling pickup:', error);
    throw error;
  }
};

/**
 * Fetches a specific order's full details by its internal numeric ID.
 */
export const getOrderById = async (orderId) => {
  try {
    const response = await apiClient.get('salesOrders/searching.json', {
      params: {
        query: `id:${orderId}`,
      },
    });
    const data = response.data;
    if (data && data.objectList && data.objectList.length > 0) {
      return data.objectList[0];
    }
    return null;
  } catch (error) {
    console.error('Error fetching order by ID:', error);
    throw error;
  }
};

/**
 * Lists all orders for a specific user (paginated).
 * API: GET /api/salesOrders/pageSearching.json?query=consumerInfo.id:{userInfoID}&contextId={storeID}
 */
export const listUserOrders = async (userInfoId, pageNo = 1, contextId = null) => {
  try {
    const params = {
      query: `consumerInfo.id:${userInfoId}`,
      pageNo,
      orderByCol: 'id',
      orderBy: true,
      payloadFields: ORDER_PAYLOAD_FIELDS,
      timeStamp: new Date().getTime(),
    };

    if (contextId) {
      params.contextId = contextId;
    }

    const response = await apiClient.get('salesOrders/pageSearching.json', { params });
    return response.data;
  } catch (error) {
    console.error(`Error listing user orders for store ${contextId || 'current'}:`, error);
    throw error;
  }
};

/**
 * Aggregates orders from ALL known stores for a single user.
 * This ensures that when a user switches stores, they still see their past orders.
 */
export const listAllUserOrders = async (userInfoId) => {
  try {
    // As explicitly requested, use the store ID decided at login
    const orgDetails = await getStoredOrgDetails();
    const loginStoreId = orgDetails?.orgId || orgDetails?.id || await getSelectedStoreId();

    console.log(`[orderService] Fetching orders explicitly from login store: ${loginStoreId}`);

    const data = await listUserOrders(userInfoId, 1, loginStoreId);

    let allOrders = [];
    if (data && Array.isArray(data.objectList)) {
      // Tag orders with store name
      allOrders = data.objectList.map(order => ({
        ...order,
        contextId: loginStoreId,
        storeName: order.organization?.name || orgDetails?.orgName || 'Login Store'
      }));
    }

    // Flatten results and sort by date descending
    allOrders.sort((a, b) => {
      const dateA = new Date(a.orderDate);
      const dateB = new Date(b.orderDate);
      return dateB - dateA;
    });

    return { objectList: allOrders };
  } catch (error) {
    console.error('Error in listAllUserOrders:', error);
    throw error;
  }
};

/**
 * Cancels an existing order.
 *
 * @param {string|number} orderId - The ID of the order to cancel.
 * @returns {Promise<Object>} - Cancellation confirmation.
 */
export const cancelOrder = async (orderId, token, contextId = null) => {
  try {
    const params = {};
    if (contextId) {
      params.contextId = contextId;
    }
    const response = await apiClient.post(`order/${orderId}/cancel`, {}, { params });
    return response.data;
  } catch (error) {
    console.error(`Error cancelling order ${orderId} for store ${contextId || 'current'}:`, error);
    throw error;
  }
};

/**
 * Submits feedback/review for a completed order.
 *
 * @param {string|number} orderId - The target order.
 * @param {Object} reviewData - The review notes and rating.
 * @returns {Promise<Object>} - Review submission response.
 */
export const submitOrderReview = async (orderId, reviewData) => {
  try {
    const response = await apiClient.post(`orders/${orderId}/review.json`, reviewData);
    return response.data;
  } catch (error) {
    console.error('Error submitting order review:', error);
    throw error;
  }
};
