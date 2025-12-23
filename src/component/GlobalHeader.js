import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Linking, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, Feather } from '@expo/vector-icons';
import colors from './color';

const GlobalHeader = ({ title, showBack = false }) => {
  const navigation = useNavigation();

  const handleNotificationPress = () => {
    navigation.navigate('Home', { screen: 'Notification' });
  };

  const handleCallPress = () => {
    // You can replace this with your actual support number
    const phoneNumber = '+1234567890'; // Replace with actual number
    
    Alert.alert(
      'Call Support',
      `Do you want to call ${phoneNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: () => {
            Linking.openURL(`tel:${phoneNumber}`);
          },
        },
      ]
    );
  };

  const handleDrawerOpen = () => {
    // Get the drawer navigator from the parent
    const drawer = navigation.getParent('Drawer');
    if (drawer) {
      drawer.openDrawer();
    } else {
      // Fallback: try direct navigation
      navigation.openDrawer?.();
    }
  };

  return (
    <LinearGradient
      colors={[colors.primary, '#FFB6C1']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.headerGradient}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={styles.headerContainer}>
        {/* Left side - Hamburger icon */}
        <TouchableOpacity onPress={handleDrawerOpen} style={styles.iconButton}>
          <Feather name="menu" size={24} color="white" />
        </TouchableOpacity>

        {/* Center - Title */}
        <Text style={styles.headerTitle}>{title}</Text>

        {/* Right side - Notification and Call icons */}
        <View style={styles.rightIcons}>
          <TouchableOpacity onPress={handleNotificationPress} style={styles.iconButton}>
            <Ionicons name="notifications-outline" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleCallPress} style={styles.iconButton}>
            <Ionicons name="call-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  headerGradient: {
    paddingTop: StatusBar.currentHeight || 0,
    paddingBottom: 15,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: 'hidden',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    minHeight: 50,
  },
  iconButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  rightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});

export default GlobalHeader;

