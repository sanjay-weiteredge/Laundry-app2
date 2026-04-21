import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import colors from '../component/color';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { listAllUserOrders, cancelOrder } from '../services/orderService';

const OrdersScreen = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders().finally(() => setRefreshing(false));
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      const profileStr = await AsyncStorage.getItem('userProfile');
      const profile = profileStr ? JSON.parse(profileStr) : null;
      const userInfoId = profile?.id;

      if (!userInfoId) {
        throw new Error('Please log in to view orders');
      }

      // Call Fabklean API to fetch orders from all stores
      const response = await listAllUserOrders(userInfoId);

      // API returns { objectList: [...], totalResult, pageNo, ... }
      const rawOrders = response?.objectList ?? [];

      const processedOrders = rawOrders.map((order) => ({
        ...order,
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
      }));

      setOrders(processedOrders);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [])
  );

  const handleCancelOrder = (order) => {
    // Determine the numeric ID for the cancel endpoint.
    const extractNumericId = () => {
      if (typeof order.id === 'number' || /^\d+$/.test(String(order.id))) return order.id;
      if (typeof order.orderId === 'number' || /^\d+$/.test(String(order.orderId))) return order.orderId;
      if (order.entityBaseId) return order.entityBaseId;
      return order.id;
    };
    const numericId = extractNumericId();

    Alert.alert(
      "Cancel Order",
      `Are you sure you want to cancel Order #${order.displayOrderId}?`,
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              setCancellingId(order.id);
              await cancelOrder(numericId, null, order.contextId);
              fetchOrders(); // Refresh list to reflect CANCELLED status
            } catch (err) {
              Alert.alert("Error", "Could not cancel the order at this time. Please try again later.");
            } finally {
              setCancellingId(null);
            }
          }
        }
      ]
    );
  };

  /* ───────── helpers ───────── */

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
    return (
      labels[status.toUpperCase()] ||
      status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; // return as-is for "2025-05-29 00:00" style
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  /* ───────── OrderItem card ───────── */

  const OrderItem = ({ order }) => {
    const isCancellable = ['PENDING', 'CREATED', 'PICKUP'].includes(order.status?.toUpperCase());
    const isCancelling = cancellingId === order.id;

    return (
      <View style={styles.orderCard}>
        {/* Header: Order ID + Status */}
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

        {/* Meta chips: pieces / due date / supply date */}
        <View style={styles.metaRow}>
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

        {/* Action Row */}
        {isCancellable && (
          <View style={{ alignItems: 'flex-end', marginTop: 4, marginBottom: 8 }}>
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#FFF0F0',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 6,
                borderWidth: 1,
                borderColor: '#FFCDD2'
              }}
              onPress={() => handleCancelOrder(order)}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <ActivityIndicator size="small" color="#F44336" style={{ marginRight: 6 }} />
              ) : (
                <Ionicons name="close-circle-outline" size={14} color="#F44336" style={{ marginRight: 4 }} />
              )}
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#F44336' }}>
                {isCancelling ? "Cancelling..." : "Cancel Order"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Totals row — only show once the order has been paid */}
        {order.invoiceStatus?.toUpperCase() !== 'UNPAID' && (
          <View style={styles.totalsRow}>
            <View>
              <Text style={styles.totalLabel}>Invoice Total</Text>
              <Text style={styles.totalValue}>₹{order.total.toFixed(2)}</Text>
            </View>
            {order.balance > 0 && (
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.totalLabel}>Balance Due</Text>
                <Text style={[styles.totalValue, { color: '#F44336' }]}>
                  ₹{order.balance.toFixed(2)}
                </Text>
              </View>
            )}
            {!!order.invoiceStatus && (
              <View
                style={[
                  styles.paymentBadge,
                  {
                    backgroundColor: '#E8F5E9',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.paymentBadgeText,
                    {
                      color: '#2E7D32',
                    },
                  ]}
                >
                  {order.invoiceStatus}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  /* ───────── render states ───────── */

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
        keyExtractor={(item) => (item.id ?? item.displayOrderId)?.toString()}
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
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryText,
    marginBottom: 2,
  },
  orderDate: {
    fontSize: 12,
    color: colors.secondaryText,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  storeName: {
    fontSize: 12,
    color: colors.secondaryText,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
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
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  totalLabel: {
    fontSize: 11,
    color: colors.secondaryText,
    marginBottom: 2,
  },
  totalValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryText,
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
});

export default OrdersScreen;
