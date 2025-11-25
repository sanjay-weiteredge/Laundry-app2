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
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserOrders, cancelOrder, rescheduleOrder } from '../services/orders';
import colors from '../component/color';

const { width } = Dimensions.get('window');

const Myorder = ({ navigation }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [rescheduleSuccess, setRescheduleSuccess] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState(null); // 'cancel' or 'reschedule'
  const [showCancelSuccessModal, setShowCancelSuccessModal] = useState(false);
  const modalAnimValue = React.useRef(new Animated.Value(0)).current;
  const cancelSuccessAnimValue = React.useRef(new Animated.Value(0)).current;

  useFocusEffect(
    React.useCallback(() => {
      fetchOrders();
    }, [])
  );

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('Please log in to view orders');
      }
      

      const ordersData = await getUserOrders(token);
      console.log('Orders data:', ordersData[0].services);

      
      // Ensure we always set an array, handle different response formats
      let processedOrders = [];
      if (Array.isArray(ordersData)) {
        processedOrders = ordersData;
      } else if (ordersData && ordersData.data && Array.isArray(ordersData.data)) {
        processedOrders = ordersData.data;
      } else if (ordersData && typeof ordersData === 'object') {
        // If it's an object, try to extract array from it
        const possibleArrays = Object.values(ordersData).filter(Array.isArray);
        if (possibleArrays.length > 0) {
          processedOrders = possibleArrays[0];
        }
      }
      

      setOrders(processedOrders);
    } catch (err) {
      console.error('Fetch orders error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
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
    switch (status?.toLowerCase()) {
      case 'completed':
        return '#4CAF50';
      case 'cancelled':
        return '#F44336';
      case 'pending':
        return '#FF9800';
      case 'confirmed':
        return '#2196F3';
      default:
        return '#757575';
    }
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

    await cancelOrder(selectedOrder.orderId, token);
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
      orderId: selectedOrder.orderId,
      currentOrder: selectedOrder,
      service: {
        id: selectedOrder.services?.[0]?.[0]?.id || 1,
        name: selectedOrder.services?.[0]?.[0]?.name || 'Laundry Service'
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
              {service.name} x{service.quantity}
            </Text>
            <Text style={styles.serviceDescription} numberOfLines={1}>
              {service.description}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const OrderItem = ({ order }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.orderNumber}>Order #{order.orderId}</Text>
          <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]} >
          <Text style={styles.statusText}>{order.status?.charAt(0)?.toUpperCase() + order.status?.slice(1)}</Text>
        </View>
      </View>
      
      <View style={styles.orderContent}>
        <View style={styles.serviceInfo}>
          {renderServices(order.services)}
          <Text style={styles.storeName}>{order.storeName}</Text>
        </View>
        
        {order.pickupSlot && (
          <View style={styles.scheduleInfo}>
            <Ionicons name="time-outline" size={14} color={colors.primaryText} />
            <Text style={styles.scheduleText}>
              Pickup: {formatTimeRange(order.pickupSlot.start, order.pickupSlot.end)}
            </Text>
          </View>
        )}
      </View>
      
    
      {order.status?.toLowerCase() === 'delivered' ? (
        <View style={styles.completedContainer}>
          <View style={styles.completedBadge}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            <Text style={styles.completedText}>Order Completed</Text>
          </View>
          <Text style={styles.deliveredText}>Delivered</Text>
        </View>
      ) : order.status?.toLowerCase() !== 'cancelled' && order.status?.toLowerCase() !== 'completed' ? (
        <View style={styles.actionButtons}>
          <TouchableOpacity
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
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );

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



  // Success Modal Component
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

        
        {orders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color={colors.secondaryText} />
            <Text style={styles.emptyTitle}>No Orders Yet</Text>
            <Text style={styles.emptyMessage}>You haven't placed any orders yet.</Text>
            <TouchableOpacity 
              style={styles.browseButton}
              onPress={() => navigation.navigate('Home', { params: { hidePromo: true } })}
            >
              <Text style={styles.browseButtonText}>Browse Services</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={orders}
            renderItem={({ item }) => <OrderItem order={item} />}
            keyExtractor={(item) => item.orderId?.toString()}
            contentContainerStyle={styles.ordersList}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    height:"95%",
    backgroundColor: '#fff',
    paddingBottom:20
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
  ordersList: {
    padding: 20,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  servicesContainer: {
    marginBottom: 10,
  },
  serviceItem: {
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  serviceDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primaryText,
  },
  orderDate: {
    fontSize: 14,
    color: colors.secondaryText,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  orderContent: {
    marginBottom: 12,
  },
  serviceInfo: {
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primaryText,
    marginBottom: 4,
  },
  storeName: {
    fontSize: 14,
    color: colors.secondaryText,
  },
  scheduleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scheduleText: {
    fontSize: 14,
    color: colors.primaryText,
    marginLeft: 6,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#F44336',
  },
  cancelButtonText: {
    color: '#F44336',
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
});

export default Myorder;