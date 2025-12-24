import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import colors from '../component/color';
import { getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../services/userAuth';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

const NotificationScreen = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async (isRefreshing = false) => {
    if (!isRefreshing) {
      setLoading(true);
    }
    setError(null);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        const response = await getUserNotifications(token);
        if (response.success) {
          setNotifications(response.data.notifications);
        }
      } else {
        setError('You are not logged in.');
      }
    } catch (err) {
      setError('Failed to fetch notifications.');
      console.error(err);
    } finally {
      if (!isRefreshing) {
        setLoading(false);
      }
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications(true);
    setRefreshing(false);
  }, []);

  const handleMarkAllAsRead = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        const response = await markAllNotificationsAsRead(token);
        if (response.success) {
          setNotifications(prevNotifications =>
            prevNotifications.map(notification => ({ ...notification, isRead: true }))
          );
        }
      }
    } catch (err) {
      console.error('Failed to mark all notifications as read', err);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        const response = await markNotificationAsRead(token, notificationId);
        if (response.success) {
          setNotifications(prevNotifications =>
            prevNotifications.map(notification =>
              notification.id === notificationId
                ? { ...notification, isRead: true }
                : notification
            )
          );
        }
      }
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const renderNotification = ({ item }) => (
    <TouchableOpacity
      style={[styles.notificationItem, !item.isRead && styles.unreadNotification]}
      onPress={() => !item.isRead && handleMarkAsRead(item.id)}
      activeOpacity={item.isRead ? 1 : 0.7}
    >
      <View style={styles.notificationContent}>
        <Text style={styles.notificationTitle}>{item.title}</Text>
        <Text style={styles.notificationReason}>{item.reason}</Text>
        <Text style={styles.notificationTime}>{new Date(item.time).toLocaleString()}</Text>
      </View>
    </TouchableOpacity>
  );

  const hasUnread = notifications.some(n => !n.isRead);

  const renderContent = () => {
    if (loading) {
      return <ActivityIndicator size="large" color={colors.primary} />;
    }

    if (error) {
      return <Text style={styles.subtitle}>{error}</Text>;
    }

    if (notifications.length === 0) {
      return <Text style={styles.subtitle}>You don’t have any notifications yet.</Text>;
    }

    return (
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}  >
      <View style={styles.header} >
        {hasUnread && (
          <TouchableOpacity onPress={handleMarkAllAsRead}>
            <Text style={styles.markAllReadText}>Mark all as read</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.content}>
        {renderContent()}
      </View>
    </SafeAreaView>
  );

};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.mainColor,
    
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
   
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  markAllReadText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  list: {
    paddingVertical: 16,
  },
  notificationItem: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderColor,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationContent: {
    flex: 1,
  },
  unreadNotification: {
    backgroundColor: colors.primaryLight, // A distinct background for unread items
    borderColor: colors.primary,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryText,
  },
  notificationReason: {
    fontSize: 14,
    color: colors.secondaryText,
    marginTop: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: colors.tertiaryText,
    marginTop: 8,
    textAlign: 'right',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primaryText,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.secondaryText,
    textAlign: 'center',
  },
});

export default NotificationScreen;
