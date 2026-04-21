import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  Animated,
  Dimensions,
  ScrollView,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { listAllUserOrders, cancelOrder } from '../services/orderService';
import { rescheduleOrder } from '../services/orders';
import colors from '../component/color';
import AntDesign from '@expo/vector-icons/AntDesign';
const { width } = Dimensions.get('window');
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import Invoice from '../component/invoice';
import { STORES } from '../services/apiConfig';

const Myorder = ({ navigation }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [rescheduleSuccess, setRescheduleSuccess] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState(null); // 'cancel' or 'reschedule'
  const [showCancelSuccessModal, setShowCancelSuccessModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const modalAnimValue = React.useRef(new Animated.Value(0)).current;
  const cancelSuccessAnimValue = React.useRef(new Animated.Value(0)).current;
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState(null);
  const [currentStoreName, setCurrentStoreName] = useState('Selected Store');
  useFocusEffect(
    React.useCallback(() => {
      fetchOrders();
    }, [])
  );

  const fetchOrders = async (isRefreshing = false) => {
    const startTime = Date.now();
    const MIN_LOADING_TIME = 1000;

    try {
      if (!isRefreshing) {
        setLoading(true);
      }

      const profileStr = await AsyncStorage.getItem('userProfile');
      const profile = profileStr ? JSON.parse(profileStr) : null;
      const userInfoId = profile?.id;

      if (!userInfoId) {
        throw new Error('Please log in to view orders');
      }

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );

      const ordersData = await Promise.race([
        listAllUserOrders(userInfoId),
        timeoutPromise
      ]);

      // Determine the loginStoreId from the processed orders if possible, or context
      const loginStoreId = ordersData.objectList?.[0]?.contextId || (await AsyncStorage.getItem('selectedStoreId'));

      // Fabklean API returns objectList (not items)
      let processedOrders = [];
      if (ordersData && Array.isArray(ordersData.objectList)) {
        processedOrders = ordersData.objectList.map(order => ({
          // Raw fields from the API
          ...order,
          // Normalised fields used by the UI
          displayOrderId: order.orderId || String(order.id) || 'N/A',
          orderDate: order.orderDate || '',
          status: order.workflowStatus || 'PENDING',
          storeName: order.organization?.name || order.storeName || 'Store',
          total: typeof order.invoiceTotal === 'number' ? order.invoiceTotal : 0,
          balance: typeof order.balanceAmount === 'number' ? order.balanceAmount : 0,
          invoiceStatus: order.invoiceStatus || '',
          pieces: order.pcsCount || 0,
          dueDate: order.dueDate || '',
          supplyDate: order.supplyDate || '',
          tags: order.tags || '',
        }));
      }

      const elapsed = Date.now() - startTime;
      const remainingTime = Math.max(0, MIN_LOADING_TIME - elapsed);
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }

      // Get current store name for the info box
      const storeObj = STORES.find(s => s.id === String(loginStoreId));
      const finalStoreName = storeObj ? storeObj.name : 'Selected Store';
      setCurrentStoreName(finalStoreName);

      setOrders(processedOrders);

      // Simple alert for user if they have orders (or refreshing)
      if (isRefreshing && processedOrders.length > 0) {
        Alert.alert(
          "Notice",
          `Showing orders for ${finalStoreName}. To see history from another store, please logout and switch store on the login page.`
        );
      }
    } catch (err) {
      console.error('Fetch orders error:', err);
      setError(err.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTimeRange = (startTime, endTime) => {
    if (!startTime || !endTime) return 'N/A';
    const start = new Date(startTime);
    const end = new Date(endTime);

    const formatDate = (date) => {
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    };

    const formatTime = (date) => {
      return date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    // If same day, show date only once
    if (formatDate(start) === formatDate(end)) {
      return `${formatDate(start)}, ${formatTime(start)} - ${formatTime(end)}`;
    }

    return `${formatDate(start)} ${formatTime(start)} - ${formatDate(end)} ${formatTime(end)}`;
  };

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'COMPLETED':
      case 'DELIVERED':
        return '#4CAF50';
      case 'CANCELLED':
        return '#F44336';
      case 'PENDING':
      case 'CREATED':
        return '#FF9800';
      case 'PICKUP':
      case 'CONFIRMED':
      case 'PROCESSING':
        return '#2196F3';
      case 'DELIVERY':
      case 'READY':
        return '#9C27B0';
      default:
        return '#757575';
    }
  };

  const getStatusLabel = (status) => {
    if (!status) return 'Unknown';
    // Convert SNAKE_CASE / ALLCAPS workflow statuses to readable labels
    const labels = {
      PICKUP: 'Pickup Scheduled',
      DELIVERY: 'Out for Delivery',
      COMPLETED: 'Completed',
      DELIVERED: 'Delivered',
      CANCELLED: 'Cancelled',
      PENDING: 'Pending',
      CREATED: 'Order Placed',
      PROCESSING: 'Processing',
      CONFIRMED: 'Confirmed',
      READY: 'Ready',
    };
    return labels[status.toUpperCase()] || status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  };

  const showActionModalAnimated = (order, type) => {
    setSelectedOrder(order);
    setActionType(type);
    setShowActionModal(true);

    Animated.timing(modalAnimValue, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const hideActionModal = () => {
    Animated.timing(modalAnimValue, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowActionModal(false);
      setSelectedOrder(null);
      setActionType(null);
    });
  };

  const showCancelSuccessModalFn = () => {
    setShowCancelSuccessModal(true);
    Animated.timing(cancelSuccessAnimValue, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  const hideCancelSuccessModal = () => {
    Animated.timing(cancelSuccessAnimValue, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowCancelSuccessModal(false);
    });
  };

  const handleCancelOrder = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('Please log in again');
      }

      await cancelOrder(selectedOrder.orderId, token, selectedOrder.contextId);
      hideActionModal();
      showCancelSuccessModalFn();
      fetchOrders(); // Refresh orders
    } catch (error) {
      console.error('Cancel order error:', error);
      Alert.alert('Error', error.message || 'Failed to cancel order');
    }
  };

  const handleRescheduleOrder = () => {
    hideActionModal();

    if (!selectedOrder) {
      Alert.alert('Error', 'No order selected for rescheduling');
      return;
    }

    navigation.navigate('SelectTimeSlot', {
      isReschedule: true,
      orderId: selectedOrder.displayOrderId || selectedOrder.orderId,
      currentOrder: selectedOrder,
      service: {
        id: selectedOrder.id || 1,
        name: selectedOrder.displayOrderId || 'Order'
      },
      onRescheduleComplete: (updatedOrder) => {
        // Update the local state with the rescheduled order
        setOrders(prevOrders =>
          prevOrders.map(order =>
            order.orderId === updatedOrder.orderId
              ? {
                ...order,
                pickupSlot: {
                  ...order.pickupSlot,
                  start: updatedOrder.pickupSlot.start,
                  end: updatedOrder.pickupSlot.end
                },
                updatedAt: updatedOrder.updatedAt
              }
              : order
          )
        );

        // Show success modal
        setRescheduleSuccess(true);
        // Auto-hide the modal after 2 seconds
        setTimeout(() => {
          setRescheduleSuccess(false);
        }, 2000);
      }
    });
  };

  const renderServices = (services) => {
    if (!services || !Array.isArray(services)) return null;

    return (
      <View style={styles.servicesContainer}>
        {services.map((service, index) => (
          <View key={`${service.id}-${index}`} style={styles.serviceItem}>
            <Text style={styles.serviceName}>
              {service.name}
            </Text>
            <Text style={styles.serviceDescription} numberOfLines={1}>
              {service.description}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const OrderItem = ({ order }) => {
    const isDelivered =
      order.status?.toUpperCase() === 'DELIVERED' ||
      order.status?.toUpperCase() === 'COMPLETED';
    const isCancelled = order.status?.toUpperCase() === 'CANCELLED';

    return (
      <View style={styles.orderCard}>
        {/* Header: Order ID + Status Badge */}
        <View style={styles.orderHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.orderNumber}>Order #{order.displayOrderId}</Text>
            <Text style={styles.orderDate}>{formatDate(order.orderDate)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
            <Text style={styles.statusText}>{getStatusLabel(order.status)}</Text>
          </View>
        </View>

        {/* Store name */}
        {!!order.storeName && (
          <Text style={styles.storeName}>{order.storeName}</Text>
        )}

        {/* Order meta row */}
        <View style={styles.orderMetaRow}>
          {order.pieces > 0 && (
            <View style={styles.metaChip}>
              <Ionicons name="shirt-outline" size={13} color={colors.secondaryText} />
              <Text style={styles.metaChipText}>{order.pieces} pcs</Text>
            </View>
          )}
          {!!order.dueDate && (
            <View style={styles.metaChip}>
              <Ionicons name="calendar-outline" size={13} color={colors.secondaryText} />
              <Text style={styles.metaChipText}>Due: {formatDate(order.dueDate)}</Text>
            </View>
          )}
          {!!order.supplyDate && (
            <View style={styles.metaChip}>
              <Ionicons name="time-outline" size={13} color={colors.secondaryText} />
              <Text style={styles.metaChipText}>Supply: {formatDate(order.supplyDate)}</Text>
            </View>
          )}
        </View>

        {/* Totals — only show once the order has been paid */}
        {order.invoiceStatus?.toUpperCase() !== 'UNPAID' && (
          <View style={styles.totalRow}>
            <View>
              <Text style={styles.totalLabel}>Invoice Total</Text>
              <Text style={styles.totalValue}>₹{order.total.toFixed(2)}</Text>
            </View>
            {order.balance > 0 && (
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.totalLabel}>Balance Due</Text>
                <Text style={[styles.totalValue, { color: '#F44336' }]}>₹{order.balance.toFixed(2)}</Text>
              </View>
            )}
            {!!order.invoiceStatus && (
              <View style={[styles.paymentBadge, { backgroundColor: '#E8F5E9' }]}>
                <Text style={[styles.paymentBadgeText, { color: '#2E7D32' }]}>
                  {order.invoiceStatus}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Action Buttons */}
        {isDelivered ? (
          <View style={styles.completedContainer}>
            <View style={styles.completedBadge}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.completedText}>Order Delivered</Text>
            </View>
            <TouchableOpacity
              style={styles.invoiceButton}
              onPress={() => setSelectedOrderForInvoice(order)}
            >
              <Text style={styles.invoiceText}>Invoice</Text>
              <AntDesign name="cloud-download" size={19} color="black" />
            </TouchableOpacity>
          </View>
        ) : !isCancelled ? (
          <View style={styles.actionButtons}>
            {/* <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => showActionModalAnimated(order, 'cancel')}
            >
              <Ionicons name="close-circle-outline" size={16} color="#F44336" />
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rescheduleButton]}
              onPress={() => showActionModalAnimated(order, 'reschedule')}
            >
              <Ionicons name="calendar-outline" size={16} color="#2196F3" />
              <Text style={styles.rescheduleButtonText}>Reschedule</Text>
            </TouchableOpacity> */}
          </View>
        ) : null}
      </View>
    );
  };

  const CancelSuccessModal = () => {
    return (
      <Modal
        transparent
        visible={showCancelSuccessModal}
        animationType="none"
        onRequestClose={hideCancelSuccessModal}
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.successModalContainer,
              {
                opacity: cancelSuccessAnimValue,
                transform: [
                  {
                    scale: cancelSuccessAnimValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.successModalContent}>
              <View style={styles.successIconContainer}>
                <Ionicons name="checkmark-circle" size={60} color="#4CAF50" />
              </View>
              <Text style={styles.successTitle}>Order Cancelled!</Text>
              <Text style={styles.successMessage}>
                Your order #{selectedOrder?.orderId} has been successfully cancelled.
              </Text>

              <TouchableOpacity
                style={styles.successButton}
                onPress={hideCancelSuccessModal}
              >
                <Text style={styles.successButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    );
  };

  const ActionModal = () => {
    if (!showActionModal || !selectedOrder) return null;

    return (
      <Modal
        transparent
        visible={showActionModal}
        animationType="none"
        onRequestClose={hideActionModal}
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.actionModalContainer,
              {
                transform: [{
                  scale: modalAnimValue
                }]
              }
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {actionType === 'cancel' ? 'Cancel Order' : 'Reschedule Order'}
              </Text>
              <TouchableOpacity onPress={hideActionModal}>
                <Ionicons name="close" size={24} color={colors.primaryText} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <View style={styles.orderSummary}>
                <Text style={styles.summaryLabel}>Order #{selectedOrder.orderId}</Text>
                <Text style={styles.summaryService}>{selectedOrder.serviceName}</Text>
                <Text style={styles.summaryStore}>{selectedOrder.storeName}</Text>
                {selectedOrder.pickupSlot && (
                  <Text style={styles.summaryTime}>
                    {formatTimeRange(selectedOrder.pickupSlot.start, selectedOrder.pickupSlot.end)}
                  </Text>
                )}
              </View>

              <Text style={styles.confirmationText}>
                {actionType === 'cancel'
                  ? 'Are you sure you want to cancel this order? This action cannot be undone.'
                  : 'You will be redirected to select a new time slot for this order.'
                }
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={hideActionModal}
              >
                <Text style={styles.modalCancelText}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  actionType === 'cancel' ? styles.modalConfirmCancel : styles.modalConfirmReschedule
                ]}
                onPress={actionType === 'cancel' ? handleCancelOrder : handleRescheduleOrder}
              >
                <Text style={[
                  styles.modalConfirmText,
                  actionType === 'cancel' ? styles.modalConfirmCancelText : styles.modalConfirmRescheduleText
                ]}>
                  {actionType === 'cancel' ? 'Cancel Order' : 'Reschedule'}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#F44336" />
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchOrders}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }




  const SuccessModal = () => (
    <Modal
      transparent={true}
      animationType="fade"
      visible={rescheduleSuccess}
      onRequestClose={() => setRescheduleSuccess(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.successModal}>
          <Ionicons name="checkmark-circle" size={50} color="#4CAF50" />
          <Text style={styles.successText}>Order Rescheduled Successfully!</Text>
        </View>
      </View>
    </Modal>
  );

  return (
    <>
      <CancelSuccessModal />
      <ActionModal />
      <SuccessModal />
      <SafeAreaView style={styles.container}>

        <Modal
          visible={!!selectedOrderForInvoice}
          transparent={false}
          animationType="slide"
          onRequestClose={() => setSelectedOrderForInvoice(null)}
        >
          <View style={styles.fullScreenContainer}>
            <Invoice
              order={selectedOrderForInvoice}
              onClose={() => setSelectedOrderForInvoice(null)}
            />
          </View>
        </Modal>
        {orders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color={colors.secondaryText} />
            <Text style={styles.emptyTitle}>No Orders Found</Text>
            <Text style={styles.emptyMessage}>
              We couldn't find any orders for <Text style={{ fontWeight: 'bold', color: colors.primary }}>{currentStoreName}</Text>.
            </Text>

            <View style={styles.infoBoxEmpty}>
              <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
              <Text style={styles.infoBoxTextSmall}>
                Order history is unique to each store. If you've ordered from a different branch, please log out and select that store.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.switchStoreButton}
              onPress={() => {
                Alert.alert(
                  'Switch Store',
                  'To view orders from another store, you need to logout and select the correct store on the login page.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Logout & Switch',
                      onPress: async () => {
                        await AsyncStorage.clear();
                        navigation.reset({
                          index: 0,
                          routes: [{ name: 'Login' }],
                        });
                      }
                    }
                  ]
                );
              }}
            >
              <Text style={styles.switchStoreButtonText}>Switch Store / Logout</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => navigation.navigate('Home', { params: { hidePromo: true } })}
            >
              <Text style={styles.browseButtonText}>Start New Order</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.historyNotice}>
              <Ionicons name="information-circle" size={22} color={colors.primary} />
              <View style={styles.noticeTextContainer}>
                <Text style={styles.noticeTitle}>Store-Specific History</Text>
                <Text style={styles.noticeDescription}>
                  Showing orders for <Text style={{ fontWeight: 'bold' }}>{currentStoreName}</Text>. To see orders from other stores, please logout and switch store.
                </Text>
              </View>
            </View>
            <FlatList
              data={orders}
              renderItem={({ item }) => <OrderItem order={item} />}
              keyExtractor={(item) => (item.id ?? item.displayOrderId)?.toString()}
              contentContainerStyle={styles.ordersList}
              initialNumToRender={5}
              maxToRenderPerBatch={5}
              updateCellsBatchingPeriod={50}
              windowSize={5}
              removeClippedSubviews={true}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => {
                    setRefreshing(true);
                    fetchOrders(true);
                  }}
                  colors={[colors.primary]}
                  tintColor={colors.primary}
                  progressViewOffset={50}
                />
              }
            />
          </>
        )}
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    height: "95%",
    backgroundColor: '#fff',
    paddingBottom: 20
  },
  fullScreenContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: colors.primary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  placeholder: {
    width: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.primaryText,
    marginBottom: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F44336',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: colors.primaryText,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.primaryText,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    color: colors.secondaryText,
    textAlign: 'center',
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  historyNotice: {
    flexDirection: 'row',
    backgroundColor: '#FFF5F2',
    margin: 20,
    marginBottom: 0,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE0D6',
    alignItems: 'center',
  },
  noticeTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 2,
  },
  noticeDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  infoBoxEmpty: {
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  infoBoxTextSmall: {
    fontSize: 12,
    color: '#666',
    marginLeft: 10,
    flex: 1,
    lineHeight: 16,
  },
  switchStoreButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  switchStoreButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  ordersList: {
    padding: 20,
    paddingTop: 10,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  servicesContainer: {
    marginBottom: 12,
  },
  serviceItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  serviceDescription: {
    fontSize: 13,
    color: '#757575',
    marginTop: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
    marginRight: 12,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  orderDate: {
    fontSize: 13,
    color: '#757575',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  orderContent: {
    marginBottom: 12,
  },
  serviceInfo: {
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  storeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  storeName: {
    fontSize: 13,
    color: '#616161',
    marginLeft: 6,
    flex: 1,
  },
  orderMeta: {
    marginTop: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metaText: {
    fontSize: 13,
    color: '#616161',
    marginLeft: 8,
  },
  metaValue: {
    color: '#1A1A1A',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 12,
  },
  scheduleText: {
    fontSize: 14,
    color: colors.primaryText,
    marginLeft: 6,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
    borderWidth: 1,
    backgroundColor: '#fff',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderColor: '#F44336',
  },
  cancelButtonText: {
    color: '#F44336',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  rescheduleButton: {
    backgroundColor: '#fff',
    borderColor: '#2196F3',
  },
  rescheduleButtonText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  rescheduleButton: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  rescheduleButtonText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  completedContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  completedText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  deliveredText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    margin: 20,
    padding: 24,
    maxWidth: width * 0.9,
    width: width * 0.9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primaryText,
  },
  modalContent: {
    marginBottom: 24,
  },
  orderSummary: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primaryText,
    marginBottom: 4,
  },
  summaryService: {
    fontSize: 14,
    color: colors.secondaryText,
    marginBottom: 2,
  },
  summaryStore: {
    fontSize: 14,
    color: colors.secondaryText,
    marginBottom: 4,
  },
  summaryTime: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  confirmationText: {
    fontSize: 16,
    color: colors.primaryText,
    lineHeight: 24,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 8,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#f0f0f0',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primaryText,
  },
  modalConfirmCancel: {
    backgroundColor: '#F44336',
  },
  modalConfirmReschedule: {
    backgroundColor: '#2196F3',
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalConfirmCancelText: {
    color: '#fff',
  },
  modalConfirmRescheduleText: {
    color: '#fff',
  },
  // Success modal styles
  successModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    margin: 20,
    padding: 24,
    maxWidth: width * 0.85,
    width: width * 0.85,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 10,
  },
  successModalContent: {
    alignItems: 'center',
  },
  successIconContainer: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.primaryText,
    marginBottom: 8,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 14,
    color: colors.secondaryText,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  successButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
  },
  successButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successModal: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 25,
    alignItems: 'center',
    justifyContent: 'center',
    width: '90%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  invoiceText: {

    padding: 4,
    borderRadius: 15,

  },
  successText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  successText: {
    color: 'white',
    fontSize: 16,
    marginTop: 10,
    textAlign: 'center',
  },
  successModal: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: '80%',
    elevation: 5,
  },
  successText: {
    color: '#333',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 15,
    textAlign: 'center',
  },
  actionContainer: {
    flexDirection: 'column',
    gap: 10,
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  orderMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    marginBottom: 4,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  metaChipText: {
    fontSize: 12,
    color: '#616161',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  totalLabel: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 2,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  paymentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  paymentBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  priceContainer: {
    marginTop: 8,
  },
  priceText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  scheduleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  invoiceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: "lightgrey",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  invoiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
    marginLeft: 10,
  },
  invoiceText: {
    marginRight: 5,
    color: '#333',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default Myorder;