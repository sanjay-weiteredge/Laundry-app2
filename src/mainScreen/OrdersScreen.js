import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, SafeAreaView, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import colors from '../component/color';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserOrders } from '../services/orders';

const OrdersScreen = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders().finally(() => setRefreshing(false));
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('Please log in again');
      }
      
      const ordersData = await getUserOrders(token);
      setOrders(ordersData);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError(error.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  // Compute total amount for an order using robust fallbacks
  const getOrderTotal = (order) => {
    if (!order) return 0;
    const direct = order.totalAmount || order.total || order.total_price || order.amount;
    if (typeof direct === 'number') return direct;
    // Fallback: sum line totals from services array if present
    if (Array.isArray(order.services)) {
      return order.services.reduce((sum, s) => {
        const lt = s?.lineTotal || s?.line_total || (s?.price && s?.quantity ? s.price * s.quantity : 0);
        return sum + (typeof lt === 'number' ? lt : 0);
      }, 0);
    }
    return 0;
  };

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [])
  );

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return '#4CAF50';
      case 'pending':
        return '#FFC107';
      case 'cancelled':
        return '#F44336';
      case 'in_progress':
      case 'processing':
        return '#2196F3';
      default:
        return '#757575';
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

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatTimeRange = (startDateString, endDateString) => {
    if (!startDateString || !endDateString) return 'N/A';
    const startDate = new Date(startDateString);
    const endDate = new Date(endDateString);
    
    const dateStr = startDate.toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
    
    const startTime = startDate.toLocaleTimeString('en-IN', { 
      hour: '2-digit',
      minute: '2-digit',
      hour12: true 
    });
    
    const endTime = endDate.toLocaleTimeString('en-IN', { 
      hour: '2-digit',
      minute: '2-digit',
      hour12: true 
    });
    
    return `${dateStr}, ${startTime} - ${endTime}`;
  };

  const OrderItem = ({ order }) => {
    // Helper function to render services list
    const renderServices = (services) => {
      if (!services || !Array.isArray(services)) return null;
      
      return (
        <View style={styles.servicesContainer}>
          {services.map((service, index) => (
            <View key={`${service.id}-${index}`} style={styles.serviceItem}>
              <Text style={styles.serviceName}>
                • {service.name}
              </Text>
              {service.description && (
                <Text style={styles.serviceDescription} numberOfLines={1}>
                  {service.description}
                </Text>
              )}
            </View>
          ))}
        </View>
      );
    };

    return (
      <View style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderNumber}>Order #{order.orderId}</Text>
            <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]} >
            <Text style={styles.statusText}>{order.status.charAt(0).toUpperCase() + order.status.slice(1)}</Text>
          </View>
        </View>
        
        <View style={styles.orderContent}>
          <View style={styles.serviceInfo}>
            {order.storeName && (
              <Text style={styles.storeName}>{order.storeName}</Text>
            )}
            {renderServices(order.services || [])}
          </View>
          
          {order.pickupSlot && (
            <View style={styles.scheduleInfo}>
              <Ionicons name="time-outline" size={14} color={colors.primaryText} />
              <Text style={styles.scheduleText}>
                Pickup: {formatTimeRange(order.pickupSlot.start, order.pickupSlot.end)}
              </Text>
            </View>
          )}

          {/* Total Amount */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₹{getOrderTotal(order).toFixed(2)}</Text>
          </View>
        </View>
      </View>
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
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchOrders}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (orders.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={48} color={colors.primaryText} />
          <Text style={styles.emptyText}>No orders found</Text>
          <Text style={styles.emptySubText}>You haven't placed any orders yet</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.orderId.toString()}
        renderItem={({ item }) => <OrderItem order={item} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    height: '95%',
    width: '100%',
    backgroundColor: '#FBEFE7',
    padding: 16,
  },
  heading: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.primaryText,
    marginBottom: 20,
  },
  listContent: {
    paddingBottom: 20,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryText,
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 12,
    color: colors.secondaryText,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  itemsContainer: {
    marginTop: 8,
  },
  servicesTitle: {
    fontSize: 13,
    color: colors.secondaryText,
    marginBottom: 6,
    fontWeight: '500',
  },
  itemRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 13,
    color: colors.primaryText,
  },
  itemQuantity: {
    fontSize: 12,
    color: colors.secondaryText,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryText,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 12,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deliveryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  deliveryText: {
    fontSize: 12,
    color: colors.secondaryText,
    marginLeft: 6,
    flex: 1,
  },
  totalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 12,
    color: colors.secondaryText,
    marginRight: 6,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primaryText,
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
    padding: 20,
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: '600',
    color: colors.primaryText,
  },
  emptySubText: {
    marginTop: 5,
    fontSize: 14,
    color: colors.secondaryText,
    textAlign: 'center',
  },
  orderContent: {
    marginTop: 12,
  },
  servicesContainer: {
    marginTop: 8,
    marginBottom: 4,
  },
  serviceItem: {
    marginBottom: 6,
  },
  serviceName: {
    fontSize: 15,
    color: colors.primaryText,
    fontWeight: '500',
  },
  serviceDescription: {
    fontSize: 12,
    color: colors.secondaryText,
    marginLeft: 12,
    marginTop: 2,
  },
  serviceInfo: {
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryText,
    marginBottom: 2,
  },
  storeName: {
    fontSize: 12,
    color: colors.secondaryText,
  },
  scheduleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scheduleText: {
    fontSize: 12,
    color: colors.secondaryText,
    marginLeft: 4,
  },
});

export default OrdersScreen;

